/**
 * Canvas/PDF共通の定数
 *
 * CanvasとPDFの両方で使用される設定値を一元管理し、
 * 一貫性と保守性を確保する
 */

import { type LayoutType } from "@rehab-grid/core/types/editor";

/**
 * テキストフィールドの最大文字数
 */
export const TEXT_LIMITS = {
  /** プロジェクトタイトルの最大文字数 */
  projectTitle: 20,
  /** 運動名の最大文字数 */
  title: 20,
  /** 説明の最大文字数 */
  description: 200,
  /** 注意点1件あたりの最大文字数 */
  precaution: 50,
  /** 回数の最大文字数 */
  reps: 10,
  /** セット数の最大文字数 */
  sets: 10,
  /** 頻度の最大文字数 */
  frequency: 10,
} as const;

/**
 * 共通ラベル
 *
 * Canvas/PDF両方で使用する表示文字列
 */
export const LABELS = {
  /** 無題の運動 */
  untitledExercise: "無題の運動",
  /** 注意点セクションタイトル */
  precautionTitle: "注意点",
  /** 画像なしプレースホルダー */
  noImage: "画像なし",
  /** 回数ラベル */
  reps: "回数",
  /** セット数ラベル */
  sets: "セット",
  /** 頻度ラベル */
  frequency: "頻度",
} as const;

/**
 * レイアウトタイプに対応するグリッド列数
 */
export const LAYOUT_COLUMNS: Record<LayoutType, number> = {
  grid1: 1,
  grid2: 2,
  grid3: 3,
  grid4: 4,
} as const;

/**
 * テキスト表示の行数制限
 *
 * Canvasではline-clamp-N、PDFでは計算で使用
 */
export const LINE_CLAMP = {
  /** タイトルの最大行数 */
  title: 1,
  /** 説明の最大行数 */
  description: 4,
  /** 注意点の最大行数 */
  precaution: 3,
} as const;

/**
 * フォントサイズ定義（ポイント単位）
 *
 * PDFで直接使用。Canvasでは対応するTailwindクラスを使用:
 * - title: text-lg (≒18px)
 * - description: text-xs (≒12px)
 * - dosageValue: text-2xl (≒24px) - 数値強調型
 * - dosageLabel: text-xs (≒12px)
 * - precautionTitle: text-xs (≒12px)
 * - precautionText: text-xs (≒12px)
 */
export const FONT_SIZES = {
  /** タイトルのフォントサイズ */
  title: 14,
  /** 説明文のフォントサイズ */
  description: 9,
  /** 用量ラベルのフォントサイズ（Canvasのtext-xs相当） */
  dosageLabel: 7,
  /** 用量数値のフォントサイズ（Canvas: text-2xl）。PDFではタイトルと同じ14ptに設定 */
  dosageValue: 14,
  /** 注意点タイトルのフォントサイズ */
  precautionTitle: 8,
  /** 注意点テキストのフォントサイズ */
  precautionText: 8,
  /** ヘッダーのフォントサイズ（PDF専用） */
  header: 12,
  /** フッターのフォントサイズ（PDF専用） */
  footer: 8,
} as const;

/**
 * 1列グリッド用フォントサイズ定義（ポイント単位）
 *
 * 高齢者向けに読みやすくするため拡大（標準の約1.7倍）
 * grid1レイアウト時のみ使用
 * タイトル・用量は説明・注意より大きく設定
 * A4用紙に1枚の運動カードが収まるよう調整
 */
export const FONT_SIZES_SINGLE_COLUMN = {
  /** タイトルのフォントサイズ（14pt → 24pt） */
  title: 24,
  /** 説明文のフォントサイズ（9pt → 16pt） */
  description: 16,
  /** 用量数値のフォントサイズ（14pt → 28pt） */
  dosageValue: 28,
  /** 用量ラベルのフォントサイズ（7pt → 12pt） */
  dosageLabel: 12,
  /** 注意点タイトルのフォントサイズ（8pt → 14pt） */
  precautionTitle: 14,
  /** 注意点テキストのフォントサイズ（8pt → 14pt） */
  precautionText: 14,
} as const;

/**
 * 用量表示の色設定（HEX値）
 *
 * Canvas（CSS変数経由）とPDFの両方で使用する信頼できる単一の情報源
 * 数値強調型デザイン: グレースケール + blue-500アクセント
 *
 * @remarks
 * 色を変更する場合は、このファイルと globals.css の両方を更新すること
 */
export const DOSAGE_COLORS = {
  /** 数値色: slate-800 */
  value: "#1e293b",
  /** ラベル色: slate-400 */
  label: "#94a3b8",
  /** アクセント色: blue-500 */
  accent: "#3b82f6",
  /** アクセント色（薄い）: blue-500/30 */
  accentLight: "rgba(59, 130, 246, 0.3)",
} as const;
