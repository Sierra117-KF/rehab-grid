/**
 * lib/pdf/card.ts のユニットテスト
 */

import {
  DEFAULT_THEME_COLOR,
  LABELS,
  PDF_SUPPORTED_IMAGE_PREFIXES,
  TEXT_LIMITS,
} from "@rehab-grid/core/lib/constants";
import { describe, expect, it, vi } from "vitest";

import {
  createTestItem,
  extractDividerColors,
  extractTextContent,
  findElementsByType,
} from "./pdfTestUtils";

vi.mock("@react-pdf/renderer", async () => (await import("./pdfTestUtils")).reactPdfMock);

import { createCard } from "@/lib/pdf/card";

describe("createCard", () => {
  describe("タイトル", () => {
    it("タイトルが表示される", () => {
      const card = createCard(createTestItem({ title: "スクワット" }), 200);

      expect(extractTextContent(card)).toContain("スクワット");
    });

    it("タイトルが空の場合「無題の運動」が表示される", () => {
      const card = createCard(createTestItem({ title: "" }), 200);

      expect(extractTextContent(card)).toContain(LABELS.untitledExercise);
    });

    it("上限を超えるタイトルは TEXT_LIMITS の文字数でカットされる", () => {
      const card = createCard(createTestItem({ title: "あ".repeat(100) }), 200);

      expect(extractTextContent(card)).toContain("あ".repeat(TEXT_LIMITS.title));
    });

    it("カード幅の1行に収まらないタイトルは省略記号付きで切り詰められる", () => {
      const title = "あ".repeat(TEXT_LIMITS.title);
      const card = createCard(createTestItem({ title }), 100);

      const titleText = extractTextContent(card).find((t) => t.includes("あ"));
      expect(titleText).toMatch(/^あ+…$/);
      expect(titleText!.length).toBeLessThan(title.length);
    });
  });

  describe("説明文", () => {
    it("説明文が表示される", () => {
      const card = createCard(
        createTestItem({ description: "膝を90度に曲げる" }),
        200
      );

      expect(extractTextContent(card)).toContain("膝を90度に曲げる");
    });

    it("説明文が空の場合は表示されない", () => {
      const card = createCard(
        createTestItem({ title: "テスト", description: "" }),
        200
      );

      expect(extractTextContent(card)).toEqual(["テスト"]);
    });
  });

  describe("画像", () => {
    it.each(PDF_SUPPORTED_IMAGE_PREFIXES)(
      "対応形式 %s は Image として表示される",
      (prefix) => {
        const imageUrl = `${prefix};base64,test123`;
        const card = createCard(
          createTestItem({ imageSource: "img-1" }),
          200,
          imageUrl
        );

        const images = findElementsByType(card, "Image");
        expect(images).toHaveLength(1);
        expect(images[0]?.props?.src).toBe(imageUrl);
      }
    );

    it.each([
      ["未指定", undefined],
      ["空文字", ""],
      ["WebP", "data:image/webp;base64,test"],
      ["GIF", "data:image/gif;base64,test"],
      ["SVG", "data:image/svg+xml;base64,test"],
      ["Blob URL", "blob:http://localhost/abc"],
      ["外部URL", "https://example.com/image.jpg"],
    ])("%s の場合は「画像なし」の文字もない空白の枠になる", (_, url) => {
      const card = createCard(createTestItem({ imageSource: "img-1" }), 200, url);

      expect(findElementsByType(card, "Image")).toHaveLength(0);
      expect(extractTextContent(card)).not.toContain(LABELS.noImage);
    });
  });

  describe("用量（dosages）", () => {
    it("すべて設定されている場合、3項目の数値とラベルが表示される", () => {
      const card = createCard(
        createTestItem({
          dosages: { reps: "10回", sets: "3セット", frequency: "1日2回" },
        }),
        200
      );

      const texts = extractTextContent(card);
      expect(texts).toEqual(
        expect.arrayContaining([
          "10回",
          "3セット",
          "1日2回",
          LABELS.reps,
          LABELS.sets,
          LABELS.frequency,
        ])
      );
    });

    it("一部のみ設定されている場合、空の項目はラベルも表示されない", () => {
      const card = createCard(
        createTestItem({ dosages: { reps: "10回", sets: "", frequency: "" } }),
        200
      );

      const texts = extractTextContent(card);
      expect(texts).toContain("10回");
      expect(texts).toContain(LABELS.reps);
      expect(texts).not.toContain(LABELS.sets);
      expect(texts).not.toContain(LABELS.frequency);
    });

    it("長い値は TEXT_LIMITS の文字数で切り詰められる", () => {
      const card = createCard(
        createTestItem({
          dosages: { reps: "a".repeat(TEXT_LIMITS.reps + 5), sets: "", frequency: "" },
        }),
        200
      );

      expect(extractTextContent(card)).toContain("a".repeat(TEXT_LIMITS.reps));
    });

    it("4列レイアウトでも頻度の数値とラベルが表示される", () => {
      const card = createCard(
        createTestItem({
          dosages: { reps: "10回", sets: "3セット", frequency: "毎日" },
        }),
        150,
        undefined,
        { layoutType: "grid4", themeColor: DEFAULT_THEME_COLOR }
      );

      const texts = extractTextContent(card);
      expect(texts).toContain("毎日");
      expect(texts).toContain(LABELS.frequency);
    });

    it.each([
      ["既定のテーマカラー", DEFAULT_THEME_COLOR, "#c4dafc"],
      ["指定したテーマカラー", "#059669", "#b4e0d2"],
      ["大文字のテーマカラー", "#059669".toUpperCase(), "#b4e0d2"],
    ])(
      "%s を白地に重ねた不透明色が、すべてのラベルの区切り線に使われる",
      (_, themeColor, expected) => {
        const card = createCard(
          createTestItem({
            dosages: { reps: "10回", sets: "3セット", frequency: "毎日" },
          }),
          150,
          undefined,
          { layoutType: "grid4", themeColor }
        );

        // 4列時は頻度を横幅いっぱいの行に分けるため、通常行と全幅行の両方を確認できる
        expect(extractDividerColors(card)).toEqual([expected, expected, expected]);
      }
    );

    it("設定を省略した場合は既定のテーマカラーで区切り線を描く", () => {
      const card = createCard(
        createTestItem({ dosages: { reps: "10回", sets: "", frequency: "" } }),
        200
      );

      expect(extractDividerColors(card)).toEqual(["#c4dafc"]);
    });

    it.each([
      ["未定義", undefined],
      ["全項目が空", { reps: "", sets: "", frequency: "" }],
    ])("%s の場合、用量セクションは生成されない", (_, dosages) => {
      const card = createCard(createTestItem({ dosages }), 200);

      const texts = extractTextContent(card);
      expect(texts).not.toContain(LABELS.reps);
      expect(texts).not.toContain(LABELS.sets);
      expect(texts).not.toContain(LABELS.frequency);
    });
  });

  describe("注意点（precautions）", () => {
    it("見出しと各注意点が箇条書きで表示される", () => {
      const card = createCard(
        createTestItem({
          precautions: [
            { id: "p1", value: "痛みが出たら中止" },
            { id: "p2", value: "呼吸を止めない" },
          ],
        }),
        200
      );

      const texts = extractTextContent(card);
      expect(texts).toContain(LABELS.precautionTitle);
      expect(texts).toContain("• 痛みが出たら中止");
      expect(texts).toContain("• 呼吸を止めない");
    });

    it.each([
      ["空配列", []],
      ["未定義", undefined],
    ])("%s の場合、注意点セクションは生成されない", (_, precautions) => {
      const card = createCard(createTestItem({ precautions }), 200);

      expect(extractTextContent(card)).not.toContain(LABELS.precautionTitle);
    });
  });

  it("カードはページをまたいで分割されない", () => {
    const card = createCard(createTestItem(), 200);

    expect(card.props).toMatchObject({ wrap: false });
  });
});
