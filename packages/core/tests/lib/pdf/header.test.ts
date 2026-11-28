/**
 * lib/pdf/header.ts のユニットテスト
 */

import {
  PDF_HEADER_HEIGHT,
  PDF_LABELS,
} from "@rehab-grid/core/lib/constants";
import { resolveSheetHeader } from "@rehab-grid/core/lib/settings";
import { type SheetHeaderSettings } from "@rehab-grid/core/types";
import { describe, expect, it, vi } from "vitest";

import { extractTextContent, findElementsByType } from "./pdfTestUtils";

vi.mock("@react-pdf/renderer", async () => (await import("./pdfTestUtils")).reactPdfMock);

import { createHeader } from "@/lib/pdf/header";

/** 出力日（ローカル時刻） */
const OUTPUT_DATE = new Date(2026, 10, 24, 9, 0);

/**
 * ヘッダーの項目を指定して設定を作る（ほかはデフォルト値）
 */
function createHeaderSettings(header: Partial<SheetHeaderSettings> = {}) {
  return resolveSheetHeader(header);
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
        createHeaderSettings(),
        OUTPUT_DATE
      );

      expect(extractTextContent(header)).toContain("自主トレーニング指導箋");
    });

    it("タイトルの前後の空白は除去して表示される", () => {
      const header = createHeader(
        "  膝のトレーニング  ",
        createHeaderSettings(),
        OUTPUT_DATE
      );

      expect(extractTextContent(header)).toContain("膝のトレーニング");
    });

    it.each(["", "   "])(
      "タイトルが「%s」の場合、タイトルと区切りの空白は表示されない",
      (title) => {
        const header = createHeader(title, createHeaderSettings(), OUTPUT_DATE);

        expect(extractTextContent(header)).toEqual([PDF_LABELS.patientLabel]);
      }
    );

    it("印字される文字はタイトルと氏名ラベルのみ（氏名は手書き用の空欄）", () => {
      const header = createHeader("テスト", createHeaderSettings(), OUTPUT_DATE);

      const visibleTexts = extractTextContent(header).filter(
        (text) => text.trim() !== ""
      );
      expect(visibleTexts).toEqual(["テスト", PDF_LABELS.patientLabel]);
    });

    it("氏名ラベルの横に記入欄の枠が描画される", () => {
      const header = createHeader("", createHeaderSettings(), OUTPUT_DATE);

      // ヘッダー本体・行・氏名欄コンテナ・記入枠
      expect(findElementsByType(header, "View")).toHaveLength(4);
    });

    it("高さは PDF_HEADER_HEIGHT になる", () => {
      const header = createHeader("テスト", createHeaderSettings(), OUTPUT_DATE);

      expect(getMinHeight(header)).toBe(PDF_HEADER_HEIGHT);
    });
  });

  it("氏名欄をオフにすると、氏名ラベルと記入欄を出さない", () => {
    const header = createHeader(
      "テスト",
      createHeaderSettings({ showPatientNameBox: false }),
      OUTPUT_DATE
    );

    expect(extractTextContent(header)).toEqual(["テスト"]);
  });

  it("日付を「記入欄」にすると、日付ラベルと空枠を氏名欄の前に出す", () => {
    const header = createHeader(
      "テスト",
      createHeaderSettings({ dateMode: "blank" }),
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
      createHeaderSettings({ dateMode: "printed", showPatientNameBox: false }),
      OUTPUT_DATE
    );

    expect(extractTextContent(header)).toEqual([
      PDF_LABELS.dateLabel,
      "2026年11月24日",
    ]);
  });
});
