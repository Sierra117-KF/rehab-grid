"use client";

import {
  BUTTON_CANCEL,
  BUTTON_DELETE,
  createUserTemplateDeleteConfirmDescription,
  OPEN_AS_NEW_PROJECT_LABEL,
  OVERWRITE_CURRENT_PROJECT_LABEL,
  TEMPLATE_CARD_COUNT_LABEL,
  TEMPLATE_CONFIRM_DESCRIPTION,
  TEMPLATE_CONFIRM_TITLE,
  TEMPLATE_LOADING_LABEL,
  TEMPLATE_MODAL_DESCRIPTION,
  TEMPLATE_MODAL_TITLE,
  TEMPLATE_TAB_OFFICIAL_LABEL,
  TEMPLATE_TAB_USER_LABEL,
  TEXT_LIMITS,
  UNKNOWN_ERROR_MESSAGE,
  USER_TEMPLATE_DELETE_CONFIRM_TITLE,
  USER_TEMPLATE_DELETE_LABEL,
  USER_TEMPLATE_DELETE_SUCCESS_MESSAGE,
  USER_TEMPLATE_EMPTY_MESSAGE,
  USER_TEMPLATE_NAME_LABEL,
  USER_TEMPLATE_SAVE_EMPTY_HINT,
  USER_TEMPLATE_SAVE_HEADING,
  USER_TEMPLATE_SAVE_LABEL,
} from "@rehab-grid/core/lib/constants";
import { deleteUserTemplate, listUserTemplates } from "@rehab-grid/core/lib/db";
import { TEMPLATES } from "@rehab-grid/core/lib/templates";
import { cn } from "@rehab-grid/core/lib/utils";
import {
  type ImportOpenMode,
  type TemplateMetadata,
  type TemplateSource,
  type UserTemplateRecord,
} from "@rehab-grid/core/types";
import { formatJapaneseDate } from "@rehab-grid/core/utils/date";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@rehab-grid/ui/components/wrapped/AlertDialog";
import { Button } from "@rehab-grid/ui/components/wrapped/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@rehab-grid/ui/components/wrapped/Dialog";
import { Input } from "@rehab-grid/ui/components/wrapped/Input";
import { useLiveQuery } from "dexie-react-hooks";
import {
  BookmarkPlus,
  FileText,
  LayoutTemplate,
  Loader2,
  Trash2,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

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
  /**
   * テンプレート選択時のハンドラ
   *
   * @remarks
   * 確認が不要な場合（編集中の指導箋が空）は mode に "overwrite" を渡す
   */
  onSelect: (
    templateId: string,
    mode: ImportOpenMode,
    source: TemplateSource
  ) => Promise<void>;
  /** 確認が必要か（既存データがある場合。新しい指導箋として開くか上書きするかを選ばせる） */
  requireConfirmation: boolean;
  /** マイテンプレート名の初期値（編集中の指導箋のタイトル） */
  currentTitle: string;
  /** 編集中の指導箋をマイテンプレートとして保存できるか（カードがあるとき） */
  canSaveCurrent: boolean;
  /** 編集中の指導箋をマイテンプレートとして保存する（完了・失敗の通知は呼び出し側で行う） */
  onSaveCurrent: (name: string) => Promise<void>;
};

/**
 * 選択中のテンプレート（確認画面に出す情報）
 */
type SelectedTemplate = {
  /** テンプレートID */
  id: string;
  /** 出どころ */
  source: TemplateSource;
  /** 表示名 */
  name: string;
  /** カード枚数 */
  cardCount: number;
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
 * テンプレートのアイコン
 */
function TemplateIcon() {
  return (
    <div
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-lg",
        "bg-linear-to-br from-orange-100 to-amber-100",
        "dark:from-orange-900/40 dark:to-amber-900/40",
      )}
    >
      <LayoutTemplate className="size-5 text-orange-600 dark:text-orange-400" />
    </div>
  );
}

/**
 * カード枚数のバッジ
 */
function CardCountBadge({ count }: { count: number }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        "bg-muted text-muted-foreground",
      )}
    >
      <FileText className="size-3" />
      {count}
      {TEMPLATE_CARD_COUNT_LABEL}
    </span>
  );
}

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
        <TemplateIcon />
        <CardCountBadge count={template.cardCount} />
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
// サブコンポーネント: UserTemplatePanel（マイテンプレートのタブ）
// ==============================================================================

/**
 * UserTemplatePanel の Props
 */
type UserTemplatePanelProps = {
  /** 保存済みのマイテンプレート（読み込み中は undefined） */
  templates: UserTemplateRecord[] | undefined;
  /** 選択中のテンプレートID */
  selectedId: string | null;
  /** 適用中か（適用中は操作を無効にする） */
  disabled: boolean;
  /** テンプレート名の入力値 */
  nameValue: string;
  /** テンプレート名の変更 */
  onNameChange: (value: string) => void;
  /** 編集中の指導箋を保存できるか */
  canSaveCurrent: boolean;
  /** 保存中か */
  isSaving: boolean;
  /** 保存する */
  onSave: () => void;
  /** テンプレートを選ぶ */
  onSelect: (template: UserTemplateRecord) => void;
  /** テンプレートを削除する（確認ダイアログを開く） */
  onDelete: (template: UserTemplateRecord) => void;
};

/**
 * マイテンプレートのタブの中身（保存欄と一覧）
 */
function UserTemplatePanel({
  templates,
  selectedId,
  disabled,
  nameValue,
  onNameChange,
  canSaveCurrent,
  isSaving,
  onSave,
  onSelect,
  onDelete,
}: UserTemplatePanelProps) {
  return (
    <div className="space-y-3">
      {/* 編集中の指導箋を保存 */}
      <div className="space-y-2 rounded-lg border border-dashed border-orange-300 bg-orange-50/40 p-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <BookmarkPlus className="size-4 text-orange-600" />
          {USER_TEMPLATE_SAVE_HEADING}
        </p>
        <div className="flex gap-2">
          <Input
            value={nameValue}
            onChange={(e) => {
              onNameChange(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                onSave();
              }
            }}
            aria-label={USER_TEMPLATE_NAME_LABEL}
            placeholder={USER_TEMPLATE_NAME_LABEL}
            maxLength={TEXT_LIMITS.projectTitle}
            disabled={!canSaveCurrent || isSaving}
            className="flex-1 bg-white"
          />
          <Button
            onClick={onSave}
            disabled={!canSaveCurrent || isSaving}
            className="shrink-0"
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
            {USER_TEMPLATE_SAVE_LABEL}
          </Button>
        </div>
        {canSaveCurrent ? null : (
          <p className="text-xs text-muted-foreground">
            {USER_TEMPLATE_SAVE_EMPTY_HINT}
          </p>
        )}
      </div>

      {/* 一覧 */}
      {templates?.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {USER_TEMPLATE_EMPTY_MESSAGE}
        </p>
      ) : (
        <ul className="space-y-2">
          {(templates ?? []).map((template) => (
            <li
              key={template.id}
              className={cn(
                "flex items-center gap-2 rounded-xl border-2 p-2 transition-colors",
                selectedId === template.id
                  ? "border-orange-500 bg-orange-50"
                  : "border-border bg-card hover:border-orange-400/50 hover:bg-orange-50/50",
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(template)}
                disabled={disabled}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 text-left",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                <TemplateIcon />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-foreground">
                    {template.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {formatJapaneseDate(template.updatedAt)}
                  </span>
                </span>
                <CardCountBadge count={template.data.items.length} />
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(template)}
                disabled={disabled}
                title={USER_TEMPLATE_DELETE_LABEL}
                aria-label={`${template.name}を${USER_TEMPLATE_DELETE_LABEL}`}
              >
                <Trash2 className="size-4 text-rose-500" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
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
  selectedTemplate: SelectedTemplate;
  /** 確定ハンドラ（開き方を渡す） */
  onConfirm: (mode: ImportOpenMode) => void;
  /** キャンセルハンドラ */
  onCancel: () => void;
  /** 適用中の開き方（適用中でなければ null） */
  loadingMode: ImportOpenMode | null;
};

/**
 * 適用ボタンの中身（適用中はスピナーを出す）
 */
function ApplyButtonContent({
  label,
  isLoading,
}: {
  label: string;
  isLoading: boolean;
}) {
  if (!isLoading) return label;
  return (
    <>
      <Loader2 className="mr-2 size-4 animate-spin" />
      {TEMPLATE_LOADING_LABEL}
    </>
  );
}

/**
 * 確認ビューコンポーネント
 *
 * テンプレート適用前の確認画面
 */
function ConfirmationView({
  selectedTemplate,
  onConfirm: handleConfirm,
  onCancel: handleCancel,
  loadingMode,
}: ConfirmationViewProps) {
  const isLoading = loadingMode !== null;
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/50 p-4">
        <div className="flex items-center gap-3">
          <TemplateIcon />
          <div>
            <p className="font-semibold">{selectedTemplate.name}</p>
            <p className="text-sm text-muted-foreground">
              {selectedTemplate.cardCount}
              {TEMPLATE_CARD_COUNT_LABEL}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
          {BUTTON_CANCEL}
        </Button>
        <Button
          variant="outline"
          onClick={() => handleConfirm("overwrite")}
          disabled={isLoading}
        >
          <ApplyButtonContent
            label={OVERWRITE_CURRENT_PROJECT_LABEL}
            isLoading={loadingMode === "overwrite"}
          />
        </Button>
        <Button onClick={() => handleConfirm("new")} disabled={isLoading}>
          <ApplyButtonContent
            label={OPEN_AS_NEW_PROJECT_LABEL}
            isLoading={loadingMode === "new"}
          />
        </Button>
      </div>
    </div>
  );
}

// ==============================================================================
// メインコンポーネント: TemplateSelectModal
// ==============================================================================

/** タブの一覧 */
const TABS: readonly { source: TemplateSource; label: string }[] = [
  { source: "official", label: TEMPLATE_TAB_OFFICIAL_LABEL },
  { source: "user", label: TEMPLATE_TAB_USER_LABEL },
];

/**
 * テンプレート選択モーダルコンポーネント
 *
 * 公式テンプレートとマイテンプレートをタブで切り替えて一覧表示し、選択したテンプレートを適用する。
 * マイテンプレートのタブでは、編集中の指導箋をマイテンプレートとして保存・削除できる。
 */
export function TemplateSelectModal({
  open,
  onOpenChange: handleOpenChange,
  onSelect: handleSelect,
  requireConfirmation,
  currentTitle,
  canSaveCurrent,
  onSaveCurrent,
}: TemplateSelectModalProps) {
  // 表示中のタブ
  const [activeTab, setActiveTab] = useState<TemplateSource>("official");

  // 選択中のテンプレート
  const [selected, setSelected] = useState<SelectedTemplate | null>(null);

  // 確認画面表示状態
  const [showConfirmation, setShowConfirmation] = useState(false);

  // 適用中の開き方（適用中でなければ null）
  const [loadingMode, setLoadingMode] = useState<ImportOpenMode | null>(null);
  const isLoading = loadingMode !== null;

  // マイテンプレート名の入力値（未入力なら編集中の指導箋のタイトルを使う）
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const nameValue = nameDraft ?? currentTitle;
  const [isSaving, setIsSaving] = useState(false);

  // 削除確認中のマイテンプレート
  const [deleteTarget, setDeleteTarget] = useState<UserTemplateRecord | null>(
    null,
  );

  // 保存済みのマイテンプレート（保存・削除するとリアクティブに更新される）
  const userTemplates = useLiveQuery(listUserTemplates, []);

  /**
   * ダイアログの開閉状態変更ハンドラ
   */
  const handleDialogOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        // モーダルが閉じられたときに状態をリセット（タブは次回も同じものを開く）
        setSelected(null);
        setShowConfirmation(false);
        setLoadingMode(null);
        setNameDraft(null);
      }
      handleOpenChange(newOpen);
    },
    [handleOpenChange],
  );

  /**
   * テンプレートを選んだとき
   */
  const handleTemplateClick = useCallback(
    (template: SelectedTemplate) => {
      setSelected(template);

      if (requireConfirmation) {
        // 確認が必要な場合は確認画面を表示
        setShowConfirmation(true);
      } else {
        // 確認不要な場合（編集中の指導箋が空）は、そのまま現在の指導箋へ適用
        setLoadingMode("overwrite");
        void handleSelect(template.id, "overwrite", template.source).finally(
          () => {
            handleDialogOpenChange(false);
          },
        );
      }
    },
    [requireConfirmation, handleSelect, handleDialogOpenChange],
  );

  /**
   * 確認後の適用ハンドラ
   */
  const handleConfirmApply = useCallback(
    (mode: ImportOpenMode) => {
      if (selected === null) return;

      setLoadingMode(mode);
      void handleSelect(selected.id, mode, selected.source).finally(() => {
        handleDialogOpenChange(false);
      });
    },
    [selected, handleSelect, handleDialogOpenChange],
  );

  /**
   * 確認キャンセルハンドラ
   */
  const handleCancelConfirmation = useCallback(() => {
    setShowConfirmation(false);
    setSelected(null);
  }, []);

  /**
   * 編集中の指導箋をマイテンプレートとして保存する
   */
  const handleSaveCurrent = async () => {
    if (!canSaveCurrent || isSaving) return;
    setIsSaving(true);
    try {
      await onSaveCurrent(nameValue);
      setNameDraft(null);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * マイテンプレートの削除を確定する
   */
  const handleConfirmDelete = async () => {
    if (deleteTarget === null) return;
    try {
      await deleteUserTemplate(deleteTarget.id);
      toast.success(USER_TEMPLATE_DELETE_SUCCESS_MESSAGE);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE);
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col">
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

          {showConfirmation && selected ? (
            <ConfirmationView
              selectedTemplate={selected}
              onConfirm={handleConfirmApply}
              onCancel={handleCancelConfirmation}
              loadingMode={loadingMode}
            />
          ) : (
            <>
              {/* タブ */}
              <div
                role="tablist"
                aria-label={TEMPLATE_MODAL_TITLE}
                className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
              >
                {TABS.map((tab) => (
                  <button
                    key={tab.source}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.source}
                    onClick={() => {
                      setActiveTab(tab.source);
                    }}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500",
                      activeTab === tab.source
                        ? "bg-white text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto pr-1">
                {activeTab === "official" ? (
                  <div className="grid gap-3">
                    {TEMPLATES.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        isSelected={selected?.id === template.id}
                        onClick={() =>
                          handleTemplateClick({
                            id: template.id,
                            source: "official",
                            name: template.name,
                            cardCount: template.cardCount,
                          })
                        }
                        disabled={isLoading}
                      />
                    ))}
                  </div>
                ) : (
                  <UserTemplatePanel
                    templates={userTemplates}
                    selectedId={selected?.id ?? null}
                    disabled={isLoading}
                    nameValue={nameValue}
                    onNameChange={setNameDraft}
                    canSaveCurrent={canSaveCurrent}
                    isSaving={isSaving}
                    onSave={() => void handleSaveCurrent()}
                    onSelect={(template) =>
                      handleTemplateClick({
                        id: template.id,
                        source: "user",
                        name: template.name,
                        cardCount: template.data.items.length,
                      })
                    }
                    onDelete={setDeleteTarget}
                  />
                )}
              </div>
            </>
          )}

          {/* マイテンプレートの削除確認ダイアログ（React ツリー上でモーダルの中に置き、
              確認ダイアログ内のクリックをモーダルの「外側のクリック」とみなして閉じないようにする） */}
          <AlertDialog
            open={deleteTarget !== null}
            onOpenChange={(nextOpen) => {
              if (!nextOpen) setDeleteTarget(null);
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {USER_TEMPLATE_DELETE_CONFIRM_TITLE}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {createUserTemplateDeleteConfirmDescription(
                    deleteTarget?.name ?? "",
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{BUTTON_CANCEL}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => void handleConfirmDelete()}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  {BUTTON_DELETE}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DialogContent>
      </Dialog>
  );
}
