/**
 * Toaster ラッパーコンポーネント
 *
 * sonner の Toaster をプロジェクト用にラップ
 */

"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * Toast通知を表示するためのコンテナコンポーネント
 *
 * @remarks
 * アプリケーションのルートレイアウトに配置して使用
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        className: "border border-border bg-background text-foreground",
      }}
    />
  );
}
