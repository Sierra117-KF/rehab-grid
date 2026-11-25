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
import { resolveProjectSettings } from "@rehab-grid/core/lib/settings";
import {
  type LayoutType,
  type PdfGenerationData,
  type ResolvedProjectSettings,
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

/**
 * テスト用の設定を生成（指定した値は検証せずにそのまま使う。Worker に不正値が届く場合を再現できる）
 */
function createSettings(
  layoutType: LayoutType,
  themeColor = DEFAULT_THEME_COLOR,
  extra: Partial<ResolvedProjectSettings> = {}
): ResolvedProjectSettings {
  return { ...resolveProjectSettings(undefined), layoutType, themeColor, ...extra };
}

function createTestData(
  overrides: Partial<PdfGenerationData> = {}
): PdfGenerationData {
  return {
    meta: createTestMeta(),
    settings: createSettings("grid2"),
    items: [],
    images: {},
    ...overrides,
  };
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

  describe("用紙の向き", () => {
    it.each([
      ["grid2", "landscape", "横", PDF_PAGE_SIZE_LANDSCAPE],
      ["grid3", "portrait", "縦", PDF_PAGE_SIZE],
      ["grid4", "portrait", "縦", PDF_PAGE_SIZE],
      ["grid3", "auto", "横", PDF_PAGE_SIZE_LANDSCAPE],
      ["grid2", "auto", "縦", PDF_PAGE_SIZE],
    ] as const)(
      "%s で向き %s を指定すると A4%s の用紙になる",
      (layoutType, pageOrientation, _, size) => {
        const doc = buildPdfDocument(
          createTestData({
            settings: createSettings(layoutType, DEFAULT_THEME_COLOR, {
              pageOrientation,
            }),
          })
        );

        expect(getPageSize(doc)).toEqual([size.width, size.height]);
      }
    );

    it("1列は横向きを指定しても A4縦になる（カードが 1 ページに収まらないため）", () => {
      const doc = buildPdfDocument(
        createTestData({
          settings: createSettings("grid1", DEFAULT_THEME_COLOR, {
            pageOrientation: "landscape",
          }),
        })
      );

      expect(getPageSize(doc)).toEqual([PDF_PAGE_SIZE.width, PDF_PAGE_SIZE.height]);
    });

    it("2列を横向きにすると、カード幅も横向きのコンテンツ幅から求める", () => {
      const doc = buildPdfDocument(
        createTestData({
          settings: createSettings("grid2", DEFAULT_THEME_COLOR, {
            pageOrientation: "landscape",
          }),
          items: [createTestItem()],
        })
      );

      // (761.89 - 12) / 2 = 374.945（縦向きなら 251.64）
      // カードはページをまたいで分割しないよう wrap={false} を持つ
      const card = findElementsByType(doc, "View").find(
        (el) => el.props?.wrap === false
      );
      expect((card?.props?.style as { width: number }).width).toBeCloseTo(374.945, 6);
    });
  });

  describe("印刷の色", () => {
    function getPageBackground(doc: unknown): unknown {
      const style = findElementsByType(doc, "Page")[0]?.props?.style as
        | { backgroundColor?: string }
        | undefined;
      return style?.backgroundColor;
    }

    it("カラーではページ背景が薄いグレーのまま", () => {
      const doc = buildPdfDocument(createTestData());

      expect(getPageBackground(doc)).toBe("#f8fafc");
    });

    it("白黒ではページ背景を白にする", () => {
      const doc = buildPdfDocument(
        createTestData({
          settings: createSettings("grid2", DEFAULT_THEME_COLOR, {
            printColorMode: "monochrome",
          }),
        })
      );

      expect(getPageBackground(doc)).toBe("#ffffff");
    });
  });

  it("カード番号は order の値ではなく並び順の連番になる", () => {
    const doc = buildPdfDocument(
      createTestData({
        settings: createSettings("grid2", DEFAULT_THEME_COLOR, {
          showCardNumbers: true,
        }),
        items: [
          createTestItem({ id: "b", order: 5, title: "運動B" }),
          createTestItem({ id: "a", order: 2, title: "運動A" }),
        ],
      })
    );

    const texts = extractTextContent(doc);
    expect(texts.indexOf("1")).toBe(texts.indexOf("運動A") - 1);
    expect(texts.indexOf("2")).toBe(texts.indexOf("運動B") - 1);
  });
});

describe("buildPdfDocument のヘッダー・フッター・実施チェック表（2-3）", () => {
  /** 10 枚のカード（MAX_ITEM_COUNT） */
  const tenItems = Array.from({ length: 10 }, (_, i) =>
    createTestItem({
      id: `item-${String(i)}`,
      order: i,
      title: `運動${String(i + 1)}`,
    })
  );

  /**
   * 指定した Page の直下の子要素を取り出す
   */
  function getPageChildren(
    doc: unknown,
    pageIndex: number
  ): { key?: string | null; props?: { wrap?: boolean } }[] {
    const children = findElementsByType(doc, "Page")[pageIndex]?.props?.children;
    return (Array.isArray(children) ? children : [children]) as {
      key?: string | null;
      props?: { wrap?: boolean };
    }[];
  }

  /**
   * fixed 指定のフッター（ページ番号）を取り出す
   */
  function findFooters(doc: unknown) {
    return findElementsByType(doc, "Text").filter(
      (el) => el.props?.fixed === true
    );
  }

  it("ページ番号のフッターを置く（1 ページだけなら空文字、2 ページ以上で「n / N」）", () => {
    const doc = buildPdfDocument(createTestData({ items: tenItems }));

    const footers = findFooters(doc);
    expect(footers).toHaveLength(1);
    const render = footers[0]?.props?.render as (props: {
      pageNumber: number;
      totalPages: number;
    }) => string;
    expect(render({ pageNumber: 1, totalPages: 1 })).toBe("");
    expect(render({ pageNumber: 2, totalPages: 3 })).toBe("2 / 3");
  });

  it("既定の設定ではチェック表を出さない", () => {
    const doc = buildPdfDocument(createTestData({ items: tenItems }));

    expect(extractTextContent(doc)).not.toContain(
      PDF_LABELS.weeklyCheckTableTitle
    );
    expect(findElementsByType(doc, "Page")).toHaveLength(1);
  });

  it("1週間のチェック表はカードの後ろに、運動 10 件 × 7 曜日の表で置く", () => {
    const doc = buildPdfDocument(
      createTestData({
        settings: createSettings("grid2", DEFAULT_THEME_COLOR, {
          checkTable: "weekly",
        }),
        items: tenItems,
      })
    );

    expect(findElementsByType(doc, "Page")).toHaveLength(1);
    const children = getPageChildren(doc, 0);
    // ヘッダー → カードのグリッド → チェック表 → フッター
    expect(children.map((child) => child.key)).toEqual([
      null,
      "grid",
      "checkTable",
      "footer",
    ]);
    // 収まらなければ表ごと次のページへ送る
    expect(children[2]?.props?.wrap).toBeFalsy();

    const texts = extractTextContent(doc);
    expect(texts).toContain(PDF_LABELS.weeklyCheckTableTitle);
    expect(texts.filter((text) => text === "日")).toHaveLength(1);
    // カードと表の両方に運動名が出る
    expect(texts.filter((text) => text === "運動10")).toHaveLength(2);
  });

  it("1か月のチェック表は A4 横の別ページに置き、そのページにもフッターを置く", () => {
    const doc = buildPdfDocument(
      createTestData({
        settings: createSettings("grid2", DEFAULT_THEME_COLOR, {
          checkTable: "monthly",
        }),
        items: tenItems,
      })
    );

    const pages = findElementsByType(doc, "Page");
    expect(pages).toHaveLength(2);
    // カードのページは 2 列なので縦向きのまま
    expect(pages[0]?.props?.size).toEqual([
      PDF_PAGE_SIZE.width,
      PDF_PAGE_SIZE.height,
    ]);
    expect(pages[1]?.props?.size).toEqual([
      PDF_PAGE_SIZE_LANDSCAPE.width,
      PDF_PAGE_SIZE_LANDSCAPE.height,
    ]);
    expect(findFooters(pages[1])).toHaveLength(1);

    const monthlyTexts = extractTextContent(pages[1]);
    expect(monthlyTexts).toContain(PDF_LABELS.monthlyCheckTableTitle);
    expect(monthlyTexts).toContain("1");
    expect(monthlyTexts).toContain("31");
    expect(monthlyTexts).not.toContain("32");
    expect(monthlyTexts).toContain("運動10");
  });

  it("ヘッダーに施設名・担当者名・日付・全体メモを出す", () => {
    const doc = buildPdfDocument(
      createTestData({
        settings: createSettings("grid2", DEFAULT_THEME_COLOR, {
          header: {
            showPatientNameBox: true,
            dateMode: "printed",
            facilityName: "○○病院",
            therapistName: "山田",
            overallNote: "次回：12月1日",
          },
        }),
        items: tenItems,
      }),
      new Date(2026, 10, 24, 9, 0)
    );

    const texts = extractTextContent(doc);
    expect(texts).toContain("2026年11月24日");
    // 施設名と担当者名の間は全角空白
    expect(texts).toContain(
      `○○病院　${PDF_LABELS.therapistLabel} 山田`
    );
    expect(texts).toContain("次回：12月1日");
  });
});
