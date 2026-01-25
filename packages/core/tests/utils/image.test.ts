import {
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE,
  SAMPLE_IMAGE_ID_PREFIX,
} from "@rehab-grid/core/lib/constants";
import {
  compressImage,
  convertBlobToPdfSupportedDataUrl,
  fetchSampleImageBlobs,
  filterImageFiles,
  getDisplayFileName,
  getFileNameWithoutExtension,
  isValidImageBlob,
  partitionImageIds,
  processAndSaveImage,
  validateImageFile,
} from "@rehab-grid/core/utils/image";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// browser-image-compression のモック
// ============================================================================

const mockImageCompression = vi.hoisted(() => vi.fn());

vi.mock("browser-image-compression", () => ({
  default: mockImageCompression,
}));

// ============================================================================
// ヘルパー関数
// ============================================================================

/**
 * テスト用のFileオブジェクトを生成
 */
function createTestFile(
  options: {
    name?: string;
    type?: string;
    size?: number;
  } = {}
): File {
  const { name = "test.jpg", type = "image/jpeg", size = 1024 } = options;

  // 指定サイズのダミーデータを作成
  const content = new Uint8Array(size);
  return new File([content], name, { type });
}

/**
 * テスト用のBlobオブジェクトを生成
 */
function createTestBlob(type = "image/jpeg", size = 1024): Blob {
  const content = new Uint8Array(size);
  return new Blob([content], { type });
}

/**
 * テスト用のモックResponseを生成
 */
function createMockResponse(options: {
  ok: boolean;
  blob?: Blob;
  status?: number;
}): Response {
  const response: Partial<Response> = {
    ok: options.ok,
    status: options.status ?? (options.ok ? 200 : 404),
    blob: options.blob
      ? async () => Promise.resolve(options.blob!)
      : async () => Promise.resolve(new Blob()),
  };
  return response as Response;
}

// ============================================================================
// validateImageFile
// ============================================================================

describe("validateImageFile", () => {
  it.each(ALLOWED_IMAGE_TYPES)(
    "有効な画像形式 '%s' でvalid=trueを返す",
    (mimeType) => {
      const file = createTestFile({ type: mimeType });
      const result = validateImageFile(file);

      expect(result.valid).toBeTruthy();
      expect(result.error).toBeUndefined();
    }
  );

  it("ファイルサイズがMAX_FILE_SIZEを超える場合はvalid=falseを返す", () => {
    const file = createTestFile({ size: MAX_FILE_SIZE + 1 });
    const result = validateImageFile(file);

    expect(result.valid).toBeFalsy();
    expect(result.error).toContain("ファイルサイズが大きすぎます");
  });

  it("ファイルサイズがちょうどMAX_FILE_SIZEの場合はvalid=trueを返す", () => {
    const file = createTestFile({ size: MAX_FILE_SIZE });
    const result = validateImageFile(file);

    expect(result.valid).toBeTruthy();
  });

  it("非対応の画像形式の場合はvalid=falseを返す", () => {
    const file = createTestFile({ type: "text/plain" });
    const result = validateImageFile(file);

    expect(result.valid).toBeFalsy();
    expect(result.error).toContain("対応していない画像形式です");
  });

  it("application/pdfの場合はvalid=falseを返す", () => {
    const file = createTestFile({ type: "application/pdf" });
    const result = validateImageFile(file);

    expect(result.valid).toBeFalsy();
    expect(result.error).toContain("対応していない画像形式です");
  });
});

// ============================================================================
// filterImageFiles
// ============================================================================

describe("filterImageFiles", () => {
  it("画像ファイルのみを抽出する", () => {
    const files = [
      createTestFile({ name: "photo.jpg", type: "image/jpeg" }),
      createTestFile({ name: "doc.txt", type: "text/plain" }),
      createTestFile({ name: "image.png", type: "image/png" }),
    ];

    const result = filterImageFiles(files);

    expect(result).toHaveLength(2);
    expect(result[0]?.name).toBe("photo.jpg");
    expect(result[1]?.name).toBe("image.png");
  });

  it("空の配列では空配列を返す", () => {
    const result = filterImageFiles([]);

    expect(result).toEqual([]);
  });

  it("全て非画像ファイルの場合は空配列を返す", () => {
    const files = [
      createTestFile({ name: "doc.pdf", type: "application/pdf" }),
      createTestFile({ name: "data.json", type: "application/json" }),
    ];

    const result = filterImageFiles(files);

    expect(result).toEqual([]);
  });

  it("全て画像ファイルの場合は全てを返す", () => {
    const files = [
      createTestFile({ name: "a.jpg", type: "image/jpeg" }),
      createTestFile({ name: "b.png", type: "image/png" }),
      createTestFile({ name: "c.gif", type: "image/gif" }),
      createTestFile({ name: "d.webp", type: "image/webp" }),
    ];

    const result = filterImageFiles(files);

    expect(result).toHaveLength(4);
  });
});

// ============================================================================
// getFileNameWithoutExtension
// ============================================================================

describe("getFileNameWithoutExtension", () => {
  it("通常のファイル名から拡張子を除去する", () => {
    expect(getFileNameWithoutExtension("photo.jpg")).toBe("photo");
    expect(getFileNameWithoutExtension("document.pdf")).toBe("document");
  });

  it("複数ドットがある場合は最後のドット以降のみ除去する", () => {
    expect(getFileNameWithoutExtension("file.name.ext")).toBe("file.name");
    expect(getFileNameWithoutExtension("a.b.c.d")).toBe("a.b.c");
  });

  it("ドットがない場合はそのまま返す", () => {
    expect(getFileNameWithoutExtension("filename")).toBe("filename");
    expect(getFileNameWithoutExtension("noextension")).toBe("noextension");
  });

  it("先頭がドットの場合（隠しファイル形式）はそのまま返す", () => {
    expect(getFileNameWithoutExtension(".hidden")).toBe(".hidden");
    expect(getFileNameWithoutExtension(".gitignore")).toBe(".gitignore");
  });

  it("先頭がドットで拡張子もある場合は拡張子のみ除去する", () => {
    expect(getFileNameWithoutExtension(".hidden.txt")).toBe(".hidden");
  });

  it("空文字列の場合は空文字列を返す", () => {
    expect(getFileNameWithoutExtension("")).toBe("");
  });
});

// ============================================================================
// getDisplayFileName
// ============================================================================

describe("getDisplayFileName", () => {
  describe("姿勢接頭辞の除去", () => {
    it("standing_を除去する", () => {
      expect(getDisplayFileName("standing_squat.png")).toBe("squat");
    });

    it("sitting_を除去する", () => {
      expect(getDisplayFileName("sitting_stretch.webp")).toBe("stretch");
    });

    it("lying_を除去する", () => {
      expect(getDisplayFileName("lying_exercise.jpg")).toBe("exercise");
    });

    it("大文字小文字を区別しない", () => {
      expect(getDisplayFileName("STANDING_squat.png")).toBe("squat");
      expect(getDisplayFileName("Sitting_stretch.webp")).toBe("stretch");
    });
  });

  describe("番号部分の除去", () => {
    it("先頭の番号パターン（01_等）を除去する", () => {
      expect(getDisplayFileName("01_スクワット.webp")).toBe("スクワット");
      expect(getDisplayFileName("12_ブリッジ.webp")).toBe("ブリッジ");
    });

    it("姿勢接頭辞と番号の組み合わせを処理する", () => {
      expect(getDisplayFileName("standing_01_スクワット.webp")).toBe(
        "スクワット"
      );
      expect(getDisplayFileName("lying_03_SLR.webp")).toBe("SLR");
    });
  });

  describe("拡張子の除去", () => {
    it("各種拡張子を除去する", () => {
      expect(getDisplayFileName("exercise.jpg")).toBe("exercise");
      expect(getDisplayFileName("exercise.png")).toBe("exercise");
      expect(getDisplayFileName("exercise.webp")).toBe("exercise");
    });
  });

  describe("接頭辞なしの場合", () => {
    it("拡張子のみ除去する", () => {
      expect(getDisplayFileName("custom_exercise.png")).toBe("custom_exercise");
    });

    it("接頭辞も番号もない場合はファイル名のみ返す", () => {
      expect(getDisplayFileName("myexercise.jpg")).toBe("myexercise");
    });
  });
});

// ============================================================================
// partitionImageIds
// ============================================================================

describe("partitionImageIds", () => {
  it("サンプル画像IDとDB画像IDを正しく分割する", () => {
    const imageIds = [
      `${SAMPLE_IMAGE_ID_PREFIX}standing_01`,
      "user-image-123",
      `${SAMPLE_IMAGE_ID_PREFIX}sitting_01`,
      "user-image-456",
    ];

    const result = partitionImageIds(imageIds);

    expect(result.sampleIds).toContain(`${SAMPLE_IMAGE_ID_PREFIX}standing_01`);
    expect(result.sampleIds).toContain(`${SAMPLE_IMAGE_ID_PREFIX}sitting_01`);
    expect(result.dbImageIds).toContain("user-image-123");
    expect(result.dbImageIds).toContain("user-image-456");
  });

  it("空文字は除外する", () => {
    const imageIds = ["", `${SAMPLE_IMAGE_ID_PREFIX}test`, "", "user-123", ""];

    const result = partitionImageIds(imageIds);

    expect(result.sampleIds).toHaveLength(1);
    expect(result.dbImageIds).toHaveLength(1);
  });

  it("重複IDは除外する", () => {
    const imageIds = [
      `${SAMPLE_IMAGE_ID_PREFIX}test`,
      `${SAMPLE_IMAGE_ID_PREFIX}test`,
      "user-123",
      "user-123",
    ];

    const result = partitionImageIds(imageIds);

    expect(result.sampleIds).toHaveLength(1);
    expect(result.dbImageIds).toHaveLength(1);
  });

  it("空配列では両方とも空配列を返す", () => {
    const result = partitionImageIds([]);

    expect(result.sampleIds).toEqual([]);
    expect(result.dbImageIds).toEqual([]);
  });

  it("サンプルIDのみの場合はdbImageIdsが空になる", () => {
    const imageIds = [
      `${SAMPLE_IMAGE_ID_PREFIX}a`,
      `${SAMPLE_IMAGE_ID_PREFIX}b`,
    ];

    const result = partitionImageIds(imageIds);

    expect(result.sampleIds).toHaveLength(2);
    expect(result.dbImageIds).toEqual([]);
  });

  it("DBイメージIDのみの場合はsampleIdsが空になる", () => {
    const imageIds = ["user-a", "user-b"];

    const result = partitionImageIds(imageIds);

    expect(result.sampleIds).toEqual([]);
    expect(result.dbImageIds).toHaveLength(2);
  });
});

// ============================================================================
// compressImage
// ============================================================================

describe("compressImage", () => {
  beforeEach(() => {
    mockImageCompression.mockClear();
  });

  it("browser-image-compressionを呼び出して圧縮後Blobを返す", async () => {
    const compressedBlob = createTestBlob("image/webp", 512);
    mockImageCompression.mockResolvedValue(compressedBlob);

    const file = createTestFile({ size: 2048 });
    const result = await compressImage(file);

    expect(mockImageCompression).toHaveBeenCalledTimes(1);
    expect(mockImageCompression).toHaveBeenCalledWith(
      file,
      expect.objectContaining({
        maxSizeMB: 1,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        initialQuality: 0.8,
      })
    );
    expect(result).toBe(compressedBlob);
  });

  it("WebP対応ブラウザではfileType: 'image/webp'が設定される", async () => {
    // jsdom環境ではcanvas.toDataURLがWebPを返すかどうかでWebP対応を判定
    // モック環境では通常WebP非対応となるため、JPEGが設定される
    const compressedBlob = createTestBlob("image/jpeg", 512);
    mockImageCompression.mockResolvedValue(compressedBlob);

    const file = createTestFile();
    await compressImage(file);

    // jsdom環境ではWebP非対応なのでjpegが設定される
    expect(mockImageCompression).toHaveBeenCalledWith(
      file,
      expect.objectContaining({
        fileType: expect.stringMatching(/image\/(webp|jpeg)/),
      })
    );
  });

  it("圧縮エラー時は例外が伝播する", async () => {
    mockImageCompression.mockRejectedValue(new Error("Compression failed"));

    const file = createTestFile();

    await expect(compressImage(file)).rejects.toThrow("Compression failed");
  });
});

// ============================================================================
// processAndSaveImage
// ============================================================================

describe("processAndSaveImage", () => {
  beforeEach(() => {
    mockImageCompression.mockClear();
  });

  it("正常系: バリデーション→圧縮→保存が順番に実行され、success=trueを返す", async () => {
    const compressedBlob = createTestBlob("image/webp", 512);
    mockImageCompression.mockResolvedValue(compressedBlob);

    const generateId = vi.fn().mockReturnValue("generated-id-123");
    const save = vi.fn().mockResolvedValue(undefined);

    const file = createTestFile({ type: "image/jpeg", size: 1024 });
    const result = await processAndSaveImage(file, generateId, save);

    expect(result.success).toBeTruthy();
    expect(result).toHaveProperty("imageId", "generated-id-123");
    expect(generateId).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("generated-id-123", compressedBlob);
  });

  it("バリデーション失敗時はsuccess=falseを返し、圧縮・保存は呼ばれない", async () => {
    const generateId = vi.fn();
    const save = vi.fn();

    // 非対応形式のファイル
    const file = createTestFile({ type: "text/plain" });
    const result = await processAndSaveImage(file, generateId, save);

    expect(result.success).toBeFalsy();
    expect(result).toHaveProperty("error");
    expect((result as { error: string }).error).toContain(
      "対応していない画像形式です"
    );
    expect(mockImageCompression).not.toHaveBeenCalled();
    expect(generateId).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it("圧縮失敗時はsuccess=falseを返す", async () => {
    mockImageCompression.mockRejectedValue(new Error("Compression error"));

    const generateId = vi.fn();
    const save = vi.fn();

    const file = createTestFile({ type: "image/jpeg" });
    const result = await processAndSaveImage(file, generateId, save);

    expect(result.success).toBeFalsy();
    expect((result as { error: string }).error).toBe("Compression error");
    expect(generateId).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it("保存失敗時はsuccess=falseを返す", async () => {
    const compressedBlob = createTestBlob("image/webp", 512);
    mockImageCompression.mockResolvedValue(compressedBlob);

    const generateId = vi.fn().mockReturnValue("test-id");
    const save = vi.fn().mockRejectedValue(new Error("Save failed"));

    const file = createTestFile({ type: "image/jpeg" });
    const result = await processAndSaveImage(file, generateId, save);

    expect(result.success).toBeFalsy();
    expect((result as { error: string }).error).toBe("Save failed");
  });

  it("ファイルサイズ超過時はsuccess=falseを返す", async () => {
    const generateId = vi.fn();
    const save = vi.fn();

    const file = createTestFile({
      type: "image/jpeg",
      size: MAX_FILE_SIZE + 1,
    });
    const result = await processAndSaveImage(file, generateId, save);

    expect(result.success).toBeFalsy();
    expect((result as { error: string }).error).toContain(
      "ファイルサイズが大きすぎます"
    );
  });
});

// ============================================================================
// convertBlobToPdfSupportedDataUrl
// ============================================================================

describe("convertBlobToPdfSupportedDataUrl", () => {
  // FileReaderはjsdom環境で動作するため、モックは不要
  // ただしcreateImageBitmapとOffscreenCanvasはモックが必要

  describe("PDF対応形式（JPEG/PNG）", () => {
    it("JPEGのBlobをそのままdata URLに変換する", async () => {
      const jpegBlob = new Blob(["jpeg-data"], { type: "image/jpeg" });
      const result = await convertBlobToPdfSupportedDataUrl(jpegBlob);

      expect(result).not.toBeNull();
      expect(result).toMatch(/^data:image\/jpeg;base64,/);
    });

    it("PNGのBlobをそのままdata URLに変換する", async () => {
      const pngBlob = new Blob(["png-data"], { type: "image/png" });
      const result = await convertBlobToPdfSupportedDataUrl(pngBlob);

      expect(result).not.toBeNull();
      expect(result).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe("非対応形式（WebP/GIF）の再エンコード", () => {
    let originalCreateImageBitmap: typeof globalThis.createImageBitmap;

    beforeEach(() => {
      originalCreateImageBitmap = globalThis.createImageBitmap;
    });

    afterEach(() => {
      globalThis.createImageBitmap = originalCreateImageBitmap;
    });

    it("createImageBitmapが利用できない場合はnullを返す", async () => {
      // @ts-expect-error - createImageBitmapを意図的にundefinedに設定
      globalThis.createImageBitmap = undefined;

      const webpBlob = new Blob(["webp-data"], { type: "image/webp" });
      const result = await convertBlobToPdfSupportedDataUrl(webpBlob);

      expect(result).toBeNull();
    });

    it("createImageBitmapが失敗した場合はnullを返す", async () => {
      globalThis.createImageBitmap = vi
        .fn()
        .mockRejectedValue(new Error("Invalid image"));

      const webpBlob = new Blob(["invalid-webp"], { type: "image/webp" });
      const result = await convertBlobToPdfSupportedDataUrl(webpBlob);

      expect(result).toBeNull();
    });
  });
});

// ============================================================================
// fetchSampleImageBlobs
// ============================================================================

describe("fetchSampleImageBlobs", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("正常系: fetchしてBlobを取得する", async () => {
    const mockBlob = new Blob(["image-data"], { type: "image/webp" });
    vi.mocked(globalThis.fetch).mockResolvedValue(
      createMockResponse({ ok: true, blob: mockBlob })
    );

    // 実際のサンプル画像IDを使用
    const result = await fetchSampleImageBlobs(["sample_standing_01"]);

    expect(result.size).toBe(1);
    expect(result.get("sample_standing_01")).toBe(mockBlob);
  });

  it("存在しないサンプルIDはスキップする", async () => {
    const mockBlob = new Blob(["image-data"], { type: "image/webp" });
    vi.mocked(globalThis.fetch).mockResolvedValue(
      createMockResponse({ ok: true, blob: mockBlob })
    );

    // 存在しないIDを含む
    const result = await fetchSampleImageBlobs([
      "sample_standing_01",
      "sample_nonexistent_99",
    ]);

    // sample_standing_01は取得できるが、存在しないIDはスキップ
    // getSampleImagePathがundefinedを返すIDはfetchされない
    expect(result.has("sample_nonexistent_99")).toBeFalsy();
  });

  it("fetch失敗時はスキップする（例外は投げない）", async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(new Error("Network error"));

    const result = await fetchSampleImageBlobs(["sample_standing_01"]);

    expect(result.size).toBe(0);
  });

  it("レスポンスがok=falseの場合はスキップする", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      createMockResponse({ ok: false, status: 404 })
    );

    const result = await fetchSampleImageBlobs(["sample_standing_01"]);

    expect(result.size).toBe(0);
  });

  it("重複IDは内部で除外される", async () => {
    const mockBlob = new Blob(["image-data"], { type: "image/webp" });
    vi.mocked(globalThis.fetch).mockResolvedValue(
      createMockResponse({ ok: true, blob: mockBlob })
    );

    await fetchSampleImageBlobs([
      "sample_standing_01",
      "sample_standing_01",
      "sample_standing_01",
    ]);

    // fetchは1回のみ呼ばれる
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("空配列では空のMapを返す", async () => {
    const result = await fetchSampleImageBlobs([]);

    expect(result.size).toBe(0);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

// ============================================================================
// isValidImageBlob
// ============================================================================

describe("isValidImageBlob", () => {
  /**
   * 指定したマジックバイトを持つBlobを生成
   */
  function createBlobWithMagicBytes(magicBytes: number[]): Blob {
    const buffer = new Uint8Array(magicBytes);
    return new Blob([buffer]);
  }

  describe("有効な画像形式", () => {
    it("JPEGファイルを正しく検証する（FF D8 FF）", async () => {
      const jpegBlob = createBlobWithMagicBytes([0xff, 0xd8, 0xff, 0xe0]);
      const result = await isValidImageBlob(jpegBlob);

      expect(result).toBeTruthy();
    });

    it("PNGファイルを正しく検証する（89 50 4E 47 0D 0A 1A 0A）", async () => {
      const pngBlob = createBlobWithMagicBytes([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      const result = await isValidImageBlob(pngBlob);

      expect(result).toBeTruthy();
    });

    it("GIFファイルを正しく検証する（47 49 46 38）", async () => {
      // GIF89a
      const gifBlob = createBlobWithMagicBytes([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
      const result = await isValidImageBlob(gifBlob);

      expect(result).toBeTruthy();
    });

    it("GIF87aも正しく検証する", async () => {
      const gifBlob = createBlobWithMagicBytes([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]);
      const result = await isValidImageBlob(gifBlob);

      expect(result).toBeTruthy();
    });

    it("WebPファイルを正しく検証する（RIFF....WEBP）", async () => {
      // RIFF + 4バイトのサイズ + WEBP
      const webpBlob = createBlobWithMagicBytes([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x00, 0x00, 0x00, 0x00, // file size (placeholder)
        0x57, 0x45, 0x42, 0x50, // WEBP
      ]);
      const result = await isValidImageBlob(webpBlob);

      expect(result).toBeTruthy();
    });
  });

  describe("無効なファイル形式", () => {
    it("空のBlobはfalseを返す", async () => {
      const emptyBlob = new Blob([]);
      const result = await isValidImageBlob(emptyBlob);

      expect(result).toBeFalsy();
    });

    it("テキストファイルはfalseを返す", async () => {
      const textBlob = new Blob(["Hello, World!"], { type: "text/plain" });
      const result = await isValidImageBlob(textBlob);

      expect(result).toBeFalsy();
    });

    it("PDFファイルはfalseを返す（25 50 44 46 = %PDF）", async () => {
      const pdfBlob = createBlobWithMagicBytes([0x25, 0x50, 0x44, 0x46]);
      const result = await isValidImageBlob(pdfBlob);

      expect(result).toBeFalsy();
    });

    it("ZIPファイルはfalseを返す（50 4B）", async () => {
      const zipBlob = createBlobWithMagicBytes([0x50, 0x4b, 0x03, 0x04]);
      const result = await isValidImageBlob(zipBlob);

      expect(result).toBeFalsy();
    });

    it("実行ファイルはfalseを返す（4D 5A = MZ）", async () => {
      const exeBlob = createBlobWithMagicBytes([0x4d, 0x5a, 0x90, 0x00]);
      const result = await isValidImageBlob(exeBlob);

      expect(result).toBeFalsy();
    });

    it("拡張子偽装されたファイルを検出する", async () => {
      // .webpの拡張子だがPDFの内容
      const fakeImageBlob = new Blob(["%PDF-1.4"], { type: "image/webp" });
      const result = await isValidImageBlob(fakeImageBlob);

      expect(result).toBeFalsy();
    });

    it("不完全なマジックバイトはfalseを返す", async () => {
      // JPEGの最初の2バイトのみ
      const incompleteBlob = createBlobWithMagicBytes([0xff, 0xd8]);
      const result = await isValidImageBlob(incompleteBlob);

      expect(result).toBeFalsy();
    });

    it("WebP形式で不正なRIFFヘッダーはfalseを返す", async () => {
      // RIFFだがWEBPではない
      const riffBlob = createBlobWithMagicBytes([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x00, 0x00, 0x00, 0x00, // file size
        0x41, 0x56, 0x49, 0x20, // AVI (not WEBP)
      ]);
      const result = await isValidImageBlob(riffBlob);

      expect(result).toBeFalsy();
    });
  });
});
