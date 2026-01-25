import {
  GRID_SELECT_MODAL_DESCRIPTION,
  GRID_SELECT_MODAL_TITLE,
  LAYOUT_OPTIONS,
} from "@rehab-grid/core/lib/constants";
import { type LayoutType } from "@rehab-grid/core/types";
import { GridSelectDialog } from "@rehab-grid/ui/components/editor/GridSelectDialog";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

/**
 * GridSelectDialog の Props 型定義（テスト用）
 */
type GridSelectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layoutType: LayoutType;
  onLayoutChange: (layout: LayoutType) => void;
};

/**
 * デフォルトの props を生成
 */
function createDefaultProps(): GridSelectDialogProps {
  return {
    open: true,
    onOpenChange: vi.fn(),
    layoutType: "grid2",
    onLayoutChange: vi.fn(),
  };
}

/**
 * GridSelectDialog のセットアップヘルパー
 *
 * テストごとに props を組み立てる重複を減らし、Arrange/Act/Assert を明確にする。
 */
function setupDialog(
  overrides: Partial<GridSelectDialogProps> = {}
): GridSelectDialogProps {
  const props = { ...createDefaultProps(), ...overrides };
  render(<GridSelectDialog {...props} />);
  return props;
}

describe("GridSelectDialog", () => {
  describe("モーダル表示", () => {
    it("open=true のときタイトルと説明が表示される", () => {
      setupDialog({ open: true });

      expect(screen.getByText(GRID_SELECT_MODAL_TITLE)).toBeInTheDocument();
      expect(
        screen.getByText(GRID_SELECT_MODAL_DESCRIPTION)
      ).toBeInTheDocument();
    });

    it("open=false のときモーダルが表示されない", () => {
      setupDialog({ open: false });

      expect(
        screen.queryByText(GRID_SELECT_MODAL_TITLE)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(GRID_SELECT_MODAL_DESCRIPTION)
      ).not.toBeInTheDocument();
    });
  });

  describe("レイアウトオプション表示", () => {
    it("4つのレイアウトオプションがすべて表示される", () => {
      setupDialog();

      LAYOUT_OPTIONS.forEach((option) => {
        expect(
          screen.getByRole("button", { name: option.label })
        ).toBeInTheDocument();
      });
    });

    it("各オプションがボタンとして操作可能", () => {
      setupDialog();

      LAYOUT_OPTIONS.forEach((option) => {
        const button = screen.getByRole("button", { name: option.label });
        expect(button).toBeEnabled();
      });
    });
  });

  describe("選択状態", () => {
    it.each(LAYOUT_OPTIONS)(
      "layoutType=$id のとき「$label」が選択状態になる",
      ({ id, label }) => {
        setupDialog({ layoutType: id });

        const selectedButton = screen.getByRole("button", { name: label });
        // 選択状態はボタンのスタイルで表現される（orange系のクラス）
        expect(selectedButton).toHaveClass("border-orange-500");
      }
    );

    it("選択されていないオプションは非選択状態のスタイルを持つ", () => {
      setupDialog({ layoutType: "grid1" });

      // grid1以外のオプションを確認
      const otherOptions = LAYOUT_OPTIONS.filter(
        (option) => option.id !== "grid1"
      );
      otherOptions.forEach((option) => {
        const button = screen.getByRole("button", { name: option.label });
        expect(button).not.toHaveClass("border-orange-500");
        expect(button).toHaveClass("border-border");
      });
    });
  });

  describe("レイアウト選択操作", () => {
    it.each(LAYOUT_OPTIONS)(
      "「$label」をクリックすると onLayoutChange($id) が呼ばれる",
      async ({ id, label }) => {
        const user = userEvent.setup();
        const props = setupDialog({ layoutType: "grid2" });

        const button = screen.getByRole("button", { name: label });
        await user.click(button);

        expect(props.onLayoutChange).toHaveBeenCalledWith(id);
      }
    );

    it("オプションをクリックすると onOpenChange(false) が呼ばれてモーダルが閉じる", async () => {
      const user = userEvent.setup();
      const props = setupDialog();

      const button = screen.getByRole("button", { name: "1列" });
      await user.click(button);

      expect(props.onOpenChange).toHaveBeenCalledWith(false);
    });

    it("同じレイアウトをクリックしても onLayoutChange と onOpenChange が呼ばれる", async () => {
      const user = userEvent.setup();
      const props = setupDialog({ layoutType: "grid2" });

      const button = screen.getByRole("button", { name: "2列" });
      await user.click(button);

      expect(props.onLayoutChange).toHaveBeenCalledWith("grid2");
      expect(props.onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
