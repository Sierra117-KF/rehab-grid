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

  it.each([
    ["grid2", 5, [2, 2, 1]],
    ["grid3", 5, [3, 2]],
    ["grid1", 2, [1, 1]],
  ] as const)(
    "%s ではカード %i 枚を列数ごとの行（wrap={false}）にまとめる",
    (layoutType, count, cardsPerRow) => {
      const doc = buildPdfDocument(
        createTestData({
          settings: createSettings(layoutType),
          items: Array.from({ length: count }, (_, i) =>
            createTestItem({ id: `item-${String(i)}`, order: i })
          ),
        })
      );

      const grid = findElementsByType(doc, "View").find(
        (el) => (el as { key?: string }).key === "grid"
      );
      const rows = grid?.props?.children as {
        props: { wrap?: boolean; children: unknown };
      }[];
      expect(rows.map((row) => row.props.wrap)).toEqual(
        cardsPerRow.map(() => false)
      );
      // 子が 1 つの要素は children が配列にならない
      expect(
        rows.map((row) =>
          Array.isArray(row.props.children) ? row.props.children.length : 1
        )
      ).toEqual(cardsPerRow);
    }
  );

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
      // カード（幅を持つ View）はページをまたいで分割しないよう wrap={false} を持つ
      const card = findElementsByType(doc, "View").find(
        (el) =>
          el.props?.wrap === false &&
          (el.props.style as { width?: number }).width !== undefined
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

  it("ヘッダーに出力日を印字する", () => {
    const doc = buildPdfDocument(
      createTestData({
        settings: createSettings("grid2", DEFAULT_THEME_COLOR, {
          header: {
            showPatientNameBox: true,
            dateMode: "printed",
          },
        }),
        items: tenItems,
      }),
      new Date(2026, 10, 24, 9, 0)
    );

    const texts = extractTextContent(doc);
    expect(texts).toContain("2026年11月24日");
    expect(texts).toContain(PDF_LABELS.patientLabel);
  });
});

describe("buildPdfDocument のスライド（1 ページ 1 運動）", () => {
  const threeItems = Array.from({ length: 3 }, (_, i) =>
    createTestItem({ id: `item-${String(i)}`, order: i, title: `運動${String(i + 1)}` })
  );

  function slideData(
    extra: Partial<ResolvedProjectSettings> = {},
    items = threeItems
  ): PdfGenerationData {
    return createTestData({
      settings: createSettings("slide", DEFAULT_THEME_COLOR, extra),
      items,
    });
  }

  const LANDSCAPE = [PDF_PAGE_SIZE_LANDSCAPE.width, PDF_PAGE_SIZE_LANDSCAPE.height];

  it("カードと同じ数の A4 横のページを作り、各ページにヘッダー・カード 1 枚・フッターを置く", () => {
    const doc = buildPdfDocument(slideData());

    const pages = findElementsByType(doc, "Page");
    expect(pages).toHaveLength(3);
    pages.forEach((page, index) => {
      expect(page.props?.size).toEqual(LANDSCAPE);
      const texts = extractTextContent(page);
      expect(texts).toContain("テストプロジェクト");
      expect(texts).toContain(PDF_LABELS.patientLabel);
      expect(texts.filter((t) => t.startsWith("運動"))).toEqual([
        `運動${String(index + 1)}`,
      ]);
      expect(
        findElementsByType(page, "Text").filter((el) => el.props?.fixed === true)
      ).toHaveLength(1);
    });
  });

  it("縦向きを指定していても A4 横になる", () => {
    const doc = buildPdfDocument(slideData({ pageOrientation: "portrait" }));

    expect(getPageSize(doc)).toEqual(LANDSCAPE);
  });

  it("カードが 0 枚でもヘッダーだけの A4 横のページを 1 枚作る", () => {
    const doc = buildPdfDocument(slideData({}, []));

    const pages = findElementsByType(doc, "Page");
    expect(pages).toHaveLength(1);
    expect(pages[0]?.props?.size).toEqual(LANDSCAPE);
    const visibleTexts = extractTextContent(doc).filter((t) => t.trim() !== "");
    expect(visibleTexts).toEqual(["テストプロジェクト", PDF_LABELS.patientLabel]);
  });

  it("1週間のチェック表は最後にヘッダー付きの別ページとして置く", () => {
    const doc = buildPdfDocument(slideData({ checkTable: "weekly" }));

    const pages = findElementsByType(doc, "Page");
    expect(pages).toHaveLength(4);
    const lastTexts = extractTextContent(pages[3]);
    expect(lastTexts).toContain("テストプロジェクト");
    expect(lastTexts).toContain(PDF_LABELS.weeklyCheckTableTitle);
    // スライドのページにはチェック表を置かない
    expect(extractTextContent(pages[2])).not.toContain(
      PDF_LABELS.weeklyCheckTableTitle
    );
  });

  it("1か月のチェック表は今と同じくヘッダーなしの A4 横の別ページに置く", () => {
    const doc = buildPdfDocument(slideData({ checkTable: "monthly" }));

    const pages = findElementsByType(doc, "Page");
    expect(pages).toHaveLength(4);
    expect(pages[3]?.props?.size).toEqual(LANDSCAPE);
    const lastTexts = extractTextContent(pages[3]);
    expect(lastTexts).toContain(PDF_LABELS.monthlyCheckTableTitle);
    expect(lastTexts).not.toContain("テストプロジェクト");
  });

  it("カード番号は並び順の連番になる", () => {
    const doc = buildPdfDocument(
      createTestData({
        settings: createSettings("slide", DEFAULT_THEME_COLOR, {
          showCardNumbers: true,
        }),
        items: [
          createTestItem({ id: "b", order: 5, title: "運動B" }),
          createTestItem({ id: "a", order: 2, title: "運動A" }),
        ],
      })
    );

    const pages = findElementsByType(doc, "Page");
    expect(extractTextContent(pages[0])).toEqual(
      expect.arrayContaining(["1", "運動A"])
    );
    expect(extractTextContent(pages[1])).toEqual(
      expect.arrayContaining(["2", "運動B"])
    );
  });
});
