/**
 * PDFドキュメント全体の組み立て
 */

import { Document, type DocumentProps, Page, View } from "@react-pdf/renderer";
import {
  getPdfContentSize,
  getPdfPageSize,
  LAYOUT_COLUMNS,
  PDF_COLORS,
  PDF_PAGE_SIZE_LANDSCAPE,
  PDF_SLIDE,
} from "@rehab-grid/core/lib/constants";
import { resolveProjectSettings } from "@rehab-grid/core/lib/settings";
import {
  type EditorItem,
  type PdfGenerationData,
  type PrintColorMode,
  type ResolvedProjectSettings,
} from "@rehab-grid/core/types";
import { calculatePdfCardWidth } from "@rehab-grid/core/utils/pdf";
import { createElement, type ReactElement } from "react";

import { createCard, createSlideCard } from "./card";
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
 * 1ページ目の先頭にヘッダーを置き、その下にカードを列数ごとの行にまとめて並べる。
 * 実施チェック表は、1週間ならカードの後ろに、1か月なら A4 横の別ページに置く。
 * スライドはカード 1 枚ごとにヘッダー付きの A4 横のページを作る（buildSlidePages）。
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
  const sortedItems = [...data.items].sort((a, b) => a.order - b.order);
  const pageStyle = getPdfPageStyle(printColorMode);

  if (layoutType === "slide") {
    return createElement(
      Document,
      null,
      ...buildSlidePages(data, sortedItems, settings, pageStyle, outputDate)
    ) as ReactElement<DocumentProps>;
  }

  const cardWidth = calculatePdfCardWidth(layoutType, pageOrientation);
  const pageSize = getPdfPageSize(layoutType, pageOrientation);

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

  // 列数ごとに行の View にまとめる。行は wrap={false} にし、ページに収まらなければ行ごと次のページへ送る
  // （A4 収容見積もり（layout.ts）と同じ規則で改ページさせるため）
  const columns = LAYOUT_COLUMNS[layoutType];
  const rows = Array.from(
    { length: Math.ceil(cards.length / columns) },
    (_, rowIndex) =>
      createElement(
        View,
        { key: `row-${String(rowIndex)}`, wrap: false, style: styles.gridRow },
        ...cards.slice(rowIndex * columns, (rowIndex + 1) * columns)
      )
  );

  const pageContent = [
    createHeader(data.meta.title, settings, outputDate),
    createElement(View, { key: "grid", style: styles.gridContainer }, ...rows),
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

  const pages: ReactElement[] = [
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
    pages.push(
      createMonthlyCheckTablePage(sortedItems, printColorMode, pageStyle)
    );
  }

  return createElement(
    Document,
    null,
    ...pages
  ) as ReactElement<DocumentProps>;
}

/** ページの Style（白黒モードでは背景色を変える） */
type PdfPageStyle = ReturnType<typeof getPdfPageStyle>;

/**
 * 印刷の色づかいに応じたページのスタイルを求める
 *
 * 白黒モードはトナーを節約するため、ページ背景の薄いグレーもなくす
 *
 * @param printColorMode - 印刷の色づかい
 * @returns ページのスタイル
 */
function getPdfPageStyle(printColorMode: PrintColorMode) {
  return printColorMode === "monochrome"
    ? { ...styles.page, backgroundColor: PDF_COLORS.monochromeBackground }
    : styles.page;
}

/**
 * A4 横のページ要素を生成する
 *
 * @param key - React の key
 * @param pageStyle - ページのスタイル
 * @param children - ページの中身
 * @returns Page 要素
 */
function createLandscapePage(
  key: string,
  pageStyle: PdfPageStyle,
  ...children: ReactElement[]
): ReactElement {
  return createElement(
    Page,
    {
      key,
      size: [PDF_PAGE_SIZE_LANDSCAPE.width, PDF_PAGE_SIZE_LANDSCAPE.height],
      style: pageStyle,
    },
    ...children
  );
}

/**
 * 1か月の実施チェック表のページを生成する
 *
 * 31 日分の列は縦向きに入らないため、カードの向きに関わらず A4 横にする
 *
 * @param sortedItems - 並び順に並べたエディタアイテム
 * @param printColorMode - 印刷の色づかい
 * @param pageStyle - ページのスタイル
 * @returns Page 要素
 */
function createMonthlyCheckTablePage(
  sortedItems: EditorItem[],
  printColorMode: PrintColorMode,
  pageStyle: PdfPageStyle
): ReactElement {
  return createLandscapePage(
    "monthlyCheckTable",
    pageStyle,
    createMonthlyCheckTable(sortedItems, printColorMode),
    createFooter()
  );
}

/**
 * スライド（A4 横・1 ページ 1 運動）のページを生成する
 *
 * カード 1 枚ごとに、ヘッダー・カード・ページ番号の A4 横のページを作る（ヘッダーは全ページに出す）。
 * カードがなければヘッダーだけのページを 1 枚作る。
 * 1週間のチェック表はスライドのページに余白がないため、ヘッダー付きの別ページに置く。
 *
 * @param data - PDF生成に必要なデータ（メタ情報・画像）
 * @param sortedItems - 並び順に並べたエディタアイテム
 * @param settings - プロジェクト設定
 * @param pageStyle - ページのスタイル
 * @param outputDate - 出力日
 * @returns Page 要素の配列
 */
function buildSlidePages(
  data: PdfGenerationData,
  sortedItems: EditorItem[],
  settings: ResolvedProjectSettings,
  pageStyle: PdfPageStyle,
  outputDate: Date
): ReactElement[] {
  const { printColorMode, checkTable } = settings;
  const createHeaderBlock = (): ReactElement[] => [
    createHeader(data.meta.title, settings, outputDate),
    createElement(View, {
      key: "headerGap",
      style: { height: PDF_SLIDE.headerGap },
    }),
  ];

  // カード番号は並び順の連番にする（インポートしたデータの order が飛んでいても 1 から振る）
  const pages = sortedItems.map((item, index) =>
    createLandscapePage(
      `slide-${item.id}`,
      pageStyle,
      ...createHeaderBlock(),
      createSlideCard(
        item,
        item.imageSource ? data.images[item.imageSource] : undefined,
        settings,
        index + 1
      ),
      createFooter()
    )
  );
  if (pages.length === 0) {
    pages.push(
      createLandscapePage(
        "slide-empty",
        pageStyle,
        ...createHeaderBlock(),
        createFooter()
      )
    );
  }

  if (checkTable === "weekly") {
    pages.push(
      createLandscapePage(
        "weeklyCheckTable",
        pageStyle,
        ...createHeaderBlock(),
        createWeeklyCheckTable(
          sortedItems,
          getPdfContentSize("slide").width,
          printColorMode
        ),
        createFooter()
      )
    );
  } else if (checkTable === "monthly") {
    pages.push(
      createMonthlyCheckTablePage(sortedItems, printColorMode, pageStyle)
    );
  }

  return pages;
}
