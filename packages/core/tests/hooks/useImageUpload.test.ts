import { useImageUpload } from "@rehab-grid/core/hooks/useImageUpload";
import { type ImageProcessResult } from "@rehab-grid/core/utils/image";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * モック関数の定義（vi.hoisted で事前定義）
 *
 * @remarks Vitest v4 では vi.mock 内でモック関数を参照するために vi.hoisted が必須
 */
const { mockProcessAndSaveImage } = vi.hoisted(() => ({
  mockProcessAndSaveImage: vi.fn<
    (
      file: File,
      generateId: () => string,
      save: (id: string, blob: Blob) => Promise<void>
    ) => Promise<ImageProcessResult>
  >(),
}));

vi.mock("@/utils/image", () => ({
  processAndSaveImage: mockProcessAndSaveImage,
  getFileNameWithoutExtension: (name: string) => {
    const lastDotIndex = name.lastIndexOf(".");
    if (lastDotIndex === -1 || lastDotIndex === 0) {
      return name;
    }
    return name.slice(0, lastDotIndex);
  },
}));

vi.mock("@/lib/db", () => ({
  saveImage: vi.fn(),
}));

vi.mock("nanoid", () => ({
  nanoid: () => "test-id-123",
}));

/**
 * テスト用のFileオブジェクトを生成
 */
function createTestFile(
  name: string,
  type = "image/jpeg",
  size = 1024
): File {
  const content = new Uint8Array(size);
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
}

describe("useImageUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("初期状態", () => {
    it("isUploading が false であること", () => {
      const { result } = renderHook(() => useImageUpload());

      expect(result.current.isUploading).toBeFalsy();
    });

    it("error が null であること", () => {
      const { result } = renderHook(() => useImageUpload());

      expect(result.current.error).toBeNull();
    });
  });

  describe("uploadImage（単一画像アップロード）", () => {
    it("成功時に画像IDを返す", async () => {
      mockProcessAndSaveImage.mockResolvedValueOnce({
        success: true,
        imageId: "generated-id-abc",
      });

      const { result } = renderHook(() => useImageUpload());
      const file = createTestFile("test.jpg");

      let imageId: string | null = null;
      await act(async () => {
        imageId = await result.current.uploadImage(file);
      });

      expect(imageId).toBe("generated-id-abc");
    });

    it("成功時に isUploading が false に戻る", async () => {
      mockProcessAndSaveImage.mockResolvedValueOnce({
        success: true,
        imageId: "test-id",
      });

      const { result } = renderHook(() => useImageUpload());
      const file = createTestFile("test.jpg");

      await act(async () => {
        await result.current.uploadImage(file);
      });

      expect(result.current.isUploading).toBeFalsy();
    });

    it("失敗時に null を返す", async () => {
      mockProcessAndSaveImage.mockResolvedValueOnce({
        success: false,
        error: "ファイルサイズが大きすぎます",
      });

      const { result } = renderHook(() => useImageUpload());
      const file = createTestFile("large.jpg");

      let imageId: string | null = null;
      await act(async () => {
        imageId = await result.current.uploadImage(file);
      });

      expect(imageId).toBeNull();
    });

    it("失敗時に error にエラーメッセージが設定される", async () => {
      mockProcessAndSaveImage.mockResolvedValueOnce({
        success: false,
        error: "対応していない画像形式です",
      });

      const { result } = renderHook(() => useImageUpload());
      const file = createTestFile("test.txt", "text/plain");

      await act(async () => {
        await result.current.uploadImage(file);
      });

      expect(result.current.error).toBe("対応していない画像形式です");
    });

    it("アップロード中に isUploading が true になる", async () => {
      let resolvePromise: (value: ImageProcessResult) => void;
      const pendingPromise = new Promise<ImageProcessResult>((resolve) => {
        resolvePromise = resolve;
      });
      mockProcessAndSaveImage.mockReturnValueOnce(pendingPromise);

      const { result } = renderHook(() => useImageUpload());
      const file = createTestFile("test.jpg");

      // アップロード開始（完了を待たない）
      act(() => {
        void result.current.uploadImage(file);
      });

      // アップロード中は isUploading が true
      await waitFor(() => {
        expect(result.current.isUploading).toBeTruthy();
      });

      // アップロード完了
      act(() => {
        resolvePromise!({ success: true, imageId: "test-id" });
      });

      // 完了後は isUploading が false
      await waitFor(() => {
        expect(result.current.isUploading).toBeFalsy();
      });
    });

    it("processAndSaveImage が正しい引数で呼ばれる", async () => {
      mockProcessAndSaveImage.mockResolvedValueOnce({
        success: true,
        imageId: "test-id",
      });

      const { result } = renderHook(() => useImageUpload());
      const file = createTestFile("squat_exercise.png", "image/png");

      await act(async () => {
        await result.current.uploadImage(file);
      });

      expect(mockProcessAndSaveImage).toHaveBeenCalledTimes(1);
      expect(mockProcessAndSaveImage).toHaveBeenCalledWith(
        file,
        expect.any(Function),
        expect.any(Function)
      );
    });
  });

  describe("uploadImages（複数画像アップロード）", () => {
    it("全て成功時に全てのIDの配列を返す", async () => {
      mockProcessAndSaveImage
        .mockResolvedValueOnce({ success: true, imageId: "id-1" })
        .mockResolvedValueOnce({ success: true, imageId: "id-2" })
        .mockResolvedValueOnce({ success: true, imageId: "id-3" });

      const { result } = renderHook(() => useImageUpload());
      const files = [
        createTestFile("image1.jpg"),
        createTestFile("image2.jpg"),
        createTestFile("image3.jpg"),
      ];

      let uploadedIds: string[] = [];
      await act(async () => {
        uploadedIds = await result.current.uploadImages(files);
      });

      expect(uploadedIds).toEqual(["id-1", "id-2", "id-3"]);
    });

    it("一部失敗時に成功したIDのみを返す", async () => {
      mockProcessAndSaveImage
        .mockResolvedValueOnce({ success: true, imageId: "id-1" })
        .mockResolvedValueOnce({
          success: false,
          error: "ファイルサイズが大きすぎます",
        })
        .mockResolvedValueOnce({ success: true, imageId: "id-3" });

      const { result } = renderHook(() => useImageUpload());
      const files = [
        createTestFile("image1.jpg"),
        createTestFile("large.jpg"),
        createTestFile("image3.jpg"),
      ];

      let uploadedIds: string[] = [];
      await act(async () => {
        uploadedIds = await result.current.uploadImages(files);
      });

      expect(uploadedIds).toEqual(["id-1", "id-3"]);
    });

    it("一部失敗時に error に失敗したファイルのエラーメッセージが設定される", async () => {
      mockProcessAndSaveImage
        .mockResolvedValueOnce({ success: true, imageId: "id-1" })
        .mockResolvedValueOnce({
          success: false,
          error: "ファイルサイズが大きすぎます",
        });

      const { result } = renderHook(() => useImageUpload());
      const files = [
        createTestFile("image1.jpg"),
        createTestFile("large.jpg"),
      ];

      await act(async () => {
        await result.current.uploadImages(files);
      });

      expect(result.current.error).toBe(
        "large.jpg: ファイルサイズが大きすぎます"
      );
    });

    it("複数失敗時に全てのエラーメッセージが改行で連結される", async () => {
      mockProcessAndSaveImage
        .mockResolvedValueOnce({
          success: false,
          error: "対応していない画像形式です",
        })
        .mockResolvedValueOnce({
          success: false,
          error: "ファイルサイズが大きすぎます",
        });

      const { result } = renderHook(() => useImageUpload());
      const files = [
        createTestFile("document.txt", "text/plain"),
        createTestFile("large.jpg"),
      ];

      await act(async () => {
        await result.current.uploadImages(files);
      });

      expect(result.current.error).toBe(
        "document.txt: 対応していない画像形式です\nlarge.jpg: ファイルサイズが大きすぎます"
      );
    });

    it("全て失敗時に空配列を返す", async () => {
      mockProcessAndSaveImage
        .mockResolvedValueOnce({
          success: false,
          error: "エラー1",
        })
        .mockResolvedValueOnce({
          success: false,
          error: "エラー2",
        });

      const { result } = renderHook(() => useImageUpload());
      const files = [createTestFile("file1.jpg"), createTestFile("file2.jpg")];

      let uploadedIds: string[] = [];
      await act(async () => {
        uploadedIds = await result.current.uploadImages(files);
      });

      expect(uploadedIds).toEqual([]);
    });

    it("Array.from で配列に変換される（FileList互換）", async () => {
      // 実装では Array.from(files) を使用しているため、
      // 配列を渡すテストで FileList 互換性も検証できる
      mockProcessAndSaveImage
        .mockResolvedValueOnce({ success: true, imageId: "id-1" })
        .mockResolvedValueOnce({ success: true, imageId: "id-2" });

      const { result } = renderHook(() => useImageUpload());
      const files = [createTestFile("image1.jpg"), createTestFile("image2.jpg")];

      let uploadedIds: string[] = [];
      await act(async () => {
        uploadedIds = await result.current.uploadImages(files);
      });

      expect(uploadedIds).toEqual(["id-1", "id-2"]);
      expect(mockProcessAndSaveImage).toHaveBeenCalledTimes(2);
    });
  });

  describe("clearError", () => {
    it("error を null にクリアする", async () => {
      mockProcessAndSaveImage.mockResolvedValueOnce({
        success: false,
        error: "エラーが発生しました",
      });

      const { result } = renderHook(() => useImageUpload());
      const file = createTestFile("test.jpg");

      // エラーを発生させる
      await act(async () => {
        await result.current.uploadImage(file);
      });
      expect(result.current.error).toBe("エラーが発生しました");

      // エラーをクリア
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("エッジケース", () => {
    it("空の配列でもエラーにならない", async () => {
      const { result } = renderHook(() => useImageUpload());

      let uploadedIds: string[] = [];
      await act(async () => {
        uploadedIds = await result.current.uploadImages([]);
      });

      expect(uploadedIds).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(result.current.isUploading).toBeFalsy();
    });

    it("連続アップロードでエラーがリセットされる", async () => {
      mockProcessAndSaveImage
        .mockResolvedValueOnce({
          success: false,
          error: "最初のエラー",
        })
        .mockResolvedValueOnce({
          success: true,
          imageId: "success-id",
        });

      const { result } = renderHook(() => useImageUpload());

      // 1回目：失敗
      await act(async () => {
        await result.current.uploadImage(createTestFile("fail.jpg"));
      });
      expect(result.current.error).toBe("最初のエラー");

      // 2回目：成功（エラーがリセットされる）
      await act(async () => {
        await result.current.uploadImage(createTestFile("success.jpg"));
      });
      expect(result.current.error).toBeNull();
    });

    it("uploadImages でも連続アップロード時にエラーがリセットされる", async () => {
      mockProcessAndSaveImage
        .mockResolvedValueOnce({
          success: false,
          error: "最初のエラー",
        })
        .mockResolvedValueOnce({
          success: true,
          imageId: "success-id",
        });

      const { result } = renderHook(() => useImageUpload());

      // 1回目：失敗
      await act(async () => {
        await result.current.uploadImages([createTestFile("fail.jpg")]);
      });
      expect(result.current.error).toBe("fail.jpg: 最初のエラー");

      // 2回目：成功（エラーがリセットされる）
      await act(async () => {
        await result.current.uploadImages([createTestFile("success.jpg")]);
      });
      expect(result.current.error).toBeNull();
    });
  });
});
