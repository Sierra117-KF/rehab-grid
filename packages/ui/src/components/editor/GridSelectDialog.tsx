"use client";

/**
 * グリッド選択ダイアログコンポーネント
 *
 * カードの表示列数を選択するためのリッチなモーダルダイアログ。
 * TemplateSelectModalと同様のカード形式UIで、
 * 4つのレイアウトオプション（1列/2列/3列/4列）を提供する。
 */

import {
  GRID_SELECT_MODAL_DESCRIPTION,
  GRID_SELECT_MODAL_TITLE,
  LAYOUT_OPTIONS,
} from "@rehab-grid/core/lib/constants";
import { cn } from "@rehab-grid/core/lib/utils";
import { type LayoutType } from "@rehab-grid/core/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@rehab-grid/ui/components/wrapped/Dialog";
import { useCallback } from "react";

// ==============================================================================
// 型定義
// ==============================================================================

/**
 * GridSelectDialog コンポーネントの Props
 */
type GridSelectDialogProps = {
  /** モーダルの開閉状態 */
  open: boolean;
  /** 開閉状態変更ハンドラ */
  onOpenChange: (open: boolean) => void;
  /** 現在のレイアウトタイプ */
  layoutType: LayoutType;
  /** レイアウト変更ハンドラ */
  onLayoutChange: (layout: LayoutType) => void;
};

// ==============================================================================
// サブコンポーネント: GridLayoutCard
// ==============================================================================

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
      className={cn(
        "group relative flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all",
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
          "flex size-14 items-center justify-center rounded-xl transition-colors",
          isSelected
            ? "bg-linear-to-br from-orange-100 to-amber-100 dark:from-orange-900/40 dark:to-amber-900/40"
            : "bg-muted group-hover:bg-orange-100/50 dark:group-hover:bg-orange-900/20"
        )}
      >
        <Icon
          className={cn(
            "size-7 transition-colors",
            isSelected
              ? "text-orange-600 dark:text-orange-400"
              : "text-muted-foreground group-hover:text-orange-500"
          )}
        />
      </div>

      {/* ラベル */}
      <span
        className={cn(
          "text-base font-semibold transition-colors",
          isSelected
            ? "text-orange-700 dark:text-orange-300"
            : "text-foreground"
        )}
      >
        {option.label}
      </span>

      {/* 選択インジケーター */}
      {isSelected ? (
        <div className="absolute right-3 top-3">
          <div className="size-2.5 rounded-full bg-orange-500" />
        </div>
      ) : null}
    </button>
  );
}

// ==============================================================================
// メインコンポーネント: GridSelectDialog
// ==============================================================================

/**
 * グリッド選択ダイアログコンポーネント
 *
 * カード形式でレイアウトオプションを表示し、
 * 選択すると即座にレイアウトが適用されてモーダルが閉じる
 */
export function GridSelectDialog({
  open,
  onOpenChange: handleOpenChange,
  layoutType,
  onLayoutChange: handleLayoutChange,
}: GridSelectDialogProps) {
  /**
   * レイアウトカードクリック時の処理
   *
   * レイアウトを変更してモーダルを閉じる
   */
  const handleCardClick = useCallback(
    (layout: LayoutType) => {
      handleLayoutChange(layout);
      handleOpenChange(false);
    },
    [handleLayoutChange, handleOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{GRID_SELECT_MODAL_TITLE}</DialogTitle>
          <DialogDescription>{GRID_SELECT_MODAL_DESCRIPTION}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          {LAYOUT_OPTIONS.map((option) => (
            <GridLayoutCard
              key={option.id}
              option={option}
              isSelected={layoutType === option.id}
              onClick={() => handleCardClick(option.id)}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
