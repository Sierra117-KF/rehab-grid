"use client";

import {
  CANVAS_DROP_HERE,
  LABELS,
  MOBILE_TAP_TO_SELECT_IMAGE,
} from "@rehab-grid/core/lib/constants";
import { cn } from "@rehab-grid/core/lib/utils";
import { ImagePlus } from "lucide-react";
import Image from "next/image";

/**
 * CardImage コンポーネントの Props
 */
type CardImageProps = {
  /** アイテム ID（モバイルの画像選択に渡す） */
  itemId: string;
  /** 運動名（画像の代替テキスト） */
  title: string;
  /** 表示できる画像の URL（画像なし・参照切れのときは undefined） */
  imageUrl: string | undefined;
  /** 画像ライブラリからの画像がドラッグオーバーしているか */
  isDragOver: boolean;
  /** モバイルモードかどうか */
  isMobile: boolean;
  /** 画像領域がタップされたときのコールバック（モバイル用） */
  onImageAreaClick?: (itemId: string) => void;
};

/**
 * 運動カードの画像エリア（5:3。画像・プレースホルダー・ドロップ案内・モバイルの画像選択）
 */
export function CardImage({
  itemId,
  title,
  imageUrl,
  isDragOver,
  isMobile,
  onImageAreaClick,
}: CardImageProps) {
  const hasImage = imageUrl !== undefined;

  return (
    <div
      className={cn(
        "relative aspect-5/3 rounded-lg overflow-hidden",
        "bg-muted/30 border border-border/30",
        "flex items-center justify-center",
        "transition-all duration-200",
        isDragOver && "border-primary-active border-2 bg-primary-active/30"
      )}
    >
      {hasImage ? (
        <Image
          src={imageUrl}
          alt={title || LABELS.untitledExercise}
          fill
          sizes="(max-width: 768px) 50vw, 300px"
          className="object-contain"
          unoptimized
          draggable={false}
        />
      ) : isDragOver ? (
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
            // 画像がない場合（参照切れを含む）のみオーバーレイを表示
            !hasImage ? "bg-black/20 opacity-100" : "bg-transparent opacity-0"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onImageAreaClick(itemId);
          }}
          aria-label="画像を選択"
        >
          {/* 画像がない場合のみメッセージを表示 */}
          {!hasImage ? (
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
  );
}
