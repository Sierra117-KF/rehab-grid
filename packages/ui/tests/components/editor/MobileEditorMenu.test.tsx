import {
  BACKUP_EXPORT_ALL_LABEL,
  BACKUP_MENU_ALL_SECTION,
  BACKUP_MENU_CURRENT_SECTION,
  DESIGN_SETTINGS_LABEL,
  EXERCISE_CARD_ADD_BUTTON_LABEL,
  EXPORT_MENU_LABEL,
  IMPORT_LOADING_LABEL,
  IMPORT_OPEN_DESCRIPTION,
  IMPORT_OPEN_LABEL,
  PROJECT_LIST_LABEL,
  REDO_LABEL,
  UNDO_LABEL,
} from "@rehab-grid/core/lib/constants";
import { type LayoutType } from "@rehab-grid/core/types";
import { MobileEditorMenu } from "@rehab-grid/ui/components/editor/EditorHeader/MobileEditorMenu";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

/**
 * MobileEditorMenu をレンダリングし、コールバックを返す
 */
function setupMenu({
  canUndo = false,
  canRedo = false,
  layoutType = "grid2",
  isImporting = false,
}: {
  canUndo?: boolean;
  canRedo?: boolean;
  layoutType?: LayoutType;
  isImporting?: boolean;
} = {}) {
  const props = {
    canUndo,
    canRedo,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onProjectListClick: vi.fn(),
    layoutType,
    onDesignSettingsClick: vi.fn(),
    onTemplateClick: vi.fn(),
    onExerciseCardsClick: vi.fn(),
    onOpenClick: vi.fn(),
    isImporting,
    onExportJSON: vi.fn(),
    onExportZIP: vi.fn(),
    onExportBackup: vi.fn(),
    onDeleteProject: vi.fn(),
    onClose: vi.fn(),
  };
  render(<MobileEditorMenu {...props} />);
  return props;
}

describe("MobileEditorMenu", () => {
  describe("元に戻す / やり直す", () => {
    it("履歴がないときは無効になる", () => {
      setupMenu();

      expect(screen.getByRole("button", { name: UNDO_LABEL })).toBeDisabled();
      expect(screen.getByRole("button", { name: REDO_LABEL })).toBeDisabled();
    });

    it("「元に戻す」でメニューを閉じて onUndo を呼ぶ", async () => {
      const user = userEvent.setup();
      const props = setupMenu({ canUndo: true });

      await user.click(screen.getByRole("button", { name: UNDO_LABEL }));

      expect(props.onClose).toHaveBeenCalledTimes(1);
      expect(props.onUndo).toHaveBeenCalledTimes(1);
      expect(props.onRedo).not.toHaveBeenCalled();
    });

    it("「やり直す」でメニューを閉じて onRedo を呼ぶ", async () => {
      const user = userEvent.setup();
      const props = setupMenu({ canRedo: true });

      await user.click(screen.getByRole("button", { name: REDO_LABEL }));

      expect(props.onClose).toHaveBeenCalledTimes(1);
      expect(props.onRedo).toHaveBeenCalledTimes(1);
    });
  });

  describe("マイ指導箋", () => {
    it("押すとメニューを閉じて指導箋一覧を開く", async () => {
      const user = userEvent.setup();
      const props = setupMenu();

      await user.click(
        screen.getByRole("button", { name: PROJECT_LIST_LABEL })
      );

      expect(props.onClose).toHaveBeenCalledTimes(1);
      expect(props.onProjectListClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("マイ運動から追加", () => {
    it("押すとメニューを閉じてマイ運動を開く", async () => {
      const user = userEvent.setup();
      const props = setupMenu();

      await user.click(
        screen.getByRole("button", { name: EXERCISE_CARD_ADD_BUTTON_LABEL })
      );

      expect(props.onClose).toHaveBeenCalledTimes(1);
      expect(props.onExerciseCardsClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("デザイン設定", () => {
    it("現在の列数を表示し、押すとメニューを閉じてダイアログを開く", async () => {
      const user = userEvent.setup();
      const props = setupMenu();

      const button = screen.getByRole("button", {
        name: new RegExp(DESIGN_SETTINGS_LABEL),
      });
      expect(button).toHaveTextContent("2列");
      await user.click(button);

      expect(props.onClose).toHaveBeenCalledTimes(1);
      expect(props.onDesignSettingsClick).toHaveBeenCalledTimes(1);
    });

    it("スライドのときは「スライド」と表示する（列数ではない）", () => {
      setupMenu({ layoutType: "slide" });

      const button = screen.getByRole("button", {
        name: new RegExp(DESIGN_SETTINGS_LABEL),
      });
      expect(button).toHaveTextContent("スライド");
      expect(button).not.toHaveTextContent("1列");
    });
  });

  describe("書き出し・読み込み", () => {
    it("書き出しを展開すると「この指導箋」と「全データ」の見出しを表示し aria-expanded が切り替わる", async () => {
      const user = userEvent.setup();
      setupMenu();

      const exportButton = screen.getByRole("button", {
        name: EXPORT_MENU_LABEL,
      });
      expect(exportButton).toHaveAttribute("aria-expanded", "false");

      await user.click(exportButton);

      expect(exportButton).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByText(BACKUP_MENU_CURRENT_SECTION)).toBeInTheDocument();
      expect(screen.getByText(BACKUP_MENU_ALL_SECTION)).toBeInTheDocument();
    });

    it("書き出しを展開して「まとめてバックアップ（ZIP）」を押すと onExportBackup を呼ぶ", async () => {
      const user = userEvent.setup();
      const props = setupMenu();

      await user.click(screen.getByRole("button", { name: EXPORT_MENU_LABEL }));
      await user.click(
        screen.getByRole("button", { name: BACKUP_EXPORT_ALL_LABEL })
      );

      expect(props.onClose).toHaveBeenCalledTimes(1);
      expect(props.onExportBackup).toHaveBeenCalledTimes(1);
    });

    it("書き出しを展開しても復元（読み込み）の項目は表示しない", async () => {
      const user = userEvent.setup();
      setupMenu();

      await user.click(screen.getByRole("button", { name: EXPORT_MENU_LABEL }));

      expect(screen.queryByText(/復元/)).not.toBeInTheDocument();
    });

    it("「読み込み」に補足テキストが表示され、押すとメニューを閉じて onOpenClick を呼ぶ", async () => {
      const user = userEvent.setup();
      const props = setupMenu();

      const openButton = screen.getByRole("button", {
        name: new RegExp(IMPORT_OPEN_LABEL),
      });
      expect(openButton).toHaveTextContent(IMPORT_OPEN_DESCRIPTION);
      await user.click(openButton);

      expect(props.onClose).toHaveBeenCalledTimes(1);
      expect(props.onOpenClick).toHaveBeenCalledTimes(1);
    });

    it("読み込み中は「読み込み中...」を表示して無効化される", () => {
      setupMenu({ isImporting: true });

      expect(
        screen.getByRole("button", { name: new RegExp(IMPORT_LOADING_LABEL) })
      ).toBeDisabled();
    });
  });
});
