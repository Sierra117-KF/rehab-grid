/**
 * アプリケーション全体の定数
 *
 * バージョン情報、タイミング設定などを定義
 */

/** アプリ名（日本語） */
export const APP_NAME = "リハぐり";

/** アプリ名（英語） */
export const APP_NAME_EN = "REHAB_GRID";

/** アプリアイコン（絵文字） */
export const APP_ICON = "📋";

/** アプリのバージョン（プロジェクトメタデータ用） */
export const APP_VERSION = "1.2.0";

/**
 * 旧バージョン（単一プロジェクト保存）で使っていたプロジェクトID
 *
 * @remarks
 * 既存データは主キーを変えずに 1 件目のプロジェクトとして扱う（新しいプロジェクトは nanoid で採番）
 */
export const LEGACY_PROJECT_ID = "current";

/** 最後に開いていたプロジェクトIDを保持する localStorage のキー */
export const ACTIVE_PROJECT_ID_STORAGE_KEY = "rehab-grid-active-project-id";

/** オートセーブの遅延時間（ミリ秒） */
export const AUTOSAVE_DELAY = 2000;
