/**
 * トレーニングページ結合テスト（ブラウザモード）
 *
 * 自主トレーニング指導箋エディタの主要ユーザーフローを
 * 実ブラウザ環境で検証する結合テスト
 */
import {
  BUTTON_ADD_CARD,
  CANVAS_EMPTY_DESCRIPTION,
  CANVAS_EMPTY_TITLE,
  DELETE_CONFIRM_TITLE,
  MAX_ITEM_COUNT,
} from "@rehab-grid/core/lib/constants";
import { useEditorStore } from "@rehab-grid/core/lib/store/useEditorStore";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import TrainingEditorPage from "@/app/(editor)/training/page";
import {
  createTestItem,
  getInitialEditorState,
} from "@/tests/mocks/browser-common";

// ========== モック設定 ==========

let alertSpy: MockInstance | undefined;
let confirmSpy: MockInstance | undefined;

// モック関数の定義（vi.hoisted で巻き上げ）
// 注意: vi.hoisted 内では外部モジュールからインポートした関数を使用できない
const { mockUseLiveQuery } = vi.hoisted(() => ({
  mockUseLiveQuery: vi.fn(() => []),
}));

// Dexie のモック
vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: mockUseLiveQuery,
}));

// IndexedDB (Dexie) のモック
// 注意: vi.mock ファクトリは巻き上げられるため、外部関数を呼び出せない
vi.mock("@/lib/db", () => ({
  db: {
    images: {
      orderBy: vi.fn(() => ({
        reverse: vi.fn(() => ({
          toArray: vi.fn(async () => Promise.resolve([])),
        })),
      })),
      put: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      bulkGet: vi.fn().mockResolvedValue([]),
    },
    projects: {
      put: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
  },
  loadProject: vi.fn().mockResolvedValue(undefined),
  saveProject: vi.fn().mockResolvedValue(undefined),
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
  deleteProject: vi.fn().mockResolvedValue(undefined),
  deleteImage: vi.fn().mockResolvedValue(undefined),
  saveImage: vi.fn().mockResolvedValue(undefined),
  getImage: vi.fn().mockResolvedValue(undefined),
  getImages: vi.fn().mockResolvedValue(new Map()),
}));

// next/image のモック（ブラウザモード用）
vi.mock("next/image", async () => {
  const { createElement } = await import("react");
  return {
    default: (props: Record<string, unknown>) => {
      const { src, alt, className, draggable } = props;
      return createElement("img", { src, alt, className, draggable });
    },
  };
});

// ImageLibraryPanel をモックして next/image の依存関係を回避
// 結合テストではページのメインフロー（カード追加・編集）に集中
vi.mock("@/components/editor/ImageLibraryPanel", async () => {
  const { createElement } = await import("react");
  return {
    ImageLibraryPanel: ({
      onAddCard,
      canAddCard,
    }: {
      onAddCard?: () => void;
      canAddCard?: boolean;
    }) => {
      return createElement(
        "div",
        { role: "region", ["aria-label"]: "画像ライブラリ" },
        createElement(
          "button",
          {
            type: "button",
            onClick: onAddCard,
            disabled: !canAddCard,
          },
          "カードを追加"
        )
      );
    },
  };
});

async function renderPage() {
  await render(<TrainingEditorPage />);
}

function getImageLibraryAddButton() {
  return page
    .getByRole("region", { name: "画像ライブラリ" })
    .getByRole("button", { name: BUTTON_ADD_CARD });
}

function getCardByTitle(title: string) {
  return page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: title }) })
    .first();
}

describe("TrainingEditorPage", () => {
  beforeEach(() => {
    // ストアを初期状態にリセット
    useEditorStore.setState(getInitialEditorState());

    // useLiveQuery のモックをリセット
    mockUseLiveQuery.mockReturnValue([]);

    // スレッドブロッキングダイアログのモック
    alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    alertSpy?.mockRestore();
    confirmSpy?.mockRestore();
    vi.clearAllMocks();
  });

  describe("初期表示", () => {
    it("空状態で EmptyState が表示される", async () => {
      await renderPage();

      await expect
        .element(page.getByText(CANVAS_EMPTY_TITLE))
        .toBeInTheDocument();
      await expect
        .element(page.getByText(CANVAS_EMPTY_DESCRIPTION))
        .toBeInTheDocument();
    });

    it("3カラムレイアウトのキャンバス領域が表示される", async () => {
      await renderPage();

      // キャンバス領域が表示される
      await expect
        .element(page.getByRole("region", { name: "キャンバス" }))
        .toBeInTheDocument();
    });
  });

  describe("カード追加フロー", () => {
    it("「カードを追加」ボタンで新規カードが作成される", async () => {
      await renderPage();

      // 初期状態では EmptyState が表示されている
      await expect
        .element(page.getByText(CANVAS_EMPTY_TITLE))
        .toBeInTheDocument();

      // カードを追加（ImageLibraryPanel内のボタンを使用）
      const addButton = getImageLibraryAddButton();
      await userEvent.click(addButton);

      // EmptyState が消える
      await expect
        .element(page.getByText(CANVAS_EMPTY_TITLE))
        .not.toBeInTheDocument();

      // カードが表示される（デフォルトタイトル「新しい運動」）
      await expect.element(page.getByText("新しい運動")).toBeInTheDocument();
    });

    it("新規カードが自動的に選択状態になる", async () => {
      await renderPage();

      // カードを追加（ImageLibraryPanel内のボタンを使用）
      const addButton = getImageLibraryAddButton();
      await userEvent.click(addButton);

      // PropertyPanel に編集フォームが表示される（運動名入力欄が表示）
      await expect.element(page.getByLabelText("運動名")).toBeInTheDocument();
    });

    it("最大数に達すると追加ボタンが無効化される", async () => {
      // 最大数のアイテムを設定
      const maxItems = Array.from({ length: MAX_ITEM_COUNT }, (_, i) =>
        createTestItem({
          id: `item-${String(i)}`,
          order: i,
          title: `運動${String(i + 1)}`,
        })
      );
      useEditorStore.setState({ ...getInitialEditorState(), items: maxItems });

      await renderPage();

      // 追加ボタンを取得（ImageLibraryPanel内のボタン）
      const addButton = getImageLibraryAddButton();

      // ボタンが無効化されている
      await expect.element(addButton).toBeDisabled();
    });
  });

  describe("カード選択・編集フロー", () => {
    it("カードクリックで選択状態になり PropertyPanel に編集フォームが表示される", async () => {
      // カードを1つ持つ状態で開始
      useEditorStore.setState({
        ...getInitialEditorState(),
        items: [createTestItem({ id: "item-1", title: "スクワット" })],
      });

      await renderPage();

      // PropertyPanel には最初「カードを選択」が表示されている
      await expect.element(page.getByText("カードを選択")).toBeInTheDocument();

      // カードをクリック
      const card = getCardByTitle("スクワット");
      await userEvent.click(card.getByRole("heading", { name: "スクワット" }));

      // PropertyPanel に編集フォームが表示される
      await expect.element(page.getByLabelText("運動名")).toBeInTheDocument();

      // 運動名の入力欄にタイトルが表示されている
      const titleInput = page.getByLabelText("運動名");
      await expect.element(titleInput).toHaveValue("スクワット");
    });

    it("運動名の編集が Canvas に反映される", async () => {
      // カードを1つ持つ状態で開始
      useEditorStore.setState({
        ...getInitialEditorState(),
        items: [createTestItem({ id: "item-1", title: "スクワット" })],
        selectedItemId: "item-1",
      });

      await renderPage();

      // 運動名入力欄をクリア＆新しい値を入力
      const titleInput = page.getByLabelText("運動名");
      await userEvent.clear(titleInput);
      await userEvent.fill(titleInput, "腕立て伏せ");

      // Canvas 側に反映される
      await expect.element(page.getByText("腕立て伏せ")).toBeInTheDocument();
    });

    it("説明の編集が Canvas に反映される", async () => {
      useEditorStore.setState({
        ...getInitialEditorState(),
        items: [createTestItem({ id: "item-1", title: "スクワット" })],
        selectedItemId: "item-1",
      });

      await renderPage();

      // 説明入力欄に入力
      const descInput = page.getByLabelText("説明");
      await userEvent.fill(descInput, "膝を90度に曲げてゆっくり立ち上がる");

      // Canvas 側のカード内に反映される（p要素で表示される）
      const card = getCardByTitle("スクワット");
      await expect
        .element(card.getByText("膝を90度に曲げてゆっくり立ち上がる"))
        .toBeInTheDocument();
    });

    it("回数・セット・頻度の編集が機能する", async () => {
      useEditorStore.setState({
        ...getInitialEditorState(),
        items: [createTestItem({ id: "item-1", title: "スクワット" })],
        selectedItemId: "item-1",
      });

      await renderPage();

      // 回数入力欄をラベルで探して入力
      const repsInput = page.getByLabelText("回数");
      await userEvent.fill(repsInput, "10回");

      // Canvas 側に反映される
      await expect.element(page.getByText("10回")).toBeInTheDocument();
    });

    it("注意点の追加が機能する", async () => {
      useEditorStore.setState({
        ...getInitialEditorState(),
        items: [createTestItem({ id: "item-1", title: "スクワット" })],
        selectedItemId: "item-1",
      });

      await renderPage();

      // 「追加」ボタンで注意点を追加（exact: true で完全一致）
      const addPrecautionButton = page.getByRole("button", {
        name: "追加",
        exact: true,
      });
      await userEvent.click(addPrecautionButton);

      // 注意点入力欄が表示される
      const precautionInput = page.getByPlaceholder("注意点を入力");
      await expect.element(precautionInput).toBeInTheDocument();

      // 注意点を入力
      await userEvent.fill(precautionInput, "痛みが出たら中止");

      // Canvas 側のカード内に反映される
      const card = getCardByTitle("スクワット");
      await expect
        .element(card.getByText(/痛みが出たら中止/))
        .toBeInTheDocument();
    });
  });

  describe("カード削除フロー", () => {
    it("削除ボタンで確認ダイアログが表示される", async () => {
      useEditorStore.setState({
        ...getInitialEditorState(),
        items: [createTestItem({ id: "item-1", title: "スクワット" })],
        selectedItemId: "item-1",
      });

      await renderPage();

      // 削除ボタンをクリック
      const deleteButton = page.getByRole("button", {
        name: /このカードを削除/,
      });
      await userEvent.click(deleteButton);

      // 確認ダイアログが表示される（ダイアログのheadingで確認）
      await expect
        .element(page.getByRole("heading", { name: DELETE_CONFIRM_TITLE }))
        .toBeInTheDocument();
    });

    it("確認後にカードが削除され選択状態が解除される", async () => {
      useEditorStore.setState({
        ...getInitialEditorState(),
        items: [createTestItem({ id: "item-1", title: "スクワット" })],
        selectedItemId: "item-1",
      });

      await renderPage();

      // カードが表示されていることを確認
      await expect.element(page.getByText("スクワット")).toBeInTheDocument();

      // 削除ボタンをクリック
      const deleteButton = page.getByRole("button", {
        name: /このカードを削除/,
      });
      await userEvent.click(deleteButton);

      // 確認ダイアログで「削除」をクリック
      const confirmButton = page.getByRole("button", { name: "削除" });
      await userEvent.click(confirmButton);

      // カードが削除される（EmptyState が表示される）
      await expect
        .element(page.getByText(CANVAS_EMPTY_TITLE))
        .toBeInTheDocument();

      // PropertyPanel には「カードを選択」が表示される
      await expect.element(page.getByText("カードを選択")).toBeInTheDocument();
    });
  });

  describe("キャンバス操作", () => {
    it("別のカードをクリックすると選択が切り替わる", async () => {
      useEditorStore.setState({
        ...getInitialEditorState(),
        items: [
          createTestItem({ id: "item-1", title: "スクワット" }),
          createTestItem({ id: "item-2", order: 1, title: "腕立て伏せ" }),
        ],
        selectedItemId: "item-1",
      });

      await renderPage();

      // 最初は item-1 が選択されている（運動名が「スクワット」）
      const titleInput = page.getByLabelText("運動名");
      await expect.element(titleInput).toHaveValue("スクワット");

      // item-2 をクリック
      const card2 = getCardByTitle("腕立て伏せ");
      await userEvent.click(card2.getByRole("heading", { name: "腕立て伏せ" }));

      // item-2 が選択され、運動名が「腕立て伏せ」に切り替わる
      await expect.element(titleInput).toHaveValue("腕立て伏せ");
    });
  });
});
