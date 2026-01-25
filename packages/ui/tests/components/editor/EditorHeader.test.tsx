import {
  BUTTON_BACKUP,
  BUTTON_CANCEL,
  BUTTON_CONTINUE,
  BUTTON_DELETE,
  DEFAULT_PROJECT_TITLE,
  EXPORT_JSON_LABEL,
  EXPORT_ZIP_LABEL,
  GRID_SELECT_BUTTON_LABEL,
  HOME_LINK_TOOLTIP,
  IMPORT_CONFIRM_DESCRIPTION,
  IMPORT_CONFIRM_TITLE,
  IMPORT_OPEN_LABEL,
  PDF_DOWNLOAD_LABEL,
  PDF_GENERATING_SHORT,
  PDF_MENU_LABEL,
  PDF_PREVIEW_LABEL,
  PROJECT_DELETE_CONFIRM_DESCRIPTION,
  PROJECT_DELETE_CONFIRM_TITLE,
  PROJECT_DELETE_SUCCESS_MESSAGE,
  PROJECT_DELETE_TOOLTIP,
  TEMPLATE_BUTTON_LABEL,
} from "@rehab-grid/core/lib/constants";
import type { EditorItem, LayoutType, ProjectMeta } from "@rehab-grid/core/types";
import { EditorHeader } from "@rehab-grid/ui/components/editor/EditorHeader";
import {
  ExportMenu,
  type ExportMenuProps,
} from "@rehab-grid/ui/components/editor/EditorHeader/ExportMenu";
import {
  ImportConfirmDialog,
  type ImportConfirmDialogProps,
} from "@rehab-grid/ui/components/editor/EditorHeader/ImportConfirmDialog";
import {
  PdfMenu,
  type PdfMenuProps,
} from "@rehab-grid/ui/components/editor/EditorHeader/PdfMenu";
import { ProjectInfo } from "@rehab-grid/ui/components/editor/EditorHeader/ProjectInfo";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * モック関数の定義（vi.hoisted で先に定義）
 */
const {
  mockToastSuccess,
  mockToastError,
  mockToastInfo,
  mockInitializeFromDB,
  mockDeleteProject,
  mockSetLayoutType,
  mockSetProjectTitle,
  mockGeneratePdf,
  mockDownloadProjectAsJSON,
  mockDownloadProjectAsZIP,
  mockImportProject,
  mockApplyImportResult,
  mockLoadTemplate,
} = vi.hoisted(() => ({
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockToastInfo: vi.fn(),
  mockInitializeFromDB: vi.fn(),
  mockDeleteProject: vi.fn().mockResolvedValue(undefined),
  mockSetLayoutType: vi.fn(),
  mockSetProjectTitle: vi.fn(),
  mockGeneratePdf: vi
    .fn()
    .mockResolvedValue(new Blob(["pdf"], { type: "application/pdf" })),
  mockDownloadProjectAsJSON: vi.fn(),
  mockDownloadProjectAsZIP: vi.fn().mockResolvedValue(undefined),
  mockImportProject: vi
    .fn()
    .mockResolvedValue({ meta: {}, items: [], settings: {} }),
  mockApplyImportResult: vi.fn().mockResolvedValue(undefined),
  mockLoadTemplate: vi
    .fn()
    .mockResolvedValue({ meta: {}, items: [], settings: {} }),
}));

/**
 * モック用のストア状態
 */
let mockStoreState: {
  meta: ProjectMeta;
  items: EditorItem[];
  layoutType: LayoutType;
  themeColor: string;
};

/**
 * next/image のモック
 */
vi.mock("next/image", async () => {
  const { mockNextImage } = await import("@/tests/mocks/next-image");
  return mockNextImage;
});

/**
 * next/link のモック
 */
vi.mock("next/link", () => ({
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
}));

/**
 * sonner のモック
 */
vi.mock("sonner", () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
    info: mockToastInfo,
  },
}));

/**
 * Zustand ストアのモック
 */
vi.mock("@/lib/store/useEditorStore", () => ({
  useEditorStore: (
    selector: (
      state: typeof mockStoreState & {
        initializeFromDB: typeof mockInitializeFromDB;
        deleteProject: typeof mockDeleteProject;
        setLayoutType: typeof mockSetLayoutType;
        setProjectTitle: typeof mockSetProjectTitle;
      }
    ) => unknown
  ) => {
    const fullState = {
      ...mockStoreState,
      initializeFromDB: mockInitializeFromDB,
      deleteProject: mockDeleteProject,
      setLayoutType: mockSetLayoutType,
      setProjectTitle: mockSetProjectTitle,
    };
    return selector(fullState);
  },
}));

/**
 * usePdfWorker フックのモック
 */
vi.mock("@/hooks/usePdfWorker", () => ({
  usePdfWorker: () => ({
    state: { isGenerating: false },
    generatePdf: mockGeneratePdf,
  }),
}));

/**
 * エクスポート関連ユーティリティのモック
 */
vi.mock("@/utils/export", () => ({
  downloadProjectAsJSON: mockDownloadProjectAsJSON,
  downloadProjectAsZIP: mockDownloadProjectAsZIP,
  importProject: mockImportProject,
}));

/**
 * プロジェクト関連ユーティリティのモック
 */
vi.mock("@/utils/project", () => ({
  applyImportResult: mockApplyImportResult,
  createProjectFile: vi.fn(() => ({})),
  createProjectSettings: vi.fn(() => ({})),
}));

/**
 * テンプレート関連ユーティリティのモック
 */
vi.mock("@/utils/template", () => ({
  loadTemplate: mockLoadTemplate,
}));

/**
 * useIsMobile フックのモック（デスクトップモードをシミュレート）
 */
vi.mock("@/hooks/useMediaQuery", () => ({
  useIsMobile: () => false,
  useMediaQuery: () => false,
}));

/**
 * PDF関連ユーティリティのモック
 */
vi.mock("@/utils/pdf", () => ({
  generatePdfFilename: vi.fn(() => "test.pdf"),
  preparePdfGenerationData: vi.fn().mockResolvedValue({}),
}));

/**
 * ダウンロードユーティリティのモック
 */
vi.mock("@/utils/download", () => ({
  downloadBlob: vi.fn(),
}));

/**
 * GridSelectDialog のモック
 */
vi.mock("@/components/editor/GridSelectDialog", () => ({
  GridSelectDialog: ({
    open,
    onLayoutChange,
  }: {
    open: boolean;
    onLayoutChange: (layout: LayoutType) => void;
  }) =>
    open ? (
      <div data-testid="grid-select-dialog">
        <button type="button" onClick={() => onLayoutChange("grid3")}>
          grid3を選択
        </button>
      </div>
    ) : null,
}));

/**
 * PdfPreviewModal のモック
 */
vi.mock("@/components/editor/PdfPreviewModal", () => ({
  PdfPreviewModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="pdf-preview-modal">PDFプレビュー</div> : null,
}));

/**
 * TemplateSelectModal のモック
 */
vi.mock("@/components/editor/TemplateSelectModal", () => ({
  TemplateSelectModal: ({
    open,
    onSelect,
  }: {
    open: boolean;
    onSelect: (id: string) => void;
  }) =>
    open ? (
      <div data-testid="template-select-modal">
        <button type="button" onClick={() => onSelect("template-1")}>
          テンプレート選択
        </button>
      </div>
    ) : null,
}));

/**
 * デフォルトのモックストア状態を生成
 */
function createDefaultMockStoreState(): typeof mockStoreState {
  return {
    meta: {
      version: "1.0.0",
      title: "テストプロジェクト",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectType: "training",
    },
    items: [],
    layoutType: "grid2",
    themeColor: "#3B82F6",
  };
}

/**
 * テストアイテムを生成
 */
function createTestItem(overrides: Partial<EditorItem> = {}): EditorItem {
  return {
    id: "test-item-1",
    order: 0,
    title: "テスト運動",
    imageSource: "",
    description: "",
    ...overrides,
  };
}

beforeEach(() => {
  // ストア状態をリセット
  mockStoreState = createDefaultMockStoreState();
  // 全モック関数をクリア
  vi.clearAllMocks();
});

// ============================================================
// ExportMenu のテスト
// ============================================================

describe("ExportMenu", () => {
  /**
   * デフォルトのpropsを生成
   */
  function createDefaultExportMenuProps(): ExportMenuProps {
    return {
      onExportJSON: vi.fn(),
      onExportZIP: vi.fn(),
    };
  }

  /**
   * ExportMenu のセットアップヘルパー
   */
  function setupExportMenu(
    overrides: Partial<ExportMenuProps> = {}
  ): ExportMenuProps {
    const props = { ...createDefaultExportMenuProps(), ...overrides };
    render(<ExportMenu {...props} />);
    return props;
  }

  it("バックアップボタンが表示される", () => {
    setupExportMenu();

    expect(
      screen.getByRole("button", { name: new RegExp(BUTTON_BACKUP) })
    ).toBeInTheDocument();
  });

  it("バックアップボタンをクリックするとドロップダウンが表示される", async () => {
    const user = userEvent.setup();
    setupExportMenu();

    const button = screen.getByRole("button", {
      name: new RegExp(BUTTON_BACKUP),
    });
    await user.click(button);

    expect(screen.getByText(EXPORT_JSON_LABEL)).toBeInTheDocument();
    expect(screen.getByText(EXPORT_ZIP_LABEL)).toBeInTheDocument();
  });

  it("「テキストのみ」クリックで onExportJSON が呼ばれる", async () => {
    const user = userEvent.setup();
    const props = setupExportMenu();

    const button = screen.getByRole("button", {
      name: new RegExp(BUTTON_BACKUP),
    });
    await user.click(button);
    await user.click(screen.getByText(EXPORT_JSON_LABEL));

    expect(props.onExportJSON).toHaveBeenCalledTimes(1);
  });

  it("「画像付き」クリックで onExportZIP が呼ばれる", async () => {
    const user = userEvent.setup();
    const props = setupExportMenu();

    const button = screen.getByRole("button", {
      name: new RegExp(BUTTON_BACKUP),
    });
    await user.click(button);
    await user.click(screen.getByText(EXPORT_ZIP_LABEL));

    expect(props.onExportZIP).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// PdfMenu のテスト
// ============================================================

describe("PdfMenu", () => {
  /**
   * デフォルトのpropsを生成
   */
  function createDefaultPdfMenuProps(): PdfMenuProps {
    return {
      onPreview: vi.fn(),
      onDownload: vi.fn(),
      isGenerating: false,
      disabled: false,
    };
  }

  /**
   * PdfMenu のセットアップヘルパー
   */
  function setupPdfMenu(overrides: Partial<PdfMenuProps> = {}): PdfMenuProps {
    const props = { ...createDefaultPdfMenuProps(), ...overrides };
    render(<PdfMenu {...props} />);
    return props;
  }

  it("PDFボタンが表示される", () => {
    setupPdfMenu();

    expect(
      screen.getByRole("button", { name: new RegExp(PDF_MENU_LABEL) })
    ).toBeInTheDocument();
  });

  it("PDFボタンをクリックするとドロップダウンが表示される", async () => {
    const user = userEvent.setup();
    setupPdfMenu();

    const button = screen.getByRole("button", {
      name: new RegExp(PDF_MENU_LABEL),
    });
    await user.click(button);

    expect(screen.getByText(PDF_PREVIEW_LABEL)).toBeInTheDocument();
    expect(screen.getByText(PDF_DOWNLOAD_LABEL)).toBeInTheDocument();
  });

  it("「プレビュー」クリックで onPreview が呼ばれる", async () => {
    const user = userEvent.setup();
    const props = setupPdfMenu();

    const button = screen.getByRole("button", {
      name: new RegExp(PDF_MENU_LABEL),
    });
    await user.click(button);
    await user.click(screen.getByText(PDF_PREVIEW_LABEL));

    expect(props.onPreview).toHaveBeenCalledTimes(1);
  });

  it("「ダウンロード」クリックで onDownload が呼ばれる", async () => {
    const user = userEvent.setup();
    const props = setupPdfMenu();

    const button = screen.getByRole("button", {
      name: new RegExp(PDF_MENU_LABEL),
    });
    await user.click(button);
    await user.click(screen.getByText(PDF_DOWNLOAD_LABEL));

    expect(props.onDownload).toHaveBeenCalledTimes(1);
  });

  it("disabled=true のとき PDFボタンが無効になる", () => {
    setupPdfMenu({ disabled: true });

    const button = screen.getByRole("button", {
      name: new RegExp(PDF_MENU_LABEL),
    });
    expect(button).toBeDisabled();
  });

  it("isGenerating=true のとき PDFボタンが無効になり、生成中テキストが表示される", () => {
    setupPdfMenu({ isGenerating: true });

    const button = screen.getByRole("button", {
      name: new RegExp(PDF_GENERATING_SHORT),
    });
    expect(button).toBeDisabled();
  });
});

// ============================================================
// ImportConfirmDialog のテスト
// ============================================================

describe("ImportConfirmDialog", () => {
  /**
   * デフォルトのpropsを生成
   */
  function createDefaultImportConfirmDialogProps(): ImportConfirmDialogProps {
    return {
      open: false,
      onOpenChange: vi.fn(),
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    };
  }

  /**
   * ImportConfirmDialog のセットアップヘルパー
   */
  function setupImportConfirmDialog(
    overrides: Partial<ImportConfirmDialogProps> = {}
  ): ImportConfirmDialogProps {
    const props = { ...createDefaultImportConfirmDialogProps(), ...overrides };
    render(<ImportConfirmDialog {...props} />);
    return props;
  }

  it("open=false のときダイアログが表示されない", () => {
    setupImportConfirmDialog({ open: false });

    expect(screen.queryByText(IMPORT_CONFIRM_TITLE)).not.toBeInTheDocument();
  });

  it("open=true のときダイアログが表示される", () => {
    setupImportConfirmDialog({ open: true });

    expect(screen.getByText(IMPORT_CONFIRM_TITLE)).toBeInTheDocument();
    expect(screen.getByText(IMPORT_CONFIRM_DESCRIPTION)).toBeInTheDocument();
  });

  it("「続行」クリックで onConfirm が呼ばれる", async () => {
    const user = userEvent.setup();
    const props = setupImportConfirmDialog({ open: true });

    await user.click(screen.getByRole("button", { name: BUTTON_CONTINUE }));

    expect(props.onConfirm).toHaveBeenCalledTimes(1);
  });

  it("「キャンセル」クリックで onCancel が呼ばれる", async () => {
    const user = userEvent.setup();
    const props = setupImportConfirmDialog({ open: true });

    await user.click(screen.getByRole("button", { name: BUTTON_CANCEL }));

    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// ProjectInfo のテスト
// ============================================================

describe("ProjectInfo", () => {
  describe("デスクトップ版（デフォルト）", () => {
    it("プロジェクト名ボタンが表示される", () => {
      render(<ProjectInfo />);

      expect(
        screen.getByRole("button", { name: "テストプロジェクト" })
      ).toBeInTheDocument();
    });

    it("タイトルが空の場合デフォルトタイトルが表示される", () => {
      mockStoreState.meta.title = "";
      render(<ProjectInfo />);

      expect(
        screen.getByRole("button", { name: DEFAULT_PROJECT_TITLE })
      ).toBeInTheDocument();
    });

    it("クリックで編集モードに切り替わる", async () => {
      const user = userEvent.setup();
      render(<ProjectInfo />);

      await user.click(
        screen.getByRole("button", { name: "テストプロジェクト" })
      );

      expect(screen.getByRole("textbox")).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toHaveValue("テストプロジェクト");
    });

    it("入力後 Enter で確定される", async () => {
      const user = userEvent.setup();
      render(<ProjectInfo />);

      await user.click(
        screen.getByRole("button", { name: "テストプロジェクト" })
      );
      const input = screen.getByRole("textbox");
      await user.clear(input);
      await user.type(input, "新しいタイトル{Enter}");

      expect(mockSetProjectTitle).toHaveBeenCalledWith("新しいタイトル");
    });

    it("Escape で編集がキャンセルされる", async () => {
      const user = userEvent.setup();
      render(<ProjectInfo />);

      await user.click(
        screen.getByRole("button", { name: "テストプロジェクト" })
      );
      const input = screen.getByRole("textbox");
      await user.clear(input);
      await user.type(input, "変更中のタイトル{Escape}");

      // 編集モードが終了し、ボタンに戻る
      expect(
        screen.getByRole("button", { name: "テストプロジェクト" })
      ).toBeInTheDocument();
      // setProjectTitle は呼ばれない
      expect(mockSetProjectTitle).not.toHaveBeenCalled();
    });

    it("blur で確定される", async () => {
      const user = userEvent.setup();
      render(<ProjectInfo />);

      await user.click(
        screen.getByRole("button", { name: "テストプロジェクト" })
      );
      const input = screen.getByRole("textbox");
      await user.clear(input);
      await user.type(input, "blurで確定");
      await user.tab(); // フォーカスを外す

      expect(mockSetProjectTitle).toHaveBeenCalledWith("blurで確定");
    });
  });

  describe('モバイル版（variant="mobile"）', () => {
    it("プロジェクト名ボタンが表示される", () => {
      render(<ProjectInfo variant="mobile" />);

      expect(
        screen.getByRole("button", { name: "テストプロジェクト" })
      ).toBeInTheDocument();
    });

    it("タイトルが空の場合デフォルトタイトルが表示される", () => {
      mockStoreState.meta.title = "";
      render(<ProjectInfo variant="mobile" />);

      expect(
        screen.getByRole("button", { name: DEFAULT_PROJECT_TITLE })
      ).toBeInTheDocument();
    });

    it("タップで編集モードに切り替わる", async () => {
      const user = userEvent.setup();
      render(<ProjectInfo variant="mobile" />);

      await user.click(
        screen.getByRole("button", { name: "テストプロジェクト" })
      );

      expect(screen.getByRole("textbox")).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toHaveValue("テストプロジェクト");
    });

    it("入力後 Enter で確定される", async () => {
      const user = userEvent.setup();
      render(<ProjectInfo variant="mobile" />);

      await user.click(
        screen.getByRole("button", { name: "テストプロジェクト" })
      );
      const input = screen.getByRole("textbox");
      await user.clear(input);
      await user.type(input, "モバイルで変更{Enter}");

      expect(mockSetProjectTitle).toHaveBeenCalledWith("モバイルで変更");
    });

    it("Escape で編集がキャンセルされる", async () => {
      const user = userEvent.setup();
      render(<ProjectInfo variant="mobile" />);

      await user.click(
        screen.getByRole("button", { name: "テストプロジェクト" })
      );
      const input = screen.getByRole("textbox");
      await user.clear(input);
      await user.type(input, "キャンセルテスト{Escape}");

      expect(
        screen.getByRole("button", { name: "テストプロジェクト" })
      ).toBeInTheDocument();
      expect(mockSetProjectTitle).not.toHaveBeenCalled();
    });

    it("blur で確定される", async () => {
      const user = userEvent.setup();
      render(<ProjectInfo variant="mobile" />);

      await user.click(
        screen.getByRole("button", { name: "テストプロジェクト" })
      );
      const input = screen.getByRole("textbox");
      await user.clear(input);
      await user.type(input, "モバイルblur確定");
      await user.tab();

      expect(mockSetProjectTitle).toHaveBeenCalledWith("モバイルblur確定");
    });
  });
});

// ============================================================
// EditorHeader 統合テスト
// ============================================================

describe("EditorHeader", () => {
  describe("基本レンダリング", () => {
    it("ホームリンクが表示される", () => {
      render(<EditorHeader />);

      const homeLink = screen.getByRole("link", { name: "リハぐり" });
      expect(homeLink).toBeInTheDocument();
      expect(homeLink).toHaveAttribute("href", "/");
      expect(homeLink).toHaveAttribute("title", HOME_LINK_TOOLTIP);
    });

    it("プロジェクト名が表示される", () => {
      render(<EditorHeader />);

      expect(
        screen.getByRole("button", { name: "テストプロジェクト" })
      ).toBeInTheDocument();
    });

    it("グリッド選択ボタンが表示される", () => {
      render(<EditorHeader />);

      expect(
        screen.getByRole("button", {
          name: new RegExp(GRID_SELECT_BUTTON_LABEL),
        })
      ).toBeInTheDocument();
    });

    it("テンプレートボタンが表示される", () => {
      render(<EditorHeader />);

      expect(
        screen.getByRole("button", { name: new RegExp(TEMPLATE_BUTTON_LABEL) })
      ).toBeInTheDocument();
    });

    it("開くボタンが表示される", () => {
      render(<EditorHeader />);

      expect(
        screen.getByRole("button", { name: new RegExp(IMPORT_OPEN_LABEL) })
      ).toBeInTheDocument();
    });

    it("バックアップボタンが表示される", () => {
      render(<EditorHeader />);

      expect(
        screen.getByRole("button", { name: new RegExp(BUTTON_BACKUP) })
      ).toBeInTheDocument();
    });

    it("PDFボタンが表示される", () => {
      render(<EditorHeader />);

      expect(
        screen.getByRole("button", { name: new RegExp(PDF_MENU_LABEL) })
      ).toBeInTheDocument();
    });

    it("削除ボタンが表示される", () => {
      render(<EditorHeader />);

      expect(
        screen.getByRole("button", { name: PROJECT_DELETE_TOOLTIP })
      ).toBeInTheDocument();
    });
  });

  describe("グリッド選択", () => {
    it("グリッド選択ボタンをクリックするとダイアログが表示される", async () => {
      const user = userEvent.setup();
      render(<EditorHeader />);

      await user.click(
        screen.getByRole("button", {
          name: new RegExp(GRID_SELECT_BUTTON_LABEL),
        })
      );

      expect(screen.getByTestId("grid-select-dialog")).toBeInTheDocument();
    });

    it("グリッド選択で setLayoutType が呼ばれる", async () => {
      const user = userEvent.setup();
      render(<EditorHeader />);

      await user.click(
        screen.getByRole("button", {
          name: new RegExp(GRID_SELECT_BUTTON_LABEL),
        })
      );
      await user.click(screen.getByRole("button", { name: "grid3を選択" }));

      expect(mockSetLayoutType).toHaveBeenCalledWith("grid3");
    });
  });

  describe("テンプレート選択", () => {
    it("テンプレートボタンをクリックするとモーダルが表示される", async () => {
      const user = userEvent.setup();
      render(<EditorHeader />);

      await user.click(
        screen.getByRole("button", { name: new RegExp(TEMPLATE_BUTTON_LABEL) })
      );

      expect(screen.getByTestId("template-select-modal")).toBeInTheDocument();
    });
  });

  describe("プロジェクト削除", () => {
    it("削除ボタンをクリックすると確認ダイアログが表示される", async () => {
      const user = userEvent.setup();
      render(<EditorHeader />);

      await user.click(
        screen.getByRole("button", { name: PROJECT_DELETE_TOOLTIP })
      );

      expect(
        screen.getByText(PROJECT_DELETE_CONFIRM_TITLE)
      ).toBeInTheDocument();
      expect(
        screen.getByText(PROJECT_DELETE_CONFIRM_DESCRIPTION)
      ).toBeInTheDocument();
    });

    it("確認ダイアログで「削除」をクリックすると deleteProject が呼ばれる", async () => {
      const user = userEvent.setup();
      render(<EditorHeader />);

      await user.click(
        screen.getByRole("button", { name: PROJECT_DELETE_TOOLTIP })
      );
      await user.click(screen.getByRole("button", { name: BUTTON_DELETE }));

      await waitFor(() => {
        expect(mockDeleteProject).toHaveBeenCalledTimes(1);
      });
      expect(mockToastSuccess).toHaveBeenCalledWith(
        PROJECT_DELETE_SUCCESS_MESSAGE
      );
    });

    it("確認ダイアログで「キャンセル」をクリックするとダイアログが閉じる", async () => {
      const user = userEvent.setup();
      render(<EditorHeader />);

      await user.click(
        screen.getByRole("button", { name: PROJECT_DELETE_TOOLTIP })
      );
      await user.click(screen.getByRole("button", { name: BUTTON_CANCEL }));

      await waitFor(() => {
        expect(
          screen.queryByText(PROJECT_DELETE_CONFIRM_TITLE)
        ).not.toBeInTheDocument();
      });
      expect(mockDeleteProject).not.toHaveBeenCalled();
    });
  });

  describe("アイテムがある場合のPDFボタン状態", () => {
    it("アイテムがない場合 PDFボタンが無効になる", () => {
      mockStoreState.items = [];
      render(<EditorHeader />);

      const pdfButton = screen.getByRole("button", {
        name: new RegExp(PDF_MENU_LABEL),
      });
      expect(pdfButton).toBeDisabled();
    });

    it("アイテムがある場合 PDFボタンが有効になる", () => {
      mockStoreState.items = [createTestItem()];
      render(<EditorHeader />);

      const pdfButton = screen.getByRole("button", {
        name: new RegExp(PDF_MENU_LABEL),
      });
      expect(pdfButton).not.toBeDisabled();
    });
  });
});
