// @vitest-environment node
/**
 * lib/pdf/layout.ts の見積もりを、実際の @react-pdf/renderer のレイアウト結果と突き合わせるテスト
 *
 * @react-pdf/renderer はモックせず、Worker と同じフォント・ハイフネーション設定で PDF のレイアウトを計算する。
 * 見積もりの規則そのものを確かめるため、ページ下端の余裕（PDF_PAGE_ESTIMATE_MARGIN）は 0 にする
 * （余裕の効き目は layout.test.ts で確かめる）。
 */

import { fileURLToPath } from "node:url";

import { type DocumentProps, Font, pdf } from "@react-pdf/renderer";
import type * as Constants from "@rehab-grid/core/lib/constants";
import { CJK_PATTERN, PDF_FONT_FAMILY } from "@rehab-grid/core/lib/constants";
import { resolveProjectSettings } from "@rehab-grid/core/lib/settings";
import {
  type EditorItem,
  type ProjectSettings,
  type ResolvedProjectSettings,
} from "@rehab-grid/core/types";
import { cloneElement } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@rehab-grid/core/lib/constants", async (importOriginal) => ({
  ...(await importOriginal<typeof Constants>()),
  PDF_PAGE_ESTIMATE_MARGIN: 0,
}));

/** react-pdf が onRender に渡すレイアウト結果のキー */
const LAYOUT_DATA_KEY = "_INTERNAL__LAYOUT__DATA_";

import { buildPdfDocument } from "@/lib/pdf/document";
import { estimatePdfLayout } from "@/lib/pdf/layout";

import { createTestItem, createTestMeta } from "./pdfTestUtils";

/** レイアウト結果のノード（必要な項目だけ） */
type LayoutNode = {
  type: string;
  value?: string;
  props?: { wrap?: boolean };
  style?: { borderTopLeftRadius?: number };
  box?: { top: number; height: number };
  lines?: unknown[];
  children?: LayoutNode[];
};

beforeAll(() => {
  const fontPath = (weight: string) =>
    fileURLToPath(
      new URL(
        `../../../../assets/fonts/NotoSansJP-${weight}.woff`,
        import.meta.url
      )
    );
  Font.register({
    family: PDF_FONT_FAMILY,
    fonts: [
      { src: fontPath("Regular"), fontWeight: "normal" },
      { src: fontPath("Bold"), fontWeight: "bold" },
    ],
  });
  // pdf.worker.ts と同じ設定（日本語を含む語は 1 文字ずつ折り返せるようにする）
  Font.registerHyphenationCallback((word) =>
    CJK_PATTERN.test(word)
      ? Array.from(word).flatMap((char) => [char, ""])
      : [word]
  );
});

/** 実際のレイアウトツリー全体を取得する */
async function computePdfLayoutTree(
  items: EditorItem[],
  settings: ResolvedProjectSettings
): Promise<{ children: LayoutNode[] }> {
  const doc = buildPdfDocument({
    meta: createTestMeta(),
    settings,
    items,
    images: {},
  });
  let layout: { children: LayoutNode[] } | undefined;
  await pdf(
    cloneElement<DocumentProps>(doc, {
      // レイアウト結果は型定義にない内部のキーで渡される
      onRender: (result) => {
        layout = (result as Record<string, unknown>)[LAYOUT_DATA_KEY] as
          | typeof layout
          | undefined;
      },
    })
  ).toBuffer();
  if (layout === undefined) throw new Error("レイアウトを取得できませんでした");
  return layout;
}

/**
 * 実際のレイアウトを計算し、ページ数と各ページの先頭のカードの位置を返す
 */
async function layOutWithReactPdf(
  items: EditorItem[],
  settings: ResolvedProjectSettings
): Promise<{ pageCount: number; firstCardIndexByPage: number[] }> {
  const layout = await computePdfLayoutTree(items, settings);

  // タイトルは「カード{番号}…」で、番号は並び順（0 始まりの位置 + 1）
  const firstCardIndices = layout.children.map((page) => {
    const first = collectCards(page)[0];
    if (first === undefined) return null;
    const number = /^カード(\d+)/.exec(findCardTitle(first) ?? "")?.[1];
    return Number(number) - 1;
  });
  // カードのないページ（先頭の行が入らずヘッダーだけになった 1 ページ目）は、次のページの先頭のカードから始まる扱い。
  // カードの後ろのチェック表だけのページは数えない
  const firstCardIndexByPage: number[] = [];
  firstCardIndices.forEach((index, page) => {
    const next = firstCardIndices.slice(page).find((i) => i !== null);
    if (next !== undefined) firstCardIndexByPage.push(index ?? next);
  });
  return { pageCount: layout.children.length, firstCardIndexByPage };
}

/** カード（角丸・wrap={false} の View）をツリー順に集める */
function collectCards(node: LayoutNode): LayoutNode[] {
  if (node.props?.wrap === false && node.style?.borderTopLeftRadius !== undefined) {
    return [node];
  }
  return (node.children ?? []).flatMap(collectCards);
}

/** カード内のタイトルの文字列 */
function findCardTitle(node: LayoutNode): string | undefined {
  if (node.type === "TEXT_INSTANCE" && node.value?.startsWith("カード")) {
    return node.value;
  }
  for (const child of node.children ?? []) {
    const text = findCardTitle(child);
    if (text !== undefined) return text;
  }
  return undefined;
}

/** 決まった順に値を返す疑似乱数 */
function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

const SAMPLE_TEXT =
  "膝を伸ばしたまま、ゆっくりと10秒かけて足を持ち上げます。痛みのない範囲で行い、反動をつけないようにしましょう。呼吸を止めずに続けてください。左右それぞれ行います。";

/** さまざまな長さの説明・用量・注意点を持つカードを作る */
function createVariedItems(count: number, seed: number): EditorItem[] {
  const random = createRandom(seed);
  const pick = <T>(values: readonly T[]): T =>
    values[Math.floor(random() * values.length)] as T;
  return Array.from({ length: count }, (_, i) => {
    const descriptionLength = pick([0, 15, 40, 90, 200]);
    const precautionCount = pick([0, 0, 1, 2, 3, 5]);
    return createTestItem({
      id: `item-${String(i)}`,
      order: i,
      title: `カード${String(i + 1)}${pick(["", "ストレッチ", "ブリッジ運動と体幹の安定"])}`,
      description: SAMPLE_TEXT.repeat(2).slice(0, descriptionLength),
      dosages: pick([
        undefined,
        { reps: "10回", sets: "3セット", frequency: "1日2回" },
        { reps: "左右10回ずつ", sets: "", frequency: "毎日朝晩食後に" },
        { reps: "", sets: "2セット", frequency: "" },
      ]),
      precautions: Array.from({ length: precautionCount }, (_precaution, j) => ({
        id: `p-${String(i)}-${String(j)}`,
        value: SAMPLE_TEXT.slice(j * 7, j * 7 + pick([8, 20, 50])),
      })),
    });
  });
}

const SCENARIOS: { name: string; settings: Partial<ProjectSettings> }[] = [
  { name: "2列", settings: { layoutType: "grid2" } },
  { name: "1列", settings: { layoutType: "grid1" } },
  { name: "3列（横）", settings: { layoutType: "grid3" } },
  { name: "4列（横）", settings: { layoutType: "grid4" } },
  {
    name: "2列 × 横向き × 大きめ × 番号",
    settings: {
      layoutType: "grid2",
      pageOrientation: "landscape",
      textScale: "large",
      showCardNumbers: true,
    },
  },
  {
    name: "3列 × 縦向き × 白黒",
    settings: {
      layoutType: "grid3",
      pageOrientation: "portrait",
      printColorMode: "monochrome",
    },
  },
  {
    name: "4列 × 縦向き × 大きめ",
    settings: { layoutType: "grid4", pageOrientation: "portrait", textScale: "large" },
  },
  {
    name: "2列 × 日付記入欄 × 1週間",
    settings: {
      layoutType: "grid2",
      checkTable: "weekly",
      header: {
        dateMode: "blank",
      },
    },
  },
  {
    name: "3列 × 1か月",
    settings: { layoutType: "grid3", checkTable: "monthly" },
  },
  { name: "スライド", settings: { layoutType: "slide" } },
  {
    name: "スライド × 日付記入欄 × 白黒 × 番号 × 1週間",
    settings: {
      layoutType: "slide",
      printColorMode: "monochrome",
      showCardNumbers: true,
      checkTable: "weekly",
      header: {
        dateMode: "blank",
      },
    },
  },
  {
    name: "スライド × 1か月",
    settings: { layoutType: "slide", checkTable: "monthly" },
  },
];

/** 指定した文字列を含む TEXT ノードを集める */
function collectTextNodes(node: LayoutNode, targetTexts: Set<string>): LayoutNode[] {
  const results: LayoutNode[] = [];
  if (node.type === "TEXT") {
    const text = (node.children ?? [])
      .filter((child) => child.type === "TEXT_INSTANCE")
      .map((child) => child.value ?? "")
      .join("");
    if (targetTexts.has(text)) {
      results.push(node);
    }
  }
  for (const child of node.children ?? []) {
    results.push(...collectTextNodes(child, targetTexts));
  }
  return results;
}

describe("用量の自動縮小（実際の PDF レンダリングで 1 行に収まること）", () => {
  const LONG_DOSAGE_SCENARIOS: {
    name: string;
    settings: Partial<ProjectSettings>;
  }[] = [
    { name: "3列（横・標準）", settings: { layoutType: "grid3" } },
    {
      name: "3列（横・大きめ）",
      settings: { layoutType: "grid3", textScale: "large" },
    },
    {
      name: "3列（縦・大きめ）",
      settings: {
        layoutType: "grid3",
        pageOrientation: "portrait",
        textScale: "large",
      },
    },
    { name: "4列（横・標準）", settings: { layoutType: "grid4" } },
    {
      name: "4列（縦・大きめ）",
      settings: {
        layoutType: "grid4",
        pageOrientation: "portrait",
        textScale: "large",
      },
    },
  ];

  it.each(LONG_DOSAGE_SCENARIOS)(
    "$name で長い全角・半角の用量値とラベルがすべて 1 行に収まる",
    { timeout: 60_000 },
    async ({ settings }) => {
      const dosageLabels = {
        reps: "左右それぞれ",
        sets: "セット回数",
        frequency: "１日の目安",
      };
      const resolved = resolveProjectSettings({ ...settings, dosageLabels });
      const items = [
        createTestItem({
          id: "long-1",
          order: 0,
          title: "カード1",
          dosages: {
            reps: "左右各１０回ずつ",
            sets: "３〜５セット",
            frequency: "毎日朝昼晩３回",
          },
        }),
        createTestItem({
          id: "long-2",
          order: 1,
          title: "カード2",
          dosages: {
            reps: "１２３４５６７８９０",
            sets: "WWWWWWWWWW",
            frequency: "ABCDEFGHIJ",
          },
        }),
      ];
      const layout = await computePdfLayoutTree(items, resolved);
      const targetTexts = new Set([
        "左右各１０回ずつ",
        "３〜５セット",
        "毎日朝昼晩３回",
        "１２３４５６７８９０",
        "WWWWWWWWWW",
        "ABCDEFGHIJ",
        dosageLabels.reps,
        dosageLabels.sets,
        dosageLabels.frequency,
      ]);

      const nodes = layout.children.flatMap((page) =>
        collectTextNodes(page, targetTexts)
      );
      // 2枚 × (値3件 + ラベル3件) = 12 ノード
      expect(nodes).toHaveLength(12);
      for (const node of nodes) {
        expect(node.lines?.length).toBe(1);
      }
    }
  );
});

/**
 * ノードの上端から、子孫のうち最も下にある要素の下端までの高さ
 *
 * box.top は親の上端からの位置
 */
function measureContentBottom(node: LayoutNode): number {
  return Math.max(
    0,
    ...(node.children ?? []).map(
      (child) =>
        (child.box?.top ?? 0) +
        Math.max(child.box?.height ?? 0, measureContentBottom(child))
    )
  );
}

describe("スライドの最悪の入力（実際の PDF レンダリングでカードからはみ出さないこと）", () => {
  it(
    "日付印字・白黒・番号・用量・説明 200 文字・長い注意点 5 件でも、1 カード 1 ページでカードの中に収まる",
    { timeout: 60_000 },
    async () => {
      const settings = resolveProjectSettings({
        layoutType: "slide",
        printColorMode: "monochrome",
        showCardNumbers: true,
        header: {
          dateMode: "printed",
        },
      });
      const longItem = (
        i: number,
        precautionText: string,
        description = SAMPLE_TEXT.repeat(3).slice(0, 200)
      ) =>
        createTestItem({
          id: `worst-${String(i)}`,
          order: i,
          title: `カード${String(i + 1)}ブリッジ運動と体幹の安定性向上`,
          description,
          dosages: { reps: "左右各１０回ずつ", sets: "３〜５セット", frequency: "毎日朝昼晩３回" },
          precautions: Array.from({ length: 5 }, (_p, j) => ({
            id: `p-${String(i)}-${String(j)}`,
            value: precautionText,
          })),
        });
      // 全角・半角混在・改行入り・空白なし長文半角・幅広半角英大文字のパターン
      const items = [
        longItem(0, "あ".repeat(50)),
        longItem(1, SAMPLE_TEXT.slice(0, 50)),
        longItem(2, "痛み\nしびれ\nめまいが出たら中止"),
        longItem(3, "W".repeat(50), "a".repeat(200)),
        longItem(
          4,
          "ROM MMT ADL SLR TUG ".repeat(3).slice(0, 50),
          "WWWWW ".repeat(34).slice(0, 200)
        ),
      ];

      const layout = await computePdfLayoutTree(items, settings);

      expect(layout.children).toHaveLength(items.length);
      for (const page of layout.children) {
        const cards = collectCards(page);
        expect(cards).toHaveLength(1);
        const card = cards[0]!;
        // 枠線 1 + 余白 8 の内側に収まる
        expect(measureContentBottom(card)).toBeLessThanOrEqual(
          (card.box?.height ?? 0) - 9
        );
      }
    }
  );
});

describe("estimatePdfLayout と実際の PDF の一致", () => {
  it.each(SCENARIOS)(
    "$name：ページ数と各ページの先頭のカード",
    { timeout: 60_000 },
    async ({ settings }) => {
      const resolved = resolveProjectSettings(settings);
      for (const count of [4, 10]) {
        const items = createVariedItems(count, count);
        const actual = await layOutWithReactPdf(items, resolved);
        const estimate = estimatePdfLayout(items, resolved);
        expect({ count, ...actual }).toEqual({
          count,
          pageCount: estimate.pageCount,
          firstCardIndexByPage: estimate.firstCardIndexByPage,
        });
      }
    }
  );
});
