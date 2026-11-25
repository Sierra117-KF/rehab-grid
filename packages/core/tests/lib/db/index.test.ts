import {
  APP_VERSION,
  DEFAULT_PROJECT_TITLE,
  LEGACY_PROJECT_ID,
  LIBRARY_SAVE_FAILED_MESSAGE,
  PROJECT_COPY_SUFFIX,
  TEXT_LIMITS,
} from "@rehab-grid/core/lib/constants";
import {
  type EditorItem,
  type ProjectFile,
  type ProjectRecord,
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
 * 各メソッドの呼び出し履歴や引数を検証するために使用
 */
const {
  mockProjectsPut,
  mockProjectsGet,
  mockProjectsDelete,
  mockProjectsToArray,
  mockImagesPut,
  mockImagesGet,
  mockImagesDelete,
  mockImagesBulkGet,
  mockStores,
  mockUserTemplatesPut,
  mockUserTemplatesGet,
  mockUserTemplatesDelete,
  mockUserTemplatesToArray,
  mockExerciseCardsPut,
  mockExerciseCardsDelete,
  mockExerciseCardsToArray,
  mockCustomSnippetsPut,
  mockCustomSnippetsDelete,
  mockCustomSnippetsToArray,
} = vi.hoisted(() => ({
  mockUserTemplatesPut: vi.fn(),
  mockUserTemplatesGet: vi.fn(),
  mockUserTemplatesDelete: vi.fn(),
  mockUserTemplatesToArray: vi.fn(),
  mockExerciseCardsPut: vi.fn(),
  mockExerciseCardsDelete: vi.fn(),
  mockExerciseCardsToArray: vi.fn(),
  mockCustomSnippetsPut: vi.fn(),
  mockCustomSnippetsDelete: vi.fn(),
  mockCustomSnippetsToArray: vi.fn(),
  mockProjectsPut: vi.fn(),
  mockProjectsGet: vi.fn(),
  mockProjectsDelete: vi.fn(),
  mockProjectsToArray: vi.fn(),
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
    userTemplates: unknown;
    exerciseCards: unknown;
    customSnippets: unknown;

    version(_v: number) {
      return {
        stores: (schema: Record<string, string>) => {
          mockStores(schema);

          // stores はアロー関数なので、this は MockDexie インスタンスを指す
          this.projects = {
            put: mockProjectsPut,
            get: mockProjectsGet,
            delete: mockProjectsDelete,
            toArray: mockProjectsToArray,
          };

          this.images = {
            put: mockImagesPut,
            get: mockImagesGet,
            delete: mockImagesDelete,
            bulkGet: mockImagesBulkGet,
          };

          this.userTemplates = {
            put: mockUserTemplatesPut,
            get: mockUserTemplatesGet,
            delete: mockUserTemplatesDelete,
            toArray: mockUserTemplatesToArray,
          };

          this.exerciseCards = {
            put: mockExerciseCardsPut,
            delete: mockExerciseCardsDelete,
            toArray: mockExerciseCardsToArray,
          };

          this.customSnippets = {
            put: mockCustomSnippetsPut,
            delete: mockCustomSnippetsDelete,
            toArray: mockCustomSnippetsToArray,
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
  addCustomSnippet,
  collectReferencedImageIds,
  createNewProject,
  deleteCustomSnippet,
  deleteExerciseCard,
  deleteImage,
  deleteProject,
  deleteUserTemplate,
  duplicateProject,
  getImage,
  getImageRecord,
  getImages,
  getUserTemplate,
  listCustomSnippets,
  listExerciseCards,
  listProjects,
  listUserTemplates,
  loadProject,
  saveExerciseCard,
  saveImage,
  saveProject,
  saveUserTemplate,
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

/**
 * テスト用の ProjectRecord を生成するヘルパー関数
 */
function createTestRecord(
  id: string,
  updatedAt: string,
  data: ProjectFile = createTestProjectFile()
): ProjectRecord {
  return { id, title: data.meta.title, data, updatedAt: new Date(updatedAt) };
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
      // version 2 で既存テーブルを残したままマイライブラリのテーブルを追加する
      // （呼び出し履歴は afterEach で消えるため、同じテストで確かめる）
      expect(mockStores).toHaveBeenCalledWith({
        projects: "id, title, updatedAt",
        images: "id, createdAt",
        userTemplates: "id, name, updatedAt",
        exerciseCards: "id, title, updatedAt",
        customSnippets: "id, createdAt",
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

      await saveProject("project-1", projectData);

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
        id: "project-1",
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

      await saveProject("project-1", projectData);

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
        id: "project-1",
        title: projectData.meta.title,
        data: projectData,
        updatedAt: new Date(),
      });

      const result = await loadProject("project-1");

      expect(mockProjectsGet).toHaveBeenCalledWith("project-1");
      expect(result).toEqual(projectData);
    });

    it("旧バージョンの 'current' のレコードもIDを指定して読み込めること", async () => {
      const projectData = createTestProjectFile();
      mockProjectsGet.mockResolvedValue(
        createTestRecord(LEGACY_PROJECT_ID, "2024-01-01T00:00:00.000Z", projectData)
      );

      const result = await loadProject(LEGACY_PROJECT_ID);

      expect(mockProjectsGet).toHaveBeenCalledWith("current");
      expect(result).toEqual(projectData);
    });

    it("DBにデータが存在しない場合、undefined を返すこと", async () => {
      mockProjectsGet.mockResolvedValue(undefined);

      const result = await loadProject("missing");

      expect(mockProjectsGet).toHaveBeenCalledWith("missing");
      expect(result).toBeUndefined();
    });
  });

  describe("deleteProject", () => {
    it("指定したプロジェクトIDの削除を実行すること", async () => {
      await deleteProject("project-1");

      expect(mockProjectsDelete).toHaveBeenCalledTimes(1);
      expect(mockProjectsDelete).toHaveBeenCalledWith("project-1");
    });
  });

  describe("listProjects", () => {
    it("一覧に必要な値を更新日時の新しい順で返すこと", async () => {
      mockProjectsToArray.mockResolvedValue([
        createTestRecord("old", "2024-01-01T00:00:00.000Z"),
        createTestRecord(
          "new",
          "2024-03-01T00:00:00.000Z",
          createTestProjectFile({
            settings: { layoutType: "grid3", themeColor: "#3b82f6" },
            items: [
              {
                id: "item-1",
                order: 0,
                title: "運動",
                imageSource: "",
                description: "",
              },
            ],
          })
        ),
      ]);

      const result = await listProjects();

      expect(result).toEqual([
        {
          id: "new",
          title: "テストプロジェクト",
          updatedAt: new Date("2024-03-01T00:00:00.000Z"),
          cardCount: 1,
          layoutType: "grid3",
        },
        {
          id: "old",
          title: "テストプロジェクト",
          updatedAt: new Date("2024-01-01T00:00:00.000Z"),
          cardCount: 0,
          layoutType: "grid2",
        },
      ]);
    });

    it("保存がなければ空配列を返すこと", async () => {
      mockProjectsToArray.mockResolvedValue([]);

      expect(await listProjects()).toEqual([]);
    });
  });

  describe("duplicateProject", () => {
    it("タイトルに「のコピー」を付けて新しいIDで保存し、そのIDを返すこと", async () => {
      const source = createTestProjectFile();
      mockProjectsGet.mockResolvedValue(
        createTestRecord("project-1", "2024-01-01T00:00:00.000Z", source)
      );

      const newId = await duplicateProject("project-1");

      expect(newId).toBeDefined();
      expect(newId).not.toBe("project-1");
      const saved = mockProjectsPut.mock.calls[0]?.[0] as ProjectRecord;
      expect(saved.id).toBe(newId);
      expect(saved.title).toBe(`テストプロジェクト${PROJECT_COPY_SUFFIX}`);
      expect(saved.data.meta.title).toBe(saved.title);
      expect(saved.data.meta.createdAt).toBe(FIXED_DATE.toISOString());
      expect(saved.data.items).toEqual(source.items);
    });

    it("タイトルが長い場合は文字数上限に収まるよう元のタイトルを切り詰めること", async () => {
      const longTitle = "あ".repeat(TEXT_LIMITS.projectTitle);
      mockProjectsGet.mockResolvedValue(
        createTestRecord(
          "project-1",
          "2024-01-01T00:00:00.000Z",
          createTestProjectFile({
            meta: { ...createTestProjectFile().meta, title: longTitle },
          })
        )
      );

      await duplicateProject("project-1");

      const saved = mockProjectsPut.mock.calls[0]?.[0] as ProjectRecord;
      expect(saved.title).toHaveLength(TEXT_LIMITS.projectTitle);
      expect(saved.title.endsWith(PROJECT_COPY_SUFFIX)).toBeTruthy();
    });

    it("複製元が存在しない場合は何も保存せず undefined を返すこと", async () => {
      mockProjectsGet.mockResolvedValue(undefined);

      expect(await duplicateProject("missing")).toBeUndefined();
      expect(mockProjectsPut).not.toHaveBeenCalled();
    });
  });

  describe("collectReferencedImageIds", () => {
    /** 指定画像を参照するカードを持つプロジェクト */
    const createProjectWithImages = (...imageSources: string[]) =>
      createTestProjectFile({
        items: imageSources.map((imageSource, index) => ({
          id: `item-${String(index)}`,
          order: index,
          title: "運動",
          imageSource,
          description: "",
        })),
      });

    beforeEach(() => {
      mockUserTemplatesToArray.mockResolvedValue([]);
      mockExerciseCardsToArray.mockResolvedValue([]);
    });

    it("マイテンプレート・マイ運動のカードが参照する画像IDも集めること", async () => {
      mockProjectsToArray.mockResolvedValue([
        createTestRecord(
          "project-1",
          "2024-01-01T00:00:00.000Z",
          createProjectWithImages("img-project")
        ),
      ]);
      mockUserTemplatesToArray.mockResolvedValue([
        {
          id: "template-1",
          name: "テンプレート",
          data: createProjectWithImages("img-template", ""),
          updatedAt: FIXED_DATE,
        },
      ]);
      mockExerciseCardsToArray.mockResolvedValue([
        {
          id: "card-1",
          title: "運動",
          item: { id: "x", order: 0, title: "運動", imageSource: "img-card", description: "" },
          updatedAt: FIXED_DATE,
        },
      ]);

      // 編集中のプロジェクトを除いても、マイテンプレート・マイ運動の参照は残る
      expect(await collectReferencedImageIds("project-1")).toEqual(
        new Set(["img-template", "img-card"])
      );
    });

    it("全プロジェクトのカードが参照する画像IDを集め、空の参照は含めないこと", async () => {
      mockProjectsToArray.mockResolvedValue([
        createTestRecord(
          "project-1",
          "2024-01-01T00:00:00.000Z",
          createProjectWithImages("img-1", "")
        ),
        createTestRecord(
          "project-2",
          "2024-01-01T00:00:00.000Z",
          createProjectWithImages("img-2", "img-1")
        ),
      ]);

      expect(await collectReferencedImageIds()).toEqual(
        new Set(["img-1", "img-2"])
      );
    });

    it("除外したプロジェクトの参照は含めないこと", async () => {
      mockProjectsToArray.mockResolvedValue([
        createTestRecord(
          "project-1",
          "2024-01-01T00:00:00.000Z",
          createProjectWithImages("img-1")
        ),
        createTestRecord(
          "project-2",
          "2024-01-01T00:00:00.000Z",
          createProjectWithImages("img-2")
        ),
      ]);

      expect(await collectReferencedImageIds("project-1")).toEqual(
        new Set(["img-2"])
      );
    });
  });

  describe("マイテンプレート", () => {
    it("スキーマを通した内容と名前・更新日時で保存し、IDを返すこと", async () => {
      const data = createTestProjectFile({
        items: [
          {
            id: "item-1",
            order: 0,
            title: "<b>スクワット</b>",
            imageSource: "img-1",
            description: "",
          },
        ],
      });

      const id = await saveUserTemplate("  膝の自主トレ  ", data);

      expect(id).toEqual(expect.any(String));
      expect(mockUserTemplatesPut).toHaveBeenCalledWith({
        id,
        name: "膝の自主トレ",
        // HTML タグはサニタイズされる（インポートと同じ検証）
        data: expect.objectContaining({
          items: [expect.objectContaining({ title: "スクワット", imageSource: "img-1" })],
        }),
        updatedAt: FIXED_DATE,
      });
    });

    it("名前が空なら既定のタイトル、長すぎる名前は切り詰めて保存すること", async () => {
      await saveUserTemplate("   ", createTestProjectFile());
      await saveUserTemplate("あ".repeat(30), createTestProjectFile());

      expect(mockUserTemplatesPut).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ name: DEFAULT_PROJECT_TITLE })
      );
      expect(mockUserTemplatesPut).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          name: "あ".repeat(TEXT_LIMITS.projectTitle),
        })
      );
    });

    it("スキーマに合わない内容は保存せずにエラーにすること", async () => {
      const invalid = {
        ...createTestProjectFile(),
        items: "not-array",
      } as unknown as ProjectFile;

      await expect(saveUserTemplate("壊れたデータ", invalid)).rejects.toThrow(
        LIBRARY_SAVE_FAILED_MESSAGE
      );
      expect(mockUserTemplatesPut).not.toHaveBeenCalled();
    });

    it("一覧は更新日時の新しい順に返すこと", async () => {
      const record = (id: string, updatedAt: string) => ({
        id,
        name: id,
        data: createTestProjectFile(),
        updatedAt: new Date(updatedAt),
      });
      mockUserTemplatesToArray.mockResolvedValue([
        record("old", "2024-01-01T00:00:00.000Z"),
        record("new", "2024-03-01T00:00:00.000Z"),
      ]);

      const result = await listUserTemplates();

      expect(result.map((r) => r.id)).toEqual(["new", "old"]);
    });

    it("ID を指定して取得・削除できること", async () => {
      mockUserTemplatesGet.mockResolvedValue(undefined);

      expect(await getUserTemplate("missing")).toBeUndefined();
      await deleteUserTemplate("template-1");

      expect(mockUserTemplatesGet).toHaveBeenCalledWith("missing");
      expect(mockUserTemplatesDelete).toHaveBeenCalledWith("template-1");
    });
  });

  describe("マイ運動", () => {
    it("並び順を 0 にそろえ、運動名をインデックス用に持たせて保存すること", async () => {
      const id = await saveExerciseCard({
        id: "item-1",
        order: 3,
        title: "スクワット",
        imageSource: "img-1",
        description: "膝を曲げる",
        dosages: { reps: "10回", sets: "3セット", frequency: "" },
      });

      expect(mockExerciseCardsPut).toHaveBeenCalledWith({
        id,
        title: "スクワット",
        item: {
          id: "item-1",
          order: 0,
          title: "スクワット",
          imageSource: "img-1",
          description: "膝を曲げる",
          dosages: { reps: "10回", sets: "3セット", frequency: "" },
        },
        updatedAt: FIXED_DATE,
      });
    });

    it("スキーマに合わないカードは保存せずにエラーにすること", async () => {
      const invalid = { id: "x", title: "運動" } as unknown as EditorItem;

      await expect(saveExerciseCard(invalid)).rejects.toThrow(
        LIBRARY_SAVE_FAILED_MESSAGE
      );
      expect(mockExerciseCardsPut).not.toHaveBeenCalled();
    });

    it("一覧は更新日時の新しい順に返し、ID を指定して削除できること", async () => {
      const record = (id: string, updatedAt: string) => ({
        id,
        title: id,
        item: { id, order: 0, title: id, imageSource: "", description: "" },
        updatedAt: new Date(updatedAt),
      });
      mockExerciseCardsToArray.mockResolvedValue([
        record("old", "2024-01-01T00:00:00.000Z"),
        record("new", "2024-03-01T00:00:00.000Z"),
      ]);

      expect((await listExerciseCards()).map((r) => r.id)).toEqual([
        "new",
        "old",
      ]);

      await deleteExerciseCard("card-1");
      expect(mockExerciseCardsDelete).toHaveBeenCalledWith("card-1");
    });
  });

  describe("マイ定型文", () => {
    it("前後の空白を除き、注意点の文字数上限で切り詰めて登録すること", async () => {
      const record = await addCustomSnippet(
        `  ${"あ".repeat(TEXT_LIMITS.precaution + 5)}  `
      );

      expect(record).toEqual({
        id: expect.any(String),
        value: "あ".repeat(TEXT_LIMITS.precaution),
        createdAt: FIXED_DATE,
      });
      expect(mockCustomSnippetsPut).toHaveBeenCalledWith(record);
    });

    it("一覧は登録した順に返し、ID を指定して削除できること", async () => {
      mockCustomSnippetsToArray.mockResolvedValue([
        { id: "second", value: "2", createdAt: new Date("2024-02-01") },
        { id: "first", value: "1", createdAt: new Date("2024-01-01") },
      ]);

      expect((await listCustomSnippets()).map((r) => r.id)).toEqual([
        "first",
        "second",
      ]);

      await deleteCustomSnippet("first");
      expect(mockCustomSnippetsDelete).toHaveBeenCalledWith("first");
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

  describe("getImageRecord", () => {
    it("指定したIDの画像レコード（Blob とファイル名）を返すこと", async () => {
      const record = {
        id: "img-123",
        blob: new Blob(["test"], { type: "image/webp" }),
        createdAt: new Date(),
        fileName: "スクワット",
      };
      mockImagesGet.mockResolvedValue(record);

      const result = await getImageRecord("img-123");

      expect(mockImagesGet).toHaveBeenCalledWith("img-123");
      expect(result).toBe(record);
    });

    it("指定したIDの画像が存在しない場合、undefinedを返すこと", async () => {
      mockImagesGet.mockResolvedValue(undefined);

      expect(await getImageRecord("non-existent")).toBeUndefined();
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
