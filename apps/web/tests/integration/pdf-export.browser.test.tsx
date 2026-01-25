/**
 * PDF出力 結合テスト（Browser Mode）
 *
 * @remarks
 * - UIフロー（PDFメニュー → 生成 → ダウンロード/プレビュー）を実ブラウザで検証する
 * - PDF Worker 実行と実ダウンロードは不安定要因になりやすいため、`usePdfWorker.generatePdf` と
 *   `downloadBlob` はモックして「呼び出し」と「表示」を確認する
 */
import {
  PDF_DOWNLOAD_LABEL,
  PDF_DOWNLOAD_SUCCESS,
  PDF_GENERATING_MESSAGE,
  PDF_MENU_LABEL,
  PDF_NO_CARDS_ERROR,
  PDF_PREVIEW_GENERATING,
  PDF_PREVIEW_LABEL,
  PDF_PREVIEW_TITLE,
} from "@rehab-grid/core/lib/constants";
import { useEditorStore } from "@rehab-grid/core/lib/store/useEditorStore";
import { EditorHeader } from "@rehab-grid/ui/components/editor/EditorHeader";
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

import {
  createTestItem,
  createTestMeta,
  getInitialEditorState,
} from "@/tests/mocks/browser-common";

// =============================================================================
// モック設定（Browser Mode）
// =============================================================================

let alertSpy: MockInstance | undefined;
let confirmSpy: MockInstance | undefined;

const {
  mockToastSuccess,
  mockToastError,
  mockToastInfo,
  mockGeneratePdf,
  mockDownloadBlob,
  mockPreparePdfGenerationData,
  mockGeneratePdfFilename,
} = vi.hoisted(() => ({
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockToastInfo: vi.fn(),
  mockGeneratePdf: vi.fn(),
  mockDownloadBlob: vi.fn(),
  mockPreparePdfGenerationData: vi.fn(),
  mockGeneratePdfFilename: vi.fn(() => "test.pdf"),
}));

// sonner（トースト）のモック
vi.mock("sonner", () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
    info: mockToastInfo,
  },
}));

// IndexedDB (Dexie) のモック
// @remarks
// useEditorStore はモジュールスコープで loadProject() を呼び出すため、
// 実DBへ触れないように /lib/db をモックする
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
      where: vi.fn(() => ({
        anyOf: vi.fn(() => ({
          toArray: vi.fn(async () => Promise.resolve([])),
        })),
      })),
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

// useIsMobile を常に false（デスクトップ）を返すようにモック
// @remarks
// PdfMenu はモバイルではプレビューを出さないため、テストを安定させる
vi.mock("@/hooks/useMediaQuery", () => ({
  useMediaQuery: vi.fn(() => false),
  useIsMobile: vi.fn(() => false),
}));

// usePdfWorker のモック（Worker実行はしない）
vi.mock("@/hooks/usePdfWorker", () => ({
  usePdfWorker: () => ({
    state: { isGenerating: false, progress: 0, error: null },
    generatePdf: mockGeneratePdf,
    cancel: vi.fn(),
  }),
}));

// PDFユーティリティのモック（画像読み込み失敗などの詳細は単体テスト側で担保）
vi.mock("@/utils/pdf", () => ({
  preparePdfGenerationData: mockPreparePdfGenerationData,
  generatePdfFilename: mockGeneratePdfFilename,
}));

// ダウンロード実行はモック（アンカーclickの副作用を避ける）
vi.mock("@/utils/download", () => ({
  downloadBlob: mockDownloadBlob,
}));

// next/image のモック（ブラウザモード用）
vi.mock("next/image", async () => {
  const { createElement } = await import("react");
  const mod = {
    default: (props: Record<string, unknown>) => {
      const { src, alt, className, draggable } = props;
      return createElement("img", { src, alt, className, draggable });
    },
  };
  (mod as Record<string, unknown>).__esModule = true;
  return mod;
});

// next/link のモック
vi.mock("next/link", () => {
  const mod = {
    default: ({
      children,
      href,
      ...props
    }: {
      children: React.ReactNode;
      href: string;
      className?: string;
      title?: string;
    }) => (
      <a href={href} {...props}>
        {children}
      </a>
    ),
  };
  (mod as Record<string, unknown>).__esModule = true;
  return mod;
});

async function renderHeader() {
  await render(<EditorHeader />);
}

async function openPdfMenu() {
  const pdfButton = page.getByRole("button", {
    name: new RegExp(PDF_MENU_LABEL),
  });
  await userEvent.click(pdfButton);
}

describe("PDF出力（EditorHeader経由）", () => {
  beforeEach(() => {
    // ストアを初期状態にリセット
    useEditorStore.setState(getInitialEditorState());

    // スレッドブロッキングダイアログのモック（Browser Modeの注意事項）
    alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    alertSpy?.mockRestore();
    confirmSpy?.mockRestore();
    vi.clearAllMocks();
  });

  it("空プロジェクトではPDFボタンが無効（=実行できない）", async () => {
    useEditorStore.setState(getInitialEditorState({ items: [] }));

    await renderHeader();

    const pdfButton = page.getByRole("button", {
      name: new RegExp(PDF_MENU_LABEL),
    });
    await expect.element(pdfButton).toBeDisabled();
  });

  it("PDFメニュー → ダウンロードでPDF生成→ダウンロードが実行される", async () => {
    const meta = createTestMeta({ title: "テストプロジェクト" });
    const items = [createTestItem({ id: "item-1", title: "スクワット" })];

    useEditorStore.setState(getInitialEditorState({ meta, items }));

    const blob = new Blob(["PDF"], { type: "application/pdf" });
    mockPreparePdfGenerationData.mockResolvedValueOnce({
      meta,
      layoutType: "grid2",
      items,
      images: {},
    });
    mockGeneratePdf.mockResolvedValueOnce(blob);

    await renderHeader();

    await openPdfMenu();
    await userEvent.click(page.getByText(PDF_DOWNLOAD_LABEL));

    // 生成開始トースト
    expect(mockToastInfo).toHaveBeenCalledWith(PDF_GENERATING_MESSAGE);

    // 生成呼び出しが行われる
    expect(mockPreparePdfGenerationData).toHaveBeenCalledTimes(1);
    expect(mockPreparePdfGenerationData).toHaveBeenCalledWith(
      items,
      meta,
      "grid2"
    );
    expect(mockGeneratePdf).toHaveBeenCalledTimes(1);

    // ダウンロードが行われる
    expect(mockDownloadBlob).toHaveBeenCalledTimes(1);
    expect(mockDownloadBlob).toHaveBeenCalledWith(blob, "test.pdf");

    // 成功トースト
    expect(mockToastSuccess).toHaveBeenCalledWith(PDF_DOWNLOAD_SUCCESS);
  });

  it("PDFメニュー → プレビューでプレビューモーダルが表示され、閉じられる", async () => {
    const meta = createTestMeta({ title: "テストプロジェクト" });
    const items = [createTestItem({ id: "item-1", title: "スクワット" })];

    useEditorStore.setState(getInitialEditorState({ meta, items }));

    const blob = new Blob(["PDF"], { type: "application/pdf" });
    mockPreparePdfGenerationData.mockResolvedValueOnce({
      meta,
      layoutType: "grid2",
      items,
      images: {},
    });
    mockGeneratePdf.mockResolvedValueOnce(blob);

    await renderHeader();

    await openPdfMenu();
    await userEvent.click(page.getByText(PDF_PREVIEW_LABEL));

    // 生成開始トースト
    expect(mockToastInfo).toHaveBeenCalledWith(PDF_PREVIEW_GENERATING);

    // モーダル表示
    await expect
      .element(page.getByRole("heading", { name: PDF_PREVIEW_TITLE }))
      .toBeInTheDocument();

    // 閉じる（ボタンはアイコンのみのため title 属性で取得）
    const dialogEl = page.getByRole("dialog").element();
    const closeButton = dialogEl.querySelector('button[title="閉じる"]');
    if (!(closeButton instanceof HTMLButtonElement)) {
      throw new Error('閉じるボタン（button[title="閉じる"]）が見つかりません');
    }
    closeButton.click();

    // モーダルが閉じる
    await expect
      .element(page.getByRole("heading", { name: PDF_PREVIEW_TITLE }))
      .not.toBeInTheDocument();
  });

  it("プレビューモーダル内のダウンロードでダウンロードが実行される", async () => {
    const meta = createTestMeta({ title: "テストプロジェクト" });
    const items = [createTestItem({ id: "item-1", title: "スクワット" })];

    useEditorStore.setState(getInitialEditorState({ meta, items }));

    const blob = new Blob(["PDF"], { type: "application/pdf" });
    mockPreparePdfGenerationData.mockResolvedValueOnce({
      meta,
      layoutType: "grid2",
      items,
      images: {},
    });
    mockGeneratePdf.mockResolvedValueOnce(blob);

    await renderHeader();

    await openPdfMenu();
    await userEvent.click(page.getByText(PDF_PREVIEW_LABEL));

    // モーダル表示
    await expect
      .element(page.getByRole("heading", { name: PDF_PREVIEW_TITLE }))
      .toBeInTheDocument();

    // プレビュー内のダウンロード
    const dialogEl = page.getByRole("dialog").element();
    const downloadButton = dialogEl.querySelector(
      `button[title="${PDF_DOWNLOAD_LABEL}"]`
    );
    if (!(downloadButton instanceof HTMLButtonElement)) {
      throw new Error(
        `ダウンロードボタン（button[title="${PDF_DOWNLOAD_LABEL}"]）が見つかりません`
      );
    }
    downloadButton.click();

    expect(mockDownloadBlob).toHaveBeenCalledTimes(1);
    expect(mockDownloadBlob).toHaveBeenCalledWith(blob, "test.pdf");
    expect(mockToastSuccess).toHaveBeenCalledWith(PDF_DOWNLOAD_SUCCESS);
  });

  it("画像付きカードでもPDF生成→ダウンロードできる（画像Map空=読み込み失敗相当でも継続）", async () => {
    const meta = createTestMeta({ title: "テストプロジェクト" });
    const items = [
      createTestItem({
        id: "item-1",
        title: "スクワット",
        imageSource: "img-missing-1",
      }),
    ];

    useEditorStore.setState(getInitialEditorState({ meta, items }));

    const blob = new Blob(["PDF"], { type: "application/pdf" });
    mockPreparePdfGenerationData.mockResolvedValueOnce({
      meta,
      layoutType: "grid2",
      items,
      images: {}, // 画像取得/変換に失敗したケースを想定
    });
    mockGeneratePdf.mockResolvedValueOnce(blob);

    await renderHeader();

    await openPdfMenu();
    await userEvent.click(page.getByText(PDF_DOWNLOAD_LABEL));

    expect(mockPreparePdfGenerationData).toHaveBeenCalledWith(
      items,
      meta,
      "grid2"
    );
    expect(mockGeneratePdf).toHaveBeenCalledTimes(1);
    expect(mockDownloadBlob).toHaveBeenCalledWith(blob, "test.pdf");
  });

  it("（参考）空状態はPDFボタン無効のため、実行時エラー（トースト）は発生しない", async () => {
    // 仕様確認用のテスト（壊れにくさのため、トーストよりもボタン状態を優先）
    useEditorStore.setState(getInitialEditorState({ items: [] }));

    await renderHeader();

    const pdfButton = page.getByRole("button", {
      name: new RegExp(PDF_MENU_LABEL),
    });
    await expect.element(pdfButton).toBeDisabled();

    // UI的には押せないため、エラートーストも発生しない
    expect(mockToastError).not.toHaveBeenCalledWith(PDF_NO_CARDS_ERROR);
  });
});
