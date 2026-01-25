import { cn } from "@rehab-grid/core/lib/utils";
import { Input as UiInput } from "@rehab-grid/ui/components/ui/input";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

/**
 * Inputコンポーネントのバリアント定義
 *
 * class-variance-authorityを使用して、スタイルバリアントを管理します。
 * orangeバリアントはglobals.cssで定義されたカスタムクラスを使用して
 * shadcn/uiのデフォルトスタイルを確実に上書きします。
 */
const inputVariants = cva("bg-white", {
  variants: {
    /**
     * カラーバリアント
     * - default: デフォルトスタイル（shadcn/uiのスタイルをそのまま使用）
     * - orange: オレンジ色のボーダー（プロジェクトタイトル編集用、globals.cssで定義）
     */
    variant: {
      default: "",
      // globals.cssで定義されたカスタムクラスを使用（詳細度で上書き）
      orange: "input-orange",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

/**
 * Inputコンポーネントのプロパティ
 *
 * shadcn/uiのInputPropsを継承し、バリアントプロパティを追加しています。
 */
export type InputProps = React.ComponentProps<"input"> &
  VariantProps<typeof inputVariants>;

/**
 * プロジェクト固有のInputラッパーコンポーネント
 *
 * shadcn/uiのInputをベースに、プロジェクト全体の統一デザインを適用します。
 * `variant`プロパティでスタイルバリアントを切り替えられます。
 *
 * @example
 * // デフォルトスタイル
 * <Input type="text" />
 *
 * // オレンジボーダー（プロジェクトタイトル編集用）
 * <Input type="text" variant="orange" />
 *
 * @param props - InputProps（variant含む）
 * @returns スタイル適用済みのInputコンポーネント
 */
function Input({ className, variant, ...props }: InputProps) {
  return (
    <UiInput className={cn(inputVariants({ variant }), className)} {...props} />
  );
}

export { Input, inputVariants };
