/**
 * 自主トレーニング指導箋PDFコンポーネント
 *
 * react-pdf/renderer を使用してPDFドキュメントを生成
 * Canvas.tsx のグリッドレイアウトを再現
 */

import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import {
  FONT_SIZES_SINGLE_COLUMN,
  getPdfPageSize,
  LABELS,
  LINE_CLAMP,
  PDF_CARD_STYLE,
  PDF_COLORS,
  PDF_DOSAGE_COLORS,
  PDF_FONT_FAMILY,
  PDF_GRID_GAP,
  PDF_HEADER_HEIGHT,
  PDF_IMAGE_ASPECT_RATIO,
  PDF_LABELS,
  PDF_MARGINS,
  PDF_SPACING,
  PDF_TEXT_STYLE,
  TEXT_LIMITS,
} from "@rehab-grid/core/lib/constants";
import {
  type BadgeType,
  type EditorItem,
  type LayoutType,
  type PdfHeaderInfo,
} from "@rehab-grid/core/types";
import { getDosageBadgeLayout } from "@rehab-grid/core/utils/editor";
import {
  calculatePdfCardWidth,
  truncateToLines,
} from "@rehab-grid/core/utils/pdf";

/**
 * TrainingSheetPDF コンポーネントの Props
 */
type TrainingSheetPDFProps = {
  /** アイテム一覧 */
  items: EditorItem[];
  /** レイアウトタイプ */
  layoutType: LayoutType;
  /** ヘッダー情報 */
  header?: PdfHeaderInfo;
  /** 画像データ（ID -> Base64 data URL） */
  images: Record<string, string>;
};

/**
 * PDFスタイル定義
 */
const styles = StyleSheet.create({
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
    marginBottom: PDF_SPACING.titleMarginBottom,
  },
  headerSubtitle: {
    fontSize: PDF_SPACING.patientLabelFontSize,
    color: PDF_COLORS.textSecondary,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
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
    borderColor: "#cbd5e1",
    borderRadius: PDF_SPACING.patientNameBoxBorderRadius,
    backgroundColor: PDF_COLORS.cardBackground,
  },
  patientNameText: {
    fontSize: PDF_SPACING.patientNameFontSize,
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
  cardImagePlaceholderText: {
    fontSize: PDF_TEXT_STYLE.precautionTextSize,
    color: PDF_COLORS.imagePlaceholderText,
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
    borderTopWidth: PDF_SPACING.dosageBorderWidth,
    borderTopColor: PDF_DOSAGE_COLORS.accentLight,
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

/**
 * 用量アイテムコンポーネントのProps
 */
type DosageItemProps = {
  /** 表示値 */
  value: string;
  /** 値が設定されているか */
  hasValue: boolean;
  /** アイテムの種類 */
  type: BadgeType;
  /** 用量数値のフォントサイズ */
  valueFontSize: number;
  /** 用量ラベルのフォントサイズ */
  labelFontSize: number;
};

/**
 * 用量アイテムコンポーネント
 *
 * 回数・セット数・頻度を数値強調型で表示
 * 数値を大きく表示し、ラベルは下に小さく配置
 */
function DosageItem({
  value,
  hasValue,
  type,
  valueFontSize,
  labelFontSize,
}: DosageItemProps) {
  const limit = TEXT_LIMITS[type];
  const label = LABELS[type];

  if (!hasValue) {
    return <View style={styles.dosageItem} />;
  }

  return (
    <View style={styles.dosageItem}>
      {/* 数値（大きく強調） */}
      <Text style={[styles.dosageValue, { fontSize: valueFontSize }]}>
        {value.slice(0, limit)}
      </Text>
      {/* ラベル（下線付き） */}
      <Text style={[styles.dosageLabel, { fontSize: labelFontSize }]}>
        {label}
      </Text>
    </View>
  );
}

/**
 * カードコンポーネント
 */
function Card({
  item,
  width,
  imageUrl,
  layoutType,
}: {
  item: EditorItem;
  width: number;
  imageUrl?: string;
  layoutType: LayoutType;
}) {
  const imageWidth = width - PDF_CARD_STYLE.padding * 2;
  const imageHeight = imageWidth / PDF_IMAGE_ASPECT_RATIO;

  // 1列グリッド用のフォントサイズを取得（高齢者向け拡大表示）
  const isSingleColumn = layoutType === "grid1";
  const titleFontSize = isSingleColumn
    ? FONT_SIZES_SINGLE_COLUMN.title
    : PDF_TEXT_STYLE.titleSize;
  const descriptionFontSize = isSingleColumn
    ? FONT_SIZES_SINGLE_COLUMN.description
    : PDF_TEXT_STYLE.descriptionSize;
  const dosageValueFontSize = isSingleColumn
    ? FONT_SIZES_SINGLE_COLUMN.dosageValue
    : PDF_TEXT_STYLE.dosageValueSize;
  const dosageLabelFontSize = isSingleColumn
    ? FONT_SIZES_SINGLE_COLUMN.dosageLabel
    : PDF_TEXT_STYLE.dosageLabelSize;
  const precautionTitleFontSize = isSingleColumn
    ? FONT_SIZES_SINGLE_COLUMN.precautionTitle
    : PDF_TEXT_STYLE.precautionTitleSize;
  const precautionTextFontSize = isSingleColumn
    ? FONT_SIZES_SINGLE_COLUMN.precautionText
    : PDF_TEXT_STYLE.precautionTextSize;

  // フォントサイズから1行あたりの概算文字数を計算
  const titleCharsPerLine = Math.floor(imageWidth / (titleFontSize * 0.6));
  const descCharsPerLine = Math.floor(
    imageWidth / (descriptionFontSize * 0.55),
  );

  // タイトル（1行制限）
  const displayTitle = item.title
    ? truncateToLines(
        item.title.slice(0, TEXT_LIMITS.title),
        LINE_CLAMP.title,
        titleCharsPerLine,
      )
    : LABELS.untitledExercise;

  // 説明（4行制限）
  const displayDescription = item.description
    ? truncateToLines(
        item.description.slice(0, TEXT_LIMITS.description),
        LINE_CLAMP.description,
        descCharsPerLine,
      )
    : null;

  return (
    <View wrap={false} style={[styles.card, { width }]}>
      {/* 画像エリア */}
      {imageUrl !== undefined && imageUrl !== "" ? (
        <Image
          src={imageUrl}
          style={[
            styles.cardImage,
            {
              width: imageWidth,
              height: imageHeight,
            },
          ]}
        />
      ) : (
        <View
          style={[
            styles.cardImagePlaceholder,
            {
              width: imageWidth,
              height: imageHeight,
            },
          ]}
        />
      )}

      {/* タイトル（1行制限 + 中央寄せ） */}
      <Text
        style={[
          styles.cardTitle,
          {
            width: imageWidth,
            alignSelf: "stretch",
            fontSize: titleFontSize,
            marginBottom: PDF_SPACING.cardTitleMarginBottom,
          },
        ]}
      >
        {displayTitle}
      </Text>

      {/* 説明（4行制限 + 幅制限で折り返し） */}
      {displayDescription !== null ? (
        <Text
          style={[
            styles.cardDescription,
            { width: imageWidth, fontSize: descriptionFontSize },
          ]}
        >
          {displayDescription}
        </Text>
      ) : null}

      {/* 回数・セット数・頻度（数値強調型デザイン） */}
      {(() => {
        const badgeLayout = getDosageBadgeLayout(item.dosages, layoutType);
        if (badgeLayout.length === 0) return null;
        return (
          <View style={{ marginTop: PDF_SPACING.dosageContainerMarginTop }}>
            {badgeLayout.map((row) => {
              const rowKey = row.badges.map((b) => b.type).join("-");
              if (row.isFullWidth) {
                // 横幅いっぱいの用量アイテム（4列レイアウト時の頻度）
                const badge = row.badges[0];
                if (!badge) return null;
                return (
                  <View
                    key={rowKey}
                    style={[
                      styles.dosageItem,
                      {
                        flex: undefined,
                        width: "100%",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dosageValue,
                        { fontSize: dosageValueFontSize },
                      ]}
                    >
                      {badge.value.slice(0, TEXT_LIMITS[badge.type])}
                    </Text>
                    <Text
                      style={[
                        styles.dosageLabel,
                        { fontSize: dosageLabelFontSize },
                      ]}
                    >
                      {LABELS[badge.type]}
                    </Text>
                  </View>
                );
              }
              // 通常の用量行
              return (
                <View key={rowKey} style={styles.dosageContainer}>
                  {row.badges.map((badge) => (
                    <DosageItem
                      key={badge.type}
                      value={badge.value}
                      hasValue={badge.hasValue}
                      type={badge.type}
                      valueFontSize={dosageValueFontSize}
                      labelFontSize={dosageLabelFontSize}
                    />
                  ))}
                </View>
              );
            })}
          </View>
        );
      })()}

      {/* 注意点（行数制限 + 幅制限で折り返し） */}
      {item.precautions && item.precautions.length > 0 ? (
        <View style={[styles.precautionContainer, { width: imageWidth }]}>
          <Text
            style={[
              styles.precautionTitle,
              { fontSize: precautionTitleFontSize },
            ]}
          >
            {LABELS.precautionTitle}
          </Text>
          {item.precautions.map((precaution) => {
            const precautionCharsPerLine = Math.floor(
              imageWidth / (precautionTextFontSize * 0.55),
            );
            const displayValue = truncateToLines(
              precaution.value.slice(0, TEXT_LIMITS.precaution),
              LINE_CLAMP.precaution,
              precautionCharsPerLine,
            );
            return (
              <Text
                key={precaution.id}
                style={[
                  styles.precautionText,
                  { fontSize: precautionTextFontSize },
                ]}
              >
                • {displayValue}
              </Text>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

/**
 * ヘッダーコンポーネント
 *
 * タイトルが空欄の場合は、タイトル行を表示しません（デフォルトタイトルは使用しない）
 */
function Header({ header }: { header?: PdfHeaderInfo }) {
  const displayTitle =
    header?.hospitalName !== undefined ? header.hospitalName.trim() : "";

  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        {displayTitle ? (
          <>
            <Text style={styles.headerTitle}>{displayTitle}</Text>
            <Text style={styles.headerTitle}> </Text>
          </>
        ) : null}
        <View style={styles.patientInfo}>
          <Text style={styles.patientLabel}>{PDF_LABELS.patientLabel}</Text>
          {header?.patientName !== undefined && header.patientName !== "" ? (
            <Text style={styles.patientNameText}>{header.patientName}</Text>
          ) : (
            <View style={styles.patientNameBox} />
          )}
        </View>
      </View>
    </View>
  );
}

/**
 * 自主トレーニング指導箋PDFドキュメント
 *
 * @example
 * ```tsx
 * <TrainingSheetPDF
 *   items={items}
 *   layoutType="grid2"
 *   images={imageMap}
 * />
 * ```
 */
export function TrainingSheetPDF({
  items,
  layoutType,
  header,
  images,
}: TrainingSheetPDFProps) {
  const cardWidth = calculatePdfCardWidth(layoutType);
  const sortedItems = [...items].sort((a, b) => a.order - b.order);
  const pageSize = getPdfPageSize(layoutType);

  return (
    <Document>
      <Page size={[pageSize.width, pageSize.height]} style={styles.page}>
        <Header header={header} />

        <View style={styles.gridContainer}>
          {sortedItems.map((item) => (
            <Card
              key={item.id}
              item={item}
              width={cardWidth}
              imageUrl={item.imageSource ? images[item.imageSource] : undefined}
              layoutType={layoutType}
            />
          ))}
        </View>
      </Page>
    </Document>
  );
}
