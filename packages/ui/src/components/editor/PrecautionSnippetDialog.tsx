"use client";

import {
  MAX_PRECAUTIONS_COUNT,
  PRECAUTION_SNIPPET_CATEGORIES,
  PRECAUTION_SNIPPETS,
  SNIPPET_ADD_BUTTON_LABEL,
  SNIPPET_DIALOG_DESCRIPTION,
  SNIPPET_DIALOG_TITLE,
  SNIPPET_MAX_EXCEEDED_MESSAGE,
} from "@rehab-grid/core/lib/constants";
import { cn } from "@rehab-grid/core/lib/utils";
import { Button } from "@rehab-grid/ui/components/wrapped/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@rehab-grid/ui/components/wrapped/Dialog";
import { Check, FileText } from "lucide-react";
import { useCallback, useState } from "react";

/**
 * 定型文選択ダイアログの Props
 */
export type PrecautionSnippetDialogProps = {
  /** ダイアログの開閉状態 */
  open: boolean;
  /** ダイアログの開閉状態変更時のコールバック */
  onOpenChange: (open: boolean) => void;
  /** 定型文が選択されたときのコールバック（選択された値の配列） */
  onSelect: (values: string[]) => void;
  /** 現在の注意点の件数 */
  currentCount: number;
};

/**
 * 定型文選択ダイアログ
 *
 * 注意点入力欄に挿入する定型文を選択するためのダイアログ。
 * カテゴリ別にグループ化された定型文をチェックボックスで複数選択可能。
 *
 * @param props - ダイアログの props
 */
export function PrecautionSnippetDialog({
  open,
  onOpenChange,
  onSelect,
  currentCount,
}: PrecautionSnippetDialogProps) {
  const [selectedValues, setSelectedValues] = useState<Set<string>>(new Set());

  // 追加可能な残り件数
  const remainingSlots = MAX_PRECAUTIONS_COUNT - currentCount;

  // 選択可能かどうか（残り件数を超えない範囲で）
  const canSelectMore = selectedValues.size < remainingSlots;

  /**
   * チェックボックスのトグル処理
   */
  const handleToggle = useCallback(
    (value: string) => {
      setSelectedValues((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(value)) {
          newSet.delete(value);
        } else if (canSelectMore || prev.has(value)) {
          newSet.add(value);
        }
        return newSet;
      });
    },
    [canSelectMore]
  );

  /**
   * 追加ボタンクリック時の処理
   */
  const handleAdd = useCallback(() => {
    if (selectedValues.size > 0) {
      onSelect(Array.from(selectedValues));
      setSelectedValues(new Set());
      onOpenChange(false);
    }
  }, [selectedValues, onSelect, onOpenChange]);

  /**
   * ダイアログを閉じる際に選択状態をリセット
   */
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setSelectedValues(new Set());
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden flex flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            {SNIPPET_DIALOG_TITLE}
          </DialogTitle>
          <DialogDescription>{SNIPPET_DIALOG_DESCRIPTION}</DialogDescription>
        </DialogHeader>

        {/* カテゴリ別定型文リスト */}
        <div className="flex-1 overflow-y-auto -mx-6 px-6 py-2 space-y-4">
          {PRECAUTION_SNIPPET_CATEGORIES.map((category, categoryIndex) => {
            const categorySnippets = PRECAUTION_SNIPPETS.filter(
              (s) => s.category === category.id
            );

            return (
              <div
                key={category.id}
                className="animate-fade-in"
                style={{ animationDelay: `${String(categoryIndex * 0.05)}s` }}
              >
                {/* カテゴリヘッダー */}
                <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                  {category.label}
                </h4>

                {/* 定型文リスト */}
                <div className="space-y-1">
                  {categorySnippets.map((snippet, snippetIndex) => {
                    const isSelected = selectedValues.has(snippet.value);
                    const isDisabled = !isSelected && !canSelectMore;

                    return (
                      <button
                        key={snippet.value}
                        type="button"
                        onClick={() => handleToggle(snippet.value)}
                        disabled={isDisabled}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200",
                          "border border-transparent",
                          isSelected
                            ? "bg-primary/10 border-primary/30 text-primary"
                            : "hover:bg-muted/50",
                          isDisabled && "opacity-40 cursor-not-allowed"
                        )}
                        style={{
                          animationDelay: `${String((categoryIndex * 0.05) + (snippetIndex * 0.02))}s`,
                        }}
                      >
                        {/* チェックボックス */}
                        <div
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded border-2 transition-all duration-200",
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground/30"
                          )}
                        >
                          {isSelected ? <Check className="size-3.5" /> : null}
                        </div>

                        {/* 定型文テキスト */}
                        <span className="text-sm">{snippet.value}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* フッター */}
        <DialogFooter className="flex-col sm:flex-col gap-2 border-t pt-4">
          {/* 残り件数表示 */}
          <div className="w-full text-center">
            {remainingSlots <= 0 ? (
              <p className="text-xs text-destructive font-medium">
                {SNIPPET_MAX_EXCEEDED_MESSAGE}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                選択中: {String(selectedValues.size)} 件 / 追加可能: {String(remainingSlots)} 件
              </p>
            )}
          </div>

          {/* ボタン */}
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="flex-1"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleAdd}
              disabled={selectedValues.size === 0}
              className="flex-1"
            >
              {SNIPPET_ADD_BUTTON_LABEL}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
