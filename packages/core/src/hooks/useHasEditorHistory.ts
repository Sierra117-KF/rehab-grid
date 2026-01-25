"use client";

/**
 * エディタ使用履歴判定フック
 *
 * LocalStorageの免責モーダル同意タイムスタンプを確認し、
 * 過去にエディタを使用したことがあるかどうかを判定する
 */

import { SECURITY_DISCLAIMER_TIMESTAMP_KEY } from "@rehab-grid/core/lib/constants";
import { useSyncExternalStore } from "react";

/**
 * LocalStorage変更の購読関数
 *
 * @remarks
 * 今回のユースケースでは、ページロード時の初期値のみを使用するため、
 * リアルタイムの変更監視は不要。空のクリーンアップ関数を返す。
 *
 * @param _callback - useSyncExternalStoreから渡されるコールバック（使用しない）
 * @returns クリーンアップ関数
 */
function subscribe(_callback: () => void) {
  // LocalStorageの変更は同一タブ内で発生しないため、監視不要
  return () => undefined;
}

/**
 * クライアント側でのスナップショット取得
 *
 * @returns LocalStorageにタイムスタンプが存在する場合はtrue
 */
function getSnapshot(): boolean {
  return localStorage.getItem(SECURITY_DISCLAIMER_TIMESTAMP_KEY) !== null;
}

/**
 * サーバー側でのスナップショット取得
 *
 * @remarks
 * SSR時はLocalStorageにアクセスできないため、常にfalseを返す。
 * これにより、初期表示では「指導箋を作成」が表示され、
 * クライアントサイドで履歴がある場合のみ「続きから再開」に変わる。
 *
 * @returns 常にfalse
 */
function getServerSnapshot(): boolean {
  return false;
}

/**
 * エディタ使用履歴があるかどうかを判定するフック
 *
 * @returns エディタ使用履歴がある場合はtrue
 *
 * @remarks
 * useSyncExternalStoreを使用してSSR対応を実現。
 * useMediaQuery.tsと同じアプローチで一貫性を保持。
 *
 * @example
 * ```tsx
 * const hasHistory = useHasEditorHistory();
 * const buttonLabel = hasHistory ? "続きから再開" : "指導箋を作成";
 * ```
 */
export function useHasEditorHistory(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
