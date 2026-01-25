import { MobileDropdownMenu } from "@rehab-grid/ui/components/layout/MobileDropdownMenu";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * MobileDropdownMenu のデフォルト props を生成
 */
type MobileDropdownMenuProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

/**
 * デフォルトのpropsを生成
 */
function createDefaultProps(): MobileDropdownMenuProps {
  return {
    open: true,
    onClose: vi.fn(),
    title: "テストメニュー",
    children: <div>テストコンテンツ</div>,
  };
}

/**
 * MobileDropdownMenu のセットアップヘルパー
 *
 * テストごとに props を組み立てる重複を減らし、Arrange/Act/Assert を明確にする。
 */
function setupMenu(
  overrides: Partial<MobileDropdownMenuProps> = {}
): MobileDropdownMenuProps {
  const props = { ...createDefaultProps(), ...overrides };
  render(<MobileDropdownMenu {...props} />);
  return props;
}

describe("MobileDropdownMenu", () => {
  describe("描画・開閉状態", () => {
    it("open=false のとき何も表示されない", () => {
      setupMenu({ open: false });

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("open=true のときダイアログが表示される", () => {
      setupMenu({ open: true });

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("タイトルが正しく表示される", () => {
      setupMenu({ title: "設定メニュー" });

      expect(screen.getByText("設定メニュー")).toBeInTheDocument();
    });

    it("children が正しくレンダリングされる", () => {
      setupMenu({
        children: (
          <div>
            <button type="button">メニュー項目1</button>
            <button type="button">メニュー項目2</button>
          </div>
        ),
      });

      expect(
        screen.getByRole("button", { name: "メニュー項目1" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "メニュー項目2" })
      ).toBeInTheDocument();
    });
  });

  describe("アクセシビリティ", () => {
    it("role=dialog が存在する", () => {
      setupMenu();

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
    });

    it("aria-modal=true が設定されている", () => {
      setupMenu();

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
    });

    it("aria-labelledby がタイトル要素を参照している", () => {
      setupMenu({ title: "メニュータイトル" });

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute(
        "aria-labelledby",
        "mobile-dropdown-menu-title"
      );

      // タイトルが正しく表示されていることを確認
      const heading = screen.getByRole("heading", { name: "メニュータイトル" });
      expect(heading).toHaveAttribute("id", "mobile-dropdown-menu-title");
    });

    it("閉じるボタンに aria-label=メニューを閉じる がある", () => {
      setupMenu();

      const closeButton = screen.getByRole("button", {
        name: "メニューを閉じる",
      });
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe("閉じる動作", () => {
    it("オーバーレイクリックで閉じるアニメーションが開始される", async () => {
      const user = userEvent.setup();
      const props = setupMenu();

      const overlay = screen.getByTestId("mobile-dropdown-menu-overlay");
      await user.click(overlay);

      // クリック直後は onClose はまだ呼ばれない（アニメーション中）
      expect(props.onClose).not.toHaveBeenCalled();

      // メニュー本体に閉じるアニメーションクラスが適用されている
      const menuBody = screen.getByTestId("mobile-dropdown-menu-body");
      expect(menuBody).toHaveClass("animate-menu-slide-up");
    });

    it("閉じるボタンクリックで閉じるアニメーションが開始される", async () => {
      const user = userEvent.setup();
      const props = setupMenu();

      const closeButton = screen.getByRole("button", {
        name: "メニューを閉じる",
      });
      await user.click(closeButton);

      // クリック直後は onClose はまだ呼ばれない（アニメーション中）
      expect(props.onClose).not.toHaveBeenCalled();

      // メニュー本体に閉じるアニメーションクラスが適用されている
      const menuBody = screen.getByTestId("mobile-dropdown-menu-body");
      expect(menuBody).toHaveClass("animate-menu-slide-up");
    });

    it("メニュー本体クリックでイベント伝播が停止される", async () => {
      const user = userEvent.setup();
      const props = setupMenu();

      const menuBody = screen.getByTestId("mobile-dropdown-menu-body");
      await user.click(menuBody);

      // メニュー本体をクリックしても閉じるアニメーションは開始されない
      expect(menuBody).not.toHaveClass("animate-menu-slide-up");
      expect(menuBody).toHaveClass("animate-menu-slide-down");
      expect(props.onClose).not.toHaveBeenCalled();
    });

    it("アニメーション終了後に onClose が呼ばれる", async () => {
      const user = userEvent.setup();
      const props = setupMenu();

      const closeButton = screen.getByRole("button", {
        name: "メニューを閉じる",
      });
      await user.click(closeButton);

      // アニメーション終了イベントを発火
      const menuBody = screen.getByTestId("mobile-dropdown-menu-body");
      fireEvent.animationEnd(menuBody);

      expect(props.onClose).toHaveBeenCalledTimes(1);
    });

    it("バブリングしたアニメーション終了イベントでは onClose が呼ばれない", async () => {
      const user = userEvent.setup();
      const props = setupMenu({
        children: <div data-testid="inner-animated-element">内部要素</div>,
      });

      const closeButton = screen.getByRole("button", {
        name: "メニューを閉じる",
      });
      await user.click(closeButton);

      // 内部要素からバブリングしたアニメーション終了イベント
      const innerElement = screen.getByTestId("inner-animated-element");
      const menuBody = screen.getByTestId("mobile-dropdown-menu-body");

      // target と currentTarget が異なるイベントをシミュレート
      fireEvent.animationEnd(menuBody, {
        target: innerElement,
        currentTarget: menuBody,
      });

      // バブリングしたイベントでは onClose は呼ばれない
      expect(props.onClose).not.toHaveBeenCalled();
    });

    describe("フォールバックタイマー", () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it("400ms 後に onClose が呼ばれる", () => {
        const props = setupMenu();

        // fireEvent を使用（userEvent は fake timers と競合するため）
        const closeButton = screen.getByRole("button", {
          name: "メニューを閉じる",
        });
        fireEvent.click(closeButton);

        // 399ms では呼ばれない
        act(() => {
          vi.advanceTimersByTime(399);
        });
        expect(props.onClose).not.toHaveBeenCalled();

        // 400ms で呼ばれる
        act(() => {
          vi.advanceTimersByTime(1);
        });
        expect(props.onClose).toHaveBeenCalledTimes(1);
      });

      it("アニメーション終了が先に発火した場合、タイマーはキャンセルされる", () => {
        const props = setupMenu();

        // fireEvent を使用（userEvent は fake timers と競合するため）
        const closeButton = screen.getByRole("button", {
          name: "メニューを閉じる",
        });
        fireEvent.click(closeButton);

        // アニメーション終了イベントを発火
        const menuBody = screen.getByTestId("mobile-dropdown-menu-body");
        fireEvent.animationEnd(menuBody);

        expect(props.onClose).toHaveBeenCalledTimes(1);

        // タイマーが進んでも追加で呼ばれない（コンポーネントがアンマウントされるため）
        act(() => {
          vi.advanceTimersByTime(500);
        });
        expect(props.onClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("アニメーション状態", () => {
    it("閉じるアニメーション中はオーバーレイに opacity-0 クラスが付与される", async () => {
      const user = userEvent.setup();
      setupMenu();

      const overlay = screen.getByTestId("mobile-dropdown-menu-overlay");

      // 初期状態では opacity-0 がない
      expect(overlay).not.toHaveClass("opacity-0");

      // 閉じるボタンをクリック
      const closeButton = screen.getByRole("button", {
        name: "メニューを閉じる",
      });
      await user.click(closeButton);

      // opacity-0 が付与される
      expect(overlay).toHaveClass("opacity-0");
    });

    it("閉じるアニメーション中はメニュー本体に animate-menu-slide-up クラスが付与される", async () => {
      const user = userEvent.setup();
      setupMenu();

      const menuBody = screen.getByTestId("mobile-dropdown-menu-body");

      // 初期状態では animate-menu-slide-down
      expect(menuBody).toHaveClass("animate-menu-slide-down");
      expect(menuBody).not.toHaveClass("animate-menu-slide-up");

      // 閉じるボタンをクリック
      const closeButton = screen.getByRole("button", {
        name: "メニューを閉じる",
      });
      await user.click(closeButton);

      // animate-menu-slide-up が付与される
      expect(menuBody).toHaveClass("animate-menu-slide-up");
      expect(menuBody).not.toHaveClass("animate-menu-slide-down");
    });
  });

  describe("再レンダリング", () => {
    it("open が false から true に変わったとき、メニューが表示される", () => {
      const props = createDefaultProps();
      const { rerender } = render(
        <MobileDropdownMenu {...props} open={false} />
      );

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      rerender(<MobileDropdownMenu {...props} open />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });
});
