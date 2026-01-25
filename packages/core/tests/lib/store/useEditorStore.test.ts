import { MAX_ITEM_COUNT } from "@rehab-grid/core/lib/constants";
import { stateToProjectFile, useEditorStore } from "@rehab-grid/core/lib/store/useEditorStore";
import {
  type EditorItem,
  type LayoutType,
  type ProjectFile,
  type ProjectMeta,
} from "@rehab-grid/core/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * モック関数の定義
 *
 * @remarks
 * vi.hoisted でモック関数を事前定義し、vi.mock 内で参照できるようにする
 * loadProject と createNewProject はモジュール読み込み時に呼び出されるため、
 * デフォルトの戻り値を設定した状態で定義する
 */
const { mockSaveProject, mockDeleteProject, mockDeleteImage } = vi.hoisted(
  () => ({
    mockSaveProject: vi.fn(),
    mockDeleteProject: vi.fn(),
    mockDeleteImage: vi.fn(),
  })
);

vi.mock("@/lib/db", () => ({
  // loadProject はモジュール読み込み時に呼び出されるため、
  // デフォルトで undefined を返す Promise を返す
  loadProject: vi.fn().mockResolvedValue(undefined),
  saveProject: mockSaveProject,
  deleteProject: mockDeleteProject,
  deleteImage: mockDeleteImage,
  // createNewProject はモジュール読み込み時に呼び出されるため、
  // 常に同じ形式のデータを返す関数として定義
  createNewProject: () => ({
    meta: {
      version: "1.0.0",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      title: "無題のプロジェクト",
      projectType: "training",
    },
    settings: {
      layoutType: "grid2",
      themeColor: "#3b82f6",
    },
    items: [],
  }),
}));

/**
 * テスト用の初期メタデータ
 */
const createTestMeta = (overrides: Partial<ProjectMeta> = {}): ProjectMeta => ({
  version: "1.0.0",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  title: "テストプロジェクト",
  projectType: "training",
  ...overrides,
});

/**
 * テスト用のEditorItemを生成
 */
const createTestItem = (overrides: Partial<EditorItem> = {}): EditorItem => ({
  id: "test-item-1",
  order: 0,
  title: "テスト運動",
  imageSource: "",
  description: "",
  ...overrides,
});

/**
 * テスト用のProjectFileを生成
 */
const createTestProjectFile = (
  overrides: Partial<ProjectFile> = {}
): ProjectFile => ({
  meta: createTestMeta(),
  settings: {
    layoutType: "grid2",
    themeColor: "#3b82f6",
  },
  items: [],
  ...overrides,
});

/**
 * ストアの初期状態を取得
 */
const getInitialState = () => ({
  isLoaded: false,
  meta: createTestMeta({ title: "無題のプロジェクト" }),
  items: [],
  layoutType: "grid2" as LayoutType,
  themeColor: "#3b82f6",
  selectedItemId: null,
  mobileImageLibraryOpen: false,
  mobilePropertyPanelOpen: false,
  mobileImageLibraryTargetItemId: null,
});

describe("useEditorStore", () => {
  beforeEach(() => {
    // モック関数をリセット
    vi.clearAllMocks();

    // ストアを初期状態にリセット
    useEditorStore.setState(getInitialState());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("初期状態", () => {
    it("isLoaded が false である", () => {
      expect(useEditorStore.getState().isLoaded).toBeFalsy();
    });

    it("items が空配列である", () => {
      expect(useEditorStore.getState().items).toEqual([]);
    });

    it("layoutType が 'grid2' である", () => {
      expect(useEditorStore.getState().layoutType).toBe("grid2");
    });

    it("themeColor が '#3b82f6' である", () => {
      expect(useEditorStore.getState().themeColor).toBe("#3b82f6");
    });

    it("selectedItemId が null である", () => {
      expect(useEditorStore.getState().selectedItemId).toBeNull();
    });

    it("mobileImageLibraryOpen が false である", () => {
      expect(useEditorStore.getState().mobileImageLibraryOpen).toBeFalsy();
    });

    it("mobilePropertyPanelOpen が false である", () => {
      expect(useEditorStore.getState().mobilePropertyPanelOpen).toBeFalsy();
    });

    it("mobileImageLibraryTargetItemId が null である", () => {
      expect(
        useEditorStore.getState().mobileImageLibraryTargetItemId
      ).toBeNull();
    });
  });

  describe("initializeFromDB", () => {
    it("DBデータでストアを初期化できる", () => {
      const projectData = createTestProjectFile({
        meta: createTestMeta({ title: "読み込みテスト" }),
        items: [createTestItem({ id: "item-1", title: "運動A" })],
        settings: { layoutType: "grid3", themeColor: "#ff0000" },
      });

      useEditorStore.getState().initializeFromDB(projectData);

      const state = useEditorStore.getState();
      expect(state.isLoaded).toBeTruthy();
      expect(state.meta.title).toBe("読み込みテスト");
      expect(state.items).toHaveLength(1);
      expect(state.items[0]?.title).toBe("運動A");
      expect(state.layoutType).toBe("grid3");
      expect(state.themeColor).toBe("#ff0000");
    });

    it("初期化後に isLoaded が true になる", () => {
      expect(useEditorStore.getState().isLoaded).toBeFalsy();

      useEditorStore.getState().initializeFromDB(createTestProjectFile());

      expect(useEditorStore.getState().isLoaded).toBeTruthy();
    });
  });

  describe("setItems", () => {
    it("アイテム一覧を設定できる", () => {
      const items = [
        createTestItem({ id: "1", title: "運動A", order: 0 }),
        createTestItem({ id: "2", title: "運動B", order: 1 }),
      ];

      useEditorStore.getState().setItems(items);

      expect(useEditorStore.getState().items).toHaveLength(2);
      expect(useEditorStore.getState().items[0]?.title).toBe("運動A");
      expect(useEditorStore.getState().items[1]?.title).toBe("運動B");
    });

    it("空配列を設定できる", () => {
      useEditorStore.setState({
        items: [createTestItem()],
      });

      useEditorStore.getState().setItems([]);

      expect(useEditorStore.getState().items).toEqual([]);
    });
  });

  describe("addItem", () => {
    it("アイテムを追加できる", () => {
      const item = createTestItem({ id: "new-item", title: "新しい運動" });

      useEditorStore.getState().addItem(item);

      expect(useEditorStore.getState().items).toHaveLength(1);
      expect(useEditorStore.getState().items[0]).toEqual(item);
    });

    it("既存のアイテムに追加される", () => {
      useEditorStore.setState({
        items: [createTestItem({ id: "existing", order: 0 })],
      });

      const newItem = createTestItem({ id: "new", title: "追加", order: 1 });
      useEditorStore.getState().addItem(newItem);

      expect(useEditorStore.getState().items).toHaveLength(2);
    });

    it("MAX_ITEM_COUNT に達すると追加されない", () => {
      // MAX_ITEM_COUNT(10)個のアイテムを設定
      const maxItems = Array.from({ length: MAX_ITEM_COUNT }, (_, i) =>
        createTestItem({ id: `item-${i}`, order: i })
      );
      useEditorStore.setState({ items: maxItems });

      // 11個目を追加しようとする
      const newItem = createTestItem({ id: "overflow", order: MAX_ITEM_COUNT });
      useEditorStore.getState().addItem(newItem);

      // 追加されないことを確認
      expect(useEditorStore.getState().items).toHaveLength(MAX_ITEM_COUNT);
      expect(
        useEditorStore.getState().items.find((i) => i.id === "overflow")
      ).toBeUndefined();
    });

    it("MAX_ITEM_COUNT - 1 の状態から追加できる", () => {
      // 9個のアイテムを設定
      const items = Array.from({ length: MAX_ITEM_COUNT - 1 }, (_, i) =>
        createTestItem({ id: `item-${i}`, order: i })
      );
      useEditorStore.setState({ items });

      // 10個目を追加
      const newItem = createTestItem({
        id: "tenth",
        order: MAX_ITEM_COUNT - 1,
      });
      useEditorStore.getState().addItem(newItem);

      expect(useEditorStore.getState().items).toHaveLength(MAX_ITEM_COUNT);
    });
  });

  describe("addNewItem", () => {
    it("新規アイテムを作成し、IDを返す", () => {
      const id = useEditorStore.getState().addNewItem();

      expect(id).not.toBeNull();
      expect(typeof id).toBe("string");
      expect(useEditorStore.getState().items).toHaveLength(1);
    });

    it("新規アイテムが選択状態になる", () => {
      const id = useEditorStore.getState().addNewItem();

      expect(useEditorStore.getState().selectedItemId).toBe(id);
    });

    it("デフォルトタイトルは「新しい運動」", () => {
      useEditorStore.getState().addNewItem();

      expect(useEditorStore.getState().items[0]?.title).toBe("新しい運動");
    });

    it("カスタムタイトルを指定できる", () => {
      useEditorStore.getState().addNewItem("スクワット");

      expect(useEditorStore.getState().items[0]?.title).toBe("スクワット");
    });

    it("order が items.length に設定される", () => {
      useEditorStore.setState({
        items: [
          createTestItem({ id: "1", order: 0 }),
          createTestItem({ id: "2", order: 1 }),
        ],
      });

      useEditorStore.getState().addNewItem();

      expect(useEditorStore.getState().items[2]?.order).toBe(2);
    });

    it("MAX_ITEM_COUNT に達すると null を返す", () => {
      const maxItems = Array.from({ length: MAX_ITEM_COUNT }, (_, i) =>
        createTestItem({ id: `item-${i}`, order: i })
      );
      useEditorStore.setState({ items: maxItems });

      const id = useEditorStore.getState().addNewItem();

      expect(id).toBeNull();
      expect(useEditorStore.getState().items).toHaveLength(MAX_ITEM_COUNT);
    });
  });

  describe("updateItem", () => {
    it("特定アイテムのプロパティを更新できる", () => {
      useEditorStore.setState({
        items: [createTestItem({ id: "target", title: "元のタイトル" })],
      });

      useEditorStore
        .getState()
        .updateItem("target", { title: "新しいタイトル" });

      expect(useEditorStore.getState().items[0]?.title).toBe("新しいタイトル");
    });

    it("複数のプロパティを同時に更新できる", () => {
      useEditorStore.setState({
        items: [
          createTestItem({
            id: "target",
            title: "元",
            description: "元の説明",
          }),
        ],
      });

      useEditorStore.getState().updateItem("target", {
        title: "新しいタイトル",
        description: "新しい説明",
        imageSource: "img-123",
      });

      const item = useEditorStore.getState().items[0];
      expect(item?.title).toBe("新しいタイトル");
      expect(item?.description).toBe("新しい説明");
      expect(item?.imageSource).toBe("img-123");
    });

    it("存在しないIDの場合は何も変更されない", () => {
      const originalItem = createTestItem({ id: "existing", title: "元" });
      useEditorStore.setState({ items: [originalItem] });

      useEditorStore.getState().updateItem("non-existent", { title: "変更" });

      expect(useEditorStore.getState().items[0]?.title).toBe("元");
    });

    it("他のアイテムに影響しない", () => {
      useEditorStore.setState({
        items: [
          createTestItem({ id: "1", title: "運動A", order: 0 }),
          createTestItem({ id: "2", title: "運動B", order: 1 }),
        ],
      });

      useEditorStore.getState().updateItem("1", { title: "更新後" });

      expect(useEditorStore.getState().items[0]?.title).toBe("更新後");
      expect(useEditorStore.getState().items[1]?.title).toBe("運動B");
    });
  });

  describe("deleteItem", () => {
    it("アイテムを削除できる", () => {
      useEditorStore.setState({
        items: [createTestItem({ id: "to-delete" })],
      });

      useEditorStore.getState().deleteItem("to-delete");

      expect(useEditorStore.getState().items).toHaveLength(0);
    });

    it("order が再採番される", () => {
      useEditorStore.setState({
        items: [
          createTestItem({ id: "a", order: 0 }),
          createTestItem({ id: "b", order: 1 }),
          createTestItem({ id: "c", order: 2 }),
        ],
      });

      useEditorStore.getState().deleteItem("b");

      const { items } = useEditorStore.getState();
      expect(items).toHaveLength(2);
      expect(items[0]?.id).toBe("a");
      expect(items[0]?.order).toBe(0);
      expect(items[1]?.id).toBe("c");
      expect(items[1]?.order).toBe(1);
    });

    it("選択中のアイテムを削除すると selectedItemId が null になる", () => {
      useEditorStore.setState({
        items: [createTestItem({ id: "selected" })],
        selectedItemId: "selected",
      });

      useEditorStore.getState().deleteItem("selected");

      expect(useEditorStore.getState().selectedItemId).toBeNull();
    });

    it("選択中でないアイテムを削除しても selectedItemId は変わらない", () => {
      useEditorStore.setState({
        items: [
          createTestItem({ id: "selected", order: 0 }),
          createTestItem({ id: "other", order: 1 }),
        ],
        selectedItemId: "selected",
      });

      useEditorStore.getState().deleteItem("other");

      expect(useEditorStore.getState().selectedItemId).toBe("selected");
    });

    it("存在しないIDの場合は何も変更されない", () => {
      useEditorStore.setState({
        items: [createTestItem({ id: "existing" })],
      });

      useEditorStore.getState().deleteItem("non-existent");

      expect(useEditorStore.getState().items).toHaveLength(1);
    });
  });

  describe("reorderItems", () => {
    it("アイテムを並び替えできる", () => {
      const reorderedItems = [
        createTestItem({ id: "b", order: 0 }),
        createTestItem({ id: "a", order: 1 }),
      ];

      useEditorStore.getState().reorderItems(reorderedItems);

      expect(useEditorStore.getState().items).toEqual(reorderedItems);
    });
  });

  describe("setLayoutType", () => {
    it.each([["grid1"], ["grid2"], ["grid3"], ["grid4"]] as const)(
      "layoutType を '%s' に設定できる",
      (layout) => {
        useEditorStore.getState().setLayoutType(layout);

        expect(useEditorStore.getState().layoutType).toBe(layout);
      }
    );
  });

  describe("setSelectedItemId", () => {
    it("アイテムIDを選択状態にできる", () => {
      useEditorStore.getState().setSelectedItemId("item-123");

      expect(useEditorStore.getState().selectedItemId).toBe("item-123");
    });

    it("null を設定して選択解除できる", () => {
      useEditorStore.setState({ selectedItemId: "item-123" });

      useEditorStore.getState().setSelectedItemId(null);

      expect(useEditorStore.getState().selectedItemId).toBeNull();
    });
  });

  describe("setProjectTitle", () => {
    it("プロジェクトタイトルを更新できる", () => {
      useEditorStore.getState().setProjectTitle("新しいプロジェクト名");

      expect(useEditorStore.getState().meta.title).toBe("新しいプロジェクト名");
    });

    it("meta の他のプロパティは変更されない", () => {
      const originalMeta = createTestMeta({
        title: "元のタイトル",
        version: "2.0.0",
      });
      useEditorStore.setState({ meta: originalMeta });

      useEditorStore.getState().setProjectTitle("新しいタイトル");

      const { meta } = useEditorStore.getState();
      expect(meta.title).toBe("新しいタイトル");
      expect(meta.version).toBe("2.0.0");
      expect(meta.createdAt).toBe(originalMeta.createdAt);
    });
  });

  describe("deleteProject", () => {
    it("DBからプロジェクトを削除する", async () => {
      mockDeleteProject.mockResolvedValue(undefined);

      await useEditorStore.getState().deleteProject();

      expect(mockDeleteProject).toHaveBeenCalledTimes(1);
    });

    it("ストアを初期状態にリセットする", async () => {
      // 状態を変更
      useEditorStore.setState({
        items: [createTestItem()],
        layoutType: "grid3",
        selectedItemId: "some-id",
      });
      mockDeleteProject.mockResolvedValue(undefined);

      await useEditorStore.getState().deleteProject();

      const state = useEditorStore.getState();
      expect(state.isLoaded).toBeTruthy();
      expect(state.items).toEqual([]);
      expect(state.layoutType).toBe("grid2");
      expect(state.selectedItemId).toBeNull();
    });
  });

  describe("deleteImageAndClearReferences", () => {
    it("画像を参照するアイテムの imageSource をクリアする", async () => {
      useEditorStore.setState({
        items: [
          createTestItem({ id: "1", imageSource: "img-target", order: 0 }),
          createTestItem({ id: "2", imageSource: "img-other", order: 1 }),
          createTestItem({ id: "3", imageSource: "img-target", order: 2 }),
        ],
      });
      mockDeleteImage.mockResolvedValue(undefined);

      await useEditorStore
        .getState()
        .deleteImageAndClearReferences("img-target");

      const { items } = useEditorStore.getState();
      expect(items[0]?.imageSource).toBe("");
      expect(items[1]?.imageSource).toBe("img-other");
      expect(items[2]?.imageSource).toBe("");
    });

    it("DBから画像を削除する", async () => {
      useEditorStore.setState({ items: [] });
      mockDeleteImage.mockResolvedValue(undefined);

      await useEditorStore.getState().deleteImageAndClearReferences("img-123");

      expect(mockDeleteImage).toHaveBeenCalledWith("img-123");
    });

    it("参照がない場合も正常に完了する", async () => {
      useEditorStore.setState({
        items: [createTestItem({ id: "1", imageSource: "other-img" })],
      });
      mockDeleteImage.mockResolvedValue(undefined);

      await useEditorStore
        .getState()
        .deleteImageAndClearReferences("non-referenced");

      // 既存のアイテムに影響しない
      expect(useEditorStore.getState().items[0]?.imageSource).toBe("other-img");
      // 画像は削除される
      expect(mockDeleteImage).toHaveBeenCalledWith("non-referenced");
    });
  });

  describe("モバイルUI用アクション", () => {
    describe("setMobileImageLibraryOpen", () => {
      it("開く際に targetItemId を設定できる", () => {
        useEditorStore.getState().setMobileImageLibraryOpen(true, "item-123");

        expect(useEditorStore.getState().mobileImageLibraryOpen).toBeTruthy();
        expect(useEditorStore.getState().mobileImageLibraryTargetItemId).toBe(
          "item-123"
        );
      });

      it("閉じる際に targetItemId が null になる", () => {
        useEditorStore.setState({
          mobileImageLibraryOpen: true,
          mobileImageLibraryTargetItemId: "item-123",
        });

        useEditorStore.getState().setMobileImageLibraryOpen(false);

        expect(useEditorStore.getState().mobileImageLibraryOpen).toBeFalsy();
        expect(
          useEditorStore.getState().mobileImageLibraryTargetItemId
        ).toBeNull();
      });

      it("targetItemId なしで開ける", () => {
        useEditorStore.getState().setMobileImageLibraryOpen(true);

        expect(useEditorStore.getState().mobileImageLibraryOpen).toBeTruthy();
        expect(
          useEditorStore.getState().mobileImageLibraryTargetItemId
        ).toBeNull();
      });
    });

    describe("setMobilePropertyPanelOpen", () => {
      it("開閉を設定できる", () => {
        useEditorStore.getState().setMobilePropertyPanelOpen(true);
        expect(useEditorStore.getState().mobilePropertyPanelOpen).toBeTruthy();

        useEditorStore.getState().setMobilePropertyPanelOpen(false);
        expect(useEditorStore.getState().mobilePropertyPanelOpen).toBeFalsy();
      });
    });
  });

  describe("stateToProjectFile", () => {
    it("状態からProjectFile形式に変換できる", () => {
      const state = {
        isLoaded: true,
        meta: createTestMeta({ title: "テスト" }),
        items: [createTestItem({ id: "1", title: "運動A" })],
        layoutType: "grid3" as LayoutType,
        themeColor: "#ff0000",
        selectedItemId: null,
        mobileImageLibraryOpen: false,
        mobilePropertyPanelOpen: false,
        mobileImageLibraryTargetItemId: null,
      };

      const projectFile = stateToProjectFile(state);

      expect(projectFile.meta).toEqual(state.meta);
      expect(projectFile.settings.layoutType).toBe("grid3");
      expect(projectFile.settings.themeColor).toBe("#ff0000");
      expect(projectFile.items).toEqual(state.items);
    });

    it("UI状態（selectedItemId等）は含まれない", () => {
      const state = {
        isLoaded: true,
        meta: createTestMeta(),
        items: [],
        layoutType: "grid2" as LayoutType,
        themeColor: "#3b82f6",
        selectedItemId: "some-id",
        mobileImageLibraryOpen: true,
        mobilePropertyPanelOpen: true,
        mobileImageLibraryTargetItemId: "target-id",
      };

      const projectFile = stateToProjectFile(state);

      // ProjectFile には UI 状態のプロパティが含まれないことを確認
      expect(projectFile).not.toHaveProperty("selectedItemId");
      expect(projectFile).not.toHaveProperty("mobileImageLibraryOpen");
      expect(projectFile).not.toHaveProperty("mobilePropertyPanelOpen");
      expect(projectFile).not.toHaveProperty("mobileImageLibraryTargetItemId");
      expect(projectFile).not.toHaveProperty("isLoaded");
    });
  });
});
