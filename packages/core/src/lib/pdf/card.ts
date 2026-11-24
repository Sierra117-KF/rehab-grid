/**
 * PDFカード要素の生成
 */

import { Image, Text, View } from "@react-pdf/renderer";
import {
  LABELS,
  LINE_CLAMP,
  PDF_CHAR_WIDTH_RATIO,
  PDF_SPACING,
  PDF_SUPPORTED_IMAGE_PREFIXES,
  TEXT_LIMITS,
} from "@rehab-grid/core/lib/constants";
import {
  type BadgeType,
  type EditorItem,
  type LayoutType,
} from "@rehab-grid/core/types";
import { getDosageBadgeLayout } from "@rehab-grid/core/utils/editor";
import { truncateToLines } from "@rehab-grid/core/utils/pdf";
import { createElement, type ReactElement } from "react";

import {
  estimateCharsPerLine,
  getPdfCardFontSizes,
  getPdfCardImageSize,
  type PdfCardFontSizes,
} from "./metrics";
import { pdfStyles as styles } from "./styles";

/**
 * 用量の数値とラベルの Text 要素を生成する
 *
 * 数値強調型デザイン: 数値を大きく表示し、ラベルは区切り線の下に小さく配置
 *
 * @param type - 用量の種類
 * @param value - 表示値
 * @param fontSizes - カード内のフォントサイズ
 * @returns [数値, ラベル] の Text 要素
 */
function createDosageTexts(
  type: BadgeType,
  value: string,
  fontSizes: PdfCardFontSizes
): ReactElement[] {
  return [
    // 数値（大きく強調）
    createElement(
      Text,
      {
        key: `${type}-value`,
        style: { ...styles.dosageValue, fontSize: fontSizes.dosageValue },
      },
      value.slice(0, TEXT_LIMITS[type])
    ),
    // ラベル（区切り線付き）
    createElement(
      Text,
      {
        key: `${type}-label`,
        style: { ...styles.dosageLabel, fontSize: fontSizes.dosageLabel },
      },
      LABELS[type]
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
 * @param fontSizes - カード内のフォントサイズ
 * @returns 用量要素
 */
function createDosageElement(
  type: BadgeType,
  value: string,
  hasValue: boolean,
  fontSizes: PdfCardFontSizes
): ReactElement {
  if (!hasValue) {
    return createElement(View, { key: type, style: styles.dosageItem });
  }

  return createElement(
    View,
    { key: type, style: styles.dosageItem },
    createDosageTexts(type, value, fontSizes)
  );
}

/**
 * 用量セクション（回数・セット数・頻度）を生成する
 *
 * @param item - エディタアイテム
 * @param layoutType - レイアウトタイプ（4列時は頻度を横幅いっぱいの行に分ける）
 * @param fontSizes - カード内のフォントサイズ
 * @returns 用量セクション。表示する用量がなければ null
 */
function createDosageSection(
  item: EditorItem,
  layoutType: LayoutType,
  fontSizes: PdfCardFontSizes
): ReactElement | null {
  const badgeLayout = getDosageBadgeLayout(item.dosages, layoutType);
  if (badgeLayout.length === 0) return null;

  const dosageRows: ReactElement[] = [];

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
            style: { ...styles.dosageItem, flex: undefined, width: "100%" },
          },
          createDosageTexts(badge.type, badge.value, fontSizes)
        )
      );
    } else {
      // 通常の用量行
      const rowDosages = row.badges.map((badge) =>
        createDosageElement(badge.type, badge.value, badge.hasValue, fontSizes)
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
 * @param layoutType - レイアウトタイプ（1列時の拡大表示・4列時の用量レイアウト変更用）
 * @returns カード要素
 */
export function createCard(
  item: EditorItem,
  width: number,
  imageUrl?: string,
  layoutType?: LayoutType
): ReactElement {
  const { width: imageWidth, height: imageHeight } = getPdfCardImageSize(width);
  const fontSizes = getPdfCardFontSizes(layoutType);

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

  // タイトル（1行制限 + 中央寄せ）
  const displayTitle = item.title
    ? truncateToLines(
        item.title.slice(0, TEXT_LIMITS.title),
        LINE_CLAMP.title,
        estimateCharsPerLine(
          imageWidth,
          fontSizes.title,
          PDF_CHAR_WIDTH_RATIO.title
        )
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
          fontSize: fontSizes.title,
          marginBottom: PDF_SPACING.cardTitleMarginBottom,
        },
      },
      displayTitle
    )
  );

  // 説明（行数制限 + 幅制限で折り返し）
  if (item.description) {
    const displayDescription = truncateToLines(
      item.description.slice(0, TEXT_LIMITS.description),
      LINE_CLAMP.description,
      estimateCharsPerLine(
        imageWidth,
        fontSizes.description,
        PDF_CHAR_WIDTH_RATIO.body
      )
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
  const dosageSection = createDosageSection(
    item,
    layoutType ?? "grid2",
    fontSizes
  );
  if (dosageSection) {
    children.push(dosageSection);
  }

  // 注意点（行数制限 + 幅制限で折り返し）
  if (item.precautions && item.precautions.length > 0) {
    const precautionCharsPerLine = estimateCharsPerLine(
      imageWidth,
      fontSizes.precautionText,
      PDF_CHAR_WIDTH_RATIO.body
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
          style: { ...styles.precautionText, fontSize: fontSizes.precautionText },
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
              fontSize: fontSizes.precautionTitle,
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
