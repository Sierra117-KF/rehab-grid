import {
  APP_VERSION,
  CURRENT_PROJECT_ID,
  DEFAULT_PROJECT_TITLE,
} from "@rehab-grid/core/lib/constants";
import { type ProjectFile } from "@rehab-grid/core/types";
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
 * 各メソッドの呼び出し履歴や引数を検証するために使用
 */
const {
  mockProjectsPut,
  mockProjectsGet,
  mockProjectsDelete,
  mockImagesPut,
  mockImagesGet,
  mockImagesDelete,
  mockImagesBulkGet,
  mockStores,
} = vi.hoisted(() => ({
  mockProjectsPut: vi.fn(),
  mockProjectsGet: vi.fn(),
  mockProjectsDelete: vi.fn(),
  mockImagesPut: vi.fn(),
  mockImagesGet: vi.fn(),
  mockImagesDelete: vi.fn(),
  mockImagesBulkGet: vi.fn(),
  mockStores: vi.fn(),
}));

/**
 * Dexie モジュールのモック
 *
 * @remarks
 * RehabGridDB クラスが継承する Dexie を完全なクラスとしてモック。
 * プロパティ（projects, images）はコンストラクタで初期化し、
 * サブクラス（RehabGridDB）から確実にアクセスできるようにする。
 */
vi.mock("dexie", () => {
  class MockDexie {
    projects: unknown;
    images: unknown;

    version(_v: number) {
      return {
        stores: (schema: Record<string, string>) => {
          mockStores(schema);

          // stores はアロー関数なので、this は MockDexie インスタンスを指す
          this.projects = {
            put: mockProjectsPut,
            get: mockProjectsGet,
            delete: mockProjectsDelete,
          };

          this.images = {
            put: mockImagesPut,
            get: mockImagesGet,
            delete: mockImagesDelete,
            bulkGet: mockImagesBulkGet,
          };

          // stores は this (Dexie インスタンス) を返す
          return this;
        },
      };
    }
  }

  return {
    default: MockDexie,
  };
});

// モック定義後に実装ファイルをインポート（順序重要）
import {
  createNewProject,
  deleteImage,
  deleteProject,
  getImage,
  getImages,
  loadProject,
  saveImage,
  saveProject,
} from "@rehab-grid/core/lib/db";

/**
 * テスト用の固定日時
 */
const FIXED_DATE = new Date("2024-01-15T10:30:00.000Z");

/**
 * テスト用の ProjectFile を生成するヘルパー関数
 */
function createTestProjectFile(
  overrides: Partial<ProjectFile> = {}
): ProjectFile {
  return {
    meta: {
      version: APP_VERSION,
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

describe("lib/db", () => {
  beforeAll(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.setSystemTime(FIXED_DATE);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Schema Initialization", () => {
    it("正しいスキーマでデータベースが初期化されていること", () => {
      // db インスタンス作成時（ファイルインポート時）にコンストラクタが走るため、
      // mockStores が呼び出されているはず
      expect(mockStores).toHaveBeenCalledWith({
        projects: "id, title, updatedAt",
        images: "id, createdAt",
      });
    });
  });

  describe("createNewProject", () => {
    it("デフォルトタイトルで新規プロジェクトを作成できること", () => {
      const project = createNewProject();

      expect(project.meta.title).toBe(DEFAULT_PROJECT_TITLE);
    });

    it("カスタムタイトルで新規プロジェクトを作成できること", () => {
      const customTitle = "腰痛体操セット";
      const project = createNewProject(customTitle);

      expect(project.meta.title).toBe(customTitle);
    });

    it("初期状態のプロジェクト構造が正しいこと", () => {
      const project = createNewProject();

      // Meta
      expect(project.meta).toEqual(
        expect.objectContaining({
          version: APP_VERSION,
          title: DEFAULT_PROJECT_TITLE,
          projectType: "training",
        })
      );
      // Settings
      expect(project.settings).toEqual({
        layoutType: "grid2",
        themeColor: "#3b82f6",
      });
      // Items
      expect(project.items).toHaveLength(0);
    });

    it("作成日時と更新日時が現在時刻で設定されること", () => {
      const project = createNewProject();

      expect(project.meta.createdAt).toBe(FIXED_DATE.toISOString());
      expect(project.meta.updatedAt).toBe(FIXED_DATE.toISOString());
    });
  });

  describe("saveProject", () => {
    it("プロジェクト保存時に updatedAt が更新され、DBに保存されること", async () => {
      const projectData = createTestProjectFile();
      const previousUpdatedAt = projectData.meta.updatedAt;

      await saveProject(projectData);

      // 保存されたデータを検証
      expect(mockProjectsPut).toHaveBeenCalledTimes(1);

      // 型安全にアクセス
      const { calls } = mockProjectsPut.mock;
      const savedObj = calls[0]?.[0] as {
        id: string;
        title: string;
        data: ProjectFile;
        updatedAt: Date;
      };

      expect(savedObj).toBeDefined();
      expect(savedObj).toEqual({
        id: CURRENT_PROJECT_ID,
        title: projectData.meta.title,
        data: expect.objectContaining({
          meta: expect.objectContaining({
            updatedAt: FIXED_DATE.toISOString(), // 更新されていること
          }),
        }),
        updatedAt: FIXED_DATE,
      });

      // 元のデータは変更されていないことを確認（不変性）
      expect(projectData.meta.updatedAt).toBe(previousUpdatedAt);

      // 保存データのUpdatedAtが更新日時と一致すること
      expect(savedObj.data.meta.updatedAt).not.toBe(previousUpdatedAt);
    });

    it("タイトルを変更して保存できること", async () => {
      const newTitle = "変更後のタイトル";
      const projectData = createTestProjectFile({
        meta: {
          ...createTestProjectFile().meta,
          title: newTitle,
        },
      });

      await saveProject(projectData);

      const { calls } = mockProjectsPut.mock;
      const savedObj = calls[0]?.[0];

      expect(savedObj?.title).toBe(newTitle);
      expect(savedObj?.data.meta.title).toBe(newTitle);
    });
  });

  describe("loadProject", () => {
    it("DBにデータが存在する場合、プロジェクトデータを返すこと", async () => {
      const projectData = createTestProjectFile();
      mockProjectsGet.mockResolvedValue({
        id: CURRENT_PROJECT_ID,
        title: projectData.meta.title,
        data: projectData,
        updatedAt: new Date(),
      });

      const result = await loadProject();

      expect(mockProjectsGet).toHaveBeenCalledWith(CURRENT_PROJECT_ID);
      expect(result).toEqual(projectData);
    });

    it("DBにデータが存在しない場合、undefined を返すこと", async () => {
      mockProjectsGet.mockResolvedValue(undefined);

      const result = await loadProject();

      expect(mockProjectsGet).toHaveBeenCalledWith(CURRENT_PROJECT_ID);
      expect(result).toBeUndefined();
    });
  });

  describe("deleteProject", () => {
    it("現在のプロジェクトIDを指定して削除を実行すること", async () => {
      await deleteProject();

      expect(mockProjectsDelete).toHaveBeenCalledTimes(1);
      expect(mockProjectsDelete).toHaveBeenCalledWith(CURRENT_PROJECT_ID);
    });
  });

  describe("saveImage", () => {
    it("画像IDとBlobを指定して画像を保存できること（ファイル名なし）", async () => {
      const imageId = "img-123";
      const blob = new Blob(["test"], { type: "image/png" });

      await saveImage(imageId, blob);

      expect(mockImagesPut).toHaveBeenCalledWith({
        id: imageId,
        blob,
        createdAt: FIXED_DATE,
        fileName: undefined,
      });
    });

    it("ファイル名を指定して画像を保存できること", async () => {
      const imageId = "img-456";
      const blob = new Blob(["test"], { type: "image/png" });
      const fileName = "custom_name";

      await saveImage(imageId, blob, fileName);

      expect(mockImagesPut).toHaveBeenCalledWith({
        id: imageId,
        blob,
        createdAt: FIXED_DATE,
        fileName,
      });
    });
  });

  describe("getImage", () => {
    it("指定したIDの画像が存在する場合、Blobを返すこと", async () => {
      const imageId = "img-123";
      const blob = new Blob(["test"], { type: "image/png" });
      mockImagesGet.mockResolvedValue({
        id: imageId,
        blob,
        createdAt: new Date(),
      });

      const result = await getImage(imageId);

      expect(mockImagesGet).toHaveBeenCalledWith(imageId);
      expect(result).toBe(blob);
    });

    it("指定したIDの画像が存在しない場合、undefinedを返すこと", async () => {
      mockImagesGet.mockResolvedValue(undefined);

      const result = await getImage("non-existent");

      expect(result).toBeUndefined();
    });
  });

  describe("deleteImage", () => {
    it("指定したIDの画像を削除すること", async () => {
      const imageId = "img-to-delete";

      await deleteImage(imageId);

      expect(mockImagesDelete).toHaveBeenCalledWith(imageId);
    });
  });

  describe("getImages", () => {
    it("複数のIDに対応する画像をMap形式で返すこと", async () => {
      const ids = ["img-1", "img-2"];
      const blob1 = new Blob(["1"], { type: "image/png" });
      const blob2 = new Blob(["2"], { type: "image/png" });

      mockImagesBulkGet.mockResolvedValue([
        { id: "img-1", blob: blob1 },
        { id: "img-2", blob: blob2 },
      ]);

      const result = await getImages(ids);

      expect(mockImagesBulkGet).toHaveBeenCalledWith(ids);
      expect(result.size).toBe(2);
      expect(result.get("img-1")).toBe(blob1);
      expect(result.get("img-2")).toBe(blob2);
    });

    it("一部の画像が存在しない場合、undefined としてMapに含まれること", async () => {
      const ids = ["img-1", "img-missing"];
      const blob1 = new Blob(["1"], { type: "image/png" });

      mockImagesBulkGet.mockResolvedValue([
        { id: "img-1", blob: blob1 },
        undefined,
      ]);

      const result = await getImages(ids);

      expect(result.get("img-1")).toBe(blob1);
      expect(result.get("img-missing")).toBeUndefined();
    });

    it("空のIDリストに対しては空のMapを返すこと", async () => {
      mockImagesBulkGet.mockResolvedValue([]);

      const result = await getImages([]);

      expect(result.size).toBe(0);
      expect(mockImagesBulkGet).toHaveBeenCalledWith([]);
    });
  });
});
