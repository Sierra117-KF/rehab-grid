/**
 * lib/pdf/document.ts のユニットテスト
 */

import {
  LABELS,
  LAYOUT_COLUMNS,
  PDF_LABELS,
  PDF_PAGE_SIZE,
  PDF_PAGE_SIZE_LANDSCAPE,
} from "@rehab-grid/core/lib/constants";
import { type PdfGenerationData } from "@rehab-grid/core/types";
import { describe, expect, it, vi } from "vitest";

import {
  createTestItem,
  createTestMeta,
  extractTextContent,
  findElementsByType,
} from "./pdfTestUtils";

vi.mock("@react-pdf/renderer", async () => (await import("./pdfTestUtils")).reactPdfMock);

import { buildPdfDocument, isLayoutType } from "@/lib/pdf/document";

function createTestData(
  overrides: Partial<PdfGenerationData> = {}
): PdfGenerationData {
  return {
    meta: createTestMeta(),
    layoutType: "grid2",
    items: [],
    images: {},
    ...overrides,
  };
}

function getPageSize(doc: unknown): unknown {
  return findElementsByType(doc, "Page")[0]?.props?.size;
}

describe("isLayoutType", () => {
  it.each(Object.keys(LAYOUT_COLUMNS))("'%s' で true を返す", (value) => {
    expect(isLayoutType(value)).toBeTruthy();
  });

  it.each(["invalid", "grid5", "", "Grid2", "GRID2"])(
    "'%s' で false を返す",
    (value) => {
      expect(isLayoutType(value)).toBeFalsy();
    }
  );
});

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
    const doc = buildPdfDocument(createTestData({ layoutType }));

    expect(getPageSize(doc)).toEqual([size.width, size.height]);
  });

  it("不正なレイアウトタイプは grid2（A4縦）として扱う", () => {
    const doc = buildPdfDocument(
      createTestData({
        // @ts-expect-error - Worker 経由で不正値が届いた場合を想定
        layoutType: "invalid",
      })
    );

    expect(getPageSize(doc)).toEqual([PDF_PAGE_SIZE.width, PDF_PAGE_SIZE.height]);
  });
});
