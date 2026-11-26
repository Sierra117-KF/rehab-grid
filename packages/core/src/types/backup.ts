/**
 * 一括バックアップ・復元関連の型定義
 */

import { type EditorItem } from "./editor";
import { type ImportResult, type ProjectFile } from "./project";

/**
 * 一括バックアップ・復元で対象にするカテゴリの選択状態
 */
export type BackupCategorySelection = {
  /** マイ指導箋 */
  projects: boolean;
  /** マイテンプレート */
  userTemplates: boolean;
  /** マイ運動 */
  exerciseCards: boolean;
  /** マイ定型文 */
  customSnippets: boolean;
  /** 未使用の取り込み画像（指導箋・テンプレート・マイ運動から参照されていない画像） */
  unusedImages: boolean;
};

/**
 * 一括バックアップの復元モード
 *
 * @remarks
 * merge: 既存データを残して追加 / replace: 端末のすべてのデータを入れ替え
 */
export type BackupRestoreMode = "merge" | "replace";

/**
 * backup.json に格納するマイ指導箋エントリ
 */
export type BackupProjectEntry = {
  /** プロジェクトID */
  id: string;
  /** 更新日時（ISO 8601形式） */
  updatedAt: string;
  /** プロジェクトデータ */
  data: ProjectFile;
};

/**
 * backup.json に格納するマイテンプレートエントリ
 */
export type BackupUserTemplateEntry = {
  /** テンプレートID */
  id: string;
  /** テンプレート名 */
  name: string;
  /** 更新日時（ISO 8601形式） */
  updatedAt: string;
  /** テンプレートの指導箋データ */
  data: ProjectFile;
};

/**
 * backup.json に格納するマイ運動エントリ
 */
export type BackupExerciseCardEntry = {
  /** マイ運動ID */
  id: string;
  /** 更新日時（ISO 8601形式） */
  updatedAt: string;
  /** カードデータ */
  item: EditorItem;
};

/**
 * backup.json に格納するマイ定型文エントリ
 */
export type BackupCustomSnippetEntry = {
  /** 定型文ID */
  id: string;
  /** 定型文の内容 */
  value: string;
  /** 作成日時（ISO 8601形式） */
  createdAt: string;
};

/**
 * backup.json に格納する取り込み画像のメタ情報エントリ
 */
export type BackupImageEntry = {
  /** ZIP 内の相対パス（例: "images/img_001.webp"） */
  path: string;
  /** 画像の表示用ファイル名（拡張子なし、オプショナル） */
  fileName?: string;
  /** 作成日時（ISO 8601形式） */
  createdAt: string;
};

/**
 * 一括バックアップマニフェスト（backup.json）の型
 */
export type BackupManifest = {
  /** 形式識別子 */
  format: "rehab-grid-backup";
  /** マニフェストのスキーマバージョン */
  schemaVersion: 1;
  /** 書き出し時のアプリバージョン */
  appVersion: string;
  /** 書き出し日時（ISO 8601形式） */
  exportedAt: string;
  /** マイ指導箋一覧 */
  projects: BackupProjectEntry[];
  /** マイテンプレート一覧 */
  userTemplates: BackupUserTemplateEntry[];
  /** マイ運動一覧 */
  exerciseCards: BackupExerciseCardEntry[];
  /** マイ定型文一覧 */
  customSnippets: BackupCustomSnippetEntry[];
  /** 取り込み画像のメタ情報一覧 */
  images: BackupImageEntry[];
};

/**
 * 各カテゴリの件数サマリー（エクスポート／復元ダイアログ表示用）
 */
export type BackupSummaryCounts = {
  /** マイ指導箋の件数 */
  projects: number;
  /** マイテンプレートの件数 */
  userTemplates: number;
  /** マイ運動の件数 */
  exerciseCards: number;
  /** マイ定型文の件数 */
  customSnippets: number;
  /** 未使用の取り込み画像の枚数 */
  unusedImages: number;
  /** 全取り込み画像の枚数（参照済み＋未使用） */
  totalImages: number;
};

/**
 * パース済み一括バックアップ内の検証済み画像データ
 */
export type ParsedBackupImage = {
  /** 検証済みの画像 Blob（MIME タイプ付与済み） */
  blob: Blob;
  /** 画像の表示用ファイル名（拡張子なし、オプショナル） */
  fileName?: string;
  /** 作成日時 */
  createdAt: Date;
};

/**
 * パース済みの一括バックアップデータ（DB 書き込み前の検証済み状態）
 */
export type ParsedBackup = {
  /** バリデーション・サニタイズ済みのマニフェスト */
  manifest: BackupManifest;
  /** ZIP 内相対パスから検証済み画像データへのマップ */
  images: Map<string, ParsedBackupImage>;
  /** どの指導箋・テンプレート・マイ運動からも参照されていない画像パスの集合 */
  unusedImagePaths: Set<string>;
  /** 各カテゴリの件数サマリー */
  counts: BackupSummaryCounts;
};

/**
 * 一括バックアップ復元の実行結果サマリー
 */
export type BackupRestoreSummary = {
  /** 復元したマイ指導箋の件数 */
  projects: number;
  /** 復元したマイテンプレートの件数 */
  userTemplates: number;
  /** 復元したマイ運動の件数 */
  exerciseCards: number;
  /** 復元したマイ定型文の件数 */
  customSnippets: number;
  /** 重複のためスキップしたマイ定型文の件数 */
  skippedSnippets: number;
  /** 復元した取り込み画像の枚数 */
  images: number;
};

/**
 * ファイル種別を自動判別したインポート解析結果
 */
export type ImportedFileResult =
  | { kind: "project"; result: ImportResult }
  | { kind: "backup"; backup: ParsedBackup };
