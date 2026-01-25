/**
 * export.ts のユニットテスト
 *
 * プロジェクトのエクスポート・インポート機能をテスト
 */
import {
  APP_VERSION,
  IMPORT_ERROR_CORRUPTED_ZIP,
  IMPORT_ERROR_FILE_TOO_LARGE,
  IMPORT_ERROR_INVALID_FORMAT,
  IMPORT_ERROR_NO_PROJECT,
  IMPORT_ERROR_VALIDATION,
  MAX_IMPORT_JSON_SIZE,
  MAX_IMPORT_ZIP_SIZE,
} from "@rehab-grid/core/lib/constants";
import { type ProjectFile } from "@rehab-grid/core/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// モック設定
// ============================================================================

/**
 * モック関数を vi.hoisted で事前定義
 *
 * @remarks
 * Vitest v4 では vi.mock 内で参照するモック関数は
 * vi.hoisted で定義する必要がある
 */
const {
  mockNanoid,
  mockGetImages,
  mockPartitionImageIds,
  mockFetchSampleImageBlobs,
  mockIsValidImageBlob,
} = vi.hoisted(() => ({
  mockNanoid: vi.fn(() => "mock-id-123"),
  mockGetImages: vi.fn<() => Promise<Map<string, Blob | undefined>>>(),
  mockPartitionImageIds: vi.fn<
    () => { sampleIds: string[]; dbImageIds: string[] }
  >(() => ({ sampleIds: [], dbImageIds: [] })),
  mockFetchSampleImageBlobs: vi.fn<() => Promise<Map<string, Blob>>>(async () =>
    Promise.resolve(new Map())
  ),
  mockIsValidImageBlob: vi.fn<(blob: Blob) => Promise<boolean>>(async () =>
    Promise.resolve(true)
  ),
}));

// nanoid モック
vi.mock("nanoid", () => ({ nanoid: mockNanoid }));

// @/lib/db モック
vi.mock("@/lib/db", () => ({ getImages: mockGetImages }));

// @/utils/image モック（相対パスではなくエイリアスを使用）
vi.mock("@/utils/image", () => ({
  partitionImageIds: mockPartitionImageIds,
  fetchSampleImageBlobs: mockFetchSampleImageBlobs,
  isValidImageBlob: mockIsValidImageBlob,
}));

// モック定義後に実装ファイルをインポート（順序重要）
import {
  downloadJSON,
  downloadProjectAsJSON,
  downloadProjectAsZIP,
  exportToJSON,
  exportToZIP,
  getDateString,
  importProject,
} from "@rehab-grid/core/utils/export";

// ============================================================================
// テストヘルパー
// ============================================================================

/** テスト用の固定日時 */
const FIXED_DATE = new Date("2024-06-15T10:30:00.000Z");

/**
 * テスト用の ProjectFile を生成
 */
function createTestProject(overrides: Partial<ProjectFile> = {}): ProjectFile {
  return {
    meta: {
      version: "1.0.0",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      title: "テストプロジェクト",
      projectType: "training",
    },
    settings: {
      layoutType: "grid2",
      themeColor: "#3b82f6",
    },
    items: [],
    ...overrides,
  };
}

/**
 * テスト用の File オブジェクトを生成
 *
 * @remarks
 * jsdom では File.text() や File.slice().arrayBuffer() が正しく動作しないため、
 * これらのメソッドを上書きする
 */
function createTestFile(
  name: string,
  content: string | ArrayBuffer,
  type = "application/json"
): File {
  const blob = new Blob([content], { type });
  const file = new File([blob], name, { type });

  // jsdom 用の polyfill: text() メソッドを上書き
  Object.defineProperty(file, "text", {
    value: async () => {
      const result =
        typeof content === "string"
          ? content
          : new TextDecoder().decode(content);
      return Promise.resolve(result);
    },
  });

  // slice().arrayBuffer() をサポートするために slice を拡張
  const originalSlice = file.slice.bind(file);
  Object.defineProperty(file, "slice", {
    value: (start?: number, end?: number, contentType?: string) => {
      const slicedBlob = originalSlice(start, end, contentType);
      // arrayBuffer メソッドを上書き
      Object.defineProperty(slicedBlob, "arrayBuffer", {
        value: async () => {
          const arrayContent =
            typeof content === "string"
              ? new TextEncoder().encode(content)
              : new Uint8Array(content);
          return Promise.resolve(
            arrayContent.slice(start ?? 0, end ?? arrayContent.length).buffer
          );
        },
      });
      return slicedBlob;
    },
  });

  return file;
}

/**
 * 有効なプロジェクトJSONを生成
 */
function createValidProjectJSON(): string {
  const project = createTestProject();
  return JSON.stringify(project);
}

/**
 * jsdom用のFileにpolyfillを適用
 *
 * @remarks
 * JSZipで生成されたBlobからFileを作成する場合など、
 * createTestFileを使えない場合に使用
 */
function applyFilePolyfill(file: File, content: ArrayBuffer): File {
  // slice().arrayBuffer() をサポートするために slice を拡張
  const originalSlice = file.slice.bind(file);
  Object.defineProperty(file, "slice", {
    value: (start?: number, end?: number, contentType?: string) => {
      const slicedBlob = originalSlice(start, end, contentType);
      // arrayBuffer メソッドを上書き
      Object.defineProperty(slicedBlob, "arrayBuffer", {
        value: async () => {
          const uint8 = new Uint8Array(content);
          return Promise.resolve(
            uint8.slice(start ?? 0, end ?? uint8.length).buffer
          );
        },
      });
      return slicedBlob;
    },
  });
  return file;
}

// ============================================================================
// テストケース
// ============================================================================

describe("export.ts", () => {
  beforeEach(() => {
    // shouldAdvanceTime: true で非同期処理の時間も自動進行させる
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(FIXED_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // exportToJSON
  // --------------------------------------------------------------------------
  describe("exportToJSON", () => {
    it("プロジェクトをJSON文字列に変換できる", () => {
      const project = createTestProject({ items: [] });

      const result = exportToJSON(project);

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");

      const parsed = JSON.parse(result) as ProjectFile;
      expect(parsed.meta.title).toBe("テストプロジェクト");
      expect(parsed.settings.layoutType).toBe("grid2");
    });

    it("items の imageSource が空文字列に変換される", () => {
      const project = createTestProject({
        items: [
          {
            id: "item-1",
            order: 0,
            title: "スクワット",
            imageSource: "img-123",
            description: "テスト",
          },
          {
            id: "item-2",
            order: 1,
            title: "腕立て伏せ",
            imageSource: "img-456",
            description: "テスト2",
          },
        ],
      });

      const result = exportToJSON(project);
      const parsed = JSON.parse(result) as ProjectFile;

      expect(parsed.items[0]?.imageSource).toBe("");
      expect(parsed.items[1]?.imageSource).toBe("");
    });

    it("meta.version と meta.updatedAt が更新される", () => {
      const project = createTestProject();

      const result = exportToJSON(project);
      const parsed = JSON.parse(result) as ProjectFile;

      expect(parsed.meta.version).toBe(APP_VERSION);
      expect(parsed.meta.updatedAt).toBe(FIXED_DATE.toISOString());
    });

    it("空のitemsでも正常に動作する", () => {
      const project = createTestProject({ items: [] });

      const result = exportToJSON(project);
      const parsed = JSON.parse(result) as ProjectFile;

      expect(parsed.items).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // downloadJSON
  // --------------------------------------------------------------------------
  describe("downloadJSON", () => {
    let mockClick: ReturnType<typeof vi.fn>;
    let mockCreateObjectURL: ReturnType<typeof vi.spyOn>;
    let mockRevokeObjectURL: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      mockClick = vi.fn();
      vi.spyOn(document, "createElement").mockImplementation((tagName) => {
        if (tagName === "a") {
          return {
            href: "",
            download: "",
            click: mockClick,
          } as unknown as HTMLAnchorElement;
        }
        return document.createElement(tagName);
      });
      mockCreateObjectURL = vi
        .spyOn(URL, "createObjectURL")
        .mockReturnValue("blob:mock-url");
      mockRevokeObjectURL = vi
        .spyOn(URL, "revokeObjectURL")
        .mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("アンカー要素が作成されてクリックされる", () => {
      downloadJSON("test.json", '{"test": true}');

      expect(mockClick).toHaveBeenCalledTimes(1);
    });

    it("URL.createObjectURL と URL.revokeObjectURL が呼ばれる", () => {
      downloadJSON("test.json", '{"test": true}');

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    });
  });

  // --------------------------------------------------------------------------
  // getDateString
  // --------------------------------------------------------------------------
  describe("getDateString", () => {
    it("YYYY-MM-DD形式で日付を返す", () => {
      const result = getDateString();

      expect(result).toBe("2024-06-15");
    });

    it("月・日が1桁の場合はゼロ埋めされる", () => {
      vi.setSystemTime(new Date("2024-01-05T00:00:00Z"));

      const result = getDateString();

      expect(result).toBe("2024-01-05");
    });
  });

  // --------------------------------------------------------------------------
  // downloadProjectAsJSON
  // --------------------------------------------------------------------------
  describe("downloadProjectAsJSON", () => {
    let mockClick: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockClick = vi.fn();
      vi.spyOn(document, "createElement").mockImplementation((tagName) => {
        if (tagName === "a") {
          return {
            href: "",
            download: "",
            click: mockClick,
          } as unknown as HTMLAnchorElement;
        }
        return document.createElement(tagName);
      });
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("rehab-grid-YYYY-MM-DD.json 形式でダウンロードされる", () => {
      const project = createTestProject();
      let capturedFilename = "";

      vi.spyOn(document, "createElement").mockImplementation((tagName) => {
        if (tagName === "a") {
          const anchor = {
            href: "",
            download: "",
            click: vi.fn(),
          };
          Object.defineProperty(anchor, "download", {
            set(value: string) {
              capturedFilename = value;
            },
            get() {
              return capturedFilename;
            },
          });
          return anchor as unknown as HTMLAnchorElement;
        }
        return document.createElement(tagName);
      });

      downloadProjectAsJSON(project);

      expect(capturedFilename).toBe("rehab-grid-2024-06-15.json");
    });
  });

  // --------------------------------------------------------------------------
  // exportToZIP
  // --------------------------------------------------------------------------
  describe("exportToZIP", () => {
    it("画像がimagesフォルダに追加され、ZIPが生成される", async () => {
      const project = createTestProject({
        items: [
          {
            id: "item-1",
            order: 0,
            title: "スクワット",
            imageSource: "img-123",
            description: "",
          },
        ],
      });

      const images = new Map<string, Blob | undefined>([
        ["img-123", new Blob(["test-image"], { type: "image/webp" })],
      ]);

      const result = await exportToZIP(project, images);

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe("application/zip");
    });

    it("Blobが未定義の場合はスキップされる", async () => {
      const project = createTestProject({
        items: [
          {
            id: "item-1",
            order: 0,
            title: "スクワット",
            imageSource: "img-123",
            description: "",
          },
        ],
      });

      const images = new Map<string, Blob | undefined>([
        ["img-123", undefined],
      ]);

      const result = await exportToZIP(project, images);

      // ZIPは正常に生成される
      expect(result).toBeInstanceOf(Blob);
    });

    it("MIMEタイプごとに正しい拡張子が使われる", async () => {
      const project = createTestProject({
        items: [
          {
            id: "item-1",
            order: 0,
            title: "A",
            imageSource: "img-webp",
            description: "",
          },
          {
            id: "item-2",
            order: 1,
            title: "B",
            imageSource: "img-jpeg",
            description: "",
          },
          {
            id: "item-3",
            order: 2,
            title: "C",
            imageSource: "img-png",
            description: "",
          },
          {
            id: "item-4",
            order: 3,
            title: "D",
            imageSource: "img-gif",
            description: "",
          },
          {
            id: "item-5",
            order: 4,
            title: "E",
            imageSource: "img-unknown",
            description: "",
          },
        ],
      });

      const images = new Map<string, Blob | undefined>([
        ["img-webp", new Blob([""], { type: "image/webp" })],
        ["img-jpeg", new Blob([""], { type: "image/jpeg" })],
        ["img-png", new Blob([""], { type: "image/png" })],
        ["img-gif", new Blob([""], { type: "image/gif" })],
        ["img-unknown", new Blob([""], { type: "application/octet-stream" })],
      ]);

      const result = await exportToZIP(project, images);

      // ZIPが正常に生成されることを確認
      expect(result).toBeInstanceOf(Blob);

      // ZIPの中身を検証するためにJSZipでパースする
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(result);
      const files = Object.keys(zip.files);

      expect(files).toContain("images/img_001.webp");
      expect(files).toContain("images/img_002.jpg");
      expect(files).toContain("images/img_003.png");
      expect(files).toContain("images/img_004.gif");
      expect(files).toContain("images/img_005.webp"); // 不明な形式はwebpになる
    });

    it("imageSourceが相対パスに変換される", async () => {
      const project = createTestProject({
        items: [
          {
            id: "item-1",
            order: 0,
            title: "スクワット",
            imageSource: "img-123",
            description: "",
          },
        ],
      });

      const images = new Map<string, Blob | undefined>([
        ["img-123", new Blob(["test-image"], { type: "image/webp" })],
      ]);

      const result = await exportToZIP(project, images);

      // ZIPの中のproject.jsonを検証
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(result);
      const projectJsonStr = await zip.file("project.json")?.async("string");

      expect(projectJsonStr).toBeDefined();

      const projectJson = JSON.parse(projectJsonStr!) as ProjectFile;
      expect(projectJson.items[0]?.imageSource).toBe("images/img_001.webp");
    });
  });

  // --------------------------------------------------------------------------
  // downloadProjectAsZIP
  // --------------------------------------------------------------------------
  describe("downloadProjectAsZIP", () => {
    let mockClick: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockClick = vi.fn();
      vi.spyOn(document, "createElement").mockImplementation((tagName) => {
        if (tagName === "a") {
          return {
            href: "",
            download: "",
            click: mockClick,
          } as unknown as HTMLAnchorElement;
        }
        return document.createElement(tagName);
      });
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

      // モックの戻り値を設定
      mockGetImages.mockResolvedValue(new Map());
      mockPartitionImageIds.mockReturnValue({ sampleIds: [], dbImageIds: [] });
      mockFetchSampleImageBlobs.mockResolvedValue(new Map());
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("getImages と fetchSampleImageBlobs が呼ばれる", async () => {
      const project = createTestProject({
        items: [
          {
            id: "item-1",
            order: 0,
            title: "スクワット",
            imageSource: "img-123",
            description: "",
          },
          {
            id: "item-2",
            order: 1,
            title: "腕立て伏せ",
            imageSource: "sample:squat",
            description: "",
          },
        ],
      });

      mockPartitionImageIds.mockReturnValue({
        sampleIds: ["sample:squat"],
        dbImageIds: ["img-123"],
      });

      await downloadProjectAsZIP(project);

      expect(mockPartitionImageIds).toHaveBeenCalledWith([
        "img-123",
        "sample:squat",
      ]);
      expect(mockGetImages).toHaveBeenCalledWith(["img-123"]);
      expect(mockFetchSampleImageBlobs).toHaveBeenCalledWith(["sample:squat"]);
    });

    it("画像IDがサンプルとDB用に分離される", async () => {
      const project = createTestProject({
        items: [
          {
            id: "item-1",
            order: 0,
            title: "スクワット",
            imageSource: "db-img-1",
            description: "",
          },
          {
            id: "item-2",
            order: 1,
            title: "腕立て伏せ",
            imageSource: "sample:standing_01",
            description: "",
          },
        ],
      });

      mockPartitionImageIds.mockReturnValue({
        sampleIds: ["sample:standing_01"],
        dbImageIds: ["db-img-1"],
      });

      await downloadProjectAsZIP(project);

      expect(mockPartitionImageIds).toHaveBeenCalled();
      expect(mockGetImages).toHaveBeenCalledWith(["db-img-1"]);
      expect(mockFetchSampleImageBlobs).toHaveBeenCalledWith([
        "sample:standing_01",
      ]);
    });
  });

  // --------------------------------------------------------------------------
  // importProject
  // --------------------------------------------------------------------------
  describe("importProject", () => {
    describe("ファイル形式判別", () => {
      it("拡張子でJSON形式を判別してインポートできる", async () => {
        const file = createTestFile("project.json", createValidProjectJSON());

        const result = await importProject(file);

        expect(result.project).toBeDefined();
        expect(result.project.meta.title).toBe("テストプロジェクト");
        expect(result.images.size).toBe(0);
      });

      it("拡張子でZIP形式を判別してインポートできる", async () => {
        // 有効なZIPファイルを作成
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        zip.file("project.json", createValidProjectJSON());
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const file = new File([zipBlob], "project.zip", {
          type: "application/zip",
        });

        const result = await importProject(file);

        expect(result.project).toBeDefined();
        expect(result.project.meta.title).toBe("テストプロジェクト");
      });

      it("マジックバイトでZIP形式を判別できる", async () => {
        // 有効なZIPファイルを作成（拡張子なし）
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        zip.file("project.json", createValidProjectJSON());
        const zipArrayBuffer = await zip.generateAsync({ type: "arraybuffer" });
        const file = new File([zipArrayBuffer], "project", {
          type: "application/octet-stream",
        });

        // jsdom用のpolyfillを適用
        applyFilePolyfill(file, zipArrayBuffer);

        const result = await importProject(file);

        expect(result.project).toBeDefined();
      });

      it("不正なファイル形式でエラーを投げる", async () => {
        const file = createTestFile(
          "project.txt",
          "not a valid format",
          "text/plain"
        );

        await expect(importProject(file)).rejects.toThrow(
          IMPORT_ERROR_INVALID_FORMAT
        );
      });
    });

    describe("ファイルサイズ検証", () => {
      it("JSONファイルサイズ超過でエラーを投げる", async () => {
        // MAX_IMPORT_JSON_SIZE を超えるファイルを作成
        const largeContent = "x".repeat(MAX_IMPORT_JSON_SIZE + 1);
        const file = createTestFile("project.json", largeContent);

        await expect(importProject(file)).rejects.toThrow(
          IMPORT_ERROR_FILE_TOO_LARGE
        );
      });

      it("ZIPファイルサイズ超過でエラーを投げる", async () => {
        // MAX_IMPORT_ZIP_SIZE を超えるファイルを作成
        const largeContent = new ArrayBuffer(MAX_IMPORT_ZIP_SIZE + 1);
        const blob = new Blob([largeContent], { type: "application/zip" });
        // ZIPのマジックバイトを設定
        const header = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
        const combinedBlob = new Blob([header, blob], {
          type: "application/zip",
        });
        const file = new File([combinedBlob], "project.zip", {
          type: "application/zip",
        });

        await expect(importProject(file)).rejects.toThrow(
          IMPORT_ERROR_FILE_TOO_LARGE
        );
      });
    });

    describe("JSONインポート", () => {
      it("JSONパースエラーでバリデーションエラーを投げる", async () => {
        const file = createTestFile("project.json", "{ invalid json }");

        await expect(importProject(file)).rejects.toThrow(
          IMPORT_ERROR_VALIDATION
        );
      });

      it("Zodスキーマバリデーションエラーを投げる", async () => {
        // 必須フィールドが欠けているJSON
        const invalidProject = { meta: {}, settings: {} };
        const file = createTestFile(
          "project.json",
          JSON.stringify(invalidProject)
        );

        await expect(importProject(file)).rejects.toThrow(
          IMPORT_ERROR_VALIDATION
        );
      });

      it("インポート時にバージョンとupdatedAtが更新される", async () => {
        const file = createTestFile("project.json", createValidProjectJSON());

        const result = await importProject(file);

        expect(result.project.meta.version).toBe(APP_VERSION);
        expect(result.project.meta.updatedAt).toBe(FIXED_DATE.toISOString());
      });

      it("JSONインポート時に画像IDがクリアされる", async () => {
        const projectWithImages = createTestProject({
          items: [
            {
              id: "item-1",
              order: 0,
              title: "スクワット",
              imageSource: "some-image-id",
              description: "",
            },
          ],
        });
        const file = createTestFile(
          "project.json",
          JSON.stringify(projectWithImages)
        );

        const result = await importProject(file);

        expect(result.project.items[0]?.imageSource).toBe("");
        expect(result.images.size).toBe(0);
      });
    });

    describe("ZIPインポート", () => {
      it("破損したZIPでエラーを投げる", async () => {
        // ZIPのマジックバイトを持つが無効なデータ
        const invalidZip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
        const file = new File([invalidZip], "project.zip", {
          type: "application/zip",
        });

        await expect(importProject(file)).rejects.toThrow(
          IMPORT_ERROR_CORRUPTED_ZIP
        );
      });

      it("project.json不在でエラーを投げる", async () => {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        zip.file("other.txt", "some content");
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const file = new File([zipBlob], "project.zip", {
          type: "application/zip",
        });

        await expect(importProject(file)).rejects.toThrow(
          IMPORT_ERROR_NO_PROJECT
        );
      });

      it("ZIPインポート時に画像が抽出される", async () => {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();

        const projectWithImage = createTestProject({
          items: [
            {
              id: "item-1",
              order: 0,
              title: "スクワット",
              imageSource: "images/img_001.webp",
              description: "",
            },
          ],
        });
        zip.file("project.json", JSON.stringify(projectWithImage));
        zip.file(
          "images/img_001.webp",
          new Blob(["test-image"], { type: "image/webp" })
        );

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const file = new File([zipBlob], "project.zip", {
          type: "application/zip",
        });

        const result = await importProject(file);

        expect(result.images.size).toBe(1);
        // 新しいIDが割り当てられる
        expect(mockNanoid).toHaveBeenCalled();
      });

      it("ZIPインポート時にimageSourceが新しいIDに変換される", async () => {
        mockNanoid.mockReturnValue("new-image-id");

        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();

        const projectWithImage = createTestProject({
          items: [
            {
              id: "item-1",
              order: 0,
              title: "スクワット",
              imageSource: "images/img_001.webp",
              description: "",
            },
          ],
        });
        zip.file("project.json", JSON.stringify(projectWithImage));
        zip.file(
          "images/img_001.webp",
          new Blob(["test-image"], { type: "image/webp" })
        );

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const file = new File([zipBlob], "project.zip", {
          type: "application/zip",
        });

        const result = await importProject(file);

        expect(result.project.items[0]?.imageSource).toBe("new-image-id");
      });

      it("ZIPインポート時にisValidImageBlobが呼ばれる", async () => {
        mockIsValidImageBlob.mockClear();
        mockIsValidImageBlob.mockResolvedValue(true);

        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();

        const projectWithImage = createTestProject({
          items: [
            {
              id: "item-1",
              order: 0,
              title: "スクワット",
              imageSource: "images/img_001.webp",
              description: "",
            },
          ],
        });
        zip.file("project.json", JSON.stringify(projectWithImage));
        zip.file(
          "images/img_001.webp",
          new Blob(["test-image"], { type: "image/webp" })
        );

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const file = new File([zipBlob], "project.zip", {
          type: "application/zip",
        });

        await importProject(file);

        expect(mockIsValidImageBlob).toHaveBeenCalledTimes(1);
      });

      it("無効な画像ファイルはスキップされる", async () => {
        mockIsValidImageBlob.mockClear();
        // 1つ目は無効、2つ目は有効
        mockIsValidImageBlob
          .mockResolvedValueOnce(false)
          .mockResolvedValueOnce(true);
        mockNanoid.mockReturnValue("valid-image-id");

        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();

        const projectWithImages = createTestProject({
          items: [
            {
              id: "item-1",
              order: 0,
              title: "偽装ファイル",
              imageSource: "images/fake.webp",
              description: "",
            },
            {
              id: "item-2",
              order: 1,
              title: "正常な画像",
              imageSource: "images/valid.webp",
              description: "",
            },
          ],
        });
        zip.file("project.json", JSON.stringify(projectWithImages));
        // 偽装ファイル（PDFをwebpとして保存）
        zip.file("images/fake.webp", new Blob(["%PDF-1.4"], { type: "image/webp" }));
        // 正常な画像
        zip.file("images/valid.webp", new Blob(["valid-image"], { type: "image/webp" }));

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const file = new File([zipBlob], "project.zip", {
          type: "application/zip",
        });

        const result = await importProject(file);

        // isValidImageBlobは2回呼ばれる
        expect(mockIsValidImageBlob).toHaveBeenCalledTimes(2);
        // 無効な画像はスキップされ、imageSourceは空になる
        expect(result.project.items[0]?.imageSource).toBe("");
        // 有効な画像は新しいIDが割り当てられる
        expect(result.project.items[1]?.imageSource).toBe("valid-image-id");
        // imagesには有効な画像のみ含まれる
        expect(result.images.size).toBe(1);
      });
    });
  });
});
