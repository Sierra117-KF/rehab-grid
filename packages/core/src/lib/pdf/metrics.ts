/**
 * PDFカードの寸法・フォントサイズ計算
 *
 * 文字サイズ変更や A4 収容見積もりなど、描画以外の箇所からも同じ計算を使えるよう
 * カード生成処理から切り出している
 */

import {
  CARD_NUMBER_BADGE_RATIO,
  FONT_SIZES_LARGE,
  FONT_SIZES_SINGLE_COLUMN,
  getPdfContentSize,
  PDF_CARD_STYLE,
  PDF_CHAR_WIDTH_RATIO,
  PDF_HEADER_HEIGHT,
  PDF_IMAGE_ASPECT_RATIO,
  PDF_LABELS,
  PDF_OVERALL_NOTE_MAX_LINES,
  PDF_SPACING,
  PDF_TEXT_STYLE,
} from "@rehab-grid/core/lib/constants";
import {
  type LayoutType,
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
