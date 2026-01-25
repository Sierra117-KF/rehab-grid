import { cn } from "@rehab-grid/core/lib/utils";
import * as React from "react";

/**
 * Cardコンポーネント
 * コンテンツをグループ化するカードコンテナ
 *
 * @param className - 追加のクラス名
 * @param props - div要素の属性
 * @returns カードコンテナ
 */
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border border-border/50 py-6 shadow-sm",
        className
      )}
      {...props}
    />
  );
}

/**
 * CardHeaderコンポーネント
 * カードのヘッダー部分
 *
 * @param className - 追加のクラス名
 * @param props - div要素の属性
 * @returns カードヘッダー
 */
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  );
}

/**
 * CardTitleコンポーネント
 * カードのタイトル
 *
 * @param className - 追加のクラス名
 * @param props - div要素の属性
 * @returns カードタイトル
 */
function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  );
}

/**
 * CardDescriptionコンポーネント
 * カードの説明テキスト
 *
 * @param className - 追加のクラス名
 * @param props - div要素の属性
 * @returns カード説明
 */
function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

/**
 * CardActionコンポーネント
 * カードヘッダー内のアクション領域
 *
 * @param className - 追加のクラス名
 * @param props - div要素の属性
 * @returns カードアクション
 */
function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  );
}

/**
 * CardContentコンポーネント
 * カードのメインコンテンツ領域
 *
 * @param className - 追加のクラス名
 * @param props - div要素の属性
 * @returns カードコンテンツ
 */
function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  );
}

/**
 * CardFooterコンポーネント
 * カードのフッター部分
 *
 * @param className - 追加のクラス名
 * @param props - div要素の属性
 * @returns カードフッター
 */
function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
