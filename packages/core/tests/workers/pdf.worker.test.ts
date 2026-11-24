/**
 * pdf.worker.ts のユニットテスト
 *
 * フォント登録とメッセージ処理（進捗通知・Blob化・エラー通知）を検証する。
 * ドキュメント要素の組み立ては tests/lib/pdf/ で検証する。
 */

import { type PdfGenerationData, type PdfWorkerRequest } from "@rehab-grid/core/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// モック設定
// ============================================================================

const {
  mockBuildPdfDocument,
  mockFontLoad,
  mockFontRegister,
  mockFontRegisterHyphenationCallback,
  mockPdf,
  mockPostMessage,
  mockToBlob,
} = vi.hoisted(() => {
  const toBlob = vi.fn();
  return {
    mockBuildPdfDocument: vi.fn(() => "built-document"),
    mockFontLoad: vi.fn(),
    mockFontRegister: vi.fn(),
    mockFontRegisterHyphenationCallback: vi.fn(),
    mockPdf: vi.fn(() => ({ toBlob })),
    mockPostMessage: vi.fn(),
    mockToBlob: toBlob,
  };
});

vi.mock("@react-pdf/renderer", () => ({
  Font: {
    register: mockFontRegister,
    load: mockFontLoad,
    registerHyphenationCallback: mockFontRegisterHyphenationCallback,
  },
  pdf: mockPdf,
}));

vi.mock("@rehab-grid/core/lib/pdf", () => ({
  buildPdfDocument: mockBuildPdfDocument,
}));

/** Worker コンテキストの self */
const workerSelf: {
  location: { origin: string };
  postMessage: typeof mockPostMessage;
  onmessage: ((event: MessageEvent<PdfWorkerRequest>) => Promise<void>) | null;
} = {
  location: { origin: "http://localhost:3000" },
  postMessage: mockPostMessage,
  onmessage: null,
};
vi.stubGlobal("self", workerSelf);

import { registerFonts } from "@/workers/pdf.worker";

// ============================================================================
// ヘルパー
// ============================================================================

const TEST_DATA: PdfGenerationData = {
  meta: {
    version: "1.0.0",
    createdAt: "2025-01-15T00:00:00.000Z",
    updatedAt: "2025-01-15T00:00:00.000Z",
    title: "テスト",
    projectType: "training",
  },
  settings: { layoutType: "grid2", themeColor: "#3b82f6" },
  items: [],
  images: {},
};

/**
 * Worker モジュールを読み込み直し、onmessage を返す
 *
 * フォント登録済みフラグはモジュール内に保持されるため、テストごとに初期化する
 */
async function loadFreshWorker(): Promise<
  (data: PdfGenerationData) => Promise<void>
> {
  vi.resetModules();
  await import("@/workers/pdf.worker");
  const handler = workerSelf.onmessage;
  if (!handler) throw new Error("onmessage が登録されていません");
  return async (data) => {
    await handler(
      new MessageEvent<PdfWorkerRequest>("message", {
        data: { type: "generate", data },
      })
    );
  };
}

function postedMessages(): unknown[] {
  return mockPostMessage.mock.calls.map((call: unknown[]) => call[0]);
}

// ============================================================================
// テスト
// ============================================================================

describe("pdf.worker.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFontLoad.mockResolvedValue(undefined);
    mockToBlob.mockResolvedValue(new Blob(["test"], { type: "application/pdf" }));
  });

  describe("registerFonts", () => {
    it("Worker のオリジンを付けた絶対URLでフォントが登録される", async () => {
      await registerFonts();

      expect(mockFontRegister).toHaveBeenCalledWith({
        family: "NotoSansJP",
        fonts: [
          {
            src: "http://localhost:3000/fonts/NotoSansJP-Regular.woff",
            fontWeight: "normal",
          },
          {
            src: "http://localhost:3000/fonts/NotoSansJP-Bold.woff",
            fontWeight: "bold",
          },
        ],
      });
    });

    it("CJK文字を含む単語は文字単位で分割され、半角のみの単語は分割されない", async () => {
      await registerFonts();

      const callback = mockFontRegisterHyphenationCallback.mock.calls[0]?.[0] as
        | ((word: string) => string[])
        | undefined;
      expect(callback).toBeDefined();
      expect(callback!("日本語")).toEqual(["日", "", "本", "", "語", ""]);
      expect(callback!("Hello")).toEqual(["Hello"]);
    });

    it("通常・太字の両ウェイトが事前ロードされる", async () => {
      await registerFonts();

      expect(mockFontLoad).toHaveBeenCalledWith({
        fontFamily: "NotoSansJP",
        fontWeight: 400,
      });
      expect(mockFontLoad).toHaveBeenCalledWith({
        fontFamily: "NotoSansJP",
        fontWeight: 700,
      });
    });

    it.each([
      [new Error("Network error"), "Network error"],
      ["Unknown error", "Unknown error"],
    ])("読み込み失敗時は理由付きでエラーを投げる（%s）", async (reason, text) => {
      mockFontLoad.mockRejectedValueOnce(reason);

      await expect(registerFonts()).rejects.toThrow(
        `フォントの読み込みに失敗しました: ${text}`
      );
    });
  });

  describe("onmessage", () => {
    it("ドキュメントを組み立ててBlob化し、進捗と成功を通知する", async () => {
      const send = await loadFreshWorker();

      await send(TEST_DATA);

      expect(mockBuildPdfDocument).toHaveBeenCalledWith(TEST_DATA);
      expect(mockPdf).toHaveBeenCalledWith("built-document");
      expect(postedMessages()).toEqual([
        { type: "progress", progress: 10 },
        { type: "progress", progress: 30 },
        { type: "progress", progress: 50 },
        { type: "progress", progress: 100 },
        { type: "success", blob: expect.any(Blob) },
      ]);
    });

    it("2回目以降の生成ではフォントを再登録しない", async () => {
      const send = await loadFreshWorker();

      await send(TEST_DATA);
      mockPostMessage.mockClear();
      await send(TEST_DATA);

      expect(mockFontRegister).toHaveBeenCalledTimes(1);
      expect(postedMessages()).not.toContainEqual({
        type: "progress",
        progress: 10,
      });
    });

    it("フォント読み込みに失敗した場合はエラーを通知する", async () => {
      mockFontLoad.mockRejectedValueOnce(new Error("Network error"));
      const send = await loadFreshWorker();

      await send(TEST_DATA);

      expect(postedMessages()).toContainEqual({
        type: "error",
        message: "フォントの読み込みに失敗しました: Network error",
      });
      expect(mockPdf).not.toHaveBeenCalled();
    });

    it("Error 以外の失敗は既定のメッセージで通知する", async () => {
      mockToBlob.mockRejectedValueOnce("unknown");
      const send = await loadFreshWorker();

      await send(TEST_DATA);

      expect(postedMessages()).toContainEqual({
        type: "error",
        message: "PDF生成に失敗しました",
      });
    });
  });
});
