import {
  HISTORY_LIMIT,
  HISTORY_MERGE_WINDOW_MS,
  MAX_ITEM_COUNT,
} from "@rehab-grid/core/lib/constants";
import { stateToProjectFile, useEditorStore } from "@rehab-grid/core/lib/store/useEditorStore";
import {
  type EditorItem,
  type ProjectFile,
  type ProjectMeta,
  type ResolvedProjectSettings,
} from "@rehab-grid/core/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** 印刷スタイル（2-2）・ヘッダーとチェック表（2-3）のデフォルト値。ストアに入る設定は resolveProjectSettings で補われる */
const DEFAULT_PRINT_STYLE = {
  printColorMode: "color",
  textScale: "standard",
  pageOrientation: "auto",
  showCardNumbers: false,
  dosageLabels: { reps: "回数", sets: "セット", frequency: "頻度" },
  header: {
    showPatientNameBox: true,
    dateMode: "none",
    facilityName: "",
    therapistName: "",
    overallNote: "",
  },
  checkTable: "none",
} satisfies Partial<ResolvedProjectSettings>;

/**
 * テスト用の（デフォルト値補完済みの）プロジェクト設定を生成
 */
const createTestSettings = (
  overrides: Partial<ResolvedProjectSettings> = {}
): ResolvedProjectSettings => ({
  layoutType: "grid2",
  themeColor: "#3b82f6",
  ...DEFAULT_PRINT_STYLE,
  ...overrides,
});

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
  settings: createTestSettings(),
  selectedItemId: null,
  past: [],
  future: [],
  lastHistoryCommit: null,
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

    it("settings が既定値（grid2・#3b82f6・印刷スタイルは現行の見た目）である", () => {
      expect(useEditorStore.getState().settings).toEqual({
        layoutType: "grid2",
        themeColor: "#3b82f6",
        ...DEFAULT_PRINT_STYLE,
      });
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
      expect(state.settings).toEqual({
        layoutType: "grid3",
        themeColor: "#ff0000",
        ...DEFAULT_PRINT_STYLE,
      });
    });

    it("初期化後に isLoaded が true になる", () => {
      expect(useEditorStore.getState().isLoaded).toBeFalsy();

      useEditorStore.getState().initializeFromDB(createTestProjectFile());

      expect(useEditorStore.getState().isLoaded).toBeTruthy();
    });

    it("IndexedDB の古い・壊れた設定はデフォルト値で補う（Zod を通らない経路）", () => {
      useEditorStore.getState().initializeFromDB(
        createTestProjectFile({
          // @ts-expect-error - 旧バージョンや破損データで設定が欠けている場合を想定
          settings: { layoutType: "grid5" },
        })
      );

      expect(useEditorStore.getState().settings).toEqual({
        layoutType: "grid2",
        themeColor: "#3b82f6",
        ...DEFAULT_PRINT_STYLE,
      });
    });

    it("選択中のカードの選択を解除する（別のプロジェクトに切り替わるため）", () => {
      useEditorStore.setState({ selectedItemId: "item-1" });

      useEditorStore.getState().initializeFromDB(
        createTestProjectFile({ items: [createTestItem({ id: "item-1" })] })
      );

      expect(useEditorStore.getState().selectedItemId).toBeNull();
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
      useEditorStore.getState().addNewItem({ title: "スクワット" });

      expect(useEditorStore.getState().items[0]?.title).toBe("スクワット");
    });

    it("画像IDを指定して追加できる", () => {
      useEditorStore.getState().addNewItem({ imageSource: "img-1" });

      expect(useEditorStore.getState().items[0]?.imageSource).toBe("img-1");
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

  describe("duplicateItem", () => {
    const source = createTestItem({
      id: "source",
      order: 0,
      title: "スクワット",
      imageSource: "sample_standing_01",
      description: "膝を曲げる",
      dosages: { reps: "10回", sets: "3セット", frequency: "1日2回" },
      precautions: [
        { id: "p1", value: "痛みが出たら中止" },
        { id: "p2", value: "呼吸を止めない" },
      ],
    });

    it("元カードの直後に同じ内容で挿入し、order を連番に振り直す", () => {
      useEditorStore.setState({
        items: [source, createTestItem({ id: "next", order: 1 })],
      });

      const newId = useEditorStore.getState().duplicateItem("source");

      const { items } = useEditorStore.getState();
      expect(items.map((item) => item.id)).toEqual(["source", newId, "next"]);
      expect(items.map((item) => item.order)).toEqual([0, 1, 2]);
      expect(items[1]).toMatchObject({
        title: "スクワット",
        imageSource: "sample_standing_01",
        description: "膝を曲げる",
        dosages: { reps: "10回", sets: "3セット", frequency: "1日2回" },
        precautions: [
          { value: "痛みが出たら中止" },
          { value: "呼吸を止めない" },
        ],
      });
    });

    it("カードと注意点の ID がすべて新しくなり、複製が選択される", () => {
      useEditorStore.setState({ items: [source] });

      const newId = useEditorStore.getState().duplicateItem("source");

      const { items, selectedItemId } = useEditorStore.getState();
      const copy = items[1];
      expect(newId).not.toBeNull();
      expect(newId).not.toBe("source");
      expect(copy?.id).toBe(newId);
      expect(selectedItemId).toBe(newId);
      const copyPrecautionIds = copy?.precautions?.map((p) => p.id) ?? [];
      expect(copyPrecautionIds).toHaveLength(2);
      expect(copyPrecautionIds).not.toContain("p1");
      expect(copyPrecautionIds).not.toContain("p2");
    });

    it("元カードを編集しても複製には影響しない", () => {
      useEditorStore.setState({ items: [source] });
      const newId = useEditorStore.getState().duplicateItem("source");

      useEditorStore.getState().updateItem("source", {
        dosages: { reps: "20回", sets: "3セット", frequency: "1日2回" },
      });

      const copy = useEditorStore
        .getState()
        .items.find((item) => item.id === newId);
      expect(copy?.dosages?.reps).toBe("10回");
      expect(copy?.dosages).not.toBe(source.dosages);
      expect(copy?.precautions).not.toBe(source.precautions);
    });

    it("最大数に達している場合は null を返し、何も変更しない", () => {
      const items = Array.from({ length: MAX_ITEM_COUNT }, (_, i) =>
        createTestItem({ id: `item-${String(i)}`, order: i })
      );
      useEditorStore.setState({ items });

      expect(useEditorStore.getState().duplicateItem("item-0")).toBeNull();
      expect(useEditorStore.getState().items).toBe(items);
      expect(useEditorStore.getState().past).toHaveLength(0);
    });

    it("存在しない ID の場合は null を返す", () => {
      useEditorStore.setState({ items: [source] });

      expect(useEditorStore.getState().duplicateItem("missing")).toBeNull();
      expect(useEditorStore.getState().items).toHaveLength(1);
    });

    it("Undo 1 回で複製前に戻る", () => {
      useEditorStore.setState({ items: [source] });
      useEditorStore.getState().duplicateItem("source");

      useEditorStore.getState().undo();

      expect(useEditorStore.getState().items).toEqual([source]);
      expect(useEditorStore.getState().selectedItemId).toBeNull();
    });
  });

  describe("applyDosagesToAll", () => {
    const dosages = { reps: "10回", sets: "3セット", frequency: "1日2回" };

    it("全カードの用量を上書きし、変わった枚数を返す", () => {
      useEditorStore.setState({
        items: [
          createTestItem({ id: "a", order: 0, dosages }),
          createTestItem({ id: "b", order: 1 }),
          createTestItem({
            id: "c",
            order: 2,
            dosages: { reps: "5回", sets: "", frequency: "" },
          }),
        ],
      });

      const updatedCount = useEditorStore.getState().applyDosagesToAll(dosages);

      expect(updatedCount).toBe(2);
      const { items } = useEditorStore.getState();
      for (const item of items) {
        expect(item.dosages).toEqual(dosages);
      }
      // カード間で同じオブジェクトを共有しない
      expect(items[1]?.dosages).not.toBe(items[2]?.dosages);
    });

    it("空欄もそのままコピーする", () => {
      const partial = { reps: "10回", sets: "", frequency: "" };
      useEditorStore.setState({
        items: [
          createTestItem({ id: "a", order: 0, dosages: partial }),
          createTestItem({ id: "b", order: 1, dosages }),
        ],
      });

      useEditorStore.getState().applyDosagesToAll(partial);

      expect(useEditorStore.getState().items[1]?.dosages).toEqual(partial);
    });

    it("変わるカードがなければ 0 を返し、履歴を積まない", () => {
      useEditorStore.setState({
        items: [
          createTestItem({ id: "a", order: 0, dosages }),
          createTestItem({ id: "b", order: 1, dosages: { ...dosages } }),
        ],
      });

      expect(useEditorStore.getState().applyDosagesToAll(dosages)).toBe(0);
      expect(useEditorStore.getState().past).toHaveLength(0);
    });

    it("Undo 1 回で全カードが元に戻る", () => {
      const items = [
        createTestItem({ id: "a", order: 0, dosages }),
        createTestItem({ id: "b", order: 1 }),
        createTestItem({ id: "c", order: 2 }),
      ];
      useEditorStore.setState({ items });
      useEditorStore.getState().applyDosagesToAll(dosages);

      useEditorStore.getState().undo();

      expect(useEditorStore.getState().items).toBe(items);
    });
  });

  describe("appendPrecautionsToAll", () => {
    it("全カードに注意点を追加し、カードごとに別の ID を振る", () => {
      useEditorStore.setState({
        items: [
          createTestItem({ id: "a", order: 0 }),
          createTestItem({ id: "b", order: 1 }),
        ],
      });

      const result = useEditorStore
        .getState()
        .appendPrecautionsToAll(["痛みが出たら中止"]);

      expect(result).toEqual({ updatedCount: 2, skippedCount: 0 });
      const [a, b] = useEditorStore.getState().items;
      expect(a?.precautions?.map((p) => p.value)).toEqual(["痛みが出たら中止"]);
      expect(b?.precautions?.map((p) => p.value)).toEqual(["痛みが出たら中止"]);
      expect(a?.precautions?.[0]?.id).not.toBe(b?.precautions?.[0]?.id);
    });

    it("同じ文言（前後の空白は無視）と空文字は追加しない", () => {
      useEditorStore.setState({
        items: [
          createTestItem({
            id: "a",
            order: 0,
            precautions: [{ id: "p1", value: " 痛みが出たら中止 " }],
          }),
          createTestItem({ id: "b", order: 1 }),
        ],
      });

      const result = useEditorStore
        .getState()
        .appendPrecautionsToAll(["痛みが出たら中止", "", "   ", "痛みが出たら中止"]);

      expect(result).toEqual({ updatedCount: 1, skippedCount: 0 });
      const [a, b] = useEditorStore.getState().items;
      expect(a?.precautions).toHaveLength(1);
      expect(b?.precautions?.map((p) => p.value)).toEqual(["痛みが出たら中止"]);
    });

    it("上限を超える分は捨て、その件数を返す", () => {
      const existing = ["A", "B", "C", "D"].map((value, i) => ({
        id: `e${String(i)}`,
        value,
      }));
      useEditorStore.setState({
        items: [
          createTestItem({ id: "a", order: 0, precautions: existing }),
          createTestItem({ id: "b", order: 1 }),
        ],
      });

      const result = useEditorStore
        .getState()
        .appendPrecautionsToAll(["X", "Y", "Z"]);

      // a は残り 1 枠なので X だけ入り、Y・Z の 2 件が切り捨て
      expect(result).toEqual({ updatedCount: 2, skippedCount: 2 });
      const [a, b] = useEditorStore.getState().items;
      expect(a?.precautions?.map((p) => p.value)).toEqual([
        "A",
        "B",
        "C",
        "D",
        "X",
      ]);
      expect(b?.precautions?.map((p) => p.value)).toEqual(["X", "Y", "Z"]);
    });

    it("追加するカードがなければ履歴を積まない", () => {
      useEditorStore.setState({
        items: [
          createTestItem({
            id: "a",
            order: 0,
            precautions: [{ id: "p1", value: "痛みが出たら中止" }],
          }),
        ],
      });

      const result = useEditorStore
        .getState()
        .appendPrecautionsToAll(["痛みが出たら中止"]);

      expect(result).toEqual({ updatedCount: 0, skippedCount: 0 });
      expect(useEditorStore.getState().past).toHaveLength(0);
    });

    it("Undo 1 回で全カードが元に戻る", () => {
      const items = [
        createTestItem({ id: "a", order: 0 }),
        createTestItem({ id: "b", order: 1 }),
      ];
      useEditorStore.setState({ items });
      useEditorStore.getState().appendPrecautionsToAll(["痛みが出たら中止"]);

      useEditorStore.getState().undo();

      expect(useEditorStore.getState().items).toBe(items);
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

  describe("updateSettings", () => {
    it.each([["grid1"], ["grid2"], ["grid3"], ["grid4"]] as const)(
      "layoutType を '%s' に設定できる",
      (layout) => {
        useEditorStore.getState().updateSettings({ layoutType: layout });

        expect(useEditorStore.getState().settings.layoutType).toBe(layout);
      }
    );

    it("指定した項目だけを更新し、他の項目は保つ", () => {
      useEditorStore.getState().updateSettings({ themeColor: "#059669" });

      expect(useEditorStore.getState().settings).toEqual(
        createTestSettings({ themeColor: "#059669" })
      );
    });

    it("複数の項目（用途別プリセット）をまとめて更新し、履歴は 1 件になる", () => {
      useEditorStore.getState().updateSettings({
        textScale: "large",
        showCardNumbers: true,
      });

      const state = useEditorStore.getState();
      expect(state.settings).toMatchObject({
        textScale: "large",
        showCardNumbers: true,
      });
      expect(state.past).toHaveLength(1);
    });

    it("用量ラベルは中身が同じなら、新しいオブジェクトでも履歴を積まない", () => {
      const labels = { reps: "秒数", sets: "左右", frequency: "目安" };
      useEditorStore.getState().updateSettings({ dosageLabels: labels });
      useEditorStore.getState().updateSettings({ dosageLabels: { ...labels } });

      const state = useEditorStore.getState();
      expect(state.settings.dosageLabels).toEqual(labels);
      expect(state.past).toHaveLength(1);
    });

    it("用量ラベルの 1 キーだけが変わっても変更として記録する", () => {
      const labels = { reps: "秒数", sets: "左右", frequency: "目安" };
      useEditorStore.getState().updateSettings({ dosageLabels: labels });
      useEditorStore
        .getState()
        .updateSettings({ dosageLabels: { ...labels, frequency: "強度" } });

      const state = useEditorStore.getState();
      expect(state.settings.dosageLabels.frequency).toBe("強度");
      expect(state.past).toHaveLength(2);
    });

    it("ヘッダーの項目は中身が同じなら、新しいオブジェクトでも履歴を積まない", () => {
      const header = {
        ...DEFAULT_PRINT_STYLE.header,
        facilityName: "○○病院",
      };
      useEditorStore.getState().updateSettings({ header });
      useEditorStore.getState().updateSettings({ header: { ...header } });

      const state = useEditorStore.getState();
      expect(state.settings.header.facilityName).toBe("○○病院");
      expect(state.past).toHaveLength(1);
    });

    it("ヘッダーの同じ項目への連続入力は mergeKey で 1 件の履歴にまとまる", () => {
      const { updateSettings } = useEditorStore.getState();
      const mergeKey = "settings:header:facilityName";
      updateSettings(
        { header: { ...DEFAULT_PRINT_STYLE.header, facilityName: "○" } },
        { mergeKey }
      );
      updateSettings(
        { header: { ...DEFAULT_PRINT_STYLE.header, facilityName: "○○" } },
        { mergeKey }
      );

      const state = useEditorStore.getState();
      expect(state.settings.header.facilityName).toBe("○○");
      expect(state.past).toHaveLength(1);
    });

    it("実施チェック表を変更して元に戻せる", () => {
      useEditorStore.getState().updateSettings({ checkTable: "weekly" });
      expect(useEditorStore.getState().settings.checkTable).toBe("weekly");

      useEditorStore.getState().undo();
      expect(useEditorStore.getState().settings.checkTable).toBe("none");
    });
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
        settings: createTestSettings({
          layoutType: "grid3",
          themeColor: "#7c3aed",
        }),
        selectedItemId: "some-id",
      });
      mockDeleteProject.mockResolvedValue(undefined);

      await useEditorStore.getState().deleteProject();

      const state = useEditorStore.getState();
      expect(state.isLoaded).toBeTruthy();
      expect(state.items).toEqual([]);
      expect(state.settings).toEqual({
        layoutType: "grid2",
        themeColor: "#3b82f6",
        ...DEFAULT_PRINT_STYLE,
      });
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

  describe("編集履歴（Undo / Redo）", () => {
    /** 現在の items のタイトル一覧 */
    const titles = () => useEditorStore.getState().items.map((i) => i.title);

    beforeEach(() => {
      vi.useFakeTimers();
      useEditorStore.setState({
        items: [
          createTestItem({ id: "a", title: "運動A", order: 0 }),
          createTestItem({ id: "b", title: "運動B", order: 1 }),
        ],
      });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("updateItem を取り消し・やり直しできる", () => {
      const { updateItem, undo, redo } = useEditorStore.getState();
      updateItem("a", { title: "変更後" });

      undo();
      expect(titles()).toEqual(["運動A", "運動B"]);

      redo();
      expect(titles()).toEqual(["変更後", "運動B"]);
    });

    it("deleteItem を取り消すとカードが戻るが、選択状態には戻らない", () => {
      useEditorStore.setState({ selectedItemId: "a" });
      const { deleteItem, undo } = useEditorStore.getState();
      deleteItem("a");

      undo();

      expect(titles()).toEqual(["運動A", "運動B"]);
      expect(useEditorStore.getState().selectedItemId).toBeNull();
    });

    it("reorderItems を取り消せる", () => {
      const { reorderItems, undo } = useEditorStore.getState();
      reorderItems([
        createTestItem({ id: "b", title: "運動B", order: 0 }),
        createTestItem({ id: "a", title: "運動A", order: 1 }),
      ]);

      undo();

      expect(titles()).toEqual(["運動A", "運動B"]);
    });

    it("updateSettings と setProjectTitle を取り消せる", () => {
      const { updateSettings, setProjectTitle, undo } =
        useEditorStore.getState();
      updateSettings({ layoutType: "grid4" });
      updateSettings({ themeColor: "#059669" });
      setProjectTitle("新しい名前");

      undo();
      expect(useEditorStore.getState().meta.title).toBe("無題のプロジェクト");
      expect(useEditorStore.getState().settings.themeColor).toBe("#059669");

      undo();
      expect(useEditorStore.getState().settings).toEqual(
        createTestSettings({ layoutType: "grid4" })
      );

      undo();
      expect(useEditorStore.getState().settings.layoutType).toBe("grid2");
    });

    it("同じ mergeKey での連続した設定変更（カラーピッカーのドラッグ等）は 1 件にまとまる", () => {
      const { updateSettings } = useEditorStore.getState();
      const options = { mergeKey: "settings:themeColor" };
      updateSettings({ themeColor: "#111111" }, options);
      updateSettings({ themeColor: "#222222" }, options);
      updateSettings({ themeColor: "#333333" }, options);

      expect(useEditorStore.getState().past).toHaveLength(1);
      useEditorStore.getState().undo();
      expect(useEditorStore.getState().settings.themeColor).toBe("#3b82f6");
    });

    it("画像付きのカード追加は履歴 1 件になる", () => {
      const { addNewItem, undo } = useEditorStore.getState();
      addNewItem({ imageSource: "img-1" });

      expect(useEditorStore.getState().past).toHaveLength(1);
      undo();
      expect(titles()).toEqual(["運動A", "運動B"]);
    });

    it("Redo 後も存在するカードの選択は維持される", () => {
      const { addNewItem, undo, redo } = useEditorStore.getState();
      const newId = addNewItem();
      undo();
      useEditorStore.setState({ selectedItemId: "a" });

      redo();

      expect(useEditorStore.getState().selectedItemId).toBe("a");
      expect(useEditorStore.getState().items.at(-1)?.id).toBe(newId);
    });

    it("Undo 後に追加したカードが消えたら選択が解除される", () => {
      const { addNewItem, undo } = useEditorStore.getState();
      addNewItem();
      expect(useEditorStore.getState().selectedItemId).not.toBeNull();

      undo();

      expect(useEditorStore.getState().selectedItemId).toBeNull();
    });

    it("履歴がないときの undo / redo は何もしない", () => {
      const before = useEditorStore.getState().items;
      const { undo, redo } = useEditorStore.getState();

      undo();
      redo();

      expect(useEditorStore.getState().items).toBe(before);
    });

    it("新しい操作をすると future が消える", () => {
      const { updateItem, undo } = useEditorStore.getState();
      updateItem("a", { title: "1回目" });
      undo();
      expect(useEditorStore.getState().future).toHaveLength(1);

      updateItem("b", { title: "別の操作" });

      expect(useEditorStore.getState().future).toEqual([]);
    });

    it(`${HISTORY_LIMIT} 件を超えると古い履歴から捨てられる`, () => {
      const { updateItem } = useEditorStore.getState();
      for (let i = 1; i <= HISTORY_LIMIT + 5; i++) {
        updateItem("a", { title: `変更${i}` });
      }

      const { past, undo } = useEditorStore.getState();
      expect(past).toHaveLength(HISTORY_LIMIT);

      // 最大まで戻すと、捨てられなかった最古の状態（6回目の変更前 = 変更5）になる
      for (let i = 0; i < HISTORY_LIMIT; i++) undo();
      expect(titles()[0]).toBe("変更5");
    });

    describe("変化のない操作", () => {
      it("同じ値での updateItem は履歴を積まない", () => {
        const { updateItem } = useEditorStore.getState();
        updateItem("a", { title: "運動A" });

        expect(useEditorStore.getState().past).toEqual([]);
      });

      it("同じ値の dosages での updateItem は履歴を積まない", () => {
        const dosages = { reps: "10回", sets: "3セット", frequency: "" };
        useEditorStore.setState({
          items: [createTestItem({ id: "a", dosages })],
        });

        useEditorStore
          .getState()
          .updateItem("a", { dosages: { ...dosages } });

        expect(useEditorStore.getState().past).toEqual([]);
      });

      it("存在しない ID の updateItem / deleteItem は履歴を積まない", () => {
        const { updateItem, deleteItem } = useEditorStore.getState();
        updateItem("missing", { title: "x" });
        deleteItem("missing");

        expect(useEditorStore.getState().past).toEqual([]);
      });

      it("同じ値での updateSettings / setProjectTitle は履歴を積まない", () => {
        const { updateSettings, setProjectTitle } = useEditorStore.getState();
        const before = useEditorStore.getState().settings;
        updateSettings({ layoutType: "grid2" });
        updateSettings({ layoutType: "grid2", themeColor: "#3b82f6" });
        updateSettings({});
        setProjectTitle("無題のプロジェクト");

        expect(useEditorStore.getState().past).toEqual([]);
        // オートセーブを起こさないよう、設定オブジェクトも差し替えない
        expect(useEditorStore.getState().settings).toBe(before);
      });

      it("選択状態の変更は履歴を積まない", () => {
        useEditorStore.getState().setSelectedItemId("a");

        expect(useEditorStore.getState().past).toEqual([]);
      });
    });

    describe("連続入力のマージ", () => {
      it(`同じ mergeKey で ${HISTORY_MERGE_WINDOW_MS}ms 以内の入力は 1 件にまとまる`, () => {
        const { updateItem } = useEditorStore.getState();
        updateItem("a", { title: "運" }, { mergeKey: "a:title" });
        vi.advanceTimersByTime(HISTORY_MERGE_WINDOW_MS);
        updateItem("a", { title: "運動" }, { mergeKey: "a:title" });
        vi.advanceTimersByTime(HISTORY_MERGE_WINDOW_MS);
        updateItem("a", { title: "運動C" }, { mergeKey: "a:title" });

        expect(useEditorStore.getState().past).toHaveLength(1);
        useEditorStore.getState().undo();
        expect(titles()[0]).toBe("運動A");
      });

      it(`${HISTORY_MERGE_WINDOW_MS}ms を超えて間が空くと別の履歴になる`, () => {
        const { updateItem } = useEditorStore.getState();
        updateItem("a", { title: "運" }, { mergeKey: "a:title" });
        vi.advanceTimersByTime(HISTORY_MERGE_WINDOW_MS + 1);
        updateItem("a", { title: "運動" }, { mergeKey: "a:title" });

        expect(useEditorStore.getState().past).toHaveLength(2);
      });

      it("別の mergeKey の入力でマージが切れる", () => {
        const { updateItem } = useEditorStore.getState();
        updateItem("a", { title: "x" }, { mergeKey: "a:title" });
        updateItem("a", { description: "y" }, { mergeKey: "a:description" });
        updateItem("a", { title: "xx" }, { mergeKey: "a:title" });

        expect(useEditorStore.getState().past).toHaveLength(3);
      });

      it("mergeKey なしの操作はマージされない", () => {
        const { updateItem } = useEditorStore.getState();
        updateItem("a", { title: "x" });
        updateItem("a", { title: "xx" });

        expect(useEditorStore.getState().past).toHaveLength(2);
      });

      it("Undo 直後の入力は Undo 前の入力とまとめない", () => {
        const { updateItem, undo } = useEditorStore.getState();
        updateItem("a", { title: "x" }, { mergeKey: "a:title" });
        updateItem("b", { title: "y" }, { mergeKey: "b:title" });
        undo();
        updateItem("a", { title: "xx" }, { mergeKey: "a:title" });

        expect(useEditorStore.getState().past).toHaveLength(2);
      });
    });

    describe("履歴のクリア", () => {
      it("initializeFromDB で履歴がクリアされる", () => {
        const { updateItem, undo, initializeFromDB } =
          useEditorStore.getState();
        updateItem("a", { title: "1" });
        updateItem("a", { title: "2" });
        undo();

        initializeFromDB(createTestProjectFile());

        const state = useEditorStore.getState();
        expect(state.past).toEqual([]);
        expect(state.future).toEqual([]);
      });

      it("deleteProject で履歴がクリアされる", async () => {
        mockDeleteProject.mockResolvedValue(undefined);
        useEditorStore.getState().updateItem("a", { title: "1" });

        await useEditorStore.getState().deleteProject();

        expect(useEditorStore.getState().past).toEqual([]);
      });
    });

    it("画像削除は履歴に積まれず、履歴内の同じ画像への参照も消える", async () => {
      mockDeleteImage.mockResolvedValue(undefined);
      const { updateItem, undo, redo } = useEditorStore.getState();
      updateItem("a", { imageSource: "img-target" });
      updateItem("b", { imageSource: "img-target" });
      undo();
      // 現在: a に画像 / past: [初期] / future: [a・b に画像]

      await useEditorStore
        .getState()
        .deleteImageAndClearReferences("img-target");

      const imageSources = () =>
        useEditorStore.getState().items.map((i) => i.imageSource);
      expect(useEditorStore.getState().past).toHaveLength(1);
      expect(imageSources()).toEqual(["", ""]);

      redo();
      expect(imageSources()).toEqual(["", ""]);

      undo();
      undo();
      expect(imageSources()).toEqual(["", ""]);
    });
  });

  describe("stateToProjectFile", () => {
    it("状態からProjectFile形式に変換できる", () => {
      const state = {
        isLoaded: true,
        meta: createTestMeta({ title: "テスト" }),
        items: [createTestItem({ id: "1", title: "運動A" })],
        settings: createTestSettings({
          layoutType: "grid3",
          themeColor: "#ff0000",
        }),
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
        settings: createTestSettings(),
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
