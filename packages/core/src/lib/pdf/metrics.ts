/**
 * PDFカードの寸法・フォントサイズ計算
 *
 * 文字サイズ変更や A4 収容見積もりなど、描画以外の箇所からも同じ計算を使えるよう
 * カード生成処理から切り出している
 */

import {
  CARD_NUMBER_BADGE_RATIO,
  CJK_PATTERN,
  FONT_SIZES_LARGE,
  FONT_SIZES_SINGLE_COLUMN,
  FONT_SIZES_SLIDE,
  getPdfContentSize,
  LABELS,
  LINE_CLAMP,
  PDF_CARD_STYLE,
  PDF_CHAR_WIDTH_RATIO,
  PDF_DEFAULT_LINE_HEIGHT,
  PDF_HALF_WIDTH_CHAR_RATIO,
  PDF_HEADER_HEIGHT,
  PDF_IMAGE_ASPECT_RATIO,
  PDF_LABELS,
  PDF_OVERALL_NOTE_MAX_LINES,
  PDF_SLIDE,
  PDF_SPACING,
  PDF_TEXT_STYLE,
  TEXT_LIMITS,
} from "@rehab-grid/core/lib/constants";
import {
  type EditorItem,
  type LayoutType,
  type PrintColorMode,
  type ResolvedProjectSettings,
  type SheetHeaderSettings,
  type TextScale,
} from "@rehab-grid/core/types";
import { truncateToLines } from "@rehab-grid/core/utils/pdf";

/**
 * PDFカード内の各テキストのフォントサイズ（ポイント単位）
 */
export type PdfCardFontSizes = {
  /** タイトル */
  title: number;
  /** 説明文 */
  description: number;
  /** 用量の数値 */
  dosageValue: number;
  /** 用量のラベル */
  dosageLabel: number;
  /** 注意点の見出し */
  precautionTitle: number;
  /** 注意点の本文 */
  precautionText: number;
};

/**
 * カード幅から、カード内コンテンツ（画像・テキスト）の幅と画像の高さを求める
 *
 * @param cardWidth - カードの幅（ポイント単位）
 * @returns コンテンツ幅と画像高さ（ポイント単位）
 */
export function getPdfCardImageSize(cardWidth: number): {
  width: number;
  height: number;
} {
  return {
    width: cardWidth - PDF_CARD_STYLE.padding * 2,
    height: (cardWidth - PDF_CARD_STYLE.padding * 2) / PDF_IMAGE_ASPECT_RATIO,
  };
}

/**
 * レイアウトと文字サイズの設定に応じたカード内のフォントサイズを取得する
 *
 * 1列レイアウトは高齢者向けの拡大表示サイズを使う（文字サイズの設定に関わらず）。
 * スライドはスライド専用のサイズを使う（文字サイズの設定に関わらず）。
 * 2〜4列で「大きめ」を選んだ場合は約1.25倍のサイズを使う。
 *
 * @param layoutType - レイアウトタイプ（省略時は通常サイズ）
 * @param textScale - 文字サイズの設定（省略時は "standard"）
 * @returns カード内の各テキストのフォントサイズ
 */
export function getPdfCardFontSizes(
  layoutType?: LayoutType,
  textScale: TextScale = "standard"
): PdfCardFontSizes {
  if (layoutType === "grid1") {
    return {
      title: FONT_SIZES_SINGLE_COLUMN.title,
      description: FONT_SIZES_SINGLE_COLUMN.description,
      dosageValue: FONT_SIZES_SINGLE_COLUMN.dosageValue,
      dosageLabel: FONT_SIZES_SINGLE_COLUMN.dosageLabel,
      precautionTitle: FONT_SIZES_SINGLE_COLUMN.precautionTitle,
      precautionText: FONT_SIZES_SINGLE_COLUMN.precautionText,
    };
  }
  if (layoutType === "slide") {
    return { ...FONT_SIZES_SLIDE };
  }
  if (textScale === "large") {
    return { ...FONT_SIZES_LARGE };
  }
  return {
    title: PDF_TEXT_STYLE.titleSize,
    description: PDF_TEXT_STYLE.descriptionSize,
    dosageValue: PDF_TEXT_STYLE.dosageValueSize,
    dosageLabel: PDF_TEXT_STYLE.dosageLabelSize,
    precautionTitle: PDF_TEXT_STYLE.precautionTitleSize,
    precautionText: PDF_TEXT_STYLE.precautionTextSize,
  };
}

/**
 * タイトルのフォントサイズからカード番号バッジの直径を求める
 *
 * @param titleFontSize - タイトルのフォントサイズ（ポイント単位）
 * @returns バッジの直径（ポイント単位）
 */
export function getPdfCardNumberBadgeSize(titleFontSize: number): number {
  return titleFontSize * CARD_NUMBER_BADGE_RATIO.size;
}

/**
 * タイトルを置ける幅を求める（カード番号バッジがあればその分を引く）
 *
 * @param contentWidth - カード内コンテンツの幅（ポイント単位）
 * @param titleFontSize - タイトルのフォントサイズ（ポイント単位）
 * @param hasCardNumber - カード番号バッジを表示するか
 * @returns タイトルの幅（ポイント単位）
 */
export function getPdfTitleWidth(
  contentWidth: number,
  titleFontSize: number,
  hasCardNumber: boolean
): number {
  if (!hasCardNumber) return contentWidth;
  return (
    contentWidth -
    getPdfCardNumberBadgeSize(titleFontSize) -
    PDF_SPACING.cardNumberGap
  );
}

/**
 * 幅とフォントサイズから1行あたりの概算文字数を求める
 *
 * @param width - テキスト領域の幅（ポイント単位）
 * @param fontSize - フォントサイズ（ポイント単位）
 * @param charWidthRatio - フォントサイズに対する1文字幅の係数（`PDF_CHAR_WIDTH_RATIO`）
 * @returns 1行あたりの概算文字数（切り捨て。狭すぎる場合も最低 1 文字）
 */
export function estimateCharsPerLine(
  width: number,
  fontSize: number,
  charWidthRatio: number
): number {
  // 0 以下だと truncateToLines が切り詰めをスキップしてしまうため、下限を 1 にする
  return Math.max(1, Math.floor(width / (fontSize * charWidthRatio)));
}

/** 行に収めるために空白を詰められる割合（@react-pdf/textkit の改行処理と同じ 3/9） */
const PDF_SPACE_SHRINK_RATIO = 3 / 9;

/** 半角の空白の幅（フォントサイズに対する比率。NotoSansJP の実測 0.224〜0.227） */
const PDF_SPACE_WIDTH_RATIO = 0.23;

/** 半角として幅を見積もる文字（ASCII の印字可能文字）。それ以外は全角（1em）とみなす */
const HALF_WIDTH_CHAR_PATTERN = /^[ -~]$/;

/** 用量テキストを 1 行に収めるために縮小するときの最小フォントサイズ（ポイント単位） */
const PDF_DOSAGE_MIN_FONT_SIZE = 4;

/**
 * 1 行フィット計算の安全係数
 *
 * @remarks
 * NotoSansJP のグリフ幅と近似値の微差やサブピクセル丸めで、
 * 境界ギリギリで 2 行に折り返すのを防ぐための余裕
 */
const PDF_SINGLE_LINE_FIT_SAFETY_RATIO = 0.96;

/** 近似値より幅が広い半角文字（1em 相当として見積もる） */
const VERY_WIDE_HALF_WIDTH_CHAR_PATTERN = /^[MWmw@%&]$/;

/** 近似値よりやや幅が広い半角英大文字（0.78em 相当として見積もる） */
const UPPERCASE_HALF_WIDTH_CHAR_PATTERN = /^[A-Z]$/;

/** 半角英大文字の幅比率 */
const PDF_UPPERCASE_CHAR_RATIO = 0.78;

/**
 * 用量の 1 項目分の幅を求める
 *
 * @param contentWidth - カード内コンテンツの幅（ポイント単位）
 * @param columnCount - その行に並べる用量項目の数（1〜3）
 * @returns 1 項目分の幅（ポイント単位）
 */
export function getPdfDosageItemWidth(
  contentWidth: number,
  columnCount: number
): number {
  const count = Math.max(1, columnCount);
  return (contentWidth - PDF_SPACING.dosageGap * (count - 1)) / count;
}

/**
 * テキストが指定幅の 1 行に収まるフォントサイズを求める
 *
 * @remarks
 * 基準サイズで収まる場合はそのまま返す。収まらない場合は 1 行に収まるサイズまで縮小する。
 * 描画（card.ts）と A4 収容見積もり（layout.ts）の両方で同じ計算を使う。
 *
 * @param text - テキスト
 * @param maxWidth - 1 行の最大幅（ポイント単位）
 * @param baseFontSize - 基準のフォントサイズ（ポイント単位）
 * @param halfWidthRatio - 半角 1 文字の幅（`PDF_HALF_WIDTH_CHAR_RATIO`）
 * @param minFontSize - 縮小時の下限フォントサイズ（省略時は 4pt）
 * @returns 1 行に収まるフォントサイズ（ポイント単位）
 */
export function fitPdfFontSizeToSingleLine(
  text: string,
  maxWidth: number,
  baseFontSize: number,
  halfWidthRatio: number,
  minFontSize: number = PDF_DOSAGE_MIN_FONT_SIZE
): number {
  if (text === "" || maxWidth <= 0) return baseFontSize;

  const unitWidth = measurePdfTextWidth(text, 1, halfWidthRatio);
  if (unitWidth <= 0) return baseFontSize;

  const safeWidth = maxWidth * PDF_SINGLE_LINE_FIT_SAFETY_RATIO;
  if (unitWidth * baseFontSize <= safeWidth) return baseFontSize;

  const fitted = Math.floor((safeWidth / unitWidth) * 10) / 10;
  return Math.min(baseFontSize, Math.max(minFontSize, fitted));
}

/**
 * テキストの描画幅を見積もる
 *
 * @remarks
 * 全角文字は 1em、半角の空白は約 0.23em、幅の広い半角文字（M/W/m/w/@/%/&）は 1em、
 * その他の半角英大文字は 0.78em、残りの半角文字は halfWidthRatio として安全側に見積もる。
 *
 * @param text - テキスト
 * @param fontSize - フォントサイズ（ポイント単位）
 * @param halfWidthRatio - 半角 1 文字の基本幅（`PDF_HALF_WIDTH_CHAR_RATIO`）
 * @returns 幅（ポイント単位）
 */
export function measurePdfTextWidth(
  text: string,
  fontSize: number,
  halfWidthRatio: number
): number {
  return Array.from(text).reduce((sum, char) => {
    if (char === " ") return sum + fontSize * PDF_SPACE_WIDTH_RATIO;
    if (VERY_WIDE_HALF_WIDTH_CHAR_PATTERN.test(char)) return sum + fontSize;
    if (UPPERCASE_HALF_WIDTH_CHAR_PATTERN.test(char)) {
      return (
        sum + fontSize * Math.max(halfWidthRatio, PDF_UPPERCASE_CHAR_RATIO)
      );
    }
    return (
      sum + fontSize * (HALF_WIDTH_CHAR_PATTERN.test(char) ? halfWidthRatio : 1)
    );
  }, 0);
}

/**
 * 折り返した 1 行の、元のテキスト上の範囲
 */
type PdfTextLine = {
  /** 行頭の位置 */
  start: number;
  /** 行末の位置（行の最後の文字の次） */
  end: number;
  /** 行の幅（ポイント単位） */
  width: number;
};

/**
 * 1 段落を折り返しの単位に分ける
 *
 * Worker のハイフネーション設定と同じく、日本語を含む語は 1 文字ずつ、それ以外の語は空白で区切る
 *
 * @param paragraph - 改行を含まないテキスト
 * @returns 折り返しの単位（空白も 1 単位として残す）
 */
function splitIntoBreakUnits(paragraph: string): string[] {
  return paragraph
    .split(/( +)/)
    .filter((part) => part !== "")
    .flatMap((part) => (CJK_PATTERN.test(part) ? Array.from(part) : [part]));
}

/**
 * テキストを PDF の折り返しに近い規則で行に分ける
 *
 * @remarks
 * react-pdf の改行（入りきらなくなる直前の区切りで改行する。日本語は 1 文字ごとに区切れる）を
 * 文字の種類ごとの幅で近似する。改行文字では必ず改行する。
 *
 * @param text - テキスト
 * @param width - テキスト領域の幅（ポイント単位）
 * @param fontSize - フォントサイズ（ポイント単位）
 * @param halfWidthRatio - 半角 1 文字の幅（`PDF_HALF_WIDTH_CHAR_RATIO`）
 * @returns 行ごとの範囲
 */
function wrapPdfText(
  text: string,
  width: number,
  fontSize: number,
  halfWidthRatio: number
): PdfTextLine[] {
  const lines: PdfTextLine[] = [];
  let offset = 0;

  for (const paragraph of text.split("\n")) {
    let line: PdfTextLine = { start: offset, end: offset, width: 0 };
    // 行内の空白が縮められる幅（react-pdf は空白を幅の 1/3 まで詰めて 1 行に収める）
    let shrink = 0;
    for (const unit of splitIntoBreakUnits(paragraph)) {
      const unitWidth = measurePdfTextWidth(unit, fontSize, halfWidthRatio);
      const isSpace = unit.trim() === "";
      const start = offset;
      offset += unit.length;
      if (line.end > line.start && line.width + unitWidth - shrink > width) {
        lines.push(line);
        // 行頭に来る空白は描かれない
        line = isSpace
          ? { start: offset, end: offset, width: 0 }
          : { start, end: offset, width: unitWidth };
        shrink = 0;
      } else {
        line = { ...line, end: offset, width: line.width + unitWidth };
        if (isSpace) shrink += unitWidth * PDF_SPACE_SHRINK_RATIO;
      }
      // 1 語だけで行幅を超える長い半角文字列（URL 等）は、react-pdf と同じく文字単位で折り返す
      if (!isSpace && unitWidth > width) {
        let charOffset = line.start;
        line = { start: charOffset, end: charOffset, width: 0 };
        for (const char of Array.from(unit)) {
          const charWidth = measurePdfTextWidth(char, fontSize, halfWidthRatio);
          const charStart = charOffset;
          charOffset += char.length;
          if (line.end > line.start && line.width + charWidth > width) {
            lines.push(line);
            line = { start: charStart, end: charOffset, width: charWidth };
          } else {
            line = { ...line, end: charOffset, width: line.width + charWidth };
          }
        }
        shrink = 0;
      }
    }
    lines.push(line);
    // 改行文字の分
    offset += 1;
  }

  return lines;
}

/**
 * テキストを PDF で折り返したときの行数を見積もる
 *
 * @param text - テキスト
 * @param width - テキスト領域の幅（ポイント単位）
 * @param fontSize - フォントサイズ（ポイント単位）
 * @param halfWidthRatio - 半角 1 文字の幅（`PDF_HALF_WIDTH_CHAR_RATIO`）
 * @returns 行数（空文字は 1 行）
 */
export function countPdfTextLines(
  text: string,
  width: number,
  fontSize: number,
  halfWidthRatio: number
): number {
  return wrapPdfText(text, width, fontSize, halfWidthRatio).length;
}

/**
 * テキストを PDF で折り返したときに指定の行数に収まるよう切り詰める
 *
 * @remarks
 * 文字の種類ごとの幅で折り返しを見積もり、収まらなければ最後の行の末尾を「…」にする。
 * 1 文字あたりの平均幅で切り詰める truncateToLines と違い、日本語（1em 幅）が多くても行数を超えない。
 *
 * @param text - テキスト
 * @param maxLines - 最大行数
 * @param width - テキスト領域の幅（ポイント単位）
 * @param fontSize - フォントサイズ（ポイント単位）
 * @param halfWidthRatio - 半角 1 文字の幅（`PDF_HALF_WIDTH_CHAR_RATIO`）
 * @returns 切り詰めたテキスト（収まる場合はそのまま）
 */
export function fitPdfTextToLines(
  text: string,
  maxLines: number,
  width: number,
  fontSize: number,
  halfWidthRatio: number
): string {
  const lines = wrapPdfText(text, width, fontSize, halfWidthRatio);
  const lastLine = lines[maxLines - 1];
  if (lines.length <= maxLines || lastLine === undefined) return text;

  // 最後の行の末尾を、「…」が入るまで削る（狭すぎる場合も 1 文字は残す）
  const ellipsisWidth = measurePdfTextWidth("…", fontSize, halfWidthRatio);
  let chars = Array.from(text.slice(lastLine.start, lastLine.end).trimEnd());
  while (
    chars.length > 1 &&
    measurePdfTextWidth(chars.join(""), fontSize, halfWidthRatio) +
      ellipsisWidth >
      width
  ) {
    chars = Array.from(chars.slice(0, -1).join("").trimEnd());
  }
  return `${text.slice(0, lastLine.start)}${chars.join("")}…`;
}

/**
 * カードのタイトルに出す文字列を作る（1 行に収まるよう切り詰める）
 *
 * @param title - 運動名（空欄なら「無題の運動」）
 * @param titleWidth - タイトルを置ける幅（ポイント単位。getPdfTitleWidth）
 * @param fontSize - タイトルのフォントサイズ（ポイント単位）
 * @returns 表示する文字列
 */
export function getPdfCardTitleText(
  title: string,
  titleWidth: number,
  fontSize: number
): string {
  if (!title) return LABELS.untitledExercise;
  return fitPdfTextToLines(
    title.slice(0, TEXT_LIMITS.title),
    LINE_CLAMP.title,
    titleWidth,
    fontSize,
    PDF_HALF_WIDTH_CHAR_RATIO.bold
  );
}

/**
 * カードの説明に出す文字列を作る（行数の上限で切り詰める）
 *
 * @param description - 説明
 * @param contentWidth - カード内コンテンツの幅（ポイント単位）
 * @param fontSize - 説明のフォントサイズ（ポイント単位）
 * @returns 表示する文字列
 */
export function getPdfCardDescriptionText(
  description: string,
  contentWidth: number,
  fontSize: number
): string {
  return truncateToLines(
    description.slice(0, TEXT_LIMITS.description),
    LINE_CLAMP.description,
    estimateCharsPerLine(contentWidth, fontSize, PDF_CHAR_WIDTH_RATIO.body)
  );
}

/**
 * カードの注意点 1 件に出す文字列を作る（行頭の「•」付き、行数の上限で切り詰める）
 *
 * @param value - 注意点
 * @param contentWidth - カード内コンテンツの幅（ポイント単位）
 * @param fontSize - 注意点のフォントサイズ（ポイント単位）
 * @returns 表示する文字列
 */
export function getPdfCardPrecautionText(
  value: string,
  contentWidth: number,
  fontSize: number
): string {
  const displayValue = truncateToLines(
    value.slice(0, TEXT_LIMITS.precaution),
    LINE_CLAMP.precaution,
    estimateCharsPerLine(contentWidth, fontSize, PDF_CHAR_WIDTH_RATIO.body)
  );
  return `• ${displayValue}`;
}

/**
 * 施設名・担当者名の行に出す文字列を作る
 *
 * @param header - ヘッダーの項目
 * @returns 「施設名（全角空白）担当: 担当者名」形式の文字列（どちらも空欄なら空文字）
 */
export function getPdfHeaderSubText(
  header: Pick<SheetHeaderSettings, "facilityName" | "therapistName">
): string {
  const facilityName = header.facilityName.trim();
  const therapistName = header.therapistName.trim();
  return [
    facilityName,
    therapistName !== "" ? `${PDF_LABELS.therapistLabel} ${therapistName}` : "",
  ]
    .filter((text) => text !== "")
    .join("　");
}

/**
 * 全体メモの表示用の文字列と行数を求める
 *
 * @remarks
 * 1 文字を全角幅とみなして行数を多めに見積もる（ヘッダーの高さが足りなくなるのを防ぐ）。
 * 最大行数（PDF_OVERALL_NOTE_MAX_LINES）を超えた分は「…」で切り詰める。
 *
 * @param note - 全体メモ（前後の空白は除く）
 * @param contentWidth - ページのコンテンツ幅（ポイント単位）
 * @returns 表示用の文字列と行数（メモが空欄なら行数 0）
 */
export function getPdfOverallNoteLayout(
  note: string,
  contentWidth: number
): { text: string; lineCount: number } {
  const trimmed = note.trim();
  if (trimmed === "") return { text: "", lineCount: 0 };

  const textWidth =
    contentWidth -
    (PDF_SPACING.overallNotePadding + PDF_SPACING.overallNoteBorderWidth) * 2;
  const charsPerLine = estimateCharsPerLine(
    textWidth,
    PDF_SPACING.overallNoteFontSize,
    PDF_CHAR_WIDTH_RATIO.fullWidth
  );
  const text = truncateToLines(
    trimmed,
    PDF_OVERALL_NOTE_MAX_LINES,
    charsPerLine
  );
  const lineCount = text
    .split("\n")
    .reduce(
      (sum, line) => sum + (Math.ceil(line.length / charsPerLine) || 1),
      0
    );
  // 切り詰めたときに付く「…」の分で 1 行増えたように数えないよう、最大行数で抑える
  return {
    text,
    lineCount: Math.min(lineCount, PDF_OVERALL_NOTE_MAX_LINES),
  };
}

/**
 * 設定に応じた PDF ヘッダーの高さを求める
 *
 * @remarks
 * タイトル・日付欄・氏名欄の 1 行だけなら PDF_HEADER_HEIGHT（既定の設定では従来と同じ高さ）。
 * 施設名・担当者名の行と全体メモの枠を出すと、その分だけ高くなる。
 * A4 収容見積もりでも同じ計算を使う。
 *
 * @param settings - プロジェクト設定（ヘッダーの項目とページのコンテンツ幅に使う列数・用紙の向き）
 * @returns ヘッダーの高さ（ポイント単位）
 */
export function calculatePdfHeaderHeight(
  settings: Pick<
    ResolvedProjectSettings,
    "header" | "layoutType" | "pageOrientation"
  >
): number {
  const { header, layoutType, pageOrientation } = settings;
  const lineHeight =
    PDF_SPACING.headerSubTextFontSize * PDF_SPACING.headerSubLineHeight;
  let height = PDF_HEADER_HEIGHT;

  if (getPdfHeaderSubText(header) !== "") {
    height += PDF_SPACING.headerRowGap + lineHeight;
  }

  const { lineCount } = getPdfOverallNoteLayout(
    header.overallNote,
    getPdfContentSize(layoutType, pageOrientation).width
  );
  if (lineCount > 0) {
    height +=
      PDF_SPACING.headerRowGap +
      (PDF_SPACING.overallNotePadding + PDF_SPACING.overallNoteBorderWidth) *
        2 +
      lineCount *
        PDF_SPACING.overallNoteFontSize *
        PDF_SPACING.headerSubLineHeight;
  }

  return height;
}

/**
 * スライドのカードの大きさ（ポイント単位）
 */
export type PdfSlideCardSize = {
  /** 幅 */
  width: number;
  /** 高さ */
  height: number;
};

/**
 * スライドのカード内の寸法（ポイント単位）
 */
export type PdfSlideColumns = {
  /** カード内側の幅（枠線と余白を除く） */
  innerWidth: number;
  /** タイトル行の下の本体（左右の列）の高さ */
  bodyHeight: number;
  /** 左の列の幅（＝画像の幅） */
  leftColumnWidth: number;
  /** 画像の高さ */
  imageHeight: number;
  /** 右の列の幅 */
  rightColumnWidth: number;
};

/**
 * スライドの説明・注意点に出す行数の上限
 */
export type PdfSlideTextLines = {
  /** 説明の行数（説明が空なら 0） */
  descriptionLines: number;
  /** 注意点 1 件あたりの行数 */
  precautionLines: number;
};

/** スライドのカードの枠線と内側の余白（片側） */
const PDF_SLIDE_CARD_INSET =
  PDF_CARD_STYLE.borderWidth + PDF_CARD_STYLE.padding;

/** スライドのタイトル行の高さ（下の余白を含む。番号バッジの有無に関わらず同じ高さを確保する） */
const PDF_SLIDE_TITLE_ROW_HEIGHT =
  Math.max(
    FONT_SIZES_SLIDE.title * PDF_DEFAULT_LINE_HEIGHT,
    FONT_SIZES_SLIDE.title * CARD_NUMBER_BADGE_RATIO.size
  ) + PDF_SPACING.cardTitleMarginBottom;

/**
 * スライドの用量セクションに確保する高さ
 *
 * 用量の有無で左右の比率が変わらないよう、常にこの高さを確保する。
 * createDosageSection の外側の上余白と行の上余白、数値とラベルの 1 項目分の高さの和
 */
const PDF_SLIDE_DOSAGE_RESERVE_HEIGHT =
  PDF_SPACING.dosageContainerMarginTop * 2 +
  PDF_SPACING.dosagePaddingVertical * 2 +
  FONT_SIZES_SLIDE.dosageValue * PDF_DEFAULT_LINE_HEIGHT +
  PDF_SPACING.dosageLabelMarginTop +
  PDF_SPACING.dosageLabelPaddingTop +
  PDF_SPACING.dosageBorderWidth +
  FONT_SIZES_SLIDE.dosageLabel * PDF_DEFAULT_LINE_HEIGHT;

/** スライドで注意点の行数を減らすときの順（最初は縦型カードと同じ上限） */
const PDF_SLIDE_PRECAUTION_LINE_STEPS = [LINE_CLAMP.precaution, 2, 1] as const;

/**
 * ヘッダーの設定から、スライドのカードの大きさを求める
 *
 * @remarks
 * A4 横のコンテンツ領域から、ヘッダー・ヘッダーとの間隔・ページ下端の余裕を引いた大きさ。
 * ヘッダーは全ページに出すため、全ページで同じ大きさになる。キャンバスは縦横比にこの値を使う。
 *
 * @param settings - プロジェクト設定（ヘッダーの項目）
 * @returns カードの大きさ（ポイント単位）
 */
export function getPdfSlideCardSize(
  settings: Pick<ResolvedProjectSettings, "header">
): PdfSlideCardSize {
  const contentSize = getPdfContentSize("slide");
  const headerHeight = calculatePdfHeaderHeight({
    header: settings.header,
    layoutType: "slide",
    pageOrientation: "auto",
  });
  return {
    width: contentSize.width,
    height:
      contentSize.height -
      headerHeight -
      PDF_SLIDE.headerGap -
      PDF_SLIDE.pageBottomMargin,
  };
}

/**
 * スライドのカードの大きさから、左右の列の幅と画像の大きさを求める
 *
 * @remarks
 * 左の列（画像＋用量）は基本の比率の幅で 5:3 の画像を置く。ヘッダーが高く本体に収まらないときは、
 * 画像の高さを「本体の高さ − 用量の確保高さ」に抑え、5:3 のまま左の列を細くする（その分右の列が広がる）。
 *
 * @param cardSize - カードの大きさ（getPdfSlideCardSize）
 * @returns カード内の寸法（ポイント単位）
 */
export function getPdfSlideColumns(
  cardSize: PdfSlideCardSize
): PdfSlideColumns {
  const innerWidth = cardSize.width - PDF_SLIDE_CARD_INSET * 2;
  const bodyHeight =
    cardSize.height - PDF_SLIDE_CARD_INSET * 2 - PDF_SLIDE_TITLE_ROW_HEIGHT;
  const baseLeftWidth =
    (innerWidth - PDF_SLIDE.columnGap) * PDF_SLIDE.imageColumnRatio;
  const imageHeight = Math.min(
    baseLeftWidth / PDF_IMAGE_ASPECT_RATIO,
    bodyHeight - PDF_SLIDE_DOSAGE_RESERVE_HEIGHT
  );
  const leftColumnWidth = imageHeight * PDF_IMAGE_ASPECT_RATIO;
  return {
    innerWidth,
    bodyHeight,
    leftColumnWidth,
    imageHeight,
    rightColumnWidth: innerWidth - PDF_SLIDE.columnGap - leftColumnWidth,
  };
}

/**
 * 注意点の枠の幅から、枠の中の文字を置ける幅を求める
 *
 * @param boxWidth - 注意点の枠の幅（ポイント単位）
 * @param printColorMode - 印刷の色づかい（白黒は枠線を引く）
 * @returns 文字を置ける幅（ポイント単位）
 */
export function getPdfPrecautionTextWidth(
  boxWidth: number,
  printColorMode: PrintColorMode
): number {
  const borderWidth =
    printColorMode === "monochrome" ? PDF_SPACING.precautionBorderWidth : 0;
  return boxWidth - (PDF_SPACING.precautionPadding + borderWidth) * 2;
}

/**
 * 注意点 1 件を行頭の「•」付きの文字列にする
 *
 * @param value - 注意点
 * @returns 「• 注意点」形式の文字列（最大文字数で切る）
 */
function toPdfPrecautionLine(value: string): string {
  return `• ${value.slice(0, TEXT_LIMITS.precaution)}`;
}

/**
 * スライドの説明・注意点に出す行数の上限を求める
 *
 * @remarks
 * 右の列（本体の高さ）に必ず収まるよう、次の順で行数を決める。
 * 1. 注意点 1 件あたり 3 行で、残りの高さに入るだけ説明を出す（最大 10 行）
 * 2. 説明が 3 行（説明がそれより短ければその行数）に届かなければ、注意点を 2 行、1 行と減らす
 * 3. それでも届かなければ、説明を 1 行まで減らす
 * PDF とキャンバスの両方で同じ結果を使う。
 *
 * @param item - エディタアイテム（説明・注意点）
 * @param settings - プロジェクト設定（ヘッダーの項目と印刷の色づかい）
 * @returns 説明と注意点 1 件あたりの行数
 */
export function getSlideTextLines(
  item: Pick<EditorItem, "description" | "precautions">,
  settings: Pick<ResolvedProjectSettings, "header" | "printColorMode">
): PdfSlideTextLines {
  const { bodyHeight, rightColumnWidth } = getPdfSlideColumns(
    getPdfSlideCardSize(settings)
  );
  const fontSizes = FONT_SIZES_SLIDE;
  const descriptionLineHeight =
    fontSizes.description * PDF_SPACING.descriptionLineHeight;
  const hasDescription = item.description !== "";
  const actualDescriptionLines = hasDescription
    ? countPdfTextLines(
        item.description.slice(0, TEXT_LIMITS.description),
        rightColumnWidth,
        fontSizes.description,
        PDF_HALF_WIDTH_CHAR_RATIO.regular
      )
    : 0;

  const precautions = item.precautions ?? [];
  const precautionTextWidth = getPdfPrecautionTextWidth(
    rightColumnWidth,
    settings.printColorMode
  );
  const precautionLineCounts = precautions.map((p) =>
    countPdfTextLines(
      toPdfPrecautionLine(p.value),
      precautionTextWidth,
      fontSizes.precautionText,
      PDF_HALF_WIDTH_CHAR_RATIO.regular
    )
  );
  // 枠の内側の余白と枠線（白黒のみ）の和（片側）
  const precautionBoxInset = (rightColumnWidth - precautionTextWidth) / 2;

  /**
   * 注意点 1 件あたりの行数を maxLines にしたときの、注意点の枠の高さ（上の余白を含む）
   *
   * @param maxLines - 注意点 1 件あたりの行数
   * @returns 高さ（ポイント単位。注意点がなければ 0）
   */
  const getPrecautionHeight = (maxLines: number): number => {
    if (precautions.length === 0) return 0;
    const textLines = precautionLineCounts.reduce(
      (sum, lines) => sum + Math.min(lines, maxLines),
      0
    );
    return (
      (hasDescription ? PDF_SPACING.precautionMarginTop : 0) +
      precautionBoxInset * 2 +
      fontSizes.precautionTitle * PDF_DEFAULT_LINE_HEIGHT +
      PDF_SPACING.precautionTitleMarginBottom +
      textLines * fontSizes.precautionText * PDF_SPACING.precautionLineHeight
    );
  };

  /**
   * 注意点の行数を maxLines にしたときに出せる説明の行数
   *
   * @param maxLines - 注意点 1 件あたりの行数
   * @returns 説明の行数
   */
  const getDescriptionLines = (maxLines: number): number =>
    Math.min(
      actualDescriptionLines,
      PDF_SLIDE.descriptionMaxLines,
      Math.floor(
        (bodyHeight - getPrecautionHeight(maxLines)) / descriptionLineHeight
      )
    );

  const wantedLines = Math.min(
    actualDescriptionLines,
    PDF_SLIDE.descriptionMinLines
  );
  for (const precautionLines of PDF_SLIDE_PRECAUTION_LINE_STEPS) {
    const descriptionLines = getDescriptionLines(precautionLines);
    if (descriptionLines >= wantedLines) {
      return { descriptionLines, precautionLines };
    }
  }
  return {
    descriptionLines: hasDescription ? Math.max(1, getDescriptionLines(1)) : 0,
    precautionLines: 1,
  };
}

/**
 * スライドの説明に出す文字列を作る（行数の上限で切り詰める）
 *
 * @param description - 説明
 * @param maxLines - 行数の上限（getSlideTextLines）
 * @param width - 右の列の幅（ポイント単位）
 * @returns 表示する文字列
 */
export function getPdfSlideDescriptionText(
  description: string,
  maxLines: number,
  width: number
): string {
  return fitPdfTextToLines(
    description.slice(0, TEXT_LIMITS.description),
    maxLines,
    width,
    FONT_SIZES_SLIDE.description,
    PDF_HALF_WIDTH_CHAR_RATIO.regular
  );
}

/**
 * スライドの注意点 1 件に出す文字列を作る（行頭の「•」付き、行数の上限で切り詰める）
 *
 * @param value - 注意点
 * @param maxLines - 行数の上限（getSlideTextLines）
 * @param textWidth - 注意点の枠の中の幅（ポイント単位。getPdfPrecautionTextWidth）
 * @returns 表示する文字列
 */
export function getPdfSlidePrecautionText(
  value: string,
  maxLines: number,
  textWidth: number
): string {
  return fitPdfTextToLines(
    toPdfPrecautionLine(value),
    maxLines,
    textWidth,
    FONT_SIZES_SLIDE.precautionText,
    PDF_HALF_WIDTH_CHAR_RATIO.regular
  );
}
