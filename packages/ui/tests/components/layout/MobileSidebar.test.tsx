import { MobileSidebar } from "@rehab-grid/ui/components/layout/MobileSidebar";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

/**
 * MobileSidebar の Props 型
 */
type MobileSidebarProps = {
  open: boolean;
  onClose: () => void;
  side: "left" | "right";
  title: string;
  children: React.ReactNode;
};

/**
 * デフォルトのpropsを生成
 */
function createDefaultProps(): MobileSidebarProps {
  return {
    open: true,
    onClose: vi.fn(),
    side: "left",
    title: "テストサイドバー",
    children: <div>テストコンテンツ</div>,
  };
}

/**
 * MobileSidebar のセットアップヘルパー
 *
 * テストごとに props を組み立てる重複を減らし、Arrange/Act/Assert を明確にする。
 */
function setupMobileSidebar(
  overrides: Partial<MobileSidebarProps> = {}
): MobileSidebarProps {
  const props = { ...createDefaultProps(), ...overrides };
  render(<MobileSidebar {...props} />);
  return props;
}

/**
 * サイドバー本体（アニメーション対象）要素を取得するヘルパー
 */
function getSidebarBody(): HTMLElement {
  return screen.getByTestId("mobile-sidebar-body");
}

/**
 * オーバーレイ要素を取得するヘルパー
 */
function getOverlay(): HTMLElement {
  return screen.getByTestId("mobile-sidebar-overlay");
}

describe("MobileSidebar", () => {
  describe("表示/非表示", () => {
    it("open=false のとき何も表示されない", () => {
      setupMobileSidebar({ open: false });

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("open=true のときダイアログが表示される", () => {
      setupMobileSidebar({ open: true });

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("タイトル表示", () => {
    it("渡された title がヘッダーに表示される", () => {
      setupMobileSidebar({ title: "画像ライブラリ" });

      expect(
        screen.getByRole("heading", { name: "画像ライブラリ" })
      ).toBeInTheDocument();
    });
  });

  describe("children表示", () => {
    it("渡された children がコンテンツエリアに表示される", () => {
      setupMobileSidebar({
        children: <p>カスタムコンテンツ</p>,
      });

      expect(screen.getByText("カスタムコンテンツ")).toBeInTheDocument();
    });
  });

  describe("閉じる機能", () => {
    it("閉じるボタンクリック後、アニメーション終了時に onClose が呼ばれる", async () => {
      const user = userEvent.setup();
      const props = setupMobileSidebar();

      // 閉じるボタンをクリック
      const closeButton = screen.getByRole("button", {
        name: "サイドバーを閉じる",
      });
      await user.click(closeButton);

      // クリック直後は onClose はまだ呼ばれない（アニメーション中）
      expect(props.onClose).not.toHaveBeenCalled();

      // アニメーション終了をシミュレート
      const sidebarBody = getSidebarBody();
      fireEvent.animationEnd(sidebarBody);

      // アニメーション終了後に onClose が呼ばれる
      expect(props.onClose).toHaveBeenCalledTimes(1);
    });

    it("オーバーレイクリック後、アニメーション終了時に onClose が呼ばれる", async () => {
      const user = userEvent.setup();
      const props = setupMobileSidebar();

      // オーバーレイをクリック
      const overlay = getOverlay();
      await user.click(overlay);

      // クリック直後は onClose はまだ呼ばれない
      expect(props.onClose).not.toHaveBeenCalled();

      // アニメーション終了をシミュレート
      const sidebarBody = getSidebarBody();
      fireEvent.animationEnd(sidebarBody);

      expect(props.onClose).toHaveBeenCalledTimes(1);
    });

    it("閉じるアニメーション開始時にオーバーレイが透明になる", async () => {
      const user = userEvent.setup();
      setupMobileSidebar();

      // 閉じるボタンをクリック
      const closeButton = screen.getByRole("button", {
        name: "サイドバーを閉じる",
      });
      await user.click(closeButton);

      // オーバーレイに opacity-0 クラスが付与される
      const overlay = getOverlay();
      expect(overlay).toHaveClass("opacity-0");
    });
  });

  describe("イベント伝播", () => {
    it("サイドバー本体クリックで onClose が呼ばれない", async () => {
      const user = userEvent.setup();
      const props = setupMobileSidebar();

      // サイドバー本体をクリック
      const sidebarBody = getSidebarBody();
      await user.click(sidebarBody);

      // onClose は呼ばれない（アニメーション終了もトリガーされない）
      expect(props.onClose).not.toHaveBeenCalled();
    });

    it("サイドバー内のコンテンツクリックで onClose が呼ばれない", async () => {
      const user = userEvent.setup();
      const props = setupMobileSidebar({
        children: <button type="button">内部ボタン</button>,
      });

      // サイドバー内のボタンをクリック
      const innerButton = screen.getByRole("button", { name: "内部ボタン" });
      await user.click(innerButton);

      // onClose は呼ばれない
      expect(props.onClose).not.toHaveBeenCalled();
    });
  });

  describe("side プロパティ", () => {
    it("side='left' のとき左端に配置される", () => {
      setupMobileSidebar({ side: "left" });

      const sidebarBody = getSidebarBody();
      expect(sidebarBody).toHaveClass("left-3");
      expect(sidebarBody).not.toHaveClass("right-3");
    });

    it("side='right' のとき右端に配置される", () => {
      setupMobileSidebar({ side: "right" });

      const sidebarBody = getSidebarBody();
      expect(sidebarBody).toHaveClass("right-3");
      expect(sidebarBody).not.toHaveClass("left-3");
    });

    it("side='left' のとき左からのスライドインアニメーションが適用される", () => {
      setupMobileSidebar({ side: "left" });

      const sidebarBody = getSidebarBody();
      expect(sidebarBody).toHaveClass("animate-slide-in-left");
    });

    it("side='right' のとき右からのスライドインアニメーションが適用される", () => {
      setupMobileSidebar({ side: "right" });

      const sidebarBody = getSidebarBody();
      expect(sidebarBody).toHaveClass("animate-slide-in-right");
    });
  });

  describe("アクセシビリティ", () => {
    it("role='dialog' が設定されている", () => {
      setupMobileSidebar();

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("aria-modal='true' が設定されている", () => {
      setupMobileSidebar();

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
    });

    it("aria-labelledby がタイトル要素を参照している", () => {
      setupMobileSidebar({ title: "テストタイトル" });

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-labelledby", "mobile-sidebar-title");

      // aria-labelledby で参照されている要素が存在し、正しいテキストを持つ
      const titleElement = screen.getByRole("heading", { name: "テストタイトル" });
      expect(titleElement).toHaveAttribute("id", "mobile-sidebar-title");
    });

    it("閉じるボタンに aria-label が設定されている", () => {
      setupMobileSidebar();

      const closeButton = screen.getByRole("button", {
        name: "サイドバーを閉じる",
      });
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe("アニメーション状態管理", () => {
    it("閉じるアニメーション中でもダイアログは表示されたままになる", async () => {
      const user = userEvent.setup();
      setupMobileSidebar();

      // 閉じるボタンをクリック（アニメーション開始）
      const closeButton = screen.getByRole("button", {
        name: "サイドバーを閉じる",
      });
      await user.click(closeButton);

      // アニメーション中でもダイアログは表示されている
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("アニメーション終了後に onClose が呼ばれ、親が open=false にすると非表示になる", async () => {
      const user = userEvent.setup();
      const props = setupMobileSidebar();

      // 閉じるボタンをクリック
      const closeButton = screen.getByRole("button", {
        name: "サイドバーを閉じる",
      });
      await user.click(closeButton);

      // アニメーション終了をシミュレート
      const sidebarBody = getSidebarBody();
      fireEvent.animationEnd(sidebarBody);

      // onClose が呼ばれたことを確認
      // 実際の非表示は親コンポーネントが open prop を false に変更することで実現される
      expect(props.onClose).toHaveBeenCalledTimes(1);
    });

    it("閉じるアニメーション中にスライドアウトアニメーションが適用される", async () => {
      const user = userEvent.setup();
      setupMobileSidebar({ side: "left" });

      // 閉じるボタンをクリック
      const closeButton = screen.getByRole("button", {
        name: "サイドバーを閉じる",
      });
      await user.click(closeButton);

      // スライドアウトアニメーションに切り替わる
      const sidebarBody = getSidebarBody();
      expect(sidebarBody).toHaveClass("animate-slide-out-left");
      expect(sidebarBody).not.toHaveClass("animate-slide-in-left");
    });

    it("side='right' の閉じるアニメーション中に右へのスライドアウトが適用される", async () => {
      const user = userEvent.setup();
      setupMobileSidebar({ side: "right" });

      // 閉じるボタンをクリック
      const closeButton = screen.getByRole("button", {
        name: "サイドバーを閉じる",
      });
      await user.click(closeButton);

      const sidebarBody = getSidebarBody();
      expect(sidebarBody).toHaveClass("animate-slide-out-right");
      expect(sidebarBody).not.toHaveClass("animate-slide-in-right");
    });
  });
});
