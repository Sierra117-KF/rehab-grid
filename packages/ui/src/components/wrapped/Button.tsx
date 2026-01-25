import { cn } from "@rehab-grid/core/lib/utils";
import {
  Button as UiButton,
  type buttonVariants,
} from "@rehab-grid/ui/components/ui/button";
import { type VariantProps } from "class-variance-authority";
import * as React from "react";

/**
 * Buttonコンポーネントのプロパティ
 * shadcn/uiのButtonPropsを継承し、asChildプロパティを追加しています。
 */
export type ButtonProps = {
  asChild?: boolean;
} & React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants>;

/**
 * プロジェクト固有のButtonラッパーコンポーネント
 *
 * shadcn/uiのButtonをベースに、プロジェクト全体の統一デザイン（角丸、カーソル、シャドウなど）を適用します。
 *
 * @param props - ButtonProps
 * @param ref - HTMLButtonElementへのref
 * @returns スタイル適用済みのButtonコンポーネント
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <UiButton
        ref={ref}
        variant={variant}
        className={cn(
          "cursor-pointer rounded-lg",
          variant === "default" &&
            "shadow-[0_0_20px_-5px_var(--color-primary)]",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
