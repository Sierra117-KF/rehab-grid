"use client";

/**
 * 画像ライブラリパネル（左サイドバー上部）
 *
 * 画像のアップロードとサムネイル一覧を表示し、
 * ドラッグ＆ドロップでキャンバスのカードに画像を配置できる
 */

import { useImageUpload } from "@rehab-grid/core/hooks/useImageUpload";
import { useObjectUrls } from "@rehab-grid/core/hooks/useObjectUrls";
import {
  BUTTON_ADD_CARD,
  createDisplayedImagesDeleteMessage,
  createImageDeleteSuccessMessage,
  DEFAULT_IMAGE_FILTER,
  IMAGE_ACCEPT_TYPES,
  IMAGE_DRAG_TYPE,
  IMAGE_FILTER_CATEGORIES,
  IMAGE_LIBRARY_CAMERA_SUCCESS,
  IMAGE_LIBRARY_CLIPBOARD_NOT_ALLOWED,
  IMAGE_LIBRARY_NO_IMAGE_IN_CLIPBOARD,
  IMAGE_LIBRARY_PASTE_FAILED,
  IMAGE_LIBRARY_PASTE_SUCCESS,
  IMAGE_LIBRARY_VIDEO_NOT_SUPPORTED,
  IMAGE_UPLOAD_WARNING,
  IMPORTED_IMAGE_FILTER,
  SAMPLE_IMAGES,
} from "@rehab-grid/core/lib/constants";
import { db } from "@rehab-grid/core/lib/db";
import { useEditorStore } from "@rehab-grid/core/lib/store/useEditorStore";
import type { UnifiedImageRecord } from "@rehab-grid/core/types";
import { filterImageFiles } from "@rehab-grid/core/utils/image";
import { Button } from "@rehab-grid/ui/components/wrapped/Button";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertCircle, AlertTriangle, Plus } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { BulkDeleteControls } from "./BulkDeleteControls";
import { CategoryFilter } from "./CategoryFilter";
import { ImageDropzone } from "./ImageDropzone";
import { MobileImageButtons } from "./MobileImageButtons";
import { ThumbnailGrid } from "./ThumbnailGrid";

/**
 * 画像ライブラリパネルの Props
 */
type ImageLibraryPanelProps = {
  /** カード追加ボタンが押されたときのコールバック */
  onAddCard?: () => void;
  /** カード追加が可能かどうか（最大数チェック用） */
  canAddCard?: boolean;
  /** 画像選択時のコールバック（モバイル用） */
  onImageSelect?: (imageId: string) => void;
  /** モバイルモードかどうか */
  isMobile?: boolean;
};

/**
 * 画像ライブラリパネルコンポーネント
 */
export function ImageLibraryPanel({
  onAddCard,
  canAddCard = true,
  onImageSelect,
  isMobile = false,
}: ImageLibraryPanelProps) {
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // State
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggingImageId, setDraggingImageId] = useState<string | null>(null);
  const [isBulkDeleteMode, setIsBulkDeleteMode] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(
    new Set()
  );
  const [filterValue, setFilterValue] = useState(DEFAULT_IMAGE_FILTER);
  const [previousFilter, setPreviousFilter] = useState(DEFAULT_IMAGE_FILTER);

  // Hooks
  const { uploadImages, isUploading, error, clearError } = useImageUpload();
  const deleteImageAndClearReferences = useEditorStore(
    (state) => state.deleteImageAndClearReferences
  );

  // IndexedDBから画像一覧を取得（リアクティブ）
  const images = useLiveQuery(
    async () => db.images.orderBy("createdAt").reverse().toArray(),
    []
  );

  // 画像のサムネイルURLを生成（メモリリーク防止フック使用）
  const thumbnailUrls = useObjectUrls(images);

  // サンプル画像のURLマップを生成
  const sampleImageUrls = useMemo(() => {
    const map = new Map<string, string>();
    for (const img of SAMPLE_IMAGES) {
      map.set(img.id, img.path);
    }
    return map;
  }, []);

  // 統合URLマップ（サンプル画像 + 取り込み画像）
  const allThumbnailUrls = useMemo(() => {
    const combined = new Map(thumbnailUrls);
    for (const [id, url] of sampleImageUrls) {
      combined.set(id, url);
    }
    return combined;
  }, [thumbnailUrls, sampleImageUrls]);

  // サンプル画像を統合画像レコードに変換
  const sampleImageRecords: UnifiedImageRecord[] = useMemo(() => {
    return SAMPLE_IMAGES.map((img) => ({
      id: img.id,
      fileName: img.fileName,
      isSample: true,
      path: img.path,
    }));
  }, []);

  // 統合画像リスト（サンプル画像を先頭に、取り込み画像は後ろに）
  const allImages: UnifiedImageRecord[] = useMemo(() => {
    const dbImages = images ?? [];
    const dbImageRecords: UnifiedImageRecord[] = dbImages.map((img) => ({
      id: img.id,
      fileName: img.fileName ?? "",
      isSample: false,
    }));
    return [...sampleImageRecords, ...dbImageRecords];
  }, [images, sampleImageRecords]);

  // 選択中のカテゴリからprefixを取得
  const activeCategory = IMAGE_FILTER_CATEGORIES.find(
    (cat) => cat.value === filterValue
  );

  // 画像をフィルタリング
  const filteredImages = useMemo((): UnifiedImageRecord[] | undefined => {
    if (images === undefined) return undefined;

    // 「取り込み画像」フィルター（サンプル画像を除外）
    if (activeCategory?.isUserImported === true) {
      return allImages.filter((img) => !img.isSample);
    }

    // 姿勢プレフィックスフィルター
    const prefix = activeCategory?.prefix ?? "";
    if (prefix === "") return allImages;

    return allImages.filter((img) => {
      const fileName = img.fileName.toLowerCase();
      return fileName.startsWith(prefix.toLowerCase());
    });
  }, [allImages, images, activeCategory]);

  // 計算値
  const isFiltered = filterValue !== DEFAULT_IMAGE_FILTER;
  const imageCount = filteredImages?.length ?? 0;
  const importedImageCount = images?.length ?? 0;

  // ========== Event Handlers ==========

  /**
   * フィルター変更
   */
  const handleFilterChange = useCallback((value: string) => {
    setFilterValue(value);
  }, []);

  /**
   * カード追加ボタンクリック
   */
  const handleAddCardClick = useCallback(() => {
    onAddCard?.();
  }, [onAddCard]);

  /**
   * 画像選択時のコールバック（モバイル用）
   */
  const handleImageSelect = useCallback(
    (imageId: string) => {
      onImageSelect?.(imageId);
    },
    [onImageSelect]
  );

  /**
   * サムネイルのドラッグ開始
   */
  const handleThumbnailDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, imageId: string) => {
      e.dataTransfer.setData(IMAGE_DRAG_TYPE, imageId);
      e.dataTransfer.effectAllowed = "copy";
      setDraggingImageId(imageId);
    },
    []
  );

  /**
   * サムネイルのドラッグ終了
   */
  const handleThumbnailDragEnd = useCallback(() => {
    setDraggingImageId(null);
  }, []);

  /**
   * 画像削除
   */
  const handleDeleteImage = useCallback(
    async (imageId: string) => {
      await deleteImageAndClearReferences(imageId);
    },
    [deleteImageAndClearReferences]
  );

  /**
   * まとめて削除モード切り替え
   */
  const handleToggleBulkDeleteMode = useCallback(() => {
    if (!isBulkDeleteMode) {
      setPreviousFilter(filterValue);
      setFilterValue(IMPORTED_IMAGE_FILTER);
    } else {
      setFilterValue(previousFilter);
    }
    setIsBulkDeleteMode((prev) => !prev);
    setSelectedImageIds(new Set());
  }, [isBulkDeleteMode, filterValue, previousFilter]);

  /**
   * 画像選択/解除トグル
   */
  const handleToggleImageSelection = useCallback((imageId: string) => {
    setSelectedImageIds((prev) => {
      const next = new Set(prev);
      if (next.has(imageId)) {
        next.delete(imageId);
      } else {
        next.add(imageId);
      }
      return next;
    });
  }, []);

  /**
   * 選択画像の一括削除
   */
  const handleDeleteSelectedImages = useCallback(async () => {
    const count = selectedImageIds.size;
    for (const imageId of selectedImageIds) {
      await deleteImageAndClearReferences(imageId);
    }
    setSelectedImageIds(new Set());
    setIsBulkDeleteMode(false);
    setFilterValue(previousFilter);
    toast.success(createImageDeleteSuccessMessage(count));
  }, [selectedImageIds, deleteImageAndClearReferences, previousFilter]);

  /**
   * 表示中の画像を削除
   */
  const handleDeleteDisplayedImages = useCallback(async () => {
    if (!filteredImages) return;
    const deletableImages = filteredImages.filter((img) => !img.isSample);
    const count = deletableImages.length;
    for (const image of deletableImages) {
      await deleteImageAndClearReferences(image.id);
    }
    setIsBulkDeleteMode(false);
    setFilterValue(previousFilter);
    toast.success(createDisplayedImagesDeleteMessage(count, isFiltered));
  }, [
    filteredImages,
    isFiltered,
    deleteImageAndClearReferences,
    previousFilter,
  ]);

  /**
   * ファイル選択ダイアログを開く
   */
  const handleDropzoneClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * ファイル選択時の処理
   */
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const { files } = e.target;
      if (!files || files.length === 0) return;
      clearError();
      await uploadImages(files);
      e.target.value = "";
    },
    [uploadImages, clearError]
  );

  /**
   * ドラッグオーバー
   */
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  /**
   * ドラッグリーブ
   */
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  /**
   * ドロップ
   */
  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const { files } = e.dataTransfer;
      if (files.length === 0) return;

      const imageFiles = filterImageFiles(files);
      if (imageFiles.length === 0) return;

      clearError();
      await uploadImages(imageFiles);
    },
    [uploadImages, clearError]
  );

  /**
   * クリップボードから画像を貼り付け
   */
  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      let imageBlob: Blob | null = null;

      for (const item of clipboardItems) {
        const imageType = item.types.find((type) => type.startsWith("image/"));
        if (imageType !== undefined) {
          imageBlob = await item.getType(imageType);
          break;
        }
      }

      if (!imageBlob) {
        toast.error(IMAGE_LIBRARY_NO_IMAGE_IN_CLIPBOARD);
        return;
      }

      const file = new File([imageBlob], "pasted-image.png", {
        type: imageBlob.type,
      });

      clearError();
      const imageIds = await uploadImages([file]);

      if (imageIds.length > 0) {
        toast.success(IMAGE_LIBRARY_PASTE_SUCCESS);
      }
    } catch (caughtError) {
      if (
        caughtError instanceof DOMException &&
        caughtError.name === "NotAllowedError"
      ) {
        toast.error(IMAGE_LIBRARY_CLIPBOARD_NOT_ALLOWED);
      } else {
        toast.error(IMAGE_LIBRARY_PASTE_FAILED);
      }
    }
  }, [uploadImages, clearError]);

  /**
   * カメラボタンクリック
   */
  const handleCameraClick = useCallback(() => {
    cameraInputRef.current?.click();
  }, []);

  /**
   * カメラ撮影後の処理
   */
  const handleCameraCapture = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const { files } = e.target;
      const file = files?.[0];
      if (!file) return;

      if (file.type.startsWith("video/")) {
        toast.error(IMAGE_LIBRARY_VIDEO_NOT_SUPPORTED);
        e.target.value = "";
        return;
      }

      clearError();
      const imageIds = await uploadImages([file]);

      if (imageIds.length > 0) {
        toast.success(IMAGE_LIBRARY_CAMERA_SUCCESS);
      }

      e.target.value = "";
    },
    [uploadImages, clearError]
  );

  // ========== Render ==========

  return (
    <div className="flex h-full flex-col">
      {/* 警告ラベル（デスクトップ・モバイル両対応） */}
      <p className="text-xs text-amber-600 font-medium shrink-0 mb-4 flex items-center justify-center gap-1">
        <AlertTriangle className="size-3.5" />
        {IMAGE_UPLOAD_WARNING}
      </p>

      {/* 固定エリア（上部ボタン類） */}
      <div className="shrink-0 space-y-4">
        {/* カード追加ボタン（デスクトップのみ表示） */}
        {!isMobile && (
          <Button
            variant="outline"
            className="w-full gap-2 bg-white"
            onClick={handleAddCardClick}
            disabled={!canAddCard}
          >
            <Plus className="size-4" />
            {BUTTON_ADD_CARD}
          </Button>
        )}

        {/* 非表示のファイル選択input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={IMAGE_ACCEPT_TYPES}
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        {/* 非表示のカメラ撮影input（モバイル専用） */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleCameraCapture}
        />

        {/* 画像追加エリア（レスポンシブ） */}
        {isMobile ? (
          <>
            {/* モバイル: ボタン → フィルター の順 */}
            <MobileImageButtons
              onGalleryClick={handleDropzoneClick}
              onCameraClick={handleCameraClick}
              onPasteClick={() => void handlePasteFromClipboard()}
              isUploading={isUploading}
            />
            <CategoryFilter
              value={filterValue}
              onValueChange={handleFilterChange}
              disabled={isBulkDeleteMode}
            />
          </>
        ) : (
          <>
            {/* デスクトップ: フィルター → ドロップゾーン の順 */}
            <CategoryFilter
              value={filterValue}
              onValueChange={handleFilterChange}
              disabled={isBulkDeleteMode}
            />
            <ImageDropzone
              isDragOver={isDragOver}
              isUploading={isUploading}
              onClick={handleDropzoneClick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            />
          </>
        )}

        {/* エラー表示 */}
        {error !== null && error !== "" ? (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            <p className="line-clamp-3 whitespace-pre-wrap">{error}</p>
          </div>
        ) : null}
      </div>

      {/* サムネイルグリッド */}
      <ThumbnailGrid
        images={filteredImages}
        thumbnailUrls={allThumbnailUrls}
        isBulkDeleteMode={isBulkDeleteMode}
        selectedImageIds={selectedImageIds}
        isMobile={isMobile}
        draggingImageId={draggingImageId}
        isFiltered={isFiltered}
        onDragStart={handleThumbnailDragStart}
        onDragEnd={handleThumbnailDragEnd}
        onToggleSelection={handleToggleImageSelection}
        onImageSelect={handleImageSelect}
        onDelete={(imageId) => void handleDeleteImage(imageId)}
      />

      {/* まとめて削除コントロール */}
      <BulkDeleteControls
        isBulkDeleteMode={isBulkDeleteMode}
        selectedCount={selectedImageIds.size}
        imageCount={imageCount}
        importedImageCount={importedImageCount}
        isFiltered={isFiltered}
        onToggleBulkDeleteMode={handleToggleBulkDeleteMode}
        onDeleteSelected={() => void handleDeleteSelectedImages()}
        onDeleteDisplayed={() => void handleDeleteDisplayedImages()}
      />
    </div>
  );
}
