/**
 * PDFヘッダー要素の生成
 */

import { Text, View } from "@react-pdf/renderer";
import { PDF_LABELS } from "@rehab-grid/core/lib/constants";
import { createElement, type ReactElement } from "react";

import { pdfStyles as styles } from "./styles";

/**
 * ヘッダー要素を生成する
 *
 * タイトルと氏名欄を1行で横並びに表示する。タイトルが空欄の場合は氏名欄のみ。
 * 氏名欄は印刷後に手書きする前提の空枠で、患者氏名は印字しない。
 *
 * @param title - プロジェクト名（前後の空白は除去して表示）
 * @returns ヘッダー要素
 */
export function createHeader(title: string): ReactElement {
  const displayTitle = title.trim();
  const rowChildren: ReactElement[] = [];

  // タイトルが空でない場合のみ表示（氏名欄との間に空白を入れる）
  if (displayTitle) {
    rowChildren.push(
      createElement(
        Text,
        { key: "title", style: styles.headerTitle },
        displayTitle
      )
    );
    rowChildren.push(
      createElement(Text, { key: "space", style: styles.headerTitle }, "   ")
    );
  }

  // 氏名欄（常に表示）
  rowChildren.push(
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

  return createElement(
    View,
    { style: styles.header },
    createElement(View, { key: "row", style: styles.headerRow }, ...rowChildren)
  );
}
