/**
 * PDFカード要素の生成
 */

import { Image, Text, View } from "@react-pdf/renderer";
import {
  CARD_NUMBER_BADGE_RATIO,
  DOSAGE_DIVIDER_OPACITY,
  LABELS,
  MONOCHROME_COLORS,
  PDF_COLORS,
  PDF_DOSAGE_COLORS,
  PDF_HALF_WIDTH_CHAR_RATIO,
  PDF_SLIDE,
  PDF_SPACING,
  PDF_SUPPORTED_IMAGE_PREFIXES,
  TEXT_LIMITS,
} from "@rehab-grid/core/lib/constants";
import { resolveProjectSettings } from "@rehab-grid/core/lib/settings";
import {
  type BadgeType,
  type DosageLabels,
  type EditorItem,
  type LayoutType,
  type PrintColorMode,
  type ResolvedProjectSettings,
} from "@rehab-grid/core/types";
import { mixWithWhite } from "@rehab-grid/core/utils/color";
import { getDosageBadgeLayout } from "@rehab-grid/core/utils/editor";
import { createElement, type ReactElement } from "react";

import {
  breakPdfOverflowWords,
  fitPdfFontSizeToSingleLine,
  getPdfCardDescriptionText,
  getPdfCardFontSizes,
  getPdfCardImageSize,
  getPdfCardNumberBadgeSize,
  getPdfCardPrecautionText,
  getPdfCardTitleText,
  getPdfDosageItemWidth,
  getPdfPrecautionTextWidth,
  getPdfSlideCardSize,
  getPdfSlideColumns,
  getPdfSlideDescriptionText,
  getPdfSlidePrecautionText,
  getPdfTitleWidth,
  getSlideTextLines,
  type PdfCardFontSizes,
} from "./metrics";
import { pdfStyles as styles } from "./styles";

/**
 * カードの描画に使う色
 */
type PdfCardColors = {
  /** カードの枠線 */
  border: string;
  /** 用量の数値とラベルの間の区切り線 */
  dosageDivider: string;
  /** 用量のラベル */
  dosageLabel: string;
  /** カード番号バッジの背景 */
  cardNumberBackground: string;
  /** 注意点の背景 */
  precautionBackground: string;
  /** 注意点の枠線（カラーでは枠線を付けない） */
  precautionBorder: string | undefined;
  /** 注意点の見出し */
  precautionTitle: string;
  /** 注意点の本文 */
  precautionText: string;
};

/**
 * テーマカラーと印刷の色づかいから、カードの描画に使う色を求める
 *
 * @param themeColor - テーマカラー（#RRGGBB）
 * @param printColorMode - 印刷の色づかい
 * @returns カードの描画に使う色
 */
function getPdfCardColors(
  themeColor: string,
  printColorMode: PrintColorMode
): PdfCardColors {
  if (printColorMode === "monochrome") {
    return {
      border: MONOCHROME_COLORS.cardBorder,
      dosageDivider: MONOCHROME_COLORS.dosageDivider,
      dosageLabel: MONOCHROME_COLORS.dosageLabel,
      cardNumberBackground: MONOCHROME_COLORS.cardNumberBackground,
      precautionBackground: MONOCHROME_COLORS.precautionBackground,
      precautionBorder: MONOCHROME_COLORS.precautionBorder,
      precautionTitle: MONOCHROME_COLORS.precautionTitle,
      precautionText: MONOCHROME_COLORS.precautionText,
    };
  }
  return {
    border: themeColor,
    // react-pdf では半透明の線の色味が変わることがあるため、白地と合成した不透明色で描く
    dosageDivider: mixWithWhite(themeColor, DOSAGE_DIVIDER_OPACITY),
    dosageLabel: PDF_DOSAGE_COLORS.label,
    cardNumberBackground: themeColor,
    precautionBackground: PDF_COLORS.precautionBackground,
    precautionBorder: undefined,
    precautionTitle: PDF_COLORS.precautionTitle,
    precautionText: PDF_COLORS.precautionText,
  };
}

/**
 * 用量の描画に使う値
 */
type DosageStyle = {
  /** カード内のフォントサイズ */
  fontSizes: PdfCardFontSizes;
  /** カードの描画に使う色 */
  colors: PdfCardColors;
  /** 用量のラベル */
  labels: DosageLabels;
};

/**
 * 用量の数値とラベルの Text 要素を生成する
 *
 * 数値強調型デザイン: 数値を大きく表示し、ラベルは区切り線の下に小さく配置。
 * 項目幅に収まらない長い文字列は 2 行にならないよう自動でフォントサイズを縮小する。
 *
 * @param type - 用量の種類
 * @param value - 表示値
 * @param itemWidth - 1 項目分の幅（ポイント単位）
 * @param dosageStyle - フォントサイズ・色・ラベル
 * @returns [数値, ラベル] の Text 要素
 */
function createDosageTexts(
  type: BadgeType,
  value: string,
  itemWidth: number,
  { fontSizes, colors, labels }: DosageStyle
): ReactElement[] {
  const displayValue = value.slice(0, TEXT_LIMITS[type]);
  const valueFontSize = fitPdfFontSizeToSingleLine(
    displayValue,
    itemWidth,
    fontSizes.dosageValue,
    PDF_HALF_WIDTH_CHAR_RATIO.bold
  );
  const labelFontSize = fitPdfFontSizeToSingleLine(
    labels[type],
    itemWidth,
    fontSizes.dosageLabel,
    PDF_HALF_WIDTH_CHAR_RATIO.regular
  );

  return [
    // 数値（大きく強調）
    createElement(
      Text,
      {
        key: `${type}-value`,
        style: { ...styles.dosageValue, fontSize: valueFontSize },
      },
      displayValue
    ),
    // ラベル（区切り線付き）
    createElement(
      Text,
      {
        key: `${type}-label`,
        style: {
          ...styles.dosageLabel,
          fontSize: labelFontSize,
          color: colors.dosageLabel,
          borderTopColor: colors.dosageDivider,
        },
      },
      labels[type]
    ),
  ];
}

/**
 * 通常の用量行に並べる単一の用量要素を生成する
 *
 * 値が未設定の場合も、列の位置を揃えるため空の枠を返す
 *
 * @param type - 用量の種類
 * @param value - 表示値
 * @param hasValue - 値が設定されているか
 * @param itemWidth - 1 項目分の幅（ポイント単位）
 * @param dosageStyle - フォントサイズ・色・ラベル
 * @returns 用量要素
 */
function createDosageElement(
  type: BadgeType,
  value: string,
  hasValue: boolean,
  itemWidth: number,
  dosageStyle: DosageStyle
): ReactElement {
  if (!hasValue) {
    return createElement(View, { key: type, style: styles.dosageItem });
  }

  return createElement(
    View,
    { key: type, style: styles.dosageItem },
    createDosageTexts(type, value, itemWidth, dosageStyle)
  );
}

/**
 * 用量セクション（回数・セット数・頻度）を生成する
 *
 * @param item - エディタアイテム
 * @param layoutType - レイアウトタイプ（4列時は頻度を横幅いっぱいの行に分ける）
 * @param contentWidth - カード内コンテンツの幅（ポイント単位）
 * @param dosageStyle - フォントサイズ・色・ラベル
 * @param compactVerticalMargins - 上部の余白を省いて親の縦中央寄せに任せるか（スライド用。省略時は false）
 * @returns 用量セクション。表示する用量がなければ null
 */
function createDosageSection(
  item: EditorItem,
  layoutType: LayoutType,
  contentWidth: number,
  dosageStyle: DosageStyle,
  compactVerticalMargins = false
): ReactElement | null {
  const badgeLayout = getDosageBadgeLayout(item.dosages, layoutType);
  if (badgeLayout.length === 0) return null;

  const dosageRows: ReactElement[] = [];

  badgeLayout.forEach((row) => {
    const rowKey = row.badges.map((b) => b.type).join("-");
    const itemWidth = getPdfDosageItemWidth(contentWidth, row.badges.length);
    if (row.isFullWidth) {
      // 横幅いっぱいの用量アイテム（4列レイアウト時の頻度）
      const badge = row.badges[0];
      if (!badge) return;
      dosageRows.push(
        createElement(
          View,
          {
            key: rowKey,
            style: { ...styles.dosageItem, flex: undefined, width: "100%" },
          },
          createDosageTexts(badge.type, badge.value, itemWidth, dosageStyle)
        )
      );
    } else {
      // 通常の用量行
      const rowDosages = row.badges.map((badge) =>
        createDosageElement(
          badge.type,
          badge.value,
          badge.hasValue,
          itemWidth,
          dosageStyle
        )
      );
      dosageRows.push(
        createElement(
          View,
          {
            key: rowKey,
            style: compactVerticalMargins
              ? { ...styles.dosageContainer, marginTop: 0 }
              : styles.dosageContainer,
          },
          ...rowDosages
        )
      );
    }
  });

  return createElement(
    View,
    {
      key: "dosages",
      style: {
        marginTop: compactVerticalMargins
          ? 0
          : PDF_SPACING.dosageContainerMarginTop,
      },
    },
    ...dosageRows
  );
}

/**
 * カードの画像要素を生成する
 *
 * 未設定・非対応形式は、印刷後に手書きできるよう空白の枠にする
 *
 * @param imageUrl - 画像のBase64 data URL（省略可）
 * @param width - 画像の幅（ポイント単位）
 * @param height - 画像の高さ（ポイント単位）
 * @returns 画像または空白の枠の要素
 */
function createImageElement(
  imageUrl: string | undefined,
  width: number,
  height: number
): ReactElement {
  // 非対応形式をガード（将来の経路からWebP等が混入した場合の安全策）
  const isSupportedFormat =
    imageUrl !== undefined &&
    imageUrl !== "" &&
    PDF_SUPPORTED_IMAGE_PREFIXES.some((prefix) => imageUrl.startsWith(prefix));

  if (isSupportedFormat) {
    return createElement(Image, {
      key: "image",
      src: imageUrl,
      style: { ...styles.cardImage, width, height },
    });
  }
  return createElement(View, {
    key: "imagePlaceholder",
    style: { ...styles.cardImagePlaceholder, width, height },
  });
}

/**
 * 注意点の枠のスペーシング設定（スライドと縦型で余白を変えるために使う）
 */
type PrecautionBoxSpacing = {
  /** 枠の上の余白 */
  marginTop?: number;
  /** 枠の内側の余白 */
  padding?: number;
  /** 見出しの下の余白 */
  titleMarginBottom?: number;
  /** 各項目どうしの間隔 */
  itemGap?: number;
};

/**
 * 注意点の枠を生成する
 *
 * @param precautionTexts - 表示する注意点（行頭の「•」付き・切り詰め済み）と React の key
 * @param boxWidth - 枠の幅（ポイント単位）
 * @param fontSizes - カード内のフォントサイズ
 * @param colors - カードの描画に使う色
 * @param spacing - 余白の上書き設定（省略時は縦型カードの既定値）
 * @returns 注意点の枠の要素
 */
function createPrecautionBox(
  precautionTexts: { key: string; text: string }[],
  boxWidth: number,
  fontSizes: PdfCardFontSizes,
  colors: PdfCardColors,
  spacing: PrecautionBoxSpacing = {}
): ReactElement {
  const {
    marginTop = PDF_SPACING.precautionMarginTop,
    padding = PDF_SPACING.precautionPadding,
    titleMarginBottom = PDF_SPACING.precautionTitleMarginBottom,
    itemGap = 0,
  } = spacing;
  const precautionItems = precautionTexts.map(({ key, text }, index) =>
    createElement(
      Text,
      {
        key,
        style: {
          ...styles.precautionText,
          fontSize: fontSizes.precautionText,
          color: colors.precautionText,
          ...(index > 0 && itemGap > 0 ? { marginTop: itemGap } : {}),
        },
      },
      text
    )
  );
  // 白黒モードは塗りつぶしの代わりに濃い枠線で囲む
  const precautionBorderStyle =
    colors.precautionBorder === undefined
      ? {}
      : {
          borderWidth: PDF_SPACING.precautionBorderWidth,
          borderColor: colors.precautionBorder,
        };
  return createElement(
    View,
    {
      key: "precautions",
      style: {
        ...styles.precautionContainer,
        width: boxWidth,
        marginTop,
        padding,
        backgroundColor: colors.precautionBackground,
        ...precautionBorderStyle,
      },
    },
    createElement(
      Text,
      {
        style: {
          ...styles.precautionTitle,
          fontSize: fontSizes.precautionTitle,
          color: colors.precautionTitle,
          marginBottom: titleMarginBottom,
        },
      },
      LABELS.precautionTitle
    ),
    ...precautionItems
  );
}

/**
 * エディタアイテムからPDFカードの要素を生成する
 *
 * @param item - カードに表示するエディタアイテム
 * @param width - カードの幅（ポイント単位）
 * @param imageUrl - 画像のBase64 data URL（省略可）
 * @param settings - プロジェクト設定（文字サイズ・4列時の用量レイアウト・色・カード番号・用量ラベル。省略時はデフォルト値）
 * @param cardNumber - カード番号バッジに表示する番号（省略時は order + 1）
 * @returns カード要素
 */
export function createCard(
  item: EditorItem,
  width: number,
  imageUrl?: string,
  settings?: ResolvedProjectSettings,
  cardNumber: number = item.order + 1
): ReactElement {
  const {
    layoutType,
    themeColor,
    printColorMode,
    textScale,
    showCardNumbers,
    dosageLabels,
  } = resolveProjectSettings(settings);
  const { width: imageWidth, height: imageHeight } = getPdfCardImageSize(width);
  const fontSizes = getPdfCardFontSizes(layoutType, textScale);
  const colors = getPdfCardColors(themeColor, printColorMode);

  const children: ReactElement[] = [
    createImageElement(imageUrl, imageWidth, imageHeight),
  ];

  // タイトル（1行制限 + 中央寄せ。カード番号バッジがあればその幅を引いて切り詰める）
  const displayTitle = getPdfCardTitleText(
    item.title,
    getPdfTitleWidth(imageWidth, fontSizes.title, showCardNumbers),
    fontSizes.title
  );
  children.push(
    createCardTitle(
      displayTitle,
      showCardNumbers ? cardNumber : null,
      fontSizes.title,
      imageWidth,
      colors.cardNumberBackground,
      "center"
    )
  );

  // 説明（行数制限 + 幅制限で折り返し）
  if (item.description) {
    const displayDescription = breakPdfOverflowWords(
      getPdfCardDescriptionText(
        item.description,
        imageWidth,
        fontSizes.description
      ),
      imageWidth,
      fontSizes.description,
      PDF_HALF_WIDTH_CHAR_RATIO.regular
    );
    children.push(
      createElement(
        Text,
        {
          key: "description",
          style: {
            ...styles.cardDescription,
            width: imageWidth,
            fontSize: fontSizes.description,
          },
        },
        displayDescription
      )
    );
  }

  // 用量（回数・セット数・頻度）
  const dosageSection = createDosageSection(item, layoutType, imageWidth, {
    fontSizes,
    colors,
    labels: dosageLabels,
  });
  if (dosageSection) {
    children.push(dosageSection);
  }

  // 注意点（行数制限 + 幅制限で折り返し）
  if (item.precautions && item.precautions.length > 0) {
    const precautionTextWidth = getPdfPrecautionTextWidth(
      imageWidth,
      printColorMode
    );
    children.push(
      createPrecautionBox(
        item.precautions.map((p) => ({
          key: p.id,
          text: breakPdfOverflowWords(
            getPdfCardPrecautionText(
              p.value,
              precautionTextWidth,
              fontSizes.precautionText
            ),
            precautionTextWidth,
            fontSizes.precautionText,
            PDF_HALF_WIDTH_CHAR_RATIO.regular
          ),
        })),
        imageWidth,
        fontSizes,
        colors
      )
    );
  }

  return createElement(
    View,
    {
      key: item.id,
      wrap: false,
      style: { ...styles.card, width, borderColor: colors.border },
    },
    ...children
  );
}

/**
 * エディタアイテムからスライド（A4 横・1 ページ 1 運動）のカードの要素を生成する
 *
 * 1 行目に左寄せのタイトル、その下の左の列に画像と用量、右の列に説明と注意点を置く。
 * カードの大きさは固定値（getPdfSlideCardSize）で、
 * 説明・注意点は右の列に収まる行数（getSlideTextLines）で切り詰める。
 *
 * @param item - カードに表示するエディタアイテム
 * @param imageUrl - 画像のBase64 data URL（省略可）
 * @param settings - プロジェクト設定（色・カード番号・用量ラベル）
 * @param cardNumber - カード番号バッジに表示する番号
 * @returns カード要素
 */
export function createSlideCard(
  item: EditorItem,
  imageUrl: string | undefined,
  settings: ResolvedProjectSettings,
  cardNumber: number
): ReactElement {
  const { themeColor, printColorMode, showCardNumbers, dosageLabels } =
    settings;
  const cardSize = getPdfSlideCardSize();
  const { innerWidth, leftColumnWidth, imageHeight, rightColumnWidth } =
    getPdfSlideColumns(cardSize);
  const { descriptionLines, precautionLines } = getSlideTextLines(
    item,
    settings
  );
  const fontSizes = getPdfCardFontSizes("slide");
  const colors = getPdfCardColors(themeColor, printColorMode);

  const displayTitle = getPdfCardTitleText(
    item.title,
    getPdfTitleWidth(innerWidth, fontSizes.title, showCardNumbers),
    fontSizes.title
  );
  const title = createCardTitle(
    displayTitle,
    showCardNumbers ? cardNumber : null,
    fontSizes.title,
    innerWidth,
    colors.cardNumberBackground,
    "left",
    PDF_SLIDE.titleMarginBottom
  );

  // 左の列：画像と用量（用量は画像の下の残り領域で上下中央に配置。用量がなければ画像を縦中央に配置）
  const leftChildren: ReactElement[] = [
    createImageElement(imageUrl, leftColumnWidth, imageHeight),
  ];
  const dosageSection = createDosageSection(
    item,
    "slide",
    leftColumnWidth,
    {
      fontSizes,
      colors,
      labels: dosageLabels,
    },
    true
  );
  if (dosageSection) {
    leftChildren.push(
      createElement(
        View,
        {
          key: "dosageArea",
          style: { flex: 1, justifyContent: "center" },
        },
        dosageSection
      )
    );
  }

  // 右の列：説明と注意点（本体の高さの中で上下中央に配置。長文時は自動的に上下いっぱいに広がる）
  const rightChildren: ReactElement[] = [];
  if (descriptionLines > 0) {
    rightChildren.push(
      createElement(
        Text,
        {
          key: "description",
          style: {
            ...styles.cardDescription,
            width: rightColumnWidth,
            fontSize: fontSizes.description,
          },
        },
        breakPdfOverflowWords(
          getPdfSlideDescriptionText(
            item.description,
            descriptionLines,
            rightColumnWidth
          ),
          rightColumnWidth,
          fontSizes.description,
          PDF_HALF_WIDTH_CHAR_RATIO.regular
        )
      )
    );
  }
  if (item.precautions && item.precautions.length > 0) {
    const textWidth = getPdfPrecautionTextWidth(
      rightColumnWidth,
      printColorMode,
      PDF_SLIDE.precautionPadding
    );
    rightChildren.push(
      createPrecautionBox(
        item.precautions.map((p) => ({
          key: p.id,
          text: breakPdfOverflowWords(
            getPdfSlidePrecautionText(p.value, precautionLines, textWidth),
            textWidth,
            fontSizes.precautionText,
            PDF_HALF_WIDTH_CHAR_RATIO.regular
          ),
        })),
        rightColumnWidth,
        fontSizes,
        colors,
        {
          // 説明がないときは余白なしで置く
          marginTop: descriptionLines > 0 ? PDF_SLIDE.precautionMarginTop : 0,
          padding: PDF_SLIDE.precautionPadding,
          titleMarginBottom: PDF_SLIDE.precautionTitleMarginBottom,
          itemGap: PDF_SLIDE.precautionItemGap,
        }
      )
    );
  }

  return createElement(
    View,
    {
      key: item.id,
      wrap: false,
      style: {
        ...styles.card,
        width: cardSize.width,
        height: cardSize.height,
        padding: PDF_SLIDE.cardPadding,
        marginBottom: 0,
        borderColor: colors.border,
      },
    },
    title,
    createElement(
      View,
      {
        key: "body",
        style: {
          flex: 1,
          flexDirection: "row",
          gap: PDF_SLIDE.columnGap,
        },
      },
      createElement(
        View,
        {
          key: "left",
          style: {
            width: leftColumnWidth,
            flexDirection: "column",
            justifyContent: dosageSection ? "flex-start" : "center",
          },
        },
        ...leftChildren
      ),
      createElement(
        View,
        {
          key: "right",
          style: {
            width: rightColumnWidth,
            flexDirection: "column",
            justifyContent: "center",
          },
        },
        ...rightChildren
      )
    )
  );
}

/**
 * タイトルの揃え方
 *
 * - center: 縦型カード（画像の下に中央寄せ）
 * - left: スライド（カードの最上部に左寄せ。上の余白なし）
 */
type CardTitleAlign = "center" | "left";

/**
 * カードのタイトル（カード番号バッジ付きなら行）を生成する
 *
 * @param displayTitle - 切り詰め済みのタイトル
 * @param cardNumber - 表示する番号（バッジを出さないときは null）
 * @param titleFontSize - タイトルのフォントサイズ（バッジの大きさもここから決める）
 * @param contentWidth - カード内コンテンツの幅
 * @param badgeColor - バッジの背景色
 * @param align - 揃え方
 * @param marginBottom - タイトル行の下の余白（省略時は縦型カードの既定値）
 * @returns タイトルの要素
 */
function createCardTitle(
  displayTitle: string,
  cardNumber: number | null,
  titleFontSize: number,
  contentWidth: number,
  badgeColor: string,
  align: CardTitleAlign,
  marginBottom: number = PDF_SPACING.cardTitleMarginBottom
): ReactElement {
  if (cardNumber !== null) {
    return createTitleWithNumber(
      displayTitle,
      cardNumber,
      titleFontSize,
      contentWidth,
      badgeColor,
      align,
      marginBottom
    );
  }
  return createElement(
    Text,
    {
      key: "title",
      style: {
        ...styles.cardTitle,
        width: contentWidth,
        alignSelf: "stretch",
        fontSize: titleFontSize,
        marginBottom,
        ...(align === "left" ? { marginTop: 0, textAlign: "left" } : {}),
      },
    },
    displayTitle
  );
}

/**
 * カード番号バッジ付きのタイトル行を生成する
 *
 * 丸数字のバッジをタイトルの左に置き、バッジとタイトルをまとめて中央（スライドは左）に寄せる
 *
 * @param displayTitle - 切り詰め済みのタイトル
 * @param cardNumber - 表示する番号
 * @param titleFontSize - タイトルのフォントサイズ（バッジの大きさもここから決める）
 * @param contentWidth - カード内コンテンツの幅
 * @param badgeColor - バッジの背景色
 * @param align - 揃え方
 * @param marginBottom - タイトル行の下の余白
 * @returns タイトル行の要素
 */
function createTitleWithNumber(
  displayTitle: string,
  cardNumber: number,
  titleFontSize: number,
  contentWidth: number,
  badgeColor: string,
  align: CardTitleAlign,
  marginBottom: number = PDF_SPACING.cardTitleMarginBottom
): ReactElement {
  const badgeSize = getPdfCardNumberBadgeSize(titleFontSize);
  // 横並びの行では Text の幅が決まらずカードからはみ出すため、バッジを除いた幅を上限にする
  const titleWidth = getPdfTitleWidth(contentWidth, titleFontSize, true);

  return createElement(
    View,
    {
      key: "title",
      style: {
        ...styles.cardTitleRow,
        width: contentWidth,
        marginBottom,
        ...(align === "left"
          ? { marginTop: 0, justifyContent: "flex-start" }
          : {}),
      },
    },
    createElement(
      View,
      {
        key: "number",
        style: {
          ...styles.cardNumberBadge,
          width: badgeSize,
          height: badgeSize,
          borderRadius: badgeSize / 2,
          backgroundColor: badgeColor,
        },
      },
      createElement(
        Text,
        {
          style: {
            ...styles.cardNumberText,
            fontSize: titleFontSize * CARD_NUMBER_BADGE_RATIO.fontSize,
          },
        },
        String(cardNumber)
      )
    ),
    createElement(
      Text,
      {
        key: "text",
        style: {
          ...styles.cardTitle,
          marginTop: 0,
          marginBottom: 0,
          fontSize: titleFontSize,
          maxWidth: titleWidth,
          ...(align === "left" ? { textAlign: "left" } : {}),
        },
      },
      displayTitle
    )
  );
}
