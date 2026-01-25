/**
 * 更新履歴の型定義
 */

/** 更新カテゴリの種類 */
export type ChangelogCategory = "features" | "improvements" | "fixes";

/**
 * 更新エントリ
 *
 * @remarks
 * バージョンごとの更新情報を表す型。
 * categoriesは任意のカテゴリを含むことができる（すべて必須ではない）。
 */
export type ChangelogEntry = {
  /** バージョン番号（例: "v0.1.0"） */
  version: string;
  /** 公開日（ISO形式: "YYYY-MM-DD"） */
  date: string;
  /** 更新タイトル（例: "初期リリース"） */
  title: string;
  /** カテゴリ別の更新内容 */
  categories: Partial<Record<ChangelogCategory, string[]>>;
};
