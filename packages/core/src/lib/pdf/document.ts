/**
 * PDFドキュメント全体の組み立て
 */

import { Document, type DocumentProps, Page, View } from "@react-pdf/renderer";
import { getPdfPageSize, LAYOUT_COLUMNS } from "@rehab-grid/core/lib/constants";
import {
  type LayoutType,
  type PdfGenerationData,
} from "@rehab-grid/core/types";
import { calculatePdfCardWidth } from "@rehab-grid/core/utils/pdf";
import { createElement, type ReactElement } from "react";

import { createCard } from "./card";
import { createHeader } from "./header";
import { pdfStyles as styles } from "./styles";

/**
 * 文字列が LayoutType かどうかを判定する型ガード
 *
 * Worker へはメッセージ経由でデータが渡るため、実行時に検証する
 *
 * @param value - 判定する文字列
 * @returns value が LayoutType の場合 true
 */
export function isLayoutType(value: string): value is LayoutType {
  return value in LAYOUT_COLUMNS;
}

/**
 * PDF生成データからPDFドキュメント全体の要素を生成する
 *
 * 1ページ目の先頭にヘッダーを置き、その下にカードを折り返しグリッドで並べる。
 * レイアウトタイプが不正な場合は grid2 として扱う。
 *
 * @param data - PDF生成に必要なデータ（メタ情報、アイテム、画像等）
 * @returns react-pdf/renderer の Document 要素
 */
export function buildPdfDocument(
  data: PdfGenerationData
): ReactElement<DocumentProps> {
  const layoutType: LayoutType = isLayoutType(data.layoutType)
    ? data.layoutType
    : "grid2";
  const cardWidth = calculatePdfCardWidth(layoutType);
  const sortedItems = [...data.items].sort((a, b) => a.order - b.order);
  const pageSize = getPdfPageSize(layoutType);

  const cards = sortedItems.map((item) =>
    createCard(
      item,
      cardWidth,
      item.imageSource ? data.images[item.imageSource] : undefined,
      layoutType
    )
  );

  const pageContent = [
    createHeader(data.meta.title),
    createElement(View, { key: "grid", style: styles.gridContainer }, ...cards),
  ];

  return createElement(
    Document,
    null,
    createElement(
      Page,
      { size: [pageSize.width, pageSize.height], style: styles.page },
      ...pageContent
    )
  ) as ReactElement<DocumentProps>;
}
