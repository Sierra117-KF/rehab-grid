import { APP_VERSION, CURRENT_PROJECT_ID } from "@rehab-grid/core/lib/constants";
import {
  type EditorItem,
  type ImportResult,
  type LayoutType,
  type ProjectFile,
  type ProjectMeta,
  type ProjectSettings,
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
const { mockProjectsPut, mockImagesPut, mockTransaction } = vi.hoisted(() => ({
  mockProjectsPut: vi.fn(),
  mockImagesPut: vi.fn(),
  mockTransaction: vi.fn(),
}));

/**
 * lib/db モジュールのモック
 *
 * @remarks
 * applyImportResult が使用する db.transaction, db.projects.put, db.images.put をモック
 */
vi.mock("@/lib/db", () => ({
  db: {
    transaction: mockTransaction,
    projects: { put: mockProjectsPut },
    images: { put: mockImagesPut },
  },
}));

// モック定義後に実装ファイルをインポート（順序重要）
import {
  applyImportResult,
  createProjectFile,
  createProjectSettings,
} from "@rehab-grid/core/utils/project";

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
  describe("createProjectFile", () => {
    it("正しい ProjectFile オブジェクトを生成できること", () => {
      const meta = createTestMeta({ title: "スクワットセット" });
      const settings: Pick<ProjectSettings, "layoutType" | "themeColor"> = {
        layoutType: "grid3",
        themeColor: "#ff0000",
      };
      const items = [
        createTestItem({ id: "item-1", title: "スクワット" }),
        createTestItem({ id: "item-2", title: "腹筋", order: 1 }),
      ];

      const result = createProjectFile(meta, settings, items);

      expect(result).toEqual({
        meta,
        settings,
        items,
      });
    });

    it("items が空配列でも正しく動作すること", () => {
      const meta = createTestMeta();
      const settings: Pick<ProjectSettings, "layoutType" | "themeColor"> = {
        layoutType: "grid2",
        themeColor: "#3b82f6",
      };
      const items: EditorItem[] = [];

      const result = createProjectFile(meta, settings, items);

      expect(result.items).toEqual([]);
      expect(result.meta).toBe(meta);
      expect(result.settings).toBe(settings);
    });

    it("入力オブジェクトを変更しないこと（参照の保持）", () => {
      const meta = createTestMeta();
      const settings: Pick<ProjectSettings, "layoutType" | "themeColor"> = {
        layoutType: "grid2",
        themeColor: "#3b82f6",
      };
      const items = [createTestItem()];

      const result = createProjectFile(meta, settings, items);

      // 参照が保持されていること（新しいオブジェクトを作成していない）
      expect(result.meta).toBe(meta);
      expect(result.settings).toBe(settings);
      expect(result.items).toBe(items);
    });
  });

  describe("createProjectSettings", () => {
    it.each([
      ["grid1", "#000000"],
      ["grid2", "#3b82f6"],
      ["grid3", "#ff0000"],
      ["grid4", "#ffffff"],
    ] as const)(
      "layoutType=%s, themeColor=%s で正しい設定を生成できること",
      (layoutType, themeColor) => {
        const result = createProjectSettings(layoutType, themeColor);

        expect(result).toEqual({
          layoutType,
          themeColor,
        });
      }
    );

    it("全ての LayoutType で動作すること", () => {
      const layoutTypes: LayoutType[] = ["grid1", "grid2", "grid3", "grid4"];

      for (const layoutType of layoutTypes) {
        const result = createProjectSettings(layoutType, "#test");
        expect(result.layoutType).toBe(layoutType);
      }
    });
  });

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

    it("画像とプロジェクトがDBに保存されること", async () => {
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
      const initializeFromDB = vi.fn();

      await applyImportResult(result, initializeFromDB);

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

      // プロジェクトが保存されたこと
      expect(mockProjectsPut).toHaveBeenCalledTimes(1);
      expect(mockProjectsPut).toHaveBeenCalledWith({
        id: CURRENT_PROJECT_ID,
        title: project.meta.title,
        data: expect.objectContaining({
          meta: expect.objectContaining({
            updatedAt: FIXED_DATE.toISOString(),
          }),
        }),
        updatedAt: FIXED_DATE,
      });

      // initializeFromDB が呼ばれたこと
      expect(initializeFromDB).toHaveBeenCalledTimes(1);
      expect(initializeFromDB).toHaveBeenCalledWith(project);
    });

    it("画像が空でもプロジェクトが保存されること", async () => {
      const project = createTestProjectFile();
      const images = new Map<string, Blob>();
      const result: ImportResult = { project, images };
      const initializeFromDB = vi.fn();

      await applyImportResult(result, initializeFromDB);

      // 画像の保存は呼ばれないこと
      expect(mockImagesPut).not.toHaveBeenCalled();

      // プロジェクトは保存されること
      expect(mockProjectsPut).toHaveBeenCalledTimes(1);

      // initializeFromDB は呼ばれること
      expect(initializeFromDB).toHaveBeenCalledWith(project);
    });

    it("updatedAt が現在時刻に更新されること", async () => {
      const originalUpdatedAt = "2024-01-01T00:00:00.000Z";
      const project = createTestProjectFile({
        meta: createTestMeta({ updatedAt: originalUpdatedAt }),
      });
      const result: ImportResult = { project, images: new Map() };
      const initializeFromDB = vi.fn();

      await applyImportResult(result, initializeFromDB);

      // 保存されたプロジェクトの updatedAt が更新されていること
      const savedProject = mockProjectsPut.mock.calls[0]?.[0] as {
        data: ProjectFile;
      };
      expect(savedProject.data.meta.updatedAt).toBe(FIXED_DATE.toISOString());
      expect(savedProject.data.meta.updatedAt).not.toBe(originalUpdatedAt);
    });

    it("initializeFromDB には元の project オブジェクト（updatedAt 未更新）が渡されること", async () => {
      const originalUpdatedAt = "2024-01-01T00:00:00.000Z";
      const project = createTestProjectFile({
        meta: createTestMeta({ updatedAt: originalUpdatedAt }),
      });
      const result: ImportResult = { project, images: new Map() };
      const initializeFromDB = vi.fn();

      await applyImportResult(result, initializeFromDB);

      // initializeFromDB には元の project が渡される
      const passedProject = initializeFromDB.mock.calls[0]?.[0] as ProjectFile;
      expect(passedProject.meta.updatedAt).toBe(originalUpdatedAt);
      expect(passedProject).toBe(project);
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
      const initializeFromDB = vi.fn();

      await applyImportResult(result, initializeFromDB);

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
