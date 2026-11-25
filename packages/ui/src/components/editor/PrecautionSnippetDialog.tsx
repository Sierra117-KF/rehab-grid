"use client";

import {
  CUSTOM_SNIPPET_ADD_LABEL,
  CUSTOM_SNIPPET_DELETE_LABEL,
  CUSTOM_SNIPPET_DUPLICATE_MESSAGE,
  CUSTOM_SNIPPET_EMPTY_MESSAGE,
  CUSTOM_SNIPPET_INPUT_LABEL,
  CUSTOM_SNIPPET_INPUT_PLACEHOLDER,
  LIBRARY_SAVE_FAILED_MESSAGE,
  MAX_PRECAUTIONS_COUNT,
  PRECAUTION_SNIPPET_CATEGORIES,
  PRECAUTION_SNIPPETS,
  SNIPPET_ADD_BUTTON_LABEL,
  SNIPPET_DIALOG_DESCRIPTION,
  SNIPPET_DIALOG_TITLE,
  SNIPPET_MAX_EXCEEDED_MESSAGE,
  TEXT_LIMITS,
} from "@rehab-grid/core/lib/constants";
import {
  addCustomSnippet,
  deleteCustomSnippet,
  listCustomSnippets,
} from "@rehab-grid/core/lib/db";
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
import { Input } from "@rehab-grid/ui/components/wrapped/Input";
import { useLiveQuery } from "dexie-react-hooks";
import { Check, FileText, Plus, X } from "lucide-react";
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
 * 表示する定型文 1 件
 */
type SnippetOption = {
  /** 定型文の内容（React の key と選択状態のキーを兼ねるため、重複させない） */
  value: string;
  /** マイ定型文のID（組み込みの定型文は undefined。削除できない） */
  customId?: string;
};

/**
 * SnippetToggle の Props
 */
type SnippetToggleProps = {
  /** 定型文 */
  snippet: SnippetOption;
  /** 選択中か */
  isSelected: boolean;
  /** 選択できないか（残り件数に達している） */
  isDisabled: boolean;
  /** 選択の切り替え */
  onToggle: () => void;
  /** 削除（マイ定型文のみ） */
  onDelete?: () => void;
};

/**
 * 定型文 1 件の選択ボタン（マイ定型文は削除ボタン付き）
 */
function SnippetToggle({
  snippet,
  isSelected,
  isDisabled,
  onToggle,
  onDelete,
}: SnippetToggleProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onToggle}
        disabled={isDisabled}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-200",
          "border border-transparent",
          isSelected
            ? "bg-primary/10 border-primary/30 text-primary"
            : "hover:bg-muted/50",
          isDisabled && "opacity-40 cursor-not-allowed"
        )}
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
        <span className="text-sm wrap-anywhere">{snippet.value}</span>
      </button>
      {onDelete ? (
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          aria-label={`${CUSTOM_SNIPPET_DELETE_LABEL}: ${snippet.value}`}
          title={CUSTOM_SNIPPET_DELETE_LABEL}
        >
          <X className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}

/**
 * 定型文選択ダイアログ
 *
 * 注意点入力欄に挿入する定型文を選択するためのダイアログ。
 * カテゴリ別にグループ化された定型文をチェックボックスで複数選択可能。
 * 先頭の「マイ定型文」では、ユーザーが登録した定型文の追加・削除もできる（組み込みの定型文は削除できない）。
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
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  // マイ定型文の保存中か（連続で Enter を押したときの二重登録を防ぐ）
  const [isAddingSnippet, setIsAddingSnippet] = useState(false);

  // マイ定型文（IndexedDB。登録・削除するとリアクティブに更新される）
  const customSnippets = useLiveQuery(listCustomSnippets, []);

  // 追加可能な残り件数
  const remainingSlots = MAX_PRECAUTIONS_COUNT - currentCount;

  // 選択可能かどうか（残り件数を超えない範囲で）
  const canSelectMore = selectedValues.size < remainingSlots;

  /**
   * カテゴリに属する定型文
   */
  const getCategorySnippets = (categoryId: string): SnippetOption[] =>
    categoryId === "custom"
      ? (customSnippets ?? []).map((snippet) => ({
          value: snippet.value,
          customId: snippet.id,
        }))
      : PRECAUTION_SNIPPETS.filter((s) => s.category === categoryId);

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
   * マイ定型文を登録する
   *
   * @remarks
   * 定型文の内容は React の key と選択状態のキーを兼ねるため、
   * 組み込み・登録済みと同じ文言は登録しない
   */
  const handleAddCustomSnippet = async () => {
    const value = draft.trim();
    if (value === "" || isAddingSnippet) return;

    const exists =
      PRECAUTION_SNIPPETS.some((snippet) => snippet.value === value) ||
      (customSnippets ?? []).some((snippet) => snippet.value === value);
    if (exists) {
      setDraftError(CUSTOM_SNIPPET_DUPLICATE_MESSAGE);
      return;
    }

    // 保存の完了を待つ間に続けて入力した文字が、登録した文言の後ろにつながらないよう先に空にする
    setIsAddingSnippet(true);
    setDraft("");
    setDraftError(null);
    try {
      await addCustomSnippet(value);
    } catch {
      setDraft(value);
      setDraftError(LIBRARY_SAVE_FAILED_MESSAGE);
    } finally {
      setIsAddingSnippet(false);
    }
  };

  /**
   * マイ定型文を削除する（選択していれば選択も外す）
   */
  const handleDeleteCustomSnippet = async (snippet: SnippetOption) => {
    if (snippet.customId === undefined) return;
    await deleteCustomSnippet(snippet.customId);
    setSelectedValues((prev) => {
      if (!prev.has(snippet.value)) return prev;
      const next = new Set(prev);
      next.delete(snippet.value);
      return next;
    });
  };

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
   * ダイアログを閉じる際に選択状態と入力欄をリセット
   */
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setSelectedValues(new Set());
        setDraft("");
        setDraftError(null);
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
            const categorySnippets = getCategorySnippets(category.id);
            const isCustom = category.id === "custom";

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
                  {categorySnippets.map((snippet) => {
                    const isSelected = selectedValues.has(snippet.value);
                    return (
                      <SnippetToggle
                        key={snippet.value}
                        snippet={snippet}
                        isSelected={isSelected}
                        isDisabled={!isSelected && !canSelectMore}
                        onToggle={() => handleToggle(snippet.value)}
                        onDelete={
                          isCustom
                            ? () => void handleDeleteCustomSnippet(snippet)
                            : undefined
                        }
                      />
                    );
                  })}
                </div>

                {/* マイ定型文の登録欄 */}
                {isCustom ? (
                  <div className="mt-2 space-y-1">
                    {categorySnippets.length === 0 ? (
                      <p className="px-1 text-xs text-muted-foreground">
                        {CUSTOM_SNIPPET_EMPTY_MESSAGE}
                      </p>
                    ) : null}
                    <div className="flex gap-2">
                      <Input
                        value={draft}
                        onChange={(e) => {
                          setDraft(e.target.value);
                          setDraftError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            void handleAddCustomSnippet();
                          }
                        }}
                        placeholder={CUSTOM_SNIPPET_INPUT_PLACEHOLDER}
                        aria-label={CUSTOM_SNIPPET_INPUT_LABEL}
                        aria-invalid={draftError !== null}
                        maxLength={TEXT_LIMITS.precaution}
                        className="h-8 flex-1 text-xs"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 shrink-0 gap-1 bg-white"
                        onClick={() => void handleAddCustomSnippet()}
                        disabled={draft.trim() === "" || isAddingSnippet}
                      >
                        <Plus className="size-3.5" />
                        {CUSTOM_SNIPPET_ADD_LABEL}
                      </Button>
                    </div>
                    {draftError !== null ? (
                      <p className="px-1 text-xs text-destructive" role="alert">
                        {draftError}
                      </p>
                    ) : null}
                  </div>
                ) : null}
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
