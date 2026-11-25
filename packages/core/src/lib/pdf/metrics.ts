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
  PDF_CARD_STYLE,
  PDF_IMAGE_ASPECT_RATIO,
  PDF_SPACING,
  PDF_TEXT_STYLE,
} from "@rehab-grid/core/lib/constants";
import { type LayoutType, type TextScale } from "@rehab-grid/core/types";

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
