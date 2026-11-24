import {
  matchesSearchQuery,
  normalizeSearchText,
} from "@rehab-grid/core/utils/search";
import { describe, expect, it } from "vitest";

describe("normalizeSearchText", () => {
  it.each([
    { input: "スクワット", expected: "すくわっと", note: "カタカナ → ひらがな" },
    { input: "ｽｸﾜｯﾄ", expected: "すくわっと", note: "半角カナ → ひらがな" },
    { input: "ＳＬＲ", expected: "slr", note: "全角英字 → 半角小文字" },
    { input: "SLR", expected: "slr", note: "大文字 → 小文字" },
    { input: "１０回", expected: "10回", note: "全角数字 → 半角" },
    { input: "カーフ", expected: "かーふ", note: "長音記号はそのまま" },
    { input: "ヴ", expected: "ゔ", note: "ヴ → ゔ" },
  ])("$note: $input → $expected", ({ input, expected }) => {
    expect(normalizeSearchText(input)).toBe(expected);
  });

  it("漢字はそのまま残る", () => {
    expect(normalizeSearchText("股関節伸展")).toBe("股関節伸展");
  });
});

describe("matchesSearchQuery", () => {
  describe("表記揺れの吸収", () => {
    it("ひらがなでカタカナの運動名がヒットする", () => {
      expect(matchesSearchQuery("スクワット", "すくわっと")).toBeTruthy();
    });

    it("小文字の英字で全角括弧付きの運動名がヒットする", () => {
      expect(matchesSearchQuery("足上げ（SLR）", "slr")).toBeTruthy();
    });

    it("全角英字の検索語でもヒットする", () => {
      expect(matchesSearchQuery("足上げ（SLR）", "ＳＬＲ")).toBeTruthy();
    });
  });

  describe("部分一致", () => {
    it("語の一部でヒットする", () => {
      expect(matchesSearchQuery("ハムストレッチ", "ストレッチ")).toBeTruthy();
    });

    it("含まれない語ではヒットしない", () => {
      expect(matchesSearchQuery("ハムストレッチ", "スクワット")).toBeFalsy();
    });
  });

  describe("複数語（AND 条件）", () => {
    it("空白区切りのすべての語を含めばヒットする", () => {
      expect(matchesSearchQuery("四つ這い股関節伸展", "股関節 伸展")).toBeTruthy();
    });

    it("いずれかの語を含まなければヒットしない", () => {
      expect(matchesSearchQuery("股関節外転", "股関節 伸展")).toBeFalsy();
    });

    it("全角スペース区切りでも AND 条件になる", () => {
      expect(
        matchesSearchQuery("四つ這い股関節伸展", "股関節　伸展")
      ).toBeTruthy();
    });

    it("前後や連続する空白は無視される", () => {
      expect(matchesSearchQuery("股関節伸展", "  股関節   伸展  ")).toBeTruthy();
    });
  });

  describe("空の検索語", () => {
    it.each(["", "   ", "　"])("検索語 %j は常にヒットする", (query) => {
      expect(matchesSearchQuery("スクワット", query)).toBeTruthy();
      expect(matchesSearchQuery("", query)).toBeTruthy();
    });
  });

  it("検索対象が空なら空でない検索語にはヒットしない", () => {
    expect(matchesSearchQuery("", "すくわっと")).toBeFalsy();
  });
});
