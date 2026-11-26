"use client";

import { useCanvasImages } from "@rehab-grid/core/hooks/useCanvasImages";
import {
  BUTTON_CANCEL,
  BUTTON_DELETE,
  createExerciseCardDeleteConfirmDescription,
  createMaxItemCountReachedMessage,
  EXERCISE_CARD_DELETE_CONFIRM_TITLE,
  EXERCISE_CARD_DELETE_LABEL,
  EXERCISE_CARD_DELETE_SUCCESS_MESSAGE,
  EXERCISE_CARD_EMPTY_MESSAGE,
  EXERCISE_CARD_LIBRARY_DESCRIPTION,
  EXERCISE_CARD_LIBRARY_LABEL,
  EXERCISE_CARD_NO_MATCHES,
  EXERCISE_CARD_SEARCH_LABEL,
  EXERCISE_CARD_SEARCH_PLACEHOLDER,
  LABELS,
  MAX_ITEM_COUNT,
  UNKNOWN_ERROR_MESSAGE,
} from "@rehab-grid/core/lib/constants";
import { deleteExerciseCard, listExerciseCards } from "@rehab-grid/core/lib/db";
import { cn } from "@rehab-grid/core/lib/utils";
import {
  type EditorItem,
  type ExerciseCardRecord,
} from "@rehab-grid/core/types";
import { matchesSearchQuery } from "@rehab-grid/core/utils/search";
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
import { ImagePlus, Search, Trash2 } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { toast } from "sonner";

/**
 * ExerciseCardLibraryModal の Props
 */
export type ExerciseCardLibraryModalProps = {
  /** モーダルの開閉状態 */
  open: boolean;
  /** 開閉状態変更ハンドラ */
  onOpenChange: (open: boolean) => void;
  /** カードを追加できるか（最大枚数に達していれば false） */
  canAdd: boolean;
  /** 選んだマイ運動を指導箋に追加する（呼び出し後にモーダルを閉じる） */
  onAdd: (item: EditorItem) => void;
};

/** モーダルが閉じている間に useCanvasImages へ渡す空配列（不要な DB 読み込み・Object URL 生成を避ける） */
const EMPTY_ITEMS: EditorItem[] = [];

/** 表示用の運動名（空なら「無題の運動」） */
function getDisplayTitle(item: EditorItem): string {
  return item.title.trim() || LABELS.untitledExercise;
}

/** 一覧の 2 行目に出す要約（用量があれば用量、なければ説明） */
function getSummary(item: EditorItem): string {
  const dosages = [
    item.dosages?.reps,
    item.dosages?.sets,
    item.dosages?.frequency,
  ].filter((value): value is string => (value ?? "").trim() !== "");
  return dosages.length > 0 ? dosages.join(" / ") : item.description;
}

/**
 * ExerciseCardRow の Props
 */
type ExerciseCardRowProps = {
  /** マイ運動 */
  card: ExerciseCardRecord;
  /** カードの画像URL（画像なし・参照切れなら undefined） */
  imageUrl: string | undefined;
  /** 追加できるか */
  canAdd: boolean;
  /** 追加する */
  onAdd: () => void;
  /** 削除する（確認ダイアログを開く） */
  onDelete: () => void;
};

/**
 * マイ運動一覧の 1 行
 */
function ExerciseCardRow({
  card,
  imageUrl,
  canAdd,
  onAdd,
  onDelete,
}: ExerciseCardRowProps) {
  const title = getDisplayTitle(card.item);
  const summary = getSummary(card.item);

  return (
    <li className="flex items-center gap-2 rounded-lg border border-border bg-card p-2 transition-colors hover:border-teal-400/60 hover:bg-teal-50/50">
      <button
        type="button"
        onClick={onAdd}
        disabled={!canAdd}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-3 rounded-md px-1 py-1 text-left",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
          "disabled:cursor-not-allowed disabled:opacity-60"
        )}
      >
        <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-white">
          {imageUrl !== undefined ? (
            <Image
              src={imageUrl}
              alt=""
              fill
              sizes="48px"
              className="object-contain"
              unoptimized
              draggable={false}
            />
          ) : (
            <ImagePlus className="size-4 text-muted-foreground/40" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-foreground">
            {title}
          </span>
          {summary !== "" ? (
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {summary}
            </span>
          ) : null}
        </span>
      </button>

      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
        title={EXERCISE_CARD_DELETE_LABEL}
        aria-label={`${title}を${EXERCISE_CARD_DELETE_LABEL}`}
      >
        <Trash2 className="size-4 text-rose-500" />
      </Button>
    </li>
  );
}

/**
 * マイ運動モーダル
 *
 * 保存した運動カード（マイ運動）の一覧を表示し、選んだカードを指導箋の末尾に追加する。
 * 運動名での検索と削除もここで行う。
 */
export function ExerciseCardLibraryModal({
  open,
  onOpenChange,
  canAdd,
  onAdd,
}: ExerciseCardLibraryModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ExerciseCardRecord | null>(
    null
  );

  // 保存済みのマイ運動（保存・削除するとリアクティブに更新される）
  const cards = useLiveQuery(listExerciseCards, []);
  const cardItems = useMemo(
    () => (cards ?? []).map((card) => card.item),
    [cards]
  );
  const imageUrls = useCanvasImages(open ? cardItems : EMPTY_ITEMS);

  const filteredCards = (cards ?? []).filter((card) =>
    matchesSearchQuery(getDisplayTitle(card.item), searchQuery)
  );

  /** モーダルを閉じたら検索語を戻す */
  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setSearchQuery("");
    onOpenChange(nextOpen);
  };

  /** 選んだマイ運動を追加してモーダルを閉じる */
  const handleAdd = (card: ExerciseCardRecord) => {
    onAdd(card.item);
    handleDialogOpenChange(false);
  };

  /** 削除を確定する */
  const handleConfirmDelete = async () => {
    if (deleteTarget === null) return;
    try {
      await deleteExerciseCard(deleteTarget.id);
      toast.success(EXERCISE_CARD_DELETE_SUCCESS_MESSAGE);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE);
    } finally {
      setDeleteTarget(null);
    }
  };

  const renderList = () => {
    if (cards === undefined) return null;
    if (cards.length === 0) {
      return (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {EXERCISE_CARD_EMPTY_MESSAGE}
        </p>
      );
    }
    if (filteredCards.length === 0) {
      return (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {EXERCISE_CARD_NO_MATCHES}
        </p>
      );
    }
    return (
      <ul className="space-y-2">
        {filteredCards.map((card) => (
          <ExerciseCardRow
            key={card.id}
            card={card}
            imageUrl={imageUrls.get(card.item.imageSource)}
            canAdd={canAdd}
            onAdd={() => handleAdd(card)}
            onDelete={() => {
              setDeleteTarget(card);
            }}
          />
        ))}
      </ul>
    );
  };

  return (
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="flex max-h-[90vh] max-w-xl flex-col">
          <DialogHeader>
            <DialogTitle>{EXERCISE_CARD_LIBRARY_LABEL}</DialogTitle>
            <DialogDescription>
              {EXERCISE_CARD_LIBRARY_DESCRIPTION}
            </DialogDescription>
          </DialogHeader>

          {/* 検索 */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              aria-label={EXERCISE_CARD_SEARCH_LABEL}
              placeholder={EXERCISE_CARD_SEARCH_PLACEHOLDER}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
              className="pl-9"
            />
          </div>

          {/* 上限に達しているときの案内 */}
          {canAdd ? null : (
            <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              {createMaxItemCountReachedMessage(MAX_ITEM_COUNT)}
            </p>
          )}

          {/* 一覧 */}
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {renderList()}
          </div>

          {/* 削除確認ダイアログ（React ツリー上で一覧のモーダルの中に置き、
              確認ダイアログ内のクリックを一覧の「外側のクリック」とみなして閉じないようにする） */}
          <AlertDialog
            open={deleteTarget !== null}
            onOpenChange={(nextOpen) => {
              if (!nextOpen) setDeleteTarget(null);
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {EXERCISE_CARD_DELETE_CONFIRM_TITLE}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {createExerciseCardDeleteConfirmDescription(
                    deleteTarget ? getDisplayTitle(deleteTarget.item) : ""
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
