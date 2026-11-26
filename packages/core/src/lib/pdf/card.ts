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
  fitPdfFontSizeToSingleLine,
  getPdfCardDescriptionText,
  getPdfCardFontSizes,
  getPdfCardImageSize,
  getPdfCardNumberBadgeSize,
  getPdfCardPrecautionText,
  getPdfCardTitleText,
  getPdfDosageItemWidth,
  getPdfTitleWidth,
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
 * @returns 用量セクション。表示する用量がなければ null
 */
function createDosageSection(
  item: EditorItem,
  layoutType: LayoutType,
  contentWidth: number,
  dosageStyle: DosageStyle
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
          { key: rowKey, style: styles.dosageContainer },
          ...rowDosages
        )
      );
    }
  });

  return createElement(
    View,
    {
      key: "dosages",
      style: { marginTop: PDF_SPACING.dosageContainerMarginTop },
    },
    ...dosageRows
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

  const children: ReactElement[] = [];

  // 非対応形式をガード（将来の経路からWebP等が混入した場合の安全策）
  const isSupportedFormat =
    imageUrl !== undefined &&
    imageUrl !== "" &&
    PDF_SUPPORTED_IMAGE_PREFIXES.some((prefix) => imageUrl.startsWith(prefix));
  const safeImageUrl = isSupportedFormat ? imageUrl : undefined;

  // 画像（未設定・非対応形式は印刷後に手書きできるよう空白の枠にする）
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

  // タイトル（1行制限 + 中央寄せ。カード番号バッジがあればその幅を引いて切り詰める）
  const displayTitle = getPdfCardTitleText(
    item.title,
    getPdfTitleWidth(imageWidth, fontSizes.title, showCardNumbers),
    fontSizes.title
  );
  if (showCardNumbers) {
    children.push(
      createTitleWithNumber(
        displayTitle,
        cardNumber,
        fontSizes.title,
        imageWidth,
        colors.cardNumberBackground
      )
    );
  } else {
    children.push(
      createElement(
        Text,
        {
          key: "title",
          style: {
            ...styles.cardTitle,
            width: imageWidth,
            alignSelf: "stretch",
            fontSize: fontSizes.title,
            marginBottom: PDF_SPACING.cardTitleMarginBottom,
          },
        },
        displayTitle
      )
    );
  }

  // 説明（行数制限 + 幅制限で折り返し）
  if (item.description) {
    const displayDescription = getPdfCardDescriptionText(
      item.description,
      imageWidth,
      fontSizes.description
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
    const precautionItems = item.precautions.map((p) =>
      createElement(
        Text,
        {
          key: p.id,
          style: {
            ...styles.precautionText,
            fontSize: fontSizes.precautionText,
            color: colors.precautionText,
          },
        },
        getPdfCardPrecautionText(p.value, imageWidth, fontSizes.precautionText)
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
    children.push(
      createElement(
        View,
        {
          key: "precautions",
          style: {
            ...styles.precautionContainer,
            width: imageWidth,
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
    {
      key: item.id,
      wrap: false,
      style: { ...styles.card, width, borderColor: colors.border },
    },
    ...children
  );
}

/**
 * カード番号バッジ付きのタイトル行を生成する
 *
 * 丸数字のバッジをタイトルの左に置き、バッジとタイトルをまとめて中央に寄せる
 *
 * @param displayTitle - 切り詰め済みのタイトル
 * @param cardNumber - 表示する番号
 * @param titleFontSize - タイトルのフォントサイズ（バッジの大きさもここから決める）
 * @param contentWidth - カード内コンテンツの幅
 * @param badgeColor - バッジの背景色
 * @returns タイトル行の要素
 */
function createTitleWithNumber(
  displayTitle: string,
  cardNumber: number,
  titleFontSize: number,
  contentWidth: number,
  badgeColor: string
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
        marginBottom: PDF_SPACING.cardTitleMarginBottom,
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
        },
      },
      displayTitle
    )
  );
}
