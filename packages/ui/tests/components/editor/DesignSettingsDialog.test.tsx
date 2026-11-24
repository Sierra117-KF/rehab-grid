import {
  BUTTON_CLOSE,
  DESIGN_SETTINGS_DESCRIPTION,
  DESIGN_SETTINGS_LABEL,
  THEME_COLOR_HEX_INVALID_MESSAGE,
  THEME_COLOR_HEX_LABEL,
  THEME_COLOR_PICKER_LABEL,
} from "@rehab-grid/core/lib/constants";
import { type ResolvedProjectSettings } from "@rehab-grid/core/types";
import { DesignSettingsDialog } from "@rehab-grid/ui/components/editor/DesignSettingsDialog";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

/**
 * DesignSettingsDialog をレンダリングし、コールバックと再描画関数を返す
 */
function setupDialog(settings: Partial<ResolvedProjectSettings> = {}) {
  const props = {
    open: true,
    onOpenChange: vi.fn(),
    settings: { layoutType: "grid2" as const, themeColor: "#3b82f6", ...settings },
    onLayoutChange: vi.fn(),
    onThemeColorChange: vi.fn(),
  };
  const { rerender } = render(<DesignSettingsDialog {...props} />);
  return {
    props,
    rerenderWith: (next: Partial<ResolvedProjectSettings>) =>
      rerender(
        <DesignSettingsDialog
          {...props}
          settings={{ ...props.settings, ...next }}
        />
      ),
  };
}

/** カラーコード入力欄を取得 */
function getHexInput() {
  return screen.getByRole("textbox", { name: THEME_COLOR_HEX_LABEL });
}

describe("DesignSettingsDialog", () => {
  it("タイトル・説明・各セクションが表示される", () => {
    setupDialog();

    expect(
      screen.getByRole("heading", { name: DESIGN_SETTINGS_LABEL })
    ).toBeInTheDocument();
    expect(screen.getByText(DESIGN_SETTINGS_DESCRIPTION)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "列数" })).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "テーマカラー" })
    ).toBeInTheDocument();
  });

  it("open=false のときは表示されない", () => {
    render(
      <DesignSettingsDialog
        open={false}
        onOpenChange={vi.fn()}
        settings={{ layoutType: "grid2", themeColor: "#3b82f6" }}
        onLayoutChange={vi.fn()}
        onThemeColorChange={vi.fn()}
      />
    );

    expect(screen.queryByText(DESIGN_SETTINGS_LABEL)).not.toBeInTheDocument();
  });

  describe("列数", () => {
    it("現在の列数が選択状態になる", () => {
      setupDialog({ layoutType: "grid3" });

      expect(screen.getByRole("button", { name: "3列" })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
      expect(screen.getByRole("button", { name: "2列" })).toHaveAttribute(
        "aria-pressed",
        "false"
      );
    });

    it("列数を選ぶと onLayoutChange が呼ばれ、ダイアログは閉じない", async () => {
      const user = userEvent.setup();
      const { props } = setupDialog();

      await user.click(screen.getByRole("button", { name: "4列" }));

      expect(props.onLayoutChange).toHaveBeenCalledWith("grid4");
      expect(props.onOpenChange).not.toHaveBeenCalled();
    });
  });

  describe("テーマカラー", () => {
    it("プリセットを選ぶと onThemeColorChange が呼ばれる", async () => {
      const user = userEvent.setup();
      const { props } = setupDialog();

      await user.click(screen.getByRole("button", { name: "エメラルド" }));

      expect(props.onThemeColorChange).toHaveBeenCalledWith("#059669");
    });

    it("現在の色のプリセットが選択状態になる（大文字の HEX でも一致する）", () => {
      setupDialog({ themeColor: "#C2410C" });

      expect(screen.getByRole("button", { name: "オレンジ" })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
      expect(getHexInput()).toHaveValue("#c2410c");
    });

    it("カラーピッカーで選んだ色が onThemeColorChange に渡される", () => {
      const { props } = setupDialog();

      fireEvent.input(screen.getByLabelText(THEME_COLOR_PICKER_LABEL), {
        target: { value: "#123456" },
      });

      expect(props.onThemeColorChange).toHaveBeenCalledWith("#123456");
    });

    it("カラーコードは正しい形式になった時点で小文字にして反映する", async () => {
      const user = userEvent.setup();
      const { props } = setupDialog();

      await user.clear(getHexInput());
      await user.type(getHexInput(), "#ABCDE");
      expect(props.onThemeColorChange).not.toHaveBeenCalled();
      expect(screen.getByText(THEME_COLOR_HEX_INVALID_MESSAGE)).toBeInTheDocument();

      await user.type(getHexInput(), "F");
      expect(props.onThemeColorChange).toHaveBeenCalledExactlyOnceWith("#abcdef");
    });

    it("不正なカラーコードのままフォーカスが外れると現在の色に戻る", async () => {
      const user = userEvent.setup();
      setupDialog();

      await user.clear(getHexInput());
      await user.type(getHexInput(), "#12");
      await user.tab();

      expect(getHexInput()).toHaveValue("#3b82f6");
      expect(
        screen.queryByText(THEME_COLOR_HEX_INVALID_MESSAGE)
      ).not.toBeInTheDocument();
    });

    it("外部（Undo 等）で色が変わるとカラーコード欄も追従する", () => {
      const { rerenderWith } = setupDialog();

      rerenderWith({ themeColor: "#7c3aed" });

      expect(getHexInput()).toHaveValue("#7c3aed");
    });
  });

  it("「閉じる」で onOpenChange(false) が呼ばれる", async () => {
    const user = userEvent.setup();
    const { props } = setupDialog();

    await user.click(screen.getByRole("button", { name: BUTTON_CLOSE }));

    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });
});
