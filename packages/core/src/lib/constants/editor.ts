/**
 * エディタ関連の定数
 *
 * Canvas固有のドラッグ＆ドロップのデータ型識別子やレイアウトオプションを定義
 */

import {
  type BadgeType,
  type CheckTableType,
  type LayoutType,
  type PageOrientation,
  type PrintColorMode,
  type ResolvedProjectSettings,
  type SheetDateMode,
  type TextScale,
} from "@rehab-grid/core/types";
import {
  Columns2,
  Columns3,
  Columns4,
  type LucideIcon,
  Presentation,
  Square,
} from "lucide-react";

/** 画像ライブラリからドラッグ時に使用するデータ型識別子 */
export const IMAGE_DRAG_TYPE = "application/x-rehab-grid-image-id";

/** デフォルトプロジェクト名（未設定時の表示） */
export const DEFAULT_PROJECT_TITLE = "無題のプロジェクト";

/** デフォルトのテーマカラー（新規作成時・インポート値が不正な場合に使用） */
export const DEFAULT_THEME_COLOR = "#3b82f6";

/** テーマカラーとして受け付ける形式（#RRGGBB） */
export const THEME_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

/**
 * テーマカラーのプリセット
 *
 * @remarks
 * 白い紙に印刷して判別しやすい濃さに限る。
 * オレンジはカードの選択枠（--primary = orange-600）と区別できるよう、一段濃い orange-700 にしている。
 */
export const THEME_COLOR_PRESETS: readonly { label: string; value: string }[] =
  [
    { label: "ブルー", value: DEFAULT_THEME_COLOR },
    { label: "オレンジ", value: "#c2410c" },
    { label: "エメラルド", value: "#059669" },
    { label: "ティール", value: "#0891b2" },
    { label: "バイオレット", value: "#7c3aed" },
    { label: "スレート", value: "#334155" },
  ];

/**
 * 用量の区切り線に使うテーマカラーの濃さ（0〜1）
 *
 * @remarks
 * 白地に重ねた不透明色として Canvas と PDF の両方で使う
 */
export const DOSAGE_DIVIDER_OPACITY = 0.3;

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

/** 編集履歴（Undo）の最大保持件数。超えた分は古い方から捨てる */
export const HISTORY_LIMIT = 50;

/**
 * 同じ入力欄への連続入力を 1 件の履歴にまとめる時間幅（ミリ秒）
 *
 * @remarks
 * 前回の記録からこの時間以内に同じ mergeKey で更新されたら、新しい履歴を積まない。
 * 時刻は入力のたびに更新するため、打ち続けている間は 1 件にまとまる。
 */
export const HISTORY_MERGE_WINDOW_MS = 800;

/**
 * レイアウトの表示ラベル（すべてのレイアウトを網羅する）
 */
const LAYOUT_LABELS: Record<LayoutType, string> = {
  grid1: "1列",
  grid2: "2列",
  grid3: "3列",
  grid4: "4列",
  slide: "スライド",
};

/**
 * レイアウトの表示ラベルを返す
 *
 * @param layoutType - レイアウトタイプ
 * @returns 「1列」〜「4列」「スライド」
 */
export function getLayoutLabel(layoutType: LayoutType): string {
  return LAYOUT_LABELS[layoutType];
}

/**
 * グリッドレイアウトオプション
 *
 * レイアウト切替UIで使用するアイコンとラベルの定義
 * 各列数に対応するアイコンを使用（Square=1列、Columns2=2列、Columns3=3列、Columns4=4列、Presentation=スライド）
 */
export const LAYOUT_OPTIONS: {
  id: LayoutType;
  icon: LucideIcon;
  label: string;
}[] = [
  { id: "grid1", icon: Square, label: LAYOUT_LABELS.grid1 },
  { id: "grid2", icon: Columns2, label: LAYOUT_LABELS.grid2 },
  { id: "grid3", icon: Columns3, label: LAYOUT_LABELS.grid3 },
  { id: "grid4", icon: Columns4, label: LAYOUT_LABELS.grid4 },
  { id: "slide", icon: Presentation, label: LAYOUT_LABELS.slide },
];

/**
 * 用紙の向きの選択肢（デザイン設定ダイアログ用）
 */
export const PAGE_ORIENTATION_OPTIONS: readonly {
  value: PageOrientation;
  label: string;
}[] = [
  { value: "auto", label: "自動" },
  { value: "portrait", label: "縦" },
  { value: "landscape", label: "横" },
];

/**
 * 印刷の色づかいの選択肢（デザイン設定ダイアログ用）
 */
export const PRINT_COLOR_MODE_OPTIONS: readonly {
  value: PrintColorMode;
  label: string;
}[] = [
  { value: "color", label: "カラー" },
  { value: "monochrome", label: "白黒" },
];

/**
 * 文字サイズの選択肢（デザイン設定ダイアログ用）
 */
export const TEXT_SCALE_OPTIONS: readonly {
  value: TextScale;
  label: string;
}[] = [
  { value: "standard", label: "標準" },
  { value: "large", label: "大きめ" },
];

/**
 * PDF ヘッダーの日付欄の選択肢（デザイン設定ダイアログ用）
 */
export const SHEET_DATE_MODE_OPTIONS: readonly {
  value: SheetDateMode;
  label: string;
}[] = [
  { value: "none", label: "なし" },
  { value: "blank", label: "記入欄" },
  { value: "printed", label: "出力日を印字" },
];

/**
 * 自主トレ実施チェック表の選択肢（デザイン設定ダイアログ用）
 */
export const CHECK_TABLE_OPTIONS: readonly {
  value: CheckTableType;
  label: string;
}[] = [
  { value: "none", label: "なし" },
  { value: "weekly", label: "1週間" },
  { value: "monthly", label: "1か月" },
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
 * 文字サイズ「大きめ」用エディタテキストスタイル設定
 *
 * 2〜4列（およびモバイル表示）で文字サイズ「大きめ」を選んだときに使う。
 * PDF対応値は shared.ts の FONT_SIZES_LARGE を参照。
 */
export const EDITOR_TEXT_STYLE_LARGE = {
  /** タイトルのフォントサイズ (PDF: 18pt) */
  titleSize: "text-2xl",
  /** 説明文のフォントサイズ (PDF: 11pt) */
  descriptionSize: "text-sm",
  /** 用量ラベルのフォントサイズ (PDF: 9pt) */
  dosageLabelSize: "text-sm",
  /** 用量数値のフォントサイズ (PDF: 18pt) */
  dosageValueSize: "text-3xl",
  /** 注意点タイトルのフォントサイズ (PDF: 10pt) */
  precautionTitleSize: "text-sm",
  /** 注意点テキストのフォントサイズ (PDF: 10pt) */
  precautionTextSize: "text-sm",
} as const;

/**
 * 用量ラベルの入力候補
 *
 * 先頭はデフォルト値（LABELS と同じ）。デザイン設定で候補から選ぶか自由に入力する
 */
export const DOSAGE_LABEL_SUGGESTIONS: Readonly<
  Record<BadgeType, readonly string[]>
> = {
  reps: ["回数", "秒数", "時間", "距離"],
  sets: ["セット", "左右", "回"],
  frequency: ["頻度", "目安", "強度"],
};

/**
 * 用途別のデザインプリセット
 *
 * @remarks
 * 列数・テーマカラー・用量ラベルには触れない（利用者が個別に決めた値を上書きしない）。
 * 選ぶと updateSettings で一括適用する（履歴 1 件）。
 */
export const DESIGN_PRESETS: readonly {
  id: string;
  label: string;
  description: string;
  settings: Partial<ResolvedProjectSettings>;
}[] = [
  {
    id: "standard",
    label: "標準カラー",
    description: "カラー・標準の文字・番号なし",
    settings: {
      printColorMode: "color",
      textScale: "standard",
      showCardNumbers: false,
    },
  },
  {
    id: "monochrome",
    label: "白黒・インク節約",
    description: "白黒コピーで配る",
    settings: { printColorMode: "monochrome" },
  },
  {
    id: "elderly",
    label: "高齢者向け",
    description: "大きめの文字・カード番号",
    settings: { textScale: "large", showCardNumbers: true },
  },
];

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
