import {
  PDF_DOWNLOAD_LABEL,
  PDF_PREVIEW_FULLSCREEN_TOOLTIP,
  PDF_PREVIEW_TITLE,
} from "@rehab-grid/core/lib/constants";
import { PdfPreviewModal } from "@rehab-grid/ui/components/editor/PdfPreviewModal";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ==============================================================================
// テスト用定数
// ==============================================================================

const LOADING_TEXT = "PDFを読み込み中...";
const CLOSE_BUTTON_TITLE = "閉じる";

// ==============================================================================
// テスト用ヘルパー
// ==============================================================================

/**
 * デフォルトのpropsを生成
 */
function createDefaultProps() {
  return {
    open: true,
    onOpenChange: vi.fn(),
    pdfBlob: null as Blob | null,
    onDownload: vi.fn(),
    filename: "test.pdf",
  };
}

/**
 * テスト用のPDFモックBlobを生成
 */
function createMockPdfBlob(): Blob {
  return new Blob(["mock pdf content"], { type: "application/pdf" });
}

/**
 * PdfPreviewModal のセットアップヘルパー
 */
function setupModal(
  overrides: Partial<ReturnType<typeof createDefaultProps>> = {}
) {
  const props = { ...createDefaultProps(), ...overrides };
  render(<PdfPreviewModal {...props} />);
  return props;
}

// ==============================================================================
// テスト
// ==============================================================================

describe("PdfPreviewModal", () => {
  // URL.createObjectURL と URL.revokeObjectURL のモック
  let mockCreateObjectURL: ReturnType<
    typeof vi.fn<(obj: Blob | MediaSource) => string>
  >;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn<(url: string) => void>>;

  beforeEach(() => {
    mockCreateObjectURL = vi.fn(() => "blob:http://localhost/mock-url");
    mockRevokeObjectURL = vi.fn();

    vi.spyOn(URL, "createObjectURL").mockImplementation(mockCreateObjectURL);
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(mockRevokeObjectURL);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("モーダルの開閉", () => {
    it("open=true のときモーダルが表示される", () => {
      setupModal({ open: true });

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText(PDF_PREVIEW_TITLE)).toBeInTheDocument();
    });

    it("open=false のときモーダルが表示されない", () => {
      setupModal({ open: false });

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("閉じるボタンをクリックすると onOpenChange(false) が呼ばれる", async () => {
      const user = userEvent.setup();
      const props = setupModal();

      const closeButton = screen.getByRole("button", {
        name: CLOSE_BUTTON_TITLE,
      });
      await user.click(closeButton);

      expect(props.onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("PDF表示", () => {
    it("pdfBlob が null のとき読み込み中テキストが表示される", () => {
      setupModal({ pdfBlob: null });

      expect(screen.getByText(LOADING_TEXT)).toBeInTheDocument();
      expect(screen.queryByTitle(PDF_PREVIEW_TITLE)).not.toBeInTheDocument();
    });

    it("pdfBlob があるとき iframe が表示される", () => {
      setupModal({ pdfBlob: createMockPdfBlob() });

      const iframe = screen.getByTitle(PDF_PREVIEW_TITLE);
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute("src", "blob:http://localhost/mock-url");
      expect(screen.queryByText(LOADING_TEXT)).not.toBeInTheDocument();
    });

    it("pdfBlob から URL.createObjectURL が呼ばれる", () => {
      const mockBlob = createMockPdfBlob();
      setupModal({ pdfBlob: mockBlob });

      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
    });
  });

  describe("ダウンロードボタン", () => {
    it("ダウンロードボタンをクリックすると onDownload が呼ばれる", async () => {
      const user = userEvent.setup();
      const props = setupModal({ pdfBlob: createMockPdfBlob() });

      const downloadButton = screen.getByRole("button", {
        name: PDF_DOWNLOAD_LABEL,
      });
      await user.click(downloadButton);

      expect(props.onDownload).toHaveBeenCalledTimes(1);
    });
  });

  describe("フルスクリーン機能", () => {
    it("フルスクリーンボタンが表示される", () => {
      setupModal();

      const fullscreenButton = screen.getByRole("button", {
        name: PDF_PREVIEW_FULLSCREEN_TOOLTIP,
      });
      expect(fullscreenButton).toBeInTheDocument();
    });

    it("フルスクリーンボタンクリックでエラーが発生しない", async () => {
      // jsdom環境ではrequestFullscreenが利用不可だが、
      // コンポーネントはエラーをキャッチするため正常に動作する
      const user = userEvent.setup();
      setupModal();

      const fullscreenButton = screen.getByRole("button", {
        name: PDF_PREVIEW_FULLSCREEN_TOOLTIP,
      });

      // エラーがthrowされないことを確認
      await expect(user.click(fullscreenButton)).resolves.not.toThrow();
    });
  });

  describe("リソース管理", () => {
    it("コンポーネントがアンマウントされると URL.revokeObjectURL が呼ばれる", () => {
      const handleOpenChange = vi.fn();
      const handleDownload = vi.fn();
      const { unmount } = render(
        <PdfPreviewModal
          open
          onOpenChange={handleOpenChange}
          pdfBlob={createMockPdfBlob()}
          onDownload={handleDownload}
        />
      );

      // アンマウント
      unmount();

      expect(mockRevokeObjectURL).toHaveBeenCalledWith(
        "blob:http://localhost/mock-url"
      );
    });
  });
});
