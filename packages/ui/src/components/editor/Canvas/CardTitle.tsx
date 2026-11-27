"use client";

import {
  CARD_NUMBER_BADGE_RATIO,
  INLINE_EDIT_TITLE_LABEL,
  LABELS,
  TEXT_LIMITS,
} from "@rehab-grid/core/lib/constants";
import { cn } from "@rehab-grid/core/lib/utils";

import { type CardInlineEdit } from "./cardTypes";
import { InlineEditInput } from "./InlineEditInput";

/**
 * カード番号バッジの見た目（大きさはタイトルの文字サイズに対する比率。PDF と同じ比率）
 */
const CARD_NUMBER_BADGE_STYLE: React.CSSProperties = {
  width: `${String(CARD_NUMBER_BADGE_RATIO.size)}em`,
  height: `${String(CARD_NUMBER_BADGE_RATIO.size)}em`,
  fontSize: `${String(CARD_NUMBER_BADGE_RATIO.fontSize)}em`,
  backgroundColor: "var(--card-number-bg)",
};

/**
 * CardTitle コンポーネントの Props
 */
type CardTitleProps = {
  /** 運動名 */
  title: string;
  /** タイトルの左に表示するカード番号（省略時はバッジを表示しない） */
  cardNumber?: number;
  /** インライン編集の状態と操作 */
  inlineEdit: CardInlineEdit;
  /** 揃え方（縦型は中央、スライドは左寄せ。省略時は中央） */
  align?: "center" | "left";
  /** 文字サイズのクラス */
  className?: string;
  /** 文字サイズなどのインラインスタイル（スライドのコンテナクエリ単位） */
  style?: React.CSSProperties;
};

/**
 * 運動カードのタイトル（カード番号バッジとインライン編集を含む）
 */
export function CardTitle({
  title,
  cardNumber,
  inlineEdit,
  align = "center",
  className,
  style,
}: CardTitleProps) {
  return (
    <h3
      className={cn(
        "flex items-center gap-[0.3em] font-semibold",
        align === "left" ? "justify-start" : "justify-center",
        className
      )}
      style={style}
    >
      {/* カード番号バッジ（丸数字。サイズはタイトルの文字サイズに追従する） */}
      {cardNumber !== undefined ? (
        <span
          className="flex shrink-0 items-center justify-center rounded-full font-bold not-italic leading-none text-white"
          style={CARD_NUMBER_BADGE_STYLE}
        >
          {cardNumber}
        </span>
      ) : null}
      {inlineEdit.editingField === "title" ? (
        <InlineEditInput
          value={title}
          maxLength={TEXT_LIMITS.title}
          label={INLINE_EDIT_TITLE_LABEL}
          className={cn("font-semibold", align === "left" && "text-left")}
          onCommit={(value) => inlineEdit.commit("title", value)}
          onCancel={inlineEdit.cancel}
        />
      ) : (
        <span
          className={cn(
            "min-w-0 truncate",
            !title && "text-muted-foreground/50 italic",
            inlineEdit.canEdit && "cursor-text"
          )}
          {...inlineEdit.triggerProps("title")}
        >
          {title ? title.slice(0, TEXT_LIMITS.title) : LABELS.untitledExercise}
        </span>
      )}
    </h3>
  );
}
