"use client";

/**
 * メディアクエリ監視フック
 *
 * 画面幅を監視し、指定したメディアクエリにマッチするかどうかを返す
 */

import { useCallback, useSyncExternalStore } from "react";

/** モバイル判定のブレークポイント（Tailwindのmd未満） */
const MOBILE_BREAKPOINT = 768;

/**
 * メディアクエリにマッチするかどうかを監視するフック
 *
 * @param query - メディアクエリ文字列（例: "(max-width: 767px)"）
 * @returns マッチしているかどうか（SSR/ハイドレーション中はundefined）
 *
 * @remarks
 * useSyncExternalStoreを使用して外部ストア（matchMedia）との同期を行う
 * SSR対応のため、getServerSnapshotでundefinedを返し、ハイドレーションエラーを防止
 *
 * @example
 * ```tsx
 * const isMobile = useMediaQuery("(max-width: 767px)");
 * // isMobileがundefinedの間はデフォルト表示を使用
 * ```
 */
export function useMediaQuery(query: string): boolean | undefined {
  // subscribe: matchMediaの変更イベントを購読
  const subscribe = useCallback(
    (callback: () => void) => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener("change", callback);
      return () => {
        mediaQuery.removeEventListener("change", callback);
      };
    },
    [query]
  );

  // getSnapshot: クライアント側での現在の値を取得
  const getSnapshot = useCallback(() => {
    return window.matchMedia(query).matches;
  }, [query]);

  // getServerSnapshot: SSR時はundefinedを返す（ハイドレーションエラー防止）
  const getServerSnapshot = useCallback(() => {
    return undefined;
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * モバイル判定フック（タブレット対応）
 *
 * 以下のいずれかの条件を満たす場合にモバイルと判定:
 * - 画面幅768px未満（従来のスマートフォン判定）
 * - タッチデバイス（pointer: coarse）（タブレット含む）
 *
 * @returns モバイルモードかどうか（SSR/ハイドレーション中はundefined）
 *
 * @remarks
 * タッチデバイス判定は画面幅に依存せず、pointer: coarse のみで判定。
 * これにより10インチタブレットの横向き（~1280px）でもモバイル版UIを表示。
 *
 * @example
 * ```tsx
 * const isMobile = useIsMobile();
 * if (isMobile) {
 *   // モバイル・タブレット専用のUIを表示
 * }
 * ```
 */
export function useIsMobile(): boolean | undefined {
  // 狭い画面（従来のモバイル判定）
  const isNarrowScreen = useMediaQuery(
    `(max-width: ${String(MOBILE_BREAKPOINT - 1)}px)`
  );

  // タッチデバイス判定（画面幅に関係なく）
  const isTouchDevice = useMediaQuery("(pointer: coarse)");

  // SSR/ハイドレーション中はundefinedを返す
  if (isNarrowScreen === undefined || isTouchDevice === undefined) {
    return undefined;
  }

  return isNarrowScreen || isTouchDevice;
}
