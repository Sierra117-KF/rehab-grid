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
 * 印刷の色づかい（color: カラー / monochrome: 白黒・インク節約）
 */
export type PrintColorMode = "color" | "monochrome";

/**
 * カード内の文字サイズ（standard: 標準 / large: 大きめ）
 */
export type TextScale = "standard" | "large";

/**
 * PDF の用紙の向き（auto: 1〜2列は縦・3〜4列は横）
 */
export type PageOrientation = "auto" | "portrait" | "landscape";

/**
 * 用量（回数・セット・頻度）の欄に表示するラベル
 */
export type DosageLabels = {
  /** 回数の欄のラベル（例: 「秒数」「時間」） */
  reps: string;
  /** セットの欄のラベル（例: 「左右」） */
  sets: string;
  /** 頻度の欄のラベル（例: 「目安」「強度」） */
  frequency: string;
};

/**
 * プロジェクトの設定
 *
 * @remarks
 * 項目を追加するときはオプショナルにし、既存の JSON / ZIP・IndexedDB のデータを読めるようにする。
 * デフォルト値は resolveProjectSettings で補う。
 */
export type ProjectSettings = {
  /** グリッドレイアウトタイプ */
  layoutType: LayoutType;
  /** テーマカラー（#RRGGBB。カードの枠線などの指導箋の見た目に使う） */
  themeColor: string;
  /** 印刷の色づかい（デフォルト: "color"） */
  printColorMode?: PrintColorMode;
  /** カード内の文字サイズ（デフォルト: "standard"。1列は常に大きめ） */
  textScale?: TextScale;
  /** PDF の用紙の向き（デフォルト: "auto"。1列は常に縦） */
  pageOrientation?: PageOrientation;
  /** カード番号を表示するか（デフォルト: false） */
  showCardNumbers?: boolean;
  /** 用量のラベル（未指定・空欄のキーは LABELS の reps / sets / frequency） */
  dosageLabels?: Partial<DosageLabels>;
};

/**
 * デフォルト値を補ったプロジェクト設定
 *
 * @remarks
 * ストアと PDF 生成はこの型で設定を持つため、各所でフォールバックを書かずに済む
 */
export type ResolvedProjectSettings = Required<
  Omit<ProjectSettings, "dosageLabels">
> & {
  /** 用量のラベル（全キーがそろっている） */
  dosageLabels: DosageLabels;
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
