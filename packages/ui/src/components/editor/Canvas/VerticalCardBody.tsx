"use client";

import {
  EDITOR_TEXT_STYLE,
  EDITOR_TEXT_STYLE_LARGE,
  EDITOR_TEXT_STYLE_SINGLE_COLUMN,
  TEXT_LIMITS,
} from "@rehab-grid/core/lib/constants";
import { cn } from "@rehab-grid/core/lib/utils";
import type { LayoutType, TextScale } from "@rehab-grid/core/types";

import { CardDosages } from "./CardDosages";
import { CardImage } from "./CardImage";
import { CardPrecautions } from "./CardPrecautions";
import { CardTitle } from "./CardTitle";
import { type CardBodyProps } from "./cardTypes";

/**
 * カード内の文字サイズを選ぶ
 *
 * @remarks
 * デスクトップの 1 列は常に拡大スタイル（文字サイズの設定に関わらず）。
 * モバイルは 1 列表示でも拡大スタイルを使わないため、「大きめ」なら 2〜4 列向けの大きめスタイルにする。
 *
 * @param layoutType - レイアウトタイプ
 * @param textScale - 文字サイズの設定
 * @param isMobile - モバイル表示かどうか
 * @returns Tailwind のクラス名の組
 */
function getCardTextStyle(
  layoutType: LayoutType | undefined,
  textScale: TextScale,
  isMobile: boolean
):
  | typeof EDITOR_TEXT_STYLE
  | typeof EDITOR_TEXT_STYLE_LARGE
  | typeof EDITOR_TEXT_STYLE_SINGLE_COLUMN {
  if (layoutType === "grid1" && !isMobile) {
    return EDITOR_TEXT_STYLE_SINGLE_COLUMN;
  }
  return textScale === "large" ? EDITOR_TEXT_STYLE_LARGE : EDITOR_TEXT_STYLE;
}

/**
 * VerticalCardBody コンポーネントの Props
 */
type VerticalCardBodyProps = CardBodyProps & {
  /** 文字サイズの設定 */
  textScale: TextScale;
};

/**
 * 縦型の運動カードの中身（画像 → タイトル → 説明 → 用量 → 注意点）
 */
export function VerticalCardBody({
  item,
  imageUrl,
  isImageDragOver,
  isMobile,
  onImageAreaClick,
  layoutType,
  textScale,
  cardNumber,
  dosageLabels,
  inlineEdit,
  touchHandlers,
}: VerticalCardBodyProps) {
  const textStyle = getCardTextStyle(layoutType, textScale, isMobile);

  return (
    <div className="flex flex-col gap-3 p-4">
      <CardImage
        itemId={item.id}
        title={item.title}
        imageUrl={imageUrl}
        isDragOver={isImageDragOver}
        isMobile={isMobile}
        onImageAreaClick={onImageAreaClick}
      />

      {/* タイトルと説明 */}
      <div className="space-y-2" {...touchHandlers}>
        <CardTitle
          title={item.title}
          cardNumber={cardNumber}
          inlineEdit={inlineEdit}
          className={textStyle.titleSize}
        />

        {/* 説明（あれば） */}
        {item.description ? (
          <p
            className={cn(
              textStyle.descriptionSize,
              "text-muted-foreground line-clamp-4 whitespace-pre-line"
            )}
          >
            {item.description.slice(0, TEXT_LIMITS.description)}
          </p>
        ) : null}
      </div>

      <CardDosages
        dosages={item.dosages}
        layoutType={layoutType}
        dosageLabels={dosageLabels}
        inlineEdit={inlineEdit}
        touchHandlers={touchHandlers}
        valueClassName={textStyle.dosageValueSize}
        labelClassName={textStyle.dosageLabelSize}
      />

      {item.precautions && item.precautions.length > 0 ? (
        <CardPrecautions
          precautions={item.precautions}
          touchHandlers={touchHandlers}
          titleClassName={textStyle.precautionTitleSize}
          textClassName={textStyle.precautionTextSize}
        />
      ) : null}
    </div>
  );
}
