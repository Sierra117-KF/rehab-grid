/**
 * lib/pdf/header.ts のユニットテスト
 */

import { PDF_LABELS } from "@rehab-grid/core/lib/constants";
import { describe, expect, it, vi } from "vitest";

import { extractTextContent, findElementsByType } from "./pdfTestUtils";

vi.mock("@react-pdf/renderer", async () => (await import("./pdfTestUtils")).reactPdfMock);

import { createHeader } from "@/lib/pdf/header";

describe("createHeader", () => {
  it("タイトルがある場合、タイトルが表示される", () => {
    const header = createHeader("自主トレーニング指導箋");

    expect(extractTextContent(header)).toContain("自主トレーニング指導箋");
  });

  it("タイトルの前後の空白は除去して表示される", () => {
    const header = createHeader("  膝のトレーニング  ");

    expect(extractTextContent(header)).toContain("膝のトレーニング");
  });

  it.each(["", "   "])(
    "タイトルが「%s」の場合、タイトルと区切りの空白は表示されない",
    (title) => {
      const header = createHeader(title);

      expect(extractTextContent(header)).toEqual([PDF_LABELS.patientLabel]);
    }
  );

  it("印字される文字はタイトルと氏名ラベルのみ（氏名は手書き用の空欄）", () => {
    const header = createHeader("テスト");

    const visibleTexts = extractTextContent(header).filter(
      (text) => text.trim() !== ""
    );
    expect(visibleTexts).toEqual(["テスト", PDF_LABELS.patientLabel]);
  });

  it("氏名ラベルの横に記入欄の枠が描画される", () => {
    const header = createHeader("");

    // ヘッダー本体・行・氏名欄コンテナ・記入枠
    expect(findElementsByType(header, "View")).toHaveLength(4);
  });
});
