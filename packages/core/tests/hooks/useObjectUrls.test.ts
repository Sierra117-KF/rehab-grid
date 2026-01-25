import { useObjectUrls } from "@rehab-grid/core/hooks/useObjectUrls";
import { type BlobRecord } from "@rehab-grid/core/types";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * URL API のモック関数
 *
 * @remarks
 * URL.createObjectURL/revokeObjectURL をモックし、
 * 呼び出し回数と引数を検証できるようにする
 */
const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();

/**
 * テスト用の BlobRecord を生成
 */
function createTestBlobRecord(id: string, content = "test"): BlobRecord {
  return {
    id,
    blob: new Blob([content], { type: "image/png" }),
  };
}

describe("useObjectUrls", () => {
  beforeEach(() => {
    // URL API をモック
    mockCreateObjectURL.mockImplementation(
      (blob: Blob) => `blob:http://localhost/${blob.size}`
    );

    vi.stubGlobal("URL", {
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe("初期状態", () => {
    it("undefinedを渡すと空のMapを返す", () => {
      const { result } = renderHook(() => useObjectUrls(undefined));

      expect(result.current).toEqual(new Map());
      expect(result.current.size).toBe(0);
      expect(mockCreateObjectURL).not.toHaveBeenCalled();
    });

    it("空配列を渡すと空のMapを返す", () => {
      const { result } = renderHook(() => useObjectUrls([]));

      expect(result.current).toEqual(new Map());
      expect(result.current.size).toBe(0);
      expect(mockCreateObjectURL).not.toHaveBeenCalled();
    });
  });

  describe("URL生成", () => {
    it("単一のBlobRecordでObject URLが生成される", () => {
      const record = createTestBlobRecord("img-1");
      mockCreateObjectURL.mockReturnValue("blob:http://localhost/img-1");

      const { result } = renderHook(() => useObjectUrls([record]));

      expect(result.current.size).toBe(1);
      expect(result.current.get("img-1")).toBe("blob:http://localhost/img-1");
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      expect(mockCreateObjectURL).toHaveBeenCalledWith(record.blob);
    });

    it("複数のBlobRecordで全てのURLが生成される", () => {
      const records = [
        createTestBlobRecord("img-1", "content1"),
        createTestBlobRecord("img-2", "content2"),
        createTestBlobRecord("img-3", "content3"),
      ];

      mockCreateObjectURL
        .mockReturnValueOnce("blob:http://localhost/img-1")
        .mockReturnValueOnce("blob:http://localhost/img-2")
        .mockReturnValueOnce("blob:http://localhost/img-3");

      const { result } = renderHook(() => useObjectUrls(records));

      expect(result.current.size).toBe(3);
      expect(result.current.get("img-1")).toBe("blob:http://localhost/img-1");
      expect(result.current.get("img-2")).toBe("blob:http://localhost/img-2");
      expect(result.current.get("img-3")).toBe("blob:http://localhost/img-3");
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(3);
    });

    it("createObjectURLが各Blobに対して呼ばれる", () => {
      const record1 = createTestBlobRecord("img-1");
      const record2 = createTestBlobRecord("img-2");

      renderHook(() => useObjectUrls([record1, record2]));

      expect(mockCreateObjectURL).toHaveBeenCalledWith(record1.blob);
      expect(mockCreateObjectURL).toHaveBeenCalledWith(record2.blob);
    });
  });

  describe("クリーンアップ", () => {
    it("recordsからIDが削除されたときrevokeObjectURLが呼ばれる", () => {
      const initialRecords = [
        createTestBlobRecord("img-1"),
        createTestBlobRecord("img-2"),
      ];

      mockCreateObjectURL
        .mockReturnValueOnce("blob:http://localhost/img-1")
        .mockReturnValueOnce("blob:http://localhost/img-2");

      const { rerender } = renderHook(
        ({ records }: { records: BlobRecord[] }) => useObjectUrls(records),
        { initialProps: { records: initialRecords } }
      );

      // img-2を削除した新しいrecordsでrerender
      const updatedRecords = [createTestBlobRecord("img-1")];
      mockCreateObjectURL.mockReturnValueOnce("blob:http://localhost/img-1-new");

      rerender({ records: updatedRecords });

      // 削除されたimg-2のURLが解放される
      expect(mockRevokeObjectURL).toHaveBeenCalledWith(
        "blob:http://localhost/img-2"
      );
    });

    it("同じIDでblobが変わったとき古いURLが解放される", () => {
      const initialRecord = createTestBlobRecord("img-1", "old-content");
      mockCreateObjectURL.mockReturnValueOnce("blob:http://localhost/old-url");

      const { rerender } = renderHook(
        ({ records }: { records: BlobRecord[] }) => useObjectUrls(records),
        { initialProps: { records: [initialRecord] } }
      );

      // 同じIDで新しいblobを持つrecordでrerender
      const newRecord = createTestBlobRecord("img-1", "new-content");
      mockCreateObjectURL.mockReturnValueOnce("blob:http://localhost/new-url");

      rerender({ records: [newRecord] });

      // 古いURLが解放される
      expect(mockRevokeObjectURL).toHaveBeenCalledWith(
        "blob:http://localhost/old-url"
      );
    });

    it("アンマウント時に全URLが解放される", () => {
      const records = [
        createTestBlobRecord("img-1"),
        createTestBlobRecord("img-2"),
      ];

      mockCreateObjectURL
        .mockReturnValueOnce("blob:http://localhost/img-1")
        .mockReturnValueOnce("blob:http://localhost/img-2");

      const { unmount } = renderHook(() => useObjectUrls(records));

      // アンマウント前はrevokeされていない
      expect(mockRevokeObjectURL).not.toHaveBeenCalled();

      // アンマウント
      unmount();

      // 全てのURLが解放される
      expect(mockRevokeObjectURL).toHaveBeenCalledWith(
        "blob:http://localhost/img-1"
      );
      expect(mockRevokeObjectURL).toHaveBeenCalledWith(
        "blob:http://localhost/img-2"
      );
      expect(mockRevokeObjectURL).toHaveBeenCalledTimes(2);
    });

    it("recordsがundefinedに変わったとき全URLが解放される", () => {
      const initialRecords = [createTestBlobRecord("img-1")];
      mockCreateObjectURL.mockReturnValueOnce("blob:http://localhost/img-1");

      type Props = { data: BlobRecord[] | undefined };
      const { rerender } = renderHook<Map<string, string>, Props>(
        ({ data }) => useObjectUrls(data),
        { initialProps: { data: initialRecords } }
      );

      rerender({ data: undefined });

      expect(mockRevokeObjectURL).toHaveBeenCalledWith(
        "blob:http://localhost/img-1"
      );
    });
  });

  describe("再レンダリング", () => {
    it("recordsの参照が同じ場合、新しいURLは生成されない", () => {
      const testRecords = [createTestBlobRecord("img-1")];
      mockCreateObjectURL.mockReturnValue("blob:http://localhost/img-1");

      const { rerender } = renderHook(
        ({ data }: { data: BlobRecord[] }) => useObjectUrls(data),
        { initialProps: { data: testRecords } }
      );

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);

      // 同じ参照でrerender
      rerender({ data: testRecords });

      // 新しいURLは生成されない（useMemoにより）
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    });

    it("recordsの参照が変わると新しいURLが生成される", () => {
      const records1 = [createTestBlobRecord("img-1")];
      mockCreateObjectURL.mockReturnValueOnce("blob:http://localhost/img-1");

      const { rerender } = renderHook(
        ({ data }: { data: BlobRecord[] }) => useObjectUrls(data),
        { initialProps: { data: records1 } }
      );

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);

      // 新しい参照のrecords（内容は同じ）
      const records2 = [createTestBlobRecord("img-1")];
      mockCreateObjectURL.mockReturnValueOnce("blob:http://localhost/img-1-new");

      rerender({ data: records2 });

      // 新しいURLが生成される（参照が変わったため）
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(2);
    });
  });
});
