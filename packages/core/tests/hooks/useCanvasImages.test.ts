import { useCanvasImages } from "@rehab-grid/core/hooks/useCanvasImages";
import { getSampleImagePath, SAMPLE_IMAGES } from "@rehab-grid/core/lib/constants";
import { type EditorItem } from "@rehab-grid/core/types";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/**
 * モック関数の定義
 *
 * @remarks
 * vi.hoisted でモック関数を事前定義し、vi.mock 内で参照できるようにする
 */
const { mockUseLiveQuery, mockUseObjectUrls } = vi.hoisted(() => ({
  mockUseLiveQuery: vi.fn(),
  mockUseObjectUrls: vi.fn(() => new Map<string, string>()),
}));

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: mockUseLiveQuery,
}));

vi.mock("@/hooks/useObjectUrls", () => ({
  useObjectUrls: mockUseObjectUrls,
}));

/**
 * テスト用サンプル画像データ
 *
 * @remarks
 * SAMPLE_IMAGES から最初の2つを取得し、型安全に使用する
 */
const TEST_SAMPLE_IMAGE_1 = SAMPLE_IMAGES[0];
const TEST_SAMPLE_IMAGE_2 = SAMPLE_IMAGES[1];

if (TEST_SAMPLE_IMAGE_1 === undefined || TEST_SAMPLE_IMAGE_2 === undefined) {
  throw new Error("テストに必要なサンプル画像が不足しています");
}

/**
 * テスト用の EditorItem を生成
 */
function createTestItem(overrides: Partial<EditorItem> = {}): EditorItem {
  return {
    id: "test-item-1",
    order: 0,
    title: "テスト運動",
    imageSource: "",
    description: "",
    ...overrides,
  };
}

describe("useCanvasImages", () => {
  describe("空の状態", () => {
    it("空のitemsでは空のMapを返す", () => {
      mockUseLiveQuery.mockReturnValue([]);
      mockUseObjectUrls.mockReturnValue(new Map<string, string>());

      const { result } = renderHook(() => useCanvasImages([]));

      expect(result.current).toEqual(new Map());
      expect(result.current.size).toBe(0);
    });

    it("imageSourceが空文字のitemsは無視される", () => {
      mockUseLiveQuery.mockReturnValue([]);
      mockUseObjectUrls.mockReturnValue(new Map<string, string>());

      const items = [
        createTestItem({ id: "1", imageSource: "" }),
        createTestItem({ id: "2", imageSource: "" }),
      ];

      const { result } = renderHook(() => useCanvasImages(items));

      expect(result.current.size).toBe(0);
    });
  });

  describe("サンプル画像", () => {
    it("サンプル画像のみの場合、正しいパスがMapに含まれる", () => {
      mockUseLiveQuery.mockReturnValue([]);
      mockUseObjectUrls.mockReturnValue(new Map<string, string>());

      const sampleImageId = TEST_SAMPLE_IMAGE_1.id;
      const expectedPath = getSampleImagePath(sampleImageId);

      const items = [createTestItem({ id: "1", imageSource: sampleImageId })];

      const { result } = renderHook(() => useCanvasImages(items));

      expect(result.current.get(sampleImageId)).toBe(expectedPath);
      expect(result.current.size).toBe(1);
    });

    it("複数のサンプル画像が正しくマッピングされる", () => {
      mockUseLiveQuery.mockReturnValue([]);
      mockUseObjectUrls.mockReturnValue(new Map<string, string>());

      const sampleId1 = TEST_SAMPLE_IMAGE_1.id;
      const sampleId2 = TEST_SAMPLE_IMAGE_2.id;

      const items = [
        createTestItem({ id: "1", imageSource: sampleId1, order: 0 }),
        createTestItem({ id: "2", imageSource: sampleId2, order: 1 }),
      ];

      const { result } = renderHook(() => useCanvasImages(items));

      expect(result.current.get(sampleId1)).toBe(getSampleImagePath(sampleId1));
      expect(result.current.get(sampleId2)).toBe(getSampleImagePath(sampleId2));
      expect(result.current.size).toBe(2);
    });

    it("存在しないサンプル画像IDはMapに追加されない", () => {
      mockUseLiveQuery.mockReturnValue([]);
      mockUseObjectUrls.mockReturnValue(new Map<string, string>());

      // sample_ プレフィックスがあるが存在しないID
      const invalidSampleId = "sample_invalid_id";

      const items = [createTestItem({ id: "1", imageSource: invalidSampleId })];

      const { result } = renderHook(() => useCanvasImages(items));

      // 存在しないサンプル画像IDは追加されない
      expect(result.current.has(invalidSampleId)).toBeFalsy();
      expect(result.current.size).toBe(0);
    });
  });

  describe("DB画像", () => {
    it("DB画像のみの場合、Object URLがMapに含まれる", () => {
      const dbImageId = "db-image-123";
      const objectUrl = "blob:http://localhost/image-123";

      mockUseLiveQuery.mockReturnValue([{ id: dbImageId, blob: new Blob() }]);
      mockUseObjectUrls.mockReturnValue(
        new Map<string, string>([[dbImageId, objectUrl]])
      );

      const items = [createTestItem({ id: "1", imageSource: dbImageId })];

      const { result } = renderHook(() => useCanvasImages(items));

      expect(result.current.get(dbImageId)).toBe(objectUrl);
      expect(result.current.size).toBe(1);
    });

    it("複数のDB画像が正しくマッピングされる", () => {
      const dbImageId1 = "db-image-1";
      const dbImageId2 = "db-image-2";
      const objectUrl1 = "blob:http://localhost/image-1";
      const objectUrl2 = "blob:http://localhost/image-2";

      mockUseLiveQuery.mockReturnValue([
        { id: dbImageId1, blob: new Blob() },
        { id: dbImageId2, blob: new Blob() },
      ]);
      mockUseObjectUrls.mockReturnValue(
        new Map<string, string>([
          [dbImageId1, objectUrl1],
          [dbImageId2, objectUrl2],
        ])
      );

      const items = [
        createTestItem({ id: "1", imageSource: dbImageId1, order: 0 }),
        createTestItem({ id: "2", imageSource: dbImageId2, order: 1 }),
      ];

      const { result } = renderHook(() => useCanvasImages(items));

      expect(result.current.get(dbImageId1)).toBe(objectUrl1);
      expect(result.current.get(dbImageId2)).toBe(objectUrl2);
      expect(result.current.size).toBe(2);
    });
  });

  describe("混合ケース", () => {
    it("サンプル画像とDB画像が混在する場合、両方がMapに含まれる", () => {
      const sampleImageId = TEST_SAMPLE_IMAGE_1.id;
      const dbImageId = "db-image-123";
      const objectUrl = "blob:http://localhost/image-123";

      mockUseLiveQuery.mockReturnValue([{ id: dbImageId, blob: new Blob() }]);
      mockUseObjectUrls.mockReturnValue(
        new Map<string, string>([[dbImageId, objectUrl]])
      );

      const items = [
        createTestItem({ id: "1", imageSource: sampleImageId, order: 0 }),
        createTestItem({ id: "2", imageSource: dbImageId, order: 1 }),
      ];

      const { result } = renderHook(() => useCanvasImages(items));

      // サンプル画像のパスが含まれる
      expect(result.current.get(sampleImageId)).toBe(
        getSampleImagePath(sampleImageId)
      );
      // DB画像のObject URLが含まれる
      expect(result.current.get(dbImageId)).toBe(objectUrl);
      expect(result.current.size).toBe(2);
    });

    it("画像なしのitemsが混在しても正しく処理される", () => {
      const sampleImageId = TEST_SAMPLE_IMAGE_1.id;
      const dbImageId = "db-image-123";
      const objectUrl = "blob:http://localhost/image-123";

      mockUseLiveQuery.mockReturnValue([{ id: dbImageId, blob: new Blob() }]);
      mockUseObjectUrls.mockReturnValue(
        new Map<string, string>([[dbImageId, objectUrl]])
      );

      const items = [
        createTestItem({ id: "1", imageSource: "", order: 0 }), // 画像なし
        createTestItem({ id: "2", imageSource: sampleImageId, order: 1 }),
        createTestItem({ id: "3", imageSource: dbImageId, order: 2 }),
      ];

      const { result } = renderHook(() => useCanvasImages(items));

      expect(result.current.get(sampleImageId)).toBe(
        getSampleImagePath(sampleImageId)
      );
      expect(result.current.get(dbImageId)).toBe(objectUrl);
      expect(result.current.size).toBe(2);
    });
  });

  describe("useLiveQueryへの引数", () => {
    it("サンプル画像はuseLiveQueryのクエリ対象から除外される", () => {
      const sampleImageId = TEST_SAMPLE_IMAGE_1.id;

      mockUseLiveQuery.mockReturnValue([]);
      mockUseObjectUrls.mockReturnValue(new Map<string, string>());

      const items = [createTestItem({ id: "1", imageSource: sampleImageId })];

      renderHook(() => useCanvasImages(items));

      // useLiveQueryが呼ばれたことを確認
      expect(mockUseLiveQuery).toHaveBeenCalled();

      // useObjectUrlsが空配列で呼ばれていることを確認（サンプル画像はDBから取得しない）
      expect(mockUseObjectUrls).toHaveBeenCalledWith([]);
    });

    it("DB画像のみがuseObjectUrlsに渡される", () => {
      const dbImageId = "db-image-123";
      const mockImages = [{ id: dbImageId, blob: new Blob() }];

      mockUseLiveQuery.mockReturnValue(mockImages);
      mockUseObjectUrls.mockReturnValue(new Map<string, string>());

      const items = [createTestItem({ id: "1", imageSource: dbImageId })];

      renderHook(() => useCanvasImages(items));

      // useObjectUrlsがDB画像データで呼ばれていることを確認
      expect(mockUseObjectUrls).toHaveBeenCalledWith(mockImages);
    });
  });
});
