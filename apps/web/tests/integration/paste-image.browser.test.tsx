/**
 * クリップボード画像貼り付け機能 結合テスト（ブラウザモード）
 *
 * Ctrl+V（Mac: Cmd+V）での画像貼り付けによる
 * 新規カード作成フローを実ブラウザ環境で検証する
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
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import TrainingEditorPage from "@/app/(editor)/training/page";
import {
  createDataTransferItem,
  createTestImageFile,
  createTestItem,
  dispatchPasteEvent,
  getInitialEditorState,
  waitForNoStateChange,
} from "@/tests/mocks/browser-common";

// ========== モック設定 ==========

let alertSpy: MockInstance | undefined;
let confirmSpy: MockInstance | undefined;

// モック関数の定義（vi.hoisted で巻き上げ）
const { mockUseLiveQuery, mockProcessAndSaveImage } = vi.hoisted(() => ({
  mockUseLiveQuery: vi.fn(() => []),
  mockProcessAndSaveImage: vi.fn(),
}));

// Dexie のモック
vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: mockUseLiveQuery,
}));

// IndexedDB (Dexie) のモック
vi.mock("@rehab-grid/core/lib/db", () => ({
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

// 画像処理関数のモック
vi.mock("@rehab-grid/core/utils/image", () => ({
  processAndSaveImage: mockProcessAndSaveImage,
  validateImageFile: vi.fn(() => ({ valid: true })),
  compressImage: vi.fn(async (file: File) => Promise.resolve(file)),
  filterImageFiles: vi.fn((files: File[]) => files),
  getFileNameWithoutExtension: vi.fn((name: string) => name.replace(/\.[^.]+$/, "")),
  getDisplayFileName: vi.fn((name: string) => name),
  convertBlobToPdfSupportedDataUrl: vi.fn(async () => Promise.resolve("")),
  partitionImageIds: vi.fn(() => ({ userImageIds: [], sampleImageIds: [] })),
  fetchSampleImageBlobs: vi.fn(async () => Promise.resolve(new Map())),
  isValidImageBlob: vi.fn(async () => Promise.resolve(true)),
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

/**
 * ページをレンダリング
 */
async function renderPage() {
  await render(<TrainingEditorPage />);
}

/**
 * 画像ライブラリ内のカード追加ボタンを取得
 */
function getImageLibraryAddButton() {
  return page
    .getByRole("region", { name: "画像ライブラリ" })
    .getByRole("button", { name: BUTTON_ADD_CARD });
}

describe("クリップボード画像貼り付け", () => {
  beforeEach(() => {
    // ストアを初期状態にリセット
    useEditorStore.setState(getInitialEditorState());

    // useLiveQuery のモックをリセット
    mockUseLiveQuery.mockReturnValue([]);

    // processAndSaveImage のデフォルト動作: 成功
    mockProcessAndSaveImage.mockResolvedValue({
      success: true,
      imageId: "pasted-image-id",
    });

    // スレッドブロッキングダイアログのモック
    alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    alertSpy?.mockRestore();
    confirmSpy?.mockRestore();
    vi.clearAllMocks();
  });

  describe("基本動作", () => {
    it("画像をペーストすると新規カードが作成される", async () => {
      await renderPage();

      // 初期状態では EmptyState が表示されている
      await expect
        .element(page.getByText(CANVAS_EMPTY_TITLE))
        .toBeInTheDocument();

      // 画像をペースト
      const imageFile = createTestImageFile();
      dispatchPasteEvent([createDataTransferItem("image/png", imageFile)]);

      // 非同期処理を待機
      await vi.waitFor(() => {
        expect(mockProcessAndSaveImage).toHaveBeenCalledTimes(1);
      });

      // EmptyState が消える
      await expect
        .element(page.getByText(CANVAS_EMPTY_TITLE))
        .not.toBeInTheDocument();

      // カードが表示される（デフォルトタイトル「新しい運動」）
      await expect.element(page.getByText("新しい運動")).toBeInTheDocument();
    });

    it("ペーストされたカードに画像IDが設定される", async () => {
      const testImageId = "test-pasted-image-123";
      mockProcessAndSaveImage.mockResolvedValue({
        success: true,
        imageId: testImageId,
      });

      await renderPage();

      // 画像をペースト
      const imageFile = createTestImageFile();
      dispatchPasteEvent([createDataTransferItem("image/png", imageFile)]);

      // 非同期処理を待機
      await vi.waitFor(() => {
        expect(mockProcessAndSaveImage).toHaveBeenCalledTimes(1);
      });

      // ストアの状態を確認（imageSource が設定されている）
      const { items } = useEditorStore.getState();
      expect(items).toHaveLength(1);
      const createdItem = items[0];
      expect(createdItem).toBeDefined();
      expect(createdItem?.imageSource).toBe(testImageId);
    });

    it("ペースト後のカードが自動選択される", async () => {
      await renderPage();

      // 初期状態では「カードを選択」が表示
      await expect.element(page.getByText("カードを選択")).toBeInTheDocument();

      // 画像をペースト
      const imageFile = createTestImageFile();
      dispatchPasteEvent([createDataTransferItem("image/png", imageFile)]);

      // 非同期処理を待機
      await vi.waitFor(() => {
        expect(mockProcessAndSaveImage).toHaveBeenCalledTimes(1);
      });

      // PropertyPanel に編集フォームが表示される（運動名入力欄が表示）
      await expect.element(page.getByLabelText("運動名")).toBeInTheDocument();
    });
  });

  describe("エラーハンドリング", () => {
    it("画像処理が失敗した場合、カードは作成されない", async () => {
      mockProcessAndSaveImage.mockResolvedValue({
        success: false,
        error: "圧縮に失敗しました",
      });

      await renderPage();

      // 初期状態では EmptyState が表示されている
      await expect
        .element(page.getByText(CANVAS_EMPTY_TITLE))
        .toBeInTheDocument();

      // 画像をペースト
      const imageFile = createTestImageFile();
      dispatchPasteEvent([createDataTransferItem("image/png", imageFile)]);

      // 非同期処理を待機
      await vi.waitFor(() => {
        expect(mockProcessAndSaveImage).toHaveBeenCalledTimes(1);
      });

      // 状態変化がないことを確認するための待機
      await waitForNoStateChange();

      // EmptyState がまだ表示されている（カードは作成されない）
      await expect
        .element(page.getByText(CANVAS_EMPTY_TITLE))
        .toBeInTheDocument();

      // ストアの状態を確認
      const { items } = useEditorStore.getState();
      expect(items).toHaveLength(0);
    });

    it("最大数到達時はカードが追加されない", async () => {
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

      // 追加ボタンが無効化されていることを確認
      const addButton = getImageLibraryAddButton();
      await expect.element(addButton).toBeDisabled();

      // 画像をペースト
      const imageFile = createTestImageFile();
      dispatchPasteEvent([createDataTransferItem("image/png", imageFile)]);

      // 非同期処理を待機
      await vi.waitFor(() => {
        expect(mockProcessAndSaveImage).toHaveBeenCalledTimes(1);
      });

      // 状態変化がないことを確認するための待機
      await waitForNoStateChange();

      // ストアの状態を確認（アイテム数は変わらない）
      const { items } = useEditorStore.getState();
      expect(items).toHaveLength(MAX_ITEM_COUNT);
    });

    it("テキストをペーストしてもカードは作成されない", async () => {
      await renderPage();

      // 初期状態では EmptyState が表示されている
      await expect
        .element(page.getByText(CANVAS_EMPTY_TITLE))
        .toBeInTheDocument();

      // テキストをペースト
      dispatchPasteEvent([createDataTransferItem("text/plain", null)]);

      // 状態変化がないことを確認するための待機
      await waitForNoStateChange();

      // processAndSaveImage は呼ばれない
      expect(mockProcessAndSaveImage).not.toHaveBeenCalled();

      // EmptyState がまだ表示されている
      await expect
        .element(page.getByText(CANVAS_EMPTY_TITLE))
        .toBeInTheDocument();
    });

    it("clipboardData が空の場合は何も起きない", async () => {
      await renderPage();

      // 初期状態では EmptyState が表示されている
      await expect
        .element(page.getByText(CANVAS_EMPTY_TITLE))
        .toBeInTheDocument();

      // 空の clipboardData をペースト
      dispatchPasteEvent(null);

      // 状態変化がないことを確認するための待機
      await waitForNoStateChange();

      // processAndSaveImage は呼ばれない
      expect(mockProcessAndSaveImage).not.toHaveBeenCalled();

      // EmptyState がまだ表示されている
      await expect
        .element(page.getByText(CANVAS_EMPTY_TITLE))
        .toBeInTheDocument();
    });
  });

  describe("複数アイテムの処理", () => {
    it("複数アイテムがある場合、最初の画像のみ処理される", async () => {
      const testImageId = "first-image-id";
      mockProcessAndSaveImage.mockResolvedValue({
        success: true,
        imageId: testImageId,
      });

      await renderPage();

      // 複数のアイテムを含むペースト（テキスト + 画像2枚）
      const imageFile1 = createTestImageFile("image1.png");
      const imageFile2 = createTestImageFile("image2.png");
      dispatchPasteEvent([
        createDataTransferItem("text/plain", null),
        createDataTransferItem("image/png", imageFile1),
        createDataTransferItem("image/jpeg", imageFile2),
      ]);

      // 非同期処理を待機
      await vi.waitFor(() => {
        expect(mockProcessAndSaveImage).toHaveBeenCalledTimes(1);
      });

      // 最初の画像のみ処理される
      expect(mockProcessAndSaveImage).toHaveBeenCalledWith(
        imageFile1,
        expect.any(Function),
        expect.any(Function)
      );

      // カードは1つだけ作成される
      const { items } = useEditorStore.getState();
      expect(items).toHaveLength(1);
      const createdItem = items[0];
      expect(createdItem).toBeDefined();
      expect(createdItem?.imageSource).toBe(testImageId);
    });
  });

  describe("既存カードがある状態でのペースト", () => {
    it("既存カードがある状態でペーストすると追加でカードが作成される", async () => {
      // 既存のカードを設定
      useEditorStore.setState({
        ...getInitialEditorState(),
        items: [createTestItem({ id: "existing-item", title: "既存の運動" })],
      });

      await renderPage();

      // 既存カードが表示されている
      await expect.element(page.getByText("既存の運動")).toBeInTheDocument();

      // 画像をペースト
      const imageFile = createTestImageFile();
      dispatchPasteEvent([createDataTransferItem("image/png", imageFile)]);

      // 非同期処理を待機
      await vi.waitFor(() => {
        expect(mockProcessAndSaveImage).toHaveBeenCalledTimes(1);
      });

      // カードが2つになる
      const { items } = useEditorStore.getState();
      expect(items).toHaveLength(2);

      // 新しいカードが表示される
      await expect.element(page.getByText("新しい運動")).toBeInTheDocument();
      // 既存のカードも残っている
      await expect.element(page.getByText("既存の運動")).toBeInTheDocument();
    });
  });
});
