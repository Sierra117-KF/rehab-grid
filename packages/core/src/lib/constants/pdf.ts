/**
 * PDF出力関連の定数
 *
 * A4サイズ、マージン、フォント設定などPDF生成に必要な定数を定義
 * Canvas/PDF共通の定数は shared.ts で管理
 */

import { type LayoutType } from "@rehab-grid/core/types/editor";

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
 * レイアウトタイプが横向き（landscape）かどうかを判定
 *
 * @param layoutType - グリッドレイアウトタイプ
 * @returns 3列以上の場合true（横向き）
 */
export function isLandscapeLayout(layoutType: LayoutType): boolean {
  const columns = LAYOUT_COLUMNS[layoutType];
  return columns >= 3;
}

/**
 * レイアウトタイプに応じたPDFページサイズを取得
 *
 * @param layoutType - グリッドレイアウトタイプ
 * @returns ページサイズ（縦型 or 横型）
 */
export function getPdfPageSize(
  layoutType: LayoutType
): typeof PDF_PAGE_SIZE | typeof PDF_PAGE_SIZE_LANDSCAPE {
  return isLandscapeLayout(layoutType)
    ? PDF_PAGE_SIZE_LANDSCAPE
    : PDF_PAGE_SIZE;
}

/**
 * レイアウトタイプに応じたPDFコンテンツ領域サイズを取得
 *
 * @param layoutType - グリッドレイアウトタイプ
 * @returns コンテンツ領域サイズ（縦型 or 横型）
 */
export function getPdfContentSize(
  layoutType: LayoutType
): typeof PDF_CONTENT_SIZE | typeof PDF_CONTENT_SIZE_LANDSCAPE {
  return isLandscapeLayout(layoutType)
    ? PDF_CONTENT_SIZE_LANDSCAPE
    : PDF_CONTENT_SIZE;
}

/**
 * グリッドレイアウトのギャップ（ポイント単位）
 */
export const PDF_GRID_GAP = 12;

/** ヘッダーの高さ（ポイント単位） */
export const PDF_HEADER_HEIGHT = 35;

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
 */
export const PDF_CARD_STYLE = {
  /** 角丸の半径 */
  borderRadius: 8,
  /** ボーダー幅 */
  borderWidth: 1,
  /** ボーダー色 */
  borderColor: "#e5e7eb",
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
 */
export const PDF_DOSAGE_COLORS = {
  /** 数値色: slate-800 */
  value: DOSAGE_COLORS.value,
  /** ラベル色: slate-400 */
  label: DOSAGE_COLORS.label,
  /** アクセント色: blue-500 */
  accent: DOSAGE_COLORS.accent,
  /** アクセント色（薄い）: blue-500/30 */
  accentLight: DOSAGE_COLORS.accentLight,
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
  /** 画像プレースホルダーテキスト色 */
  imagePlaceholderText: "#94a3b8",
  /** 注意点背景色（アンバー系: 穏やかな警告色） */
  precautionBackground: "#fef3c7", // amber-100
  /** 注意点タイトル色（アンバー系: 印刷時の視認性向上） */
  precautionTitle: "#78350f", // amber-900
  /** 注意点テキスト色（アンバー系: 黒に近い濃い茶色） */
  precautionText: "#451a03", // amber-950相当
  /** 患者名ボックスのボーダー色 */
  patientNameBoxBorder: "#cbd5e1",
} as const;

/**
 * PDF固有のラベル定数
 *
 * 共通ラベル（untitledExercise, precautionTitle, noImage）は
 * shared.ts の LABELS を使用
 */
export const PDF_LABELS = {
  /** デフォルトヘッダータイトル */
  defaultTitle: "自主トレーニング指導箋",
  /** 患者ラベル */
  patientLabel: "氏名:",
} as const;

/**
 * PDFのスペーシング定数（ポイント単位）
 */
export const PDF_SPACING = {
  /** ヘッダー下マージン */
  headerMarginBottom: 16,
  /** ヘッダー下パディング */
  headerPaddingBottom: 4,
  /** タイトル下マージン */
  titleMarginBottom: 4,
  /** 患者情報上マージン */
  patientInfoMarginTop: 8,
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
  /** 患者名フォントサイズ */
  patientNameFontSize: 10,
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
