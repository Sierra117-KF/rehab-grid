/**
 * AlertDialog ラッパーコンポーネント
 *
 * shadcn/ui の AlertDialog をプロジェクト用にラップ
 * z-indexをMobileSidebar（z-[70]）より高く設定し、
 * モバイル版サイドバー上でもダイアログが最前面に表示されるようにする
 */

import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { cn } from "@rehab-grid/core/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@rehab-grid/ui/components/ui/alert-dialog";
import { buttonVariants } from "@rehab-grid/ui/components/ui/button";
import * as React from "react";

/**
 * AlertDialogOverlay コンポーネント
 *
 * z-indexをz-[80]にオーバーライドしてMobileSidebarより上に表示
 */
function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      className={cn(
        "fixed inset-0 z-80 bg-black/80",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  );
}

/**
 * AlertDialogContent コンポーネント
 *
 * z-indexをz-[80]にオーバーライドしてMobileSidebarより上に表示
 * 内部でカスタムAlertDialogOverlayを使用
 */
function AlertDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        className={cn(
          "fixed left-1/2 top-1/2 z-80 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg duration-200",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
          "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
          "sm:rounded-lg",
          className
        )}
        {...props}
      />
    </AlertDialogPortal>
  );
}

/**
 * AlertDialogFooter コンポーネント
 *
 * モバイル版でもデスクトップ版と同様に横並び・右寄せにオーバーライド
 */
function AlertDialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn("flex flex-row justify-end gap-2", className)}
      {...props}
    />
  );
}

/**
 * AlertDialogCancel コンポーネント
 *
 * モバイル版の上マージンを削除してオーバーライド
 */
function AlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return (
    <AlertDialogPrimitive.Cancel
      className={cn(buttonVariants({ variant: "outline" }), className)}
      {...props}
    />
  );
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
};
