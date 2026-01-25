"use client";

import { cn } from "@rehab-grid/core/lib/utils";
import { Button } from "@rehab-grid/ui/components/wrapped/Button";
import { X } from "lucide-react";
import { useCallback, useState } from "react";

/**
 * モバイルサイドバーの Props
 */
type MobileSidebarProps = {
  /** サイドバーの開閉状態 */
  open: boolean;
  /** 閉じるときのコールバック */
  onClose: () => void;
  /** サイドバーの表示位置 */
  side: "left" | "right";
  /** サイドバーのタイトル */
  title: string;
  /** サイドバーのコンテンツ */
  children: React.ReactNode;
};

/**
 * モバイル用サイドバーコンポーネント
 *
 * 左または右からスライドインするオーバーレイサイドバー。
 * モバイル専用のUIとして、画像ライブラリやプロパティパネルを表示する。
 *
 * @param props - サイドバーの props
 *
 * @example
 * ```tsx
 * <MobileSidebar
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   side="left"
 *   title="画像ライブラリ"
 * >
 *   <ImageLibraryPanel />
 * </MobileSidebar>
 * ```
 */
export function MobileSidebar({
  open,
  onClose,
  side,
  title,
  children,
}: MobileSidebarProps) {
  /** 閉じるアニメーション中かどうか */
  const [isClosing, setIsClosing] = useState(false);

  /**
   * 閉じる処理を開始（アニメーション付き）
   */
  const handleClose = useCallback(() => {
    setIsClosing(true);
  }, []);

  /**
   * サイドバー内クリック時のイベント伝播を停止
   */
  const handleSidebarClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
    },
    []
  );

  /**
   * サイドバーのアニメーション終了時の処理
   */
  const handleAnimationEnd = useCallback(() => {
    if (isClosing) {
      setIsClosing(false);
      onClose();
    }
  }, [isClosing, onClose]);

  // 開いていない、かつ閉じるアニメーション中でもない場合は非表示
  if (!open && !isClosing) return null;

  return (
    <div
      className="fixed inset-0 z-[70]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-sidebar-title"
    >
      {/* オーバーレイ背景 */}
      <div
        className={cn(
          "absolute inset-0 bg-black/50 transition-opacity duration-300",
          isClosing && "opacity-0"
        )}
        onClick={handleClose}
        aria-hidden="true"
        data-testid="mobile-sidebar-overlay"
      />

      {/* サイドバー本体 */}
      <div
        className={cn(
          // 位置・サイズ
          "absolute flex flex-col",
          "w-[85%] max-w-[320px]",
          // 上下左右から離す + 角丸
          "top-3 bottom-3 rounded-xl",
          side === "left" ? "left-3" : "right-3",
          // 背景・シャドウ
          "bg-background shadow-2xl",
          // アニメーション
          side === "left"
            ? isClosing
              ? "animate-slide-out-left"
              : "animate-slide-in-left"
            : isClosing
              ? "animate-slide-out-right"
              : "animate-slide-in-right"
        )}
        onClick={handleSidebarClick}
        onAnimationEnd={handleAnimationEnd}
        data-testid="mobile-sidebar-body"
      >
        {/* ヘッダー */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/40 px-4">
          <h2
            id="mobile-sidebar-title"
            className="text-base font-semibold text-foreground"
          >
            {title}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-foreground"
            onClick={handleClose}
            aria-label="サイドバーを閉じる"
          >
            <X className="size-5" />
          </Button>
        </div>

        {/* コンテンツエリア */}
        <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">{children}</div>
      </div>
    </div>
  );
}
