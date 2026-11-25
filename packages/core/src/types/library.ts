/**
 * マイライブラリ（マイテンプレート・マイ運動・マイ定型文）関連の型定義
 */

import { type EditorItem } from "./editor";
import { type ProjectFile } from "./project";

/**
 * IndexedDB に保存するマイテンプレート
 *
 * @remarks
 * 取り込み画像は画像ライブラリの ID で参照する（画像そのものは複製しない）
 */
export type UserTemplateRecord = {
  /** テンプレートID（nanoid で生成） */
  id: string;
  /** テンプレート名 */
  name: string;
  /** 保存したときの指導箋の内容 */
  data: ProjectFile;
  /** 更新日時 */
  updatedAt: Date;
};

/**
 * IndexedDB に保存するマイ運動（カード 1 枚分）
 *
 * @remarks
 * 呼び出すときは ID を振り直して末尾に追加するため、item.id と item.order は使わない
 */
export type ExerciseCardRecord = {
  /** マイ運動のID（nanoid で生成） */
  id: string;
  /** 運動名（item.title と同じ。インデックス用） */
  title: string;
  /** 保存したときのカードの内容 */
  item: EditorItem;
  /** 更新日時 */
  updatedAt: Date;
};

/**
 * IndexedDB に保存するマイ定型文（注意点）
 */
export type CustomSnippetRecord = {
  /** 定型文のID（nanoid で生成） */
  id: string;
  /** 定型文の内容 */
  value: string;
  /** 作成日時（表示順に使う） */
  createdAt: Date;
};
