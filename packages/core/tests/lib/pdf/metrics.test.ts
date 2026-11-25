/**
 * lib/pdf/metrics.ts のユニットテスト
 */

import {
  FONT_SIZES_SINGLE_COLUMN,
  PDF_TEXT_STYLE,
} from "@rehab-grid/core/lib/constants";
import { describe, expect, it } from "vitest";

import {
  estimateCharsPerLine,
  getPdfCardFontSizes,
  getPdfCardImageSize,
  getPdfTitleWidth,
} from "@/lib/pdf/metrics";

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
