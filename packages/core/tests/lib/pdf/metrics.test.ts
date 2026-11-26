/**
 * lib/pdf/metrics.ts のユニットテスト
 */

import {
  FONT_SIZES_SINGLE_COLUMN,
  PDF_TEXT_STYLE,
} from "@rehab-grid/core/lib/constants";
import { describe, expect, it } from "vitest";

import {
  countPdfTextLines,
  estimateCharsPerLine,
  fitPdfFontSizeToSingleLine,
  fitPdfTextToLines,
  getPdfCardFontSizes,
  getPdfCardImageSize,
  getPdfDosageItemWidth,
  getPdfTitleWidth,
  measurePdfTextWidth,
} from "@/lib/pdf/metrics";

describe("measurePdfTextWidth", () => {
  it("日本語・全角記号は 1 文字 1em、半角英数字は指定の比率、空白は約 0.23em で数える", () => {
    expect(measurePdfTextWidth("膝（）•…", 10, 0.5)).toBe(50);
    expect(measurePdfTextWidth("10", 10, 0.5)).toBe(10);
    expect(measurePdfTextWidth(" ", 10, 0.5)).toBeCloseTo(2.3);
  });
});

describe("countPdfTextLines", () => {
  it("日本語は 1 文字ずつ、入りきらなくなる直前で折り返す", () => {
    // 幅 30pt・10pt の文字 → 1 行 3 文字
    expect(countPdfTextLines("あいうえおかき", 30, 10, 0.5)).toBe(3);
    expect(countPdfTextLines("あいう", 30, 10, 0.5)).toBe(1);
  });

  it("改行文字では必ず改行し、空行も 1 行と数える", () => {
    expect(countPdfTextLines("あ\n\nい", 100, 10, 0.5)).toBe(3);
    expect(countPdfTextLines("", 100, 10, 0.5)).toBe(1);
  });

  it("日本語を含まない語は途中で折り返さず、空白で区切る", () => {
    // "abcd"（20pt）と "efgh"（20pt）は 30pt の行に並ばない
    expect(countPdfTextLines("abcd efgh", 30, 10, 0.5)).toBe(2);
  });

  it("行内の空白を詰めて収まる場合は改行しない", () => {
    // "ab cd" = 10 + 2.3 + 10 = 22.3pt。空白を 1/3 詰めると 21.5pt で 21.6pt の行に入る
    expect(countPdfTextLines("ab cd", 21.6, 10, 0.5)).toBe(1);
  });
});

describe("fitPdfTextToLines", () => {
  it("行数に収まるテキストはそのまま返す", () => {
    expect(fitPdfTextToLines("あいう", 1, 30, 10, 0.5)).toBe("あいう");
  });

  it("収まらないテキストは最後の行の末尾を「…」にする", () => {
    // 1 行 3 文字。2 行目は「…」の分を空けて 2 文字残る
    expect(fitPdfTextToLines("あいうえおかき", 2, 30, 10, 0.5)).toBe(
      "あいうえお…"
    );
  });

  it("狭すぎて「…」しか入らない場合も 1 文字は残す", () => {
    expect(fitPdfTextToLines("あいう", 1, 5, 10, 0.5)).toBe("あ…");
  });
});

describe("getPdfCardImageSize", () => {
  it("カード幅から左右パディング（各8pt）を引いた幅と、5:3 の高さを返す", () => {
    expect(getPdfCardImageSize(216)).toEqual({ width: 200, height: 120 });
  });
});

describe("getPdfCardFontSizes", () => {
  it("1列レイアウトでは拡大表示用のサイズを返す", () => {
    expect(getPdfCardFontSizes("grid1")).toEqual({
      title: FONT_SIZES_SINGLE_COLUMN.title,
      description: FONT_SIZES_SINGLE_COLUMN.description,
      dosageValue: FONT_SIZES_SINGLE_COLUMN.dosageValue,
      dosageLabel: FONT_SIZES_SINGLE_COLUMN.dosageLabel,
      precautionTitle: FONT_SIZES_SINGLE_COLUMN.precautionTitle,
      precautionText: FONT_SIZES_SINGLE_COLUMN.precautionText,
    });
  });

  it.each(["grid2", "grid3", "grid4", undefined] as const)(
    "%s では通常サイズを返す",
    (layoutType) => {
      expect(getPdfCardFontSizes(layoutType)).toEqual({
        title: PDF_TEXT_STYLE.titleSize,
        description: PDF_TEXT_STYLE.descriptionSize,
        dosageValue: PDF_TEXT_STYLE.dosageValueSize,
        dosageLabel: PDF_TEXT_STYLE.dosageLabelSize,
        precautionTitle: PDF_TEXT_STYLE.precautionTitleSize,
        precautionText: PDF_TEXT_STYLE.precautionTextSize,
      });
    }
  );
});

describe("getPdfCardFontSizes（文字サイズ「大きめ」）", () => {
  it.each(["grid2", "grid3", "grid4"] as const)(
    "%s では約1.25倍のサイズを返す",
    (layoutType) => {
      expect(getPdfCardFontSizes(layoutType, "large")).toEqual({
        title: 18,
        description: 11,
        dosageValue: 18,
        dosageLabel: 9,
        precautionTitle: 10,
        precautionText: 10,
      });
    }
  );

  it("1列では「大きめ」でも 1 列用の拡大サイズを返す", () => {
    expect(getPdfCardFontSizes("grid1", "large").title).toBe(
      FONT_SIZES_SINGLE_COLUMN.title
    );
  });
});

describe("getPdfTitleWidth", () => {
  it("カード番号がなければコンテンツ幅をそのまま返す", () => {
    expect(getPdfTitleWidth(200, 14, false)).toBe(200);
  });

  it("カード番号があればバッジ（タイトル文字の1.4倍）と間隔（4pt）の幅を引く", () => {
    // 200 - 14 * 1.4 - 4 = 176.4
    expect(getPdfTitleWidth(200, 14, true)).toBeCloseTo(176.4, 6);
  });
});

describe("estimateCharsPerLine", () => {
  it("幅 ÷（フォントサイズ × 係数）を切り捨てた文字数を返す", () => {
    // 100 / (10 * 0.6) = 16.66...
    expect(estimateCharsPerLine(100, 10, 0.6)).toBe(16);
    // 120 / (10 * 0.5) = 24
    expect(estimateCharsPerLine(120, 10, 0.5)).toBe(24);
  });

  it.each([0, -10, 3])(
    "幅 %d のように 1 文字分に満たない場合も 1 を返す（切り詰めをスキップさせない）",
    (width) => {
      expect(estimateCharsPerLine(width, 10, 0.6)).toBe(1);
    }
  );
});

describe("getPdfDosageItemWidth", () => {
  it("コンテンツ幅から項目間の余白（8pt）を引いて列数で割った幅を返す", () => {
    expect(getPdfDosageItemWidth(200, 1)).toBe(200);
    expect(getPdfDosageItemWidth(200, 2)).toBe(96);
    expect(getPdfDosageItemWidth(200, 3)).toBeCloseTo(61.333, 3);
  });
});

describe("fitPdfFontSizeToSingleLine", () => {
  it("基準サイズで 1 行に収まる短いテキストはそのままのサイズを返す", () => {
    expect(fitPdfFontSizeToSingleLine("10回", 70, 14, 0.6)).toBe(14);
    expect(fitPdfFontSizeToSingleLine("3セット", 70, 14, 0.6)).toBe(14);
  });

  it("幅に収まらない長い全角テキストは 1 行に収まるサイズへ縮小する", () => {
    const fitted = fitPdfFontSizeToSingleLine("左右各１０回ずつ", 70, 14, 0.6);
    expect(fitted).toBeLessThan(14);
    expect(fitted).toBeGreaterThanOrEqual(4);
    expect(measurePdfTextWidth("左右各１０回ずつ", fitted, 0.6)).toBeLessThanOrEqual(
      70
    );
  });

  it("幅が広い半角英字（W / 大文字）でも 1 行に収まるサイズへ縮小する", () => {
    const wideLower = fitPdfFontSizeToSingleLine("WWWWWWWWWW", 70, 14, 0.6);
    const digits = fitPdfFontSizeToSingleLine("1234567890", 70, 14, 0.6);
    expect(wideLower).toBeLessThan(digits);
    expect(wideLower).toBeLessThan(14);
  });

  it("非常に狭い幅でも最小フォントサイズ（4pt）を下回らない", () => {
    expect(
      fitPdfFontSizeToSingleLine("あいうえおかきくけこ", 10, 14, 0.6)
    ).toBe(4);
  });

  it("空文字や幅 0 以下では基準サイズをそのまま返す", () => {
    expect(fitPdfFontSizeToSingleLine("", 70, 14, 0.6)).toBe(14);
    expect(fitPdfFontSizeToSingleLine("あいうえお", 0, 14, 0.6)).toBe(14);
  });
});
