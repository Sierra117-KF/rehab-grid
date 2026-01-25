/**
 * usePdfWorker フックのユニットテスト
 *
 * Web Worker を使用した PDF 生成フックのテスト。
 * jsdom 環境では Worker がサポートされないため、モックを使用。
 */

import { WORKER_ERROR_MESSAGE } from "@rehab-grid/core/lib/constants";
import { type PdfGenerationData, type PdfWorkerResponse } from "@rehab-grid/core/types";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * モック Worker インスタンスの型定義
 */
type MockWorkerInstanceType = {
  onmessage: ((event: MessageEvent<PdfWorkerResponse>) => void) | null;
  onerror: ((error: ErrorEvent) => void) | null;
  postMessage: ReturnType<typeof vi.fn>;
  terminate: ReturnType<typeof vi.fn>;
  simulateMessage: (data: PdfWorkerResponse) => void;
  simulateError: (message?: string) => void;
};

/**
 * vi.hoisted でモック関数を事前定義
 */
const { MockWorkerClass, mockWorkerInstance } = vi.hoisted(() => {
  // Worker インスタンスを保持（テスト間で参照可能にする）
  let currentInstance: MockWorkerInstanceType | null = null;

  /**
   * モック Worker クラス
   *
   * テスト内から onmessage/onerror をトリガーできるようにする
   */
  class MockWorkerClassImpl implements MockWorkerInstanceType {
    onmessage: ((event: MessageEvent<PdfWorkerResponse>) => void) | null = null;
    onerror: ((error: ErrorEvent) => void) | null = null;
    postMessage = vi.fn();
    terminate = vi.fn();

    constructor() {
      // eslint-disable-next-line @typescript-eslint/no-this-alias -- モックインスタンスを保持するため必要
      currentInstance = this;
    }

    /** Worker からのメッセージをシミュレート */
    simulateMessage(data: PdfWorkerResponse): void {
      if (this.onmessage) {
        const event = new MessageEvent<PdfWorkerResponse>("message", { data });
        this.onmessage(event);
      }
    }

    /** Worker エラーをシミュレート */
    simulateError(message?: string): void {
      if (this.onerror) {
        const event = new ErrorEvent("error", { message });
        this.onerror(event);
      }
    }
  }

  return {
    MockWorkerClass: MockWorkerClassImpl,
    mockWorkerInstance: () => currentInstance,
  };
});

// グローバル Worker をモック
vi.stubGlobal("Worker", MockWorkerClass);

// usePdfWorker のインポート（Worker モック後）
import { usePdfWorker } from "@rehab-grid/core/hooks/usePdfWorker";

/**
 * テスト用の PdfGenerationData を生成
 */
function createTestData(
  overrides: Partial<PdfGenerationData> = {}
): PdfGenerationData {
  return {
    meta: {
      version: "1.0.0",
      title: "テストプロジェクト",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      projectType: "training",
    },
    layoutType: "grid2",
    items: [],
    images: {},
    ...overrides,
  };
}

describe("usePdfWorker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("初期状態", () => {
    it("フック初期化時、状態が正しい", () => {
      const { result } = renderHook(() => usePdfWorker());

      expect(result.current.state).toEqual({
        isGenerating: false,
        progress: 0,
        error: null,
      });
    });

    it("generatePdf と cancel が関数として提供される", () => {
      const { result } = renderHook(() => usePdfWorker());

      expect(typeof result.current.generatePdf).toBe("function");
      expect(typeof result.current.cancel).toBe("function");
    });
  });

  describe("PDF生成成功フロー", () => {
    it("generatePdf 呼び出しで isGenerating が true になる", () => {
      const { result } = renderHook(() => usePdfWorker());
      const data = createTestData();

      // generatePdf を呼び出し（Promise は resolve しない）
      act(() => {
        void result.current.generatePdf(data);
      });

      expect(result.current.state.isGenerating).toBeTruthy();
      expect(result.current.state.progress).toBe(0);
      expect(result.current.state.error).toBeNull();
    });

    it("Worker に正しい形式でメッセージが送信される", () => {
      const { result } = renderHook(() => usePdfWorker());
      const data = createTestData();

      act(() => {
        void result.current.generatePdf(data);
      });

      const worker = mockWorkerInstance();
      expect(worker?.postMessage).toHaveBeenCalledWith({
        type: "generate",
        data,
      });
    });

    it("進捗イベントで progress が更新される", () => {
      const { result } = renderHook(() => usePdfWorker());
      const data = createTestData();

      act(() => {
        void result.current.generatePdf(data);
      });

      const worker = mockWorkerInstance();

      // 進捗 50% をシミュレート
      act(() => {
        worker?.simulateMessage({ type: "progress", progress: 50 });
      });

      expect(result.current.state.progress).toBe(50);
      expect(result.current.state.isGenerating).toBeTruthy();
    });

    it("成功レスポンスで Blob が返り、状態がリセットされる", async () => {
      const { result } = renderHook(() => usePdfWorker());
      const data = createTestData();
      const expectedBlob = new Blob(["test"], { type: "application/pdf" });

      let resolvedBlob: Blob | null = null;

      act(() => {
        void result.current.generatePdf(data).then((blob) => {
          resolvedBlob = blob;
        });
      });

      const worker = mockWorkerInstance();

      // 成功レスポンスをシミュレート
      act(() => {
        worker?.simulateMessage({ type: "success", blob: expectedBlob });
      });

      await waitFor(() => {
        expect(resolvedBlob).toBe(expectedBlob);
      });

      expect(result.current.state).toEqual({
        isGenerating: false,
        progress: 100,
        error: null,
      });
    });
  });

  describe("PDF生成エラーフロー", () => {
    it("Worker からのエラーレスポンスで error が設定される", async () => {
      const { result } = renderHook(() => usePdfWorker());
      const data = createTestData();
      const errorMessage = "PDF生成に失敗しました";

      let rejectedError: Error | null = null;

      act(() => {
        void result.current.generatePdf(data).catch((error: unknown) => {
          if (error instanceof Error) {
            rejectedError = error;
          }
        });
      });

      const worker = mockWorkerInstance();

      // エラーレスポンスをシミュレート
      act(() => {
        worker?.simulateMessage({ type: "error", message: errorMessage });
      });

      await waitFor(() => {
        expect(rejectedError?.message).toBe(errorMessage);
      });

      expect(result.current.state).toEqual({
        isGenerating: false,
        progress: 0,
        error: errorMessage,
      });
    });

    it("Worker の onerror で WORKER_ERROR_MESSAGE が設定される", async () => {
      const { result } = renderHook(() => usePdfWorker());
      const data = createTestData();

      let rejectedError: Error | null = null;

      act(() => {
        void result.current.generatePdf(data).catch((error: unknown) => {
          if (error instanceof Error) {
            rejectedError = error;
          }
        });
      });

      const worker = mockWorkerInstance();

      // Worker エラーをシミュレート（message なし）
      act(() => {
        worker?.simulateError();
      });

      await waitFor(() => {
        expect(rejectedError?.message).toBe(WORKER_ERROR_MESSAGE);
      });

      expect(result.current.state.error).toBe(WORKER_ERROR_MESSAGE);
      expect(result.current.state.isGenerating).toBeFalsy();
    });

    it("Worker の onerror でカスタムメッセージが設定される", async () => {
      const { result } = renderHook(() => usePdfWorker());
      const data = createTestData();
      const customError = "カスタムエラー";

      let rejectedError: Error | null = null;

      act(() => {
        void result.current.generatePdf(data).catch((error: unknown) => {
          if (error instanceof Error) {
            rejectedError = error;
          }
        });
      });

      const worker = mockWorkerInstance();

      // Worker エラーをシミュレート（カスタムメッセージ付き）
      act(() => {
        worker?.simulateError(customError);
      });

      await waitFor(() => {
        expect(rejectedError?.message).toBe(customError);
      });

      expect(result.current.state.error).toBe(customError);
    });
  });

  describe("キャンセルフロー", () => {
    it("cancel() で Worker が terminate される", () => {
      const { result } = renderHook(() => usePdfWorker());
      const data = createTestData();

      act(() => {
        void result.current.generatePdf(data);
      });

      const worker = mockWorkerInstance();

      act(() => {
        result.current.cancel();
      });

      expect(worker?.terminate).toHaveBeenCalledTimes(1);
    });

    it("進行中の Promise が null で解決される", async () => {
      const { result } = renderHook(() => usePdfWorker());
      const data = createTestData();

      let resolvedBlob: Blob | null | undefined;

      act(() => {
        void result.current.generatePdf(data).then((blob) => {
          resolvedBlob = blob;
        });
      });

      act(() => {
        result.current.cancel();
      });

      await waitFor(() => {
        expect(resolvedBlob).toBeNull();
      });
    });

    it("cancel 後、状態がリセットされる", () => {
      const { result } = renderHook(() => usePdfWorker());
      const data = createTestData();

      act(() => {
        void result.current.generatePdf(data);
      });

      act(() => {
        result.current.cancel();
      });

      expect(result.current.state).toEqual({
        isGenerating: false,
        progress: 0,
        error: null,
      });
    });

    it("Worker が未初期化の状態で cancel を呼んでもエラーにならない", () => {
      const { result } = renderHook(() => usePdfWorker());

      // generatePdf を呼ばずに cancel を呼ぶ
      expect(() => {
        act(() => {
          result.current.cancel();
        });
      }).not.toThrow();
    });
  });

  describe("Worker 再利用", () => {
    it("複数回 generatePdf を呼んでも Worker インスタンスが再利用される", () => {
      const { result } = renderHook(() => usePdfWorker());
      const data = createTestData();
      const blob = new Blob(["test"], { type: "application/pdf" });

      // 1回目の呼び出し
      act(() => {
        void result.current.generatePdf(data);
      });

      const firstWorker = mockWorkerInstance();

      // 成功で完了
      act(() => {
        firstWorker?.simulateMessage({ type: "success", blob });
      });

      // 2回目の呼び出し
      act(() => {
        void result.current.generatePdf(data);
      });

      const secondWorker = mockWorkerInstance();

      // 同じインスタンスが使用される
      expect(firstWorker).toBe(secondWorker);
      expect(firstWorker?.postMessage).toHaveBeenCalledTimes(2);
    });

    it("cancel 後は新しい Worker が作成される", () => {
      const { result } = renderHook(() => usePdfWorker());
      const data = createTestData();

      // 1回目の呼び出し
      act(() => {
        void result.current.generatePdf(data);
      });

      const firstWorker = mockWorkerInstance();

      // キャンセル
      act(() => {
        result.current.cancel();
      });

      // 2回目の呼び出し
      act(() => {
        void result.current.generatePdf(data);
      });

      const secondWorker = mockWorkerInstance();

      // 新しいインスタンスが作成される（terminate 後は workerRef が null になるため）
      expect(firstWorker?.terminate).toHaveBeenCalled();
      expect(secondWorker).not.toBe(firstWorker);
    });
  });
});
