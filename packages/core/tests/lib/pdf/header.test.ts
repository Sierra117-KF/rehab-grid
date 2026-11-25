/**
 * lib/pdf/header.ts のユニットテスト
 */

import {
  PDF_HEADER_HEIGHT,
  PDF_LABELS,
  PDF_OVERALL_NOTE_MAX_LINES,
} from "@rehab-grid/core/lib/constants";
import { resolveProjectSettings } from "@rehab-grid/core/lib/settings";
import { type SheetHeaderSettings } from "@rehab-grid/core/types";
import { describe, expect, it, vi } from "vitest";

import { extractTextContent, findElementsByType } from "./pdfTestUtils";

vi.mock("@react-pdf/renderer", async () => (await import("./pdfTestUtils")).reactPdfMock);

import { createHeader } from "@/lib/pdf/header";
import { calculatePdfHeaderHeight } from "@/lib/pdf/metrics";

/** 出力日（ローカル時刻） */
const OUTPUT_DATE = new Date(2026, 10, 24, 9, 0);

/**
 * ヘッダーの項目を指定した設定を作る（ほかはデフォルト値）
 */
function createSettings(header: Partial<SheetHeaderSettings> = {}) {
  return resolveProjectSettings({ layoutType: "grid2", header });
}

/**
 * ヘッダー本体（ルートの View）の minHeight を取り出す
 */
function getMinHeight(header: unknown): unknown {
  return (header as { props: { style: { minHeight?: number } } }).props.style
    .minHeight;
}

describe("createHeader", () => {
  describe("既定の設定（タイトル＋氏名欄）", () => {
    it("タイトルがある場合、タイトルが表示される", () => {
      const header = createHeader(
        "自主トレーニング指導箋",
        createSettings(),
        OUTPUT_DATE
      );

      expect(extractTextContent(header)).toContain("自主トレーニング指導箋");
    });

    it("タイトルの前後の空白は除去して表示される", () => {
      const header = createHeader(
        "  膝のトレーニング  ",
        createSettings(),
        OUTPUT_DATE
      );

      expect(extractTextContent(header)).toContain("膝のトレーニング");
    });

    it.each(["", "   "])(
      "タイトルが「%s」の場合、タイトルと区切りの空白は表示されない",
      (title) => {
        const header = createHeader(title, createSettings(), OUTPUT_DATE);

        expect(extractTextContent(header)).toEqual([PDF_LABELS.patientLabel]);
      }
    );

    it("印字される文字はタイトルと氏名ラベルのみ（氏名は手書き用の空欄）", () => {
      const header = createHeader("テスト", createSettings(), OUTPUT_DATE);

      const visibleTexts = extractTextContent(header).filter(
        (text) => text.trim() !== ""
      );
      expect(visibleTexts).toEqual(["テスト", PDF_LABELS.patientLabel]);
    });

    it("氏名ラベルの横に記入欄の枠が描画される", () => {
      const header = createHeader("", createSettings(), OUTPUT_DATE);

      // ヘッダー本体・行・氏名欄コンテナ・記入枠
      expect(findElementsByType(header, "View")).toHaveLength(4);
    });

    it("高さは従来と同じ PDF_HEADER_HEIGHT になる", () => {
      const settings = createSettings();
      const header = createHeader("テスト", settings, OUTPUT_DATE);

      expect(getMinHeight(header)).toBe(PDF_HEADER_HEIGHT);
      expect(calculatePdfHeaderHeight(settings)).toBe(PDF_HEADER_HEIGHT);
    });
  });

  it("氏名欄をオフにすると、氏名ラベルと記入欄を出さない", () => {
    const header = createHeader(
      "テスト",
      createSettings({ showPatientNameBox: false }),
      OUTPUT_DATE
    );

    expect(extractTextContent(header)).toEqual(["テスト"]);
  });

  it("日付を「記入欄」にすると、日付ラベルと空枠を氏名欄の前に出す", () => {
    const header = createHeader(
      "テスト",
      createSettings({ dateMode: "blank" }),
      OUTPUT_DATE
    );

    const visibleTexts = extractTextContent(header).filter(
      (text) => text.trim() !== ""
    );
    expect(visibleTexts).toEqual([
      "テスト",
      PDF_LABELS.dateLabel,
      PDF_LABELS.patientLabel,
    ]);
    // ヘッダー本体・行・日付欄コンテナ・日付の記入枠・氏名欄コンテナ・氏名の記入枠
    expect(findElementsByType(header, "View")).toHaveLength(6);
  });

  it("日付を「出力日を印字」にすると、ローカル時刻の日付を印字する", () => {
    const header = createHeader(
      "",
      createSettings({ dateMode: "printed", showPatientNameBox: false }),
      OUTPUT_DATE
    );

    expect(extractTextContent(header)).toEqual([
      PDF_LABELS.dateLabel,
      "2026年11月24日",
    ]);
  });

  it("施設名・担当者名は 2 行目にまとめて出し、その分ヘッダーを高くする", () => {
    const settings = createSettings({
      facilityName: " ○○病院 リハビリテーション科 ",
      therapistName: "山田",
    });
    const header = createHeader("テスト", settings, OUTPUT_DATE);

    expect(extractTextContent(header)).toContain(
      // 前後の空白は除き、施設名と担当者名の間は全角空白
      `○○病院 リハビリテーション科　${PDF_LABELS.therapistLabel} 山田`
    );
    expect(getMinHeight(header)).toBeGreaterThan(PDF_HEADER_HEIGHT);
  });

  it("担当者名だけでも 2 行目を出す", () => {
    const header = createHeader(
      "テスト",
      createSettings({ therapistName: "山田" }),
      OUTPUT_DATE
    );

    expect(extractTextContent(header)).toContain(
      `${PDF_LABELS.therapistLabel} 山田`
    );
  });

  it("空白だけの施設名・全体メモは出さない", () => {
    const settings = createSettings({ facilityName: "  ", overallNote: "\n " });
    const header = createHeader("テスト", settings, OUTPUT_DATE);

    expect(extractTextContent(header)).toEqual([
      "テスト",
      "   ",
      PDF_LABELS.patientLabel,
    ]);
    expect(getMinHeight(header)).toBe(PDF_HEADER_HEIGHT);
  });

  it("全体メモは枠の中に改行を保って出し、行数に応じて高くなる", () => {
    const oneLine = createSettings({ overallNote: "目標：毎日続ける" });
    const twoLines = createSettings({
      overallNote: "目標：毎日続ける\n次回：12月1日",
    });
    const header = createHeader("テスト", twoLines, OUTPUT_DATE);

    expect(extractTextContent(header)).toContain(
      "目標：毎日続ける\n次回：12月1日"
    );
    expect(calculatePdfHeaderHeight(twoLines)).toBeGreaterThan(
      calculatePdfHeaderHeight(oneLine)
    );
  });

  it("全体メモが最大行数を超えると「…」で切り詰める", () => {
    const note = Array.from({ length: 8 }, (_, i) => `${String(i + 1)}行目`).join(
      "\n"
    );
    const header = createHeader(
      "テスト",
      createSettings({ overallNote: note }),
      OUTPUT_DATE
    );

    const noteText = extractTextContent(header).find((text) =>
      text.startsWith("1行目")
    );
    expect(noteText?.split("\n")).toHaveLength(PDF_OVERALL_NOTE_MAX_LINES);
    expect(noteText?.endsWith("…")).toBeTruthy();
  });

  it("横向きのページはメモの 1 行が長くなるため、縦向きより低くなることがある", () => {
    // 縦向き（約 56 文字/行）は 3 行、横向き（約 83 文字/行）は 2 行
    const note = "あ".repeat(150);
    const portrait = resolveProjectSettings({
      layoutType: "grid2",
      header: { overallNote: note },
    });
    const landscape = resolveProjectSettings({
      layoutType: "grid3",
      header: { overallNote: note },
    });

    expect(calculatePdfHeaderHeight(landscape)).toBeLessThan(
      calculatePdfHeaderHeight(portrait)
    );
  });
});
