"use client";

import {
  FONT_SIZES_SLIDE,
  PDF_CARD_STYLE,
  PDF_DEFAULT_LINE_HEIGHT,
  PDF_SLIDE,
  PDF_SPACING,
} from "@rehab-grid/core/lib/constants";
import {
  getPdfPrecautionTextWidth,
  getPdfSlideCardSize,
  getPdfSlideColumns,
  getPdfSlideDescriptionText,
  getPdfSlidePrecautionText,
  getSlideTextLines,
} from "@rehab-grid/core/lib/pdf/metrics";
import type { PrintColorMode } from "@rehab-grid/core/types";

import { CardDosages } from "./CardDosages";
import { CardImage } from "./CardImage";
import { CardPrecautions } from "./CardPrecautions";
import { ptToSlideCqw } from "./cardStyles";
import { CardTitle } from "./CardTitle";
import { type CardBodyProps } from "./cardTypes";

/**
 * スライドの文字の大きさの下限（px）
 *
 * @remarks
 * 広い画面ではカードの幅に比例した PDF と同じ見た目になり、狭い画面（スマホ・狭いデスクトップ）では
 * この大きさで止めて読みやすさを保つ（その分カードが縦に伸びる）
 */
const SLIDE_MIN_FONT_PX = {
  title: 15,
  description: 9,
  dosageValue: 18,
  dosageLabel: 8,
  precautionTitle: 8,
  precautionText: 8,
} as const;

/**
 * スライドの各テキストの文字の大きさ（PDF のポイントをカードの幅に比例させる）
 *
 * @remarks
 * 行の高さを指定していない要素は、PDF の既定の行の高さ（Noto Sans JP の自然な行の高さ）に揃える
 */
const SLIDE_FONT_STYLE = {
  title: {
    fontSize: ptToSlideCqw(FONT_SIZES_SLIDE.title, SLIDE_MIN_FONT_PX.title),
    lineHeight: PDF_DEFAULT_LINE_HEIGHT,
  },
  description: {
    fontSize: ptToSlideCqw(
      FONT_SIZES_SLIDE.description,
      SLIDE_MIN_FONT_PX.description
    ),
    lineHeight: PDF_SPACING.descriptionLineHeight,
  },
  dosageValue: {
    fontSize: ptToSlideCqw(
      FONT_SIZES_SLIDE.dosageValue,
      SLIDE_MIN_FONT_PX.dosageValue
    ),
    lineHeight: PDF_DEFAULT_LINE_HEIGHT,
  },
  dosageLabel: {
    fontSize: ptToSlideCqw(
      FONT_SIZES_SLIDE.dosageLabel,
      SLIDE_MIN_FONT_PX.dosageLabel
    ),
    lineHeight: PDF_DEFAULT_LINE_HEIGHT,
  },
  precautionTitle: {
    fontSize: ptToSlideCqw(
      FONT_SIZES_SLIDE.precautionTitle,
      SLIDE_MIN_FONT_PX.precautionTitle
    ),
    lineHeight: PDF_DEFAULT_LINE_HEIGHT,
    marginBottom: ptToSlideCqw(PDF_SPACING.precautionTitleMarginBottom),
  },
  precautionText: {
    fontSize: ptToSlideCqw(
      FONT_SIZES_SLIDE.precautionText,
      SLIDE_MIN_FONT_PX.precautionText
    ),
    lineHeight: PDF_SPACING.precautionLineHeight,
  },
} as const satisfies Record<string, React.CSSProperties>;

/** スライドの外枠の内側の余白（PDF のカードの余白） */
const SLIDE_PADDING = ptToSlideCqw(PDF_CARD_STYLE.padding);

/** タイトル行の下の余白 */
const SLIDE_TITLE_MARGIN_BOTTOM = ptToSlideCqw(PDF_SPACING.cardTitleMarginBottom);

/** 左右の列の間隔 */
const SLIDE_COLUMN_GAP = ptToSlideCqw(PDF_SLIDE.columnGap);

/**
 * 用量の上下の余白（PDF の用量セクションと用量の行の上余白、用量の項目の上下の余白）
 */
const SLIDE_DOSAGE_STYLE: React.CSSProperties = {
  paddingTop: ptToSlideCqw(
    PDF_SPACING.dosageContainerMarginTop * 2 + PDF_SPACING.dosagePaddingVertical
  ),
  paddingBottom: ptToSlideCqw(PDF_SPACING.dosagePaddingVertical),
};

/** 用量の項目の間隔 */
const SLIDE_DOSAGE_ROW_STYLE: React.CSSProperties = {
  columnGap: ptToSlideCqw(PDF_SPACING.dosageGap),
};

/** 用量のラベルの区切り線まわりの余白と線の太さ */
const SLIDE_DOSAGE_DIVIDER_STYLE: React.CSSProperties = {
  marginTop: ptToSlideCqw(PDF_SPACING.dosageLabelMarginTop),
  paddingTop: ptToSlideCqw(PDF_SPACING.dosageLabelPaddingTop),
  borderTopWidth: ptToSlideCqw(PDF_SPACING.dosageBorderWidth),
};

/** 注意点の枠の内側の余白 */
const SLIDE_PRECAUTION_PADDING = ptToSlideCqw(PDF_SPACING.precautionPadding);

/** 説明と注意点の枠の間隔 */
const SLIDE_PRECAUTION_MARGIN_TOP = ptToSlideCqw(
  PDF_SPACING.precautionMarginTop
);

/**
 * SlideCardBody コンポーネントの Props
 */
type SlideCardBodyProps = CardBodyProps & {
  /** 印刷の色づかい（白黒モードの注意点枠線幅を含めた行数計算に使う） */
  printColorMode: PrintColorMode;
};

/**
 * スライド（A4 横・1 ページ 1 運動）の運動カードの中身
 *
 * 1 行目に左寄せのタイトル、その下の左の列に画像と用量、右の列に説明と注意点を置く。
 * 縦横比・左右の列の幅・説明と注意点の行数は PDF と同じ関数で決め、寸法と文字はカードの幅に
 * 比例させる（コンテナクエリ単位）
 */
export function SlideCardBody({
  item,
  imageUrl,
  isImageDragOver,
  isMobile,
  onImageAreaClick,
  layoutType,
  cardNumber,
  dosageLabels,
  inlineEdit,
  touchHandlers,
  printColorMode,
}: SlideCardBodyProps) {
  const cardSize = getPdfSlideCardSize();
  const { innerWidth, leftColumnWidth, rightColumnWidth } =
    getPdfSlideColumns(cardSize);
  const { descriptionLines, precautionLines } = getSlideTextLines(item, {
    printColorMode,
  });
  const hasPrecautions =
    item.precautions !== undefined && item.precautions.length > 0;
  // 説明・注意点は PDF と同じ位置で切り詰めた文字列を出す（行数で切ると、文字が下限の大きさで
  // 止まる狭い画面では 1 行の文字数が減り、PDF より手前で切れてしまうため）
  const precautionTextWidth = getPdfPrecautionTextWidth(
    rightColumnWidth,
    printColorMode
  );
  const formatPrecaution = (value: string) =>
    getPdfSlidePrecautionText(value, precautionLines, precautionTextWidth);

  return (
    // 外枠は縦横比だけを決める（文字の下限で中身が溢れたときは縦に伸びる）
    <div
      data-testid="slide-card-body"
      className="@container"
      style={{ aspectRatio: cardSize.width / cardSize.height }}
    >
      <div style={{ padding: SLIDE_PADDING }}>
        {/* タイトル行（左寄せ） */}
        <div
          style={{ marginBottom: SLIDE_TITLE_MARGIN_BOTTOM }}
          {...touchHandlers}
        >
          <CardTitle
            title={item.title}
            cardNumber={cardNumber}
            inlineEdit={inlineEdit}
            align="left"
            style={SLIDE_FONT_STYLE.title}
          />
        </div>

        <div className="flex items-start" style={{ gap: SLIDE_COLUMN_GAP }}>
          {/* 左の列：画像と用量 */}
          <div
            data-testid="slide-left-column"
            className="shrink-0"
            style={{ width: `${String((leftColumnWidth / innerWidth) * 100)}%` }}
          >
            <CardImage
              itemId={item.id}
              title={item.title}
              imageUrl={imageUrl}
              isDragOver={isImageDragOver}
              isMobile={isMobile}
              onImageAreaClick={onImageAreaClick}
            />
            <CardDosages
              dosages={item.dosages}
              layoutType={layoutType}
              dosageLabels={dosageLabels}
              inlineEdit={inlineEdit}
              touchHandlers={touchHandlers}
              valueStyle={SLIDE_FONT_STYLE.dosageValue}
              labelStyle={SLIDE_FONT_STYLE.dosageLabel}
              style={SLIDE_DOSAGE_STYLE}
              rowStyle={SLIDE_DOSAGE_ROW_STYLE}
              labelDividerStyle={SLIDE_DOSAGE_DIVIDER_STYLE}
            />
          </div>

          {/* 右の列：説明と注意点 */}
          <div
            data-testid="slide-right-column"
            className="min-w-0 flex-1"
            {...touchHandlers}
          >
            {descriptionLines > 0 ? (
              <p
                className="text-muted-foreground whitespace-pre-line wrap-break-word"
                style={SLIDE_FONT_STYLE.description}
              >
                {getPdfSlideDescriptionText(
                  item.description,
                  descriptionLines,
                  rightColumnWidth
                )}
              </p>
            ) : null}
            {hasPrecautions ? (
              <CardPrecautions
                precautions={item.precautions ?? []}
                // ロングプレスは右の列全体で検知している
                touchHandlers={{}}
                // PDF の注意点は項目の間隔を取らない（見出しの下の余白だけ）
                className="space-y-0"
                style={{
                  padding: SLIDE_PRECAUTION_PADDING,
                  // 説明がないときは右の列の最上部から置く
                  marginTop:
                    descriptionLines > 0 ? SLIDE_PRECAUTION_MARGIN_TOP : 0,
                }}
                // 見出しをブロック要素にし、狭い画面で文字を縮小しても親の line-height（16px）に引っ張られないようにする
                titleClassName="block"
                titleStyle={SLIDE_FONT_STYLE.precautionTitle}
                textStyle={SLIDE_FONT_STYLE.precautionText}
                formatText={formatPrecaution}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
