"use client";

import {
  BUTTON_ADD_CARD,
  CANVAS_EMPTY_DESCRIPTION,
  CANVAS_EMPTY_TITLE,
} from "@rehab-grid/core/lib/constants";
import { Button } from "@rehab-grid/ui/components/wrapped/Button";
import { ImagePlus, LayoutGrid } from "lucide-react";
import { useCallback } from "react";

/**
 * EmptyState コンポーネントの Props
 */
export type EmptyStateProps = {
  /** カード追加ボタンが押されたときのコールバック */
  onAddCard?: () => void;
  /** カード追加が可能かどうか */
  canAddCard?: boolean;
};

/**
 * 空状態のプレースホルダー
 *
 * キャンバスにカードがない場合に表示するコンポーネント
 */
export function EmptyState({
  onAddCard,
  canAddCard = true,
}: EmptyStateProps) {
  const handleAddClick = useCallback(() => {
    onAddCard?.();
  }, [onAddCard]);

  return (
    <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-border/40 bg-card/30">
      <div className="rounded-full bg-muted/50 p-4">
        <LayoutGrid className="size-8 text-muted-foreground/50" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-medium text-muted-foreground">
          {CANVAS_EMPTY_TITLE}
        </h3>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground/60">
          {CANVAS_EMPTY_DESCRIPTION}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="mt-2 gap-2"
        onClick={handleAddClick}
        disabled={!canAddCard}
      >
        <ImagePlus className="size-4" />
        {BUTTON_ADD_CARD}
      </Button>
    </div>
  );
}
