/**
 * PDF生成関連のユーティリティ関数
 */

import {
  getPdfContentSize,
  LAYOUT_COLUMNS,
  PDF_GRID_GAP,
} from "@rehab-grid/core/lib/constants";
import { db } from "@rehab-grid/core/lib/db";
import {
  type EditorItem,
  type LayoutType,
  type PdfGenerationData,
  type ProjectMeta,
} from "@rehab-grid/core/types";

import {
  convertBlobToPdfSupportedDataUrl,
  fetchSampleImageBlobs,
  partitionImageIds,
} from "./image";

/**
 * レイアウトタイプに応じたPDFカード幅を計算
 *
 * @remarks
 * 3列以上のレイアウトでは横向きページを使用するため、
 * コンテンツ幅が広くなりカード幅も大きくなる
 *
 * @param layoutType - グリッドレイアウトタイプ
 * @returns カード幅（ポイント単位）
 */
export function calculatePdfCardWidth(layoutType: LayoutType): number {
  const columns = LAYOUT_COLUMNS[layoutType];
  const totalGapWidth = PDF_GRID_GAP * (columns - 1);
  const contentSize = getPdfContentSize(layoutType);
  return (contentSize.width - totalGapWidth) / columns;
}

/**
 * テキストを指定行数に制限する（PDF用line-clamp相当）
 *
 * @remarks
 * - 改行を考慮しつつ、概算文字数で行数を制限
 * - 制限を超える場合は末尾に「…」を追加
 *
 * @param text - 元テキスト
 * @param maxLines - 最大行数
 * @param charsPerLine - 1行あたりの概算文字数
 * @returns 制限後のテキスト（省略時は末尾に「…」）
 */
export function truncateToLines(
  text: string,
  maxLines: number,
  charsPerLine: number
): string {
  if (!text || maxLines <= 0 || charsPerLine <= 0) {
    return text;
  }

  // 改行を考慮しつつ、概算文字数で行数制限
  const lines = text.split("\n");
  let currentLine = 0;
  let result = "";

  for (const line of lines) {
    // 空行は1行としてカウント
    const lineCount = Math.ceil(line.length / charsPerLine) || 1;

    if (currentLine + lineCount > maxLines) {
      // 残りの行数分の文字数を計算
      const remainingLines = maxLines - currentLine;
      const remainingChars = remainingLines * charsPerLine;
      result += line.slice(0, remainingChars);
      return result.trimEnd() + "…";
    }

    result += line + "\n";
    currentLine += lineCount;
  }

  return result.trimEnd();
}

/**
 * PDF生成用のデータを準備
 *
 * @remarks
 * - IndexedDBから取り込み画像を取得
 * - サンプル画像は静的ファイルからfetchで取得
 * - BlobをBase64 data URLに変換（PDF互換形式）
 * - WebP/GIF等はJPEGに再エンコード
 *
 * @param items - エディタアイテムの配列
 * @param meta - プロジェクトのメタ情報
 * @param layoutType - グリッドレイアウトタイプ
 * @returns PDF生成データ。itemsが空の場合はnull
 *
 * @example
 * ```typescript
 * const pdfData = await preparePdfGenerationData(items, meta, layoutType);
 * if (pdfData) {
 *   const blob = await generatePdf(pdfData);
 * }
 * ```
 */
export async function preparePdfGenerationData(
  items: EditorItem[],
  meta: ProjectMeta,
  layoutType: LayoutType
): Promise<PdfGenerationData | null> {
  if (items.length === 0) {
    return null;
  }

  // 使用されている画像IDを取得
  const imageIds = items
    .map((item) => item.imageSource)
    .filter((id): id is string => id !== "");

  // サンプル画像と取り込み画像を分離
  const { sampleIds, dbImageIds } = partitionImageIds(imageIds);

  const imagesMap: Record<string, string> = {};

  // IndexedDBから取り込み画像を取得してBase64に変換
  if (dbImageIds.length > 0) {
    const imageRecords = await db.images
      .where("id")
      .anyOf(dbImageIds)
      .toArray();

    for (const record of imageRecords) {
      // BlobをPDF対応形式のdata URLに変換（WebP/GIF等はJPEGに再エンコード）
      const dataUrl = await convertBlobToPdfSupportedDataUrl(record.blob);
      if (dataUrl !== null && dataUrl !== "") {
        imagesMap[record.id] = dataUrl;
      }
    }
  }

  // サンプル画像をfetchで取得してBase64に変換
  const sampleImages = await fetchSampleImageBlobs(sampleIds);
  for (const [id, blob] of sampleImages) {
    const dataUrl = await convertBlobToPdfSupportedDataUrl(blob);
    if (dataUrl !== null && dataUrl !== "") {
      imagesMap[id] = dataUrl;
    }
  }

  return {
    meta,
    layoutType,
    items,
    images: imagesMap,
  };
}

/**
 * PDFファイル名を生成
 *
 * @param title - プロジェクトタイトル
 * @returns "タイトル_YYYY-MM-DD.pdf" 形式のファイル名
 */
export function generatePdfFilename(title: string): string {
  const sanitizedTitle = title.trim() || "training-sheet";
  const dateStr = new Date().toISOString().slice(0, 10);
  return `${sanitizedTitle}_${dateStr}.pdf`;
}
