"use client";

import { cn } from "@rehab-grid/core/lib/utils";
import { Button } from "@rehab-grid/ui/components/wrapped/Button";
import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

/**
 * MobileDropdownMenu のプロパティ
 */
type MobileDropdownMenuProps = {
  /** メニューの開閉状態 */
  open: boolean;
  /** 閉じるときのコールバック */
  onClose: () => void;
  /** メニューのタイトル */
  title: string;
  /** メニューのコンテンツ */
  children: React.ReactNode;
};

/**
 * モバイル用ドロップダウンメニューコンポーネント
 *
 * フローティングヘッダー直下からスライドダウンするメニュー。
 * オーバーレイ背景付きで、閉じるアニメーションに対応。
 *
 * @example
 * ```tsx
 * <MobileDropdownMenu
 *   open={isMenuOpen}
 *   onClose={() => setIsMenuOpen(false)}
 *   title="メニュー"
 * >
 *   <MenuContent />
 * </MobileDropdownMenu>
 * ```
 */
export function MobileDropdownMenu({
  open,
  onClose,
  title,
  children,
}: MobileDropdownMenuProps) {
  /** 閉じるアニメーション中かどうか */
  const [isClosing, setIsClosing] = useState(false);

  /**
   * 閉じる処理を開始（アニメーション付き）
   */
  const handleClose = useCallback(() => {
    setIsClosing(true);
  }, []);

  /**
   * メニュー内クリック時のイベント伝播を停止
   */
  const handleMenuClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  }, []);

  /**
   * メニューのアニメーション終了時の処理
   */
  const handleAnimationEnd = useCallback(
    (e?: React.AnimationEvent) => {
      // バブリング防止 (内部要素のアニメーション終了を無視)
      if (e && e.target !== e.currentTarget) return;

      if (isClosing) {
        setIsClosing(false);
        onClose();
      }
    },
    [isClosing, onClose]
  );

  // 【ガイドライン例外: UIシステム制御】
  // フォールバック: onAnimationEnd が発火しないケース（ブラウザ依存、アニメーション競合等）への安全策
  // useEffect を使用する理由: コンポーネントのアンマウント時にタイマーを確実にクリーンアップするため
  useEffect(() => {
    if (!isClosing) return;

    const timer = setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 400); // アニメーション時間(300ms) + バッファ

    return () => clearTimeout(timer);
  }, [isClosing, onClose]);

  // 開いていない、かつ閉じるアニメーション中でもない場合は非表示
  if (!open && !isClosing) return null;

  return (
    <div
      className="fixed inset-0 z-60 desktop:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-dropdown-menu-title"
    >
      {/* オーバーレイ背景（全画面） */}
      <div
        className={cn(
          "absolute inset-0 bg-black/50 transition-opacity duration-200",
          isClosing && "opacity-0"
        )}
        onClick={handleClose}
        aria-hidden="true"
        data-testid="mobile-dropdown-menu-overlay"
      />

      {/* メニュー本体（画面上端からスライドダウン） */}
      <div
        className={cn(
          // 位置・サイズ（ヘッダーと同じ上端位置）
          "absolute left-3 right-3 top-3",
          // flexbox構造（MobileSidebarと同じパターン）
          "flex flex-col",
          // 最大高さ
          "max-h-[calc(100vh-6rem)]",
          // 背景・角丸・シャドウ
          "rounded-xl bg-background shadow-2xl",
          // アニメーション
          isClosing ? "animate-menu-slide-up" : "animate-menu-slide-down"
        )}
        onClick={handleMenuClick}
        onAnimationEnd={handleAnimationEnd}
        data-testid="mobile-dropdown-menu-body"
      >
        {/* ヘッダー */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/40 px-4">
          <h2
            id="mobile-dropdown-menu-title"
            className="text-base font-semibold text-foreground"
          >
            {title}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-foreground"
            onClick={handleClose}
            aria-label="メニューを閉じる"
          >
            <X className="size-5" />
          </Button>
        </div>

        {/* コンテンツエリア（スクロール可能） */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
          {children}
        </div>
      </div>
    </div>
  );
}
