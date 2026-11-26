"use client";

import {
  BACKUP_CATEGORY_CUSTOM_SNIPPETS_LABEL,
  BACKUP_CATEGORY_EXERCISE_CARDS_LABEL,
  BACKUP_CATEGORY_PROJECTS_LABEL,
  BACKUP_CATEGORY_TEMPLATES_LABEL,
  BACKUP_CATEGORY_UNUSED_IMAGES_LABEL,
  BACKUP_EXPORT_BUTTON_LABEL,
  BACKUP_EXPORT_DIALOG_DESCRIPTION,
  BACKUP_EXPORT_DIALOG_TITLE,
  BACKUP_EXPORT_EMPTY_MESSAGE,
  BACKUP_EXPORT_LOADING_LABEL,
  BACKUP_EXPORT_PRIVACY_NOTE,
  BACKUP_EXPORT_SELECT_REQUIRED,
  BACKUP_INCLUDED_IMAGES_NOTE,
  BUTTON_CANCEL,
  createBackupRecordLimitExceededMessage,
  MAX_BACKUP_RECORD_COUNT,
} from "@rehab-grid/core/lib/constants";
import { cn } from "@rehab-grid/core/lib/utils";
import {
  type BackupCategorySelection,
  type BackupSummaryCounts,
} from "@rehab-grid/core/types";
import {
  createInitialBackupSelection,
  hasAnySelectedBackupCategory,
} from "@rehab-grid/core/utils/backup";
import { Checkbox } from "@rehab-grid/ui/components/ui/checkbox";
import { Button } from "@rehab-grid/ui/components/wrapped/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@rehab-grid/ui/components/wrapped/Dialog";
import { AlertTriangle, Info, Loader2, ShieldAlert } from "lucide-react";
import { useState } from "react";

/**
 * BackupExportDialog の Props
 */
export type BackupExportDialogProps = {
  /** ダイアログの開閉状態 */
  open: boolean;
  /** 開閉状態変更ハンドラ */
  onOpenChange: (open: boolean) => void;
  /** 現在の端末データ件数（ダイアログを開く直前に取得） */
  counts: BackupSummaryCounts | null;
  /** バックアップ実行ハンドラ */
  onExport: (selection: BackupCategorySelection) => Promise<void>;
};

/** カテゴリ行の定義 */
type CategoryRowItem = {
  key: keyof BackupCategorySelection;
  label: string;
  count: number;
  unit: "件" | "枚";
  /** レコード件数上限チェックの対象か */
  hasRecordLimit: boolean;
};

/**
 * バックアップ対象の選択フォーム（counts 確定時にマウントして初期選択状態をリセットする）
 */
function BackupExportDialogBody({
  counts,
  isExporting,
  onCancel,
  onExport,
}: {
  counts: BackupSummaryCounts;
  isExporting: boolean;
  onCancel: () => void;
  onExport: (selection: BackupCategorySelection) => Promise<void>;
}) {
  const [selection, setSelection] = useState<BackupCategorySelection>(() =>
    createInitialBackupSelection(counts)
  );

  const rows: CategoryRowItem[] = [
    {
      key: "projects",
      label: BACKUP_CATEGORY_PROJECTS_LABEL,
      count: counts.projects,
      unit: "件",
      hasRecordLimit: true,
    },
    {
      key: "userTemplates",
      label: BACKUP_CATEGORY_TEMPLATES_LABEL,
      count: counts.userTemplates,
      unit: "件",
      hasRecordLimit: true,
    },
    {
      key: "exerciseCards",
      label: BACKUP_CATEGORY_EXERCISE_CARDS_LABEL,
      count: counts.exerciseCards,
      unit: "件",
      hasRecordLimit: true,
    },
    {
      key: "customSnippets",
      label: BACKUP_CATEGORY_CUSTOM_SNIPPETS_LABEL,
      count: counts.customSnippets,
      unit: "件",
      hasRecordLimit: true,
    },
    {
      key: "unusedImages",
      label: BACKUP_CATEGORY_UNUSED_IMAGES_LABEL,
      count: counts.unusedImages,
      unit: "枚",
      hasRecordLimit: false,
    },
  ];

  const hasAnyData = rows.some((row) => row.count > 0);
  const hasSelection = hasAnySelectedBackupCategory(selection);

  // 選択中のカテゴリで上限件数を超えているものを検出
  const exceededRow = rows.find(
    (row) =>
      row.hasRecordLimit &&
      selection[row.key] &&
      row.count > MAX_BACKUP_RECORD_COUNT
  );

  const toggleCategory = (
    key: keyof BackupCategorySelection,
    checked: boolean
  ) => {
    setSelection((prev) => ({ ...prev, [key]: checked }));
  };

  const handleSubmit = async () => {
    if (!hasSelection || exceededRow !== undefined || isExporting) return;
    await onExport(selection);
  };

  return (
    <>
      {hasAnyData ? (
        <div className="space-y-4">
          <div className="space-y-2">
            {rows.map((row) => {
              const disabled = row.count === 0 || isExporting;
              const checkboxId = `backup-export-${row.key}`;
              return (
                <label
                  key={row.key}
                  htmlFor={checkboxId}
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors",
                    disabled
                      ? "cursor-not-allowed border-border/60 bg-muted/40 text-muted-foreground"
                      : "cursor-pointer border-border bg-card hover:bg-accent/40"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Checkbox
                      id={checkboxId}
                      checked={selection[row.key]}
                      disabled={disabled}
                      onCheckedChange={(checked) => {
                        toggleCategory(row.key, checked === true);
                      }}
                    />
                    <span className="font-medium">{row.label}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {row.count}
                    {row.unit}
                  </span>
                </label>
              );
            })}
          </div>

          <p className="flex items-start gap-2 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            <span>{BACKUP_INCLUDED_IMAGES_NOTE}</span>
          </p>

          <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
            <span>{BACKUP_EXPORT_PRIVACY_NOTE}</span>
          </p>

          {exceededRow !== undefined ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                {createBackupRecordLimitExceededMessage(
                  exceededRow.label,
                  exceededRow.count,
                  MAX_BACKUP_RECORD_COUNT
                )}
              </span>
            </div>
          ) : null}

          {!hasSelection ? (
            <p className="text-xs text-destructive">
              {BACKUP_EXPORT_SELECT_REQUIRED}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {BACKUP_EXPORT_EMPTY_MESSAGE}
        </p>
      )}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isExporting}
        >
          {BUTTON_CANCEL}
        </Button>
        <Button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={
            !hasAnyData ||
            !hasSelection ||
            exceededRow !== undefined ||
            isExporting
          }
          className="gap-2"
        >
          {isExporting ? <Loader2 className="size-4 animate-spin" /> : null}
          {isExporting
            ? BACKUP_EXPORT_LOADING_LABEL
            : BACKUP_EXPORT_BUTTON_LABEL}
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * まとめてバックアップ（一括エクスポート）ダイアログ
 *
 * マイ指導箋・マイテンプレート・マイ運動・マイ定型文・未使用の取り込み画像から
 * バックアップ対象を選択して ZIP ファイルをダウンロードする。
 * 作成中は ESC・外側クリック・閉じるボタンで閉じられないように制御する。
 */
export function BackupExportDialog({
  open,
  onOpenChange: handleOpenChange,
  counts,
  onExport,
}: BackupExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (isExporting) return;
    handleOpenChange(nextOpen);
  };

  const handleExport = async (selection: BackupCategorySelection) => {
    setIsExporting(true);
    try {
      await onExport(selection);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        preventDismiss={isExporting}
        showCloseButton={!isExporting}
      >
        <DialogHeader>
          <DialogTitle>{BACKUP_EXPORT_DIALOG_TITLE}</DialogTitle>
          <DialogDescription>
            {BACKUP_EXPORT_DIALOG_DESCRIPTION}
          </DialogDescription>
        </DialogHeader>

        {open && counts !== null ? (
          <BackupExportDialogBody
            counts={counts}
            isExporting={isExporting}
            onCancel={() => handleDialogOpenChange(false)}
            onExport={handleExport}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
