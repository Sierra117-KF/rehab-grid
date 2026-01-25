"use client";

import {
  BUTTON_CANCEL,
  BUTTON_CONTINUE,
  IMPORT_CONFIRM_DESCRIPTION,
  IMPORT_CONFIRM_TITLE,
} from "@rehab-grid/core/lib/constants";
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
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * インポート確認ダイアログコンポーネント
 *
 * 既存データを上書きする前の確認ダイアログを表示します。
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
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {BUTTON_CANCEL}
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            {BUTTON_CONTINUE}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
