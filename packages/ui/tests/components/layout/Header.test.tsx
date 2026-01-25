import { APP_NAME } from "@rehab-grid/core/lib/constants";
import { Header } from "@rehab-grid/ui/components/layout/Header";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

/**
 * next/image のモック
 */
vi.mock("next/image", async () => {
  const { mockNextImage } = await import("@/tests/mocks/next-image");
  return mockNextImage;
});

/**
 * next/navigation のモック
 *
 * @remarks
 * Header コンポーネントが useRouter を使用するため、モックが必要
 */
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

/**
 * useModalStore のモック
 *
 * @remarks
 * vi.hoisted で事前定義することで、vi.mock 内から参照可能にする
 */
const { mockTryNavigateToEditor } = vi.hoisted(() => ({
  mockTryNavigateToEditor: vi.fn(),
}));

vi.mock("@/lib/store/useModalStore", () => ({
  useModalStore: () => ({
    tryNavigateToEditor: mockTryNavigateToEditor,
  }),
}));

/**
 * Header コンポーネントをレンダリングするヘルパー
 */
function renderHeader() {
  render(<Header />);
}

describe("Header", () => {
  beforeEach(() => {
    mockTryNavigateToEditor.mockClear();
  });

  describe("表示", () => {
    it("アプリ名が表示される", () => {
      renderHeader();

      // デスクトップとモバイルの両方にアプリ名が表示される
      const appNames = screen.getAllByText(APP_NAME);
      expect(appNames.length).toBeGreaterThanOrEqual(1);
    });

    it("ロゴリンクがトップページへのリンクを持つ", () => {
      renderHeader();

      // ロゴリンクを取得（デスクトップとモバイルの両方）
      const logoLinks = screen.getAllByRole("link", {
        name: new RegExp(APP_NAME),
      });
      expect(logoLinks.length).toBeGreaterThanOrEqual(1);

      // すべてのロゴリンクがトップページへのhrefを持つ
      logoLinks.forEach((link) => {
        expect(link).toHaveAttribute("href", "/");
      });
    });

    it("デスクトップナビゲーションリンクが表示される", () => {
      renderHeader();

      expect(
        screen.getByRole("link", { name: "更新履歴" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "利用規約" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "プライバシー" })
      ).toBeInTheDocument();
    });

    it("CTAボタンが表示される", () => {
      renderHeader();

      // デスクトップ用CTAボタン
      const ctaButtons = screen.getAllByRole("button", {
        name: /指導箋を作成/,
      });
      expect(ctaButtons.length).toBeGreaterThanOrEqual(1);
    });

    it("ハンバーガーメニューボタンが表示される", () => {
      renderHeader();

      expect(
        screen.getByRole("button", { name: "メニューを開く" })
      ).toBeInTheDocument();
    });
  });

  describe("ナビゲーション", () => {
    it("ロゴリンクが正しいhrefを持つ", () => {
      renderHeader();

      // デスクトップとモバイルの両方にロゴリンクがある
      const logoLinks = screen.getAllByRole("link", {
        name: new RegExp(APP_NAME),
      });
      expect(logoLinks.length).toBeGreaterThanOrEqual(1);
      logoLinks.forEach((link) => {
        expect(link).toHaveAttribute("href", "/");
      });
    });

    it("更新履歴リンクが正しいhrefを持つ", () => {
      renderHeader();

      const link = screen.getByRole("link", { name: "更新履歴" });
      expect(link).toHaveAttribute("href", "/changelog");
    });

    it("利用規約リンクが正しいhrefを持つ", () => {
      renderHeader();

      const link = screen.getByRole("link", { name: "利用規約" });
      expect(link).toHaveAttribute("href", "/terms");
    });

    it("プライバシーリンクが正しいhrefを持つ", () => {
      renderHeader();

      const link = screen.getByRole("link", { name: "プライバシー" });
      expect(link).toHaveAttribute("href", "/privacy");
    });
  });

  describe("モバイルサイドバー", () => {
    it("ハンバーガーメニュークリックでサイドバーが開く", async () => {
      const user = userEvent.setup();
      renderHeader();

      // 初期状態ではダイアログが表示されていない
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      // ハンバーガーメニューをクリック
      const menuButton = screen.getByRole("button", { name: "メニューを開く" });
      await user.click(menuButton);

      // サイドバー（dialog）が表示される
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("サイドバー内にモバイル用ナビゲーションが表示される", async () => {
      const user = userEvent.setup();
      renderHeader();

      // サイドバーを開く
      await user.click(screen.getByRole("button", { name: "メニューを開く" }));

      // サイドバーの構造を検証
      const dialog = screen.getByRole("dialog");

      // ブランドエリア（アプリ名 + 説明文）
      expect(dialog).toHaveTextContent(APP_NAME);
      expect(dialog).toHaveTextContent("自主トレ指導箋の作成支援");

      // セクションタイトル（英語大文字）
      expect(dialog).toHaveTextContent("Support");
      expect(dialog).toHaveTextContent("Legal");
      expect(dialog).toHaveTextContent("Source");

      // ナビゲーションリンク
      expect(dialog).toHaveTextContent("更新履歴");
      expect(dialog).toHaveTextContent("ご意見箱");
      expect(dialog).toHaveTextContent("プライバシー");
      expect(dialog).toHaveTextContent("利用規約");
      expect(dialog).toHaveTextContent("GitHub");
    });

    it("サイドバー内リンククリックでサイドバーが閉じる", async () => {
      const user = userEvent.setup();
      renderHeader();

      // サイドバーを開く
      await user.click(screen.getByRole("button", { name: "メニューを開く" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // サイドバー内の内部リンク（更新履歴）をクリック
      // getAllByRole で複数のリンクを取得し、サイドバー内のものを選択
      const changelogLinks = screen.getAllByRole("link", { name: "更新履歴" });
      // サイドバー内のリンク（2番目）をクリック
      await user.click(changelogLinks[1]!);

      // アニメーション完了を待ってサイドバーが閉じる
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("サイドバー閉じるボタンをクリックできる", async () => {
      const user = userEvent.setup();
      renderHeader();

      // サイドバーを開く
      await user.click(screen.getByRole("button", { name: "メニューを開く" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // 閉じるボタンが存在し、クリック可能であることを確認
      const closeButton = screen.getByRole("button", {
        name: "サイドバーを閉じる",
      });
      expect(closeButton).toBeInTheDocument();
      await user.click(closeButton);

      // jsdom環境ではCSSアニメーションの animationend イベントが
      // 自動発火しないため、閉じるボタンのクリック動作のみを検証
      // 実際のサイドバー閉じ動作はMobileSidebarのテストまたは
      // ブラウザ環境でのE2Eテストで検証する
    });
  });

  describe("CTAボタン", () => {
    it("デスクトップCTAクリックでtryNavigateToEditorが呼ばれる", async () => {
      const user = userEvent.setup();
      renderHeader();

      // デスクトップ用CTAボタン（最初のもの）をクリック
      const ctaButtons = screen.getAllByRole("button", {
        name: /指導箋を作成/,
      });
      expect(ctaButtons.length).toBeGreaterThan(0);
      await user.click(ctaButtons[0]!);

      expect(mockTryNavigateToEditor).toHaveBeenCalledTimes(1);
    });

    it("モバイルCTAクリックでtryNavigateToEditorが呼ばれる", async () => {
      const user = userEvent.setup();
      renderHeader();

      // サイドバーを開く
      await user.click(screen.getByRole("button", { name: "メニューを開く" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // サイドバー内のCTAボタンをクリック
      // デスクトップ用CTAとモバイル用CTAが両方存在するため、
      // 最後の要素（サイドバー内のCTA）を取得
      const ctaButtons = screen.getAllByRole("button", {
        name: /指導箋を作成/,
      });
      expect(ctaButtons.length).toBeGreaterThan(0);
      const sidebarCta = ctaButtons.at(-1)!;
      await user.click(sidebarCta);

      expect(mockTryNavigateToEditor).toHaveBeenCalled();
    });

    it("モバイルCTAクリック後にサイドバーが閉じる", async () => {
      const user = userEvent.setup();
      renderHeader();

      // サイドバーを開く
      await user.click(screen.getByRole("button", { name: "メニューを開く" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // サイドバー内のCTAボタンをクリック
      const ctaButtonsInSidebar = screen.getAllByRole("button", {
        name: /指導箋を作成/,
      });
      expect(ctaButtonsInSidebar.length).toBeGreaterThan(0);
      const sidebarCta = ctaButtonsInSidebar.at(-1)!;
      await user.click(sidebarCta);

      // アニメーション完了を待ってサイドバーが閉じる
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });

      // tryNavigateToEditorも呼ばれている
      expect(mockTryNavigateToEditor).toHaveBeenCalled();
    });
  });
});
