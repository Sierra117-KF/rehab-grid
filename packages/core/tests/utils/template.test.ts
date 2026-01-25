/**
 * template.ts のユニットテスト
 *
 * テンプレート読み込み機能をテスト
 */
import {
  APP_VERSION,
  TEMPLATE_BASE_PATH,
  TEMPLATE_INVALID_DATA_ERROR,
  TEMPLATE_LOAD_ERROR,
  TEMPLATE_NOT_FOUND_ERROR,
} from "@rehab-grid/core/lib/constants";
import { type ProjectFile, type TemplateMetadata } from "@rehab-grid/core/types";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

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
const { mockNanoid, mockGetTemplateById } = vi.hoisted(() => {
  let nanoidCounter = 0;
  return {
    mockNanoid: vi.fn(() => `mock-id-${++nanoidCounter}`),
    mockGetTemplateById: vi.fn(),
  };
});

// nanoid モック
vi.mock("nanoid", () => ({ nanoid: mockNanoid }));

// @/lib/templates モック
vi.mock("@/lib/templates", () => ({ getTemplateById: mockGetTemplateById }));

// モック定義後に実装ファイルをインポート（順序重要）
import { loadTemplate } from "@rehab-grid/core/utils/template";

// ============================================================================
// テストヘルパー
// ============================================================================

/** テスト用の固定日時 */
const FIXED_DATE = new Date("2024-06-15T10:30:00.000Z");

/**
 * テスト用の TemplateMetadata を生成
 */
function createTemplateMetadata(
  overrides: Partial<TemplateMetadata> = {}
): TemplateMetadata {
  return {
    id: "test-template",
    name: "テストテンプレート",
    description: "テスト用のテンプレート",
    cardCount: 2,
    path: "test-template",
    ...overrides,
  };
}

/**
 * テスト用の有効な ProjectFile データを生成
 */
function createValidProjectData(
  overrides: Partial<ProjectFile> = {}
): ProjectFile {
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
 * fetch モックレスポンスを生成
 */
function createMockResponse(
  ok: boolean,
  data: unknown,
  status = 200
): Response {
  const response: Partial<Response> = {
    ok,
    status,
    json: async () => Promise.resolve(data),
    blob: async () => Promise.resolve(data as Blob),
  };
  return response as Response;
}

/**
 * fetch モックを設定するヘルパー
 *
 * @param projectData - project.json のレスポンスデータ
 * @param imageBlobs - 画像パスと Blob のマップ
 */
function setupFetchMock(
  projectData: ProjectFile | null,
  imageBlobs = new Map<string, Blob>()
): void {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    // input は string | URL | Request のいずれか
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    if (url.endsWith("/project.json")) {
      if (projectData === null) {
        return Promise.resolve(createMockResponse(false, {}, 404));
      }
      return Promise.resolve(createMockResponse(true, projectData));
    }

    // 画像リクエスト
    for (const [imagePath, blob] of imageBlobs) {
      if (url.endsWith(imagePath)) {
        return Promise.resolve(createMockResponse(true, blob));
      }
    }

    // 画像が見つからない場合
    return Promise.resolve(createMockResponse(false, {}, 404));
  });
}

// ============================================================================
// テストケース
// ============================================================================

describe("loadTemplate", () => {
  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.setSystemTime(FIXED_DATE);
    // nanoid カウンターをリセット
    let counter = 0;
    mockNanoid.mockImplementation(() => `mock-id-${++counter}`);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // 正常系
  // --------------------------------------------------------------------------
  describe("正常系", () => {
    it("テンプレートを正常に読み込める", async () => {
      const metadata = createTemplateMetadata();
      const projectData = createValidProjectData({
        items: [
          {
            id: "original-item-1",
            order: 0,
            title: "スクワット",
            imageSource: "",
            description: "膝を曲げる",
          },
        ],
      });

      mockGetTemplateById.mockReturnValue(metadata);
      setupFetchMock(projectData);

      const result = await loadTemplate("test-template");

      expect(result.project).toBeDefined();
      expect(result.project.meta.title).toBe("テストプロジェクト");
      expect(result.project.items).toHaveLength(1);
      expect(result.images.size).toBe(0);
    });

    it("画像付きアイテムが正しく処理される", async () => {
      const metadata = createTemplateMetadata();
      const projectData = createValidProjectData({
        items: [
          {
            id: "original-item-1",
            order: 0,
            title: "スクワット",
            imageSource: "images/squat.webp",
            description: "膝を曲げる",
          },
        ],
      });
      const imageBlob = new Blob(["test-image"], { type: "image/webp" });

      mockGetTemplateById.mockReturnValue(metadata);
      setupFetchMock(projectData, new Map([["images/squat.webp", imageBlob]]));

      const result = await loadTemplate("test-template");

      expect(result.images.size).toBe(1);
      // imageSource が新しい ID に置換されている
      expect(result.project.items[0]?.imageSource).toBe("mock-id-1");
      // 画像が Map に保存されている
      expect(result.images.has("mock-id-1")).toBeTruthy();
    });

    it("複数アイテムにそれぞれ新しい ID が割り当てられる", async () => {
      const metadata = createTemplateMetadata();
      const projectData = createValidProjectData({
        items: [
          {
            id: "orig-1",
            order: 0,
            title: "運動A",
            imageSource: "",
            description: "",
          },
          {
            id: "orig-2",
            order: 1,
            title: "運動B",
            imageSource: "",
            description: "",
          },
          {
            id: "orig-3",
            order: 2,
            title: "運動C",
            imageSource: "",
            description: "",
          },
        ],
      });

      mockGetTemplateById.mockReturnValue(metadata);
      setupFetchMock(projectData);

      const result = await loadTemplate("test-template");

      expect(result.project.items).toHaveLength(3);
      expect(result.project.items[0]?.id).toBe("mock-id-1");
      expect(result.project.items[1]?.id).toBe("mock-id-2");
      expect(result.project.items[2]?.id).toBe("mock-id-3");
    });

    it("precautions の ID も nanoid で再生成される", async () => {
      const metadata = createTemplateMetadata();
      const projectData = createValidProjectData({
        items: [
          {
            id: "orig-1",
            order: 0,
            title: "運動A",
            imageSource: "",
            description: "",
            precautions: [
              { id: "old-p1", value: "痛みが出たら中止" },
              { id: "old-p2", value: "呼吸を止めない" },
            ],
          },
        ],
      });

      mockGetTemplateById.mockReturnValue(metadata);
      setupFetchMock(projectData);

      const result = await loadTemplate("test-template");

      const precautions = result.project.items[0]?.precautions;
      expect(precautions).toHaveLength(2);
      // アイテム ID が mock-id-1 なので、precautions は mock-id-2, mock-id-3
      expect(precautions?.[0]?.id).toBe("mock-id-2");
      expect(precautions?.[1]?.id).toBe("mock-id-3");
      // 値は保持される
      expect(precautions?.[0]?.value).toBe("痛みが出たら中止");
      expect(precautions?.[1]?.value).toBe("呼吸を止めない");
    });

    it("meta 情報が更新される", async () => {
      const metadata = createTemplateMetadata();
      const projectData = createValidProjectData();

      mockGetTemplateById.mockReturnValue(metadata);
      setupFetchMock(projectData);

      const result = await loadTemplate("test-template");

      expect(result.project.meta.version).toBe(APP_VERSION);
      expect(result.project.meta.createdAt).toBe(FIXED_DATE.toISOString());
      expect(result.project.meta.updatedAt).toBe(FIXED_DATE.toISOString());
    });

    it("正しいパスで fetch が呼ばれる", async () => {
      const metadata = createTemplateMetadata({ path: "custom-path" });
      const projectData = createValidProjectData();

      mockGetTemplateById.mockReturnValue(metadata);
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(createMockResponse(true, projectData));

      await loadTemplate("test-template");

      expect(fetchSpy).toHaveBeenCalledWith(
        `${TEMPLATE_BASE_PATH}/custom-path/project.json`
      );
    });
  });

  // --------------------------------------------------------------------------
  // エラー系
  // --------------------------------------------------------------------------
  describe("エラー系", () => {
    it("存在しないテンプレート ID でエラーを投げる", async () => {
      mockGetTemplateById.mockReturnValue(undefined);

      await expect(loadTemplate("non-existent")).rejects.toThrow(
        TEMPLATE_NOT_FOUND_ERROR
      );
    });

    it("fetch が失敗した場合にエラーを投げる", async () => {
      const metadata = createTemplateMetadata();
      mockGetTemplateById.mockReturnValue(metadata);
      vi.spyOn(globalThis, "fetch").mockRejectedValue(
        new Error("Network error")
      );

      await expect(loadTemplate("test-template")).rejects.toThrow(
        TEMPLATE_LOAD_ERROR
      );
    });

    it("HTTP エラーの場合にエラーを投げる", async () => {
      const metadata = createTemplateMetadata();
      mockGetTemplateById.mockReturnValue(metadata);
      setupFetchMock(null); // 404 を返す

      await expect(loadTemplate("test-template")).rejects.toThrow(
        TEMPLATE_LOAD_ERROR
      );
    });

    it("無効な JSON データでバリデーションエラーを投げる", async () => {
      const metadata = createTemplateMetadata();
      const invalidData = { meta: {}, settings: {} }; // 必須フィールドが不足

      mockGetTemplateById.mockReturnValue(metadata);
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        createMockResponse(true, invalidData)
      );

      await expect(loadTemplate("test-template")).rejects.toThrow(
        TEMPLATE_INVALID_DATA_ERROR
      );
    });
  });

  // --------------------------------------------------------------------------
  // エッジケース
  // --------------------------------------------------------------------------
  describe("エッジケース", () => {
    it("画像取得失敗時は imageSource が空文字列になる", async () => {
      const metadata = createTemplateMetadata();
      const projectData = createValidProjectData({
        items: [
          {
            id: "orig-1",
            order: 0,
            title: "運動A",
            imageSource: "images/missing.webp",
            description: "",
          },
        ],
      });

      mockGetTemplateById.mockReturnValue(metadata);
      // 画像なしで fetch モック設定（404 を返す）
      setupFetchMock(projectData, new Map());

      const result = await loadTemplate("test-template");

      expect(result.project.items[0]?.imageSource).toBe("");
      expect(result.images.size).toBe(0);
    });

    it("imageSource が空のアイテムは画像取得をスキップする", async () => {
      const metadata = createTemplateMetadata();
      const projectData = createValidProjectData({
        items: [
          {
            id: "orig-1",
            order: 0,
            title: "運動A",
            imageSource: "",
            description: "",
          },
        ],
      });

      mockGetTemplateById.mockReturnValue(metadata);
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(createMockResponse(true, projectData));

      const result = await loadTemplate("test-template");

      // project.json の fetch のみ
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(result.project.items[0]?.imageSource).toBe("");
    });

    it("items が空配列でも正常に処理される", async () => {
      const metadata = createTemplateMetadata();
      const projectData = createValidProjectData({ items: [] });

      mockGetTemplateById.mockReturnValue(metadata);
      setupFetchMock(projectData);

      const result = await loadTemplate("test-template");

      expect(result.project.items).toHaveLength(0);
      expect(result.images.size).toBe(0);
    });

    it("複数の画像を持つ複数アイテムが正しく処理される", async () => {
      const metadata = createTemplateMetadata();
      const projectData = createValidProjectData({
        items: [
          {
            id: "orig-1",
            order: 0,
            title: "運動A",
            imageSource: "images/a.webp",
            description: "",
          },
          {
            id: "orig-2",
            order: 1,
            title: "運動B",
            imageSource: "images/b.webp",
            description: "",
          },
        ],
      });
      const blobA = new Blob(["image-a"], { type: "image/webp" });
      const blobB = new Blob(["image-b"], { type: "image/webp" });

      mockGetTemplateById.mockReturnValue(metadata);
      setupFetchMock(
        projectData,
        new Map([
          ["images/a.webp", blobA],
          ["images/b.webp", blobB],
        ])
      );

      const result = await loadTemplate("test-template");

      expect(result.images.size).toBe(2);
      // 画像 ID は mock-id-1, mock-id-2（アイテム ID は mock-id-3, mock-id-4）
      expect(result.images.has("mock-id-1")).toBeTruthy();
      expect(result.images.has("mock-id-2")).toBeTruthy();
    });
  });
});
