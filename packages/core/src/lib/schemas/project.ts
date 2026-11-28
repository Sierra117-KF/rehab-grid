/**
 * プロジェクトファイルの Zod スキーマ
 *
 * JSON インポート時の型安全なバリデーションを提供
 *
 * @remarks
 * TypeScript 型定義（src/types/）と同期を保つこと
 */

import {
  DEFAULT_THEME_COLOR,
  MAX_ITEM_COUNT,
  MAX_PRECAUTIONS_COUNT,
  TEXT_LIMITS,
  THEME_COLOR_PATTERN,
} from "@rehab-grid/core/lib/constants";
import { z } from "zod";

import { sanitizeText } from "./sanitize";

/**
 * 負荷・回数設定スキーマ
 *
 * インポート時に文字数制限を超えた値は自動的にカットされる
 */
export const dosagesSchema = z.object({
  /** 回数（例: "10回"）- サニタイズ後に最大文字数を超えた場合は自動カット */
  reps: z.string().transform((v) => sanitizeText(v).slice(0, TEXT_LIMITS.reps)),
  /** セット数（例: "3セット"）- サニタイズ後に最大文字数を超えた場合は自動カット */
  sets: z.string().transform((v) => sanitizeText(v).slice(0, TEXT_LIMITS.sets)),
  /** 頻度（例: "1日2回"）- サニタイズ後に最大文字数を超えた場合は自動カット */
  frequency: z
    .string()
    .transform((v) => sanitizeText(v).slice(0, TEXT_LIMITS.frequency)),
});

/**
 * マイ定型文の文字列を正規化する
 *
 * @remarks
 * HTML タグを除去してから前後の空白を除き、注意点の文字数上限で切り詰める。
 * 定型文ダイアログでの空チェック・重複判定と DB 保存で同じ基準を共有する。
 *
 * @param value - 入力された定型文
 * @returns 正規化後の定型文（登録できる文字がなければ空文字）
 */
export function normalizeCustomSnippetValue(value: string): string {
  return sanitizeText(value).trim().slice(0, TEXT_LIMITS.precaution);
}

/**
 * 注意点アイテムスキーマ
 *
 * インポート時に文字数制限を超えた値は自動的にカットされる
 */
export const precautionSchema = z.object({
  /** 一意のID（nanoid で生成） */
  id: z.string(),
  /** 注意点の内容（サニタイズ後に最大文字数を超えた場合は自動カット） */
  value: z
    .string()
    .transform((v) => sanitizeText(v).slice(0, TEXT_LIMITS.precaution)),
});

/**
 * グリッドレイアウトタイプスキーマ
 */
export const layoutTypeSchema = z.enum([
  "grid1",
  "grid2",
  "grid3",
  "grid4",
  "slide",
]);

/**
 * エディタアイテムスキーマ
 *
 * インポート時に文字数制限を超えた値は自動的にカットされる
 */
export const editorItemSchema = z.object({
  /** 一意のID（nanoid で生成） */
  id: z.string(),
  /** 並び順（グリッド内での表示順序） */
  order: z.number(),
  /** 運動名（サニタイズ後に最大文字数を超えた場合は自動カット） */
  title: z
    .string()
    .transform((v) => sanitizeText(v).slice(0, TEXT_LIMITS.title)),
  /**
   * 画像ソース
   * - IndexedDB: 画像ID
   * - ZIPエクスポート: 相対パス
   * - JSONエクスポート: 空文字列
   */
  imageSource: z.string(),
  /** 運動の説明・手順（サニタイズ後に最大文字数を超えた場合は自動カット） */
  description: z
    .string()
    .transform((v) => sanitizeText(v).slice(0, TEXT_LIMITS.description)),
  /** 負荷・回数設定（オプション） */
  dosages: dosagesSchema.optional(),
  /** 注意点のリスト（オプション、最大件数を超えた場合は自動カット） */
  precautions: z
    .array(precautionSchema)
    .transform((arr) => arr.slice(0, MAX_PRECAUTIONS_COUNT))
    .optional(),
});

/**
 * プロジェクトメタ情報スキーマ
 */
export const projectMetaSchema = z.object({
  /** アプリのバージョン */
  version: z.string(),
  /** 作成日時（ISO 8601形式） */
  createdAt: z.string(),
  /** 更新日時（ISO 8601形式） */
  updatedAt: z.string(),
  /** プロジェクトタイトル（サニタイズ後に最大文字数を超えた場合は自動カット） */
  title: z
    .string()
    .transform((v) => sanitizeText(v).slice(0, TEXT_LIMITS.projectTitle)),
  /** 作成者名（オプション、サニタイズ後に最大文字数を超えた場合は自動カット） */
  author: z
    .string()
    .optional()
    .transform((v) =>
      v !== undefined ? sanitizeText(v).slice(0, TEXT_LIMITS.author) : v
    ),
  /** プロジェクトタイプ（自主トレーニング指導箋に固定） */
  projectType: z.literal("training"),
});

/**
 * 最大文字数つきの任意の文字列のスキーマ
 *
 * サニタイズ後に最大文字数を超えた分はカットする。文字列以外は未指定として扱う
 * （デフォルト値は resolveProjectSettings で補う）
 *
 * @param maxLength - 最大文字数
 * @returns 文字列スキーマ
 */
const optionalTextSchema = (maxLength: number) =>
  z
    .string()
    .transform((v) => sanitizeText(v).slice(0, maxLength))
    .optional()
    .catch(undefined);

/** 用量ラベル 1 つ分のスキーマ */
const dosageLabelSchema = optionalTextSchema(TEXT_LIMITS.dosageLabel);

/**
 * PDF ヘッダーの項目のスキーマ
 *
 * キーごとに不正な値を未指定として扱い、ほかのキーは残す
 */
const sheetHeaderSchema = z.object({
  /** 氏名欄を出すか */
  showPatientNameBox: z.boolean().optional().catch(undefined),
  /** 日付欄 */
  dateMode: z.enum(["none", "blank", "printed"]).optional().catch(undefined),
});

/**
 * プロジェクト設定スキーマ
 *
 * @remarks
 * 2-2 以降の項目はオプショナルで、不正な値や型違いは未指定として扱い、インポート全体を失敗させない
 */
export const projectSettingsSchema = z.object({
  /** グリッドレイアウトタイプ */
  layoutType: layoutTypeSchema,
  /** テーマカラー（#RRGGBB 以外の値は DEFAULT_THEME_COLOR にフォールバック） */
  themeColor: z
    .string()
    .transform((v) => (THEME_COLOR_PATTERN.test(v) ? v : DEFAULT_THEME_COLOR)),
  /** 印刷の色づかい */
  printColorMode: z
    .enum(["color", "monochrome"])
    .optional()
    .catch(undefined),
  /** カード内の文字サイズ */
  textScale: z.enum(["standard", "large"]).optional().catch(undefined),
  /** PDF の用紙の向き */
  pageOrientation: z
    .enum(["auto", "portrait", "landscape"])
    .optional()
    .catch(undefined),
  /** カード番号を表示するか */
  showCardNumbers: z.boolean().optional().catch(undefined),
  /** 用量のラベル */
  dosageLabels: z
    .object({
      reps: dosageLabelSchema,
      sets: dosageLabelSchema,
      frequency: dosageLabelSchema,
    })
    .optional()
    .catch(undefined),
  /** PDF ヘッダーの項目 */
  header: sheetHeaderSchema.optional().catch(undefined),
  /** 自主トレ実施チェック表 */
  checkTable: z.enum(["none", "weekly", "monthly"]).optional().catch(undefined),
});

/**
 * プロジェクトファイル全体のスキーマ
 *
 * @example
 * ```typescript
 * import { projectFileSchema } from "@rehab-grid/core/lib/schemas";
 *
 * const result = projectFileSchema.safeParse(jsonData);
 * if (result.success) {
 *   const project = result.data;
 * }
 * ```
 */
export const projectFileSchema = z.object({
  /** メタ情報 */
  meta: projectMetaSchema,
  /** 設定 */
  settings: projectSettingsSchema,
  /** エディタアイテム一覧（最大件数を超えた場合は自動カット） */
  items: z
    .array(editorItemSchema)
    .transform((arr) => arr.slice(0, MAX_ITEM_COUNT)),
});
