import { APP_VERSION } from "@rehab-grid/core/lib/constants";
import {
  type EditorItem,
  type ImportResult,
  type ProjectFile,
  type ProjectMeta,
} from "@rehab-grid/core/types";
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

/**
 * db モック用の関数定義
 *
 * @remarks
 * vi.hoisted でモック関数を定義し、vi.mock 内で参照できるようにする
 */
const { mockProjectsPut, mockImagesPut, mockTransaction, mockCreateProjectRecord } =
  vi.hoisted(() => ({
    mockProjectsPut: vi.fn(),
    mockImagesPut: vi.fn(),
    mockTransaction: vi.fn(),
    // 更新日時の付け直しは lib/db のテストで確認するため、ここでは渡された値を記録するだけ
    mockCreateProjectRecord: vi.fn((id: string, data: unknown) => ({
      id,
      data,
    })),
  }));

/**
 * lib/db モジュールのモック
 *
 * @remarks
 * applyImportResult が使用する db.transaction, db.projects.put, db.images.put, createProjectRecord をモック
 */
vi.mock("@/lib/db", () => ({
  db: {
    transaction: mockTransaction,
    projects: { put: mockProjectsPut },
    images: { put: mockImagesPut },
  },
  createProjectRecord: mockCreateProjectRecord,
}));

// モック定義後に実装ファイルをインポート（順序重要）
import { applyImportResult } from "@rehab-grid/core/utils/project";

/**
 * テスト用の固定日時
 */
const FIXED_DATE = new Date("2024-01-15T10:30:00.000Z");

/**
 * テスト用の ProjectMeta を生成
 */
function createTestMeta(overrides: Partial<ProjectMeta> = {}): ProjectMeta {
  return {
    version: APP_VERSION,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    title: "テストプロジェクト",
    projectType: "training",
    ...overrides,
  };
}

/**
 * テスト用の EditorItem を生成
 */
function createTestItem(overrides: Partial<EditorItem> = {}): EditorItem {
  return {
    id: "test-item-1",
    order: 0,
    title: "テスト運動",
    imageSource: "",
    description: "",
    ...overrides,
  };
}

/**
 * テスト用の ProjectFile を生成
 */
function createTestProjectFile(
  overrides: Partial<ProjectFile> = {}
): ProjectFile {
  return {
    meta: createTestMeta(),
    settings: {
      layoutType: "grid2",
      themeColor: "#3b82f6",
    },
    items: [],
    ...overrides,
  };
}

describe("utils/project", () => {
  describe("applyImportResult", () => {
    beforeAll(() => {
      vi.useFakeTimers();
    });

    afterAll(() => {
      vi.useRealTimers();
    });

    beforeEach(() => {
      vi.setSystemTime(FIXED_DATE);

      // トランザクションのモック: コールバックを即座に実行
      mockTransaction.mockImplementation(
        async (
          _mode: string,
          _tables: unknown[],
          callback: () => Promise<void>
        ) => {
          await callback();
        }
      );
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("画像とプロジェクトが1つのトランザクションで指定IDに保存されること", async () => {
      const blob1 = new Blob(["image1"], { type: "image/png" });
      const blob2 = new Blob(["image2"], { type: "image/png" });
      const project = createTestProjectFile({
        items: [
          createTestItem({ id: "item-1", imageSource: "img-1" }),
          createTestItem({ id: "item-2", imageSource: "img-2", order: 1 }),
        ],
      });
      const images = new Map<string, Blob>([
        ["img-1", blob1],
        ["img-2", blob2],
      ]);
      const result: ImportResult = { project, images };

      await applyImportResult(result, "project-new");

      // トランザクションが呼ばれたこと
      expect(mockTransaction).toHaveBeenCalledTimes(1);
      expect(mockTransaction).toHaveBeenCalledWith(
        "rw",
        expect.any(Array),
        expect.any(Function)
      );

      // 画像が保存されたこと
      expect(mockImagesPut).toHaveBeenCalledTimes(2);
      expect(mockImagesPut).toHaveBeenCalledWith({
        id: "img-1",
        blob: blob1,
        createdAt: FIXED_DATE,
      });
      expect(mockImagesPut).toHaveBeenCalledWith({
        id: "img-2",
        blob: blob2,
        createdAt: FIXED_DATE,
      });

      // プロジェクトが指定IDのレコードとして保存されたこと
      expect(mockCreateProjectRecord).toHaveBeenCalledWith(
        "project-new",
        project
      );
      expect(mockProjectsPut).toHaveBeenCalledTimes(1);
      expect(mockProjectsPut).toHaveBeenCalledWith({
        id: "project-new",
        data: project,
      });
    });

    it("画像が空でもプロジェクトが保存されること", async () => {
      const project = createTestProjectFile();
      const result: ImportResult = { project, images: new Map() };

      await applyImportResult(result, "project-1");

      // 画像の保存は呼ばれないこと
      expect(mockImagesPut).not.toHaveBeenCalled();

      // プロジェクトは保存されること
      expect(mockProjectsPut).toHaveBeenCalledTimes(1);
    });

    it("トランザクションが失敗した場合は例外を投げること", async () => {
      mockTransaction.mockRejectedValueOnce(new Error("保存失敗"));

      await expect(
        applyImportResult(
          { project: createTestProjectFile(), images: new Map() },
          "project-1"
        )
      ).rejects.toThrow("保存失敗");
    });

    it("複数の画像がある場合、全て正しく保存されること", async () => {
      const blobs = Array.from(
        { length: 5 },
        (_, i) => new Blob([`image${i}`], { type: "image/webp" })
      );
      const images = new Map<string, Blob>(
        blobs.map((blob, i) => [`img-${i}`, blob])
      );
      const project = createTestProjectFile();
      const result: ImportResult = { project, images };

      await applyImportResult(result, "project-1");

      expect(mockImagesPut).toHaveBeenCalledTimes(5);
      for (let i = 0; i < 5; i++) {
        expect(mockImagesPut).toHaveBeenCalledWith({
          id: `img-${i}`,
          blob: blobs[i],
          createdAt: FIXED_DATE,
        });
      }
    });
  });
});
