"use client";

import {
  APPLY_DOSAGES_TO_ALL_TOOLTIP,
  APPLY_PRECAUTIONS_TO_ALL_TOOLTIP,
  APPLY_TO_ALL_LABEL,
  DELETE_CONFIRM_DESCRIPTION,
  DELETE_CONFIRM_TITLE,
  DUPLICATE_BUTTON_LABEL,
  IMAGE_EDIT_LABEL,
  IMAGE_FLIP_BUTTON_LABEL,
  IMAGE_FLIP_TOOLTIP,
  MAX_PRECAUTIONS_COUNT,
  PROPERTY_PANEL_WARNING,
  SNIPPET_BUTTON_LABEL,
  TEXT_LIMITS,
} from "@rehab-grid/core/lib/constants";
import {
  type Dosages,
  type EditorItem,
  type Precaution,
} from "@rehab-grid/core/types";
import { PrecautionSnippetDialog } from "@rehab-grid/ui/components/editor/PrecautionSnippetDialog";
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
import { Input } from "@rehab-grid/ui/components/wrapped/Input";
import { Label } from "@rehab-grid/ui/components/wrapped/Label";
import { Textarea } from "@rehab-grid/ui/components/wrapped/Textarea";
import {
  AlertTriangle,
  Copy,
  CopyCheck,
  FileText,
  FlipHorizontal2,
  MousePointerClick,
  Plus,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";
import { nanoid } from "nanoid";
import { useState } from "react";

/**
 * 「全カードに反映」ボタン（見出しの横に置く小さなボタン）
 */
function ApplyToAllButton({
  title,
  disabled,
  onClick,
}: {
  title: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 gap-1 px-2 text-[11px] text-muted-foreground"
      title={title}
      // 用量・注意点の 2 つのボタンを支援技術で区別できるよう、ツールチップと同じ名前にする
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
    >
      <CopyCheck className="size-3" />
      {APPLY_TO_ALL_LABEL}
    </Button>
  );
}

/**
 * プロパティパネルの Props
 */
export type PropertyPanelProps = {
  /** 選択中のアイテム */
  selectedItem: EditorItem | null;
  /**
   * アイテム変更時のコールバック
   *
   * @remarks
   * 入力欄の変更では options.mergeKey を渡す。同じキーの連続入力は 1 件の履歴にまとまる。
   */
  onItemChange: (
    id: string,
    updates: Partial<EditorItem>,
    options?: { mergeKey?: string }
  ) => void;
  /** アイテム削除時のコールバック（完了トーストは呼び出し側で表示する） */
  onItemDelete?: (id: string) => void;
  /** アイテム複製時のコールバック（未指定なら複製ボタンを表示しない） */
  onItemDuplicate?: (id: string) => void;
  /**
   * 用量を全カードに反映するコールバック
   *
   * @remarks
   * 未指定なら反映ボタンを表示しない（カードが 1 枚のときは渡さない）
   */
  onApplyDosagesToAll?: (dosages: Dosages) => void;
  /**
   * 注意点を全カードに追加するコールバック
   *
   * @remarks
   * 未指定なら反映ボタンを表示しない（カードが 1 枚のときは渡さない）
   */
  onApplyPrecautionsToAll?: (values: string[]) => void;
  /**
   * 画像の左右反転ボタンが押されたときのコールバック
   *
   * @remarks
   * 未指定、またはカードに画像がないときはボタンを表示しない
   */
  onImageFlip?: (id: string) => void;
  /**
   * 画像の編集ボタンが押されたときのコールバック
   *
   * @remarks
   * 未指定、またはカードに画像がないときはボタンを表示しない
   */
  onImageEdit?: (id: string) => void;
  /** 画像の処理中かどうか（処理中は画像の操作ボタンを押せない） */
  isImageProcessing?: boolean;
};

/**
 * プロパティパネル（右サイドバー）
 *
 * 選択したカードの編集フォームを提供。
 * タイトル・説明・回数/セット/頻度・注意点の編集が可能
 *
 * @param props - プロパティパネルの props
 */
export function PropertyPanel({
  selectedItem,
  onItemChange,
  onItemDelete,
  onItemDuplicate,
  onApplyDosagesToAll,
  onApplyPrecautionsToAll,
  onImageFlip,
  onImageEdit,
  isImageProcessing = false,
}: PropertyPanelProps) {
  // 削除確認ダイアログの状態
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  // 定型文選択ダイアログの状態
  const [showSnippetDialog, setShowSnippetDialog] = useState(false);

  /**
   * 削除ボタンクリック時にダイアログを表示
   */
  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  /**
   * 削除を確定
   */
  const handleConfirmDelete = () => {
    if (selectedItem && onItemDelete) {
      onItemDelete(selectedItem.id);
    }
    setShowDeleteDialog(false);
  };

  /**
   * 削除をキャンセル
   */
  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
  };

  /**
   * ダイアログの開閉状態変更ハンドラー
   */
  const handleDialogOpenChange = (open: boolean) => {
    setShowDeleteDialog(open);
  };
  /**
   * dosagesフィールドの更新ヘルパー
   */
  const handleDosageChange = (
    field: "reps" | "sets" | "frequency",
    value: string
  ) => {
    if (!selectedItem) return;
    onItemChange(
      selectedItem.id,
      {
        dosages: {
          reps: selectedItem.dosages?.reps ?? "",
          sets: selectedItem.dosages?.sets ?? "",
          frequency: selectedItem.dosages?.frequency ?? "",
          [field]: value,
        },
      },
      { mergeKey: `${selectedItem.id}:dosages` }
    );
  };

  /**
   * 注意点を追加
   */
  const handleAddPrecaution = () => {
    if (!selectedItem) return;
    const currentPrecautions = selectedItem.precautions ?? [];
    const newPrecaution: Precaution = { id: nanoid(), value: "" };
    onItemChange(selectedItem.id, {
      precautions: [...currentPrecautions, newPrecaution],
    });
  };

  /**
   * 注意点を削除（IDで特定）
   */
  const handleRemovePrecaution = (precautionId: string) => {
    if (!selectedItem) return;
    const currentPrecautions = selectedItem.precautions ?? [];
    onItemChange(selectedItem.id, {
      precautions: currentPrecautions.filter((p) => p.id !== precautionId),
    });
  };

  /**
   * 注意点を更新（IDで特定）
   */
  const handleUpdatePrecaution = (precautionId: string, value: string) => {
    if (!selectedItem) return;
    const currentPrecautions = selectedItem.precautions ?? [];
    onItemChange(
      selectedItem.id,
      {
        precautions: currentPrecautions.map((p) =>
          p.id === precautionId ? { ...p, value } : p
        ),
      },
      { mergeKey: `${selectedItem.id}:precaution:${precautionId}` }
    );
  };

  /**
   * 定型文選択時のハンドラ
   * 選択された定型文を注意点として一括追加
   */
  const handleSnippetSelect = (values: string[]) => {
    if (!selectedItem) return;
    const currentPrecautions = selectedItem.precautions ?? [];

    // 新しい注意点を作成（最大数を超えないように）
    const remainingSlots = MAX_PRECAUTIONS_COUNT - currentPrecautions.length;
    const newPrecautions: Precaution[] = values
      .slice(0, remainingSlots)
      .map((value) => ({
        id: nanoid(),
        value,
      }));

    onItemChange(selectedItem.id, {
      precautions: [...currentPrecautions, ...newPrecautions],
    });
  };

  // 一度入力して消すと空文字の dosages が残るため、値の有無はトリム後の中身で判定する
  const hasDosages =
    selectedItem?.dosages !== undefined &&
    Object.values(selectedItem.dosages).some((value) => value.trim() !== "");
  const precautionValues = (selectedItem?.precautions ?? [])
    .map((precaution) => precaution.value)
    .filter((value) => value.trim() !== "");

  return (
    <div className="flex h-full flex-col">
      {/* 警告ラベル */}
      <p className="text-xs text-amber-600 font-medium shrink-0 pt-4 flex items-center justify-center gap-1">
        <AlertTriangle className="size-3.5" />
        {PROPERTY_PANEL_WARNING}
      </p>

      {selectedItem ? (
        /* 編集フォーム */
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {/* 画像の編集（画像があるカードのみ） */}
            {selectedItem.imageSource !== "" && (onImageFlip || onImageEdit) ? (
              <div className="space-y-1">
                <Label>画像</Label>
                <div className="flex gap-2">
                  {onImageFlip ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 bg-white"
                      title={IMAGE_FLIP_TOOLTIP}
                      disabled={isImageProcessing}
                      onClick={() => onImageFlip(selectedItem.id)}
                    >
                      <FlipHorizontal2 className="size-3.5" />
                      {IMAGE_FLIP_BUTTON_LABEL}
                    </Button>
                  ) : null}
                  {onImageEdit ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 bg-white"
                      disabled={isImageProcessing}
                      onClick={() => onImageEdit(selectedItem.id)}
                    >
                      <SquarePen className="size-3.5" />
                      {IMAGE_EDIT_LABEL}
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* タイトル */}
            <div className="space-y-1">
              <Label htmlFor="item-title">運動名</Label>
              <Input
                id="item-title"
                value={selectedItem.title}
                onChange={(e) =>
                  onItemChange(
                    selectedItem.id,
                    { title: e.target.value },
                    { mergeKey: `${selectedItem.id}:title` }
                  )
                }
                placeholder="運動名を入力"
                maxLength={TEXT_LIMITS.title}
              />
              <p className="text-[10px] text-muted-foreground/60 text-right">
                残り {TEXT_LIMITS.title - selectedItem.title.length} 文字
              </p>
            </div>

            {/* 説明 */}
            <div className="space-y-1">
              <Label htmlFor="item-description">説明</Label>
              <Textarea
                id="item-description"
                value={selectedItem.description}
                onChange={(e) =>
                  onItemChange(
                    selectedItem.id,
                    { description: e.target.value },
                    { mergeKey: `${selectedItem.id}:description` }
                  )
                }
                placeholder="手順や方法を入力"
                rows={3}
                maxLength={TEXT_LIMITS.description}
              />
              <p className="text-[10px] text-muted-foreground/60 text-right">
                残り {TEXT_LIMITS.description - selectedItem.description.length}{" "}
                文字
              </p>
            </div>

            {/* 回数・セット・頻度 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Label>回数・セット・頻度</Label>
                {onApplyDosagesToAll ? (
                  <ApplyToAllButton
                    title={APPLY_DOSAGES_TO_ALL_TOOLTIP}
                    disabled={!hasDosages}
                    onClick={() => {
                      if (selectedItem.dosages) {
                        onApplyDosagesToAll(selectedItem.dosages);
                      }
                    }}
                  />
                ) : null}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="dosage-reps" className="text-xs">
                    回数
                  </Label>
                  <Input
                    id="dosage-reps"
                    value={selectedItem.dosages?.reps ?? ""}
                    onChange={(e) => handleDosageChange("reps", e.target.value)}
                    className="h-8 text-xs"
                    maxLength={TEXT_LIMITS.reps}
                  />
                  <p className="text-[10px] text-muted-foreground/60 text-right">
                    残り{" "}
                    {TEXT_LIMITS.reps -
                      (selectedItem.dosages?.reps ?? "").length}{" "}
                    文字
                  </p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dosage-sets" className="text-xs">
                    セット
                  </Label>
                  <Input
                    id="dosage-sets"
                    value={selectedItem.dosages?.sets ?? ""}
                    onChange={(e) => handleDosageChange("sets", e.target.value)}
                    className="h-8 text-xs"
                    maxLength={TEXT_LIMITS.sets}
                  />
                  <p className="text-[10px] text-muted-foreground/60 text-right">
                    残り{" "}
                    {TEXT_LIMITS.sets -
                      (selectedItem.dosages?.sets ?? "").length}{" "}
                    文字
                  </p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dosage-frequency" className="text-xs">
                    頻度
                  </Label>
                  <Input
                    id="dosage-frequency"
                    value={selectedItem.dosages?.frequency ?? ""}
                    onChange={(e) =>
                      handleDosageChange("frequency", e.target.value)
                    }
                    className="h-8 text-xs"
                    maxLength={TEXT_LIMITS.frequency}
                  />
                  <p className="text-[10px] text-muted-foreground/60 text-right">
                    残り{" "}
                    {TEXT_LIMITS.frequency -
                      (selectedItem.dosages?.frequency ?? "").length}{" "}
                    文字
                  </p>
                </div>
              </div>
            </div>

            {/* 注意点 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Label>注意点</Label>
                {onApplyPrecautionsToAll ? (
                  <ApplyToAllButton
                    title={APPLY_PRECAUTIONS_TO_ALL_TOOLTIP}
                    disabled={precautionValues.length === 0}
                    onClick={() => onApplyPrecautionsToAll(precautionValues)}
                  />
                ) : null}
              </div>
              <div className="space-y-1.5">
                {(selectedItem.precautions ?? []).map((precaution) => (
                  <div key={precaution.id} className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Input
                        value={precaution.value}
                        onChange={(e) =>
                          handleUpdatePrecaution(precaution.id, e.target.value)
                        }
                        placeholder="注意点を入力"
                        className="h-8 flex-1 text-xs"
                        maxLength={TEXT_LIMITS.precaution}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemovePrecaution(precaution.id)}
                        aria-label="注意点を削除"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 text-right pr-10">
                      残り {TEXT_LIMITS.precaution - precaution.value.length}{" "}
                      文字
                    </p>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 bg-white"
                    onClick={handleAddPrecaution}
                    disabled={
                      (selectedItem.precautions?.length ?? 0) >=
                      MAX_PRECAUTIONS_COUNT
                    }
                  >
                    <Plus className="size-3.5" />
                    追加
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 bg-white"
                    onClick={() => setShowSnippetDialog(true)}
                    disabled={
                      (selectedItem.precautions?.length ?? 0) >=
                      MAX_PRECAUTIONS_COUNT
                    }
                  >
                    <FileText className="size-3.5" />
                    {SNIPPET_BUTTON_LABEL}
                  </Button>
                </div>
              </div>
            </div>

            {/* 複製・削除ボタン */}
            {onItemDuplicate || onItemDelete ? (
              <div className="mt-4 space-y-2 border-t border-border/40 pt-3">
                {onItemDuplicate ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 bg-white"
                    onClick={() => onItemDuplicate(selectedItem.id)}
                  >
                    <Copy className="size-4" />
                    {DUPLICATE_BUTTON_LABEL}
                  </Button>
                ) : null}
                {onItemDelete ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 bg-white border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={handleDeleteClick}
                  >
                    <Trash2 className="size-4" />
                    このカードを削除
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        /* 空状態 */
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
          <div className="rounded-full bg-muted/30 p-3">
            <MousePointerClick className="size-5 text-muted-foreground/40" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              カードを選択
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground/60">
              編集するカードをクリックしてください
            </p>
          </div>
        </div>
      )}

      {/* 削除確認ダイアログ */}
      <AlertDialog
        open={showDeleteDialog}
        onOpenChange={handleDialogOpenChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{DELETE_CONFIRM_TITLE}</AlertDialogTitle>
            <AlertDialogDescription>
              {DELETE_CONFIRM_DESCRIPTION}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 定型文選択ダイアログ */}
      <PrecautionSnippetDialog
        open={showSnippetDialog}
        onOpenChange={setShowSnippetDialog}
        onSelect={handleSnippetSelect}
        currentCount={selectedItem?.precautions?.length ?? 0}
      />
    </div>
  );
}
