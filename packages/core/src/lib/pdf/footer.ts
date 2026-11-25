/**
 * PDFフッター（ページ番号）要素の生成
 */

import { Text } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";

import { pdfStyles as styles } from "./styles";

/**
 * ページ番号の文字列を作る
 *
 * @param pageNumber - 現在のページ番号（1 始まり）
 * @param totalPages - 総ページ数
 * @returns 「1 / 2」形式の文字列（1 ページだけのときは空文字）
 */
export function formatPageNumber(
  pageNumber: number,
  totalPages: number
): string {
  if (totalPages <= 1) return "";
  return `${String(pageNumber)} / ${String(totalPages)}`;
}

/**
 * ページ番号のフッター要素を生成する
 *
 * fixed 指定で、カードが次のページへ送られたときも全ページの下マージン内に描画する。
 * 1 ページだけのときは何も表示しない。
 *
 * @returns フッター要素（各 Page の子に置く）
 */
export function createFooter(): ReactElement {
  return createElement(Text, {
    key: "footer",
    fixed: true,
    style: styles.footer,
    render: ({
      pageNumber,
      totalPages,
    }: {
      pageNumber: number;
      totalPages: number;
    }) => formatPageNumber(pageNumber, totalPages),
  });
}
