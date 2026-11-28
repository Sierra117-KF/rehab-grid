/**
 * 画像編集ユーティリティ
 *
 * 左右反転・90°回転・5:3 トリミング・注釈（矢印・丸・四角）を Canvas API で行い、
 * 結果を新しい画像として IndexedDB に保存する。元の画像は変更しない（非破壊）。
 *
 * @remarks
 * - 座標計算は純粋関数に分け、jsdom でテストできるようにしている
 * - 反転・回転は編集中の画像そのものに適用し（`applyOrientation`）、
 *   トリミング枠と注釈はその画像に対する 0〜1 の正規化座標で持つ
 */

import {
  EDITED_IMAGE_FALLBACK_NAME,
  EDITED_IMAGE_NAME_SUFFIX,
  getSampleImageFileName,
  getSampleImagePath,
  IMAGE_EDIT_MAX_ZOOM,
  isSampleImage,
  PDF_IMAGE_ASPECT_RATIO,
} from "@rehab-grid/core/lib/constants";
import { getImageRecord, saveImage } from "@rehab-grid/core/lib/db";
import {
  getDisplayFileName,
  MAX_WIDTH_OR_HEIGHT,
  supportsWebP,
} from "@rehab-grid/core/utils/image";
import { nanoid } from "nanoid";

// ============================================================================
// 型
// ============================================================================

/**
 * 画像の向きを変える操作
 *
 * - `flipWhole`: 画像全体を左右反転
 * - `flipPanels`: 左半分と右半分をそれぞれ左右反転（2 コマ構成の画像でコマの順番を保つ）
 * - `rotate`: 右（時計回り）に 90° 回転
 */
export type OrientationOperation = "flipWhole" | "flipPanels" | "rotate";

/** 画像に対する 0〜1 の正規化座標 */
export type NormalizedPoint = {
  /** 横方向の位置（左端 0、右端 1） */
  x: number;
  /** 縦方向の位置（上端 0、下端 1） */
  y: number;
};

/** ピクセル単位の矩形 */
export type PixelRect = {
  /** 左上の x 座標 */
  x: number;
  /** 左上の y 座標 */
  y: number;
  /** 幅 */
  width: number;
  /** 高さ */
  height: number;
};

/**
 * トリミングの状態
 *
 * @remarks
 * 倍率 1 のとき、画像に収まる最大の 5:3 の枠になる。中心は正規化座標
 */
export type CropState = {
  /** 拡大率（1〜IMAGE_EDIT_MAX_ZOOM） */
  zoom: number;
  /** 枠の中心の x（正規化座標） */
  centerX: number;
  /** 枠の中心の y（正規化座標） */
  centerY: number;
};

/** 注釈の形 */
export type AnnotationShape = "arrow" | "circle" | "rect";

/**
 * 注釈
 *
 * @remarks
 * 座標はトリミング前の（向きを変えたあとの）画像に対する正規化座標。
 * トリミング枠を動かしても、注釈は画像の同じ場所に留まる
 */
export type Annotation = {
  /** 形 */
  shape: AnnotationShape;
  /** 線の色（#RRGGBB） */
  color: string;
  /** 線の太さ（出力画像の長辺に対する比率） */
  strokeRatio: number;
  /** ドラッグの開始点（矢印の根元） */
  start: NormalizedPoint;
  /** ドラッグの終了点（矢印の先端） */
  end: NormalizedPoint;
};

/** 編集対象の画像（描画元とその寸法） */
export type EditableImage = {
  /** Canvas に描画できる画像 */
  source: CanvasImageSource;
  /** 幅（px） */
  width: number;
  /** 高さ（px） */
  height: number;
};

/** 編集の元になる画像 */
export type ImageEditSource = {
  /** 画像 */
  image: EditableImage;
  /** 表示名（保存時に「_編集」を付ける） */
  displayName: string;
};

// ============================================================================
// 座標計算（純粋関数）
// ============================================================================

/** 注釈として残す最小の長さ（画像の長辺に対する比率）。クリックだけの誤操作を除く */
const MIN_ANNOTATION_LENGTH_RATIO = 0.01;

/**
 * 向きを変える操作に合わせて、正規化座標の点を移す
 *
 * @param point - 操作前の画像上の点
 * @param operation - 向きを変える操作
 * @returns 操作後の画像上で同じ内容を指す点
 */
export function transformPoint(
  point: NormalizedPoint,
  operation: OrientationOperation
): NormalizedPoint {
  switch (operation) {
    case "flipWhole":
      return { x: 1 - point.x, y: point.y };
    case "flipPanels":
      // 左半分（0〜0.5）と右半分（0.5〜1）の中でそれぞれ反転する
      return { x: point.x < 0.5 ? 0.5 - point.x : 1.5 - point.x, y: point.y };
    case "rotate":
      // 時計回りに 90°：元の左端が上端に、元の下端が左端になる
      return { x: 1 - point.y, y: point.x };
  }
}

/**
 * 向きを変える操作に合わせて、注釈を移す
 *
 * @param annotation - 操作前の注釈
 * @param operation - 向きを変える操作
 * @returns 操作後の注釈
 */
export function transformAnnotation(
  annotation: Annotation,
  operation: OrientationOperation
): Annotation {
  return {
    ...annotation,
    start: transformPoint(annotation.start, operation),
    end: transformPoint(annotation.end, operation),
  };
}

/**
 * 向きを変える操作に合わせて、トリミング枠の中心を移す
 *
 * @remarks
 * 枠の中に見えていた内容が、操作後も枠の中に収まるようにする。
 * 回転で縦横比が変わると枠の大きさも変わるため、使う側で `clampCrop` を通すこと
 *
 * @param crop - 操作前のトリミング
 * @param operation - 向きを変える操作
 * @returns 操作後のトリミング
 */
export function transformCrop(
  crop: CropState,
  operation: OrientationOperation
): CropState {
  const center = transformPoint(
    { x: crop.centerX, y: crop.centerY },
    operation
  );
  return { zoom: crop.zoom, centerX: center.x, centerY: center.y };
}

/**
 * 値を範囲内に収める
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * 倍率 1 のときのトリミング枠の大きさ（画像に収まる最大の 5:3 の枠）を求める
 */
function getBaseCropSize(
  width: number,
  height: number
): { width: number; height: number } {
  return width / height > PDF_IMAGE_ASPECT_RATIO
    ? { width: height * PDF_IMAGE_ASPECT_RATIO, height }
    : { width, height: width / PDF_IMAGE_ASPECT_RATIO };
}

/**
 * トリミングの倍率と中心を、枠が画像からはみ出さない範囲に収める
 *
 * @param crop - トリミング
 * @param width - 画像の幅（px）
 * @param height - 画像の高さ（px）
 * @returns 範囲内に収めたトリミング
 */
export function clampCrop(
  crop: CropState,
  width: number,
  height: number
): CropState {
  const zoom = clamp(crop.zoom, 1, IMAGE_EDIT_MAX_ZOOM);
  const base = getBaseCropSize(width, height);
  const halfWidthRatio = base.width / zoom / 2 / width;
  const halfHeightRatio = base.height / zoom / 2 / height;

  return {
    zoom,
    centerX: clamp(crop.centerX, halfWidthRatio, 1 - halfWidthRatio),
    centerY: clamp(crop.centerY, halfHeightRatio, 1 - halfHeightRatio),
  };
}

/**
 * トリミング枠の矩形（px）を求める
 *
 * @param width - 画像の幅（px）
 * @param height - 画像の高さ（px）
 * @param crop - トリミング。null ならトリミングしない（画像全体）
 * @returns トリミング枠の矩形
 */
export function getCropRect(
  width: number,
  height: number,
  crop: CropState | null
): PixelRect {
  if (crop === null) {
    return { x: 0, y: 0, width, height };
  }

  const clamped = clampCrop(crop, width, height);
  const base = getBaseCropSize(width, height);
  const rectWidth = base.width / clamped.zoom;
  const rectHeight = base.height / clamped.zoom;

  return {
    x: clamped.centerX * width - rectWidth / 2,
    y: clamped.centerY * height - rectHeight / 2,
    width: rectWidth,
    height: rectHeight,
  };
}

/**
 * トリミング枠を画像のドラッグ量だけ動かす
 *
 * @remarks
 * 画像を右へドラッグすると、内容が右へ動く（＝枠は左へ動く）
 *
 * @param crop - トリミング
 * @param deltaX - 画像の横方向のドラッグ量（画像の px）
 * @param deltaY - 画像の縦方向のドラッグ量（画像の px）
 * @param width - 画像の幅（px）
 * @param height - 画像の高さ（px）
 * @returns 動かしたあとのトリミング（範囲内に収める）
 */
export function panCrop(
  crop: CropState,
  deltaX: number,
  deltaY: number,
  width: number,
  height: number
): CropState {
  return clampCrop(
    {
      zoom: crop.zoom,
      centerX: crop.centerX - deltaX / width,
      centerY: crop.centerY - deltaY / height,
    },
    width,
    height
  );
}

/**
 * プレビュー上の位置を、画像の正規化座標に変換する
 *
 * @param viewX - プレビューの横方向の位置（左端 0、右端 1）
 * @param viewY - プレビューの縦方向の位置（上端 0、下端 1）
 * @param cropRect - プレビューに表示しているトリミング枠（px）
 * @param width - 画像の幅（px）
 * @param height - 画像の高さ（px）
 * @returns 画像の正規化座標（プレビューの外はプレビューの端に寄せる）
 */
export function viewToImagePoint(
  viewX: number,
  viewY: number,
  cropRect: PixelRect,
  width: number,
  height: number
): NormalizedPoint {
  return {
    x: (cropRect.x + clamp(viewX, 0, 1) * cropRect.width) / width,
    y: (cropRect.y + clamp(viewY, 0, 1) * cropRect.height) / height,
  };
}

/**
 * 出力画像の大きさを求める（長辺を maxSize 以内に縮小する）
 *
 * @param rect - 出力する範囲（px）
 * @param maxSize - 長辺の最大サイズ（px）
 * @param allowUpscale - true なら長辺が maxSize になるよう拡大もする（プレビュー用）
 * @returns 出力画像の幅と高さ（1px 以上の整数）
 */
export function getOutputSize(
  rect: Pick<PixelRect, "width" | "height">,
  maxSize: number,
  allowUpscale = false
): { width: number; height: number } {
  const fitScale = maxSize / Math.max(rect.width, rect.height);
  const scale = allowUpscale ? fitScale : Math.min(1, fitScale);
  return {
    width: Math.max(1, Math.round(rect.width * scale)),
    height: Math.max(1, Math.round(rect.height * scale)),
  };
}

/**
 * 注釈が小さすぎる（クリックだけで描かれた）かどうか
 *
 * @param annotation - 注釈
 * @param width - 画像の幅（px）
 * @param height - 画像の高さ（px）
 * @returns 残す必要のない大きさなら true
 */
export function isTinyAnnotation(
  annotation: Annotation,
  width: number,
  height: number
): boolean {
  const length = Math.hypot(
    (annotation.end.x - annotation.start.x) * width,
    (annotation.end.y - annotation.start.y) * height
  );
  return length < Math.max(width, height) * MIN_ANNOTATION_LENGTH_RATIO;
}

/**
 * 編集した画像の保存名を作る
 *
 * @remarks
 * 編集済みの画像をもう一度編集しても「_編集_編集」と重ならないようにする
 *
 * @param displayName - 元画像の表示名
 * @returns 保存名（例: "スクワット_編集"）
 */
export function getEditedImageName(displayName: string): string {
  const name = displayName === "" ? EDITED_IMAGE_FALLBACK_NAME : displayName;
  return name.endsWith(EDITED_IMAGE_NAME_SUFFIX)
    ? name
    : `${name}${EDITED_IMAGE_NAME_SUFFIX}`;
}

// ============================================================================
// Canvas による描画（ブラウザ専用）
// ============================================================================

/** 編集画像のエンコード品質（再編集での劣化を抑えるため、取り込み時の圧縮より高め） */
const EDIT_ENCODE_QUALITY = 0.92;

/** 矢印の先端の長さ（線の太さに対する倍率） */
const ARROW_HEAD_LENGTH_RATIO = 4;

/** 矢印の先端の開き角（ラジアン） */
const ARROW_HEAD_ANGLE = Math.PI / 7;

/**
 * 指定サイズの Canvas を作る
 */
function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Canvas の 2D コンテキストを取得する（取得できなければ例外）
 */
function getContext2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    throw new Error("Canvas 2D contextの取得に失敗しました");
  }
  return ctx;
}

/**
 * 画像の向きを変えた新しい画像を作る
 *
 * @param image - 元の画像
 * @param operation - 向きを変える操作
 * @returns 向きを変えた画像
 */
export function applyOrientation(
  image: EditableImage,
  operation: OrientationOperation
): EditableImage {
  const { source, width, height } = image;
  const isRotate = operation === "rotate";
  const canvas = createCanvas(isRotate ? height : width, isRotate ? width : height);
  const ctx = getContext2d(canvas);

  switch (operation) {
    case "rotate":
      ctx.translate(height, 0);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(source, 0, 0);
      break;
    case "flipWhole":
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(source, 0, 0);
      break;
    case "flipPanels": {
      // 左右のコマをそれぞれ元の位置で反転する（drawImage 2 回）
      const leftWidth = Math.floor(width / 2);
      const rightWidth = width - leftWidth;
      ctx.save();
      ctx.translate(leftWidth, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(source, 0, 0, leftWidth, height, 0, 0, leftWidth, height);
      ctx.restore();
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(
        source,
        leftWidth,
        0,
        rightWidth,
        height,
        0,
        0,
        rightWidth,
        height
      );
      break;
    }
  }

  return { source: canvas, width: canvas.width, height: canvas.height };
}

/**
 * 注釈を 1 つ描画する
 */
function drawAnnotation(
  ctx: CanvasRenderingContext2D,
  annotation: Annotation,
  toOutput: (point: NormalizedPoint) => { x: number; y: number },
  lineWidth: number
): void {
  const start = toOutput(annotation.start);
  const end = toOutput(annotation.end);

  ctx.save();
  ctx.strokeStyle = annotation.color;
  ctx.fillStyle = annotation.color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  switch (annotation.shape) {
    case "arrow": {
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const headLength = lineWidth * ARROW_HEAD_LENGTH_RATIO;
      // 太い線の端が先端からはみ出さないよう、軸は先端の手前で止める
      const shaftEnd = {
        x: end.x - Math.cos(angle) * headLength * 0.5,
        y: end.y - Math.sin(angle) * headLength * 0.5,
      };
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(shaftEnd.x, shaftEnd.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - headLength * Math.cos(angle - ARROW_HEAD_ANGLE),
        end.y - headLength * Math.sin(angle - ARROW_HEAD_ANGLE)
      );
      ctx.lineTo(
        end.x - headLength * Math.cos(angle + ARROW_HEAD_ANGLE),
        end.y - headLength * Math.sin(angle + ARROW_HEAD_ANGLE)
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "circle":
      ctx.beginPath();
      ctx.ellipse(
        (start.x + end.x) / 2,
        (start.y + end.y) / 2,
        Math.abs(end.x - start.x) / 2,
        Math.abs(end.y - start.y) / 2,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      break;
    case "rect":
      ctx.strokeRect(
        Math.min(start.x, end.x),
        Math.min(start.y, end.y),
        Math.abs(end.x - start.x),
        Math.abs(end.y - start.y)
      );
      break;
  }

  ctx.restore();
}

/**
 * トリミングと注釈を適用した画像を Canvas に描画する
 *
 * @remarks
 * プレビューと保存の両方で使う（プレビューと保存結果を一致させるため）。
 * Canvas の大きさは出力サイズに合わせて変更する。透過部分は白で塗る
 *
 * @param canvas - 描画先
 * @param image - 向きを変えたあとの画像
 * @param crop - トリミング（null ならトリミングしない）
 * @param annotations - 注釈
 * @param maxSize - 出力画像の長辺の最大サイズ（px）
 * @param allowUpscale - true なら長辺が maxSize になるよう拡大する（プレビューの表示サイズをそろえる）
 */
export function drawEditedImage(
  canvas: HTMLCanvasElement,
  image: EditableImage,
  crop: CropState | null,
  annotations: readonly Annotation[],
  maxSize: number,
  allowUpscale = false
): void {
  const rect = getCropRect(image.width, image.height, crop);
  const output = getOutputSize(rect, maxSize, allowUpscale);
  const scale = output.width / rect.width;

  canvas.width = output.width;
  canvas.height = output.height;
  const ctx = getContext2d(canvas);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, output.width, output.height);
  ctx.drawImage(
    image.source,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    0,
    0,
    output.width,
    output.height
  );

  const toOutput = (point: NormalizedPoint) => ({
    x: (point.x * image.width - rect.x) * scale,
    y: (point.y * image.height - rect.y) * scale,
  });
  const longSide = Math.max(output.width, output.height);
  for (const annotation of annotations) {
    drawAnnotation(ctx, annotation, toOutput, annotation.strokeRatio * longSide);
  }
}

/**
 * 編集結果を画像ファイル（WebP、非対応環境では JPEG）の Blob にする
 *
 * @param image - 向きを変えたあとの画像
 * @param crop - トリミング（null ならトリミングしない）
 * @param annotations - 注釈
 * @returns 画像の Blob
 * @throws エンコードに失敗した場合
 */
export async function createEditedImageBlob(
  image: EditableImage,
  crop: CropState | null,
  annotations: readonly Annotation[]
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  drawEditedImage(canvas, image, crop, annotations, MAX_WIDTH_OR_HEIGHT);

  const type = supportsWebP() ? "image/webp" : "image/jpeg";
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob === null) {
          reject(new Error("画像のエンコードに失敗しました"));
          return;
        }
        resolve(blob);
      },
      type,
      EDIT_ENCODE_QUALITY
    );
  });
}

// ============================================================================
// 読み込みと保存
// ============================================================================

/**
 * 画像IDから Blob とファイル名を取得する
 *
 * @remarks
 * サンプル画像は静的ファイルを fetch し、取り込み画像は IndexedDB から読む
 */
async function loadImageBlob(
  imageId: string
): Promise<{ blob: Blob; fileName: string }> {
  if (isSampleImage(imageId)) {
    const path = getSampleImagePath(imageId);
    if (path === undefined) {
      throw new Error("サンプル画像が見つかりません");
    }
    const res = await fetch(path);
    if (!res.ok) {
      throw new Error("サンプル画像の取得に失敗しました");
    }
    return {
      blob: await res.blob(),
      fileName: getSampleImageFileName(imageId) ?? "",
    };
  }

  const record = await getImageRecord(imageId);
  if (record === undefined) {
    throw new Error("画像が見つかりません");
  }
  return { blob: record.blob, fileName: record.fileName ?? "" };
}

/**
 * 編集の元になる画像（いまカードに設定されている画像）を読み込む
 *
 * @param imageId - 画像ID（サンプル画像または取り込み画像）
 * @returns 画像と表示名
 * @throws 画像が見つからない・読み込めない場合
 */
export async function loadImageEditSource(
  imageId: string
): Promise<ImageEditSource> {
  const { blob, fileName } = await loadImageBlob(imageId);
  const bitmap = await createImageBitmap(blob);
  return {
    image: { source: bitmap, width: bitmap.width, height: bitmap.height },
    displayName: getDisplayFileName(fileName),
  };
}

/**
 * 編集した画像を新しい画像として保存する
 *
 * @param blob - 編集した画像
 * @param displayName - 元画像の表示名
 * @returns 新しい画像ID
 */
export async function saveEditedImage(
  blob: Blob,
  displayName: string
): Promise<string> {
  const imageId = nanoid();
  await saveImage(imageId, blob, getEditedImageName(displayName));
  return imageId;
}
