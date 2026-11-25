import {
  BUTTON_CLOSE,
  CARD_NUMBER_TOGGLE_LABEL,
  DESIGN_SETTINGS_DESCRIPTION,
  DESIGN_SETTINGS_LABEL,
  PAGE_ORIENTATION_NARROW_NOTE,
  PAGE_ORIENTATION_SINGLE_COLUMN_NOTE,
  TEXT_SCALE_SINGLE_COLUMN_NOTE,
  THEME_COLOR_HEX_INVALID_MESSAGE,
  THEME_COLOR_HEX_LABEL,
  THEME_COLOR_PICKER_LABEL,
} from "@rehab-grid/core/lib/constants";
import { resolveProjectSettings } from "@rehab-grid/core/lib/settings";
import { type ResolvedProjectSettings } from "@rehab-grid/core/types";
import { DesignSettingsDialog } from "@rehab-grid/ui/components/editor/DesignSettingsDialog";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

/**
 * DesignSettingsDialog をレンダリングし、コールバックと再描画関数を返す
 */
function setupDialog(settings: Partial<ResolvedProjectSettings> = {}) {
  const props = {
    open: true,
    onOpenChange: vi.fn(),
    settings: { ...resolveProjectSettings(undefined), ...settings },
    onLayoutChange: vi.fn(),
    onThemeColorChange: vi.fn(),
    onSettingsChange: vi.fn(),
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

/** セクション（見出し付きの region）内のボタンを取得 */
function getSectionButton(section: string, name: string | RegExp) {
  return within(screen.getByRole("region", { name: section })).getByRole(
    "button",
    { name }
  );
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
        settings={resolveProjectSettings(undefined)}
        onLayoutChange={vi.fn()}
        onThemeColorChange={vi.fn()}
        onSettingsChange={vi.fn()}
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

  describe("用紙の向き", () => {
    it("向きを選ぶと onSettingsChange に pageOrientation が渡される", async () => {
      const user = userEvent.setup();
      const { props } = setupDialog();

      await user.click(getSectionButton("用紙の向き（PDF）", "横"));

      expect(props.onSettingsChange).toHaveBeenCalledWith({
        pageOrientation: "landscape",
      });
    });

    it("1列のときは横向きを選べず、理由を表示する", () => {
      setupDialog({ layoutType: "grid1" });

      expect(getSectionButton("用紙の向き（PDF）", "横")).toBeDisabled();
      expect(getSectionButton("用紙の向き（PDF）", "縦")).toBeEnabled();
      expect(
        screen.getByText(PAGE_ORIENTATION_SINGLE_COLUMN_NOTE)
      ).toBeInTheDocument();
    });

    it("4列 × 縦向きのときだけ、カードが細くなる注意を表示する", () => {
      const { rerenderWith } = setupDialog({
        layoutType: "grid4",
        pageOrientation: "portrait",
      });
      expect(screen.getByText(PAGE_ORIENTATION_NARROW_NOTE)).toBeInTheDocument();

      rerenderWith({ pageOrientation: "auto" });
      expect(
        screen.queryByText(PAGE_ORIENTATION_NARROW_NOTE)
      ).not.toBeInTheDocument();
    });
  });

  describe("用途別プリセット", () => {
    it("「高齢者向け」で大きめの文字とカード番号をまとめて適用する", async () => {
      const user = userEvent.setup();
      const { props } = setupDialog();

      await user.click(getSectionButton("用途別プリセット", /高齢者向け/));

      expect(props.onSettingsChange).toHaveBeenCalledExactlyOnceWith({
        textScale: "large",
        showCardNumbers: true,
      });
    });

    it("プリセットは列数・テーマカラー・用量ラベルを変えない", async () => {
      const user = userEvent.setup();
      const { props } = setupDialog();

      for (const name of [/標準カラー/, /白黒・インク節約/, /高齢者向け/]) {
        await user.click(getSectionButton("用途別プリセット", name));
      }

      for (const [updates] of props.onSettingsChange.mock.calls as [
        Partial<ResolvedProjectSettings>,
      ][]) {
        expect(updates).not.toHaveProperty("layoutType");
        expect(updates).not.toHaveProperty("themeColor");
        expect(updates).not.toHaveProperty("dosageLabels");
      }
    });

    it("現在の設定と一致するプリセットが選択状態になる", () => {
      setupDialog({ printColorMode: "monochrome" });

      expect(
        getSectionButton("用途別プリセット", /白黒・インク節約/)
      ).toHaveAttribute("aria-pressed", "true");
      expect(getSectionButton("用途別プリセット", /標準カラー/)).toHaveAttribute(
        "aria-pressed",
        "false"
      );
    });
  });

  describe("印刷の色・文字サイズ・カード番号", () => {
    it("白黒を選ぶと printColorMode が渡される", async () => {
      const user = userEvent.setup();
      const { props } = setupDialog();

      await user.click(getSectionButton("印刷の色", "白黒"));

      expect(props.onSettingsChange).toHaveBeenCalledWith({
        printColorMode: "monochrome",
      });
    });

    it("文字サイズ「大きめ」を選ぶと textScale が渡される", async () => {
      const user = userEvent.setup();
      const { props } = setupDialog();

      await user.click(getSectionButton("文字サイズ", "大きめ"));

      expect(props.onSettingsChange).toHaveBeenCalledWith({ textScale: "large" });
    });

    it("1列のときは「1列は常に大きめ」と表示する", () => {
      setupDialog({ layoutType: "grid1" });

      expect(screen.getByText(TEXT_SCALE_SINGLE_COLUMN_NOTE)).toBeInTheDocument();
    });

    it("カード番号のチェックで showCardNumbers を切り替える", async () => {
      const user = userEvent.setup();
      const { props } = setupDialog();

      await user.click(
        screen.getByRole("checkbox", { name: CARD_NUMBER_TOGGLE_LABEL })
      );

      expect(props.onSettingsChange).toHaveBeenCalledWith({
        showCardNumbers: true,
      });
    });
  });

  describe("用量のラベル", () => {
    function getLabelInput(defaultLabel: string) {
      return screen.getByRole("textbox", { name: `「${defaultLabel}」の欄` });
    }

    it("候補を選ぶと、そのキーだけを差し替えた 3 キーの値が渡される", async () => {
      const user = userEvent.setup();
      const { props } = setupDialog();

      await user.click(
        screen.getByRole("button", { name: "「回数」の欄を「秒数」にする" })
      );

      expect(props.onSettingsChange).toHaveBeenCalledWith(
        { dosageLabels: { reps: "秒数", sets: "セット", frequency: "頻度" } },
        undefined
      );
    });

    it("自由入力は入力のたびに、欄ごとの mergeKey 付きで反映する", async () => {
      const user = userEvent.setup();
      const { props } = setupDialog();

      await user.clear(getLabelInput("頻度"));
      await user.type(getLabelInput("頻度"), "強度");

      expect(props.onSettingsChange).toHaveBeenLastCalledWith(
        { dosageLabels: { reps: "回数", sets: "セット", frequency: "強度" } },
        { mergeKey: "settings:dosageLabels:frequency" }
      );
    });

    it("空欄にするとデフォルトのラベルを反映し、入力中は空欄のまま表示する", async () => {
      const user = userEvent.setup();
      const { props, rerenderWith } = setupDialog({
        dosageLabels: { reps: "秒数", sets: "セット", frequency: "頻度" },
      });

      await user.clear(getLabelInput("回数"));

      expect(props.onSettingsChange).toHaveBeenLastCalledWith(
        { dosageLabels: { reps: "回数", sets: "セット", frequency: "頻度" } },
        { mergeKey: "settings:dosageLabels:reps" }
      );
      // 親が反映した値で再描画しても、入力中の空欄は保つ
      rerenderWith({
        dosageLabels: { reps: "回数", sets: "セット", frequency: "頻度" },
      });
      expect(getLabelInput("回数")).toHaveValue("");

      // フォーカスが外れたら反映済みの値を表示する
      await user.tab();
      expect(getLabelInput("回数")).toHaveValue("回数");
    });

    it("外部（Undo・プリセット等）でラベルが変わると入力欄も追従する", () => {
      const { rerenderWith } = setupDialog();

      rerenderWith({
        dosageLabels: { reps: "回数", sets: "左右", frequency: "頻度" },
      });

      expect(getLabelInput("セット")).toHaveValue("左右");
    });
  });

  it("「閉じる」で onOpenChange(false) が呼ばれる", async () => {
    const user = userEvent.setup();
    const { props } = setupDialog();

    await user.click(screen.getByRole("button", { name: BUTTON_CLOSE }));

    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });
});
