"use client";

import {
  BUTTON_CANCEL,
  IMPORT_CONFIRM_DESCRIPTION,
  IMPORT_CONFIRM_TITLE,
  OPEN_AS_NEW_PROJECT_LABEL,
  OVERWRITE_CURRENT_PROJECT_LABEL,
} from "@rehab-grid/core/lib/constants";
import { cn } from "@rehab-grid/core/lib/utils";
import { type ImportOpenMode } from "@rehab-grid/core/types";
import { buttonVariants } from "@rehab-grid/ui/components/ui/button";
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

/**
 * ImportConfirmDialogコンポーネントのProps
 */
export type ImportConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 開き方を選んだとき（new: 新しい指導箋として開く / overwrite: 現在の指導箋に上書き） */
  onConfirm: (mode: ImportOpenMode) => void;
  onCancel: () => void;
};

/**
 * インポート確認ダイアログコンポーネント
 *
 * 編集中の指導箋がある場合に、新しい指導箋として開くか上書きするかを選ばせます。
 * 既定（右端・強調）は現在の指導箋を残す「新しい指導箋で開く」。
 */
export function ImportConfirmDialog({
  open,
  onOpenChange: handleOpenChange,
  onConfirm: handleConfirm,
  onCancel: handleCancel,
}: ImportConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{IMPORT_CONFIRM_TITLE}</AlertDialogTitle>
          <AlertDialogDescription>
            {IMPORT_CONFIRM_DESCRIPTION}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {/* ボタンが 3 つあるため、狭い画面では折り返す */}
        <AlertDialogFooter className="flex-wrap">
          <AlertDialogCancel onClick={handleCancel}>
            {BUTTON_CANCEL}
          </AlertDialogCancel>
          {/* outline には文字色の指定がないため、Action 既定の白文字を明示的に上書きする */}
          <AlertDialogAction
            className={cn(buttonVariants({ variant: "outline" }), "text-foreground")}
            onClick={() => handleConfirm("overwrite")}
          >
            {OVERWRITE_CURRENT_PROJECT_LABEL}
          </AlertDialogAction>
          <AlertDialogAction onClick={() => handleConfirm("new")}>
            {OPEN_AS_NEW_PROJECT_LABEL}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
