/**
 * D&D機能 結合テスト（ブラウザモード）
 *
 * エディタページにおけるドラッグ＆ドロップ機能を
 * 実ブラウザ環境で検証する結合テスト
 *
 * @remarks
 * 対象:
 * - ImageLibraryからCanvasへの画像ドロップ（HTML5 D&D API）
 * - Canvas内のカード表示確認
 *
 * Canvas内のカード並び替え（dnd-kit）について:
 * dnd-kit は PointerEvents を使用しており、HTML5 D&D API（userEvent.dragAndDrop）
 * では動作しません。並び替えロジック自体は単体テスト（reorderEditorItems）で検証しています。
 *
 * @see tests/unit/utils/editor.test.ts - 並び替えロジックの単体テスト
 */
import { IMAGE_DRAG_TYPE, MAX_ITEM_COUNT, SAMPLE_IMAGES } from "@rehab-grid/core/lib/constants";
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
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import TrainingEditorPage from "@/app/(editor)/training/page";
import {
  createTestItem,
  getInitialEditorState,
  simulateDragAndDrop,
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
  const mod = {
    default: (props: Record<string, unknown>) => {
      const { src, alt, className, draggable } = props;
      return createElement("img", {
        src: src as string,
        alt: alt as string,
        className: className as string,
        draggable: draggable as boolean,
      });
    },
  };
  (mod as Record<string, unknown>).__esModule = true;
  return mod;
});

// ImageLibraryPanel をモック（D&Dテストではイベントをプログラム的にシミュレート）
vi.mock("@/components/editor/ImageLibraryPanel", async () => {
  const React = await import("react");
  const constants = await import("@/lib/constants");
  const imageDragType = constants.IMAGE_DRAG_TYPE;
  const sampleImages = constants.SAMPLE_IMAGES;

  // 最初のサンプル画像を取得（型安全のため）
  const firstImage = sampleImages[0];
  if (!firstImage) {
    throw new Error("SAMPLE_IMAGES is empty");
  }
  const sampleImageId = firstImage.id;

  return {
    ImageLibraryPanel: ({
      onAddCard,
      canAddCard,
    }: {
      onAddCard?: () => void;
      canAddCard?: boolean;
    }) => {
      // サンプル画像のドラッグをシミュレートするボタンを提供
      const handleDragStart = (
        e: React.DragEvent<HTMLButtonElement>,
        imageId: string
      ) => {
        e.dataTransfer.setData(imageDragType, imageId);
        e.dataTransfer.effectAllowed = "copy";
      };

      return React.createElement(
        "div",
        {
          role: "region",
          ["aria-label"]: "画像ライブラリ",
          ["data-testid"]: "image-library-panel",
        },
        // カード追加ボタン
        React.createElement(
          "button",
          {
            type: "button",
            onClick: onAddCard,
            disabled: !canAddCard,
          },
          "カードを追加"
        ),
        // ドラッグ可能なサムネイルボタン（最初のサンプル画像のみ）
        React.createElement(
          "button",
          {
            type: "button",
            draggable: true,
            onDragStart: (e: React.DragEvent<HTMLButtonElement>) =>
              handleDragStart(e, sampleImageId),
            ["data-testid"]: "draggable-thumbnail",
            ["data-image-id"]: sampleImageId,
          },
          "サンプル画像"
        )
      );
    },
  };
});

// ========== ヘルパー関数 ==========

/**
 * ページをレンダリング
 */
async function renderPage() {
  await render(<TrainingEditorPage />);
}

/**
 * ドラッグ可能なサムネイルを取得
 */
function getDraggableThumbnail() {
  return page.getByTestId("draggable-thumbnail");
}

/**
 * キャンバス領域を取得
 */
function getCanvas() {
  return page.getByRole("region", { name: "キャンバス" });
}

// ========== テストスイート ==========

describe("D&D機能", () => {
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
    // ストアをリセット
    useEditorStore.setState(getInitialEditorState());

    alertSpy?.mockRestore();
    confirmSpy?.mockRestore();
    vi.clearAllMocks();
  });

  describe("ImageLibraryからCanvasへの画像ドロップ", () => {
    // テストで使用するサンプル画像ID
    const sampleImageId = SAMPLE_IMAGES[0]?.id ?? "";

    it("サムネイル画像を既存カードにドロップすると画像が設定される", async () => {
      // カードを1つ持つ状態で開始
      useEditorStore.setState({
        ...getInitialEditorState(),
        items: [createTestItem({ id: "item-1", title: "スクワット" })],
      });

      await renderPage();

      // カードが画像なしで表示されていることを確認
      // 注意: SortableCard のドロップハンドラーは data-testid 要素に設定されている
      // role="listitem" は外側のラッパーであり、ドロップハンドラーを持たない
      const card = page.getByTestId("card-item-1");
      await expect.element(card).toBeInTheDocument();

      // ドラッグ可能なサムネイルとカード要素を取得
      const thumbnail = getDraggableThumbnail();
      const thumbnailElement = thumbnail.element();
      const cardElement = card.element();

      // HTML5 D&D イベントを手動でディスパッチ
      // userEvent.dragAndDrop では dataTransfer が正しく伝播しない場合があるため
      simulateDragAndDrop(
        thumbnailElement,
        cardElement,
        IMAGE_DRAG_TYPE,
        sampleImageId
      );

      // ストアの状態が更新されたことを確認（非同期ストア更新の待機）
      // ドロップ後にupdateItemが呼ばれ、imageSourceが設定されるのを待つ
      await expect
        .poll(() => useEditorStore.getState().items[0]?.imageSource, {
          timeout: 5000,
        })
        .toBeTruthy();

      // カードに画像が表示されることを確認
      const cardImage = card.getByRole("img");
      await expect.element(cardImage).toBeVisible();
    });

    it("サムネイル画像をキャンバス空きエリアにドロップすると新規カードが作成される", async () => {
      // 空の状態で開始
      useEditorStore.setState(getInitialEditorState());

      await renderPage();

      // キャンバスを取得
      const canvas = getCanvas();

      // 初期状態でカードがないことを確認
      expect(useEditorStore.getState().items).toHaveLength(0);

      // ドラッグ可能なサムネイルとキャンバス要素を取得
      const thumbnail = getDraggableThumbnail();
      const thumbnailElement = thumbnail.element();
      const canvasElement = canvas.element();

      // HTML5 D&D イベントを手動でディスパッチ
      // userEvent.dragAndDrop では dataTransfer が正しく伝播しない場合があるため
      simulateDragAndDrop(
        thumbnailElement,
        canvasElement,
        IMAGE_DRAG_TYPE,
        sampleImageId
      );

      // ストアに新規カードが追加されたことを確認（非同期ストア更新の待機）
      // ドロップ後にtryAddCardが呼ばれ、アイテムが追加されるのを待つ
      await expect
        .poll(() => useEditorStore.getState().items.length, { timeout: 5000 })
        .toBeGreaterThan(0);

      // 作成されたカードにimageSourceが設定されていることを確認
      await expect
        .poll(() => useEditorStore.getState().items[0]?.imageSource, {
          timeout: 5000,
        })
        .toBeTruthy();

      // 新規カードがDOMに表示されることを確認（リストアイテムが存在）
      await expect.element(page.getByRole("listitem")).toBeInTheDocument();

      // 作成されたカードに画像が設定されていることを確認
      // 注意: ネストされたロケーターの代わりにページレベルから直接検索
      const cardImage = page.getByRole("listitem").getByRole("img");
      await expect.element(cardImage).toBeVisible();
    });

    it("最大数到達時は空きエリアへのドロップで新規カードが作成されない", async () => {
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

      // キャンバスを取得
      const canvas = getCanvas();

      // 初期状態で最大数のカードがあることを確認
      await expect
        .element(page.getByRole("listitem"))
        .toHaveLength(MAX_ITEM_COUNT);

      // ドラッグ可能なサムネイルとキャンバス要素を取得
      const thumbnail = getDraggableThumbnail();
      const thumbnailElement = thumbnail.element();
      const canvasElement = canvas.element();

      // HTML5 D&D イベントを手動でディスパッチ
      simulateDragAndDrop(
        thumbnailElement,
        canvasElement,
        IMAGE_DRAG_TYPE,
        sampleImageId
      );

      // カード数が変わっていないことを確認
      await expect
        .element(page.getByRole("listitem"))
        .toHaveLength(MAX_ITEM_COUNT);
    });
  });

  describe("Canvas内のカード表示確認", () => {
    /**
     * このセクションではカードの表示とアクセシビリティ属性を確認します。
     *
     * @remarks
     * 並び替え機能のテストについて:
     * dnd-kit は PointerEvents（pointerdown/pointermove/pointerup）を使用しており、
     * HTML5 D&D API（userEvent.dragAndDrop）では動作しません。
     * 並び替えロジック（reorderEditorItems）は単体テストで検証しています。
     *
     * @see tests/unit/utils/editor.test.ts
     */
    it("複数カードがグリッドに正しく表示され、必要な属性を持つ", async () => {
      // カードを3つ持つ状態で開始
      useEditorStore.setState({
        ...getInitialEditorState(),
        items: [
          createTestItem({ id: "item-1", order: 0, title: "運動A" }),
          createTestItem({ id: "item-2", order: 1, title: "運動B" }),
          createTestItem({ id: "item-3", order: 2, title: "運動C" }),
        ],
      });

      await renderPage();

      // 全カードが表示されていることを確認
      await expect.element(page.getByText("運動A")).toBeInTheDocument();
      await expect.element(page.getByText("運動B")).toBeInTheDocument();
      await expect.element(page.getByText("運動C")).toBeInTheDocument();

      // 各カードがdata-testid属性を持っていることを確認
      const card1 = page.getByTestId("card-item-1");
      const card2 = page.getByTestId("card-item-2");
      const card3 = page.getByTestId("card-item-3");

      await expect.element(card1).toBeInTheDocument();
      await expect.element(card2).toBeInTheDocument();
      await expect.element(card3).toBeInTheDocument();

      // 選択状態のdata属性を確認（初期状態では未選択）
      await expect.element(card1).toHaveAttribute("data-selected", "false");
      await expect.element(card2).toHaveAttribute("data-selected", "false");
      await expect.element(card3).toHaveAttribute("data-selected", "false");
    });
  });
});
