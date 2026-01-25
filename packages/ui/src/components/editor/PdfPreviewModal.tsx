"use client";

import {
  PDF_DOWNLOAD_LABEL,
  PDF_PREVIEW_FULLSCREEN_TOOLTIP,
  PDF_PREVIEW_TITLE,
} from "@rehab-grid/core/lib/constants";
import { cn } from "@rehab-grid/core/lib/utils";
import { Button } from "@rehab-grid/ui/components/wrapped/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@rehab-grid/ui/components/wrapped/Dialog";
import { Download, Maximize2, Minimize2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ==============================================================================
// 型定義
// ==============================================================================

/**
 * PdfPreviewModalコンポーネントのProps
 */
type PdfPreviewModalProps = {
  /** モーダルの開閉状態 */
  open: boolean;
  /** 開閉状態変更ハンドラ */
  onOpenChange: (open: boolean) => void;
  /** 表示するPDFのBlob */
  pdfBlob: Blob | null;
  /** ダウンロードボタン押下時のハンドラ */
  onDownload: () => void;
  /** ファイル名（ダウンロード時に使用） */
  filename?: string;
};

// ==============================================================================
// メインコンポーネント
// ==============================================================================

/**
 * PDFプレビューモーダルコンポーネント
 *
 * PDFをiframeで表示し、リサイズ・フルスクリーン・ダウンロード機能を提供
 */
export function PdfPreviewModal({
  open,
  onOpenChange: handleOpenChange,
  pdfBlob,
  onDownload: handleDownload,
}: PdfPreviewModalProps) {
  // フルスクリーン状態
  const [isFullscreen, setIsFullscreen] = useState(false);

  // コンテンツ要素のref（フルスクリーン対象）
  const contentRef = useRef<HTMLDivElement>(null);

  // BlobからObject URLを生成
  // useEffect例外: リソース解放はシステム制御として許可されている
  const pdfUrl = useMemo(() => {
    if (!pdfBlob) return null;
    return URL.createObjectURL(pdfBlob);
  }, [pdfBlob]);

  // Object URLのクリーンアップ
  // useEffect例外: リソース解放はシステム制御として許可されている
  useEffect(() => {
    const currentUrl = pdfUrl;

    return () => {
      if (currentUrl !== null) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [pdfUrl]);

  // フルスクリーン状態の監視
  // useEffect例外: ブラウザAPIのイベントリスナー登録はシステム制御として許可
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement !== null);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  /**
   * ダイアログの開閉状態変更ハンドラ
   *
   * モーダルが閉じられたときに内部状態をリセットし、親に通知
   */
  const handleDialogOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        // モーダルが閉じられたときにフルスクリーン状態をリセット
        setIsFullscreen(false);
      }
      handleOpenChange(newOpen);
    },
    [handleOpenChange]
  );

  /**
   * フルスクリーントグル
   */
  const handleToggleFullscreen = useCallback(async () => {
    if (!contentRef.current) return;

    try {
      if (document.fullscreenElement !== null) {
        await document.exitFullscreen();
      } else {
        await contentRef.current.requestFullscreen();
      }
    } catch {
      // フルスクリーン非対応ブラウザでのエラーを無視
    }
  }, []);

  /**
   * モーダルを閉じる
   */
  const handleClose = useCallback(() => {
    handleDialogOpenChange(false);
  }, [handleDialogOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        ref={contentRef}
        showCloseButton={false}
        aria-describedby={undefined}
        className={cn(
          "flex flex-col gap-0 p-0",
          // フルスクリーン時: translateを無効化し全画面表示
          isFullscreen &&
            "inset-0 translate-x-0 translate-y-0 max-w-none h-full w-full rounded-none",
          // 通常時: リサイズ可能な初期サイズ
          !isFullscreen &&
            "w-[800px] h-[80vh] resize overflow-hidden min-w-[400px] min-h-[300px] max-w-[95vw] max-h-[95vh]"
        )}
      >
        {/* ヘッダー */}
        <DialogHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
          <DialogTitle className="text-base font-medium">
            {PDF_PREVIEW_TITLE}
          </DialogTitle>

          {/* アクションボタン群 */}
          <div className="flex items-center gap-1">
            {/* フルスクリーンボタン */}
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => void handleToggleFullscreen()}
              title={PDF_PREVIEW_FULLSCREEN_TOOLTIP}
            >
              {isFullscreen ? (
                <Minimize2 className="size-4" />
              ) : (
                <Maximize2 className="size-4 rotate-45" />
              )}
            </Button>

            {/* ダウンロードボタン */}
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={handleDownload}
              title={PDF_DOWNLOAD_LABEL}
            >
              <Download className="size-4" />
            </Button>

            {/* 閉じるボタン */}
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={handleClose}
              title="閉じる"
            >
              <X className="size-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* PDFビューア */}
        <div className="flex-1 overflow-hidden bg-muted">
          {pdfUrl !== null ? (
            <iframe
              src={pdfUrl}
              className="size-full border-0"
              title={PDF_PREVIEW_TITLE}
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              PDFを読み込み中...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
