/**
 * テンプレート関連の型定義
 *
 * 運動メニューテンプレートのメタデータと関連型を定義
 */

/**
 * テンプレートのメタデータ
 *
 * テンプレート一覧の表示やロード時に使用
 */
export type TemplateMetadata = {
  /** 一意のID（例: "lower-back-exercises"） */
  id: string;
  /** 表示名（例: "腰痛体操セット"） */
  name: string;
  /** 説明文 */
  description: string;
  /** カード枚数 */
  cardCount: number;
  /** public/templates/ からの相対パス */
  path: string;
};
