/**
 * PDFドキュメントのスタイル定義
 */

import { StyleSheet } from "@react-pdf/renderer";
import {
  PDF_CARD_STYLE,
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
    height: PDF_HEADER_HEIGHT,
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
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: PDF_GRID_GAP,
  },
  card: {
    backgroundColor: PDF_CARD_STYLE.backgroundColor,
    borderRadius: PDF_CARD_STYLE.borderRadius,
    borderWidth: PDF_CARD_STYLE.borderWidth,
    borderColor: PDF_CARD_STYLE.borderColor,
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
