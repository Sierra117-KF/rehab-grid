import { sanitizeText } from "@rehab-grid/core/lib/schemas/sanitize";
import { describe, expect, it } from "vitest";

describe("lib/schemas/sanitize", () => {
  describe("sanitizeText", () => {
    it("通常のテキストは変更されない", () => {
      const input = "通常のテキスト";
      const result = sanitizeText(input);

      expect(result).toBe("通常のテキスト");
    });

    it("空文字列を正しく処理する", () => {
      const result = sanitizeText("");

      expect(result).toBe("");
    });

    it("スクリプトタグを除去する", () => {
      const input = "Hello <script>alert('xss')</script> World";
      const result = sanitizeText(input);

      expect(result).toBe("Hello  World");
      expect(result).not.toContain("<script>");
      expect(result).not.toContain("alert");
    });

    it("HTMLタグを除去してテキストのみを返す", () => {
      const input = "<b>太字</b>テキスト";
      const result = sanitizeText(input);

      expect(result).toBe("太字テキスト");
      expect(result).not.toContain("<b>");
      expect(result).not.toContain("</b>");
    });

    it("ネストしたHTMLタグを除去する", () => {
      const input = "<div><p><span>ネストテキスト</span></p></div>";
      const result = sanitizeText(input);

      expect(result).toBe("ネストテキスト");
    });

    it("イベントハンドラ付きのタグを除去する", () => {
      const input = '<img src="x" onerror="alert(\'xss\')" />';
      const result = sanitizeText(input);

      expect(result).toBe("");
      expect(result).not.toContain("onerror");
      expect(result).not.toContain("alert");
    });

    it("複数のXSSパターンを除去する", () => {
      const input =
        '<script>alert(1)</script><img onerror="alert(2)"><a href="javascript:alert(3)">link</a>';
      const result = sanitizeText(input);

      expect(result).toBe("link");
      expect(result).not.toContain("script");
      expect(result).not.toContain("javascript");
      expect(result).not.toContain("onerror");
    });

    it("スタイルタグを除去する", () => {
      const input = "<style>body { display: none; }</style>テキスト";
      const result = sanitizeText(input);

      expect(result).toBe("テキスト");
      expect(result).not.toContain("style");
    });

    it("数字と記号を含むテキストは変更されない", () => {
      const input = "10回 × 3セット / 1日2回";
      const result = sanitizeText(input);

      expect(result).toBe("10回 × 3セット / 1日2回");
    });

    it("改行を含むテキストを処理する", () => {
      const input = "行1\n行2\n行3";
      const result = sanitizeText(input);

      expect(result).toBe("行1\n行2\n行3");
    });

    it("HTMLエンティティを含むテキストを処理する", () => {
      const input = "&lt;script&gt;";
      const result = sanitizeText(input);

      // DOMPurifyはHTMLエンティティをデコードして評価する
      expect(result).not.toContain("<script>");
    });
  });
});
