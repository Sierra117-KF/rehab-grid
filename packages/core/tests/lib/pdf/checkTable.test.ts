/**
 * lib/pdf/checkTable.ts のユニットテスト
 */

import {
  CHECK_TABLE_WEEKDAYS,
  LABELS,
  PDF_COLORS,
  PDF_CONTENT_SIZE,
} from "@rehab-grid/core/lib/constants";
import { describe, expect, it, vi } from "vitest";

import {
  createTestItem,
  extractTextContent,
  findElementsByType,
} from "./pdfTestUtils";

vi.mock("@react-pdf/renderer", async () => (await import("./pdfTestUtils")).reactPdfMock);

import {
  createMonthlyCheckTable,
  createWeeklyCheckTable,
} from "@/lib/pdf/checkTable";

/**
 * 表の見出し行・運動の行の View を取り出す（見出し行・セルの行は checkTableRow スタイル）
 */
function findRows(element: unknown) {
  return findElementsByType(element, "View").filter(
    (el) =>
      (el.props?.style as { flexDirection?: string; alignItems?: string } | undefined)
        ?.flexDirection === "row" &&
      (el.props?.style as { alignItems?: string }).alignItems === undefined
  );
}

describe("createWeeklyCheckTable", () => {
  it("見出し行（運動・月〜日）と運動ごとの行を作る", () => {
    const table = createWeeklyCheckTable(
      [
        createTestItem({ id: "a", title: "スクワット" }),
        createTestItem({ id: "b", title: "かかと上げ" }),
      ],
      PDF_CONTENT_SIZE.width,
      "color"
    );

    const texts = extractTextContent(table);
    for (const weekday of CHECK_TABLE_WEEKDAYS) {
      expect(texts).toContain(weekday);
    }
    expect(texts).toContain("スクワット");
    expect(texts).toContain("かかと上げ");
    // 見出し行 + 運動 2 行
    expect(findRows(table)).toHaveLength(3);
  });

  it("運動名が空のカードは「無題の運動」と表示する", () => {
    const table = createWeeklyCheckTable(
      [createTestItem({ title: "  " })],
      PDF_CONTENT_SIZE.width,
      "color"
    );

    expect(extractTextContent(table)).toContain(LABELS.untitledExercise);
  });

  it("白黒モードでは見出し行を塗りつぶさない", () => {
    const hasHeaderBackground = (table: unknown) =>
      findElementsByType(table, "View").some(
        (el) =>
          (el.props?.style as { backgroundColor?: string } | undefined)
            ?.backgroundColor === PDF_COLORS.checkTableHeaderBackground
      );
    const items = [createTestItem()];

    expect(
      hasHeaderBackground(
        createWeeklyCheckTable(items, PDF_CONTENT_SIZE.width, "color")
      )
    ).toBeTruthy();
    expect(
      hasHeaderBackground(
        createWeeklyCheckTable(items, PDF_CONTENT_SIZE.width, "monochrome")
      )
    ).toBeFalsy();
  });
});

describe("createMonthlyCheckTable", () => {
  it("1〜31 日の列を作り、運動名の列に収まらない名前は 1 行に切り詰める", () => {
    const longTitle = "あ".repeat(20);
    const table = createMonthlyCheckTable(
      [createTestItem({ title: longTitle })],
      "color"
    );

    const texts = extractTextContent(table);
    expect(texts).toContain("1");
    expect(texts).toContain("31");
    const name = texts.find((text) => text.startsWith("あ"));
    expect(name?.endsWith("…")).toBeTruthy();
    expect(name?.length).toBeLessThan(longTitle.length);
  });
});
