import { type ImageRecord } from "@rehab-grid/core/types";
import {
  type Annotation,
  clampCrop,
  getCropRect,
  getEditedImageName,
  getOutputSize,
  isTinyAnnotation,
  loadImageEditSource,
  panCrop,
  saveEditedImage,
  transformAnnotation,
  transformCrop,
  transformPoint,
  viewToImagePoint,
} from "@rehab-grid/core/utils/imageEdit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetImageRecord, mockSaveImage } = vi.hoisted(() => ({
  mockGetImageRecord: vi.fn<(id: string) => Promise<ImageRecord | undefined>>(),
  mockSaveImage: vi.fn<(id: string, blob: Blob, fileName?: string) => Promise<void>>(),
}));

vi.mock("@rehab-grid/core/lib/db", () => ({
  getImageRecord: mockGetImageRecord,
  saveImage: mockSaveImage,
}));

vi.mock("nanoid", () => ({ nanoid: () => "new-image-id" }));

/**
 * テスト用の注釈を生成
 */
function createAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    shape: "arrow",
    color: "#dc2626",
    strokeRatio: 0.014,
    start: { x: 0.2, y: 0.3 },
    end: { x: 0.6, y: 0.7 },
    ...overrides,
  };
}

describe("transformPoint", () => {
  it.each([
    ["flipWhole", { x: 0.2, y: 0.3 }, { x: 0.8, y: 0.3 }],
    // 左半分の中で反転（0.1 → 0.4）
    ["flipPanels", { x: 0.1, y: 0.5 }, { x: 0.4, y: 0.5 }],
    // 右半分の中で反転（0.6 → 0.9）
    ["flipPanels", { x: 0.6, y: 0.2 }, { x: 0.9, y: 0.2 }],
    // 時計回りに 90°：左上寄りの点は右上寄りへ
    ["rotate", { x: 0.2, y: 0.3 }, { x: 0.7, y: 0.2 }],
  ] as const)("%s で %o は %o に移る", (operation, point, expected) => {
    const result = transformPoint(point, operation);

    expect(result.x).toBeCloseTo(expected.x);
    expect(result.y).toBeCloseTo(expected.y);
  });

  it("90° 回転を 4 回行うと元の位置に戻る", () => {
    let point = { x: 0.15, y: 0.8 };
    for (let i = 0; i < 4; i++) {
      point = transformPoint(point, "rotate");
    }

    expect(point.x).toBeCloseTo(0.15);
    expect(point.y).toBeCloseTo(0.8);
  });

  it.each(["flipWhole", "flipPanels"] as const)(
    "%s を 2 回行うと元の位置に戻る",
    (operation) => {
      const point = transformPoint(
        transformPoint({ x: 0.3, y: 0.4 }, operation),
        operation
      );

      expect(point.x).toBeCloseTo(0.3);
      expect(point.y).toBeCloseTo(0.4);
    }
  );
});

describe("transformAnnotation", () => {
  it("始点と終点だけを移し、形・色・太さは変えない", () => {
    const result = transformAnnotation(createAnnotation(), "flipWhole");

    expect(result).toEqual({
      shape: "arrow",
      color: "#dc2626",
      strokeRatio: 0.014,
      start: { x: 0.8, y: 0.3 },
      end: { x: expect.closeTo(0.4) as number, y: 0.7 },
    });
  });
});

describe("transformCrop", () => {
  it("枠の中心を移し、拡大率は保つ", () => {
    expect(
      transformCrop({ zoom: 2, centerX: 0.3, centerY: 0.5 }, "flipWhole")
    ).toEqual({ zoom: 2, centerX: 0.7, centerY: 0.5 });
  });
});

describe("getCropRect", () => {
  it("トリミングしない（null）なら画像全体", () => {
    expect(getCropRect(1200, 640, null)).toEqual({
      x: 0,
      y: 0,
      width: 1200,
      height: 640,
    });
  });

  it("横長の画像では高さいっぱいの 5:3 の枠を中央に置く", () => {
    const rect = getCropRect(1200, 640, { zoom: 1, centerX: 0.5, centerY: 0.5 });

    expect(rect.width).toBeCloseTo(1066.667, 2);
    expect(rect.height).toBe(640);
    expect(rect.x).toBeCloseTo(66.667, 2);
    expect(rect.y).toBe(0);
  });

  it("縦長の画像では幅いっぱいの 5:3 の枠を中央に置く", () => {
    expect(
      getCropRect(600, 1000, { zoom: 1, centerX: 0.5, centerY: 0.5 })
    ).toEqual({ x: 0, y: 320, width: 600, height: 360 });
  });

  it("2 倍に拡大すると枠は半分の大きさになる", () => {
    expect(
      getCropRect(1200, 720, { zoom: 2, centerX: 0.5, centerY: 0.5 })
    ).toEqual({ x: 300, y: 180, width: 600, height: 360 });
  });

  it("中心が端に寄りすぎていても枠は画像からはみ出さない", () => {
    expect(getCropRect(1200, 720, { zoom: 2, centerX: 0, centerY: 1 })).toEqual(
      { x: 0, y: 360, width: 600, height: 360 }
    );
  });
});

describe("clampCrop", () => {
  it.each([
    [10, 4],
    [0.5, 1],
  ])("拡大率 %s は %s に収める", (zoom, expected) => {
    expect(clampCrop({ zoom, centerX: 0.5, centerY: 0.5 }, 1200, 720).zoom).toBe(
      expected
    );
  });

  it("枠が画像と同じ大きさなら中心は 0.5 に固定される", () => {
    expect(clampCrop({ zoom: 1, centerX: 0.1, centerY: 0.9 }, 1200, 720)).toEqual(
      { zoom: 1, centerX: 0.5, centerY: 0.5 }
    );
  });
});

describe("panCrop", () => {
  const crop = { zoom: 2, centerX: 0.5, centerY: 0.5 };

  it("画像を右へドラッグすると枠は左へ動く", () => {
    // 120px は幅 1200px の 0.1
    expect(panCrop(crop, 120, 0, 1200, 720)).toEqual({
      zoom: 2,
      centerX: 0.4,
      centerY: 0.5,
    });
  });

  it("動かしすぎても枠は画像の端で止まる", () => {
    // 枠の幅は 600px（画像の半分）なので、中心は 0.25〜0.75 の範囲
    expect(panCrop(crop, 5000, -5000, 1200, 720)).toEqual({
      zoom: 2,
      centerX: 0.25,
      centerY: 0.75,
    });
  });
});

describe("viewToImagePoint", () => {
  const cropRect = { x: 300, y: 180, width: 600, height: 360 };

  it("プレビューの中央は枠の中央（画像の正規化座標）", () => {
    expect(viewToImagePoint(0.5, 0.5, cropRect, 1200, 720)).toEqual({
      x: 0.5,
      y: 0.5,
    });
  });

  it("プレビューの左下は枠の左下", () => {
    expect(viewToImagePoint(0, 1, cropRect, 1200, 720)).toEqual({
      x: 0.25,
      y: 0.75,
    });
  });

  it("プレビューの外はプレビューの端に寄せる", () => {
    expect(viewToImagePoint(-0.5, 2, cropRect, 1200, 720)).toEqual({
      x: 0.25,
      y: 0.75,
    });
  });
});

describe("getOutputSize", () => {
  it("長辺が上限を超えていれば縮小する", () => {
    expect(getOutputSize({ width: 2400, height: 1440 }, 1200)).toEqual({
      width: 1200,
      height: 720,
    });
  });

  it("上限より小さければ拡大しない", () => {
    expect(getOutputSize({ width: 600, height: 360 }, 1200)).toEqual({
      width: 600,
      height: 360,
    });
  });

  it("allowUpscale なら長辺が上限になるまで拡大する", () => {
    expect(getOutputSize({ width: 600, height: 360 }, 800, true)).toEqual({
      width: 800,
      height: 480,
    });
  });

  it("端数は四捨五入する", () => {
    expect(getOutputSize({ width: 423.3, height: 253.98 }, 1200)).toEqual({
      width: 423,
      height: 254,
    });
  });
});

describe("isTinyAnnotation", () => {
  it.each([
    // 長辺 1000px の 1%（10px）未満は小さすぎる
    [{ x: 0.005, y: 0 }, true],
    [{ x: 0.02, y: 0 }, false],
  ])("終点 %o の注釈が小さすぎるかは %s", (end, expected) => {
    const annotation = createAnnotation({ start: { x: 0, y: 0 }, end });

    expect(isTinyAnnotation(annotation, 1000, 500)).toBe(expected);
  });
});

describe("getEditedImageName", () => {
  it.each([
    ["スクワット", "スクワット_編集"],
    // 編集済みの画像をもう一度編集しても接尾辞を重ねない
    ["スクワット_編集", "スクワット_編集"],
    ["", "画像_編集"],
  ])("%s → %s", (displayName, expected) => {
    expect(getEditedImageName(displayName)).toBe(expected);
  });
});

describe("loadImageEditSource", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => Promise.resolve({ width: 1200, height: 640 }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("サンプル画像は静的ファイルを取得し、表示名から接頭辞と番号を除く", async () => {
    const fetchMock = vi.fn(async () =>
      Promise.resolve(new Response(new Blob(["x"], { type: "image/webp" })))
    );
    vi.stubGlobal("fetch", fetchMock);

    const source = await loadImageEditSource("sample_lying_01");

    expect(fetchMock).toHaveBeenCalledWith(
      "/images/samples/lying_01_hip-up.webp"
    );
    expect(source.displayName).toBe("ヒップアップ");
    expect(source.image.width).toBe(1200);
    expect(source.image.height).toBe(640);
  });

  it("取り込み画像は IndexedDB のファイル名を表示名にする", async () => {
    mockGetImageRecord.mockResolvedValue({
      id: "img-1",
      blob: new Blob(["x"], { type: "image/webp" }),
      createdAt: new Date(),
      fileName: "肩の体操",
    });

    const source = await loadImageEditSource("img-1");

    expect(mockGetImageRecord).toHaveBeenCalledWith("img-1");
    expect(source.displayName).toBe("肩の体操");
  });

  it("取り込み画像が見つからなければ例外を投げる", async () => {
    mockGetImageRecord.mockResolvedValue(undefined);

    await expect(loadImageEditSource("missing")).rejects.toThrow();
  });
});

describe("saveEditedImage", () => {
  it("新しいIDで「_編集」を付けた名前で保存し、そのIDを返す", async () => {
    const blob = new Blob(["x"], { type: "image/webp" });

    const imageId = await saveEditedImage(blob, "スクワット");

    expect(imageId).toBe("new-image-id");
    expect(mockSaveImage).toHaveBeenCalledWith(
      "new-image-id",
      blob,
      "スクワット_編集"
    );
  });
});
