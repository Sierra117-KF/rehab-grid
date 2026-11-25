/**
 * 自主トレ実施チェック表の要素の生成
 */

import { Text, View } from "@react-pdf/renderer";
import {
  CHECK_TABLE_MONTH_DAYS,
  CHECK_TABLE_WEEKDAYS,
  LABELS,
  PDF_CHAR_WIDTH_RATIO,
  PDF_CHECK_TABLE,
  PDF_COLORS,
  PDF_CONTENT_SIZE_LANDSCAPE,
  PDF_LABELS,
} from "@rehab-grid/core/lib/constants";
import {
  type EditorItem,
  type PrintColorMode,
} from "@rehab-grid/core/types";
import { truncateToLines } from "@rehab-grid/core/utils/pdf";
import { createElement, type ReactElement } from "react";

import { estimateCharsPerLine } from "./metrics";
import { pdfStyles as styles } from "./styles";

/**
 * チェック表の列の構成
 */
type CheckTableColumns = {
  /** 見出し */
  title: string;
  /** 運動名の列の幅（ポイント単位） */
  nameColumnWidth: number;
  /** チェック欄の列の見出し（曜日・日付） */
  columnLabels: readonly string[];
  /** チェック欄の見出しのフォントサイズ */
  columnLabelFontSize: number;
};

/**
 * チェック表 1 マス分の要素を生成する
 *
 * @param key - 要素のキー
 * @param width - マスの幅（ポイント単位）
 * @param height - マスの高さ（ポイント単位）
 * @param child - マスの中身（空欄なら省略）
 * @param backgroundColor - 背景色（省略時は表の背景のまま）
 * @returns マスの要素
 */
function createCell(
  key: string,
  width: number,
  height: number,
  child?: ReactElement,
  backgroundColor?: string
): ReactElement {
  return createElement(
    View,
    {
      key,
      style: {
        ...styles.checkTableCell,
        width,
        height,
        ...(backgroundColor !== undefined ? { backgroundColor } : {}),
      },
    },
    child
  );
}

/**
 * 実施チェック表を生成する（運動名の行 × 曜日・日付の列）
 *
 * 表全体を wrap={false} にし、ページに収まらなければ表ごと次のページへ送る。
 *
 * @param items - 運動カード（並び順にソート済み）
 * @param contentWidth - 表を置く領域の幅（ポイント単位）
 * @param columns - 列の構成
 * @param printColorMode - 印刷の色づかい（白黒では見出し行を塗りつぶさない）
 * @returns チェック表の要素
 */
function createCheckTable(
  items: EditorItem[],
  contentWidth: number,
  columns: CheckTableColumns,
  printColorMode: PrintColorMode
): ReactElement {
  const { nameColumnWidth, columnLabels } = columns;
  const cellWidth = (contentWidth - nameColumnWidth) / columnLabels.length;
  const headerBackground =
    printColorMode === "monochrome"
      ? undefined
      : PDF_COLORS.checkTableHeaderBackground;
  // 運動名は 1 行に収める（全角幅で見積もり、はみ出して 2 行にならないようにする）
  const nameCharsPerLine = estimateCharsPerLine(
    nameColumnWidth - PDF_CHECK_TABLE.cellPaddingHorizontal * 2,
    PDF_CHECK_TABLE.nameFontSize,
    PDF_CHAR_WIDTH_RATIO.fullWidth
  );
  const columnLabelStyle = {
    ...styles.checkTableColumnLabel,
    fontSize: columns.columnLabelFontSize,
  };

  const headerRow = createElement(
    View,
    { key: "header", style: styles.checkTableRow },
    createCell(
      "name",
      nameColumnWidth,
      PDF_CHECK_TABLE.headerRowHeight,
      createElement(
        Text,
        { style: columnLabelStyle },
        PDF_LABELS.checkTableExerciseHeader
      ),
      headerBackground
    ),
    ...columnLabels.map((label, index) =>
      createCell(
        `column-${String(index)}`,
        cellWidth,
        PDF_CHECK_TABLE.headerRowHeight,
        createElement(Text, { style: columnLabelStyle }, label),
        headerBackground
      )
    )
  );

  const itemRows = items.map((item) =>
    createElement(
      View,
      { key: item.id, style: styles.checkTableRow },
      createCell(
        "name",
        nameColumnWidth,
        PDF_CHECK_TABLE.rowHeight,
        createElement(
          Text,
          { style: styles.checkTableName },
          truncateToLines(
            item.title.trim() || LABELS.untitledExercise,
            1,
            nameCharsPerLine
          )
        )
      ),
      ...columnLabels.map((_, index) =>
        createCell(`check-${String(index)}`, cellWidth, PDF_CHECK_TABLE.rowHeight)
      )
    )
  );

  return createElement(
    View,
    { key: "checkTable", wrap: false },
    createElement(
      View,
      { style: styles.checkTableTitleRow },
      createElement(Text, { style: styles.checkTableTitle }, columns.title),
      createElement(
        Text,
        { style: styles.checkTableHint },
        PDF_LABELS.checkTableHint
      )
    ),
    createElement(
      View,
      { style: { ...styles.checkTable, width: contentWidth } },
      headerRow,
      ...itemRows
    )
  );
}

/**
 * 1週間の実施チェック表（運動名 × 月〜日）を生成する
 *
 * カードの後ろに置く。
 *
 * @param items - 運動カード（並び順にソート済み）
 * @param contentWidth - ページのコンテンツ幅（ポイント単位）
 * @param printColorMode - 印刷の色づかい
 * @returns チェック表の要素
 */
export function createWeeklyCheckTable(
  items: EditorItem[],
  contentWidth: number,
  printColorMode: PrintColorMode
): ReactElement {
  return createCheckTable(
    items,
    contentWidth,
    {
      title: PDF_LABELS.weeklyCheckTableTitle,
      nameColumnWidth: contentWidth * PDF_CHECK_TABLE.weeklyNameColumnRatio,
      columnLabels: CHECK_TABLE_WEEKDAYS,
      columnLabelFontSize: PDF_CHECK_TABLE.columnLabelFontSize,
    },
    printColorMode
  );
}

/** 1か月の表の列の見出し（1〜31） */
const MONTH_DAY_LABELS: readonly string[] = Array.from(
  { length: CHECK_TABLE_MONTH_DAYS },
  (_, index) => String(index + 1)
);

/**
 * 1か月の実施チェック表（運動名 × 1〜31日）を生成する
 *
 * 31 列は縦向きに入らないため、A4 横の別ページに置く（ページは document.ts で作る）。
 *
 * @param items - 運動カード（並び順にソート済み）
 * @param printColorMode - 印刷の色づかい
 * @returns チェック表の要素
 */
export function createMonthlyCheckTable(
  items: EditorItem[],
  printColorMode: PrintColorMode
): ReactElement {
  return createCheckTable(
    items,
    PDF_CONTENT_SIZE_LANDSCAPE.width,
    {
      title: PDF_LABELS.monthlyCheckTableTitle,
      nameColumnWidth: PDF_CHECK_TABLE.monthlyNameColumnWidth,
      columnLabels: MONTH_DAY_LABELS,
      columnLabelFontSize: PDF_CHECK_TABLE.monthlyColumnLabelFontSize,
    },
    printColorMode
  );
}
