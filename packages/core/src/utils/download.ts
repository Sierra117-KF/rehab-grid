/**
 * ダウンロードユーティリティ
 *
 * Blobデータをファイルとしてダウンロードする機能を提供
 */

/**
 * BlobをダウンロードするユーティリティExport関数
 *
 * @param blob - ダウンロードするBlob
 * @param filename - ダウンロード時のファイル名
 *
 * @example
 * ```ts
 * const pdfBlob = await generatePdf(data);
 * downloadBlob(pdfBlob, "training-sheet.pdf");
 * ```
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
