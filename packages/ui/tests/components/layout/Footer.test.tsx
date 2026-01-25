import { APP_NAME, APP_NAME_EN } from "@rehab-grid/core/lib/constants";
import { Footer } from "@rehab-grid/ui/components/layout/Footer";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/**
 * next/image のモック
 *
 * @remarks next/link はそのまま動作するためモック不要
 */
vi.mock("next/image", async () => {
  const { mockNextImage } = await import("@/tests/mocks/next-image");
  return mockNextImage;
});

describe("Footer", () => {
  describe("基本レンダリング", () => {
    it("footer 要素が表示される", () => {
      render(<Footer />);

      const footer = screen.getByRole("contentinfo");
      expect(footer).toBeInTheDocument();
    });
  });

  describe("ブランドエリア", () => {
    it("ロゴ画像が表示される", () => {
      render(<Footer />);

      // alt="" は装飾的画像として presentation ロールになる
      // リンク内のテキスト「リハぐり」と重複を避けるための適切な設計
      const logo = screen.getByRole("presentation");
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute("src", "/icons/logo.png");
    });

    it("アプリ名が表示される", () => {
      render(<Footer />);

      expect(screen.getByText(APP_NAME)).toBeInTheDocument();
    });

    it("説明文が表示される", () => {
      render(<Footer />);

      expect(
        screen.getByText("自主トレ指導箋の作成支援ツール")
      ).toBeInTheDocument();
    });

    it("トップページへのリンクが存在する", () => {
      render(<Footer />);

      // APP_NAME を含むリンクを取得
      const homeLink = screen.getByRole("link", { name: new RegExp(APP_NAME) });
      expect(homeLink).toHaveAttribute("href", "/");
    });
  });

  describe("ナビゲーション", () => {
    describe("Support セクション", () => {
      it("更新履歴リンクが正しい href を持つ", () => {
        render(<Footer />);

        const changelogLink = screen.getByRole("link", { name: "更新履歴" });
        expect(changelogLink).toHaveAttribute("href", "/changelog");
      });
    });

    describe("Legal セクション", () => {
      it("プライバシーリンクが正しい href を持つ", () => {
        render(<Footer />);

        const privacyLink = screen.getByRole("link", { name: "プライバシー" });
        expect(privacyLink).toHaveAttribute("href", "/privacy");
      });

      it("利用規約リンクが正しい href を持つ", () => {
        render(<Footer />);

        const termsLink = screen.getByRole("link", { name: "利用規約" });
        expect(termsLink).toHaveAttribute("href", "/terms");
      });
    });
  });

  describe("コピーライト", () => {
    it("現在の年を含む著作権表示が表示される", () => {
      render(<Footer />);

      const currentYear = new Date().getFullYear();
      // 著作権表示はライセンスリンクを含むため、正規表現でマッチ
      expect(
        screen.getByText(new RegExp(`©\\s*${currentYear}\\s*REHAB-GRID SYSTEM`))
      ).toBeInTheDocument();
    });

    it("ライセンスリンクが正しい href を持つ", () => {
      render(<Footer />);

      const licenseLink = screen.getByRole("link", { name: "AGPL-3.0" });
      expect(licenseLink).toHaveAttribute(
        "href",
        "https://github.com/Sierra117-KF/rehab-grid/blob/main/LICENSE"
      );
    });
  });

  describe("装飾テキスト", () => {
    it("背景装飾テキストが表示される", () => {
      render(<Footer />);

      // 背景装飾テキストの存在確認
      // aria-hidden 属性の検証は実装詳細への依存となるためスキップ
      expect(screen.getByText(APP_NAME_EN)).toBeInTheDocument();
    });
  });
});
