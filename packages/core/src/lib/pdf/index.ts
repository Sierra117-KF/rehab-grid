/**
 * PDFドキュメント要素の組み立て（純粋関数）
 *
 * `@react-pdf/renderer` に依存するため、core のルート index からは export しない。
 * PDF Worker から `@rehab-grid/core/lib/pdf` で読み込む。
 */

export { buildPdfDocument } from "./document";
