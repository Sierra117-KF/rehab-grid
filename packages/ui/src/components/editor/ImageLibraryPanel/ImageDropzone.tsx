/**
 * 画像ドロップゾーンコンポーネント（デスクトップ用）
 *
 * ドラッグ&ドロップまたはクリックで画像をアップロードするエリア
 */

import {
  IMAGE_LIBRARY_CLICK_INSTRUCTION,
  IMAGE_LIBRARY_DROP_INSTRUCTION,
  IMAGE_LIBRARY_UPLOADING,
} from "@rehab-grid/core/lib/constants";
import { cn } from "@rehab-grid/core/lib/utils";
import { Loader2, Upload } from "lucide-react";

/**
 * 画像ドロップゾーンの Props（デスクトップ用）
 */
type ImageDropzoneProps = {
  /** ドラッグオーバー中かどうか */
  isDragOver: boolean;
  /** アップロード中かどうか */
  isUploading: boolean;
  /** クリック時のコールバック */
  onClick: () => void;
  /** ドラッグオーバー時のコールバック */
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  /** ドラッグリーブ時のコールバック */
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  /** ドロップ時のコールバック */
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
};

/**
 * 画像ドロップゾーンコンポーネント
 */
export function ImageDropzone({
  isDragOver,
  isUploading,
  onClick,
  onDragOver,
  onDragLeave,
  onDrop,
}: ImageDropzoneProps) {
  /**
   * キーボード操作でクリックをトリガー
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      onClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "group relative flex min-h-[80px] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-3 py-2",
        "transition-colors",
        isDragOver
          ? "border-primary-active bg-primary-active/30"
          : "border-border/60 bg-muted/20 hover:border-primary/50 hover:bg-primary/5",
        isUploading && "pointer-events-none opacity-60"
      )}
    >
      {isUploading ? (
        <div className="flex items-center gap-2">
          <Loader2 className="size-5 animate-spin text-primary" />
          <p className="text-xs font-medium text-muted-foreground">
            {IMAGE_LIBRARY_UPLOADING}
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Upload
              className={cn(
                "size-4 transition-colors",
                isDragOver
                  ? "text-primary-active"
                  : "text-muted-foreground group-hover:text-primary"
              )}
            />
            <p className="text-xs font-medium text-muted-foreground">
              {IMAGE_LIBRARY_DROP_INSTRUCTION}
            </p>
          </div>
          <p className="text-xs text-muted-foreground/60">
            {IMAGE_LIBRARY_CLICK_INSTRUCTION}
          </p>
        </>
      )}
    </div>
  );
}
