"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CANVAS_DROP_HERE,
  EDITOR_TEXT_STYLE,
  EDITOR_TEXT_STYLE_SINGLE_COLUMN,
  IMAGE_DRAG_TYPE,
  LABELS,
  LONG_PRESS_DURATION,
  MOBILE_TAP_TO_SELECT_IMAGE,
  TEXT_LIMITS,
} from "@rehab-grid/core/lib/constants";
import { cn } from "@rehab-grid/core/lib/utils";
import type { EditorItem, LayoutType } from "@rehab-grid/core/types";
import { getDosageBadgeLayout } from "@rehab-grid/core/utils/editor";
import { GripVertical, ImagePlus, Pencil } from "lucide-react";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";

/**
 * ソート可能なカードの Props
 */
export type SortableCardProps = {
  /** アイテムデータ */
  item: EditorItem;
  /** 選択状態 */
  isSelected: boolean;
  /** クリック時のコールバック */
  onClick: () => void;
  /** ドラッグ中かどうか */
  isDragging?: boolean;
  /** 画像がドロップされたときのコールバック */
  onImageDrop?: (imageId: string) => void;
  /** 画像のサムネイルURL */
  imageUrl?: string;
  /** キャンバスのドラッグオーバー状態をリセットするコールバック */
  onCanvasDragEnd?: () => void;

  // モバイル用プロパティ
  /** 画像領域がタップされたときのコールバック（モバイル用） */
  onImageAreaClick?: (itemId: string) => void;
  /** 設定アイコンがタップされたときのコールバック（モバイル用） */
  onSettingsClick?: (itemId: string) => void;
  /** モバイルモードかどうか */
  isMobile?: boolean;

  // レイアウト設定
  /** レイアウトタイプ（4列時のバッジレイアウト変更用） */
  layoutType?: LayoutType;
};

/**
 * ソート可能なカードコンポーネント
 *
 * dnd-kit の useSortable フックを使用してドラッグ可能なカードを実装
 */
export function SortableCard({
  item,
  isSelected,
  onClick,
  isDragging = false,
  onImageDrop,
  imageUrl,
  onCanvasDragEnd,
  onImageAreaClick,
  onSettingsClick,
  isMobile = false,
  layoutType,
}: SortableCardProps) {
  const [isImageDragOver, setIsImageDragOver] = useState(false);

  // ロングプレス用タイマーRef
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isCurrentlyDragging = isDragging || isSortableDragging;

  /**
   * ロングプレスタイマーをクリア
   */
  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  /**
   * コンテンツエリアのタッチ開始時の処理（モバイル用ロングプレス）
   */
  const handleContentTouchStart = useCallback(() => {
    if (!isMobile || onSettingsClick === undefined) return;

    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      onSettingsClick(item.id);
      longPressTimerRef.current = null;
    }, LONG_PRESS_DURATION);
  }, [isMobile, onSettingsClick, item.id, clearLongPressTimer]);

  /**
   * コンテンツエリアのタッチ終了/キャンセル時の処理
   */
  const handleContentTouchEnd = useCallback(() => {
    clearLongPressTimer();
  }, [clearLongPressTimer]);

  /**
   * 画像ドラッグオーバー時の処理
   */
  const handleImageDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      // 画像ライブラリからのドラッグのみ受け付ける
      if (e.dataTransfer.types.includes(IMAGE_DRAG_TYPE)) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "copy";
        setIsImageDragOver(true);
      }
    },
    []
  );

  /**
   * 画像ドラッグリーブ時の処理
   */
  const handleImageDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      // カード内の子要素間を移動しただけの場合は何もしない（ちらつき防止）
      if (e.currentTarget.contains(e.relatedTarget as Node)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      setIsImageDragOver(false);
    },
    []
  );

  /**
   * 画像ドロップ時の処理
   */
  const handleImageDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsImageDragOver(false);
      // キャンバスのドラッグオーバー状態もリセット
      onCanvasDragEnd?.();

      const imageId = e.dataTransfer.getData(IMAGE_DRAG_TYPE);
      if (imageId && onImageDrop) {
        onImageDrop(imageId);
      }
    },
    [onImageDrop, onCanvasDragEnd]
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      // デスクトップ時のみカード全体をドラッグ可能に
      {...(!isMobile && { ...attributes, ...listeners })}
      data-testid={`card-${item.id}`}
      data-selected={isSelected ? "true" : "false"}
      className={cn(
        "group relative rounded-xl bg-card transition-all duration-200",
        isMobile ? "cursor-default" : "cursor-pointer",
        isCurrentlyDragging && "z-50 scale-[1.02] shadow-2xl opacity-90",
        isSelected
          ? "border-2 border-primary ring-2 ring-primary/40"
          : "border border-border/50 hover:border-primary/40 hover:shadow-md",
        "animate-fade-in"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onDragOver={handleImageDragOver}
      onDragLeave={handleImageDragLeave}
      onDrop={handleImageDrop}
    >
      {/* モバイル用: ドラッグハンドル（左上に常時表示） */}
      {isMobile ? (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className={cn(
            "absolute left-2 top-2 z-20",
            "flex size-9 items-center justify-center rounded-full border border-gray-400",
            "bg-gray-200/90 text-gray-700 shadow-md",
            "touch-none cursor-grab active:cursor-grabbing",
            "transition-colors active:bg-gray-400 active:text-gray-900"
          )}
          aria-label="ドラッグして並べ替え"
        >
          <GripVertical className="size-5" />
        </button>
      ) : null}

      {/* モバイル用: 設定アイコン（右上に常時表示） */}
      {isMobile && onSettingsClick ? (
        <button
          type="button"
          className={cn(
            "absolute right-2 top-2 z-20",
            "flex size-9 items-center justify-center rounded-full border border-gray-400",
            "bg-gray-200/90 text-gray-700 shadow-md",
            "transition-colors active:bg-gray-400 active:text-gray-900"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onSettingsClick(item.id);
          }}
          aria-label="カードを編集"
        >
          <Pencil className="size-5" />
        </button>
      ) : null}

      {/* カードコンテンツ */}
      <div className="flex flex-col gap-3 p-4">
        {/* 画像エリア */}
        <div
          className={cn(
            "relative aspect-5/3 rounded-lg overflow-hidden",
            "bg-muted/30 border border-border/30",
            "flex items-center justify-center",
            "transition-all duration-200",
            isImageDragOver &&
              "border-primary-active border-2 bg-primary-active/30"
          )}
        >
          {item.imageSource !== "" && imageUrl !== undefined ? (
            <Image
              src={imageUrl}
              alt={item.title || LABELS.untitledExercise}
              fill
              sizes="(max-width: 768px) 50vw, 300px"
              className="object-contain"
              unoptimized
              draggable={false}
            />
          ) : isImageDragOver ? (
            <div className="flex flex-col items-center gap-2 text-primary-active">
              <ImagePlus className="size-8" />
              <span className="text-xs font-medium">{CANVAS_DROP_HERE}</span>
            </div>
          ) : (
            // モバイル版ではタップオーバーレイが表示されるため、デフォルトプレースホルダーは非表示
            !isMobile && (
              <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
                <ImagePlus className="size-8" />
                <span className="text-xs">{LABELS.noImage}</span>
              </div>
            )
          )}

          {/* モバイル用: 画像選択タップオーバーレイ */}
          {isMobile && onImageAreaClick ? (
            <button
              type="button"
              className={cn(
                "absolute inset-0 z-10",
                "flex flex-col items-center justify-center gap-2",
                "text-white transition-opacity",
                // 画像がない場合のみオーバーレイを表示
                item.imageSource === ""
                  ? "bg-black/20 opacity-100"
                  : "bg-transparent opacity-0"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onImageAreaClick(item.id);
              }}
              aria-label="画像を選択"
            >
              {/* 画像がない場合のみメッセージを表示 */}
              {item.imageSource === "" ? (
                <>
                  <ImagePlus className="size-6" />
                  <span className="text-xs font-medium">
                    {MOBILE_TAP_TO_SELECT_IMAGE}
                  </span>
                </>
              ) : null}
            </button>
          ) : null}
        </div>

        {/* タイトル */}
        <div
          className="space-y-2"
          onTouchStart={handleContentTouchStart}
          onTouchEnd={handleContentTouchEnd}
          onTouchMove={handleContentTouchEnd}
          onTouchCancel={handleContentTouchEnd}
        >
          <h3
            className={cn(
              "font-semibold text-center line-clamp-1",
              layoutType === "grid1" && !isMobile
                ? EDITOR_TEXT_STYLE_SINGLE_COLUMN.titleSize
                : EDITOR_TEXT_STYLE.titleSize,
              !item.title && "text-muted-foreground/50 italic"
            )}
          >
            {item.title
              ? item.title.slice(0, TEXT_LIMITS.title)
              : LABELS.untitledExercise}
          </h3>

          {/* 説明（あれば） */}
          {item.description ? (
            <p
              className={cn(
                layoutType === "grid1" && !isMobile
                  ? EDITOR_TEXT_STYLE_SINGLE_COLUMN.descriptionSize
                  : EDITOR_TEXT_STYLE.descriptionSize,
                "text-muted-foreground line-clamp-4 whitespace-pre-line"
              )}
            >
              {item.description.slice(0, TEXT_LIMITS.description)}
            </p>
          ) : null}
        </div>

        {/* 回数・セット数・頻度（数値強調型デザイン） */}
        {(() => {
          const badgeLayout = getDosageBadgeLayout(
            item.dosages,
            layoutType ?? "grid2"
          );
          if (badgeLayout.length === 0) return null;
          return (
            <div
              className="flex flex-col gap-2 py-2"
              onTouchStart={handleContentTouchStart}
              onTouchEnd={handleContentTouchEnd}
              onTouchMove={handleContentTouchEnd}
              onTouchCancel={handleContentTouchEnd}
            >
              {badgeLayout.map((row) => {
                const rowKey = row.badges.map((b) => b.type).join("-");
                return (
                  <div
                    key={rowKey}
                    className={cn(
                      "grid gap-4",
                      row.isFullWidth
                        ? "grid-cols-1"
                        : row.badges.length === 2
                          ? "grid-cols-2"
                          : "grid-cols-3"
                    )}
                  >
                    {row.badges.map((badge) => (
                      <div
                        key={badge.type}
                        className={cn(
                          "flex flex-col items-center",
                          !badge.hasValue && "invisible"
                        )}
                      >
                        {/* 数値（大きく強調） */}
                        <span
                          className={cn(
                            layoutType === "grid1" && !isMobile
                              ? EDITOR_TEXT_STYLE_SINGLE_COLUMN.dosageValueSize
                              : EDITOR_TEXT_STYLE.dosageValueSize,
                            "font-bold text-dosage-value"
                          )}
                        >
                          {badge.hasValue
                            ? badge.value.slice(0, TEXT_LIMITS[badge.type])
                            : "-"}
                        </span>
                        {/* ラベル（下線付き） */}
                        <span
                          className={cn(
                            layoutType === "grid1" && !isMobile
                              ? EDITOR_TEXT_STYLE_SINGLE_COLUMN.dosageLabelSize
                              : EDITOR_TEXT_STYLE.dosageLabelSize,
                            "text-dosage-label border-t border-dosage-accent-light pt-1 mt-1"
                          )}
                        >
                          {LABELS[badge.type]}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* 注意点（あれば） */}
        {item.precautions && item.precautions.length > 0 ? (
          <div
            className="rounded-lg bg-precaution-bg p-2.5 space-y-1"
            onTouchStart={handleContentTouchStart}
            onTouchEnd={handleContentTouchEnd}
            onTouchMove={handleContentTouchEnd}
            onTouchCancel={handleContentTouchEnd}
          >
            <span
              className={cn(
                layoutType === "grid1" && !isMobile
                  ? EDITOR_TEXT_STYLE_SINGLE_COLUMN.precautionTitleSize
                  : "text-xs",
                "font-semibold text-precaution-title"
              )}
            >
              {LABELS.precautionTitle}
            </span>
            {item.precautions.map((precaution) => (
              <p
                key={precaution.id}
                className={cn(
                  layoutType === "grid1" && !isMobile
                    ? EDITOR_TEXT_STYLE_SINGLE_COLUMN.precautionTextSize
                    : "text-xs",
                  "text-precaution-text whitespace-pre-line wrap-break-words"
                )}
              >
                • {precaution.value.slice(0, TEXT_LIMITS.precaution)}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
