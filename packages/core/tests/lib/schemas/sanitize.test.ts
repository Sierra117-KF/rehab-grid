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

    it("& を含むテキストはエスケープされずそのまま返る", () => {
      const result = sanitizeText("A & B");

      expect(result).toBe("A & B");
    });

    it("タグと & が混在してもタグのみ除去され & はそのまま返る", () => {
      const result = sanitizeText("<b>A & B</b>");

      expect(result).toBe("A & B");
    });

    it("タグではない < はエスケープされずそのまま返る", () => {
      const result = sanitizeText("膝 < 90°");

      expect(result).toBe("膝 < 90°");
      expect(result).not.toContain("&lt;");
    });

    it("2回サニタイズしても結果が変わらない", () => {
      const once = sanitizeText("膝 < 90° & A > B");
      const twice = sanitizeText(once);

      expect(once).toBe("膝 < 90° & A > B");
      expect(twice).toBe(once);
    });

    it("改行を含むテキストを処理する", () => {
      const input = "行1\n行2\n行3";
      const result = sanitizeText(input);

      expect(result).toBe("行1\n行2\n行3");
    });

    it("HTMLエンティティはデコードされ、タグではなく文字として返る", () => {
      const input = "&lt;script&gt;alert(1)&lt;/script&gt;";
      const result = sanitizeText(input);

      // 要素としては解釈されず文字列になる（表示時は React がエスケープする）
      expect(result).toBe("<script>alert(1)</script>");
    });
  });
});
