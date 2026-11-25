/**
 * PDF出力関連の定数
 *
 * A4サイズ、マージン、フォント設定などPDF生成に必要な定数を定義
 * Canvas/PDF共通の定数は shared.ts で管理
 */

import { type LayoutType } from "@rehab-grid/core/types/editor";
import { type PageOrientation } from "@rehab-grid/core/types/project";

import { DOSAGE_COLORS, FONT_SIZES, LAYOUT_COLUMNS } from "./shared";

/**
 * A4サイズ（ポイント単位）- 縦型
 * 1pt = 1/72 inch
 */
export const PDF_PAGE_SIZE = {
  /** A4幅 (210mm = 595.28pt) */
  width: 595.28,
  /** A4高さ (297mm = 841.89pt) */
  height: 841.89,
} as const;

/**
 * A4サイズ（ポイント単位）- 横型（landscape）
 * 3列以上のレイアウトで使用
 */
export const PDF_PAGE_SIZE_LANDSCAPE = {
  /** A4横幅 (297mm = 841.89pt) */
  width: 841.89,
  /** A4横高さ (210mm = 595.28pt) */
  height: 595.28,
} as const;

/**
 * PDFのマージン設定（ポイント単位）
 */
export const PDF_MARGINS = {
  top: 40,
  bottom: 40,
  left: 40,
  right: 40,
} as const;

/**
 * PDF内のコンテンツ領域サイズ - 縦型
 */
export const PDF_CONTENT_SIZE = {
  width: PDF_PAGE_SIZE.width - PDF_MARGINS.left - PDF_MARGINS.right,
  height: PDF_PAGE_SIZE.height - PDF_MARGINS.top - PDF_MARGINS.bottom,
} as const;

/**
 * PDF内のコンテンツ領域サイズ - 横型（landscape）
 */
export const PDF_CONTENT_SIZE_LANDSCAPE = {
  width: PDF_PAGE_SIZE_LANDSCAPE.width - PDF_MARGINS.left - PDF_MARGINS.right,
  height: PDF_PAGE_SIZE_LANDSCAPE.height - PDF_MARGINS.top - PDF_MARGINS.bottom,
} as const;

/**
 * レイアウトタイプと用紙の向きの設定から、PDFを横向き（landscape）にするかを判定
 *
 * @remarks
 * 1列は横向きにすると 1 枚のカードがページに収まらないため、指定に関わらず縦向きにする
 *
 * @param layoutType - グリッドレイアウトタイプ
 * @param orientation - 用紙の向きの設定（省略時は "auto"：3列以上なら横向き）
 * @returns 横向きの場合true
 */
export function isLandscapeLayout(
  layoutType: LayoutType,
  orientation: PageOrientation = "auto"
): boolean {
  const columns = LAYOUT_COLUMNS[layoutType];
  if (columns === 1) return false;
  if (orientation === "auto") return columns >= 3;
  return orientation === "landscape";
}

/**
 * レイアウトタイプと用紙の向きの設定に応じたPDFページサイズを取得
 *
 * @param layoutType - グリッドレイアウトタイプ
 * @param orientation - 用紙の向きの設定（省略時は "auto"）
 * @returns ページサイズ（縦型 or 横型）
 */
export function getPdfPageSize(
  layoutType: LayoutType,
  orientation: PageOrientation = "auto"
): typeof PDF_PAGE_SIZE | typeof PDF_PAGE_SIZE_LANDSCAPE {
  return isLandscapeLayout(layoutType, orientation)
    ? PDF_PAGE_SIZE_LANDSCAPE
    : PDF_PAGE_SIZE;
}

/**
 * レイアウトタイプと用紙の向きの設定に応じたPDFコンテンツ領域サイズを取得
 *
 * @param layoutType - グリッドレイアウトタイプ
 * @param orientation - 用紙の向きの設定（省略時は "auto"）
 * @returns コンテンツ領域サイズ（縦型 or 横型）
 */
export function getPdfContentSize(
  layoutType: LayoutType,
  orientation: PageOrientation = "auto"
): typeof PDF_CONTENT_SIZE | typeof PDF_CONTENT_SIZE_LANDSCAPE {
  return isLandscapeLayout(layoutType, orientation)
    ? PDF_CONTENT_SIZE_LANDSCAPE
    : PDF_CONTENT_SIZE;
}

/**
 * グリッドレイアウトのギャップ（ポイント単位）
 */
export const PDF_GRID_GAP = 12;

/**
 * ヘッダーの基本の高さ（ポイント単位）
 *
 * タイトル・日付欄・氏名欄の 1 行だけのときの高さ。施設名・担当者名や全体メモを出すと
 * その分だけ高くなる（calculatePdfHeaderHeight）
 */
export const PDF_HEADER_HEIGHT = 35;

/** 全体メモ（PDF ヘッダー）の最大行数。超えた分は「…」で切り詰める */
export const PDF_OVERALL_NOTE_MAX_LINES = 5;

/**
 * 自主トレ実施チェック表のレイアウト（ポイント単位）
 */
export const PDF_CHECK_TABLE = {
  /** 見出しのフォントサイズ */
  titleFontSize: 11,
  /** 見出し横の案内のフォントサイズ */
  hintFontSize: 8,
  /** 見出しと表の間隔 */
  titleMarginBottom: 4,
  /** 表の見出し行（曜日・日付）の高さ */
  headerRowHeight: 18,
  /** 運動 1 件分の行の高さ（○を書き込める大きさ） */
  rowHeight: 24,
  /** 運動名のフォントサイズ */
  nameFontSize: 9,
  /** 見出し行（曜日・日付）のフォントサイズ */
  columnLabelFontSize: 8,
  /** 1か月の表の日付のフォントサイズ（31 列並べるため小さめ） */
  monthlyColumnLabelFontSize: 7,
  /** セル内の左右の余白 */
  cellPaddingHorizontal: 4,
  /** 罫線の太さ */
  borderWidth: 1,
  /** 1週間の表の運動名の列の幅（コンテンツ幅に対する比率） */
  weeklyNameColumnRatio: 0.4,
  /** 1か月の表の運動名の列の幅 */
  monthlyNameColumnWidth: 140,
} as const;

/** 1週間の実施チェック表の列（曜日） */
export const CHECK_TABLE_WEEKDAYS = [
  "月",
  "火",
  "水",
  "木",
  "金",
  "土",
  "日",
] as const;

/** 1か月の実施チェック表の日数（月の名前と日付は手書きしてもらうため、常に 31 列） */
export const CHECK_TABLE_MONTH_DAYS = 31;

/**
 * フォントファイルのパス
 */
export const PDF_FONT_PATHS = {
  regular: "/fonts/NotoSansJP-Regular.woff",
  bold: "/fonts/NotoSansJP-Bold.woff",
} as const;

/**
 * フォントファミリー名
 */
export const PDF_FONT_FAMILY = "NotoSansJP";

/**
 * カードの画像アスペクト比（5:3）
 *
 * 横長画像（16:9, 4:3）の両方で余白が少なくなるバランス良い比率
 */
export const PDF_IMAGE_ASPECT_RATIO = 5 / 3;

/**
 * カードのスタイル設定
 *
 * ボーダー色はテーマカラー（プロジェクト設定）を使う
 */
export const PDF_CARD_STYLE = {
  /** 角丸の半径 */
  borderRadius: 8,
  /** ボーダー幅 */
  borderWidth: 1,
  /** 背景色 */
  backgroundColor: "#ffffff",
  /** 内側のパディング */
  padding: 8,
} as const;

/**
 * テキストスタイル設定
 *
 * shared.ts の FONT_SIZES から値を取得
 */
export const PDF_TEXT_STYLE = {
  /** タイトルのフォントサイズ */
  titleSize: FONT_SIZES.title,
  /** 説明文のフォントサイズ */
  descriptionSize: FONT_SIZES.description,
  /** 用量ラベルのフォントサイズ */
  dosageLabelSize: FONT_SIZES.dosageLabel,
  /** 用量数値のフォントサイズ */
  dosageValueSize: FONT_SIZES.dosageValue,
  /** 注意点タイトルのフォントサイズ */
  precautionTitleSize: FONT_SIZES.precautionTitle,
  /** 注意点テキストのフォントサイズ */
  precautionTextSize: FONT_SIZES.precautionText,
  /** ヘッダーのフォントサイズ（12ptで約40文字収容可能） */
  headerSize: FONT_SIZES.header,
  /** フッターのフォントサイズ */
  footerSize: FONT_SIZES.footer,
} as const;

/**
 * 用量表示の色設定
 *
 * shared.ts の DOSAGE_COLORS を参照（信頼できる単一の情報源）
 * 数値強調型デザイン: グレースケール + blue-500アクセント
 * 区切り線の色はテーマカラーから求める（lib/pdf/card.ts）
 */
export const PDF_DOSAGE_COLORS = {
  /** 数値色: slate-800 */
  value: DOSAGE_COLORS.value,
  /** ラベル色: slate-400 */
  label: DOSAGE_COLORS.label,
  /** アクセント色: blue-500 */
  accent: DOSAGE_COLORS.accent,
} as const;

/**
 * PDFのカラーパレット
 */
export const PDF_COLORS = {
  /** ページ背景色 */
  background: "#f8fafc",
  /** ボーダー色 */
  border: "#e2e8f0",
  /** プライマリテキスト色 */
  textPrimary: "#1e293b",
  /** セカンダリテキスト色 */
  textSecondary: "#64748b",
  /** サードテキスト色 */
  textTertiary: "#475569",
  /** カード背景色 */
  cardBackground: "#ffffff",
  /** 画像プレースホルダー背景色 */
  imagePlaceholder: "#f1f5f9",
  /** 注意点背景色（アンバー系: 穏やかな警告色） */
  precautionBackground: "#fef3c7", // amber-100
  /** 注意点タイトル色（アンバー系: 印刷時の視認性向上） */
  precautionTitle: "#78350f", // amber-900
  /** 注意点テキスト色（アンバー系: 黒に近い濃い茶色） */
  precautionText: "#451a03", // amber-950相当
  /** 患者名ボックスのボーダー色 */
  patientNameBoxBorder: "#cbd5e1",
  /** 白黒・インク節約モードのページ背景色 */
  monochromeBackground: "#ffffff",
  /** カード番号の文字色 */
  cardNumberText: "#ffffff",
  /** 実施チェック表の罫線（白黒コピーでも見える濃さ: slate-400） */
  checkTableBorder: "#94a3b8",
  /** 実施チェック表の見出し行の背景（白黒モードでは塗りつぶさない） */
  checkTableHeaderBackground: "#f1f5f9",
} as const;

/**
 * PDF固有のラベル定数
 *
 * 共通ラベル（untitledExercise, precautionTitle, noImage）は
 * shared.ts の LABELS を使用
 */
export const PDF_LABELS = {
  /** 患者ラベル */
  patientLabel: "氏名:",
  /** 日付欄のラベル */
  dateLabel: "日付:",
  /** 担当者名の前に付けるラベル */
  therapistLabel: "担当:",
  /** 1週間の実施チェック表の見出し */
  weeklyCheckTableTitle: "自主トレ実施チェック表（1週間）",
  /** 1か月の実施チェック表の見出し（月は手書きしてもらう） */
  monthlyCheckTableTitle: "自主トレ実施チェック表（　　月）",
  /** 実施チェック表の書き方の案内 */
  checkTableHint: "実施した日に○をつけましょう",
  /** 実施チェック表の運動名の列の見出し */
  checkTableExerciseHeader: "運動",
} as const;

/**
 * PDFのスペーシング定数（ポイント単位）
 */
export const PDF_SPACING = {
  /** ヘッダー下パディング */
  headerPaddingBottom: 4,
  /** 患者ラベル右マージン */
  patientLabelMarginRight: 8,
  /** カード画像角丸 */
  imageRadius: 4,
  /** カードタイトル上マージン */
  cardTitleMarginTop: 6,
  /** カードタイトル下マージン */
  cardTitleMarginBottom: 8,
  /** 説明文の行高 */
  descriptionLineHeight: 1.4,
  /** 用量コンテナ上マージン */
  dosageContainerMarginTop: 6,
  /** 用量項目間隔 */
  dosageGap: 8,
  /** 用量アイテム垂直パディング */
  dosagePaddingVertical: 4,
  /** 用量ラベル上マージン（下線の上） */
  dosageLabelMarginTop: 2,
  /** 用量ラベル上パディング（下線の下） */
  dosageLabelPaddingTop: 2,
  /** 用量下線の太さ */
  dosageBorderWidth: 1,
  /** 注意点コンテナ上マージン */
  precautionMarginTop: 6,
  /** 注意点パディング */
  precautionPadding: 6,
  /** 注意点角丸 */
  precautionBorderRadius: 4,
  /** 注意点タイトル下マージン */
  precautionTitleMarginBottom: 2,
  /** 注意点行高 */
  precautionLineHeight: 1.3,
  /** 患者名ボックス幅 */
  patientNameBoxWidth: 150,
  /** 患者名ボックス高さ */
  patientNameBoxHeight: 20,
  /** 患者名ボックス角丸 */
  patientNameBoxBorderRadius: 4,
  /** 患者ラベルフォントサイズ */
  patientLabelFontSize: 10,
  /** 白黒モードの注意点の枠線の太さ */
  precautionBorderWidth: 1,
  /** カード番号バッジとタイトルの間隔 */
  cardNumberGap: 4,
  /** 日付の記入欄の幅 */
  dateBoxWidth: 90,
  /** 印字した日付のフォントサイズ */
  dateFontSize: 10,
  /** ヘッダー内の行と行の間隔 */
  headerRowGap: 4,
  /** 施設名・担当者名のフォントサイズ */
  headerSubTextFontSize: 9,
  /** 全体メモのフォントサイズ */
  overallNoteFontSize: 9,
  /** 施設名・担当者名と全体メモの行高 */
  headerSubLineHeight: 1.4,
  /** 全体メモの枠の内側の余白 */
  overallNotePadding: 4,
  /** 全体メモの枠線の太さ */
  overallNoteBorderWidth: 1,
  /** ページ番号のページ下端からの距離（下マージンの中に置く） */
  footerBottom: 20,
} as const;

/**
 * 1行あたりの概算文字数を求めるための、フォントサイズに対する1文字幅の係数
 *
 * 日本語の全角文字幅を経験的に近似した値
 */
export const PDF_CHAR_WIDTH_RATIO = {
  /** タイトル（太字） */
  title: 0.6,
  /** 説明文・注意点 */
  body: 0.55,
  /** 全角 1 文字分（行数を多めに見積もって、高さ不足やはみ出しを防ぐ箇所で使う） */
  fullWidth: 1,
} as const;

/**
 * PDFでサポートする画像形式のプレフィックス
 *
 * @remarks
 * react-pdf/rendererが対応する形式のみを許可
 * WebP/GIF等は事前にJPEG/PNGに変換が必要
 */
export const PDF_SUPPORTED_IMAGE_PREFIXES = [
  "data:image/jpeg",
  "data:image/png",
] as const;

/**
 * CJK（中国語・日本語・韓国語）文字の正規表現パターン
 *
 * 日本語は単語境界がないため、文字単位で分割を許可するために使用
 */
export const CJK_PATTERN = /[\u3000-\u9FFF\uAC00-\uD7AF]/;
