"use client";

/**
 * グリッドレイアウト選択コンポーネント
 *
 * カードの表示列数（1列/2列/3列/4列）をカード形式のボタンで選ぶ。
 * デザイン設定ダイアログの「列数」セクションとして使う。
 */

import { LAYOUT_OPTIONS } from "@rehab-grid/core/lib/constants";
import { cn } from "@rehab-grid/core/lib/utils";
import { type LayoutType } from "@rehab-grid/core/types";

/**
 * GridLayoutSelector コンポーネントの Props
 */
type GridLayoutSelectorProps = {
  /** 現在のレイアウトタイプ */
  layoutType: LayoutType;
  /** レイアウト変更ハンドラ */
  onLayoutChange: (layout: LayoutType) => void;
};

/**
 * GridLayoutCard コンポーネントの Props
 */
type GridLayoutCardProps = {
  /** レイアウトオプション */
  option: (typeof LAYOUT_OPTIONS)[number];
  /** 選択状態 */
  isSelected: boolean;
  /** クリックハンドラ */
  onClick: () => void;
};

/**
 * 選択中カードの枠線色
 *
 * globals.css のレイヤー外の `* { border-color }` が Tailwind の `border-*` 色クラスに
 * 勝つため、インライン style で orange-500 を指定する
 */
const SELECTED_BORDER_STYLE: React.CSSProperties = {
  borderColor: "#f97316",
};

/**
 * グリッドレイアウトカードコンポーネント
 *
 * 各レイアウトオプションを視覚的に表示するカード
 */
function GridLayoutCard({
  option,
  isSelected,
  onClick: handleClick,
}: GridLayoutCardProps) {
  const Icon = option.icon;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isSelected}
      style={isSelected ? SELECTED_BORDER_STYLE : undefined}
      className={cn(
        "group relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all",
        "hover:border-orange-400/50 hover:bg-orange-50/50 dark:hover:bg-orange-950/20",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2",
        isSelected
          ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30"
          : "border-border bg-card"
      )}
    >
      {/* アイコン */}
      <div
        className={cn(
          "flex size-11 items-center justify-center rounded-xl transition-colors",
          isSelected
            ? "bg-linear-to-br from-orange-100 to-amber-100 dark:from-orange-900/40 dark:to-amber-900/40"
            : "bg-muted group-hover:bg-orange-100/50 dark:group-hover:bg-orange-900/20"
        )}
      >
        <Icon
          className={cn(
            "size-6 transition-colors",
            isSelected
              ? "text-orange-600 dark:text-orange-400"
              : "text-muted-foreground group-hover:text-orange-500"
          )}
        />
      </div>

      {/* ラベル */}
      <span
        className={cn(
          "text-sm font-semibold transition-colors",
          isSelected
            ? "text-orange-700 dark:text-orange-300"
            : "text-foreground"
        )}
      >
        {option.label}
      </span>

      {/* 選択インジケーター */}
      {isSelected ? (
        <div className="absolute right-2 top-2">
          <div className="size-2 rounded-full bg-orange-500" />
        </div>
      ) : null}
    </button>
  );
}

/**
 * グリッドレイアウト選択コンポーネント
 *
 * 選んだレイアウトは即座に反映する（閉じる操作は呼び出し側のダイアログが持つ）
 */
export function GridLayoutSelector({
  layoutType,
  onLayoutChange,
}: GridLayoutSelectorProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {LAYOUT_OPTIONS.map((option) => (
        <GridLayoutCard
          key={option.id}
          option={option}
          isSelected={layoutType === option.id}
          onClick={() => onLayoutChange(option.id)}
        />
      ))}
    </div>
  );
}
