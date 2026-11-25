/**
 * PDFドキュメント全体の組み立て
 */

import { Document, type DocumentProps, Page, View } from "@react-pdf/renderer";
import {
  getPdfContentSize,
  getPdfPageSize,
  PDF_COLORS,
  PDF_PAGE_SIZE_LANDSCAPE,
} from "@rehab-grid/core/lib/constants";
import { resolveProjectSettings } from "@rehab-grid/core/lib/settings";
import { type PdfGenerationData } from "@rehab-grid/core/types";
import { calculatePdfCardWidth } from "@rehab-grid/core/utils/pdf";
import { createElement, type ReactElement } from "react";

import { createCard } from "./card";
import {
  createMonthlyCheckTable,
  createWeeklyCheckTable,
} from "./checkTable";
import { createFooter } from "./footer";
import { createHeader } from "./header";
import { pdfStyles as styles } from "./styles";

/**
 * PDF生成データからPDFドキュメント全体の要素を生成する
 *
 * 1ページ目の先頭にヘッダーを置き、その下にカードを折り返しグリッドで並べる。
 * 実施チェック表は、1週間ならカードの後ろに、1か月なら A4 横の別ページに置く。
 * 2 ページ以上になるときは全ページの下端にページ番号を出す。
 * Worker へはメッセージ経由でデータが渡るため、設定の不正値はデフォルト値として扱う
 * （レイアウトタイプは grid2）。
 *
 * @param data - PDF生成に必要なデータ（メタ情報、設定、アイテム、画像等）
 * @param outputDate - 出力日（ヘッダーの日付欄を「出力日を印字」にしたときに使う。省略時は現在）
 * @returns react-pdf/renderer の Document 要素
 */
export function buildPdfDocument(
  data: PdfGenerationData,
  outputDate: Date = new Date()
): ReactElement<DocumentProps> {
  const settings = resolveProjectSettings(data.settings);
  const { layoutType, pageOrientation, printColorMode, checkTable } = settings;
  const cardWidth = calculatePdfCardWidth(layoutType, pageOrientation);
  const sortedItems = [...data.items].sort((a, b) => a.order - b.order);
  const pageSize = getPdfPageSize(layoutType, pageOrientation);
  // 白黒モードはトナーを節約するため、ページ背景の薄いグレーもなくす
  const pageStyle =
    printColorMode === "monochrome"
      ? { ...styles.page, backgroundColor: PDF_COLORS.monochromeBackground }
      : styles.page;

  // カード番号は並び順の連番にする（インポートしたデータの order が飛んでいても 1 から振る）
  const cards = sortedItems.map((item, index) =>
    createCard(
      item,
      cardWidth,
      item.imageSource ? data.images[item.imageSource] : undefined,
      settings,
      index + 1
    )
  );

  const pageContent = [
    createHeader(data.meta.title, settings, outputDate),
    createElement(View, { key: "grid", style: styles.gridContainer }, ...cards),
  ];
  if (checkTable === "weekly") {
    pageContent.push(
      createWeeklyCheckTable(
        sortedItems,
        getPdfContentSize(layoutType, pageOrientation).width,
        printColorMode
      )
    );
  }
  pageContent.push(createFooter());

  const pages = [
    createElement(
      Page,
      {
        key: "cards",
        size: [pageSize.width, pageSize.height],
        style: pageStyle,
      },
      ...pageContent
    ),
  ];
  if (checkTable === "monthly") {
    // 31 日分の列は縦向きに入らないため、カードの向きに関わらず A4 横にする
    pages.push(
      createElement(
        Page,
        {
          key: "monthlyCheckTable",
          size: [PDF_PAGE_SIZE_LANDSCAPE.width, PDF_PAGE_SIZE_LANDSCAPE.height],
          style: pageStyle,
        },
        createMonthlyCheckTable(sortedItems, printColorMode),
        createFooter()
      )
    );
  }

  return createElement(
    Document,
    null,
    ...pages
  ) as ReactElement<DocumentProps>;
}
