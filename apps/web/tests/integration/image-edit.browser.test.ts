/**
 * 画像編集の結合テスト（Browser Mode）
 *
 * @remarks
 * jsdom では Canvas が使えないため、反転・回転・トリミング・注釈の描画と
 * エンコード・IndexedDB への保存を実際の Chromium で検証する。
 * 座標計算そのものは packages/core/tests/utils/imageEdit.test.ts で検証している。
 */

import { db, getImageRecord, saveImage } from "@rehab-grid/core/lib/db";
import {
  applyOrientation,
  createEditedImageBlob,
  type EditableImage,
  loadImageEditSource,
  saveEditedImage,
} from "@rehab-grid/core/utils/imageEdit";
import { beforeEach, describe, expect, it } from "vitest";

/** 縦縞の色（左から順に 100px ずつ） */
const STRIPES = ["#ff0000", "#00ff00", "#0000ff", "#000000"] as const;

/** 判定用の色の名前 */
type ColorName = "red" | "green" | "blue" | "black" | "white";

/**
 * 400x200 の縦縞（赤・緑・青・黒）の画像を作る
 */
function createStripedCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 200;
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("2D context がありません");
  STRIPES.forEach((color, index) => {
    ctx.fillStyle = color;
    ctx.fillRect(index * 100, 0, 100, 200);
  });
  return canvas;
}

/**
 * Canvas を EditableImage にする
 */
function toEditableImage(canvas: HTMLCanvasElement): EditableImage {
  return { source: canvas, width: canvas.width, height: canvas.height };
}

/**
 * Canvas を PNG の Blob にする
 */
async function toPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) reject(new Error("PNG への変換に失敗しました"));
      else resolve(blob);
    }, "image/png");
  });
}

/**
 * 画像の Blob をデコードして、指定位置の色と画像の大きさを返す
 *
 * @remarks
 * WebP の非可逆圧縮で色が少しずれるため、最も強い成分で色を判定する
 */
async function readImage(blob: Blob) {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("2D context がありません");
  ctx.drawImage(bitmap, 0, 0);

  const colorAt = (x: number, y: number): ColorName => {
    const [r = 0, g = 0, b = 0] = ctx.getImageData(x, y, 1, 1).data;
    if (r > 200 && g > 200 && b > 200) return "white";
    if (r < 60 && g < 60 && b < 60) return "black";
    if (r > g && r > b) return "red";
    if (g > r && g > b) return "green";
    return "blue";
  };

  return { width: bitmap.width, height: bitmap.height, colorAt };
}

describe("画像編集（実 Canvas）", { concurrent: false }, () => {
  beforeEach(async () => {
    db.close();
    await db.delete();
    await db.open();
  });

  it("全体を左右反転して保存すると、元画像を残して「_編集」の名前で保存する", async () => {
    await saveImage("original", await toPngBlob(createStripedCanvas()), "縦縞");

    const { image: sourceImage, displayName } =
      await loadImageEditSource("original");
    const flipped = applyOrientation(sourceImage, "flipWhole");
    const blob = await createEditedImageBlob(flipped, null, []);
    const editedId = await saveEditedImage(blob, displayName);

    const edited = await getImageRecord(editedId);
    expect(edited?.fileName).toBe("縦縞_編集");
    expect(edited?.blob.type).toBe("image/webp");
    // 元画像は変更されずに残る
    expect((await getImageRecord("original"))?.fileName).toBe("縦縞");

    const image = await readImage(edited?.blob ?? new Blob());
    expect([50, 150, 250, 350].map((x) => image.colorAt(x, 100))).toEqual([
      "black",
      "blue",
      "green",
      "red",
    ]);
  });

  it("2コマずつ左右反転は、左右のコマの順番を保ったままそれぞれを反転する", async () => {
    const flipped = applyOrientation(
      toEditableImage(createStripedCanvas()),
      "flipPanels"
    );

    const image = await readImage(await createEditedImageBlob(flipped, null, []));

    expect([50, 150, 250, 350].map((x) => image.colorAt(x, 100))).toEqual([
      "green",
      "red",
      "black",
      "blue",
    ]);
  });

  it("右に90°回転すると縦横が入れ替わり、左端の色が上端に来る", async () => {
    const rotated = applyOrientation(
      toEditableImage(createStripedCanvas()),
      "rotate"
    );

    const image = await readImage(await createEditedImageBlob(rotated, null, []));

    expect({ width: image.width, height: image.height }).toEqual({
      width: 200,
      height: 400,
    });
    expect([50, 350].map((y) => image.colorAt(100, y))).toEqual([
      "red",
      "black",
    ]);
  });

  it("トリミングすると 5:3 の枠の範囲だけが出力される", async () => {
    const image = await readImage(
      await createEditedImageBlob(
        toEditableImage(createStripedCanvas()),
        // 2 倍：枠は 167x100、左端に寄せると x=0〜167 の範囲（赤と緑の一部）
        { zoom: 2, centerX: 0, centerY: 0.5 },
        []
      )
    );

    expect({ width: image.width, height: image.height }).toEqual({
      width: 167,
      height: 100,
    });
    expect([20, 150].map((x) => image.colorAt(x, 50))).toEqual([
      "red",
      "green",
    ]);
  });

  it("注釈は指定した色で画像に焼き込まれる", async () => {
    const white = document.createElement("canvas");
    white.width = 400;
    white.height = 200;
    const ctx = white.getContext("2d");
    if (ctx === null) throw new Error("2D context がありません");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 400, 200);

    const image = await readImage(
      await createEditedImageBlob(toEditableImage(white), null, [
        {
          shape: "rect",
          color: "#0000ff",
          strokeRatio: 0.022,
          start: { x: 0.25, y: 0.25 },
          end: { x: 0.75, y: 0.75 },
        },
      ])
    );

    // 四角の上辺（y=50）は青、内側と外側は白のまま
    expect(image.colorAt(200, 50)).toBe("blue");
    expect(image.colorAt(200, 100)).toBe("white");
    expect(image.colorAt(20, 20)).toBe("white");
  });
});
