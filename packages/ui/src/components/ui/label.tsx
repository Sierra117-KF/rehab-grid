"use client";

import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@rehab-grid/core/lib/utils";
import * as React from "react";

/**
 * スタイル付きLabelコンポーネント
 *
 * shadcn/uiのLabelをベースに、アクセシビリティを考慮したフォームラベルを提供します。
 */
function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Label };
