/**
 * PDFドキュメント全体の組み立て
 */

import { Document, type DocumentProps, Page, View } from "@react-pdf/renderer";
import { getPdfPageSize } from "@rehab-grid/core/lib/constants";
import { resolveProjectSettings } from "@rehab-grid/core/lib/settings";
import { type PdfGenerationData } from "@rehab-grid/core/types";
import { calculatePdfCardWidth } from "@rehab-grid/core/utils/pdf";
import { createElement, type ReactElement } from "react";

import { createCard } from "./card";
import { createHeader } from "./header";
import { pdfStyles as styles } from "./styles";

/**
 * PDF生成データからPDFドキュメント全体の要素を生成する
 *
 * 1ページ目の先頭にヘッダーを置き、その下にカードを折り返しグリッドで並べる。
 * Worker へはメッセージ経由でデータが渡るため、設定の不正値はデフォルト値として扱う
 * （レイアウトタイプは grid2）。
 *
 * @param data - PDF生成に必要なデータ（メタ情報、設定、アイテム、画像等）
 * @returns react-pdf/renderer の Document 要素
 */
export function buildPdfDocument(
  data: PdfGenerationData
): ReactElement<DocumentProps> {
  const settings = resolveProjectSettings(data.settings);
  const cardWidth = calculatePdfCardWidth(settings.layoutType);
  const sortedItems = [...data.items].sort((a, b) => a.order - b.order);
  const pageSize = getPdfPageSize(settings.layoutType);

  const cards = sortedItems.map((item) =>
    createCard(
      item,
      cardWidth,
      item.imageSource ? data.images[item.imageSource] : undefined,
      settings
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
