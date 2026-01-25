/**
 * PDF生成 Web Worker
 *
 * メインスレッドをブロックせずにPDFを生成するためのWorker
 * react-pdf/renderer を使用してPDFをBlobとして生成
 */

import {
  Document,
  type DocumentProps,
  Font,
  Image,
  Page,
  pdf,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import {
  CJK_PATTERN,
  FONT_SIZES_SINGLE_COLUMN,
  getPdfPageSize,
  LABELS,
  LAYOUT_COLUMNS,
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
  PDF_SUPPORTED_IMAGE_PREFIXES,
  PDF_TEXT_STYLE,
  TEXT_LIMITS,
} from "@rehab-grid/core/lib/constants";
import {
  type BadgeType,
  type EditorItem,
  type LayoutType,
  type PdfGenerationData,
  type PdfWorkerRequest,
} from "@rehab-grid/core/types";
import { getDosageBadgeLayout } from "@rehab-grid/core/utils/editor";
import { calculatePdfCardWidth, truncateToLines } from "@rehab-grid/core/utils/pdf";
import { createElement, type ReactElement } from "react";

// =====================================
// スタイル定義
// =====================================

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
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerSubtitle: {
    fontSize: PDF_SPACING.patientLabelFontSize,
    color: PDF_COLORS.textSecondary,
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

// =====================================
// ヘルパー関数
// =====================================

/**
 * 単一の用量アイテム要素を生成する
 *
 * 数値強調型デザイン: 数値を大きく表示し、ラベルは下に小さく配置
 *
 * @param type - アイテムの種類
 * @param value - 表示値
 * @param hasValue - 値が設定されているか
 * @param valueFontSize - 用量数値のフォントサイズ
 * @param labelFontSize - 用量ラベルのフォントサイズ
 * @returns 用量アイテムのReact要素
 */
function createDosageElement(
  type: BadgeType,
  value: string,
  hasValue: boolean,
  valueFontSize: number,
  labelFontSize: number
): React.ReactElement {
  const limit = TEXT_LIMITS[type];

  if (!hasValue) {
    return createElement(View, { key: type, style: styles.dosageItem });
  }

  return createElement(
    View,
    { key: type, style: styles.dosageItem },
    [
      // 数値（大きく強調）
      createElement(
        Text,
        {
          key: `${type}-value`,
          style: { ...styles.dosageValue, fontSize: valueFontSize },
        },
        value.slice(0, limit)
      ),
      // ラベル（下線付き）
      createElement(
        Text,
        {
          key: `${type}-label`,
          style: { ...styles.dosageLabel, fontSize: labelFontSize },
        },
        LABELS[type]
      ),
    ]
  );
}

/**
 * 文字列がLayoutType型かどうかを判定する型ガード
 *
 * @internal テスト専用エクスポート
 * @param value - 判定する文字列
 * @returns valueがLayoutType型の場合true
 */
function isLayoutType(value: string): value is LayoutType {
  return value in LAYOUT_COLUMNS;
}

/**
 * フォントを登録
 *
 * react-pdf/fontのブラウザ実装はsrcを文字列（URLまたはdata URL）として扱うため、
 * URL文字列でFont.register()を呼び出し、Font.load()で事前ロードして失敗を即座に捕捉する。
 *
 * 注意: Workerコンテキストでは相対URLが機能しないため、絶対URLを使用する。
 *
 * @internal テスト専用エクスポート
 */
async function registerFonts(): Promise<void> {
  // Workerコンテキストでは相対URLが機能しないため、絶対URLを構築
  const baseUrl = self.location.origin;
  const regularFontUrl = `${baseUrl}/fonts/NotoSansJP-Regular.woff`;
  const boldFontUrl = `${baseUrl}/fonts/NotoSansJP-Bold.woff`;

  // URL文字列でフォントを登録
  Font.register({
    family: PDF_FONT_FAMILY,
    fonts: [
      { src: regularFontUrl, fontWeight: "normal" },
      { src: boldFontUrl, fontWeight: "bold" },
    ],
  });

  // CJK文字の折り返しを有効にするHyphenation callbackを登録
  // 日本語は単語境界がないため、文字単位で分割を許可する
  Font.registerHyphenationCallback((word) => {
    // CJK文字を含む場合は空文字挿入方式でハイフン表示を無効化
    // v4.xのtextkitでは各文字の後に空文字を挿入することで
    // ハイフン文字を明示的に空に置き換える（最も信頼性が高い方式）
    if (CJK_PATTERN.test(word)) {
      return Array.from(word).flatMap((char) => [char, ""]);
    }
    // 半角文字のみの場合はそのまま返す（既存の英語折り返しを維持）
    return [word];
  });

  // Font.load()で事前ロードし、失敗を即座に捕捉
  try {
    await Promise.all([
      Font.load({ fontFamily: PDF_FONT_FAMILY, fontWeight: 400 }),
      Font.load({ fontFamily: PDF_FONT_FAMILY, fontWeight: 700 }),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`フォントの読み込みに失敗しました: ${message}`);
  }
}

// =====================================
// PDFコンポーネント生成（createElement使用）
// =====================================

/**
 * エディタアイテムからPDFカードのReact要素を生成
 *
 * @internal テスト専用エクスポート
 * @param item - カードに表示するエディタアイテム
 * @param width - カードの幅（ポイント単位）
 * @param imageUrl - 画像のBase64 data URL（省略可）
 * @param layoutType - レイアウトタイプ（4列時のバッジレイアウト変更用）
 * @returns カードのReact要素
 */
function createCard(
  item: EditorItem,
  width: number,
  imageUrl?: string,
  layoutType?: LayoutType
): React.ReactElement {
  const imageHeight =
    (width - PDF_CARD_STYLE.padding * 2) / PDF_IMAGE_ASPECT_RATIO;
  const imageWidth = width - PDF_CARD_STYLE.padding * 2;

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

  const children: React.ReactElement[] = [];

  // 非対応形式をガード（将来の経路からWebP等が混入した場合の安全策）
  const isSupportedFormat =
    imageUrl !== undefined &&
    imageUrl !== "" &&
    PDF_SUPPORTED_IMAGE_PREFIXES.some((prefix) => imageUrl.startsWith(prefix));
  const safeImageUrl = isSupportedFormat ? imageUrl : undefined;

  // 画像
  if (safeImageUrl !== undefined) {
    children.push(
      createElement(Image, {
        key: "image",
        src: safeImageUrl,
        style: { ...styles.cardImage, width: imageWidth, height: imageHeight },
      })
    );
  } else {
    children.push(
      createElement(View, {
        key: "imagePlaceholder",
        style: {
          ...styles.cardImagePlaceholder,
          width: imageWidth,
          height: imageHeight,
        },
      })
    );
  }

  // タイトル（1行制限 + 中央寄せ）
  // フォントサイズから1行あたりの概算文字数を計算（日本語は約0.6倍）
  const titleCharsPerLine = Math.floor(imageWidth / (titleFontSize * 0.6));
  const displayTitle = item.title
    ? truncateToLines(
        item.title.slice(0, TEXT_LIMITS.title),
        LINE_CLAMP.title,
        titleCharsPerLine
      )
    : LABELS.untitledExercise;
  children.push(
    createElement(
      Text,
      {
        key: "title",
        style: {
          ...styles.cardTitle,
          width: imageWidth,
          alignSelf: "stretch",
          fontSize: titleFontSize,
          marginBottom: PDF_SPACING.cardTitleMarginBottom,
        },
      },
      displayTitle
    )
  );

  // 説明（4行制限 + 幅制限で折り返し）
  if (item.description) {
    // フォントサイズから1行あたりの概算文字数を計算（日本語は約0.55倍）
    const descCharsPerLine = Math.floor(
      imageWidth / (descriptionFontSize * 0.55)
    );
    const displayDescription = truncateToLines(
      item.description.slice(0, TEXT_LIMITS.description),
      LINE_CLAMP.description,
      descCharsPerLine
    );
    children.push(
      createElement(
        Text,
        {
          key: "description",
          style: {
            ...styles.cardDescription,
            width: imageWidth,
            fontSize: descriptionFontSize,
          },
        },
        displayDescription
      )
    );
  }

  // 用量（回数・セット数・頻度）- 数値強調型デザイン
  const badgeLayout = getDosageBadgeLayout(item.dosages, layoutType ?? "grid2");
  if (badgeLayout.length > 0) {
    const dosageRows: React.ReactElement[] = [];

    badgeLayout.forEach((row) => {
      const rowKey = row.badges.map((b) => b.type).join("-");
      if (row.isFullWidth) {
        // 横幅いっぱいの用量アイテム（4列レイアウト時の頻度）
        const badge = row.badges[0];
        if (!badge) return;
        dosageRows.push(
          createElement(
            View,
            {
              key: rowKey,
              style: {
                ...styles.dosageItem,
                flex: undefined,
                width: "100%",
              },
            },
            [
              createElement(
                Text,
                {
                  key: `${badge.type}-value`,
                  style: { ...styles.dosageValue, fontSize: dosageValueFontSize },
                },
                badge.value.slice(0, TEXT_LIMITS[badge.type])
              ),
              createElement(
                Text,
                {
                  key: `${badge.type}-label`,
                  style: { ...styles.dosageLabel, fontSize: dosageLabelFontSize },
                },
                LABELS[badge.type]
              ),
            ]
          )
        );
      } else {
        // 通常の用量行
        const rowDosages = row.badges.map((badge) =>
          createDosageElement(
            badge.type,
            badge.value,
            badge.hasValue,
            dosageValueFontSize,
            dosageLabelFontSize
          )
        );
        dosageRows.push(
          createElement(
            View,
            { key: rowKey, style: styles.dosageContainer },
            ...rowDosages
          )
        );
      }
    });

    children.push(
      createElement(
        View,
        {
          key: "dosages",
          style: { marginTop: PDF_SPACING.dosageContainerMarginTop },
        },
        ...dosageRows
      )
    );
  }

  // 注意点（行数制限 + 幅制限で折り返し）
  if (item.precautions && item.precautions.length > 0) {
    // フォントサイズから1行あたりの概算文字数を計算
    const precautionCharsPerLine = Math.floor(
      imageWidth / (precautionTextFontSize * 0.55)
    );
    const precautionItems = item.precautions.map((p) => {
      const displayValue = truncateToLines(
        p.value.slice(0, TEXT_LIMITS.precaution),
        LINE_CLAMP.precaution,
        precautionCharsPerLine
      );
      return createElement(
        Text,
        {
          key: p.id,
          style: { ...styles.precautionText, fontSize: precautionTextFontSize },
        },
        `• ${displayValue}`
      );
    });
    children.push(
      createElement(
        View,
        {
          key: "precautions",
          style: { ...styles.precautionContainer, width: imageWidth },
        },
        createElement(
          Text,
          {
            style: {
              ...styles.precautionTitle,
              fontSize: precautionTitleFontSize,
            },
          },
          LABELS.precautionTitle
        ),
        ...precautionItems
      )
    );
  }

  return createElement(
    View,
    { key: item.id, wrap: false, style: { ...styles.card, width } },
    ...children
  );
}

/**
 * ヘッダーコンポーネントを生成
 *
 * タイトルと氏名を1行で横並びに表示
 * タイトルが空欄の場合は、氏名のみを表示
 *
 * @internal テスト専用エクスポート
 */
function createHeader(title: string): React.ReactElement {
  const displayTitle = title.trim();
  const rowChildren: React.ReactElement[] = [];

  // タイトルが空でない場合のみ表示（スペース付き）
  if (displayTitle) {
    rowChildren.push(
      createElement(
        Text,
        { key: "title", style: styles.headerTitle },
        displayTitle
      )
    );
    // タイトルと氏名の間にスペースを挿入
    rowChildren.push(
      createElement(
        Text,
        { key: "space", style: styles.headerTitle },
        "   "
      )
    );
  }

  // 患者情報（常に表示）
  rowChildren.push(
    createElement(
      View,
      { key: "patientInfo", style: styles.patientInfo },
      createElement(
        Text,
        { style: styles.patientLabel },
        PDF_LABELS.patientLabel
      ),
      createElement(View, { style: styles.patientNameBox })
    )
  );

  return createElement(
    View,
    { style: styles.header },
    createElement(View, { key: "row", style: styles.headerRow }, ...rowChildren)
  );
}

/**
 * PDF生成データからPDFドキュメント全体のReact要素を生成
 *
 * @internal テスト専用エクスポート
 * @param data - PDF生成に必要なデータ（メタ情報、アイテム、画像等）
 * @returns react-pdf/rendererのDocument要素
 */
function createPdfDocument(
  data: PdfGenerationData
): ReactElement<DocumentProps> {
  // レイアウトタイプを検証してカード幅とページサイズを取得
  const validLayoutType: LayoutType = isLayoutType(data.layoutType)
    ? data.layoutType
    : "grid2";
  const cardWidth = calculatePdfCardWidth(validLayoutType);
  const sortedItems = [...data.items].sort((a, b) => a.order - b.order);
  const pageSize = getPdfPageSize(validLayoutType);

  const cards = sortedItems.map((item) =>
    createCard(
      item,
      cardWidth,
      item.imageSource ? data.images[item.imageSource] : undefined,
      validLayoutType
    )
  );

  const pageContent = [
    createHeader(data.meta.title),
    createElement(View, { key: "grid", style: styles.gridContainer }, ...cards),
  ];

  return createElement(
    Document,
    null,
    createElement(
      Page,
      { size: [pageSize.width, pageSize.height], style: styles.page },
      ...pageContent
    )
  ) as ReactElement<DocumentProps>;
}

// =====================================
// Worker メッセージハンドラ
// =====================================

let fontsRegistered = false;

self.onmessage = async (event: MessageEvent<PdfWorkerRequest>) => {
  const { data } = event.data;

  try {
    // フォントを初回のみ登録
    if (!fontsRegistered) {
      self.postMessage({ type: "progress", progress: 10 });
      await registerFonts();
      fontsRegistered = true;
    }

    self.postMessage({ type: "progress", progress: 30 });

    // PDFドキュメントを生成
    const document = createPdfDocument(data);

    self.postMessage({ type: "progress", progress: 50 });

    // PDFをBlobとして生成
    const blob = await pdf(document).toBlob();

    self.postMessage({ type: "progress", progress: 100 });
    self.postMessage({ type: "success", blob });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "PDF生成に失敗しました";
    self.postMessage({ type: "error", message: errorMessage });
  }
};

// =====================================
// エクスポート（テスト用）
// =====================================

export {
  createCard,
  createHeader,
  createPdfDocument,
  isLayoutType,
  registerFonts,
};
