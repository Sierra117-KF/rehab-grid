/**
 * PDF生成 Web Worker
 *
 * メインスレッドをブロックせずにPDFを生成するためのWorker
 * ドキュメント要素の組み立ては lib/pdf の buildPdfDocument に任せ、
 * ここではフォント登録とBlob化のみを行う
 */

import { Font, pdf } from "@react-pdf/renderer";
import {
  CJK_PATTERN,
  PDF_FONT_FAMILY,
  PDF_FONT_PATHS,
} from "@rehab-grid/core/lib/constants";
import { buildPdfDocument } from "@rehab-grid/core/lib/pdf";
import { type PdfWorkerRequest } from "@rehab-grid/core/types";

/**
 * フォントを登録
 *
 * react-pdf/fontのブラウザ実装はsrcを文字列（URLまたはdata URL）として扱うため、
 * URL文字列でFont.register()を呼び出し、Font.load()で事前ロードして失敗を即座に捕捉する。
 *
 * 注意: Workerコンテキストでは相対URLが機能しないため、絶対URLを使用する。
 *
 * @internal テスト専用エクスポート
 */
async function registerFonts(): Promise<void> {
  // Workerコンテキストでは相対URLが機能しないため、絶対URLを構築
  const baseUrl = self.location.origin;

  // URL文字列でフォントを登録
  Font.register({
    family: PDF_FONT_FAMILY,
    fonts: [
      { src: `${baseUrl}${PDF_FONT_PATHS.regular}`, fontWeight: "normal" },
      { src: `${baseUrl}${PDF_FONT_PATHS.bold}`, fontWeight: "bold" },
    ],
  });

  // CJK文字の折り返しを有効にするHyphenation callbackを登録
  // 日本語は単語境界がないため、文字単位で分割を許可する
  Font.registerHyphenationCallback((word) => {
    // CJK文字を含む場合は空文字挿入方式でハイフン表示を無効化
    // v4.xのtextkitでは各文字の後に空文字を挿入することで
    // ハイフン文字を明示的に空に置き換える（最も信頼性が高い方式）
    if (CJK_PATTERN.test(word)) {
      return Array.from(word).flatMap((char) => [char, ""]);
    }
    // 半角文字のみの場合はそのまま返す（既存の英語折り返しを維持）
    return [word];
  });

  // Font.load()で事前ロードし、失敗を即座に捕捉
  try {
    await Promise.all([
      Font.load({ fontFamily: PDF_FONT_FAMILY, fontWeight: 400 }),
      Font.load({ fontFamily: PDF_FONT_FAMILY, fontWeight: 700 }),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`フォントの読み込みに失敗しました: ${message}`);
  }
}

// =====================================
// Worker メッセージハンドラ
// =====================================

let fontsRegistered = false;

self.onmessage = async (event: MessageEvent<PdfWorkerRequest>) => {
  const { data } = event.data;

  try {
    // フォントを初回のみ登録
    if (!fontsRegistered) {
      self.postMessage({ type: "progress", progress: 10 });
      await registerFonts();
      fontsRegistered = true;
    }

    self.postMessage({ type: "progress", progress: 30 });

    // PDFドキュメントを生成
    const document = buildPdfDocument(data);

    self.postMessage({ type: "progress", progress: 50 });

    // PDFをBlobとして生成
    const blob = await pdf(document).toBlob();

    self.postMessage({ type: "progress", progress: 100 });
    self.postMessage({ type: "success", blob });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "PDF生成に失敗しました";
    self.postMessage({ type: "error", message: errorMessage });
  }
};

// =====================================
// エクスポート（テスト用）
// =====================================

export { registerFonts };
