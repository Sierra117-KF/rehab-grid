"use client";

/**
 * Object URL管理フック
 *
 * Blobから生成したObject URLのライフサイクルを管理し、
 * メモリリークを防止するカスタムフック
 *
 * @remarks
 * このフックはuseEffectを使用していますが、正当な例外ケースに該当します（システム制御：リソースの解放）
 * URL.createObjectURLで生成したURLは明示的にrevokeObjectURLで
 * 解放しないとメモリリークを引き起こすため、useEffectによる
 * クリーンアップが必要です。
 */

import { type BlobRecord } from "@rehab-grid/core/types";
import { useEffect, useMemo, useRef } from "react";

/**
 * BlobレコードからObject URLのマップを生成・管理するフック
 *
 * @param records - idとblobを持つレコードの配列（undefinedも許容）
 * @returns 画像IDからObject URLへのMapオブジェクト
 *
 * @example
 * ```tsx
 * function ImageGallery() {
 *   const images = useLiveQuery(() => db.images.toArray());
 *   const imageUrls = useObjectUrls(images);
 *
 *   return (
 *     <div>
 *       {images?.map((img) => (
 *         <img key={img.id} src={imageUrls.get(img.id)} alt="" />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useObjectUrls(
  records: BlobRecord[] | undefined
): Map<string, string> {
  // 前回のURLマップを保持するref（クリーンアップ用）
  const prevUrlMapRef = useRef<Map<string, string>>(new Map());

  // レコードからURLマップを生成（毎回新しいURLを作成）
  const urlMap = useMemo(() => {
    const newMap = new Map<string, string>();

    if (!records) {
      return newMap;
    }

    for (const record of records) {
      newMap.set(record.id, URL.createObjectURL(record.blob));
    }

    return newMap;
  }, [records]);

  // URLの解放のみを行う（生成ではなくクリーンアップのみ）
  // useEffect例外: リソース解放はシステム制御として許可されている
  useEffect(() => {
    const currentMap = urlMap;
    const prevMap = prevUrlMapRef.current;
    const currentIds = new Set(currentMap.keys());

    // 前回のマップにあって今回のマップにないURLを解放
    for (const [id, url] of prevMap) {
      if (!currentIds.has(id)) {
        URL.revokeObjectURL(url);
      }
    }

    // 再利用されなかった前回のURLを解放（新しいURLが生成された場合）
    for (const [id, url] of prevMap) {
      const currentUrl = currentMap.get(id);
      if (currentUrl !== undefined && currentUrl !== url) {
        URL.revokeObjectURL(url);
      }
    }

    // 現在のマップをrefに保存
    prevUrlMapRef.current = new Map(currentMap);

    // クリーンアップ: コンポーネントのアンマウント時に全URLを解放
    return () => {
      for (const url of prevUrlMapRef.current.values()) {
        URL.revokeObjectURL(url);
      }
      prevUrlMapRef.current = new Map();
    };
  }, [urlMap]);

  return urlMap;
}
