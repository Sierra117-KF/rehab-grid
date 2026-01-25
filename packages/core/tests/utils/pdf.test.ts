import {
  getPdfContentSize,
  LAYOUT_COLUMNS,
  PDF_CONTENT_SIZE,
} from "@rehab-grid/core/lib/constants";
import { type EditorItem, type LayoutType, type ProjectMeta } from "@rehab-grid/core/types";
import {
  calculatePdfCardWidth,
  generatePdfFilename,
  preparePdfGenerationData,
  truncateToLines,
} from "@rehab-grid/core/utils/pdf";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// モック設定
// ============================================================================

const {
  mockConvertBlob,
  mockFetchSample,
  mockPartition,
  mockToArray,
  mockWhere,
} = vi.hoisted(() => {
  const toArrayFn = vi.fn<() => Promise<{ id: string; blob: Blob }[]>>();
  const anyOfFn = vi.fn(() => ({ toArray: toArrayFn }));
  const whereFn = vi.fn(() => ({ anyOf: anyOfFn }));

  return {
    mockConvertBlob: vi.fn<(blob: Blob) => Promise<string | null>>(),
    mockFetchSample:
      vi.fn<(ids: readonly string[]) => Promise<Map<string, Blob>>>(),
    mockPartition:
      vi.fn<
        (ids: readonly string[]) => {
          sampleIds: string[];
          dbImageIds: string[];
        }
      >(),
    mockToArray: toArrayFn,
    mockWhere: whereFn,
  };
});

vi.mock("@/utils/image", () => ({
  convertBlobToPdfSupportedDataUrl: mockConvertBlob,
  fetchSampleImageBlobs: mockFetchSample,
  partitionImageIds: mockPartition,
}));

vi.mock("@/lib/db", () => ({
  db: {
    images: {
      where: mockWhere,
    },
  },
}));

// ============================================================================
// テスト用定数
// ============================================================================

/** テスト用画像ID（命名規則エラー回避のため定数化） */
const TEST_IMAGE_IDS = {
  dbImage1: "db-image-1",
  dbImage2: "db-image-2",
  sampleStandingSquat: "sample-standing-squat",
  sampleImage1: "sample-image-1",
} as const;

// ============================================================================
// ヘルパー関数
// ============================================================================

/**
 * テスト用のEditorItemを生成
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

/**
 * テスト用のProjectMetaを生成
 */
function createTestMeta(overrides: Partial<ProjectMeta> = {}): ProjectMeta {
  return {
    version: "1.0.0",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    title: "テストプロジェクト",
    projectType: "training",
    ...overrides,
  };
}

// ============================================================================
// テスト
// ============================================================================

describe("pdf.ts", () => {
  describe("calculatePdfCardWidth", () => {
    /**
     * 事前計算した期待値（Tautology回避）
     *
     * 計算式: (コンテンツ幅 - ギャップ合計) / 列数
     * - PDF_CONTENT_SIZE.width = 515.28 (縦型: 595.28 - 40*2)
     * - PDF_CONTENT_SIZE_LANDSCAPE.width = 761.89 (横型: 841.89 - 40*2)
     * - PDF_GRID_GAP = 12
     */
    it.each([
      ["grid1", 515.28], // 515.28 / 1 = 515.28
      ["grid2", 251.64], // (515.28 - 12) / 2 = 251.64
      ["grid3", 245.96333333333334], // (761.89 - 24) / 3 ≈ 245.963...
      ["grid4", 181.4725], // (761.89 - 36) / 4 = 181.4725
    ] as const)(
      "layoutType=%s のとき、カード幅 %f を返す",
      (layoutType, expectedWidth) => {
        const result = calculatePdfCardWidth(layoutType);
        expect(result).toBe(expectedWidth);
      }
    );

    it("getPdfContentSizeとLAYOUT_COLUMNSの定数を正しく使用している", () => {
      const layoutType: LayoutType = "grid2";
      const columns = LAYOUT_COLUMNS[layoutType];
      const contentSize = getPdfContentSize(layoutType);

      const result = calculatePdfCardWidth(layoutType);

      // 定数との整合性を確認
      expect(columns).toBe(2);
      expect(contentSize).toBe(PDF_CONTENT_SIZE);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe("truncateToLines", () => {
    describe("正常系", () => {
      it("制限内のテキストはそのまま返す", () => {
        const text = "短いテキスト";
        const result = truncateToLines(text, 3, 20);

        expect(result).toBe("短いテキスト");
      });

      it("制限超過時に「…」を付けて切り詰める", () => {
        const text = "これは非常に長いテキストで複数行にわたります";
        const result = truncateToLines(text, 1, 10);

        expect(result).toContain("…");
        expect(result.length).toBeLessThan(text.length);
      });

      it("改行を含むテキストの行数を正しく計算する", () => {
        const text = "1行目\n2行目\n3行目\n4行目";
        const result = truncateToLines(text, 2, 10);

        expect(result).toContain("…");
        // 2行分 + 省略記号
        expect(result.split("\n").length).toBeLessThanOrEqual(2);
      });

      it("空行は1行としてカウントされる", () => {
        const text = "1行目\n\n3行目";
        const result = truncateToLines(text, 2, 10);

        // 1行目 + 空行 = 2行で制限に達する
        expect(result).toContain("…");
      });

      it("長い1行は複数行としてカウントされる", () => {
        // 30文字 ÷ 10文字/行 = 3行
        const text =
          "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほ";
        const result = truncateToLines(text, 2, 10);

        // 2行分（20文字）で切り詰められる
        expect(result).toContain("…");
        expect(result.replace("…", "").length).toBeLessThanOrEqual(20);
      });
    });

    describe("エッジケース", () => {
      it("空文字列を渡すとそのまま返す", () => {
        const result = truncateToLines("", 3, 10);

        expect(result).toBe("");
      });

      it("maxLines が 0 以下の場合はそのまま返す", () => {
        const text = "テスト";

        expect(truncateToLines(text, 0, 10)).toBe("テスト");
        expect(truncateToLines(text, -1, 10)).toBe("テスト");
      });

      it("charsPerLine が 0 以下の場合はそのまま返す", () => {
        const text = "テスト";

        expect(truncateToLines(text, 3, 0)).toBe("テスト");
        expect(truncateToLines(text, 3, -1)).toBe("テスト");
      });

      it("ちょうど制限に達する場合は省略記号なし", () => {
        // 10文字 × 1行 = 10文字
        const text = "1234567890";
        const result = truncateToLines(text, 1, 10);

        expect(result).toBe("1234567890");
        expect(result).not.toContain("…");
      });

      it("改行のみのテキストを処理できる", () => {
        const text = "\n\n\n";
        const result = truncateToLines(text, 2, 10);

        // 改行のみでも行としてカウント
        expect(result).toContain("…");
      });

      it("末尾の空白は trimEnd で除去される", () => {
        const text = "テスト   ";
        const result = truncateToLines(text, 1, 10);

        expect(result).toBe("テスト");
        expect(result.endsWith(" ")).toBeFalsy();
      });
    });
  });

  describe("generatePdfFilename", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-12-28T10:30:00.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("正常なタイトルでファイル名を生成する", () => {
      const result = generatePdfFilename("自主トレメニュー");

      expect(result).toBe("自主トレメニュー_2025-12-28.pdf");
    });

    it("タイトルが空文字の場合はデフォルト名を使用する", () => {
      const result = generatePdfFilename("");

      expect(result).toBe("training-sheet_2025-12-28.pdf");
    });

    it("タイトルが空白のみの場合はデフォルト名を使用する", () => {
      const result = generatePdfFilename("   ");

      expect(result).toBe("training-sheet_2025-12-28.pdf");
    });

    it("タイトルの前後の空白はトリムされる", () => {
      const result = generatePdfFilename("  腰痛体操  ");

      expect(result).toBe("腰痛体操_2025-12-28.pdf");
    });
  });

  describe("preparePdfGenerationData", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("items が空の場合は null を返す", async () => {
      const result = await preparePdfGenerationData(
        [],
        createTestMeta(),
        "grid2"
      );

      expect(result).toBeNull();
    });

    it("IndexedDB 画像のみの場合、正しく画像を取得・変換する", async () => {
      const items = [
        createTestItem({ id: "item-1", imageSource: TEST_IMAGE_IDS.dbImage1 }),
        createTestItem({
          id: "item-2",
          imageSource: TEST_IMAGE_IDS.dbImage2,
          order: 1,
        }),
      ];
      const meta = createTestMeta();

      // モック設定
      mockPartition.mockReturnValue({
        sampleIds: [],
        dbImageIds: [TEST_IMAGE_IDS.dbImage1, TEST_IMAGE_IDS.dbImage2],
      });

      const mockBlob1 = new Blob(["image1"], { type: "image/jpeg" });
      const mockBlob2 = new Blob(["image2"], { type: "image/png" });

      mockToArray.mockResolvedValue([
        { id: TEST_IMAGE_IDS.dbImage1, blob: mockBlob1 },
        { id: TEST_IMAGE_IDS.dbImage2, blob: mockBlob2 },
      ]);

      mockConvertBlob
        .mockResolvedValueOnce("data:image/jpeg;base64,image1")
        .mockResolvedValueOnce("data:image/png;base64,image2");

      mockFetchSample.mockResolvedValue(new Map());

      // 実行
      const result = await preparePdfGenerationData(items, meta, "grid2");

      // 検証
      expect(result).not.toBeNull();
      expect(result?.images[TEST_IMAGE_IDS.dbImage1]).toBe(
        "data:image/jpeg;base64,image1"
      );
      expect(result?.images[TEST_IMAGE_IDS.dbImage2]).toBe(
        "data:image/png;base64,image2"
      );
      expect(result?.items).toBe(items);
      expect(result?.meta).toBe(meta);
      expect(result?.layoutType).toBe("grid2");
    });

    it("サンプル画像のみの場合、fetchで取得・変換する", async () => {
      const items = [
        createTestItem({
          id: "item-1",
          imageSource: TEST_IMAGE_IDS.sampleStandingSquat,
        }),
      ];
      const meta = createTestMeta();

      // モック設定
      mockPartition.mockReturnValue({
        sampleIds: [TEST_IMAGE_IDS.sampleStandingSquat],
        dbImageIds: [],
      });

      mockToArray.mockResolvedValue([]);

      const sampleBlob = new Blob(["sample"], { type: "image/webp" });
      mockFetchSample.mockResolvedValue(
        new Map([[TEST_IMAGE_IDS.sampleStandingSquat, sampleBlob]])
      );

      mockConvertBlob.mockResolvedValue("data:image/jpeg;base64,sample");

      // 実行
      const result = await preparePdfGenerationData(items, meta, "grid2");

      // 検証
      expect(result).not.toBeNull();
      expect(result?.images[TEST_IMAGE_IDS.sampleStandingSquat]).toBe(
        "data:image/jpeg;base64,sample"
      );
      expect(mockFetchSample).toHaveBeenCalledWith([
        TEST_IMAGE_IDS.sampleStandingSquat,
      ]);
    });

    it("IndexedDB画像とサンプル画像の混合ケース", async () => {
      const items = [
        createTestItem({ id: "item-1", imageSource: TEST_IMAGE_IDS.dbImage1 }),
        createTestItem({
          id: "item-2",
          imageSource: TEST_IMAGE_IDS.sampleImage1,
          order: 1,
        }),
      ];
      const meta = createTestMeta();

      // モック設定
      mockPartition.mockReturnValue({
        sampleIds: [TEST_IMAGE_IDS.sampleImage1],
        dbImageIds: [TEST_IMAGE_IDS.dbImage1],
      });

      const dbBlob = new Blob(["db"], { type: "image/jpeg" });
      mockToArray.mockResolvedValue([
        { id: TEST_IMAGE_IDS.dbImage1, blob: dbBlob },
      ]);

      const sampleBlob = new Blob(["sample"], { type: "image/webp" });
      mockFetchSample.mockResolvedValue(
        new Map([[TEST_IMAGE_IDS.sampleImage1, sampleBlob]])
      );

      mockConvertBlob
        .mockResolvedValueOnce("data:image/jpeg;base64,db")
        .mockResolvedValueOnce("data:image/jpeg;base64,sample");

      // 実行
      const result = await preparePdfGenerationData(items, meta, "grid2");

      // 検証
      expect(result).not.toBeNull();
      expect(result?.images[TEST_IMAGE_IDS.dbImage1]).toBe(
        "data:image/jpeg;base64,db"
      );
      expect(result?.images[TEST_IMAGE_IDS.sampleImage1]).toBe(
        "data:image/jpeg;base64,sample"
      );
    });

    it("画像変換に失敗した場合はその画像をスキップする", async () => {
      const items = [
        createTestItem({ id: "item-1", imageSource: TEST_IMAGE_IDS.dbImage1 }),
        createTestItem({
          id: "item-2",
          imageSource: TEST_IMAGE_IDS.dbImage2,
          order: 1,
        }),
      ];
      const meta = createTestMeta();

      // モック設定
      mockPartition.mockReturnValue({
        sampleIds: [],
        dbImageIds: [TEST_IMAGE_IDS.dbImage1, TEST_IMAGE_IDS.dbImage2],
      });

      const mockBlob1 = new Blob(["image1"], { type: "image/jpeg" });
      const mockBlob2 = new Blob(["image2"], { type: "image/gif" });

      mockToArray.mockResolvedValue([
        { id: TEST_IMAGE_IDS.dbImage1, blob: mockBlob1 },
        { id: TEST_IMAGE_IDS.dbImage2, blob: mockBlob2 },
      ]);

      // 1つ目は成功、2つ目は失敗（nullを返す）
      mockConvertBlob
        .mockResolvedValueOnce("data:image/jpeg;base64,image1")
        .mockResolvedValueOnce(null);

      mockFetchSample.mockResolvedValue(new Map());

      // 実行
      const result = await preparePdfGenerationData(items, meta, "grid2");

      // 検証：失敗した画像はスキップされる
      expect(result).not.toBeNull();
      expect(result?.images[TEST_IMAGE_IDS.dbImage1]).toBe(
        "data:image/jpeg;base64,image1"
      );
      expect(Object.keys(result?.images ?? {})).not.toContain(
        TEST_IMAGE_IDS.dbImage2
      );
    });

    it("空文字の imageSource はスキップされる", async () => {
      const items = [
        createTestItem({ id: "item-1", imageSource: "" }),
        createTestItem({
          id: "item-2",
          imageSource: TEST_IMAGE_IDS.dbImage1,
          order: 1,
        }),
      ];
      const meta = createTestMeta();

      // モック設定
      mockPartition.mockReturnValue({
        sampleIds: [],
        dbImageIds: [TEST_IMAGE_IDS.dbImage1],
      });

      const mockBlob = new Blob(["image1"], { type: "image/jpeg" });
      mockToArray.mockResolvedValue([
        { id: TEST_IMAGE_IDS.dbImage1, blob: mockBlob },
      ]);

      mockConvertBlob.mockResolvedValue("data:image/jpeg;base64,image1");
      mockFetchSample.mockResolvedValue(new Map());

      // 実行
      const result = await preparePdfGenerationData(items, meta, "grid2");

      // 検証
      expect(result).not.toBeNull();
      // 空文字の imageSource は partitionImageIds に渡す前にフィルタされる
      expect(mockPartition).toHaveBeenCalledWith([TEST_IMAGE_IDS.dbImage1]);
    });

    it("変換結果が空文字の場合もスキップする", async () => {
      const items = [
        createTestItem({ id: "item-1", imageSource: TEST_IMAGE_IDS.dbImage1 }),
      ];
      const meta = createTestMeta();

      mockPartition.mockReturnValue({
        sampleIds: [],
        dbImageIds: [TEST_IMAGE_IDS.dbImage1],
      });

      const mockBlob = new Blob(["image1"], { type: "image/jpeg" });
      mockToArray.mockResolvedValue([
        { id: TEST_IMAGE_IDS.dbImage1, blob: mockBlob },
      ]);

      // 空文字を返す
      mockConvertBlob.mockResolvedValue("");
      mockFetchSample.mockResolvedValue(new Map());

      // 実行
      const result = await preparePdfGenerationData(items, meta, "grid2");

      // 検証：空文字の変換結果はスキップ
      expect(result).not.toBeNull();
      expect(result?.images).toEqual({});
    });
  });
});
