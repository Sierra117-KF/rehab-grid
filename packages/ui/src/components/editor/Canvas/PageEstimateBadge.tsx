"use client";

/**
 * PDF の A4 ページ数の目安
 *
 * キャンバスは可変幅のグリッドで PDF と文字サイズの体系も違うため、
 * PDF が何ページになるかの見積もりをキャンバス上部に出す。
 */

import {
  createPageEstimateCardDetail,
  createPageEstimateCheckTableDetail,
  createPageEstimateLabel,
  PAGE_ESTIMATE_DESCRIPTION,
} from "@rehab-grid/core/lib/constants";
import { type PdfLayoutEstimate } from "@rehab-grid/core/lib/pdf/layout";
import { cn } from "@rehab-grid/core/lib/utils";
import { Files } from "lucide-react";

/**
 * PageEstimateBadge コンポーネントの Props
 */
type PageEstimateBadgeProps = {
  /** PDF のページ収容の見積もり */
  estimate: PdfLayoutEstimate;
};

/**
 * 2 ページ以上になるときの補足（どこから次のページになるか）
 *
 * @param estimate - PDF のページ収容の見積もり
 * @returns 補足の文言（1 ページに収まるときは null）
 */
function getDetail(estimate: PdfLayoutEstimate): string | null {
  const secondPageFirstCard = estimate.firstCardIndexByPage[1];
  if (secondPageFirstCard !== undefined) {
    return createPageEstimateCardDetail(secondPageFirstCard + 1);
  }
  if (estimate.checkTablePage !== null && estimate.checkTablePage > 1) {
    return createPageEstimateCheckTableDetail(estimate.checkTablePage);
  }
  return null;
}

/**
 * PDF の A4 ページ数の目安
 */
export function PageEstimateBadge({ estimate }: PageEstimateBadgeProps) {
  const isMultiPage = estimate.pageCount > 1;
  const detail = getDetail(estimate);

  return (
    <p
      data-testid="page-estimate"
      title={PAGE_ESTIMATE_DESCRIPTION}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs",
        isMultiPage
          ? "bg-amber-50 font-medium text-amber-800"
          : "bg-card/60 text-muted-foreground"
      )}
    >
      <Files className="size-4 shrink-0" aria-hidden="true" />
      <span>{createPageEstimateLabel(estimate.pageCount)}</span>
      {detail !== null ? <span>（{detail}）</span> : null}
    </p>
  );
}
