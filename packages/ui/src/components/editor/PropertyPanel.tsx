"use client";

import {
  DELETE_CONFIRM_DESCRIPTION,
  DELETE_CONFIRM_TITLE,
  DELETE_SUCCESS_MESSAGE,
  MAX_PRECAUTIONS_COUNT,
  PROPERTY_PANEL_WARNING,
  SNIPPET_BUTTON_LABEL,
  TEXT_LIMITS,
} from "@rehab-grid/core/lib/constants";
import { type EditorItem, type Precaution } from "@rehab-grid/core/types";
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
  FileText,
  MousePointerClick,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { nanoid } from "nanoid";
import { useState } from "react";
import { toast } from "sonner";

/**
 * プロパティパネルの Props
 */
export type PropertyPanelProps = {
  /** 選択中のアイテム */
  selectedItem: EditorItem | null;
  /** アイテム変更時のコールバック */
  onItemChange: (id: string, updates: Partial<EditorItem>) => void;
  /** アイテム削除時のコールバック */
  onItemDelete?: (id: string) => void;
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
      toast.success(DELETE_SUCCESS_MESSAGE);
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
    onItemChange(selectedItem.id, {
      dosages: {
        reps: selectedItem.dosages?.reps ?? "",
        sets: selectedItem.dosages?.sets ?? "",
        frequency: selectedItem.dosages?.frequency ?? "",
        [field]: value,
      },
    });
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
    onItemChange(selectedItem.id, {
      precautions: currentPrecautions.map((p) =>
        p.id === precautionId ? { ...p, value } : p
      ),
    });
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
            {/* タイトル */}
            <div className="space-y-1">
              <Label htmlFor="item-title">運動名</Label>
              <Input
                id="item-title"
                value={selectedItem.title}
                onChange={(e) =>
                  onItemChange(selectedItem.id, { title: e.target.value })
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
                  onItemChange(selectedItem.id, { description: e.target.value })
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
            <div>
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
              <Label>注意点</Label>
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

            {/* 削除ボタン */}
            {onItemDelete ? (
              <div className="mt-4 border-t border-border/40 pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 bg-white border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleDeleteClick}
                >
                  <Trash2 className="size-4" />
                  このカードを削除
                </Button>
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
