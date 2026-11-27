/**
 * PDF の A4 ページ収容の見積もり
 *
 * カードの文字数・設定から、PDF が何ページになり、どのカードから次のページになるかを見積もる。
 * 描画（card.ts / document.ts）と同じ寸法・余白の規則で高さを足し合わせる。
 * 画像の中身には依存しないため（画像の枠の大きさは一定）、エディタ上で同期的に計算できる。
 *
 * @remarks
 * `@react-pdf/renderer` に依存しないため、メインスレッドから直接読み込んでよい
 * （`@rehab-grid/core/lib/pdf/layout`）。
 */

import {
  getPdfContentSize,
  LAYOUT_COLUMNS,
  PDF_CARD_STYLE,
  PDF_CHECK_TABLE,
  PDF_DEFAULT_LINE_HEIGHT,
  PDF_GRID_GAP,
  PDF_HALF_WIDTH_CHAR_RATIO,
  PDF_PAGE_ESTIMATE_MARGIN,
  PDF_SPACING,
  TEXT_LIMITS,
} from "@rehab-grid/core/lib/constants";
import {
  type BadgeRow,
  type DosageLabels,
  type EditorItem,
  type ResolvedProjectSettings,
} from "@rehab-grid/core/types";
import { getDosageBadgeLayout } from "@rehab-grid/core/utils/editor";
import { calculatePdfCardWidth } from "@rehab-grid/core/utils/pdf";

import {
  calculatePdfHeaderHeight,
  countPdfTextLines,
  fitPdfFontSizeToSingleLine,
  getPdfCardDescriptionText,
  getPdfCardFontSizes,
  getPdfCardImageSize,
  getPdfCardNumberBadgeSize,
  getPdfCardPrecautionText,
  getPdfDosageItemWidth,
  type PdfCardFontSizes,
} from "./metrics";

/**
 * PDF のページ収容の見積もり結果
 */
export type PdfLayoutEstimate = {
  /** ページ数（実施チェック表のページを含む） */
  pageCount: number;
  /** カードを置くページごとの、先頭のカードの位置（並び順の 0 始まり。1 ページ目は常に 0） */
  firstCardIndexByPage: number[];
  /** 実施チェック表を置くページ（1 始まり。チェック表を出さないときは null） */
  checkTablePage: number | null;
};

/**
 * 用量 1 項目（数値と区切り線付きのラベル）の高さを見積もる
 *
 * @param value - 数値
 * @param label - ラベル
 * @param itemWidth - 項目の幅（ポイント単位）
 * @param fontSizes - カード内のフォントサイズ
 * @returns 高さ（ポイント単位）
 */
function estimateDosageItemHeight(
  value: string,
  label: string,
  itemWidth: number,
  fontSizes: PdfCardFontSizes
): number {
  const valueFontSize = fitPdfFontSizeToSingleLine(
    value,
    itemWidth,
    fontSizes.dosageValue,
    PDF_HALF_WIDTH_CHAR_RATIO.bold
  );
  const labelFontSize = fitPdfFontSizeToSingleLine(
    label,
    itemWidth,
    fontSizes.dosageLabel,
    PDF_HALF_WIDTH_CHAR_RATIO.regular
  );
  const valueLines = countPdfTextLines(
    value,
    itemWidth,
    valueFontSize,
    PDF_HALF_WIDTH_CHAR_RATIO.bold
  );
  const labelLines = countPdfTextLines(
    label,
    itemWidth,
    labelFontSize,
    PDF_HALF_WIDTH_CHAR_RATIO.regular
  );
  return (
    PDF_SPACING.dosagePaddingVertical * 2 +
    valueLines * valueFontSize * PDF_DEFAULT_LINE_HEIGHT +
    PDF_SPACING.dosageLabelMarginTop +
    PDF_SPACING.dosageLabelPaddingTop +
    PDF_SPACING.dosageBorderWidth +
    labelLines * labelFontSize * PDF_DEFAULT_LINE_HEIGHT
  );
}

/**
 * 用量の 1 行の高さを見積もる（行の上の余白を含む）
 *
 * @param row - 用量の行
 * @param contentWidth - カード内コンテンツの幅（ポイント単位）
 * @param fontSizes - カード内のフォントサイズ
 * @param labels - 用量のラベル
 * @returns 高さ（ポイント単位）
 */
function estimateDosageRowHeight(
  row: BadgeRow,
  contentWidth: number,
  fontSizes: PdfCardFontSizes,
  labels: DosageLabels
): number {
  // 4 列の頻度（横幅いっぱいの行）には行の上の余白がない（card.ts の createDosageSection）
  const marginTop = row.isFullWidth ? 0 : PDF_SPACING.dosageContainerMarginTop;
  const itemWidth = getPdfDosageItemWidth(contentWidth, row.badges.length);
  const itemHeights = row.badges
    .filter((badge) => badge.hasValue)
    .map((badge) =>
      estimateDosageItemHeight(
        badge.value.slice(0, TEXT_LIMITS[badge.type]),
        labels[badge.type],
        itemWidth,
        fontSizes
      )
    );
  return marginTop + Math.max(0, ...itemHeights);
}

/**
 * PDF カード 1 枚の高さを見積もる
 *
 * @param item - エディタアイテム
 * @param cardWidth - カードの幅（ポイント単位）
 * @param settings - プロジェクト設定
 * @returns 高さ（ポイント単位。カードの下の余白は含まない）
 */
export function estimatePdfCardHeight(
  item: EditorItem,
  cardWidth: number,
  settings: ResolvedProjectSettings
): number {
  const { layoutType, textScale, showCardNumbers, printColorMode } = settings;
  const { width: contentWidth, height: imageHeight } =
    getPdfCardImageSize(cardWidth);
  const fontSizes = getPdfCardFontSizes(layoutType, textScale);

  let height =
    (PDF_CARD_STYLE.borderWidth + PDF_CARD_STYLE.padding) * 2 + imageHeight;

  // タイトル（1 行に切り詰めている。番号バッジはタイトルの行より低い）
  const titleLineHeight = fontSizes.title * PDF_DEFAULT_LINE_HEIGHT;
  height +=
    PDF_SPACING.cardTitleMarginTop +
    Math.max(
      titleLineHeight,
      showCardNumbers ? getPdfCardNumberBadgeSize(fontSizes.title) : 0
    ) +
    PDF_SPACING.cardTitleMarginBottom;

  if (item.description) {
    const lines = countPdfTextLines(
      getPdfCardDescriptionText(
        item.description,
        contentWidth,
        fontSizes.description
      ),
      contentWidth,
      fontSizes.description,
      PDF_HALF_WIDTH_CHAR_RATIO.regular
    );
    height +=
      lines * fontSizes.description * PDF_SPACING.descriptionLineHeight;
  }

  const badgeRows = getDosageBadgeLayout(item.dosages, layoutType);
  if (badgeRows.length > 0) {
    height += PDF_SPACING.dosageContainerMarginTop;
    for (const row of badgeRows) {
      height += estimateDosageRowHeight(
        row,
        contentWidth,
        fontSizes,
        settings.dosageLabels
      );
    }
  }

  if (item.precautions && item.precautions.length > 0) {
    // 白黒モードは注意点を枠線で囲む
    const borderWidth =
      printColorMode === "monochrome" ? PDF_SPACING.precautionBorderWidth : 0;
    const textWidth =
      contentWidth - (PDF_SPACING.precautionPadding + borderWidth) * 2;
    height +=
      PDF_SPACING.precautionMarginTop +
      (PDF_SPACING.precautionPadding + borderWidth) * 2 +
      fontSizes.precautionTitle * PDF_DEFAULT_LINE_HEIGHT +
      PDF_SPACING.precautionTitleMarginBottom;
    for (const precaution of item.precautions) {
      const lines = countPdfTextLines(
        getPdfCardPrecautionText(
          precaution.value,
          contentWidth,
          fontSizes.precautionText
        ),
        textWidth,
        fontSizes.precautionText,
        PDF_HALF_WIDTH_CHAR_RATIO.regular
      );
      height +=
        lines * fontSizes.precautionText * PDF_SPACING.precautionLineHeight;
    }
  }

  return height;
}

/**
 * 1週間の実施チェック表の高さを見積もる
 *
 * @param itemCount - 運動の数（表の行数）
 * @returns 高さ（ポイント単位）
 */
function estimateWeeklyCheckTableHeight(itemCount: number): number {
  return (
    PDF_CHECK_TABLE.titleFontSize * PDF_DEFAULT_LINE_HEIGHT +
    PDF_CHECK_TABLE.titleMarginBottom +
    PDF_CHECK_TABLE.borderWidth +
    PDF_CHECK_TABLE.headerRowHeight +
    itemCount * PDF_CHECK_TABLE.rowHeight
  );
}

/**
 * スライド（1 ページ 1 運動）のページ数を求める
 *
 * カードの大きさは固定のため、文字数によらずカード 1 枚が 1 ページになる（カードがなければヘッダーだけの 1 ページ）。
 * 実施チェック表は 1週間・1か月とも最後の別ページに置く（document.ts の buildSlidePages）。
 *
 * @param itemCount - カードの枚数
 * @param checkTable - 実施チェック表の種類
 * @returns ページ収容の見積もり
 */
function estimateSlideLayout(
  itemCount: number,
  checkTable: ResolvedProjectSettings["checkTable"]
): PdfLayoutEstimate {
  const cardPageCount = Math.max(1, itemCount);
  const checkTablePage = checkTable === "none" ? null : cardPageCount + 1;
  return {
    pageCount: checkTablePage ?? cardPageCount,
    firstCardIndexByPage: Array.from(
      { length: cardPageCount },
      (_, index) => index
    ),
    checkTablePage,
  };
}

/**
 * PDF が何ページになるかを見積もる
 *
 * @remarks
 * カードは列数ごとの行にまとめられ、ページに収まらない行は丸ごと次のページへ送られる（document.ts）。
 * 行の高さはその行で最も高いカードで決まる。1 ページ目だけヘッダーの高さを差し引く。
 * 文字の折り返しは概算のため、ページ下端の PDF_PAGE_ESTIMATE_MARGIN 以内に掛かる行は次のページ扱いにする。
 * 1 ページより高い行（大きめの文字で説明・注意点が長いカードなど）は、react-pdf と同じく今のページに置く。
 * 1週間のチェック表はカードの後ろ、1か月のチェック表は常に別の 1 ページ。
 *
 * @param items - エディタアイテム（order の昇順に並べて見積もる）
 * @param settings - プロジェクト設定
 * @returns ページ収容の見積もり
 */
export function estimatePdfLayout(
  items: EditorItem[],
  settings: ResolvedProjectSettings
): PdfLayoutEstimate {
  const { layoutType, pageOrientation, checkTable } = settings;
  if (layoutType === "slide") {
    return estimateSlideLayout(items.length, checkTable);
  }

  const columns = LAYOUT_COLUMNS[layoutType];
  const cardWidth = calculatePdfCardWidth(layoutType, pageOrientation);
  const contentHeight = getPdfContentSize(layoutType, pageOrientation).height;
  const pageLimit = contentHeight - PDF_PAGE_ESTIMATE_MARGIN;
  const sortedItems = [...items].sort((a, b) => a.order - b.order);

  const firstCardIndexByPage = [0];
  // 現在のページで使った高さ（1 ページ目はヘッダーの分から始める）
  let used = calculatePdfHeaderHeight(settings);
  let rowsOnPage = 0;

  /**
   * 次の要素を現在のページに置き、収まらなければ次のページの先頭に置く
   *
   * @param height - 要素の高さ
   * @param gapBefore - 同じページの前の要素との間隔
   * @returns 次のページに送ったか
   */
  const place = (height: number, gapBefore: number): boolean => {
    // 1 ページの高さを超える要素は、react-pdf が今のページに押し込み（ページ内で縮む）、
    // 後ろの要素を次のページへ送る
    if (height > contentHeight) {
      used = contentHeight;
      return false;
    }
    const isPageEmpty = used === 0;
    if (!isPageEmpty && used + gapBefore + height > pageLimit) {
      used = height;
      return true;
    }
    used += (isPageEmpty ? 0 : gapBefore) + height;
    return false;
  };

  for (let start = 0; start < sortedItems.length; start += columns) {
    const rowItems = sortedItems.slice(start, start + columns);
    // カードの下の余白（marginBottom）も行の高さに含まれる
    const rowHeight =
      Math.max(
        ...rowItems.map((item) =>
          estimatePdfCardHeight(item, cardWidth, settings)
        )
      ) + PDF_GRID_GAP;
    const gapBefore = rowsOnPage > 0 ? PDF_GRID_GAP : 0;
    if (place(rowHeight, gapBefore)) {
      firstCardIndexByPage.push(start);
      rowsOnPage = 0;
    }
    rowsOnPage += 1;
  }

  let pageCount = firstCardIndexByPage.length;
  let checkTablePage: number | null = null;
  if (checkTable === "weekly") {
    if (place(estimateWeeklyCheckTableHeight(sortedItems.length), 0)) {
      pageCount += 1;
    }
    checkTablePage = pageCount;
  } else if (checkTable === "monthly") {
    pageCount += 1;
    checkTablePage = pageCount;
  }

  return { pageCount, firstCardIndexByPage, checkTablePage };
}
