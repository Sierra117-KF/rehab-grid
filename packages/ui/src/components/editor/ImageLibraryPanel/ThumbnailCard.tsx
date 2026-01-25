/**
 * サムネイルカードコンポーネント
 *
 * 画像ライブラリ内の個別サムネイルを表示するカード
 * 削除ボタン、選択マーク、ドラッグ機能を提供
 */

import {
  ANIMATION_STAGGER_DELAY,
  BUTTON_CANCEL,
  BUTTON_DELETE,
  IMAGE_DELETE_DESCRIPTION,
  IMAGE_DELETE_TITLE,
} from "@rehab-grid/core/lib/constants";
import { cn } from "@rehab-grid/core/lib/utils";
import type { UnifiedImageRecord } from "@rehab-grid/core/types";
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
import { CheckCircle, ImagePlus, Trash2 } from "lucide-react";
import Image from "next/image";

/**
 * サムネイルカードの Props
 */
type ThumbnailCardProps = {
  /** 画像データ */
  image: UnifiedImageRecord;
  /** サムネイルURL */
  thumbnailUrl: string | undefined;
  /** まとめて削除モードかどうか */
  isBulkDeleteMode: boolean;
  /** 選択状態かどうか */
  isSelected: boolean;
  /** モバイルモードかどうか */
  isMobile: boolean;
  /** ドラッグ中の画像ID */
  draggingImageId: string | null;
  /** アニメーションインデックス */
  animationIndex: number;
  /** ドラッグ開始時のコールバック */
  onDragStart: (e: React.DragEvent<HTMLDivElement>, imageId: string) => void;
  /** ドラッグ終了時のコールバック */
  onDragEnd: () => void;
  /** クリック時のコールバック（選択/解除 または モバイル画像選択） */
  onClick: (imageId: string) => void;
  /** 削除時のコールバック */
  onDelete: (imageId: string) => void;
};

/**
 * サムネイルカードコンポーネント
 */
export function ThumbnailCard({
  image,
  thumbnailUrl,
  isBulkDeleteMode,
  isSelected,
  isMobile,
  draggingImageId,
  animationIndex,
  onDragStart,
  onDragEnd,
  onClick,
  onDelete,
}: ThumbnailCardProps) {
  /**
   * カードのクリックハンドラ
   */
  const handleClick = () => {
    onClick(image.id);
  };

  /**
   * 削除ボタンのクリックハンドラ（イベント伝播を停止）
   */
  const handleDeleteButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  /**
   * 削除確定ハンドラ
   */
  const handleDeleteConfirm = () => {
    onDelete(image.id);
  };

  /**
   * ドラッグ開始ハンドラ
   */
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isBulkDeleteMode && !isMobile) {
      onDragStart(e, image.id);
    }
  };

  return (
    <div
      draggable={!isBulkDeleteMode && !isMobile}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onClick={handleClick}
      className={cn(
        "group relative aspect-square overflow-hidden rounded-md border border-border/40",
        "transition-all",
        isBulkDeleteMode
          ? "cursor-pointer hover:border-primary/60"
          : "cursor-pointer hover:border-primary/40 hover:shadow-md",
        "animate-fade-in",
        draggingImageId === image.id && "opacity-50",
        isSelected && "ring-2 ring-primary"
      )}
      style={{
        animationDelay: `${String(animationIndex * ANIMATION_STAGGER_DELAY)}s`,
      }}
    >
      {thumbnailUrl !== undefined ? (
        <Image
          src={thumbnailUrl}
          alt={image.fileName}
          fill
          sizes="(max-width: 768px) 33vw, 80px"
          className="pointer-events-none object-contain"
          unoptimized
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
          <ImagePlus className="size-4 text-muted-foreground/30" />
        </div>
      )}

      {/* 選択マーク（削除モード時） */}
      {isBulkDeleteMode && isSelected ? (
        <div className="absolute right-1 top-1 z-10 flex size-5 items-center justify-center rounded-full bg-white">
          <CheckCircle className="size-5 text-primary" />
        </div>
      ) : null}

      {/* 削除ボタン（通常モード時、サンプル画像以外のみ） */}
      {!isBulkDeleteMode && !image.isSample && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              aria-label="画像を削除"
              className={cn(
                "absolute right-1 top-1 z-10",
                "flex size-6 items-center justify-center rounded-full",
                "bg-black/60 text-white opacity-0 transition-opacity",
                "hover:bg-destructive group-hover:opacity-100",
                "focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-destructive"
              )}
              onClick={handleDeleteButtonClick}
            >
              <Trash2 className="size-3.5" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{IMAGE_DELETE_TITLE}</AlertDialogTitle>
              <AlertDialogDescription>
                {IMAGE_DELETE_DESCRIPTION}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{BUTTON_CANCEL}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {BUTTON_DELETE}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
