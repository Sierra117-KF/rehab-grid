"use client";

import {
  BACKUP_CATEGORY_CUSTOM_SNIPPETS_LABEL,
  BACKUP_CATEGORY_EXERCISE_CARDS_LABEL,
  BACKUP_CATEGORY_PROJECTS_LABEL,
  BACKUP_CATEGORY_TEMPLATES_LABEL,
  BACKUP_CATEGORY_UNUSED_IMAGES_LABEL,
  BACKUP_INCLUDED_IMAGES_NOTE,
  BACKUP_RESTORE_BUTTON_LABEL,
  BACKUP_RESTORE_CATEGORIES_HEADING,
  BACKUP_RESTORE_DIALOG_DESCRIPTION,
  BACKUP_RESTORE_DIALOG_TITLE,
  BACKUP_RESTORE_EMPTY_BACKUP_MESSAGE,
  BACKUP_RESTORE_LOADING_LABEL,
  BACKUP_RESTORE_MODE_HEADING,
  BACKUP_RESTORE_MODE_MERGE_DESCRIPTION,
  BACKUP_RESTORE_MODE_MERGE_LABEL,
  BACKUP_RESTORE_MODE_REPLACE_DESCRIPTION,
  BACKUP_RESTORE_MODE_REPLACE_LABEL,
  BACKUP_RESTORE_REPLACE_BUTTON_LABEL,
  BACKUP_RESTORE_SELECT_REQUIRED,
  BUTTON_CANCEL,
  createBackupReplaceWarning,
} from "@rehab-grid/core/lib/constants";
import { cn } from "@rehab-grid/core/lib/utils";
import {
  type BackupCategorySelection,
  type BackupRestoreMode,
  type BackupSummaryCounts,
  type ParsedBackup,
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
import { AlertTriangle, Info, Loader2 } from "lucide-react";
import { useState } from "react";

/**
 * BackupRestoreDialog の Props
 */
export type BackupRestoreDialogProps = {
  /** ダイアログの開閉状態 */
  open: boolean;
  /** 開閉状態変更ハンドラ */
  onOpenChange: (open: boolean) => void;
  /** 解析・検証済みのバックアップデータ */
  backup: ParsedBackup | null;
  /** 現在の端末データ件数（すべて置き換え選択時の警告表示に使用） */
  currentCounts: BackupSummaryCounts | null;
  /** 復元実行ハンドラ */
  onRestore: (
    backup: ParsedBackup,
    selection: BackupCategorySelection,
    mode: BackupRestoreMode
  ) => Promise<void>;
};

/** カテゴリ行の定義 */
type CategoryRowItem = {
  key: keyof BackupCategorySelection;
  label: string;
  count: number;
  unit: "件" | "枚";
};

/**
 * 復元ダイアログの本体（backup が変わるたびに初期状態にリセットされる）
 */
function BackupRestoreDialogBody({
  backup,
  currentCounts,
  onCancel,
  onRestore,
}: {
  backup: ParsedBackup;
  currentCounts: BackupSummaryCounts | null;
  onCancel: () => void;
  onRestore: (
    backup: ParsedBackup,
    selection: BackupCategorySelection,
    mode: BackupRestoreMode
  ) => Promise<void>;
}) {
  const [selection, setSelection] = useState<BackupCategorySelection>(() =>
    createInitialBackupSelection(backup.counts)
  );
  const [mode, setMode] = useState<BackupRestoreMode>("merge");
  const [isRestoring, setIsRestoring] = useState(false);

  const rows: CategoryRowItem[] = [
    {
      key: "projects",
      label: BACKUP_CATEGORY_PROJECTS_LABEL,
      count: backup.counts.projects,
      unit: "件",
    },
    {
      key: "userTemplates",
      label: BACKUP_CATEGORY_TEMPLATES_LABEL,
      count: backup.counts.userTemplates,
      unit: "件",
    },
    {
      key: "exerciseCards",
      label: BACKUP_CATEGORY_EXERCISE_CARDS_LABEL,
      count: backup.counts.exerciseCards,
      unit: "件",
    },
    {
      key: "customSnippets",
      label: BACKUP_CATEGORY_CUSTOM_SNIPPETS_LABEL,
      count: backup.counts.customSnippets,
      unit: "件",
    },
    {
      key: "unusedImages",
      label: BACKUP_CATEGORY_UNUSED_IMAGES_LABEL,
      count: backup.counts.unusedImages,
      unit: "枚",
    },
  ];

  const hasAnyData = rows.some((row) => row.count > 0);
  const isReplace = mode === "replace";
  const hasSelection = isReplace || hasAnySelectedBackupCategory(selection);

  const toggleCategory = (
    key: keyof BackupCategorySelection,
    checked: boolean
  ) => {
    setSelection((prev) => ({ ...prev, [key]: checked }));
  };

  const handleSubmit = async () => {
    if (!hasAnyData || !hasSelection || isRestoring) return;
    setIsRestoring(true);
    try {
      await onRestore(backup, selection, mode);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <>
      {hasAnyData ? (
        <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
          {/* 復元するカテゴリ選択 */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-foreground">
              {BACKUP_RESTORE_CATEGORIES_HEADING}
            </legend>
            <div className="space-y-2">
              {rows.map((row) => {
                const isEmpty = row.count === 0;
                const checked = isReplace ? !isEmpty : selection[row.key];
                const disabled = isEmpty || isReplace || isRestoring;
                const checkboxId = `backup-restore-${row.key}`;

                return (
                  <label
                    key={row.key}
                    htmlFor={checkboxId}
                    className={cn(
                      "flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors",
                      disabled
                        ? "cursor-not-allowed border-border/60 bg-muted/40 text-muted-foreground"
                        : "cursor-pointer border-border bg-card hover:bg-accent/40"
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <Checkbox
                        id={checkboxId}
                        checked={checked}
                        disabled={disabled}
                        onCheckedChange={(next) => {
                          toggleCategory(row.key, next === true);
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
          </fieldset>

          {/* 復元方法選択 */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-foreground">
              {BACKUP_RESTORE_MODE_HEADING}
            </legend>
            <div className="space-y-2">
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                  mode === "merge"
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:bg-accent/40",
                  isRestoring && "pointer-events-none opacity-60"
                )}
              >
                <input
                  type="radio"
                  name="backup-restore-mode"
                  value="merge"
                  checked={mode === "merge"}
                  disabled={isRestoring}
                  onChange={() => setMode("merge")}
                  className="mt-1 accent-primary"
                />
                <span className="space-y-0.5">
                  <span className="block text-sm font-semibold text-foreground">
                    {BACKUP_RESTORE_MODE_MERGE_LABEL}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {BACKUP_RESTORE_MODE_MERGE_DESCRIPTION}
                  </span>
                </span>
              </label>

              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                  mode === "replace"
                    ? "border-destructive bg-destructive/5"
                    : "border-border bg-card hover:bg-accent/40",
                  isRestoring && "pointer-events-none opacity-60"
                )}
              >
                <input
                  type="radio"
                  name="backup-restore-mode"
                  value="replace"
                  checked={mode === "replace"}
                  disabled={isRestoring}
                  onChange={() => setMode("replace")}
                  className="mt-1 accent-destructive"
                />
                <span className="space-y-0.5">
                  <span className="block text-sm font-semibold text-foreground">
                    {BACKUP_RESTORE_MODE_REPLACE_LABEL}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {BACKUP_RESTORE_MODE_REPLACE_DESCRIPTION}
                  </span>
                </span>
              </label>
            </div>
          </fieldset>

          {/* 「すべて置き換える」選択時の強い警告 */}
          {isReplace ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs text-destructive"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                {createBackupReplaceWarning(
                  currentCounts ?? {
                    projects: 0,
                    userTemplates: 0,
                    exerciseCards: 0,
                    customSnippets: 0,
                    totalImages: 0,
                  }
                )}
              </span>
            </div>
          ) : null}

          {!hasSelection ? (
            <p className="text-xs text-destructive">
              {BACKUP_RESTORE_SELECT_REQUIRED}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {BACKUP_RESTORE_EMPTY_BACKUP_MESSAGE}
        </p>
      )}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isRestoring}
        >
          {BUTTON_CANCEL}
        </Button>
        <Button
          type="button"
          variant={isReplace ? "destructive" : "default"}
          onClick={() => void handleSubmit()}
          disabled={!hasAnyData || !hasSelection || isRestoring}
          className="gap-2"
        >
          {isRestoring ? <Loader2 className="size-4 animate-spin" /> : null}
          {isRestoring
            ? BACKUP_RESTORE_LOADING_LABEL
            : isReplace
              ? BACKUP_RESTORE_REPLACE_BUTTON_LABEL
              : BACKUP_RESTORE_BUTTON_LABEL}
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * バックアップから復元（一括インポート）ダイアログ
 *
 * 解析済みのバックアップファイルの内容を確認し、
 * 復元するカテゴリと復元方法（追加／すべて置き換え）を選択して復元を実行する。
 */
export function BackupRestoreDialog({
  open,
  onOpenChange: handleOpenChange,
  backup,
  currentCounts,
  onRestore,
}: BackupRestoreDialogProps) {
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{BACKUP_RESTORE_DIALOG_TITLE}</DialogTitle>
          <DialogDescription>
            {BACKUP_RESTORE_DIALOG_DESCRIPTION}
          </DialogDescription>
        </DialogHeader>

        {open && backup !== null ? (
          <BackupRestoreDialogBody
            key={backup.manifest.exportedAt}
            backup={backup}
            currentCounts={currentCounts}
            onCancel={() => handleOpenChange(false)}
            onRestore={onRestore}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
