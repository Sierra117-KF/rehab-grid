"use client";

/**
 * PDF生成Worker呼び出しフック
 *
 * Web Workerを使用してメインスレッドをブロックせずにPDFを生成
 */

import { WORKER_ERROR_MESSAGE } from "@rehab-grid/core/lib/constants";
import {
  type PdfGenerationData,
  type PdfGenerationState,
  type PdfWorkerResponse,
} from "@rehab-grid/core/types";
import { useCallback, useRef, useState } from "react";

/**
 * usePdfWorker フックの戻り値
 */
type UsePdfWorkerReturn = {
  /** 生成状態 */
  state: PdfGenerationState;
  /** PDF生成を開始 */
  generatePdf: (data: PdfGenerationData) => Promise<Blob | null>;
  /** 生成をキャンセル */
  cancel: () => void;
};

/**
 * PDF生成Workerを呼び出すカスタムフック
 *
 * @example
 * ```tsx
 * const { state, generatePdf, cancel } = usePdfWorker();
 *
 * const handleExport = async () => {
 *   const blob = await generatePdf({
 *     meta: project.meta,
 *     layoutType: project.settings.layoutType,
 *     items: project.items,
 *     images: imageDataUrls,
 *   });
 *   if (blob) {
 *     downloadBlob(blob, "training-sheet.pdf");
 *   }
 * };
 * ```
 */
export function usePdfWorker(): UsePdfWorkerReturn {
  const [state, setState] = useState<PdfGenerationState>({
    isGenerating: false,
    progress: 0,
    error: null,
  });

  const workerRef = useRef<Worker | null>(null);
  const resolveRef = useRef<((blob: Blob | null) => void) | null>(null);
  const rejectRef = useRef<((error: Error) => void) | null>(null);

  /**
   * Workerを初期化
   */
  const initWorker = useCallback(() => {
    if (workerRef.current) {
      return workerRef.current;
    }

    const worker = new Worker(
      new URL("../workers/pdf.worker.ts", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = (event: MessageEvent<PdfWorkerResponse>) => {
      const response = event.data;

      switch (response.type) {
        case "progress":
          setState((prev) => ({ ...prev, progress: response.progress }));
          break;

        case "success":
          setState({ isGenerating: false, progress: 100, error: null });
          resolveRef.current?.(response.blob);
          resolveRef.current = null;
          break;

        case "error":
          setState({
            isGenerating: false,
            progress: 0,
            error: response.message,
          });
          rejectRef.current?.(new Error(response.message));
          resolveRef.current = null;
          rejectRef.current = null;
          break;
      }
    };

    worker.onerror = (error) => {
      const errorMessage = error.message || WORKER_ERROR_MESSAGE;
      setState({
        isGenerating: false,
        progress: 0,
        error: errorMessage,
      });
      rejectRef.current?.(new Error(errorMessage));
      resolveRef.current = null;
      rejectRef.current = null;
    };

    workerRef.current = worker;
    return worker;
  }, []);

  /**
   * PDF生成を開始
   */
  const generatePdf = useCallback(
    async (data: PdfGenerationData): Promise<Blob | null> => {
      return new Promise((resolve, reject) => {
        setState({ isGenerating: true, progress: 0, error: null });
        resolveRef.current = resolve;
        rejectRef.current = reject;

        const worker = initWorker();
        worker.postMessage({ type: "generate", data });
      });
    },
    [initWorker]
  );

  /**
   * 生成をキャンセル
   */
  const cancel = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setState({ isGenerating: false, progress: 0, error: null });
    resolveRef.current?.(null);
    resolveRef.current = null;
    rejectRef.current = null;
  }, []);

  return { state, generatePdf, cancel };
}
