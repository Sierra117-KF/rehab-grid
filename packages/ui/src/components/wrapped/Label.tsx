"use client";

import type * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@rehab-grid/core/lib/utils";
import { Label as UiLabel } from "@rehab-grid/ui/components/ui/label";
import * as React from "react";

/**
 * Labelコンポーネントのプロパティ
 * shadcn/uiのLabelPropsを継承しています。
 */
export type LabelProps = React.ComponentProps<typeof LabelPrimitive.Root>;

/**
 * プロジェクト固有のLabelラッパーコンポーネント
 *
 * shadcn/uiのLabelをベースに、プロジェクト全体の統一デザインを適用します。
 * フォームラベル用に text-xs font-medium text-muted-foreground をデフォルトで適用。
 *
 * @param props - LabelProps
 * @returns スタイル適用済みのLabelコンポーネント
 */
function Label({ className, ...props }: LabelProps) {
  return (
    <UiLabel
      className={cn("text-xs font-medium text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Label };
