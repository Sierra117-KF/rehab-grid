"use client";

/**
 * 画像アップロードフック
 *
 * 画像のバリデーション、圧縮、IndexedDB保存を行うカスタムフック
 */

import { saveImage } from "@rehab-grid/core/lib/db";
import {
  getFileNameWithoutExtension,
  processAndSaveImage,
} from "@rehab-grid/core/utils/image";
import { nanoid } from "nanoid";
import { useCallback, useState } from "react";

/**
 * アップロードフックの戻り値型
 */
type UseImageUploadReturn = {
  /** 単一画像をアップロード（成功時は画像ID、失敗時はnullを返す） */
  uploadImage: (file: File) => Promise<string | null>;
  /** 複数画像をアップロード（成功した画像のIDの配列を返す） */
  uploadImages: (files: FileList | File[]) => Promise<string[]>;
  /** アップロード中かどうか */
  isUploading: boolean;
  /** エラーメッセージ（エラーがない場合はnull） */
  error: string | null;
  /** エラーをクリア */
  clearError: () => void;
};

/**
 * 画像アップロードフック
 *
 * ファイル選択やドラッグ&ドロップで取得した画像を
 * 圧縮してIndexedDBに保存する機能を提供
 *
 * @returns アップロード関連の関数と状態
 *
 * @example
 * ```tsx
 * function ImageUploader() {
 *   const { uploadImage, isUploading, error } = useImageUpload();
 *
 *   const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
 *     const file = e.target.files?.[0];
 *     if (file) {
 *       const imageId = await uploadImage(file);
 *       if (imageId) {
 *         console.log('アップロード成功:', imageId);
 *       }
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <input type="file" onChange={handleFileChange} disabled={isUploading} />
 *       {error && <p>{error}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useImageUpload(): UseImageUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * エラーをクリア
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * 単一画像をアップロード
   */
  const uploadImage = useCallback(
    async (file: File): Promise<string | null> => {
      setError(null);
      setIsUploading(true);

      try {
        const fileName = getFileNameWithoutExtension(file.name);
        const result = await processAndSaveImage(
          file,
          () => nanoid(),
          async (id, blob) => saveImage(id, blob, fileName)
        );

        if (result.success) {
          return result.imageId;
        } else {
          setError(result.error);
          return null;
        }
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  /**
   * 複数画像をアップロード
   */
  const uploadImages = useCallback(
    async (files: FileList | File[]): Promise<string[]> => {
      setError(null);
      setIsUploading(true);

      const uploadedIds: string[] = [];
      const errors: string[] = [];

      try {
        const fileArray = Array.from(files);

        for (const file of fileArray) {
          const fileName = getFileNameWithoutExtension(file.name);
          const result = await processAndSaveImage(
            file,
            () => nanoid(),
            async (id, blob) => saveImage(id, blob, fileName)
          );

          if (result.success) {
            uploadedIds.push(result.imageId);
          } else {
            errors.push(`${file.name}: ${result.error}`);
          }
        }

        // 一部失敗した場合はエラーメッセージを設定
        if (errors.length > 0) {
          setError(errors.join("\n"));
        }

        return uploadedIds;
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  return {
    uploadImage,
    uploadImages,
    isUploading,
    error,
    clearError,
  };
}
