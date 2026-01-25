/**
 * トレーニングページ結合テスト（モバイルUI・ブラウザモード）
 *
 * 自主トレーニング指導箋エディタのモバイル版UI特有のユーザーフローを
 * 実ブラウザ環境で検証する結合テスト
 */
import {
  BUTTON_ADD_CARD,
  CANVAS_EMPTY_TITLE,
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
// 注意: Browser Mode では vi.mock のファクトリー内で外部インポートを使用できないため、
// モック定義はこのファイル内に直接記述する必要があります。

let alertSpy: MockInstance | undefined;
let confirmSpy: MockInstance | undefined;

// モック関数の定義（vi.hoisted で巻き上げ）
const { mockUseLiveQuery } = vi.hoisted(() => ({
  mockUseLiveQuery: vi.fn(() => []),
}));

// Dexie のモック
vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: mockUseLiveQuery,
}));

// useIsMobile を常に true を返すようにモック（モバイルモード強制）
vi.mock("@/hooks/useMediaQuery", () => ({
  useMediaQuery: vi.fn(() => true),
  useIsMobile: vi.fn(() => true),
}));

// IndexedDB (Dexie) のモック
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

// ImageLibraryPanel をモック（モバイル版: onImageSelect対応）
// 注意: モバイルモードでは左サイドバーはCSSで非表示だが、DOMには存在するため
// isMobile=falseでもボタンを表示しないようにする（重複防止）
vi.mock("@/components/editor/ImageLibraryPanel", async () => {
  const { createElement } = await import("react");
  return {
    ImageLibraryPanel: ({
      onImageSelect,
      isMobile,
    }: {
      onAddCard?: () => void;
      canAddCard?: boolean;
      onImageSelect?: (imageId: string) => void;
      isMobile?: boolean;
    }) => {
      return createElement(
        "div",
        { role: "region", ["aria-label"]: "画像ライブラリ" },
        [
          // サンプル画像ボタン（モバイル: タップで画像選択）
          isMobile &&
            createElement(
              "button",
              {
                key: "sample-image",
                type: "button",
                onClick: () => onImageSelect?.("sample-image-1"),
              },
              "サンプル画像1"
            ),
        ]
      );
    },
  };
});

/**
 * ページをレンダリング
 */
async function renderPage() {
  await render(<TrainingEditorPage />);
}

/**
 * キャンバス領域を取得
 */
function getCanvas() {
  return page.getByTestId("canvas");
}

/**
 * カードの設定ボタン（歯車アイコン）を取得
 */
function getSettingsButton(cardId: string) {
  return page
    .getByTestId(`card-${cardId}`)
    .getByRole("button", { name: "カードを編集" });
}

/**
 * カードの画像エリアタップボタンを取得
 */
function getImageAreaButton(cardId: string) {
  return page
    .getByTestId(`card-${cardId}`)
    .getByRole("button", { name: "画像を選択" });
}

/**
 * サイドバーの閉じるボタンを取得
 */
function getSidebarCloseButton() {
  return page.getByRole("button", { name: "サイドバーを閉じる" });
}

/**
 * サイドバーのオーバーレイを取得
 */
function getSidebarOverlay() {
  return page.getByTestId("mobile-sidebar-overlay");
}

/**
 * サイドバー本体を取得
 */
function getSidebarBody() {
  return page.getByTestId("mobile-sidebar-body");
}

/**
 * サイドバーのアニメーション終了をトリガーする
 *
 * ブラウザテストでは実際のCSSアニメーションの`animationend`イベントが
 * 発火しない場合があるため、手動でイベントを発火させる
 */
async function triggerSidebarAnimationEnd() {
  const sidebarBody = getSidebarBody();
  const element = sidebarBody.element();
  element.dispatchEvent(new AnimationEvent("animationend", { bubbles: true }));
  // アニメーション完了後の状態更新を待つ
  await new Promise((resolve) => {
    setTimeout(resolve, 50);
  });
}

describe("TrainingEditorPage（モバイルUI）", () => {
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
    it("空状態で EmptyState が表示され「カードを追加」ボタンがある", async () => {
      await renderPage();

      await expect
        .element(page.getByText(CANVAS_EMPTY_TITLE))
        .toBeInTheDocument();

      // EmptyState内の「カードを追加」ボタンがある（キャンバス領域内）
      await expect
        .element(getCanvas().getByRole("button", { name: BUTTON_ADD_CARD }))
        .toBeInTheDocument();
    });

    it("カードがある場合、設定アイコン（歯車）が表示される", async () => {
      useEditorStore.setState({
        ...getInitialEditorState(),
        items: [createTestItem({ id: "item-1", title: "スクワット" })],
      });

      await renderPage();

      // 設定アイコン（カードを編集ボタン）が表示される
      const settingsButton = getSettingsButton("item-1");
      await expect.element(settingsButton).toBeInTheDocument();
    });

    it("カードがある場合、画像選択ボタンが表示される", async () => {
      useEditorStore.setState({
        ...getInitialEditorState(),
        items: [createTestItem({ id: "item-1", title: "スクワット" })],
      });

      await renderPage();

      // 画像選択ボタンが表示される
      const imageAreaButton = getImageAreaButton("item-1");
      await expect.element(imageAreaButton).toBeInTheDocument();
    });
  });

  describe("画像ライブラリサイドバーの操作", () => {
    it("画像エリアをタップすると画像ライブラリサイドバーが開く", async () => {
      useEditorStore.setState({
        ...getInitialEditorState(),
        items: [createTestItem({ id: "item-1", title: "スクワット" })],
      });

      await renderPage();

      // 画像エリアをタップ
      const imageAreaButton = getImageAreaButton("item-1");
      await userEvent.click(imageAreaButton);

      // サイドバーが開く（role="dialog"）
      await expect
        .element(page.getByRole("dialog"))
        .toBeInTheDocument();

      // タイトルが「画像ライブラリ」
      await expect
        .element(page.getByText("画像ライブラリ"))
        .toBeInTheDocument();
    });

    it("閉じるボタンでサイドバーが閉じる", async () => {
      useEditorStore.setState({
        ...getInitialEditorState(),
        items: [createTestItem({ id: "item-1", title: "スクワット" })],
      });

      await renderPage();

      // 画像エリアをタップしてサイドバーを開く
      const imageAreaButton = getImageAreaButton("item-1");
      await userEvent.click(imageAreaButton);

      // サイドバーが開いていることを確認
      await expect
        .element(page.getByRole("dialog"))
        .toBeInTheDocument();

      // 閉じるボタンをクリック
      const closeButton = getSidebarCloseButton();
      await userEvent.click(closeButton);

      // アニメーション終了をトリガー（ブラウザテストではanimationendが発火しない場合がある）
      await triggerSidebarAnimationEnd();

      // サイドバーが閉じる
      await expect
        .element(page.getByRole("dialog"))
        .not.toBeInTheDocument();
    });

    it("オーバーレイをクリックするとサイドバーが閉じる", async () => {
      useEditorStore.setState({
        ...getInitialEditorState(),
        items: [createTestItem({ id: "item-1", title: "スクワット" })],
      });

      await renderPage();

      // 画像エリアをタップしてサイドバーを開く
      const imageAreaButton = getImageAreaButton("item-1");
      await userEvent.click(imageAreaButton);

      // サイドバーが開いていることを確認
      await expect
        .element(page.getByRole("dialog"))
        .toBeInTheDocument();

      // オーバーレイをクリック（サイドバー本体が上に重なっているため dispatchEvent でクリック）
      const overlay = getSidebarOverlay();
      const overlayElement = overlay.element();
      overlayElement.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true })
      );

      // Reactの状態更新を待機
      await new Promise((resolve) => {
        setTimeout(resolve, 50);
      });

      // アニメーション終了をトリガー
      await triggerSidebarAnimationEnd();

      // サイドバーが閉じる
      await expect
        .element(page.getByRole("dialog"))
        .not.toBeInTheDocument();
    });
  });

  describe("画像選択フロー", () => {
    it("画像ライブラリ内の画像をタップするとカードに設定されサイドバーが閉じる", async () => {
      useEditorStore.setState({
        ...getInitialEditorState(),
        items: [createTestItem({ id: "item-1", title: "スクワット" })],
      });

      await renderPage();

      // 画像エリアをタップしてサイドバーを開く
      const imageAreaButton = getImageAreaButton("item-1");
      await userEvent.click(imageAreaButton);

      // サンプル画像をタップ
      const sampleImageButton = page.getByRole("button", {
        name: "サンプル画像1",
      });
      await userEvent.click(sampleImageButton);

      // サイドバーが閉じる
      // 注意: サイドバーは画像選択成功時のみ閉じる実装のため、
      // サイドバーが閉じること自体が画像設定完了の証拠となる
      await expect
        .element(page.getByRole("dialog"))
        .not.toBeInTheDocument();
    });
  });

  describe("プロパティパネルサイドバーの操作", () => {
    it("設定アイコンをタップするとプロパティパネルサイドバーが開く", async () => {
      useEditorStore.setState({
        ...getInitialEditorState(),
        items: [createTestItem({ id: "item-1", title: "スクワット" })],
      });

      await renderPage();

      // 設定アイコンをタップ
      const settingsButton = getSettingsButton("item-1");
      await userEvent.click(settingsButton);

      // サイドバーが開く（role="dialog"）
      await expect
        .element(page.getByRole("dialog"))
        .toBeInTheDocument();

      // タイトルが「カード編集」
      await expect
        .element(page.getByText("カード編集"))
        .toBeInTheDocument();
    });

    it("プロパティパネル内で運動名を編集できる", async () => {
      useEditorStore.setState({
        ...getInitialEditorState(),
        items: [createTestItem({ id: "item-1", title: "スクワット" })],
      });

      await renderPage();

      // 設定アイコンをタップしてサイドバーを開く
      const settingsButton = getSettingsButton("item-1");
      await userEvent.click(settingsButton);

      // 運動名入力欄が表示される
      const titleInput = page.getByLabelText("運動名");
      await expect.element(titleInput).toBeInTheDocument();
      await expect.element(titleInput).toHaveValue("スクワット");

      // 運動名を編集
      await userEvent.clear(titleInput);
      await userEvent.fill(titleInput, "腕立て伏せ");

      // 入力欄に新しい値が反映されていることを確認
      await expect.element(titleInput).toHaveValue("腕立て伏せ");

      // サイドバーを閉じる
      const closeButton = getSidebarCloseButton();
      await userEvent.click(closeButton);
      await triggerSidebarAnimationEnd();

      // カード上のタイトルが変更されていることを確認（UI振る舞いテスト）
      await expect.element(page.getByText("腕立て伏せ")).toBeInTheDocument();
    });

    it("閉じるボタンでプロパティパネルサイドバーが閉じる", async () => {
      useEditorStore.setState({
        ...getInitialEditorState(),
        items: [createTestItem({ id: "item-1", title: "スクワット" })],
      });

      await renderPage();

      // 設定アイコンをタップしてサイドバーを開く
      const settingsButton = getSettingsButton("item-1");
      await userEvent.click(settingsButton);

      // サイドバーが開いていることを確認
      await expect
        .element(page.getByRole("dialog"))
        .toBeInTheDocument();

      // 閉じるボタンをクリック
      const closeButton = getSidebarCloseButton();
      await userEvent.click(closeButton);

      // アニメーション終了をトリガー
      await triggerSidebarAnimationEnd();

      // サイドバーが閉じる
      await expect
        .element(page.getByRole("dialog"))
        .not.toBeInTheDocument();
    });
  });

  describe("モバイルカード追加フロー", () => {
    it("EmptyState内の「カードを追加」ボタンで新規カードが作成される", async () => {
      await renderPage();

      // 初期状態では EmptyState が表示されている
      await expect
        .element(page.getByText(CANVAS_EMPTY_TITLE))
        .toBeInTheDocument();

      // 「カードを追加」ボタンをクリック（キャンバス内のボタン）
      const addButton = getCanvas().getByRole("button", {
        name: BUTTON_ADD_CARD,
      });
      await userEvent.click(addButton);

      // EmptyState が消える
      await expect
        .element(page.getByText(CANVAS_EMPTY_TITLE))
        .not.toBeInTheDocument();

      // カードが表示される（デフォルトタイトル「新しい運動」）
      await expect.element(page.getByText("新しい運動")).toBeInTheDocument();
    });

    it("グリッド下部の「カードを追加」ボタンで新規カードが作成される", async () => {
      // 既存カードがある状態で開始
      useEditorStore.setState({
        ...getInitialEditorState(),
        items: [createTestItem({ id: "item-1", title: "スクワット" })],
      });

      await renderPage();

      // グリッド下部の「カードを追加」ボタンをクリック（キャンバス内のボタン）
      const addButton = getCanvas().getByRole("button", {
        name: BUTTON_ADD_CARD,
      });
      await userEvent.click(addButton);

      // 新しいカードが追加される
      await expect.element(page.getByText("新しい運動")).toBeInTheDocument();
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

      // 追加ボタンを取得（キャンバス内のグリッド下部のボタン）
      const addButton = getCanvas().getByRole("button", {
        name: BUTTON_ADD_CARD,
      });

      // ボタンが無効化されている
      await expect.element(addButton).toBeDisabled();
    });
  });

  describe("モバイル固有のインタラクション", () => {
    it("別のカードの設定アイコンをタップすると選択が切り替わる", async () => {
      useEditorStore.setState({
        ...getInitialEditorState(),
        items: [
          createTestItem({ id: "item-1", title: "スクワット" }),
          createTestItem({ id: "item-2", order: 1, title: "腕立て伏せ" }),
        ],
      });

      await renderPage();

      // item-1 の設定アイコンをタップ
      const settingsButton1 = getSettingsButton("item-1");
      await userEvent.click(settingsButton1);

      // 運動名が「スクワット」
      let titleInput = page.getByLabelText("運動名");
      await expect.element(titleInput).toHaveValue("スクワット");

      // サイドバーを閉じる
      const closeButton = getSidebarCloseButton();
      await userEvent.click(closeButton);

      // アニメーション終了をトリガー
      await triggerSidebarAnimationEnd();

      // サイドバーが閉じるのを待つ
      await expect
        .element(page.getByRole("dialog"))
        .not.toBeInTheDocument();

      // item-2 の設定アイコンをタップ
      const settingsButton2 = getSettingsButton("item-2");
      await userEvent.click(settingsButton2);

      // 運動名が「腕立て伏せ」に切り替わる
      titleInput = page.getByLabelText("運動名");
      await expect.element(titleInput).toHaveValue("腕立て伏せ");
    });
  });
});
