/**
 * エディタ関連の定数
 *
 * Canvas固有のドラッグ＆ドロップのデータ型識別子やレイアウトオプションを定義
 */

import { type LayoutType } from "@rehab-grid/core/types";
import {
  Columns2,
  Columns3,
  Columns4,
  type LucideIcon,
  Square,
} from "lucide-react";

/** 画像ライブラリからドラッグ時に使用するデータ型識別子 */
export const IMAGE_DRAG_TYPE = "application/x-rehab-grid-image-id";

/** デフォルトプロジェクト名（未設定時の表示） */
export const DEFAULT_PROJECT_TITLE = "無題のプロジェクト";

/** アイテム表示時のアニメーション遅延間隔（秒） */
export const ANIMATION_STAGGER_DELAY = 0.05;

/** 画像ライブラリのプレースホルダー画像数 */
export const PLACEHOLDER_IMAGE_COUNT = 6;

/** 注意点の最大登録数 */
export const MAX_PRECAUTIONS_COUNT = 5;

/** 運動カードの最大登録数 */
export const MAX_ITEM_COUNT = 10;

/** ロングプレス判定の閾値（ミリ秒） */
export const LONG_PRESS_DURATION = 500;

/**
 * グリッドレイアウトオプション
 *
 * レイアウト切替UIで使用するアイコンとラベルの定義
 * 各列数に対応するアイコンを使用（Square=1列、Columns2=2列、Columns3=3列、Columns4=4列）
 */
export const LAYOUT_OPTIONS: {
  id: LayoutType;
  icon: LucideIcon;
  label: string;
}[] = [
  { id: "grid1", icon: Square, label: "1列" },
  { id: "grid2", icon: Columns2, label: "2列" },
  { id: "grid3", icon: Columns3, label: "3列" },
  { id: "grid4", icon: Columns4, label: "4列" },
];

/**
 * エディタ（Canvas）のテキストスタイル設定
 *
 * Tailwind CSSクラス名を定数化。
 * PDFとの論理的対応関係は shared.ts の FONT_SIZES を参照。
 */
export const EDITOR_TEXT_STYLE = {
  /** タイトルのフォントサイズ (PDF: FONT_SIZES.title = 14pt) */
  titleSize: "text-lg",
  /** 説明文のフォントサイズ (PDF: FONT_SIZES.description = 9pt) */
  descriptionSize: "text-xs",
  /** 用量ラベルのフォントサイズ (PDF: FONT_SIZES.dosageLabel = 7pt) */
  dosageLabelSize: "text-xs",
  /** 用量数値のフォントサイズ - 数値強調型 (PDF: FONT_SIZES.dosageValue = 14pt) */
  dosageValueSize: "text-2xl",
  /** 注意点タイトルのフォントサイズ (PDF: FONT_SIZES.precautionTitle = 8pt) */
  precautionTitleSize: "text-xs",
  /** 注意点テキストのフォントサイズ (PDF: FONT_SIZES.precautionText = 8pt) */
  precautionTextSize: "text-xs",
} as const;

/**
 * 1列グリッド用エディタテキストスタイル設定
 *
 * 高齢者向けに読みやすくするため拡大
 * grid1レイアウト時のみ使用
 * タイトル・用量は説明・注意より大きく設定
 *
 * @remarks
 * Canvas（プレビュー用）とPDF（A4印刷用）では異なるサイズ設定。
 * Canvasは視認性重視で大きめ、PDFはA4に収まるよう調整。
 * PDF対応値は shared.ts の FONT_SIZES_SINGLE_COLUMN を参照。
 */
export const EDITOR_TEXT_STYLE_SINGLE_COLUMN = {
  /** タイトルのフォントサイズ (PDF: 24pt) */
  titleSize: "text-5xl",
  /** 説明文のフォントサイズ (PDF: 16pt) */
  descriptionSize: "text-4xl",
  /** 用量数値のフォントサイズ (PDF: 28pt) */
  dosageValueSize: "text-6xl",
  /** 用量ラベルのフォントサイズ (PDF: 12pt) */
  dosageLabelSize: "text-3xl",
  /** 注意点タイトルのフォントサイズ (PDF: 14pt) */
  precautionTitleSize: "text-3xl",
  /** 注意点テキストのフォントサイズ (PDF: 14pt) */
  precautionTextSize: "text-3xl",
} as const;
