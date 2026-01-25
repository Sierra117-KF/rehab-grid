"use client";

/**
 * キャンバス表示用の画像URLを生成するフック
 *
 * IndexedDBから使用中の画像を取得し、サンプル画像と統合して
 * キャンバス表示用のURL Mapを生成する
 */

import { getSampleImagePath, isSampleImage } from "@rehab-grid/core/lib/constants";
import { db } from "@rehab-grid/core/lib/db";
import { type EditorItem } from "@rehab-grid/core/types";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";

import { useObjectUrls } from "./useObjectUrls";

/**
 * キャンバス表示用の画像URLを生成するフック
 *
 * @param items - エディタアイテムの配列
 * @returns 画像IDからURLへのMapオブジェクト（IndexedDB画像 + サンプル画像）
 *
 * @remarks
 * このフックは以下の処理を行います：
 * 1. アイテムから使用中の画像IDを抽出（サンプル画像は除外）
 * 2. IndexedDBからBlobとして画像を取得（useLiveQueryでリアクティブに）
 * 3. BlobをObject URLに変換（useObjectUrlsでメモリリーク防止）
 * 4. サンプル画像のパスを追加してマージ
 *
 * @example
 * ```tsx
 * function Canvas() {
 *   const items = useEditorStore((state) => state.items);
 *   const cardImageUrls = useCanvasImages(items);
 *
 *   return (
 *     <div>
 *       {items.map((item) => (
 *         <img key={item.id} src={cardImageUrls.get(item.imageSource)} alt="" />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useCanvasImages(items: EditorItem[]): Map<string, string> {
  // カードで使用されている画像IDを抽出（サンプル画像はIndexedDBから取得しない）
  const usedDbImageIds = useMemo(
    () =>
      items
        .map((item) => item.imageSource)
        .filter(Boolean)
        .filter((id) => !isSampleImage(id)),
    [items]
  );

  // カードで使用されている画像を取得（IndexedDBから、リアクティブ）
  const usedImages = useLiveQuery(async () => {
    if (usedDbImageIds.length === 0) return [];
    return db.images.where("id").anyOf(usedDbImageIds).toArray();
  }, [usedDbImageIds]);

  // 画像IDからURLへのマッピングを生成（メモリリーク防止フック使用）
  const dbImageUrls = useObjectUrls(usedImages);

  // キャンバス表示用の画像URL（サンプル画像対応）
  const cardImageUrls = useMemo(() => {
    const combined = new Map(dbImageUrls);

    // 使用中のサンプル画像のURLを追加
    for (const item of items) {
      if (isSampleImage(item.imageSource)) {
        const path = getSampleImagePath(item.imageSource);
        if (path !== undefined) {
          combined.set(item.imageSource, path);
        }
      }
    }

    return combined;
  }, [dbImageUrls, items]);

  return cardImageUrls;
}
