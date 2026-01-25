import { cn } from "@rehab-grid/core/lib/utils";
import { Textarea as UiTextarea } from "@rehab-grid/ui/components/ui/textarea";
import * as React from "react";

/**
 * Textareaコンポーネントのプロパティ
 * shadcn/uiのTextareaPropsを継承しています。
 */
export type TextareaProps = React.ComponentProps<"textarea">;

/**
 * プロジェクト固有のTextareaラッパーコンポーネント
 *
 * shadcn/uiのTextareaをベースに、プロジェクト全体の統一デザイン（角丸など）を適用します。
 *
 * @param props - TextareaProps
 * @returns スタイル適用済みのTextareaコンポーネント
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <UiTextarea
        ref={ref}
        className={cn("rounded-lg bg-white", className)}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };
