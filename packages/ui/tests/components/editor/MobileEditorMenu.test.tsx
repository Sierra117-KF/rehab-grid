import {
  BACKUP_EXPORT_ALL_LABEL,
  BACKUP_MENU_ALL_SECTION,
  BACKUP_MENU_CURRENT_SECTION,
  BACKUP_RESTORE_LABEL,
  BUTTON_BACKUP,
  DESIGN_SETTINGS_LABEL,
  EXERCISE_CARD_ADD_BUTTON_LABEL,
  PROJECT_LIST_LABEL,
  REDO_LABEL,
  UNDO_LABEL,
} from "@rehab-grid/core/lib/constants";
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
function setupMenu({ canUndo = false, canRedo = false } = {}) {
  const props = {
    canUndo,
    canRedo,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onProjectListClick: vi.fn(),
    layoutType: "grid2" as const,
    onDesignSettingsClick: vi.fn(),
    onTemplateClick: vi.fn(),
    onExerciseCardsClick: vi.fn(),
    onOpenClick: vi.fn(),
    isImporting: false,
    onExportJSON: vi.fn(),
    onExportZIP: vi.fn(),
    onExportBackup: vi.fn(),
    onRestoreBackup: vi.fn(),
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
  });

  describe("まとめてバックアップ・復元", () => {
    it("バックアップを展開すると「この指導箋」と「全データ」の見出しを表示する", async () => {
      const user = userEvent.setup();
      setupMenu();

      await user.click(screen.getByRole("button", { name: BUTTON_BACKUP }));

      expect(screen.getByText(BACKUP_MENU_CURRENT_SECTION)).toBeInTheDocument();
      expect(screen.getByText(BACKUP_MENU_ALL_SECTION)).toBeInTheDocument();
    });

    it("バックアップを展開して「まとめてバックアップ（ZIP）」を押すと onExportBackup を呼ぶ", async () => {
      const user = userEvent.setup();
      const props = setupMenu();

      await user.click(screen.getByRole("button", { name: BUTTON_BACKUP }));
      await user.click(
        screen.getByRole("button", { name: BACKUP_EXPORT_ALL_LABEL })
      );

      expect(props.onClose).toHaveBeenCalledTimes(1);
      expect(props.onExportBackup).toHaveBeenCalledTimes(1);
    });

    it("バックアップを展開して「バックアップから復元」を押すと onRestoreBackup を呼ぶ", async () => {
      const user = userEvent.setup();
      const props = setupMenu();

      await user.click(screen.getByRole("button", { name: BUTTON_BACKUP }));
      await user.click(
        screen.getByRole("button", { name: BACKUP_RESTORE_LABEL })
      );

      expect(props.onClose).toHaveBeenCalledTimes(1);
      expect(props.onRestoreBackup).toHaveBeenCalledTimes(1);
    });
  });
});
