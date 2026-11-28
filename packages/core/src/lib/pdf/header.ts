/**
 * PDFヘッダー要素の生成
 */

import { Text, View } from "@react-pdf/renderer";
import { PDF_LABELS } from "@rehab-grid/core/lib/constants";
import {
  type SheetDateMode,
  type SheetHeaderSettings,
} from "@rehab-grid/core/types";
import { formatJapaneseDate } from "@rehab-grid/core/utils/date";
import { createElement, type ReactElement } from "react";

import { pdfStyles as styles } from "./styles";

/**
 * 1 行目に並べる要素どうしの間の空白
 *
 * @param key - 要素のキー
 * @returns 空白の Text 要素
 */
function createSpacer(key: string): ReactElement {
  return createElement(Text, { key, style: styles.headerTitle }, "   ");
}

/**
 * 日付欄を生成する（記入欄は空枠、印字は出力日）
 *
 * @param dateMode - 日付欄の種類（"none" 以外）
 * @param outputDate - 出力日
 * @returns 日付欄の要素
 */
function createDateField(
  dateMode: Exclude<SheetDateMode, "none">,
  outputDate: Date
): ReactElement {
  return createElement(
    View,
    { key: "date", style: styles.patientInfo },
    createElement(Text, { style: styles.patientLabel }, PDF_LABELS.dateLabel),
    dateMode === "blank"
      ? createElement(View, { style: styles.dateBox })
      : createElement(
          Text,
          { style: styles.dateText },
          formatJapaneseDate(outputDate)
        )
  );
}

/**
 * ヘッダー要素を生成する
 *
 * 1 行にタイトル・日付欄・氏名欄を並べる。
 * 氏名欄・日付の記入欄は印刷後に手書きする前提の空枠で、患者氏名は印字しない。
 *
 * @param title - プロジェクト名（前後の空白は除去して表示）
 * @param header - ヘッダーの項目（氏名欄・日付欄）
 * @param outputDate - 出力日（日付欄を「出力日を印字」にしたときに使う）
 * @returns ヘッダー要素
 */
export function createHeader(
  title: string,
  header: SheetHeaderSettings,
  outputDate: Date
): ReactElement {
  const displayTitle = title.trim();

  // 1 行目のタイトルの後ろに並べる欄（記入欄どうしの間には空白を入れる）
  const fields: ReactElement[] = [];
  if (header.dateMode !== "none") {
    fields.push(createDateField(header.dateMode, outputDate));
  }
  if (header.showPatientNameBox) {
    fields.push(
      createElement(
        View,
        { key: "patientInfo", style: styles.patientInfo },
        createElement(
          Text,
          { style: styles.patientLabel },
          PDF_LABELS.patientLabel
        ),
        createElement(View, { style: styles.patientNameBox })
      )
    );
  }

  const rowChildren: ReactElement[] = [];
  if (displayTitle) {
    rowChildren.push(
      createElement(
        Text,
        { key: "title", style: styles.headerTitle },
        displayTitle
      )
    );
  }
  fields.forEach((field, index) => {
    if (rowChildren.length > 0) {
      rowChildren.push(createSpacer(index === 0 ? "space" : `space-${index}`));
    }
    rowChildren.push(field);
  });

  return createElement(
    View,
    { style: styles.header },
    createElement(View, { key: "row", style: styles.headerRow }, ...rowChildren)
  );
}
