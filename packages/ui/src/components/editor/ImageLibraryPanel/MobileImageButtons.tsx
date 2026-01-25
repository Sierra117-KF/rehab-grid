/**
 * モバイル用画像追加ボタンコンポーネント
 *
 * ギャラリー、カメラ、貼り付けの3つのアクションボタンを横並びで表示
 */

import {
  IMAGE_LIBRARY_CAMERA_SHORT,
  IMAGE_LIBRARY_GALLERY_SHORT,
  IMAGE_LIBRARY_PASTE_SHORT,
} from "@rehab-grid/core/lib/constants";
import { Button } from "@rehab-grid/ui/components/wrapped/Button";
import { Camera, ClipboardPaste, ImagePlus, Loader2 } from "lucide-react";

/**
 * モバイル用画像追加ボタンの Props
 */
type MobileImageButtonsProps = {
  /** ギャラリーボタンクリック時のコールバック */
  onGalleryClick: () => void;
  /** カメラボタンクリック時のコールバック */
  onCameraClick: () => void;
  /** 貼り付けボタンクリック時のコールバック */
  onPasteClick: () => void;
  /** アップロード中かどうか */
  isUploading: boolean;
};

/**
 * モバイル用画像追加ボタンコンポーネント
 */
export function MobileImageButtons({
  onGalleryClick,
  onCameraClick,
  onPasteClick,
  isUploading,
}: MobileImageButtonsProps) {
  return (
    <div className="flex gap-2">
      {/* ギャラリーから選択 */}
      <Button
        variant="outline"
        className="flex-1 flex-col gap-0.5 py-2 min-h-12 bg-sky-200 border-sky-400 text-sky-800 hover:bg-sky-300 hover:border-sky-500"
        onClick={onGalleryClick}
        disabled={isUploading}
      >
        {isUploading ? (
          <Loader2 className="size-6 animate-spin" />
        ) : (
          <ImagePlus className="size-6" />
        )}
        <span className="text-[10px] font-medium">
          {IMAGE_LIBRARY_GALLERY_SHORT}
        </span>
      </Button>

      {/* カメラ撮影 */}
      <Button
        variant="outline"
        className="flex-1 flex-col gap-0.5 py-2 min-h-12 bg-emerald-200 border-emerald-400 text-emerald-800 hover:bg-emerald-300 hover:border-emerald-500"
        onClick={onCameraClick}
        disabled={isUploading}
      >
        <Camera className="size-6" />
        <span className="text-[10px] font-medium">
          {IMAGE_LIBRARY_CAMERA_SHORT}
        </span>
      </Button>

      {/* クリップボードから貼り付け */}
      <Button
        variant="outline"
        className="flex-1 flex-col gap-0.5 py-2 min-h-12 bg-violet-200 border-violet-400 text-violet-800 hover:bg-violet-300 hover:border-violet-500"
        onClick={onPasteClick}
        disabled={isUploading}
      >
        <ClipboardPaste className="size-6" />
        <span className="text-[10px] font-medium">
          {IMAGE_LIBRARY_PASTE_SHORT}
        </span>
      </Button>
    </div>
  );
}
