"use client";

import {
  BUTTON_CANCEL,
  TEMPLATE_CARD_COUNT_LABEL,
  TEMPLATE_CONFIRM_BUTTON,
  TEMPLATE_CONFIRM_DESCRIPTION,
  TEMPLATE_CONFIRM_TITLE,
  TEMPLATE_LOADING_LABEL,
  TEMPLATE_MODAL_DESCRIPTION,
  TEMPLATE_MODAL_TITLE,
} from "@rehab-grid/core/lib/constants";
import { TEMPLATES } from "@rehab-grid/core/lib/templates";
import { cn } from "@rehab-grid/core/lib/utils";
import { type TemplateMetadata } from "@rehab-grid/core/types";
import { Button } from "@rehab-grid/ui/components/wrapped/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@rehab-grid/ui/components/wrapped/Dialog";
import { FileText, LayoutTemplate, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";

// ==============================================================================
// 型定義
// ==============================================================================

/**
 * TemplateSelectModalコンポーネントのProps
 */
export type TemplateSelectModalProps = {
  /** モーダルの開閉状態 */
  open: boolean;
  /** 開閉状態変更ハンドラ */
  onOpenChange: (open: boolean) => void;
  /** テンプレート選択時のハンドラ */
  onSelect: (templateId: string) => Promise<void>;
  /** 確認が必要か（既存データがある場合） */
  requireConfirmation: boolean;
};

// ==============================================================================
// サブコンポーネント: TemplateCard
// ==============================================================================

/**
 * TemplateCardコンポーネントのProps
 */
type TemplateCardProps = {
  /** テンプレートメタデータ */
  template: TemplateMetadata;
  /** 選択状態 */
  isSelected: boolean;
  /** クリックハンドラ */
  onClick: () => void;
  /** 無効状態 */
  disabled: boolean;
};

/**
 * テンプレートカードコンポーネント
 *
 * テンプレートの情報を表示するカード
 */
function TemplateCard({
  template,
  isSelected,
  onClick: handleClick,
  disabled,
}: TemplateCardProps) {
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl border-2 p-4 text-left transition-all",
        "hover:border-orange-400/50 hover:bg-orange-50/50 dark:hover:bg-orange-950/20",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2",
        isSelected
          ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30"
          : "border-border bg-card",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      {/* アイコンとカード枚数 */}
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-lg",
            "bg-linear-to-br from-orange-100 to-amber-100",
            "dark:from-orange-900/40 dark:to-amber-900/40",
          )}
        >
          <LayoutTemplate className="size-5 text-orange-600 dark:text-orange-400" />
        </div>
        <span
          className={cn(
            "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
            "bg-muted text-muted-foreground",
          )}
        >
          <FileText className="size-3" />
          {template.cardCount}
          {TEMPLATE_CARD_COUNT_LABEL}
        </span>
      </div>

      {/* タイトルと説明 */}
      <div className="space-y-1">
        <h3 className="font-semibold text-foreground">{template.name}</h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {template.description}
        </p>
      </div>

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
// サブコンポーネント: ConfirmationView
// ==============================================================================

/**
 * ConfirmationViewコンポーネントのProps
 */
type ConfirmationViewProps = {
  /** 選択されたテンプレート */
  selectedTemplate: TemplateMetadata;
  /** 確定ハンドラ */
  onConfirm: () => void;
  /** キャンセルハンドラ */
  onCancel: () => void;
  /** ローディング状態 */
  isLoading: boolean;
};

/**
 * 確認ビューコンポーネント
 *
 * テンプレート適用前の確認画面
 */
function ConfirmationView({
  selectedTemplate,
  onConfirm: handleConfirm,
  onCancel: handleCancel,
  isLoading,
}: ConfirmationViewProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/50 p-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-10 items-center justify-center rounded-lg",
              "bg-linear-to-br from-orange-100 to-amber-100",
              "dark:from-orange-900/40 dark:to-amber-900/40",
            )}
          >
            <LayoutTemplate className="size-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="font-semibold">{selectedTemplate.name}</p>
            <p className="text-sm text-muted-foreground">
              {selectedTemplate.cardCount}
              {TEMPLATE_CARD_COUNT_LABEL}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
          {BUTTON_CANCEL}
        </Button>
        <Button onClick={handleConfirm} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {TEMPLATE_LOADING_LABEL}
            </>
          ) : (
            TEMPLATE_CONFIRM_BUTTON
          )}
        </Button>
      </div>
    </div>
  );
}

// ==============================================================================
// メインコンポーネント: TemplateSelectModal
// ==============================================================================

/**
 * テンプレート選択モーダルコンポーネント
 *
 * テンプレート一覧を表示し、選択したテンプレートを適用する
 */
export function TemplateSelectModal({
  open,
  onOpenChange: handleOpenChange,
  onSelect: handleSelect,
  requireConfirmation,
}: TemplateSelectModalProps) {
  // 選択中のテンプレートID
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 確認画面表示状態
  const [showConfirmation, setShowConfirmation] = useState(false);

  // ローディング状態
  const [isLoading, setIsLoading] = useState(false);

  /**
   * 選択されたテンプレートのメタデータを取得
   */
  const selectedTemplate = TEMPLATES.find((t) => t.id === selectedId);

  /**
   * ダイアログの開閉状態変更ハンドラ
   */
  const handleDialogOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        // モーダルが閉じられたときに状態をリセット
        setSelectedId(null);
        setShowConfirmation(false);
        setIsLoading(false);
      }
      handleOpenChange(newOpen);
    },
    [handleOpenChange],
  );

  /**
   * テンプレートカードクリックハンドラ
   */
  const handleCardClick = useCallback(
    (templateId: string) => {
      setSelectedId(templateId);

      if (requireConfirmation) {
        // 確認が必要な場合は確認画面を表示
        setShowConfirmation(true);
      } else {
        // 確認不要な場合は直接適用
        setIsLoading(true);
        void handleSelect(templateId).finally(() => {
          handleDialogOpenChange(false);
        });
      }
    },
    [requireConfirmation, handleSelect, handleDialogOpenChange],
  );

  /**
   * 確認後の適用ハンドラ
   */
  const handleConfirmApply = useCallback(() => {
    if (selectedId === null) return;

    setIsLoading(true);
    void handleSelect(selectedId).finally(() => {
      handleDialogOpenChange(false);
    });
  }, [selectedId, handleSelect, handleDialogOpenChange]);

  /**
   * 確認キャンセルハンドラ
   */
  const handleCancelConfirmation = useCallback(() => {
    setShowConfirmation(false);
    setSelectedId(null);
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {showConfirmation ? TEMPLATE_CONFIRM_TITLE : TEMPLATE_MODAL_TITLE}
          </DialogTitle>
          <DialogDescription>
            {showConfirmation
              ? TEMPLATE_CONFIRM_DESCRIPTION
              : TEMPLATE_MODAL_DESCRIPTION}
          </DialogDescription>
        </DialogHeader>

        {showConfirmation && selectedTemplate ? (
          <ConfirmationView
            selectedTemplate={selectedTemplate}
            onConfirm={handleConfirmApply}
            onCancel={handleCancelConfirmation}
            isLoading={isLoading}
          />
        ) : (
          <div className="grid max-h-[calc(90vh-10rem)] gap-3 overflow-y-auto pr-1">
            {TEMPLATES.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={selectedId === template.id}
                onClick={() => handleCardClick(template.id)}
                disabled={isLoading}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
