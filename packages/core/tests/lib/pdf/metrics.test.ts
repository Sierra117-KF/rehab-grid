/**
 * lib/pdf/metrics.ts のユニットテスト
 */

import {
  FONT_SIZES_SINGLE_COLUMN,
  FONT_SIZES_SLIDE,
  PDF_TEXT_STYLE,
} from "@rehab-grid/core/lib/constants";
import { resolveProjectSettings } from "@rehab-grid/core/lib/settings";
import { type ProjectSettings } from "@rehab-grid/core/types";
import { describe, expect, it } from "vitest";

import {
  countPdfTextLines,
  estimateCharsPerLine,
  fitPdfFontSizeToSingleLine,
  fitPdfTextToLines,
  getPdfCardFontSizes,
  getPdfCardImageSize,
  getPdfDosageItemWidth,
  getPdfPrecautionTextWidth,
  getPdfSlideCardSize,
  getPdfSlideColumns,
  getPdfTitleWidth,
  getSlideTextLines,
  measurePdfTextWidth,
} from "@/lib/pdf/metrics";

import { createTestItem } from "./pdfTestUtils";

describe("measurePdfTextWidth", () => {
  it("日本語・全角記号は 1 文字 1em、半角英数字は指定の比率、空白は約 0.23em で数える", () => {
    expect(measurePdfTextWidth("膝（）•…", 10, 0.5)).toBe(50);
    expect(measurePdfTextWidth("10", 10, 0.5)).toBe(10);
    expect(measurePdfTextWidth(" ", 10, 0.5)).toBeCloseTo(2.3);
  });

  it("幅の広い半角文字（M/W 等）と英大文字は安全側に広めに見積もる", () => {
    expect(measurePdfTextWidth("MW", 10, 0.5)).toBe(20);
    expect(measurePdfTextWidth("AB", 10, 0.5)).toBeCloseTo(15.6);
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

  it("1 語だけで行幅を超える長い半角文字列は文字単位で折り返す", () => {
    // 幅 30pt・1 文字 5pt → 1 行 6 文字、15 文字は 3 行
    expect(countPdfTextLines("a".repeat(15), 30, 10, 0.5)).toBe(3);
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

  it("空白のない長い半角文字列も指定行数に収まるよう切り詰める", () => {
    // 幅 30pt・1 文字 5pt → 1 行 6 文字。2 行目は「…」（10pt）を空けて 4 文字残る
    expect(fitPdfTextToLines("a".repeat(20), 2, 30, 10, 0.5)).toBe(
      `${"a".repeat(10)}…`
    );
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

  it("スライドでは「大きめ」でもスライド用のサイズを返す", () => {
    expect(getPdfCardFontSizes("slide", "large")).toEqual({
      title: 24,
      description: 14,
      dosageValue: 28,
      dosageLabel: 12,
      precautionTitle: 13,
      precautionText: 13,
    });
    expect(getPdfCardFontSizes("slide")).toEqual(FONT_SIZES_SLIDE);
  });
});

describe("スライドの寸法", () => {
  /** 説明・注意点の行数の計算に使う設定 */
  function slideSettings(overrides: Partial<ProjectSettings> = {}) {
    return resolveProjectSettings({ layoutType: "slide", ...overrides });
  }

  describe("getPdfSlideCardSize", () => {
    it("A4 横のコンテンツ幅 × 460.28pt の固定サイズになる", () => {
      // 515.28 − ヘッダー 35 − 間隔 12 − 下端の余裕 8 = 460.28
      const size = getPdfSlideCardSize();
      expect(size.width).toBeCloseTo(761.89, 6);
      expect(size.height).toBeCloseTo(460.28, 6);
    });
  });

  describe("getPdfSlideColumns", () => {
    it("既定のサイズでは左の列を基本の比率（58%）の幅にし、5:3 の画像を置く", () => {
      const columns = getPdfSlideColumns({ width: 761.89, height: 460.28 });

      expect(columns.innerWidth).toBeCloseTo(743.89, 6);
      // 内側 442.28 − タイトル行 42.752
      expect(columns.bodyHeight).toBeCloseTo(399.528, 6);
      // (743.89 − 16) × 0.58
      expect(columns.leftColumnWidth).toBeCloseTo(422.1762, 6);
      expect(columns.imageHeight).toBeCloseTo(253.30572, 6);
      expect(columns.rightColumnWidth).toBeCloseTo(305.7138, 6);
    });

    it("本体に収まらない高さのカードでは画像を抑え、左の列を細く・右の列を広くする", () => {
      const columns = getPdfSlideColumns({ width: 761.89, height: 366.68 });

      expect(columns.bodyHeight).toBeCloseTo(305.928, 6);
      // 本体 305.928 − 用量の確保高さ 82.92
      expect(columns.imageHeight).toBeCloseTo(223.008, 6);
      expect(columns.leftColumnWidth).toBeCloseTo(371.68, 6);
      expect(columns.rightColumnWidth).toBeCloseTo(356.21, 6);
      // 画像と用量の確保高さを足しても本体に収まる
      expect(columns.imageHeight + 82.92).toBeLessThanOrEqual(
        columns.bodyHeight + 1e-9
      );
    });
  });

  describe("getPdfPrecautionTextWidth", () => {
    it("カラーは内側の余白だけ、白黒は枠線の分も引く", () => {
      expect(getPdfPrecautionTextWidth(300, "color")).toBe(288);
      expect(getPdfPrecautionTextWidth(300, "monochrome")).toBe(286);
    });
  });

  describe("getSlideTextLines", () => {
    /** 全角 n 文字の文字列 */
    const fullWidth = (n: number) => "あ".repeat(n);
    /** 注意点を n 件作る */
    const precautions = (count: number, value: string) =>
      Array.from({ length: count }, (_, i) => ({ id: `p${String(i)}`, value }));

    it("説明 100 文字・注意点 3 件 × 2 行はそのまま出る", () => {
      // 右の列 305.7pt は 14pt の全角 21 文字 → 説明 5 行。注意点 30 文字は 2 行
      const item = createTestItem({
        description: fullWidth(100),
        precautions: precautions(3, fullWidth(30)),
      });

      expect(getSlideTextLines(item, slideSettings())).toEqual({
        descriptionLines: 5,
        precautionLines: 3,
      });
    });

    it("説明 200 文字・注意点なしは最大の 10 行がそのまま出る", () => {
      const item = createTestItem({ description: fullWidth(200) });

      expect(getSlideTextLines(item, slideSettings())).toEqual({
        descriptionLines: 10,
        precautionLines: 3,
      });
    });

    it("説明 200 文字・注意点 5 件 × 3 行は、説明を残りの高さの 5 行に短縮する", () => {
      const item = createTestItem({
        description: fullWidth(200),
        precautions: precautions(5, fullWidth(50)),
      });

      expect(getSlideTextLines(item, slideSettings())).toEqual({
        descriptionLines: 5,
        precautionLines: 3,
      });
    });

    it("説明が空なら説明の行数は 0（注意点が本体の高さを超えても 0 のまま）", () => {
      const item = createTestItem({
        description: "",
        precautions: precautions(5, fullWidth(50)),
      });
      const overflowItem = createTestItem({
        description: "",
        precautions: precautions(20, fullWidth(50)),
      });

      expect(getSlideTextLines(item, slideSettings()).descriptionLines).toBe(0);
      expect(getSlideTextLines(overflowItem, slideSettings())).toEqual({
        descriptionLines: 0,
        precautionLines: 1,
      });
    });

    it("説明が 3 行に届かないときは、注意点 1 件あたりの行数を減らす", () => {
      // 本体 399.5pt に 3 行 × 7 件の注意点（393.7pt）を置くと説明が入らないため 2 行にする
      const item = createTestItem({
        description: fullWidth(200),
        precautions: precautions(7, "痛み\nしびれ\nめまい"),
      });

      expect(getSlideTextLines(item, slideSettings())).toEqual({
        descriptionLines: 6,
        precautionLines: 2,
      });
    });

    it("白黒モード・説明 200 文字・長い注意点 5 件でも説明を 3 行以上残す", () => {
      const item = createTestItem({
        description: fullWidth(200),
        precautions: precautions(5, fullWidth(50)),
      });

      expect(
        getSlideTextLines(item, slideSettings({ printColorMode: "monochrome" }))
      ).toEqual({ descriptionLines: 5, precautionLines: 3 });
    });
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
