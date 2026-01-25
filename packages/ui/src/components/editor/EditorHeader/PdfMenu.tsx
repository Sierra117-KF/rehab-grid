"use client";

import {
  PDF_DOWNLOAD_LABEL,
  PDF_GENERATING_SHORT,
  PDF_MENU_LABEL,
  PDF_PREVIEW_LABEL,
} from "@rehab-grid/core/lib/constants";
import { Button } from "@rehab-grid/ui/components/wrapped/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@rehab-grid/ui/components/wrapped/DropdownMenu";
import { Download, Eye, FileDown, Loader2 } from "lucide-react";

/**
 * PdfMenuコンポーネントのProps
 */
export type PdfMenuProps = {
  onPreview: () => void;
  onDownload: () => void;
  isGenerating: boolean;
  disabled: boolean;
  /** モバイル・タブレット環境かどうか（trueの場合プレビューを非表示） */
  isMobile?: boolean;
};

/**
 * PDFメニューコンポーネント
 *
 * プレビュー/ダウンロードのドロップダウンメニューを提供します。
 */
export function PdfMenu({
  onPreview: handlePreview,
  onDownload: handleDownload,
  isGenerating,
  disabled,
  isMobile = false,
}: PdfMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="default"
          size="sm"
          className="gap-2"
          disabled={disabled || isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileDown className="size-4" />
          )}
          <span className="hidden desktop:inline">
            {isGenerating ? PDF_GENERATING_SHORT : PDF_MENU_LABEL}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[70]">
        {/* モバイル・タブレットではプレビュー非対応（iframeでPDF表示不可のため） */}
        {!isMobile && (
          <DropdownMenuItem onClick={handlePreview} disabled={isGenerating}>
            <Eye className="mr-2 size-4 text-sky-500" />
            <span>{PDF_PREVIEW_LABEL}</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleDownload} disabled={isGenerating}>
          <Download className="mr-2 size-4 text-amber-500" />
          <span>{PDF_DOWNLOAD_LABEL}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
