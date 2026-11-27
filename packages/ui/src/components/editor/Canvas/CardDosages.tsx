"use client";

import {
  createInlineDosageInputLabel,
  TEXT_LIMITS,
} from "@rehab-grid/core/lib/constants";
import { cn } from "@rehab-grid/core/lib/utils";
import type {
  DosageLabels,
  EditorItem,
  LayoutType,
} from "@rehab-grid/core/types";
import { getDosageBadgeLayout } from "@rehab-grid/core/utils/editor";

import { AutoFitText } from "./AutoFitText";
import { type CardInlineEdit, type ContentTouchHandlers } from "./cardTypes";
import { InlineEditInput } from "./InlineEditInput";

/**
 * 用量の区切り線の色（Canvas がテーマカラーから上書きする CSS 変数を参照する）
 */
const DOSAGE_DIVIDER_STYLE: React.CSSProperties = {
  borderTopColor: "var(--dosage-accent-light)",
};

/**
 * CardDosages コンポーネントの Props
 */
type CardDosagesProps = {
  /** 回数・セット数・頻度 */
  dosages: EditorItem["dosages"];
  /** レイアウトタイプ（4 列時のバッジの並びと間隔を変える） */
  layoutType: LayoutType | undefined;
  /** 用量のラベル */
  dosageLabels: DosageLabels;
  /** インライン編集の状態と操作 */
  inlineEdit: CardInlineEdit;
  /** モバイルのロングプレスを検知するタッチハンドラ */
  touchHandlers: ContentTouchHandlers;
  /** 数値の文字サイズのクラス */
  valueClassName?: string;
  /** 数値の文字サイズのインラインスタイル（スライドのコンテナクエリ単位） */
  valueStyle?: React.CSSProperties;
  /** ラベルの文字サイズのクラス */
  labelClassName?: string;
  /** ラベルの文字サイズのインラインスタイル（スライドのコンテナクエリ単位） */
  labelStyle?: React.CSSProperties;
};

/**
 * 運動カードの回数・セット数・頻度（数値強調型デザイン。用量がなければ何も描かない）
 */
export function CardDosages({
  dosages,
  layoutType,
  dosageLabels,
  inlineEdit,
  touchHandlers,
  valueClassName,
  valueStyle,
  labelClassName,
  labelStyle,
}: CardDosagesProps) {
  const badgeLayout = getDosageBadgeLayout(dosages, layoutType ?? "grid2");
  if (badgeLayout.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 py-2" {...touchHandlers}>
      {badgeLayout.map((row) => {
        const rowKey = row.badges.map((b) => b.type).join("-");
        return (
          <div
            key={rowKey}
            className={cn(
              "grid",
              layoutType === "grid3" || layoutType === "grid4"
                ? "gap-2"
                : "gap-4",
              row.isFullWidth
                ? "grid-cols-1"
                : row.badges.length === 2
                  ? "grid-cols-2"
                  : "grid-cols-3"
            )}
          >
            {row.badges.map((badge) => {
              const displayValue = badge.hasValue
                ? badge.value.slice(0, TEXT_LIMITS[badge.type])
                : "-";
              return (
                <div
                  key={badge.type}
                  className={cn(
                    "flex min-w-0 flex-col items-center",
                    !badge.hasValue && "invisible"
                  )}
                >
                  {/* 数値（大きく強調。幅に収まらない場合は 1 行のまま自動縮小する） */}
                  {inlineEdit.editingField === badge.type ? (
                    <div className="flex w-full flex-1 items-end justify-center">
                      <InlineEditInput
                        value={badge.value}
                        maxLength={TEXT_LIMITS[badge.type]}
                        label={createInlineDosageInputLabel(
                          dosageLabels[badge.type]
                        )}
                        className={cn(valueClassName, "font-bold")}
                        style={valueStyle}
                        onCommit={(value) =>
                          inlineEdit.commit(badge.type, value)
                        }
                        onCancel={inlineEdit.cancel}
                      />
                    </div>
                  ) : (
                    <AutoFitText
                      text={displayValue}
                      containerClassName={cn(valueClassName, "flex-1 items-end")}
                      containerStyle={valueStyle}
                      textClassName={cn(
                        "font-bold text-dosage-value",
                        inlineEdit.canEdit && badge.hasValue && "cursor-text"
                      )}
                      {...(badge.hasValue
                        ? inlineEdit.triggerProps(badge.type)
                        : {})}
                    />
                  )}
                  {/* ラベル（下線付き。線の色は Canvas がテーマカラーから上書きする CSS 変数を参照する） */}
                  <AutoFitText
                    text={dosageLabels[badge.type]}
                    containerClassName={labelClassName}
                    containerStyle={labelStyle}
                    textClassName="text-dosage-label border-t pt-1 mt-1"
                    textStyle={DOSAGE_DIVIDER_STYLE}
                  />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
