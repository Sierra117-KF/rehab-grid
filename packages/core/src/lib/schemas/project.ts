/**
 * プロジェクトファイルの Zod スキーマ
 *
 * JSON インポート時の型安全なバリデーションを提供
 *
 * @remarks
 * TypeScript 型定義（src/types/）と同期を保つこと
 */

import {
  MAX_ITEM_COUNT,
  MAX_PRECAUTIONS_COUNT,
  TEXT_LIMITS,
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
export const layoutTypeSchema = z.enum(["grid1", "grid2", "grid3", "grid4"]);

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
  /** 作成者名（オプション、サニタイズ済み） */
  author: z
    .string()
    .optional()
    .transform((v) => (v !== undefined ? sanitizeText(v) : v)),
  /** プロジェクトタイプ（自主トレーニング指導箋に固定） */
  projectType: z.literal("training"),
});

/**
 * プロジェクト設定スキーマ
 */
export const projectSettingsSchema = z.object({
  /** グリッドレイアウトタイプ */
  layoutType: layoutTypeSchema,
  /** テーマカラー（サニタイズ済み） */
  themeColor: z.string().transform((v) => sanitizeText(v)),
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
