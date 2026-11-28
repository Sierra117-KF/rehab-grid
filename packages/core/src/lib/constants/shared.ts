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
  /** 作成者名の最大文字数 */
  author: 20,
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
  /** 用量ラベル（「回数」などの欄の名前）1 つあたりの最大文字数 */
  dosageLabel: 6,
} as const;

/**
 * 共通ラベル
 *
 * Canvas/PDF両方で使用する表示文字列。
 * 用量のラベル（reps / sets / frequency）はデザイン設定で変えられるため、
 * 描画では解決済みの settings.dosageLabels を使う（ここはデフォルト値）
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
 *
 * スライドは 1 ページに 1 枚のため 1 列として扱う
 */
export const LAYOUT_COLUMNS: Record<LayoutType, number> = {
  grid1: 1,
  grid2: 2,
  grid3: 3,
  grid4: 4,
  slide: 1,
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
 * スライド用フォントサイズ定義（ポイント単位）
 *
 * A4 横 1 ページに横長カード 1 枚を置く slide レイアウト時のみ使用（文字サイズの設定は使わない）。
 * 説明と注意点は右の列に収めるため、1 列より少し小さくしている
 */
export const FONT_SIZES_SLIDE = {
  /** タイトルのフォントサイズ */
  title: 24,
  /** 説明文のフォントサイズ */
  description: 14,
  /** 用量数値のフォントサイズ */
  dosageValue: 28,
  /** 用量ラベルのフォントサイズ */
  dosageLabel: 12,
  /** 注意点タイトルのフォントサイズ */
  precautionTitle: 13,
  /** 注意点テキストのフォントサイズ */
  precautionText: 13,
} as const;

/**
 * 「大きめ」の文字サイズ定義（ポイント単位）
 *
 * 2〜4列で文字サイズ「大きめ」を選んだときに使う（標準の約1.25倍）。
 * 1列は FONT_SIZES_SINGLE_COLUMN で拡大済みのため使わない。
 */
export const FONT_SIZES_LARGE = {
  /** タイトルのフォントサイズ（14pt → 18pt） */
  title: 18,
  /** 説明文のフォントサイズ（9pt → 11pt） */
  description: 11,
  /** 用量数値のフォントサイズ（14pt → 18pt） */
  dosageValue: 18,
  /** 用量ラベルのフォントサイズ（7pt → 9pt） */
  dosageLabel: 9,
  /** 注意点タイトルのフォントサイズ（8pt → 10pt） */
  precautionTitle: 10,
  /** 注意点テキストのフォントサイズ（8pt → 10pt） */
  precautionText: 10,
} as const;

/**
 * カード番号バッジの大きさ（タイトルのフォントサイズに対する比率）
 *
 * Canvas（em 指定）と PDF で同じ比率を使う
 */
export const CARD_NUMBER_BADGE_RATIO = {
  /** バッジの直径 */
  size: 1.4,
  /** 番号の文字サイズ */
  fontSize: 0.75,
} as const;

/**
 * 白黒・インク節約モードの色設定（HEX値）
 *
 * Canvas（CSS変数の上書き）とPDFの両方で使う。
 * 塗りつぶしをなくして枠線で区切り、グレースケール印刷でも判読できる濃さにする。
 */
export const MONOCHROME_COLORS = {
  /** カードの枠線: slate-500 */
  cardBorder: "#64748b",
  /** 用量の区切り線: slate-300 */
  dosageDivider: "#cbd5e1",
  /** 用量ラベル: slate-600（slate-400 はグレースケール印刷で薄すぎるため） */
  dosageLabel: "#475569",
  /** カード番号バッジの背景: slate-900 */
  cardNumberBackground: "#0f172a",
  /** 注意点の背景: 白（塗りつぶさない） */
  precautionBackground: "#ffffff",
  /** 注意点の枠線: slate-700 */
  precautionBorder: "#334155",
  /** 注意点の見出し: slate-900 */
  precautionTitle: "#0f172a",
  /** 注意点の本文: slate-800 */
  precautionText: "#1e293b",
} as const;

/**
 * 用量表示の色設定（HEX値）
 *
 * Canvas（CSS変数経由）とPDFの両方で使用する信頼できる単一の情報源
 * 区切り線の色はテーマカラーから求める
 *
 * @remarks
 * 色を変更する場合は、このファイルと globals.css の両方を更新すること
 */
export const DOSAGE_COLORS = {
  /** 数値色: slate-800 */
  value: "#1e293b",
  /** ラベル色: slate-400 */
  label: "#94a3b8",
} as const;
