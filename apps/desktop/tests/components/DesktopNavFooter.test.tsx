import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DesktopNavFooter } from "@/components/DesktopNavFooter";

/**
 * vi.hoisted でモック関数を事前定義
 */
const { mockUsePathname } = vi.hoisted(() => ({
  mockUsePathname: vi.fn(),
}));

/**
 * next/navigation のモック
 */
vi.mock("next/navigation", () => ({
  usePathname: mockUsePathname,
}));

/**
 * DesktopNavFooter をレンダリングするヘルパー
 *
 * @param pathname 現在のパス名（デフォルト: "/"）
 */
function setupNavFooter(pathname = "/") {
  mockUsePathname.mockReturnValue(pathname);
  render(<DesktopNavFooter />);
}

describe("DesktopNavFooter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("基本レンダリング", () => {
    it("ナビゲーション要素が「メインナビゲーション」のaria-labelを持つ", () => {
      setupNavFooter();

      expect(
        screen.getByRole("navigation", { name: "メインナビゲーション" }),
      ).toBeInTheDocument();
    });

    it("4つのナビゲーションリンクが表示される", () => {
      setupNavFooter();

      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(4);
    });
  });

  describe("ナビゲーションリンク", () => {
    it("エディタリンクが正しいhrefを持つ", () => {
      setupNavFooter();

      const link = screen.getByRole("link", { name: /エディタ/ });
      expect(link).toHaveAttribute("href", "/");
    });

    it("利用規約リンクが正しいhrefを持つ", () => {
      setupNavFooter();

      const link = screen.getByRole("link", { name: /利用規約/ });
      expect(link).toHaveAttribute("href", "/terms/");
    });

    it("プライバシーリンクが正しいhrefを持つ", () => {
      setupNavFooter();

      const link = screen.getByRole("link", { name: /プライバシー/ });
      expect(link).toHaveAttribute("href", "/privacy/");
    });

    it("更新履歴リンクが正しいhrefを持つ", () => {
      setupNavFooter();

      const link = screen.getByRole("link", { name: /更新履歴/ });
      expect(link).toHaveAttribute("href", "/changelog/");
    });
  });

  describe("リンクラベル表示", () => {
    it("エディタのラベルが表示される", () => {
      setupNavFooter();

      expect(screen.getByText("エディタ")).toBeInTheDocument();
    });

    it("利用規約のラベルが表示される", () => {
      setupNavFooter();

      expect(screen.getByText("利用規約")).toBeInTheDocument();
    });

    it("プライバシーのラベルが表示される", () => {
      setupNavFooter();

      expect(screen.getByText("プライバシー")).toBeInTheDocument();
    });

    it("更新履歴のラベルが表示される", () => {
      setupNavFooter();

      expect(screen.getByText("更新履歴")).toBeInTheDocument();
    });
  });

  describe("アクティブ状態（aria-current）", () => {
    it('pathname="/" のときエディタリンクに aria-current="page" が設定される', () => {
      setupNavFooter("/");

      const editorLink = screen.getByRole("link", { name: /エディタ/ });
      expect(editorLink).toHaveAttribute("aria-current", "page");
    });

    it('pathname="/" のとき他のリンクには aria-current が設定されない', () => {
      setupNavFooter("/");

      const termsLink = screen.getByRole("link", { name: /利用規約/ });
      const privacyLink = screen.getByRole("link", { name: /プライバシー/ });
      const changelogLink = screen.getByRole("link", { name: /更新履歴/ });

      expect(termsLink).not.toHaveAttribute("aria-current");
      expect(privacyLink).not.toHaveAttribute("aria-current");
      expect(changelogLink).not.toHaveAttribute("aria-current");
    });

    it('pathname="/terms/" のとき利用規約リンクに aria-current="page" が設定される', () => {
      setupNavFooter("/terms/");

      const termsLink = screen.getByRole("link", { name: /利用規約/ });
      expect(termsLink).toHaveAttribute("aria-current", "page");
    });

    it('pathname="/terms/" のとき他のリンクには aria-current が設定されない', () => {
      setupNavFooter("/terms/");

      const editorLink = screen.getByRole("link", { name: /エディタ/ });
      const privacyLink = screen.getByRole("link", { name: /プライバシー/ });
      const changelogLink = screen.getByRole("link", { name: /更新履歴/ });

      expect(editorLink).not.toHaveAttribute("aria-current");
      expect(privacyLink).not.toHaveAttribute("aria-current");
      expect(changelogLink).not.toHaveAttribute("aria-current");
    });

    it('pathname="/privacy/" のときプライバシーリンクに aria-current="page" が設定される', () => {
      setupNavFooter("/privacy/");

      const privacyLink = screen.getByRole("link", { name: /プライバシー/ });
      expect(privacyLink).toHaveAttribute("aria-current", "page");
    });

    it('pathname="/privacy/" のとき他のリンクには aria-current が設定されない', () => {
      setupNavFooter("/privacy/");

      const editorLink = screen.getByRole("link", { name: /エディタ/ });
      const termsLink = screen.getByRole("link", { name: /利用規約/ });
      const changelogLink = screen.getByRole("link", { name: /更新履歴/ });

      expect(editorLink).not.toHaveAttribute("aria-current");
      expect(termsLink).not.toHaveAttribute("aria-current");
      expect(changelogLink).not.toHaveAttribute("aria-current");
    });

    it('pathname="/changelog/" のとき更新履歴リンクに aria-current="page" が設定される', () => {
      setupNavFooter("/changelog/");

      const changelogLink = screen.getByRole("link", { name: /更新履歴/ });
      expect(changelogLink).toHaveAttribute("aria-current", "page");
    });

    it('pathname="/changelog/" のとき他のリンクには aria-current が設定されない', () => {
      setupNavFooter("/changelog/");

      const editorLink = screen.getByRole("link", { name: /エディタ/ });
      const termsLink = screen.getByRole("link", { name: /利用規約/ });
      const privacyLink = screen.getByRole("link", { name: /プライバシー/ });

      expect(editorLink).not.toHaveAttribute("aria-current");
      expect(termsLink).not.toHaveAttribute("aria-current");
      expect(privacyLink).not.toHaveAttribute("aria-current");
    });
  });
});
