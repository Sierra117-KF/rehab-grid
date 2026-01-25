/**
 * サムネイルグリッドコンポーネント
 *
 * 画像ライブラリのサムネイル一覧をグリッドレイアウトで表示
 * HoverCard（デスクトップ）とプレースホルダーを含む
 */

import {
  ANIMATION_STAGGER_DELAY,
  IMAGE_LIBRARY_NO_MATCHES,
  PLACEHOLDER_IMAGE_COUNT,
} from "@rehab-grid/core/lib/constants";
import { cn } from "@rehab-grid/core/lib/utils";
import type { UnifiedImageRecord } from "@rehab-grid/core/types";
import { getDisplayFileName } from "@rehab-grid/core/utils/image";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@rehab-grid/ui/components/ui/hover-card";
import { ImagePlus } from "lucide-react";
import Image from "next/image";

import { ThumbnailCard } from "./ThumbnailCard";

/**
 * サムネイルグリッドの Props
 */
type ThumbnailGridProps = {
  /** 画像リスト */
  images: UnifiedImageRecord[] | undefined;
  /** サムネイルURLマップ */
  thumbnailUrls: Map<string, string>;
  /** まとめて削除モードかどうか */
  isBulkDeleteMode: boolean;
  /** 選択された画像IDのセット */
  selectedImageIds: Set<string>;
  /** モバイルモードかどうか */
  isMobile: boolean;
  /** ドラッグ中の画像ID */
  draggingImageId: string | null;
  /** フィルター適用中かどうか */
  isFiltered: boolean;
  /** ドラッグ開始時のコールバック */
  onDragStart: (e: React.DragEvent<HTMLDivElement>, imageId: string) => void;
  /** ドラッグ終了時のコールバック */
  onDragEnd: () => void;
  /** 画像選択/解除時のコールバック */
  onToggleSelection: (imageId: string) => void;
  /** モバイルで画像が選択されたときのコールバック */
  onImageSelect?: (imageId: string) => void;
  /** 画像削除時のコールバック */
  onDelete: (imageId: string) => void;
};

/**
 * サムネイルグリッドコンポーネント
 */
export function ThumbnailGrid({
  images,
  thumbnailUrls,
  isBulkDeleteMode,
  selectedImageIds,
  isMobile,
  draggingImageId,
  isFiltered,
  onDragStart,
  onDragEnd,
  onToggleSelection,
  onImageSelect,
  onDelete,
}: ThumbnailGridProps) {
  const imageCount = images?.length ?? 0;

  /**
   * サムネイルカードのクリックハンドラ
   *
   * モードに応じて適切なコールバックを呼び出す
   */
  const handleCardClick = (imageId: string) => {
    if (isBulkDeleteMode) {
      onToggleSelection(imageId);
    } else if (isMobile && onImageSelect) {
      onImageSelect(imageId);
    }
  };

  /**
   * サムネイルグリッドのコンテンツをレンダリング
   *
   * 画像の有無とフィルター状態に応じて適切なUIを返す
   */
  const renderThumbnails = () => {
    // 画像がある場合: サムネイルカードをレンダリング
    if (images && images.length > 0) {
      return images.map((image, i) => {
        const isSelected = selectedImageIds.has(image.id);
        const thumbnailUrl = thumbnailUrls.get(image.id);
        const displayName = getDisplayFileName(image.fileName);

        // サムネイルカード
        const thumbnailCard = (
          <ThumbnailCard
            image={image}
            thumbnailUrl={thumbnailUrl}
            isBulkDeleteMode={isBulkDeleteMode}
            isSelected={isSelected}
            isMobile={isMobile}
            draggingImageId={draggingImageId}
            animationIndex={i}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onClick={handleCardClick}
            onDelete={onDelete}
          />
        );

        // モバイル: HoverCardを使用しない（passive event listenerエラー回避）
        if (isMobile) {
          return <div key={image.id}>{thumbnailCard}</div>;
        }

        // デスクトップ: HoverCardでラップ
        return (
          <HoverCard key={image.id} openDelay={200}>
            <HoverCardTrigger asChild>
              <div>{thumbnailCard}</div>
            </HoverCardTrigger>
            <HoverCardContent
              side="right"
              align="center"
              className="pointer-events-none w-44 p-2"
            >
              <div className="space-y-2">
                {thumbnailUrl !== undefined ? (
                  <div className="relative size-40">
                    <Image
                      src={thumbnailUrl}
                      alt={displayName}
                      fill
                      sizes="160px"
                      className="pointer-events-none object-contain"
                      unoptimized
                      draggable={false}
                    />
                  </div>
                ) : (
                  <div className="flex size-40 items-center justify-center bg-muted/30">
                    <ImagePlus className="size-8 text-muted-foreground/30" />
                  </div>
                )}
                <p className="truncate text-center text-sm text-muted-foreground">
                  {displayName}
                </p>
              </div>
            </HoverCardContent>
          </HoverCard>
        );
      });
    }

    // フィルター適用時で該当画像がない場合: 何も表示しない（メッセージは別途表示）
    if (isFiltered) {
      return null;
    }

    // 画像がない場合: プレースホルダーを表示
    return Array.from({ length: PLACEHOLDER_IMAGE_COUNT }).map((_, i) => (
      <div
        key={`placeholder-${String(i)}`}
        role="presentation"
        className={cn(
          "aspect-square rounded-md border border-border/40 bg-muted/30",
          "flex items-center justify-center",
          "transition-all hover:border-primary/40 hover:bg-muted/50",
          "animate-fade-in"
        )}
        style={{
          animationDelay: `${String(i * ANIMATION_STAGGER_DELAY)}s`,
        }}
      >
        <ImagePlus className="size-4 text-muted-foreground/30" />
      </div>
    ));
  };

  return (
    <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
      {/* 画像サムネイル一覧（モバイル: 2列、デスクトップ: 3列） */}
      <div
        className={cn("grid gap-2", isMobile ? "grid-cols-2" : "grid-cols-3")}
      >
        {renderThumbnails()}
      </div>

      {/* フィルター適用時に該当画像がない場合のメッセージ */}
      {isFiltered && imageCount === 0 ? (
        <p className="text-center text-xs text-muted-foreground">
          {IMAGE_LIBRARY_NO_MATCHES}
        </p>
      ) : null}
    </div>
  );
}
