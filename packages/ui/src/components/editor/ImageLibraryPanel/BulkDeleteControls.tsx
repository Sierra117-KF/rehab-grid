/**
 * まとめて削除コントロールコンポーネント
 *
 * 画像の一括削除機能を提供するUIコントロール群
 */

import {
  BUTTON_CANCEL,
  BUTTON_DELETE,
  createDeleteAllDialogDescription,
  createDeleteAllDialogTitle,
  createDeleteAllLabel,
  createSelectedImagesDeleteDescription,
  createSelectedImagesDeleteLabel,
  IMAGE_DELETE_SELECTED_TITLE,
  IMAGE_LIBRARY_BULK_DELETE,
  IMAGE_LIBRARY_BULK_DELETE_END,
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
  AlertDialogTrigger,
} from "@rehab-grid/ui/components/wrapped/AlertDialog";
import { Button } from "@rehab-grid/ui/components/wrapped/Button";
import { Trash2 } from "lucide-react";

/**
 * まとめて削除コントロールの Props
 */
type BulkDeleteControlsProps = {
  /** まとめて削除モードかどうか */
  isBulkDeleteMode: boolean;
  /** 選択画像数 */
  selectedCount: number;
  /** 表示中の画像数 */
  imageCount: number;
  /** 取り込み画像数（まとめて削除ボタンの無効化条件用） */
  importedImageCount: number;
  /** フィルター適用中かどうか */
  isFiltered: boolean;
  /** まとめて削除モード切り替え時のコールバック */
  onToggleBulkDeleteMode: () => void;
  /** 選択画像の削除確定時のコールバック */
  onDeleteSelected: () => void;
  /** 表示中の画像を削除確定時のコールバック */
  onDeleteDisplayed: () => void;
};

/**
 * まとめて削除コントロールコンポーネント
 */
export function BulkDeleteControls({
  isBulkDeleteMode,
  selectedCount,
  imageCount,
  importedImageCount,
  isFiltered,
  onToggleBulkDeleteMode,
  onDeleteSelected,
  onDeleteDisplayed,
}: BulkDeleteControlsProps) {
  // 削除ボタンのラベル
  const deleteAllLabel = createDeleteAllLabel(imageCount, isFiltered);

  // 削除確認ダイアログのタイトルと説明
  const deleteAllDialogTitle = createDeleteAllDialogTitle(isFiltered);
  const deleteAllDialogDescription = createDeleteAllDialogDescription(
    imageCount,
    isFiltered
  );

  return (
    <div className="mt-3 shrink-0 space-y-2 border-t border-border/40 pt-3">
      {isBulkDeleteMode ? (
        <>
          {/* 選択した画像を削除 */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full gap-2 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={selectedCount === 0}
              >
                <Trash2 className="size-4" />
                {createSelectedImagesDeleteLabel(selectedCount)}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {IMAGE_DELETE_SELECTED_TITLE}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {createSelectedImagesDeleteDescription(selectedCount)}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{BUTTON_CANCEL}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDeleteSelected}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  {BUTTON_DELETE}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* 表示中の画像を削除 / 全ての画像を削除 */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full gap-2">
                <Trash2 className="size-4" />
                {deleteAllLabel}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{deleteAllDialogTitle}</AlertDialogTitle>
                <AlertDialogDescription>
                  {deleteAllDialogDescription}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{BUTTON_CANCEL}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDeleteDisplayed}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  {BUTTON_DELETE}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* まとめて削除を終わる */}
          <Button
            variant="secondary"
            className="w-full"
            onClick={onToggleBulkDeleteMode}
          >
            {IMAGE_LIBRARY_BULK_DELETE_END}
          </Button>
        </>
      ) : (
        /* まとめて削除（取り込み画像がない場合は無効） */
        <Button
          variant="outline"
          className="w-full gap-2 bg-white border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={onToggleBulkDeleteMode}
          disabled={importedImageCount === 0}
        >
          <Trash2 className="size-4" />
          {IMAGE_LIBRARY_BULK_DELETE}
        </Button>
      )}
    </div>
  );
}
