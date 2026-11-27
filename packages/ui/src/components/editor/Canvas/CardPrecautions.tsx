"use client";

import { LABELS, TEXT_LIMITS } from "@rehab-grid/core/lib/constants";
import { cn } from "@rehab-grid/core/lib/utils";
import type { Precaution } from "@rehab-grid/core/types";

import { getLineClampStyle, LINE_CLAMP_CLASS } from "./cardStyles";
import { type ContentTouchHandlers } from "./cardTypes";

/**
 * 注意点ボックスの枠線の色（白黒モードのみ Canvas が濃い色に上書きする。既定は透明）
 */
const PRECAUTION_BORDER_STYLE: React.CSSProperties = {
  borderColor: "var(--precaution-border)",
};

/**
 * CardPrecautions コンポーネントの Props
 */
type CardPrecautionsProps = {
  /** 注意点（1 件以上） */
  precautions: Precaution[];
  /** モバイルのロングプレスを検知するタッチハンドラ */
  touchHandlers: ContentTouchHandlers;
  /** 枠のクラス（スライドで項目の間隔をなくすなど） */
  className?: string;
  /** 枠のインラインスタイル（スライドの余白など） */
  style?: React.CSSProperties;
  /** 見出しの文字サイズのクラス */
  titleClassName?: string;
  /** 見出しの文字サイズのインラインスタイル */
  titleStyle?: React.CSSProperties;
  /** 本文の文字サイズのクラス */
  textClassName?: string;
  /** 本文の文字サイズのインラインスタイル */
  textStyle?: React.CSSProperties;
  /** 1 件あたりの行数の上限（省略時は制限しない） */
  lineClamp?: number;
};

/**
 * 運動カードの注意点の枠（枠線は白黒モードでだけ見える。Canvas が上書きする CSS 変数を参照する）
 */
export function CardPrecautions({
  precautions,
  touchHandlers,
  className,
  style,
  titleClassName,
  titleStyle,
  textClassName,
  textStyle,
  lineClamp,
}: CardPrecautionsProps) {
  const clampedTextStyle =
    lineClamp === undefined
      ? textStyle
      : { ...textStyle, ...getLineClampStyle(lineClamp) };

  return (
    <div
      className={cn(
        "rounded-lg border bg-precaution-bg p-2.5 space-y-1",
        className
      )}
      style={{ ...PRECAUTION_BORDER_STYLE, ...style }}
      {...touchHandlers}
    >
      <span
        className={cn(titleClassName, "font-semibold text-precaution-title")}
        style={titleStyle}
      >
        {LABELS.precautionTitle}
      </span>
      {precautions.map((precaution) => (
        <p
          key={precaution.id}
          className={cn(
            textClassName,
            "text-precaution-text whitespace-pre-line wrap-break-word",
            lineClamp !== undefined && LINE_CLAMP_CLASS
          )}
          style={clampedTextStyle}
        >
          • {precaution.value.slice(0, TEXT_LIMITS.precaution)}
        </p>
      ))}
    </div>
  );
}
