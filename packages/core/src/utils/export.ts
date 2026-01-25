/**
 * プロジェクトのエクスポート・インポート機能
 *
 * 軽量JSON形式およびZIP形式でプロジェクトをエクスポート・インポートする
 */

import {
  APP_VERSION,
  IMPORT_ERROR_CORRUPTED_ZIP,
  IMPORT_ERROR_EXTRACTED_TOO_LARGE,
  IMPORT_ERROR_FILE_TOO_LARGE,
  IMPORT_ERROR_INVALID_FORMAT,
  IMPORT_ERROR_NO_PROJECT,
  IMPORT_ERROR_TOO_MANY_IMAGES,
  IMPORT_ERROR_VALIDATION,
  MAX_IMPORT_JSON_SIZE,
  MAX_IMPORT_ZIP_SIZE,
  MAX_ZIP_EXTRACTED_SIZE,
  MAX_ZIP_IMAGE_COUNT,
} from "@rehab-grid/core/lib/constants";
import { getImages } from "@rehab-grid/core/lib/db";
import { projectFileSchema } from "@rehab-grid/core/lib/schemas";
import { type ImportResult, type ProjectFile } from "@rehab-grid/core/types";
import { nanoid } from "nanoid";

import {
  fetchSampleImageBlobs,
  isValidImageBlob,
  partitionImageIds,
} from "./image";

/**
 * プロジェクトを軽量JSON形式に変換
 *
 * @remarks
 * - 画像データは含まない（imageSource を空文字列に変換）
 * - テキストデータのみを含む軽量ファイルを生成
 * - 同僚間でのテンプレート共有に最適
 *
 * @param project - エクスポート対象のプロジェクト
 * @returns JSON文字列
 *
 * @example
 * ```typescript
 * const jsonString = exportToJSON(project);
 * downloadJSON("my-project.json", jsonString);
 * ```
 */
export function exportToJSON(project: ProjectFile): string {
  const exportData: ProjectFile = {
    meta: {
      ...project.meta,
      version: APP_VERSION,
      updatedAt: new Date().toISOString(),
    },
    settings: project.settings,
    items: project.items.map((item) => ({
      ...item,
      // 軽量JSONでは画像を含まない
      imageSource: "",
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * JSON文字列をファイルとしてダウンロード
 *
 * @param filename - ダウンロードするファイル名
 * @param content - JSON文字列
 *
 * @example
 * ```typescript
 * downloadJSON("rehab-grid-2024-01-15.json", jsonContent);
 * ```
 */
export function downloadJSON(filename: string, content: string): void {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

/**
 * 現在の日付を YYYY-MM-DD 形式で取得
 *
 * @returns YYYY-MM-DD 形式の日付文字列
 */
export function getDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * プロジェクトをJSONファイルとしてダウンロード
 *
 * @remarks
 * ファイル名は `rehab-grid-YYYY-MM-DD.json` 形式
 *
 * @param project - エクスポート対象のプロジェクト
 */
export function downloadProjectAsJSON(project: ProjectFile): void {
  const filename = `rehab-grid-${getDateString()}.json`;
  const content = exportToJSON(project);
  downloadJSON(filename, content);
}

/**
 * Blob の MIME タイプから拡張子を取得
 *
 * @param blob - 画像 Blob
 * @returns ファイル拡張子（ドットなし）
 */
function getExtensionFromBlob(blob: Blob): string {
  const mimeType = blob.type;

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
 * プロジェクトをZIP形式でエクスポート
 *
 * @remarks
 * - JSONファイル（project.json）と画像ファイルを含むZIPを生成
 * - imageSource は相対パス（例: "images/img_001.webp"）に変換される
 * - 画像は IndexedDB から取得し、既存の圧縮形式をそのまま使用
 *
 * @param project - エクスポート対象のプロジェクト
 * @param images - 画像IDとBlobのマップ
 * @returns ZIPファイルのBlob
 *
 * @example
 * ```typescript
 * const images = await getImages(imageIds);
 * const zipBlob = await exportToZIP(project, images);
 * ```
 */
export async function exportToZIP(
  project: ProjectFile,
  images: Map<string, Blob | undefined>
): Promise<Blob> {
  // 動的インポートで jszip を読み込み（Turbopack 互換性のため）
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  // 画像IDから ZIP 内パスへのマッピングを作成
  const imageIdToPath = new Map<string, string>();
  const imagesFolder = zip.folder("images");

  let imageIndex = 1;
  for (const [imageId, blob] of images) {
    if (blob) {
      const ext = getExtensionFromBlob(blob);
      const filename = `img_${String(imageIndex).padStart(3, "0")}.${ext}`;
      const path = `images/${filename}`;
      imageIdToPath.set(imageId, path);

      // 画像をZIPに追加
      imagesFolder?.file(filename, blob);
      imageIndex++;
    }
  }

  // project.json を作成（imageSource を相対パスに変換）
  const exportData: ProjectFile = {
    meta: {
      ...project.meta,
      version: APP_VERSION,
      updatedAt: new Date().toISOString(),
    },
    settings: project.settings,
    items: project.items.map((item) => ({
      ...item,
      // 画像IDを相対パスに変換（存在しない場合は空文字列）
      imageSource: imageIdToPath.get(item.imageSource) ?? "",
    })),
  };

  // project.json をZIPに追加
  zip.file("project.json", JSON.stringify(exportData, null, 2));

  // ZIP Blob を生成
  return await zip.generateAsync({ type: "blob" });
}

/**
 * ZIPファイルをダウンロード
 *
 * @param filename - ダウンロードするファイル名
 * @param blob - ZIPファイルのBlob
 */
function downloadZIP(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

/**
 * プロジェクトをZIPファイルとしてダウンロード
 *
 * @remarks
 * - ファイル名は `rehab-grid-YYYY-MM-DD.zip` 形式
 * - IndexedDB から取り込み画像を取得してZIPに含める
 * - サンプル画像もfetchで取得して同梱
 *
 * @param project - エクスポート対象のプロジェクト
 *
 * @example
 * ```typescript
 * await downloadProjectAsZIP(currentProject);
 * ```
 */
export async function downloadProjectAsZIP(
  project: ProjectFile
): Promise<void> {
  // プロジェクト内の画像IDを収集
  const imageIds = project.items
    .map((item) => item.imageSource)
    .filter((id): id is string => id !== "");

  // サンプル画像と取り込み画像を分離
  const { sampleIds, dbImageIds } = partitionImageIds(imageIds);

  // IndexedDB から取り込み画像を取得
  const dbImages = await getImages(dbImageIds);

  // サンプル画像をfetchで取得
  const sampleImages = await fetchSampleImageBlobs(sampleIds);

  // 統合してZIP生成
  const allImages = new Map<string, Blob | undefined>([
    ...dbImages,
    ...sampleImages,
  ]);
  const zipBlob = await exportToZIP(project, allImages);

  // ダウンロード
  const filename = `rehab-grid-${getDateString()}.zip`;
  downloadZIP(filename, zipBlob);
}

// ============================================================================
// インポート機能
// ============================================================================

/**
 * ファイル形式を判別
 *
 * @param file - 判別対象のファイル
 * @returns ファイル形式（"json" | "zip" | "unknown"）
 */
async function detectFileType(file: File): Promise<"json" | "zip" | "unknown"> {
  // 拡張子による判別
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
 * ファイルサイズをチェック
 *
 * @param file - チェック対象のファイル
 * @param fileType - ファイル形式（"json" | "zip"）
 * @throws ファイルサイズが上限を超えている場合
 */
function validateFileSize(file: File, fileType: "json" | "zip"): void {
  const maxSize =
    fileType === "json" ? MAX_IMPORT_JSON_SIZE : MAX_IMPORT_ZIP_SIZE;

  if (file.size > maxSize) {
    throw new Error(IMPORT_ERROR_FILE_TOO_LARGE);
  }
}

/**
 * JSONファイルをインポート
 *
 * @param file - JSONファイル
 * @returns インポート結果
 * @throws バリデーションエラー時
 */
async function importFromJSON(file: File): Promise<ImportResult> {
  const text = await file.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(IMPORT_ERROR_VALIDATION);
  }

  // Zodスキーマでバリデーション
  const result = projectFileSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(IMPORT_ERROR_VALIDATION);
  }

  // JSONインポートでは画像IDをクリア（画像は含まれていない）
  const project: ProjectFile = {
    ...result.data,
    meta: {
      ...result.data.meta,
      version: APP_VERSION,
      updatedAt: new Date().toISOString(),
    },
    items: result.data.items.map((item) => ({
      ...item,
      // 軽量JSONには画像が含まれないためクリア
      imageSource: "",
    })),
  };

  return {
    project,
    images: new Map(),
  };
}

/**
 * ZIPファイルをインポート
 *
 * @param file - ZIPファイル
 * @returns インポート結果
 * @throws 破損したZIP、project.json不在、バリデーションエラー時
 */
async function importFromZIP(file: File): Promise<ImportResult> {
  // 動的インポートで jszip を読み込み（Turbopack 互換性のため）
  const JSZip = (await import("jszip")).default;

  let zip: InstanceType<typeof JSZip>;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new Error(IMPORT_ERROR_CORRUPTED_ZIP);
  }

  // project.json を取得
  const projectJsonFile = zip.file("project.json");
  if (!projectJsonFile) {
    throw new Error(IMPORT_ERROR_NO_PROJECT);
  }

  const projectJsonText = await projectJsonFile.async("string");
  let parsed: unknown;
  try {
    parsed = JSON.parse(projectJsonText);
  } catch {
    throw new Error(IMPORT_ERROR_VALIDATION);
  }

  // Zodスキーマでバリデーション
  const result = projectFileSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(IMPORT_ERROR_VALIDATION);
  }

  // images/ フォルダから画像を抽出
  const images = new Map<string, Blob>();
  const pathToNewId = new Map<string, string>();

  // images/ フォルダ内のファイルを列挙
  // filter() は JSZipObject[] を返すので、直接反復処理する
  const imageEntries = zip.file(/^images\/.+/);

  // ZIP爆弾対策: 画像ファイル数の上限チェック
  const imageFileCount = imageEntries.filter((entry) => !entry.dir).length;
  if (imageFileCount > MAX_ZIP_IMAGE_COUNT) {
    throw new Error(IMPORT_ERROR_TOO_MANY_IMAGES);
  }

  // ZIP爆弾対策: 展開後サイズの追跡
  let totalExtractedSize = 0;

  for (const entry of imageEntries) {
    // ディレクトリはスキップ
    if (entry.dir) continue;

    try {
      const blob = await entry.async("blob");

      // ZIP爆弾対策: 展開後サイズの累積チェック
      totalExtractedSize += blob.size;
      if (totalExtractedSize > MAX_ZIP_EXTRACTED_SIZE) {
        throw new Error(IMPORT_ERROR_EXTRACTED_TOO_LARGE);
      }

      // マジックバイト検証: 拡張子偽装を検出（無効な画像はサイレントにスキップ）
      if (!(await isValidImageBlob(blob))) {
        continue;
      }

      const newId = nanoid();
      images.set(newId, blob);
      // entry.name はフルパス（例: "images/img_001.webp"）なのでそのままキーにする
      pathToNewId.set(entry.name, newId);
    } catch (error: unknown) {
      // ZIP爆弾対策のエラーは再スロー
      if (
        error instanceof Error &&
        error.message === IMPORT_ERROR_EXTRACTED_TOO_LARGE
      ) {
        throw error;
      }
      // 破損した画像や処理エラーはサイレントにスキップ
      // （1つの画像の失敗でインポート全体が失敗しないようにする）
      continue;
    }
  }

  // items の imageSource を新しいIDに変換
  const project: ProjectFile = {
    ...result.data,
    meta: {
      ...result.data.meta,
      version: APP_VERSION,
      updatedAt: new Date().toISOString(),
    },
    items: result.data.items.map((item) => ({
      ...item,
      imageSource: pathToNewId.get(item.imageSource) ?? "",
    })),
  };

  return {
    project,
    images,
  };
}

/**
 * プロジェクトをインポート
 *
 * @remarks
 * ファイル形式を自動判別し、適切な方法でインポートを実行
 *
 * @param file - インポートするファイル（JSON または ZIP）
 * @returns インポート結果（プロジェクトデータと画像のマップ）
 * @throws 不正なファイル形式、バリデーションエラー、破損ファイル時
 *
 * @example
 * ```typescript
 * const file = event.target.files[0];
 * const { project, images } = await importProject(file);
 *
 * // 画像をDBに保存
 * for (const [id, blob] of images) {
 *   await saveImage(id, blob);
 * }
 *
 * // ストアを更新
 * useEditorStore.getState().initializeFromDB(project);
 * ```
 */
export async function importProject(file: File): Promise<ImportResult> {
  const fileType = await detectFileType(file);

  // ファイルサイズチェック（パース処理前の早期リターン）
  if (fileType !== "unknown") {
    validateFileSize(file, fileType);
  }

  switch (fileType) {
    case "json":
      return importFromJSON(file);
    case "zip":
      return importFromZIP(file);
    case "unknown":
      throw new Error(IMPORT_ERROR_INVALID_FORMAT);
  }
}
