/**
 * プロジェクトファイル関連の型定義
 *
 * CLAUDE.md の ProjectFile スキーマに従って定義
 */

import { type EditorItem, type LayoutType } from "./editor";

/**
 * プロジェクトのメタ情報
 */
export type ProjectMeta = {
  /** アプリのバージョン */
  version: string;
  /** 作成日時（ISO 8601形式） */
  createdAt: string;
  /** 更新日時（ISO 8601形式） */
  updatedAt: string;
  /** プロジェクトタイトル */
  title: string;
  /** 作成者名（オプション） */
  author?: string;
  /** プロジェクトタイプ（自主トレーニング指導箋に固定） */
  projectType: "training";
};

/**
 * プロジェクトの設定
 */
export type ProjectSettings = {
  /** グリッドレイアウトタイプ */
  layoutType: LayoutType;
  /** テーマカラー（将来実装予定） */
  themeColor: string;
};

/**
 * プロジェクトファイル全体の型
 *
 * エクスポート・インポート時に使用するデータ構造
 */
export type ProjectFile = {
  /** メタ情報 */
  meta: ProjectMeta;
  /** 設定 */
  settings: ProjectSettings;
  /** エディタアイテム一覧 */
  items: EditorItem[];
};

/**
 * IndexedDB に保存するプロジェクトレコード
 */
export type ProjectRecord = {
  /** プロジェクトID（単一プロジェクトの場合は固定値 'current'） */
  id: string;
  /** プロジェクトタイトル （data.meta.title と同期が必要）*/
  title: string;
  /** プロジェクトデータ（ProjectFile の JSON） */
  data: ProjectFile;
  /** 更新日時 （IndexedDB 保存用、data.meta.updatedAt と同期が必要）*/
  updatedAt: Date;
};

/**
 * IndexedDB に保存する画像レコード
 */
export type ImageRecord = {
  /** 画像ID（nanoid で生成） */
  id: string;
  /** 画像データ（Blob形式で保存） */
  blob: Blob;
  /** 作成日時 */
  createdAt: Date;
  /** ファイル名（拡張子なし、オプショナル - 既存データとの互換性のため） */
  fileName?: string;
};

/**
 * インポート結果の型
 *
 * プロジェクトのインポートやテンプレート適用時に使用
 */
export type ImportResult = {
  /** インポートされたプロジェクトデータ */
  project: ProjectFile;
  /** 画像IDとBlobのマップ（ZIPインポート/テンプレート時のみ、JSONの場合は空） */
  images: Map<string, Blob>;
};
