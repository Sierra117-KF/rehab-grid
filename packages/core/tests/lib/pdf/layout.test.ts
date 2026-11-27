/**
 * lib/pdf/layout.ts のユニットテスト
 *
 * 実際の PDF との一致は layout.render.test.ts で確かめる。ここでは見積もりの規則
 * （1 ページ目のヘッダー・ページ下端の余裕・チェック表・並び順）を確かめる。
 */

import { resolveProjectSettings } from "@rehab-grid/core/lib/settings";
import { type ProjectSettings } from "@rehab-grid/core/types";
import { describe, expect, it } from "vitest";

import { estimatePdfCardHeight, estimatePdfLayout } from "@/lib/pdf/layout";

import { createTestItem } from "./pdfTestUtils";

/** タイトルだけのカードを n 枚作る */
function createPlainItems(count: number) {
  return Array.from({ length: count }, (_, i) =>
    createTestItem({ id: `item-${String(i)}`, order: i, title: `運動${String(i + 1)}` })
  );
}

function estimate(count: number, settings: Partial<ProjectSettings> = {}) {
  return estimatePdfLayout(createPlainItems(count), resolveProjectSettings(settings));
}

describe("estimatePdfCardHeight", () => {
  it("タイトルだけのカードは、枠線・余白・画像・タイトル 1 行の合計になる", () => {
    // 2 列（A4 縦）のカード幅 251.64pt → 画像 235.64 × 141.384pt
    // 枠線 1×2 + 余白 8×2 + 画像 141.384 + タイトル（上 6 + 14pt × 1.448 + 下 8）= 193.656
    const height = estimatePdfCardHeight(
      createTestItem(),
      251.64,
      resolveProjectSettings({ layoutType: "grid2" })
    );
    expect(height).toBeCloseTo(193.656, 3);
  });

  it("説明・用量・注意点があると高くなる", () => {
    const settings = resolveProjectSettings({ layoutType: "grid2" });
    const plain = estimatePdfCardHeight(createTestItem(), 251.64, settings);
    const full = estimatePdfCardHeight(
      createTestItem({
        description: "膝を伸ばしたまま足を持ち上げます",
        dosages: { reps: "10回", sets: "3セット", frequency: "1日2回" },
        precautions: [{ id: "p1", value: "痛みが出たら中止" }],
      }),
      251.64,
      settings
    );
    expect(full).toBeGreaterThan(plain);
  });
});

describe("estimatePdfLayout", () => {
  it("2 列・タイトルだけのカードは 6 枚まで 1 ページ、8 枚で 7 枚目から 2 ページ目", () => {
    // 1 行 205.656pt（カード 193.656 + 下の余白 12）。ヘッダー 35 の下に 3 行（676pt）入り、4 行目は入らない
    expect(estimate(6)).toEqual({
      pageCount: 1,
      firstCardIndexByPage: [0],
      checkTablePage: null,
    });
    expect(estimate(8)).toEqual({
      pageCount: 2,
      firstCardIndexByPage: [0, 6],
      checkTablePage: null,
    });
  });

  it("ヘッダーが高くなると 1 ページ目に入る行が減る", () => {
    const tall = estimate(6, {
      header: {
        facilityName: "○○病院",
        overallNote: "1行目\n2行目\n3行目\n4行目\n5行目",
      },
    });
    expect(tall.firstCardIndexByPage).toEqual([0, 4]);
  });

  it("ページ下端の余裕（8pt）以内に掛かる行は次のページ扱いにする", () => {
    // ヘッダー = 35 + 施設名の行 16.6 + 全体メモ 4 行 64.4 = 116。3 行目の下端は 757pt で、
    // コンテンツの高さ 761.89pt には収まるが、余裕 8pt を引いた 753.89pt を超える
    const nearBottom = estimate(6, {
      header: { facilityName: "○○病院", overallNote: "1\n2\n3\n4" },
    });
    expect(nearBottom.firstCardIndexByPage).toEqual([0, 4]);
  });

  it("1 列は 1 ページに 1 枚", () => {
    expect(estimate(3, { layoutType: "grid1" }).firstCardIndexByPage).toEqual([
      0, 1, 2,
    ]);
  });

  it("1週間のチェック表はカードの後ろに置き、入らなければ次のページにする", () => {
    expect(estimate(2, { checkTable: "weekly" })).toEqual({
      pageCount: 1,
      firstCardIndexByPage: [0],
      checkTablePage: 1,
    });
    // 6 枚で 1 ページ目の 676pt まで埋まるため、表（運動 6 件で約 183pt）は 2 ページ目
    expect(estimate(6, { checkTable: "weekly" })).toEqual({
      pageCount: 2,
      firstCardIndexByPage: [0],
      checkTablePage: 2,
    });
  });

  it("1か月のチェック表は常に別の 1 ページになる", () => {
    expect(estimate(2, { checkTable: "monthly" })).toEqual({
      pageCount: 2,
      firstCardIndexByPage: [0],
      checkTablePage: 2,
    });
  });

  it("カードがなければ 1 ページ", () => {
    expect(estimate(0).pageCount).toBe(1);
  });
});

describe("estimatePdfLayout（スライド）", () => {
  it("文字数やヘッダーの高さによらず、カード 1 枚が 1 ページになる", () => {
    const items = Array.from({ length: 3 }, (_, i) =>
      createTestItem({
        id: `item-${String(i)}`,
        order: i,
        description: "あ".repeat(200),
        precautions: Array.from({ length: 5 }, (_p, j) => ({
          id: `p${String(j)}`,
          value: "い".repeat(50),
        })),
      })
    );
    const settings = resolveProjectSettings({
      layoutType: "slide",
      header: { facilityName: "○○病院", overallNote: "1\n2\n3\n4\n5" },
    });

    expect(estimatePdfLayout(items, settings)).toEqual({
      pageCount: 3,
      firstCardIndexByPage: [0, 1, 2],
      checkTablePage: null,
    });
  });

  it.each(["weekly", "monthly"] as const)(
    "チェック表（%s）はカードの後ろの別ページになる",
    (checkTable) => {
      expect(estimate(3, { layoutType: "slide", checkTable })).toEqual({
        pageCount: 4,
        firstCardIndexByPage: [0, 1, 2],
        checkTablePage: 4,
      });
    }
  );

  it("カードがなければヘッダーだけの 1 ページ（チェック表があれば 2 ページ目）", () => {
    expect(estimate(0, { layoutType: "slide" })).toEqual({
      pageCount: 1,
      firstCardIndexByPage: [0],
      checkTablePage: null,
    });
    expect(estimate(0, { layoutType: "slide", checkTable: "weekly" })).toEqual({
      pageCount: 2,
      firstCardIndexByPage: [0],
      checkTablePage: 2,
    });
  });
});
