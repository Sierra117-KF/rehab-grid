/**
 * PDFドキュメントのスタイル定義
 */

import { StyleSheet } from "@react-pdf/renderer";
import {
  PDF_CARD_STYLE,
  PDF_CHECK_TABLE,
  PDF_COLORS,
  PDF_DOSAGE_COLORS,
  PDF_FONT_FAMILY,
  PDF_GRID_GAP,
  PDF_HEADER_HEIGHT,
  PDF_MARGINS,
  PDF_SPACING,
  PDF_TEXT_STYLE,
} from "@rehab-grid/core/lib/constants";

/**
 * PDFドキュメント全体で共有するスタイル
 *
 * フォントサイズや幅など描画時に決まる値は、各要素の生成時に上書きする
 */
export const pdfStyles = StyleSheet.create({
  page: {
    fontFamily: PDF_FONT_FAMILY,
    paddingTop: PDF_MARGINS.top,
    paddingBottom: PDF_MARGINS.bottom,
    paddingLeft: PDF_MARGINS.left,
    paddingRight: PDF_MARGINS.right,
    backgroundColor: PDF_COLORS.background,
  },
  header: {
    // 表示する項目に応じた高さを生成時に上書きする（header.ts）。
    // 文字が見積もりより多く折り返してもカードに重ならないよう、height ではなく minHeight にしている
    minHeight: PDF_HEADER_HEIGHT,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLORS.border,
    paddingBottom: PDF_SPACING.headerPaddingBottom,
  },
  headerTitle: {
    fontSize: PDF_TEXT_STYLE.headerSize,
    fontWeight: "bold",
    color: PDF_COLORS.textPrimary,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  patientInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  patientLabel: {
    fontSize: PDF_SPACING.patientLabelFontSize,
    color: PDF_COLORS.textSecondary,
    marginRight: PDF_SPACING.patientLabelMarginRight,
  },
  patientNameBox: {
    width: PDF_SPACING.patientNameBoxWidth,
    height: PDF_SPACING.patientNameBoxHeight,
    borderWidth: 1,
    borderColor: PDF_COLORS.patientNameBoxBorder,
    borderRadius: PDF_SPACING.patientNameBoxBorderRadius,
    backgroundColor: PDF_COLORS.cardBackground,
  },
  dateBox: {
    width: PDF_SPACING.dateBoxWidth,
    height: PDF_SPACING.patientNameBoxHeight,
    borderWidth: 1,
    borderColor: PDF_COLORS.patientNameBoxBorder,
    borderRadius: PDF_SPACING.patientNameBoxBorderRadius,
    backgroundColor: PDF_COLORS.cardBackground,
  },
  dateText: {
    fontSize: PDF_SPACING.dateFontSize,
    color: PDF_COLORS.textPrimary,
  },
  headerSubText: {
    marginTop: PDF_SPACING.headerRowGap,
    fontSize: PDF_SPACING.headerSubTextFontSize,
    lineHeight: PDF_SPACING.headerSubLineHeight,
    color: PDF_COLORS.textSecondary,
  },
  overallNote: {
    marginTop: PDF_SPACING.headerRowGap,
    padding: PDF_SPACING.overallNotePadding,
    borderWidth: PDF_SPACING.overallNoteBorderWidth,
    borderColor: PDF_COLORS.border,
    borderRadius: PDF_SPACING.patientNameBoxBorderRadius,
    backgroundColor: PDF_COLORS.cardBackground,
  },
  overallNoteText: {
    fontSize: PDF_SPACING.overallNoteFontSize,
    lineHeight: PDF_SPACING.headerSubLineHeight,
    color: PDF_COLORS.textPrimary,
  },
  footer: {
    position: "absolute",
    bottom: PDF_SPACING.footerBottom,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: PDF_TEXT_STYLE.footerSize,
    color: PDF_COLORS.textSecondary,
  },
  checkTableTitleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: PDF_CHECK_TABLE.titleMarginBottom,
  },
  checkTableTitle: {
    fontSize: PDF_CHECK_TABLE.titleFontSize,
    fontWeight: "bold",
    color: PDF_COLORS.textPrimary,
    marginRight: PDF_SPACING.dosageGap,
  },
  checkTableHint: {
    fontSize: PDF_CHECK_TABLE.hintFontSize,
    color: PDF_COLORS.textSecondary,
  },
  checkTable: {
    // セルは右と下に罫線を引くため、表の外枠は上と左だけ引く
    borderTopWidth: PDF_CHECK_TABLE.borderWidth,
    borderLeftWidth: PDF_CHECK_TABLE.borderWidth,
    borderColor: PDF_COLORS.checkTableBorder,
    backgroundColor: PDF_COLORS.cardBackground,
  },
  checkTableRow: {
    flexDirection: "row",
  },
  checkTableCell: {
    // 幅と高さは列数・行の種類から決めるため、生成時に指定する（checkTable.ts）
    justifyContent: "center",
    borderRightWidth: PDF_CHECK_TABLE.borderWidth,
    borderBottomWidth: PDF_CHECK_TABLE.borderWidth,
    borderColor: PDF_COLORS.checkTableBorder,
    paddingHorizontal: PDF_CHECK_TABLE.cellPaddingHorizontal,
  },
  checkTableColumnLabel: {
    textAlign: "center",
    color: PDF_COLORS.textPrimary,
  },
  checkTableName: {
    fontSize: PDF_CHECK_TABLE.nameFontSize,
    color: PDF_COLORS.textPrimary,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: PDF_GRID_GAP,
  },
  card: {
    backgroundColor: PDF_CARD_STYLE.backgroundColor,
    borderRadius: PDF_CARD_STYLE.borderRadius,
    // 枠線の色はテーマカラーから求めるため、カード生成時に指定する（card.ts）
    borderWidth: PDF_CARD_STYLE.borderWidth,
    padding: PDF_CARD_STYLE.padding,
    marginBottom: PDF_GRID_GAP,
  },
  cardImage: {
    borderRadius: PDF_SPACING.imageRadius,
    backgroundColor: PDF_COLORS.imagePlaceholder,
    objectFit: "contain",
  },
  cardImagePlaceholder: {
    borderRadius: PDF_SPACING.imageRadius,
    backgroundColor: PDF_COLORS.imagePlaceholder,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: PDF_TEXT_STYLE.titleSize,
    fontWeight: "bold",
    color: PDF_COLORS.textPrimary,
    marginTop: PDF_SPACING.cardTitleMarginTop,
    marginBottom: PDF_SPACING.cardTitleMarginBottom,
    textAlign: "center",
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: PDF_SPACING.cardTitleMarginTop,
  },
  cardNumberBadge: {
    // 大きさと背景色はタイトルのフォントサイズと設定から決めるため、生成時に指定する（card.ts）
    justifyContent: "center",
    alignItems: "center",
    marginRight: PDF_SPACING.cardNumberGap,
    flexShrink: 0,
  },
  cardNumberText: {
    fontWeight: "bold",
    textAlign: "center",
    color: PDF_COLORS.cardNumberText,
  },
  cardDescription: {
    fontSize: PDF_TEXT_STYLE.descriptionSize,
    color: PDF_COLORS.textTertiary,
    lineHeight: PDF_SPACING.descriptionLineHeight,
  },
  dosageContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: PDF_SPACING.dosageGap,
    marginTop: PDF_SPACING.dosageContainerMarginTop,
  },
  dosageItem: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    paddingVertical: PDF_SPACING.dosagePaddingVertical,
  },
  dosageValue: {
    fontSize: PDF_TEXT_STYLE.dosageValueSize,
    fontWeight: "bold",
    textAlign: "center",
    color: PDF_DOSAGE_COLORS.value,
  },
  dosageLabel: {
    fontSize: PDF_TEXT_STYLE.dosageLabelSize,
    textAlign: "center",
    color: PDF_DOSAGE_COLORS.label,
    marginTop: PDF_SPACING.dosageLabelMarginTop,
    paddingTop: PDF_SPACING.dosageLabelPaddingTop,
    // 線の色はテーマカラーから求めるため、カード生成時に指定する（card.ts）
    borderTopWidth: PDF_SPACING.dosageBorderWidth,
  },
  precautionContainer: {
    marginTop: PDF_SPACING.precautionMarginTop,
    padding: PDF_SPACING.precautionPadding,
    backgroundColor: PDF_COLORS.precautionBackground,
    borderRadius: PDF_SPACING.precautionBorderRadius,
  },
  precautionTitle: {
    fontSize: PDF_TEXT_STYLE.precautionTitleSize,
    fontWeight: "bold",
    color: PDF_COLORS.precautionTitle,
    marginBottom: PDF_SPACING.precautionTitleMarginBottom,
  },
  precautionText: {
    fontSize: PDF_TEXT_STYLE.precautionTextSize,
    color: PDF_COLORS.precautionText,
    lineHeight: PDF_SPACING.precautionLineHeight,
  },
});
