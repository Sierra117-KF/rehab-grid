/**
 * 全データ一括バックアップ・復元機能
 *
 * マイ指導箋・マイテンプレート・マイ運動・マイ定型文・取り込み画像を
 * 1つの ZIP ファイル（backup.json + images/）にまとめて書き出し・復元する。
 *
 * @remarks
 * - サンプル画像（sample_*）はアプリ同梱アセットのため ZIP に実体を含めず ID のまま保持する
 * - 複数箇所から参照されている取り込み画像は ZIP 内に 1 回だけ格納して重複排除する
 * - 復元時は Zod + DOMPurify・マジックバイト検証・ZIP 爆弾対策（extractWithLimit）をすべて通す
 */

import {
  APP_VERSION,
  BACKUP_ERROR_NO_BACKUP,
  BACKUP_ERROR_UNSUPPORTED_VERSION,
  IMPORT_ERROR_CORRUPTED_ZIP,
  IMPORT_ERROR_EXTRACTED_TOO_LARGE,
  IMPORT_ERROR_FILE_TOO_LARGE,
  IMPORT_ERROR_INVALID_FORMAT,
  IMPORT_ERROR_NO_PROJECT,
  IMPORT_ERROR_TOO_MANY_IMAGES,
  IMPORT_ERROR_VALIDATION,
  isSampleImage,
  MAX_BACKUP_EXTRACTED_SIZE,
  MAX_BACKUP_IMAGE_COUNT,
  MAX_BACKUP_JSON_SIZE,
  MAX_BACKUP_ZIP_SIZE,
  MAX_IMPORT_ZIP_SIZE,
} from "@rehab-grid/core/lib/constants";
import { db } from "@rehab-grid/core/lib/db";
import {
  BACKUP_FORMAT,
  BACKUP_IMAGE_PATH_PATTERN,
  BACKUP_SCHEMA_VERSION,
  backupManifestSchema,
} from "@rehab-grid/core/lib/schemas";
import { flushRegisteredAutosave } from "@rehab-grid/core/lib/store/autosaveFlusher";
import {
  type BackupCategorySelection,
  type BackupImageEntry,
  type BackupManifest,
  type BackupSummaryCounts,
  type CustomSnippetRecord,
  type EditorItem,
  type ExerciseCardRecord,
  type ImageRecord,
  type ImportedFileResult,
  type ParsedBackup,
  type ParsedBackupImage,
  type ProjectFile,
  type ProjectRecord,
  type UserTemplateRecord,
} from "@rehab-grid/core/types";
import type JSZip from "jszip";

import { getDateString } from "./date";
import { downloadBlob } from "./download";
import { importProject } from "./export";
import { detectImageMimeType } from "./image";
import {
  detectImportFileType,
  extractWithLimit,
  getExtensionFromMimeType,
} from "./zip";

/** 一括バックアップ ZIP 内のマニフェストファイル名 */
export const BACKUP_MANIFEST_FILENAME = "backup.json";

/** 単一指導箋 ZIP 内のプロジェクトファイル名 */
const SINGLE_PROJECT_FILENAME = "project.json";

/** すべてのカテゴリを選択した状態 */
export const ALL_BACKUP_CATEGORIES_SELECTED: BackupCategorySelection = {
  projects: true,
  userTemplates: true,
  exerciseCards: true,
  customSnippets: true,
  unusedImages: true,
};

/**
 * 一括バックアップ対象の DB スナップショット
 */
export type BackupSourceData = {
  /** 保存済みのマイ指導箋一覧 */
  projects: ProjectRecord[];
  /** 保存済みのマイテンプレート一覧 */
  userTemplates: UserTemplateRecord[];
  /** 保存済みのマイ運動一覧 */
  exerciseCards: ExerciseCardRecord[];
  /** 保存済みのマイ定型文一覧 */
  customSnippets: CustomSnippetRecord[];
  /** 保存済みの取り込み画像一覧 */
  images: ImageRecord[];
};

/**
 * アイテム一覧からサンプル以外の参照画像ID／パスを集める
 */
function collectNonSampleImageSources(items: readonly EditorItem[]): Set<string> {
  const ids = new Set<string>();
  for (const item of items) {
    if (item.imageSource !== "" && !isSampleImage(item.imageSource)) {
      ids.add(item.imageSource);
    }
  }
  return ids;
}

/**
 * DB スナップショット内の全カテゴリから参照されている画像IDを集める
 */
function collectAllReferencedImageIds(data: BackupSourceData): Set<string> {
  const items: EditorItem[] = [
    ...data.projects.flatMap((record) => record.data.items),
    ...data.userTemplates.flatMap((record) => record.data.items),
    ...data.exerciseCards.map((record) => record.item),
  ];
  return collectNonSampleImageSources(items);
}

/**
 * DB から一括バックアップ用の全テーブルを読み込む
 */
async function readAllBackupSourceData(): Promise<BackupSourceData> {
  const [projects, userTemplates, exerciseCards, customSnippets, images] =
    await Promise.all([
      db.projects.toArray(),
      db.userTemplates.toArray(),
      db.exerciseCards.toArray(),
      db.customSnippets.toArray(),
      db.images.toArray(),
    ]);
  return { projects, userTemplates, exerciseCards, customSnippets, images };
}

/**
 * ISO 文字列から有効な Date を作る（不正なら fallback を返す）
 */
function toValidDate(isoString: string, fallback: Date): Date {
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

/**
 * バックアップ対象のカテゴリの現在件数を取得する
 *
 * @remarks
 * 保留中のオートセーブを確定させてから DB を読むため、編集直後の指導箋も件数に反映される
 *
 * @returns 各カテゴリの現在件数サマリー
 */
export async function collectCurrentBackupCounts(): Promise<BackupSummaryCounts> {
  await flushRegisteredAutosave();
  const data = await readAllBackupSourceData();
  const referencedIds = collectAllReferencedImageIds(data);
  const unusedImages = data.images.filter(
    (image) => !referencedIds.has(image.id)
  ).length;

  return {
    projects: data.projects.length,
    userTemplates: data.userTemplates.length,
    exerciseCards: data.exerciseCards.length,
    customSnippets: data.customSnippets.length,
    unusedImages,
    totalImages: data.images.length,
  };
}

/**
 * 件数サマリーから、件数が 1 件以上あるカテゴリだけを選択した初期状態を作る
 *
 * @param counts - 各カテゴリの件数サマリー
 * @returns 初期選択状態
 */
export function createInitialBackupSelection(
  counts: BackupSummaryCounts
): BackupCategorySelection {
  return {
    projects: counts.projects > 0,
    userTemplates: counts.userTemplates > 0,
    exerciseCards: counts.exerciseCards > 0,
    customSnippets: counts.customSnippets > 0,
    unusedImages: counts.unusedImages > 0,
  };
}

/**
 * 選択状態に 1 つ以上チェックされたカテゴリがあるか判定
 *
 * @param selection - カテゴリの選択状態
 * @returns 1 つ以上選択されていれば true
 */
export function hasAnySelectedBackupCategory(
  selection: BackupCategorySelection
): boolean {
  return (
    selection.projects ||
    selection.userTemplates ||
    selection.exerciseCards ||
    selection.customSnippets ||
    selection.unusedImages
  );
}

/**
 * 画像ソースをバックアップ用の相対パスへ変換する
 *
 * @remarks
 * サンプル画像はアプリ同梱アセットのため ID をそのまま保持する
 */
function convertImageSourceForExport(
  imageSource: string,
  imageIdToPath: ReadonlyMap<string, string>
): string {
  if (imageSource === "" || isSampleImage(imageSource)) {
    return imageSource;
  }
  return imageIdToPath.get(imageSource) ?? "";
}

/**
 * ProjectFile 内のアイテムの画像参照をバックアップ用パスへ変換する
 */
function convertProjectForExport(
  project: ProjectFile,
  imageIdToPath: ReadonlyMap<string, string>
): ProjectFile {
  return {
    ...project,
    items: project.items.map((item) => ({
      ...item,
      imageSource: convertImageSourceForExport(item.imageSource, imageIdToPath),
    })),
  };
}

/**
 * 全データまたは選択カテゴリのデータから一括バックアップ ZIP を生成する
 *
 * @param data - バックアップ元の全テーブルデータ
 * @param selection - バックアップ対象とするカテゴリの選択状態
 * @returns 生成された ZIP ファイルの Blob
 */
export async function createBackupZIP(
  data: BackupSourceData,
  selection: BackupCategorySelection
): Promise<Blob> {
  const JSZipModule = (await import("jszip")).default;
  const zip = new JSZipModule();

  const selectedProjects = selection.projects ? data.projects : [];
  const selectedTemplates = selection.userTemplates ? data.userTemplates : [];
  const selectedCards = selection.exerciseCards ? data.exerciseCards : [];
  const selectedSnippets = selection.customSnippets ? data.customSnippets : [];

  // 選択されたデータから参照されている取り込み画像ID（重複排除済み）
  const selectedReferencedIds = collectNonSampleImageSources([
    ...selectedProjects.flatMap((record) => record.data.items),
    ...selectedTemplates.flatMap((record) => record.data.items),
    ...selectedCards.map((record) => record.item),
  ]);

  // 全データから参照されている画像ID（「未使用の取り込み画像」の判定に使用）
  const allReferencedIds = collectAllReferencedImageIds(data);

  const imageIdToPath = new Map<string, string>();
  const imageEntries: BackupImageEntry[] = [];
  const imagesFolder = zip.folder("images");

  let imageIndex = 1;
  for (const image of data.images) {
    const isReferencedBySelected = selectedReferencedIds.has(image.id);
    const isUnused = !allReferencedIds.has(image.id);
    if (!isReferencedBySelected && !(selection.unusedImages && isUnused)) {
      continue;
    }

    const mimeType =
      image.blob.type || (await detectImageMimeType(image.blob)) || "";
    const ext = getExtensionFromMimeType(mimeType);
    const filename = `img_${String(imageIndex).padStart(3, "0")}.${ext}`;
    const path = `images/${filename}`;

    imageIdToPath.set(image.id, path);
    imagesFolder?.file(filename, image.blob);
    imageEntries.push({
      path,
      ...(image.fileName !== undefined && image.fileName !== ""
        ? { fileName: image.fileName }
        : {}),
      createdAt: image.createdAt.toISOString(),
    });
    imageIndex += 1;
  }

  const manifest: BackupManifest = {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    projects: selectedProjects.map((record) => ({
      id: record.id,
      updatedAt: record.updatedAt.toISOString(),
      data: convertProjectForExport(record.data, imageIdToPath),
    })),
    userTemplates: selectedTemplates.map((record) => ({
      id: record.id,
      name: record.name,
      updatedAt: record.updatedAt.toISOString(),
      data: convertProjectForExport(record.data, imageIdToPath),
    })),
    exerciseCards: selectedCards.map((record) => ({
      id: record.id,
      updatedAt: record.updatedAt.toISOString(),
      item: {
        ...record.item,
        imageSource: convertImageSourceForExport(
          record.item.imageSource,
          imageIdToPath
        ),
      },
    })),
    customSnippets: selectedSnippets.map((record) => ({
      id: record.id,
      value: record.value,
      createdAt: record.createdAt.toISOString(),
    })),
    images: imageEntries,
  };

  zip.file(BACKUP_MANIFEST_FILENAME, JSON.stringify(manifest, null, 2));

  return zip.generateAsync({ type: "blob" });
}

/**
 * 選択したカテゴリのデータを一括バックアップ ZIP としてダウンロードする
 *
 * @remarks
 * 書き出し前に保留中のオートセーブを確定させ、最新状態でダウンロードする。
 * ファイル名は `rehab-grid-backup-YYYY-MM-DD.zip` 形式。
 *
 * @param selection - バックアップ対象とするカテゴリの選択状態
 */
export async function exportBackupAsZIP(
  selection: BackupCategorySelection
): Promise<void> {
  await flushRegisteredAutosave();
  const data = await readAllBackupSourceData();
  const zipBlob = await createBackupZIP(data, selection);
  const filename = `rehab-grid-backup-${getDateString()}.zip`;
  downloadBlob(zipBlob, filename);
}

/**
 * 読み込み済み JSZip インスタンスから一括バックアップを検証・解析する
 */
async function parseBackupFromLoadedZip(zip: JSZip): Promise<ParsedBackup> {
  const manifestFile = zip.file(BACKUP_MANIFEST_FILENAME);
  if (!manifestFile) {
    throw new Error(BACKUP_ERROR_NO_BACKUP);
  }

  // ZIP爆弾対策: backup.json の展開サイズを制限し、累積展開サイズに含める
  const manifestBytes = await extractWithLimit(
    manifestFile,
    MAX_BACKUP_JSON_SIZE
  );
  let totalExtractedSize = manifestBytes.byteLength;

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(manifestBytes));
  } catch {
    throw new Error(IMPORT_ERROR_VALIDATION);
  }

  // 既知フォーマットだが未対応のスキーマバージョンの場合は専用エラーを返す
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "format" in parsed &&
    parsed.format === BACKUP_FORMAT &&
    "schemaVersion" in parsed &&
    parsed.schemaVersion !== BACKUP_SCHEMA_VERSION
  ) {
    throw new Error(BACKUP_ERROR_UNSUPPORTED_VERSION);
  }

  const result = backupManifestSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(IMPORT_ERROR_VALIDATION);
  }

  const manifest = result.data;

  // ZIP爆弾対策: images/ 配下のファイル数上限チェック
  const zipImageEntries = zip
    .file(/^images\/.+/)
    .filter((entry) => !entry.dir);
  if (zipImageEntries.length > MAX_BACKUP_IMAGE_COUNT) {
    throw new Error(IMPORT_ERROR_TOO_MANY_IMAGES);
  }

  // マニフェストのメタ情報をパスで引けるようにする
  const metaByPath = new Map<string, BackupImageEntry>();
  for (const entry of manifest.images) {
    if (!metaByPath.has(entry.path)) {
      metaByPath.set(entry.path, entry);
    }
  }

  // 各データから参照されている安全な画像パスを収集
  const referencedPaths = new Set<string>();
  const allItems: EditorItem[] = [
    ...manifest.projects.flatMap((entry) => entry.data.items),
    ...manifest.userTemplates.flatMap((entry) => entry.data.items),
    ...manifest.exerciseCards.map((entry) => entry.item),
  ];
  for (const item of allItems) {
    if (BACKUP_IMAGE_PATH_PATTERN.test(item.imageSource)) {
      referencedPaths.add(item.imageSource);
    }
  }

  // 展開対象は「マニフェスト記載」または「データから参照されている」安全なパスのみ
  const candidatePaths = new Set<string>([
    ...metaByPath.keys(),
    ...referencedPaths,
  ]);
  if (candidatePaths.size > MAX_BACKUP_IMAGE_COUNT) {
    throw new Error(IMPORT_ERROR_TOO_MANY_IMAGES);
  }

  const images = new Map<string, ParsedBackupImage>();
  const now = new Date();

  for (const path of candidatePaths) {
    const entry = zip.file(path);
    if (!entry || entry.dir) continue;

    try {
      const remaining = MAX_BACKUP_EXTRACTED_SIZE - totalExtractedSize;
      const bytes = await extractWithLimit(entry, remaining);
      totalExtractedSize += bytes.byteLength;

      // マジックバイトで有効な画像形式を検証し、MIMEタイプを付与する
      const rawBlob = new Blob([bytes]);
      const mimeType = await detectImageMimeType(rawBlob);
      if (mimeType === null) continue;

      const meta = metaByPath.get(path);
      images.set(path, {
        blob: new Blob([bytes], { type: mimeType }),
        ...(meta?.fileName !== undefined && meta.fileName !== ""
          ? { fileName: meta.fileName }
          : {}),
        createdAt: meta ? toValidDate(meta.createdAt, now) : now,
      });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message === IMPORT_ERROR_EXTRACTED_TOO_LARGE
      ) {
        throw error;
      }
      // 1 枚の破損画像で復元全体を失敗させない
      continue;
    }
  }

  // 検証を通過した画像のうち、どのデータからも参照されていないものを抽出
  const unusedImagePaths = new Set<string>();
  for (const path of images.keys()) {
    if (!referencedPaths.has(path)) {
      unusedImagePaths.add(path);
    }
  }

  const counts: BackupSummaryCounts = {
    projects: manifest.projects.length,
    userTemplates: manifest.userTemplates.length,
    exerciseCards: manifest.exerciseCards.length,
    customSnippets: manifest.customSnippets.length,
    unusedImages: unusedImagePaths.size,
    totalImages: images.size,
  };

  return {
    manifest,
    images,
    unusedImagePaths,
    counts,
  };
}

/**
 * 一括バックアップ ZIP ファイルを検証・解析する（DB にはまだ書き込まない）
 *
 * @param file - 一括バックアップ ZIP ファイル
 * @returns パース・検証済みのバックアップデータ
 * @throws ファイルサイズ超過・破損 ZIP・backup.json 不在・バリデーションエラー時
 */
export async function parseBackupZIP(file: File): Promise<ParsedBackup> {
  const fileType = await detectImportFileType(file);
  if (fileType !== "zip") {
    throw new Error(IMPORT_ERROR_INVALID_FORMAT);
  }

  if (file.size > MAX_BACKUP_ZIP_SIZE) {
    throw new Error(IMPORT_ERROR_FILE_TOO_LARGE);
  }

  const JSZipModule = (await import("jszip")).default;
  let zip: JSZip;
  try {
    zip = await JSZipModule.loadAsync(file);
  } catch {
    throw new Error(IMPORT_ERROR_CORRUPTED_ZIP);
  }

  return parseBackupFromLoadedZip(zip);
}

/**
 * 選択されたファイルが「単一指導箋」か「一括バックアップ」かを中身で自動判別して解析する
 *
 * @remarks
 * 「指導箋を開く」と「バックアップから復元」のどちらからファイルを選んでも
 * 正しいフローへ案内できるようにするための共通入口。
 *
 * @param file - ユーザーが選択した JSON または ZIP ファイル
 * @returns 自動判別されたインポート解析結果
 */
export async function inspectImportFile(
  file: File
): Promise<ImportedFileResult> {
  const fileType = await detectImportFileType(file);

  if (fileType === "json") {
    const result = await importProject(file);
    return { kind: "project", result };
  }

  if (fileType !== "zip") {
    throw new Error(IMPORT_ERROR_INVALID_FORMAT);
  }

  if (file.size > MAX_BACKUP_ZIP_SIZE) {
    throw new Error(IMPORT_ERROR_FILE_TOO_LARGE);
  }

  const JSZipModule = (await import("jszip")).default;
  let zip: JSZip;
  try {
    zip = await JSZipModule.loadAsync(file);
  } catch {
    throw new Error(IMPORT_ERROR_CORRUPTED_ZIP);
  }

  if (zip.file(BACKUP_MANIFEST_FILENAME)) {
    const backup = await parseBackupFromLoadedZip(zip);
    return { kind: "backup", backup };
  }

  if (zip.file(SINGLE_PROJECT_FILENAME)) {
    if (file.size > MAX_IMPORT_ZIP_SIZE) {
      throw new Error(IMPORT_ERROR_FILE_TOO_LARGE);
    }
    const result = await importProject(file);
    return { kind: "project", result };
  }

  throw new Error(IMPORT_ERROR_NO_PROJECT);
}
