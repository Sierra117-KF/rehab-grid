import { REDO_LABEL, UNDO_LABEL } from "@rehab-grid/core/lib/constants";
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
    layoutType: "grid2" as const,
    onGridSelectClick: vi.fn(),
    onTemplateClick: vi.fn(),
    onOpenClick: vi.fn(),
    isImporting: false,
    onExportJSON: vi.fn(),
    onExportZIP: vi.fn(),
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
});
