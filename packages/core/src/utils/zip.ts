/**
 * ZIP 操作の共通ヘルパー
 *
 * 単一指導箋の書き出し・読み込み（export.ts）と
 * 一括バックアップ（backup.ts）で共通して使う安全処理を集約する
 */

import { IMPORT_ERROR_EXTRACTED_TOO_LARGE } from "@rehab-grid/core/lib/constants";
import type { JSZipObject, JSZipStreamHelper } from "jszip";

/**
 * internalStream を持つ ZIP エントリ
 *
 * @remarks
 * internalStream は JSZip の公開 API だが、同梱の型定義に含まれていないため補う
 * @see https://stuk.github.io/jszip/documentation/api_zipobject/internal_stream.html
 */
type StreamableZipObject = JSZipObject & {
  internalStream: (
    type: "uint8array"
  ) => JSZipStreamHelper<Uint8Array<ArrayBuffer>>;
};

/**
 * ZIP エントリが internalStream を持つか判定
 */
function isStreamableZipObject(
  entry: JSZipObject
): entry is StreamableZipObject {
  return (
    "internalStream" in entry && typeof entry.internalStream === "function"
  );
}

/**
 * MIME タイプから画像の拡張子を取得
 *
 * @param mimeType - MIME タイプ（例: "image/webp"）
 * @returns ファイル拡張子（ドットなし）
 */
export function getExtensionFromMimeType(mimeType: string): string {
  switch (mimeType) {
    case "image/webp":
      return "webp";
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/gif":
      return "gif";
    default:
      return "webp";
  }
}

/**
 * ファイル形式（JSON / ZIP / 不明）を拡張子とマジックバイトから判別
 *
 * @param file - 判別対象のファイル
 * @returns ファイル形式（"json" | "zip" | "unknown"）
 */
export async function detectImportFileType(
  file: File
): Promise<"json" | "zip" | "unknown"> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "json") return "json";
  if (ext === "zip") return "zip";

  // マジックバイトによるZIP判別（PK = 0x50 0x4B）
  const header = await file.slice(0, 4).arrayBuffer();
  const bytes = new Uint8Array(header);
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return "zip";

  return "unknown";
}

/**
 * ZIP エントリを上限サイズまで展開する
 *
 * @remarks
 * ZIP爆弾対策: 展開しながらバイト数を数え、上限を超えた時点で中断する
 * （展開し終えてからサイズを確認すると、その前にメモリが尽きるため）
 *
 * @param entry - 展開する ZIP エントリ
 * @param maxBytes - 展開後サイズの上限（バイト）
 * @returns 展開したデータ
 * @throws 展開後サイズが上限を超えた場合
 */
export async function extractWithLimit(
  entry: JSZipObject,
  maxBytes: number
): Promise<Uint8Array<ArrayBuffer>> {
  if (!isStreamableZipObject(entry)) {
    throw new Error("JSZip の internalStream が利用できません");
  }

  return new Promise((resolve, reject) => {
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let size = 0;
    const stream = entry.internalStream("uint8array");

    stream
      .on("data", (chunk) => {
        size += chunk.byteLength;
        // 1チャンクから複数の data が同期的に発火するため、超過後のチャンクは保持しない
        if (size > maxBytes) {
          stream.pause();
          reject(new Error(IMPORT_ERROR_EXTRACTED_TOO_LARGE));
          return;
        }
        chunks.push(chunk);
      })
      .on("error", reject)
      .on("end", () => {
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.byteLength;
        }
        resolve(bytes);
      })
      .resume();
  });
}
