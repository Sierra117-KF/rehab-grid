/**
 * Dialogラッパーコンポーネント
 *
 * shadcn/ui の dialog をプロジェクト用にラップ
 * z-indexをMobileSidebar（z-[70]）より高く設定し、
 * モバイル版サイドバー上でもダイアログが最前面に表示されるようにする
 */

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@rehab-grid/core/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@rehab-grid/ui/components/ui/dialog";
import { XIcon } from "lucide-react";
import * as React from "react";

/**
 * DialogOverlay コンポーネント
 *
 * z-indexをz-[80]にオーバーライドしてMobileSidebarより上に表示
 */
function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-80 bg-black/50",
        className,
      )}
      {...props}
    />
  );
}

/**
 * DialogContent コンポーネント
 *
 * z-indexをz-[80]にオーバーライドしてMobileSidebarより上に表示
 * 内部でカスタムDialogOverlayを使用
 */
function DialogContent({
  className,
  children,
  showCloseButton = true,
  preventDismiss = false,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
  /** true の場合、外側クリックや Escape キーでモーダルが閉じない */
  preventDismiss?: boolean;
}) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-80 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 outline-none sm:max-w-lg",
          className,
        )}
        onInteractOutside={(e) => {
          if (preventDismiss) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (preventDismiss) e.preventDefault();
        }}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

/**
 * DialogFooter コンポーネント
 *
 * モバイル版でもデスクトップ版と同様に横並び・右寄せにオーバーライド
 */
function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-row justify-end gap-2", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
