/**
 * lib/pdf/document.ts のユニットテスト
 */

import {
  DEFAULT_THEME_COLOR,
  LABELS,
  PDF_LABELS,
  PDF_PAGE_SIZE,
  PDF_PAGE_SIZE_LANDSCAPE,
} from "@rehab-grid/core/lib/constants";
import {
  type LayoutType,
  type PdfGenerationData,
} from "@rehab-grid/core/types";
import { describe, expect, it, vi } from "vitest";

import {
  createTestItem,
  createTestMeta,
  extractDividerColors,
  extractTextContent,
  findElementsByType,
} from "./pdfTestUtils";

vi.mock("@react-pdf/renderer", async () => (await import("./pdfTestUtils")).reactPdfMock);

import { buildPdfDocument } from "@/lib/pdf/document";

function createTestData(
  overrides: Partial<PdfGenerationData> = {}
): PdfGenerationData {
  return {
    meta: createTestMeta(),
    settings: { layoutType: "grid2", themeColor: DEFAULT_THEME_COLOR },
    items: [],
    images: {},
    ...overrides,
  };
}

function createSettings(layoutType: LayoutType, themeColor = DEFAULT_THEME_COLOR) {
  return { layoutType, themeColor };
}

function getPageSize(doc: unknown): unknown {
  return findElementsByType(doc, "Page")[0]?.props?.size;
}

describe("buildPdfDocument", () => {
  it("Document の下に Page が 1 つ生成される", () => {
    const doc = buildPdfDocument(createTestData());

    expect((doc.type as { name: string }).name).toBe("Document");
    expect(findElementsByType(doc, "Page")).toHaveLength(1);
  });

  it("カードが 0 枚でもヘッダーだけのドキュメントが生成される", () => {
    const doc = buildPdfDocument(createTestData({ items: [] }));

    const visibleTexts = extractTextContent(doc).filter((t) => t.trim() !== "");
    expect(visibleTexts).toEqual(["テストプロジェクト", PDF_LABELS.patientLabel]);
  });

  it("ヘッダーにプロジェクト名、グリッドにカードが描画される", () => {
    const doc = buildPdfDocument(
      createTestData({
        meta: createTestMeta({ title: "テストタイトル" }),
        items: [createTestItem({ title: "スクワット" })],
      })
    );

    const texts = extractTextContent(doc);
    expect(texts).toContain("テストタイトル");
    expect(texts).toContain(PDF_LABELS.patientLabel);
    expect(texts).toContain("スクワット");
  });

  it("カードは order の昇順に並ぶ", () => {
    const doc = buildPdfDocument(
      createTestData({
        items: [
          createTestItem({ id: "3", order: 2, title: "運動C" }),
          createTestItem({ id: "1", order: 0, title: "運動A" }),
          createTestItem({ id: "2", order: 1, title: "運動B" }),
        ],
      })
    );

    const titles = extractTextContent(doc).filter((t) => t.startsWith("運動"));
    expect(titles).toEqual(["運動A", "運動B", "運動C"]);
  });

  it("各カードに imageSource に対応する画像が渡される", () => {
    const doc = buildPdfDocument(
      createTestData({
        items: [
          createTestItem({ id: "1", order: 0, imageSource: "img1" }),
          createTestItem({ id: "2", order: 1, imageSource: "img2" }),
        ],
        images: {
          img1: "data:image/jpeg;base64,image1",
          img2: "data:image/png;base64,image2",
        },
      })
    );

    const srcs = findElementsByType(doc, "Image").map((img) => img.props?.src);
    expect(srcs).toEqual([
      "data:image/jpeg;base64,image1",
      "data:image/png;base64,image2",
    ]);
  });

  it.each([
    ["imageSource が空", ""],
    ["images に対応するエントリがない", "missing"],
  ])("%s 場合、空白の枠になる", (_, imageSource) => {
    const doc = buildPdfDocument(
      createTestData({ items: [createTestItem({ imageSource })], images: {} })
    );

    expect(findElementsByType(doc, "Image")).toHaveLength(0);
    expect(extractTextContent(doc)).not.toContain(LABELS.noImage);
  });

  it.each([
    ["grid1", "縦", PDF_PAGE_SIZE],
    ["grid2", "縦", PDF_PAGE_SIZE],
    ["grid3", "横", PDF_PAGE_SIZE_LANDSCAPE],
    ["grid4", "横", PDF_PAGE_SIZE_LANDSCAPE],
  ] as const)("%s は A4%s の用紙になる", (layoutType, _, size) => {
    const doc = buildPdfDocument(
      createTestData({ settings: createSettings(layoutType) })
    );

    expect(getPageSize(doc)).toEqual([size.width, size.height]);
  });

  it("不正なレイアウトタイプは grid2（A4縦）として扱う", () => {
    const doc = buildPdfDocument(
      createTestData({
        // @ts-expect-error - Worker 経由で不正値が届いた場合を想定
        settings: createSettings("invalid"),
      })
    );

    expect(getPageSize(doc)).toEqual([PDF_PAGE_SIZE.width, PDF_PAGE_SIZE.height]);
  });

  it("テーマカラーがカードの用量の区切り線に反映される", () => {
    const doc = buildPdfDocument(
      createTestData({
        settings: createSettings("grid2", "#7c3aed"),
        items: [
          createTestItem({ dosages: { reps: "10回", sets: "", frequency: "" } }),
        ],
      })
    );

    expect(extractDividerColors(doc)).toEqual(["#d8c4fa"]);
  });

  it("不正なテーマカラーは既定のテーマカラーとして扱う", () => {
    const doc = buildPdfDocument(
      createTestData({
        settings: createSettings("grid2", "red"),
        items: [
          createTestItem({ dosages: { reps: "10回", sets: "", frequency: "" } }),
        ],
      })
    );

    expect(extractDividerColors(doc)).toEqual(["#c4dafc"]);
  });
});
