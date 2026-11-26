/**
 * 一括バックアップマニフェスト（backup.json）の Zod スキーマ
 *
 * 一括バックアップ ZIP インポート時の型安全なバリデーションとサニタイズを提供
 */

import {
  DEFAULT_PROJECT_TITLE,
  MAX_BACKUP_IMAGE_COUNT,
  MAX_BACKUP_RECORD_COUNT,
  TEXT_LIMITS,
} from "@rehab-grid/core/lib/constants";
import { z } from "zod";

import {
  editorItemSchema,
  normalizeCustomSnippetValue,
  projectFileSchema,
} from "./project";
import { sanitizeText } from "./sanitize";

/** 一括バックアップ形式の識別子 */
export const BACKUP_FORMAT = "rehab-grid-backup" as const;

/** サポートする一括バックアップのスキーマバージョン */
export const BACKUP_SCHEMA_VERSION = 1 as const;

/**
 * 一括バックアップ内の画像パスとして許可するパターン
 *
 * @remarks
 * パストラバーサル対策として `images/` 直下の安全なファイル名のみ許可する
 */
export const BACKUP_IMAGE_PATH_PATTERN = /^images\/[a-zA-Z0-9._-]+$/;

/** 画像ファイル名（表示用）の最大文字数 */
const MAX_IMAGE_FILE_NAME_LENGTH = 100;

/**
 * ISO 8601 日時文字列のスキーマ（不正な日時文字列は現在時刻にフォールバック）
 */
const safeIsoDateSchema = z.string().transform((value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : value;
});

/**
 * マイ指導箋エントリのスキーマ
 */
export const backupProjectEntrySchema = z.object({
  /** プロジェクトID */
  id: z.string(),
  /** 更新日時（ISO 8601形式） */
  updatedAt: safeIsoDateSchema,
  /** プロジェクトデータ */
  data: projectFileSchema,
});

/**
 * マイテンプレートエントリのスキーマ
 */
export const backupUserTemplateEntrySchema = z.object({
  /** テンプレートID */
  id: z.string(),
  /** テンプレート名（サニタイズ後に最大文字数でカット。空なら既定タイトル） */
  name: z.string().transform((value) => {
    const normalized = sanitizeText(value)
      .trim()
      .slice(0, TEXT_LIMITS.projectTitle);
    return normalized || DEFAULT_PROJECT_TITLE;
  }),
  /** 更新日時（ISO 8601形式） */
  updatedAt: safeIsoDateSchema,
  /** テンプレートの指導箋データ */
  data: projectFileSchema,
});

/**
 * マイ運動エントリのスキーマ
 */
export const backupExerciseCardEntrySchema = z.object({
  /** マイ運動ID */
  id: z.string(),
  /** 更新日時（ISO 8601形式） */
  updatedAt: safeIsoDateSchema,
  /** カードデータ */
  item: editorItemSchema,
});

/**
 * マイ定型文エントリのスキーマ
 */
export const backupCustomSnippetEntrySchema = z.object({
  /** 定型文ID */
  id: z.string(),
  /** 定型文の内容（正規化後） */
  value: z.string().transform((value) => normalizeCustomSnippetValue(value)),
  /** 作成日時（ISO 8601形式） */
  createdAt: safeIsoDateSchema,
});

/**
 * 取り込み画像メタ情報エントリのスキーマ
 */
export const backupImageEntrySchema = z.object({
  /** ZIP 内の相対パス（images/ 直下のみ許可） */
  path: z.string().regex(BACKUP_IMAGE_PATH_PATTERN),
  /** 画像の表示用ファイル名（サニタイズ後に最大文字数でカット。空なら undefined） */
  fileName: z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      const normalized = sanitizeText(value)
        .trim()
        .slice(0, MAX_IMAGE_FILE_NAME_LENGTH);
      return normalized === "" ? undefined : normalized;
    }),
  /** 作成日時（ISO 8601形式） */
  createdAt: safeIsoDateSchema,
});

/**
 * 一括バックアップマニフェスト（backup.json）全体のスキーマ
 */
export const backupManifestSchema = z.object({
  /** 形式識別子 */
  format: z.literal(BACKUP_FORMAT),
  /** スキーマバージョン */
  schemaVersion: z.literal(BACKUP_SCHEMA_VERSION),
  /** アプリバージョン */
  appVersion: z.string(),
  /** 書き出し日時 */
  exportedAt: safeIsoDateSchema,
  /** マイ指導箋一覧 */
  projects: z
    .array(backupProjectEntrySchema)
    .max(MAX_BACKUP_RECORD_COUNT)
    .default([]),
  /** マイテンプレート一覧 */
  userTemplates: z
    .array(backupUserTemplateEntrySchema)
    .max(MAX_BACKUP_RECORD_COUNT)
    .default([]),
  /** マイ運動一覧 */
  exerciseCards: z
    .array(backupExerciseCardEntrySchema)
    .max(MAX_BACKUP_RECORD_COUNT)
    .default([]),
  /** マイ定型文一覧（上限超過は拒否し、正規化後に空文字になったエントリは除外） */
  customSnippets: z
    .array(backupCustomSnippetEntrySchema)
    .max(MAX_BACKUP_RECORD_COUNT)
    .default([])
    .transform((arr) => arr.filter((entry) => entry.value !== "")),
  /** 取り込み画像のメタ情報一覧 */
  images: z
    .array(backupImageEntrySchema)
    .max(MAX_BACKUP_IMAGE_COUNT)
    .default([]),
});
