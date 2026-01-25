import { usePasteImage } from "@rehab-grid/core/hooks/usePasteImage";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * モック関数の定義
 *
 * @remarks
 * vi.hoisted でモック関数を事前定義し、vi.mock 内で参照できるようにする
 */
const { mockProcessAndSaveImage } = vi.hoisted(() => ({
  mockProcessAndSaveImage: vi.fn(),
}));

vi.mock("@/utils/image", () => ({
  processAndSaveImage: mockProcessAndSaveImage,
}));

/**
 * テスト用の画像ファイルを生成
 */
function createTestImageFile(): File {
  return new File(["dummy"], "test.png", { type: "image/png" });
}

/**
 * テスト用の DataTransferItem を生成
 */
function createDataTransferItem(
  type: string,
  file: File | null
): DataTransferItem {
  return {
    kind: file ? "file" : "string",
    type,
    getAsFile: () => file,
    getAsString: vi.fn(),
    webkitGetAsEntry: vi.fn(),
  };
}

/**
 * テスト用の DataTransferItemList を生成
 */
function createDataTransferItemList(
  items: DataTransferItem[]
): DataTransferItemList {
  const list = {
    length: items.length,
    add: vi.fn(),
    clear: vi.fn(),
    remove: vi.fn(),
    [Symbol.iterator]: function* () {
      for (const item of items) yield item;
    },
  } as unknown as DataTransferItemList;

  // インデックスアクセス用のプロパティを追加
  items.forEach((item, index) => {
    Object.defineProperty(list, index, { value: item, enumerable: true });
  });

  return list;
}

/**
 * 空の FileList を生成（jsdom環境用）
 */
function createEmptyFileList(): FileList {
  return {
    length: 0,
    item: () => null,
    [Symbol.iterator]: function* () {
      // empty iterator
    },
  } as unknown as FileList;
}

/**
 * テスト用の ClipboardEvent を生成
 */
function createPasteEvent(items: DataTransferItem[] | null): ClipboardEvent {
  if (items === null) {
    // clipboardData が null のケース
    const event = new Event("paste", { bubbles: true }) as ClipboardEvent;
    Object.defineProperty(event, "clipboardData", { value: null });
    return event;
  }

  const clipboardData = {
    items: createDataTransferItemList(items),
    files: createEmptyFileList(),
    types: [],
    getData: vi.fn(),
    setData: vi.fn(),
    clearData: vi.fn(),
    setDragImage: vi.fn(),
    dropEffect: "none" as const,
    effectAllowed: "none" as const,
  } as unknown as DataTransfer;

  const event = new Event("paste", { bubbles: true }) as ClipboardEvent;
  Object.defineProperty(event, "clipboardData", { value: clipboardData });
  return event;
}

describe("usePasteImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("基本動作", () => {
    it("画像をペーストすると onPaste コールバックが正しいimageIdで呼ばれる", async () => {
      const onPaste = vi.fn();
      const testImageId = "test-image-123";
      const imageFile = createTestImageFile();

      mockProcessAndSaveImage.mockResolvedValue({
        success: true,
        imageId: testImageId,
      });

      renderHook(() => usePasteImage({ onPaste }));

      const pasteEvent = createPasteEvent([
        createDataTransferItem("image/png", imageFile),
      ]);

      await act(async () => {
        document.dispatchEvent(pasteEvent);
        await Promise.resolve(); // マイクロタスクをフラッシュ
      });

      expect(mockProcessAndSaveImage).toHaveBeenCalledTimes(1);
      expect(mockProcessAndSaveImage).toHaveBeenCalledWith(
        imageFile,
        expect.any(Function), // nanoid
        expect.any(Function) // saveImage
      );
      expect(onPaste).toHaveBeenCalledTimes(1);
      expect(onPaste).toHaveBeenCalledWith(testImageId);
    });

    it("テキストをペーストすると onPaste は呼ばれない", async () => {
      const onPaste = vi.fn();

      renderHook(() => usePasteImage({ onPaste }));

      const pasteEvent = createPasteEvent([
        createDataTransferItem("text/plain", null),
      ]);

      await act(async () => {
        document.dispatchEvent(pasteEvent);
        await Promise.resolve();
      });

      expect(mockProcessAndSaveImage).not.toHaveBeenCalled();
      expect(onPaste).not.toHaveBeenCalled();
    });

    it("clipboardData が null の場合は静かにスキップ", async () => {
      const onPaste = vi.fn();

      renderHook(() => usePasteImage({ onPaste }));

      const pasteEvent = createPasteEvent(null);

      await act(async () => {
        document.dispatchEvent(pasteEvent);
        await Promise.resolve();
      });

      expect(mockProcessAndSaveImage).not.toHaveBeenCalled();
      expect(onPaste).not.toHaveBeenCalled();
    });

    it("複数のアイテムがある場合、最初の画像を処理する", async () => {
      const onPaste = vi.fn();
      const testImageId = "first-image";
      const imageFile = createTestImageFile();

      mockProcessAndSaveImage.mockResolvedValue({
        success: true,
        imageId: testImageId,
      });

      renderHook(() => usePasteImage({ onPaste }));

      const pasteEvent = createPasteEvent([
        createDataTransferItem("text/plain", null),
        createDataTransferItem("image/png", imageFile),
        createDataTransferItem("image/jpeg", createTestImageFile()),
      ]);

      await act(async () => {
        document.dispatchEvent(pasteEvent);
        await Promise.resolve();
      });

      // 最初の画像のみ処理される
      expect(mockProcessAndSaveImage).toHaveBeenCalledTimes(1);
      expect(mockProcessAndSaveImage).toHaveBeenCalledWith(
        imageFile,
        expect.any(Function),
        expect.any(Function)
      );
      expect(onPaste).toHaveBeenCalledWith(testImageId);
    });
  });

  describe("enabled オプション", () => {
    it("enabled 未指定（デフォルト true）のとき、pasteイベントリスナーが登録される", async () => {
      const onPaste = vi.fn();
      const imageFile = createTestImageFile();

      mockProcessAndSaveImage.mockResolvedValue({
        success: true,
        imageId: "test-id",
      });

      renderHook(() => usePasteImage({ onPaste }));

      const pasteEvent = createPasteEvent([
        createDataTransferItem("image/png", imageFile),
      ]);

      await act(async () => {
        document.dispatchEvent(pasteEvent);
        await Promise.resolve();
      });

      expect(onPaste).toHaveBeenCalledTimes(1);
    });

    it("enabled=false のとき、pasteイベントリスナーが登録されない", async () => {
      const onPaste = vi.fn();
      const imageFile = createTestImageFile();

      renderHook(() => usePasteImage({ onPaste, enabled: false }));

      const pasteEvent = createPasteEvent([
        createDataTransferItem("image/png", imageFile),
      ]);

      await act(async () => {
        document.dispatchEvent(pasteEvent);
        await Promise.resolve();
      });

      expect(mockProcessAndSaveImage).not.toHaveBeenCalled();
      expect(onPaste).not.toHaveBeenCalled();
    });

    it("enabled が true→false に変わるとリスナーが解除される", async () => {
      const onPaste = vi.fn();
      const imageFile = createTestImageFile();

      mockProcessAndSaveImage.mockResolvedValue({
        success: true,
        imageId: "test-id",
      });

      const { rerender } = renderHook(
        ({ enabled }) => usePasteImage({ onPaste, enabled }),
        { initialProps: { enabled: true } }
      );

      // 最初は有効
      const pasteEvent1 = createPasteEvent([
        createDataTransferItem("image/png", imageFile),
      ]);
      await act(async () => {
        document.dispatchEvent(pasteEvent1);
        await Promise.resolve();
      });
      expect(onPaste).toHaveBeenCalledTimes(1);

      // enabled を false に変更
      rerender({ enabled: false });

      // ペーストしても反応しない
      const pasteEvent2 = createPasteEvent([
        createDataTransferItem("image/png", imageFile),
      ]);
      await act(async () => {
        document.dispatchEvent(pasteEvent2);
        await Promise.resolve();
      });
      expect(onPaste).toHaveBeenCalledTimes(1); // 回数は増えない
    });

    it("enabled が false→true に変わるとリスナーが再登録される", async () => {
      const onPaste = vi.fn();
      const imageFile = createTestImageFile();

      mockProcessAndSaveImage.mockResolvedValue({
        success: true,
        imageId: "test-id",
      });

      const { rerender } = renderHook(
        ({ enabled }) => usePasteImage({ onPaste, enabled }),
        { initialProps: { enabled: false } }
      );

      // 最初は無効
      const pasteEvent1 = createPasteEvent([
        createDataTransferItem("image/png", imageFile),
      ]);
      await act(async () => {
        document.dispatchEvent(pasteEvent1);
        await Promise.resolve();
      });
      expect(onPaste).not.toHaveBeenCalled();

      // enabled を true に変更
      rerender({ enabled: true });

      // ペーストが処理される
      const pasteEvent2 = createPasteEvent([
        createDataTransferItem("image/png", imageFile),
      ]);
      await act(async () => {
        document.dispatchEvent(pasteEvent2);
        await Promise.resolve();
      });
      expect(onPaste).toHaveBeenCalledTimes(1);
    });
  });

  describe("エラーハンドリング", () => {
    it("processAndSaveImage が失敗した場合、onPaste は呼ばれない", async () => {
      const onPaste = vi.fn();
      const imageFile = createTestImageFile();

      mockProcessAndSaveImage.mockResolvedValue({
        success: false,
        error: "圧縮に失敗しました",
      });

      renderHook(() => usePasteImage({ onPaste }));

      const pasteEvent = createPasteEvent([
        createDataTransferItem("image/png", imageFile),
      ]);

      await act(async () => {
        document.dispatchEvent(pasteEvent);
        await Promise.resolve();
      });

      expect(mockProcessAndSaveImage).toHaveBeenCalledTimes(1);
      expect(onPaste).not.toHaveBeenCalled();
    });
  });

  describe("クリーンアップ", () => {
    it("アンマウント時にイベントリスナーが解除される", async () => {
      const onPaste = vi.fn();
      const imageFile = createTestImageFile();

      mockProcessAndSaveImage.mockResolvedValue({
        success: true,
        imageId: "test-id",
      });

      const { unmount } = renderHook(() => usePasteImage({ onPaste }));

      // アンマウント
      unmount();

      // ペーストしても反応しない
      const pasteEvent = createPasteEvent([
        createDataTransferItem("image/png", imageFile),
      ]);
      await act(async () => {
        document.dispatchEvent(pasteEvent);
        await Promise.resolve();
      });

      expect(mockProcessAndSaveImage).not.toHaveBeenCalled();
      expect(onPaste).not.toHaveBeenCalled();
    });
  });
});
