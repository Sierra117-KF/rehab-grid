"use client";

/**
 * クリップボード画像貼り付けフック
 *
 * グローバル paste イベントを監視し、画像がペーストされたら
 * 圧縮・保存してコールバックを呼び出す
 *
 * @remarks
 * useEffect の例外的使用（グローバルイベントリスナー登録）
 * CLAUDE.md の規約に従い、カスタムフックに隠蔽
 */

import { saveImage } from "@rehab-grid/core/lib/db";
import { processAndSaveImage } from "@rehab-grid/core/utils/image";
import { nanoid } from "nanoid";
import { useCallback, useEffect } from "react";

/**
 * usePasteImage フックのオプション
 */
type UsePasteImageOptions = {
  /** 画像貼り付け成功時のコールバック（画像IDを受け取る） */
  onPaste: (imageId: string) => void;
  /** フックの有効/無効（デフォルト: true） */
  enabled?: boolean;
};

/**
 * クリップボードから画像アイテムを抽出
 *
 * @param items - DataTransferItemList
 * @returns 画像ファイル、または null
 */
function extractImageFromClipboard(items: DataTransferItemList): File | null {
  for (const item of items) {
    if (item.type.startsWith("image/")) {
      return item.getAsFile();
    }
  }
  return null;
}

/**
 * クリップボード画像貼り付けフック
 *
 * @param options - フックオプション
 *
 * @example
 * ```tsx
 * usePasteImage({
 *   onPaste: (imageId) => {
 *     const newItemId = addNewItem();
 *     updateItem(newItemId, { imageSource: imageId });
 *   },
 * });
 * ```
 */
export function usePasteImage({
  onPaste,
  enabled = true,
}: UsePasteImageOptions): void {
  /**
   * paste イベントハンドラ
   */
  const handlePaste = useCallback(
    async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      const file = extractImageFromClipboard(items);
      if (!file) {
        // 画像以外のデータは静かにスキップ
        return;
      }

      // 共通関数で画像処理を実行
      const result = await processAndSaveImage(
        file,
        () => nanoid(),
        async (id, blob) => saveImage(id, blob)
      );

      // 成功時のみコールバック呼び出し（エラー時は静かにスキップ）
      if (result.success) {
        onPaste(result.imageId);
      }
    },
    [onPaste]
  );

  /**
   * グローバル paste イベントリスナーの登録
   *
   * @remarks
   * useEffect の例外使用理由:
   * - グローバルイベントリスナーの登録/解除はライフサイクル管理が必要
   * - CLAUDE.md で許可された「サードパーティライブラリとの統合ブリッジ」に準ずる
   */
  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("paste", handlePaste);

    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, [enabled, handlePaste]);
}
