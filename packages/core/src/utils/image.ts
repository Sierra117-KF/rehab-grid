/**
 * 画像圧縮・変換ユーティリティ
 *
 * browser-image-compression を使用した画像圧縮と
 * ファイルバリデーション機能を提供
 */

import {
  ALLOWED_IMAGE_TYPES,
  getSampleImagePath,
  IMAGE_DISPLAY_NAME_NUMBER_PATTERN,
  IMAGE_DISPLAY_NAME_PREFIXES,
  isSampleImage,
  MAX_FILE_SIZE,
} from "@rehab-grid/core/lib/constants";
import imageCompression from "browser-image-compression";

/** 圧縮後の長辺最大サイズ（px） */
const MAX_WIDTH_OR_HEIGHT = 1200;

/** 圧縮品質（0-1） */
const COMPRESSION_QUALITY = 0.8;

/** 圧縮後の最大ファイルサイズ（MB） */
const MAX_COMPRESSED_SIZE_MB = 1;

/**
 * ファイルバリデーション結果
 */
type ValidationResult = {
  /** バリデーション成功かどうか */
  valid: boolean;
  /** エラーメッセージ（失敗時のみ） */
  error?: string;
};

/**
 * 画像ファイルのバリデーション
 *
 * ファイルサイズと形式をチェックする
 *
 * @param file - 検証するファイル
 * @returns バリデーション結果
 *
 * @example
 * ```ts
 * const result = validateImageFile(file);
 * if (!result.valid) {
 *   console.error(result.error);
 * }
 * ```
 */
export function validateImageFile(file: File): ValidationResult {
  // ファイルサイズチェック
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `ファイルサイズが大きすぎます（最大${String(MAX_FILE_SIZE / 1024 / 1024)}MB）`,
    };
  }

  // ファイル形式チェック
  if (!ALLOWED_IMAGE_TYPES.some((type) => type === file.type)) {
    return {
      valid: false,
      error: "対応していない画像形式です（JPEG, PNG, GIF, WebPのみ対応）",
    };
  }

  return { valid: true };
}

/**
 * WebP形式がサポートされているかチェック
 *
 * @returns WebPサポート状況
 */
function supportsWebP(): boolean {
  // サーバーサイドでは false を返す
  if (typeof document === "undefined") {
    return false;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const dataUrl = canvas.toDataURL("image/webp");

  // toDataURL が文字列以外を返す環境（jsdom等のテスト環境）では false を返す
  if (typeof dataUrl !== "string") {
    return false;
  }

  return dataUrl.startsWith("data:image/webp");
}

/**
 * 画像を圧縮
 *
 * 長辺1200px、WebP形式（非対応ブラウザはJPEG）で圧縮する
 *
 * @param file - 圧縮する画像ファイル
 * @returns 圧縮された画像Blob
 * @throws 圧縮処理に失敗した場合
 *
 * @example
 * ```ts
 * try {
 *   const compressedBlob = await compressImage(imageFile);
 *   console.log('圧縮後サイズ:', compressedBlob.size);
 * } catch (error) {
 *   console.error('圧縮失敗:', error);
 * }
 * ```
 */
export async function compressImage(file: File): Promise<Blob> {
  // WebP対応チェック
  const useWebP = supportsWebP();

  const options = {
    maxSizeMB: MAX_COMPRESSED_SIZE_MB,
    maxWidthOrHeight: MAX_WIDTH_OR_HEIGHT,
    useWebWorker: true,
    fileType: useWebP ? "image/webp" : "image/jpeg",
    initialQuality: COMPRESSION_QUALITY,
  };

  const compressedFile = await imageCompression(file, options);

  return compressedFile;
}

/**
 * 画像処理結果
 */
export type ImageProcessResult =
  | { success: true; imageId: string }
  | { success: false; error: string };

/**
 * 画像のバリデーション、圧縮、保存を一括で処理
 *
 * 画像アップロードとペースト貼り付けで共通して使用する処理を集約
 *
 * @param file - 処理する画像ファイル
 * @param generateId - ID生成関数
 * @param save - 保存関数
 * @returns 処理結果（成功時はimageId、失敗時はエラーメッセージ）
 *
 * @example
 * ```ts
 * const result = await processAndSaveImage(
 *   file,
 *   () => nanoid(),
 *   (id, blob) => saveImage(id, blob)
 * );
 * if (result.success) {
 *   console.log('保存成功:', result.imageId);
 * } else {
 *   console.error('失敗:', result.error);
 * }
 * ```
 */
export async function processAndSaveImage(
  file: File,
  generateId: () => string,
  save: (id: string, blob: Blob) => Promise<void>
): Promise<ImageProcessResult> {
  // バリデーション
  const validation = validateImageFile(file);
  if (!validation.valid) {
    return { success: false, error: validation.error ?? "不明なエラー" };
  }

  try {
    // 圧縮
    const compressedBlob = await compressImage(file);

    // ID生成 & 保存
    const imageId = generateId();
    await save(imageId, compressedBlob);

    return { success: true, imageId };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "画像の処理に失敗しました";
    return { success: false, error: message };
  }
}

/**
 * ファイルリストから画像ファイルのみを抽出
 *
 * @param files - ファイルリスト
 * @returns 画像ファイルのみの配列
 */
export function filterImageFiles(files: FileList | File[]): File[] {
  const fileArray = Array.from(files);
  return fileArray.filter((file) =>
    ALLOWED_IMAGE_TYPES.some((type) => type === file.type)
  );
}

/**
 * ファイル名から拡張子を除去
 *
 * @param fileName - ファイル名（例: "squat_exercise.png"）
 * @returns 拡張子なしのファイル名（例: "squat_exercise"）
 */
export function getFileNameWithoutExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex === -1 || lastDotIndex === 0) {
    return fileName;
  }
  return fileName.slice(0, lastDotIndex);
}

/**
 * ファイル名から接頭辞と拡張子を除去して表示用の名前を生成
 *
 * ホバープレビューなどのUI表示用に、ファイル名を整形する
 *
 * @param fileName - ファイル名（例: "standing_squat.png"）
 * @returns 表示用の名前（例: "squat"）
 *
 * @example
 * ```ts
 * getDisplayFileName("standing_squat.png") // "squat"
 * getDisplayFileName("sitting_stretch.webp") // "stretch"
 * getDisplayFileName("exercise.jpg") // "exercise"
 * getDisplayFileName("standing_01_スクワット.webp") // "スクワット"
 * ```
 */
export function getDisplayFileName(fileName: string): string {
  // 1. 拡張子を除去
  let name = getFileNameWithoutExtension(fileName);

  // 2. 姿勢接頭辞を除去（大文字小文字を区別しない）
  for (const prefix of IMAGE_DISPLAY_NAME_PREFIXES) {
    if (name.toLowerCase().startsWith(prefix.toLowerCase())) {
      name = name.slice(prefix.length);
      break;
    }
  }

  // 3. 番号部分を除去（例: "01_スクワット" → "スクワット"）
  name = name.replace(IMAGE_DISPLAY_NAME_NUMBER_PATTERN, "");

  return name;
}

/** PDF対応の画像形式 */
const PDF_SUPPORTED_TYPES = ["image/jpeg", "image/png"] as const;

/** JPEG再エンコード時の品質 */
const JPEG_QUALITY = 0.9;

/**
 * BlobをPDF対応形式（JPEG/PNG）のdata URLに変換
 *
 * `@react-pdf/renderer` はPNG/JPEGのみ対応のため、
 * WebP/GIF等の画像はJPEGに再エンコードする
 *
 * @param blob - 変換する画像Blob
 * @returns data URL（`data:image/jpeg;base64,...` または `data:image/png;base64,...`）、変換失敗時はnull
 *
 * @example
 * ```ts
 * const dataUrl = await convertBlobToPdfSupportedDataUrl(imageBlob);
 * if (dataUrl) {
 *   // PDF生成に使用
 * }
 * ```
 */
export async function convertBlobToPdfSupportedDataUrl(
  blob: Blob
): Promise<string | null> {
  try {
    // 既にPDF対応形式の場合はそのままdata URLに変換
    if (PDF_SUPPORTED_TYPES.some((type) => type === blob.type)) {
      return await blobToDataUrl(blob);
    }

    // WebP/GIF等の場合はJPEGに再エンコード
    return await reencodeToJpegDataUrl(blob);
  } catch {
    // 変換失敗時はnullを返す
    return null;
  }
}

/**
 * BlobをそのままData URLに変換
 *
 * @param blob - 変換するBlob
 * @returns data URL
 */
async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => {
      reject(new Error("FileReaderでの読み込みに失敗しました"));
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * 画像BlobをJPEG形式のdata URLに再エンコード
 *
 * createImageBitmap + OffscreenCanvas（または通常のCanvas）を使用
 *
 * @param blob - 変換する画像Blob
 * @returns JPEG形式のdata URL
 */
async function reencodeToJpegDataUrl(blob: Blob): Promise<string> {
  // Blobから画像ビットマップを作成
  const imageBitmap = await createImageBitmap(blob);

  const { width, height } = imageBitmap;

  // OffscreenCanvasが使用可能な場合は使用（Worker対応）
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("OffscreenCanvas 2D contextの取得に失敗しました");
    }

    // 背景を白で塗りつぶし（透過部分対策）
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(imageBitmap, 0, 0);

    // JPEGにエンコードしてBlobを取得
    const jpegBlob = await canvas.convertToBlob({
      type: "image/jpeg",
      quality: JPEG_QUALITY,
    });

    return blobToDataUrl(jpegBlob);
  }

  // フォールバック: 通常のCanvas（メインスレッドのみ）
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas 2D contextの取得に失敗しました");
    }

    // 背景を白で塗りつぶし（透過部分対策）
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(imageBitmap, 0, 0);

    // JPEGにエンコードしてdata URLを取得
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  }

  throw new Error("Canvas APIが利用できません");
}

// ============================================================================
// サンプル画像ヘルパー関数
// ============================================================================

/**
 * 画像IDを「サンプル画像」と「IndexedDB画像」に分割する
 *
 * @remarks
 * - 空文字は除外する
 * - 重複IDは除外する（順序は保持しない）
 *
 * @param imageIds - 画像IDの配列
 * @returns 分割結果（sampleIds / dbImageIds）
 */
export function partitionImageIds(imageIds: readonly string[]): {
  sampleIds: string[];
  dbImageIds: string[];
} {
  const sampleSet = new Set<string>();
  const dbSet = new Set<string>();

  for (const id of imageIds) {
    if (id === "") continue;

    if (isSampleImage(id)) {
      sampleSet.add(id);
    } else {
      dbSet.add(id);
    }
  }

  return {
    sampleIds: Array.from(sampleSet),
    dbImageIds: Array.from(dbSet),
  };
}

/**
 * サンプル画像を fetch して Blob として取得する
 *
 * @remarks
 * - 取得に失敗した画像は静かにスキップする（例外は投げない）
 * - `sampleIds` は重複していてもよい（内部で重複を除外する）
 *
 * @param sampleIds - サンプル画像IDの配列
 * @returns 画像ID→Blob のマップ
 */
export async function fetchSampleImageBlobs(
  sampleIds: readonly string[]
): Promise<Map<string, Blob>> {
  const result = new Map<string, Blob>();

  for (const id of new Set(sampleIds)) {
    const path = getSampleImagePath(id);
    if (path === undefined) continue;

    try {
      const res = await fetch(path);
      if (!res.ok) continue;

      const blob = await res.blob();
      result.set(id, blob);
    } catch {
      // サンプル画像の取得に失敗した場合は静かにスキップ
    }
  }

  return result;
}

// ============================================================================
// 画像マジックバイト検証
// ============================================================================

/**
 * Blobが有効な画像形式かをマジックバイトで検証
 *
 * ファイル拡張子ではなく、実際のファイル内容（マジックバイト）を確認することで、
 * 拡張子偽装による攻撃を防ぐ
 *
 * @param blob - 検証対象のBlob
 * @returns 有効な画像形式（JPEG, PNG, GIF, WebP）の場合true
 *
 * @example
 * ```typescript
 * const isValid = await isValidImageBlob(imageBlob);
 * if (!isValid) {
 *   console.warn("Invalid image file");
 * }
 * ```
 */
export async function isValidImageBlob(blob: Blob): Promise<boolean> {
  // 先頭12バイトを読み取り（WebPの検証に必要な最大長）
  const header = await blob.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(header);

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return true;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return true;
  }

  // GIF: 47 49 46 38 (GIF8)
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return true;
  }

  // WebP: RIFF....WEBP (52 49 46 46 ?? ?? ?? ?? 57 45 42 50)
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return true;
  }

  return false;
}
