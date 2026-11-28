/**
 * lib/pdf/card.ts のユニットテスト
 */

import {
  DEFAULT_THEME_COLOR,
  LABELS,
  PDF_SUPPORTED_IMAGE_PREFIXES,
  TEXT_LIMITS,
} from "@rehab-grid/core/lib/constants";
import { resolveProjectSettings } from "@rehab-grid/core/lib/settings";
import { type ResolvedProjectSettings } from "@rehab-grid/core/types";
import { describe, expect, it, vi } from "vitest";

import {
  createTestItem,
  extractDividerColors,
  extractTextContent,
  findElementsByType,
} from "./pdfTestUtils";

vi.mock("@react-pdf/renderer", async () => (await import("./pdfTestUtils")).reactPdfMock);

import { createCard, createSlideCard } from "@/lib/pdf/card";

/**
 * テスト用の設定を生成（未指定の項目はデフォルト値）
 */
function createSettings(
  overrides: Partial<ResolvedProjectSettings> = {}
): ResolvedProjectSettings {
  return { ...resolveProjectSettings(undefined), ...overrides };
}

/**
 * 要素の style を取り出す
 */
function getStyle(element: unknown) {
  const props = (element as { props?: { style?: unknown } } | undefined)?.props;
  return props?.style as Record<string, unknown> | undefined;
}

/**
 * 指定したテキストを子孫に持つ View のうち、最も内側のものを返す
 *
 * @remarks
 * 要素ツリーは外側から順に並ぶため、条件に合う最後の要素が最も内側になる
 */
function findInnermostViewWithText(element: unknown, text: string) {
  return findElementsByType(element, "View")
    .filter((el) => extractTextContent(el.props?.children).includes(text))
    .at(-1);
}

/** 用量・注意点をすべて持つカード */
const FULL_ITEM = createTestItem({
  title: "スクワット",
  dosages: { reps: "10回", sets: "3セット", frequency: "1日2回" },
  precautions: [{ id: "p1", value: "痛みが出たら中止" }],
});

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
      // 20 文字（14pt × 20 = 280pt）が 1 行に入る幅のカード
      const card = createCard(createTestItem({ title: "あ".repeat(100) }), 400);

      expect(extractTextContent(card)).toContain("あ".repeat(TEXT_LIMITS.title));
    });

    it("日本語のタイトルは全角の幅で 1 行に収まるよう切り詰められる", () => {
      // コンテンツ幅 184pt ÷ 14pt = 13 文字分。「…」の 1 文字分を空けて 12 文字残る
      const card = createCard(
        createTestItem({ title: "あ".repeat(TEXT_LIMITS.title) }),
        200
      );

      expect(extractTextContent(card)).toContain(`${"あ".repeat(12)}…`);
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
        createSettings({ layoutType: "grid4" })
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
          createSettings({ layoutType: "grid4", themeColor })
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

    it("長い全角の用量値は 1 行に収まるよう自動でフォントサイズを縮小する", () => {
      // 3列レイアウト（横）相当のカード幅 246pt
      const card = createCard(
        createTestItem({
          dosages: {
            reps: "10回",
            sets: "３〜５セット",
            frequency: "左右各１０回ずつ",
          },
        }),
        246,
        undefined,
        createSettings({ layoutType: "grid3" })
      );

      const textElements = findElementsByType(card, "Text");
      const shortSize = getStyle(
        textElements.find((el) => el.props?.children === "10回")
      )?.fontSize as number;
      const mediumSize = getStyle(
        textElements.find((el) => el.props?.children === "３〜５セット")
      )?.fontSize as number;
      const longSize = getStyle(
        textElements.find((el) => el.props?.children === "左右各１０回ずつ")
      )?.fontSize as number;

      expect(shortSize).toBe(14);
      expect(mediumSize).toBeLessThan(14);
      expect(longSize).toBeLessThan(mediumSize);
    });

    it("4列の全幅の頻度行では幅が広いため、2列行より大きいサイズで描画できる", () => {
      const card = createCard(
        createTestItem({
          dosages: {
            reps: "左右各１０回ずつ",
            sets: "３セット",
            frequency: "左右各１０回ずつ",
          },
        }),
        181,
        undefined,
        createSettings({ layoutType: "grid4" })
      );

      const matching = findElementsByType(card, "Text").filter(
        (el) => el.props?.children === "左右各１０回ずつ"
      );
      expect(matching).toHaveLength(2);
      const repsFontSize = getStyle(matching[0])?.fontSize as number;
      const frequencyFontSize = getStyle(matching[1])?.fontSize as number;

      expect(repsFontSize).toBeLessThan(14);
      expect(frequencyFontSize).toBeGreaterThan(repsFontSize);
    });

    it("長いカスタム用量ラベルも狭い幅では自動で縮小される", () => {
      // 3列縦向き相当の狭いカード幅 163pt × 文字サイズ「大きめ」（基準ラベル 9pt）
      const card = createCard(
        createTestItem({
          dosages: { reps: "10回", sets: "3", frequency: "毎日" },
        }),
        163,
        undefined,
        createSettings({
          layoutType: "grid3",
          pageOrientation: "portrait",
          textScale: "large",
          dosageLabels: {
            reps: "左右それぞれ",
            sets: "セット",
            frequency: "頻度",
          },
        })
      );

      const textElements = findElementsByType(card, "Text");
      const longLabelSize = getStyle(
        textElements.find((el) => el.props?.children === "左右それぞれ")
      )?.fontSize as number;
      const shortLabelSize = getStyle(
        textElements.find((el) => el.props?.children === "頻度")
      )?.fontSize as number;

      expect(shortLabelSize).toBe(9);
      expect(longLabelSize).toBeLessThan(9);
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

  describe("枠線", () => {
    it("テーマカラーで枠線を描く", () => {
      const card = createCard(
        createTestItem(),
        200,
        undefined,
        createSettings({ themeColor: "#059669" })
      );

      expect(card.props).toMatchObject({
        style: { borderColor: "#059669", borderWidth: 1 },
      });
    });

    it("設定を省略した場合は既定のテーマカラーで枠線を描く", () => {
      const card = createCard(createTestItem(), 200);

      expect(card.props).toMatchObject({
        style: { borderColor: DEFAULT_THEME_COLOR },
      });
    });
  });

  describe("カード番号", () => {
    it("表示しない設定（既定）ではタイトルの前に番号を描かない", () => {
      const card = createCard(FULL_ITEM, 200, undefined, createSettings(), 3);

      expect(extractTextContent(card)).not.toContain("3");
    });

    it("表示する設定では、タイトルの直前にテーマカラーの丸いバッジで番号を描く", () => {
      const card = createCard(
        FULL_ITEM,
        200,
        undefined,
        createSettings({ showCardNumbers: true, themeColor: "#059669" }),
        3
      );

      const texts = extractTextContent(card);
      expect(texts.indexOf("3")).toBe(texts.indexOf("スクワット") - 1);
      const badge = findInnermostViewWithText(card, "3");
      expect(getStyle(badge)).toMatchObject({ backgroundColor: "#059669" });
    });

    it("番号を省略した場合は order + 1 を表示する", () => {
      const card = createCard(
        createTestItem({ order: 4, title: "運動" }),
        200,
        undefined,
        createSettings({ showCardNumbers: true })
      );

      expect(extractTextContent(card)).toContain("5");
    });

    it("バッジの幅を引いて、タイトルを短めに切り詰める", () => {
      const title = "あ".repeat(TEXT_LIMITS.title);
      const withoutNumber = createCard(createTestItem({ title }), 150);
      const withNumber = createCard(
        createTestItem({ title }),
        150,
        undefined,
        createSettings({ showCardNumbers: true })
      );

      const findTitle = (card: unknown) =>
        extractTextContent(card).find((t) => t.includes("あ")) ?? "";
      expect(findTitle(withNumber).length).toBeLessThan(
        findTitle(withoutNumber).length
      );
      expect(findTitle(withNumber)).toMatch(/^あ+…$/);
    });

    it("番号付きのタイトルは、バッジを除いた幅を上限にしてカードからはみ出さない", () => {
      const card = createCard(
        FULL_ITEM,
        216,
        undefined,
        createSettings({ showCardNumbers: true })
      );

      const title = findElementsByType(card, "Text").find(
        (el) => el.props?.children === "スクワット"
      );
      // コンテンツ幅 200 - バッジ 14 * 1.4 - 間隔 4 = 176.4
      expect(getStyle(title)?.maxWidth).toBeCloseTo(176.4, 6);
    });

    it("非常に狭いカードでも、タイトルは最低 1 文字＋省略記号に切り詰める", () => {
      const card = createCard(
        createTestItem({ title: "あ".repeat(TEXT_LIMITS.title) }),
        40,
        undefined,
        createSettings({ showCardNumbers: true, textScale: "large" })
      );

      expect(extractTextContent(card)).toContain("あ…");
    });
  });

  describe("文字サイズ", () => {
    function getTitleFontSize(settings: ResolvedProjectSettings) {
      const card = createCard(FULL_ITEM, 200, undefined, settings);
      const title = findElementsByType(card, "Text").find(
        (el) => el.props?.children === "スクワット"
      );
      return getStyle(title)?.fontSize;
    }

    it("2〜4列で「大きめ」を選ぶと、タイトルが標準より大きくなる", () => {
      expect(getTitleFontSize(createSettings({ textScale: "large" }))).toBe(18);
      expect(getTitleFontSize(createSettings())).toBe(14);
    });

    it("1列は「大きめ」を選んでも 1 列用の拡大サイズのまま", () => {
      expect(
        getTitleFontSize(createSettings({ layoutType: "grid1", textScale: "large" }))
      ).toBe(24);
    });
  });

  describe("用量のラベル", () => {
    it("設定したラベルを数値の下に表示する", () => {
      const card = createCard(
        FULL_ITEM,
        200,
        undefined,
        createSettings({
          dosageLabels: { reps: "秒数", sets: "左右", frequency: "目安" },
        })
      );

      const texts = extractTextContent(card);
      expect(texts).toEqual(expect.arrayContaining(["秒数", "左右", "目安"]));
      expect(texts).not.toContain(LABELS.reps);
    });

    it("4列の全幅の頻度行にも設定したラベルを使う", () => {
      const card = createCard(
        FULL_ITEM,
        150,
        undefined,
        createSettings({
          layoutType: "grid4",
          dosageLabels: { reps: "回数", sets: "セット", frequency: "強度" },
        })
      );

      expect(extractTextContent(card)).toContain("強度");
    });
  });

  describe("白黒・インク節約", () => {
    const monochrome = createSettings({
      printColorMode: "monochrome",
      showCardNumbers: true,
      themeColor: "#059669",
    });

    function getPrecautionBox(card: unknown) {
      return findInnermostViewWithText(card, LABELS.precautionTitle);
    }

    it("注意点は塗りつぶさず、白背景に濃い枠線で囲む", () => {
      const card = createCard(FULL_ITEM, 200, undefined, monochrome);

      expect(getStyle(getPrecautionBox(card))).toMatchObject({
        backgroundColor: "#ffffff",
        borderWidth: 1,
        borderColor: "#334155",
      });
    });

    it("カラーでは注意点をアンバーで塗りつぶし、枠線は付けない", () => {
      const card = createCard(FULL_ITEM, 200, undefined, createSettings());

      const style = getStyle(getPrecautionBox(card));
      expect(style).toMatchObject({ backgroundColor: "#fef3c7" });
      expect(style).not.toHaveProperty("borderColor");
    });

    it("テーマカラー由来の色（枠線・区切り線・番号バッジ）は slate 系に置き換える", () => {
      const card = createCard(FULL_ITEM, 200, undefined, monochrome, 1);

      expect(getStyle(card)).toMatchObject({ borderColor: "#64748b" });
      expect(new Set(extractDividerColors(card))).toEqual(new Set(["#cbd5e1"]));
      const badge = findInnermostViewWithText(card, "1");
      expect(getStyle(badge)).toMatchObject({ backgroundColor: "#0f172a" });
    });

    it("用量のラベルはグレースケール印刷でも読める濃さ（slate-600）にする", () => {
      const card = createCard(FULL_ITEM, 200, undefined, monochrome);

      const label = findElementsByType(card, "Text").find(
        (el) => el.props?.children === LABELS.reps
      );
      expect(getStyle(label)).toMatchObject({ color: "#475569" });
    });
  });
});

describe("createSlideCard", () => {
  const slideSettings = (overrides: Partial<ResolvedProjectSettings> = {}) =>
    createSettings({ layoutType: "slide", ...overrides });

  /** 最も内側の、指定したテキストを持つ View の style */
  const getBoxStyle = (card: unknown, text: string) =>
    getStyle(findInnermostViewWithText(card, text));

  it("A4 横のコンテンツ幅 × 固定の高さの、ページをまたがないカードになる", () => {
    const card = createSlideCard(FULL_ITEM, undefined, slideSettings(), 1);

    expect(card).toMatchObject({ props: { wrap: false } });
    const style = getStyle(card);
    expect(style?.width).toBeCloseTo(761.89, 6);
    expect(style?.height).toBeCloseTo(460.28, 6);
    expect(style?.marginBottom).toBe(0);
  });

  it("画像がなければ左の列の幅 × 5:3 の空白の枠を置く", () => {
    const card = createSlideCard(FULL_ITEM, undefined, slideSettings(), 1);

    expect(findElementsByType(card, "Image")).toHaveLength(0);
    const placeholder = findElementsByType(card, "View").find(
      (el) => (el as { key?: string }).key === "imagePlaceholder"
    );
    expect(getStyle(placeholder)?.width).toBeCloseTo(422.1762, 6);
    expect(getStyle(placeholder)?.height).toBeCloseTo(253.30572, 6);
  });

  it("対応形式の画像は Image として左の列の幅で表示される", () => {
    const imageUrl = `${PDF_SUPPORTED_IMAGE_PREFIXES[0]};base64,test`;
    const card = createSlideCard(FULL_ITEM, imageUrl, slideSettings(), 1);

    const images = findElementsByType(card, "Image");
    expect(images).toHaveLength(1);
    expect(images[0]?.props?.src).toBe(imageUrl);
  });

  it("タイトルは上の余白なしで左寄せにし、番号バッジを左に置く", () => {
    const card = createSlideCard(
      FULL_ITEM,
      undefined,
      slideSettings({ showCardNumbers: true }),
      3
    );

    const texts = extractTextContent(card);
    expect(texts.indexOf("3")).toBe(texts.indexOf("スクワット") - 1);
    const titleRow = findElementsByType(card, "View").find(
      (el) => (el as { key?: string }).key === "title"
    );
    expect(getStyle(titleRow)).toMatchObject({
      marginTop: 0,
      justifyContent: "flex-start",
    });
    const titleText = findElementsByType(card, "Text").find(
      (el) => el.props?.children === "スクワット"
    );
    expect(getStyle(titleText)).toMatchObject({ textAlign: "left" });
  });

  it("番号バッジなしのタイトルも上の余白なしで左寄せにする", () => {
    const card = createSlideCard(FULL_ITEM, undefined, slideSettings(), 1);

    const title = findElementsByType(card, "Text").find(
      (el) => el.props?.children === "スクワット"
    );
    expect(getStyle(title)).toMatchObject({
      marginTop: 0,
      textAlign: "left",
      fontSize: 24,
    });
  });

  it("右の列に収まらない説明は「…」で切り詰め、注意点は全件出す", () => {
    const item = createTestItem({
      title: "スクワット",
      description: "あ".repeat(TEXT_LIMITS.description),
      // 50 文字の注意点（3 行）が 5 件あると、説明は 5 行（全角 105 文字）までになる
      precautions: Array.from({ length: 5 }, (_, i) => ({
        id: `p${String(i)}`,
        value: "い".repeat(TEXT_LIMITS.precaution),
      })),
    });
    const card = createSlideCard(item, undefined, slideSettings(), 1);

    const texts = extractTextContent(card);
    const description = texts.find((t) => t.startsWith("あ"));
    expect(description).toMatch(/^あ+…$/);
    expect(description!.length).toBeLessThanOrEqual(105);
    // 注意点は 3 行に収まるため切り詰めない
    expect(texts.filter((t) => t === `• ${"い".repeat(50)}`)).toHaveLength(5);
  });

  it("説明があれば注意点の枠の上に余白を取り、説明がなければ余白なしで右の列の最上部に置く", () => {
    const withDescription = createSlideCard(
      createTestItem({ ...FULL_ITEM, description: "膝を曲げる" }),
      undefined,
      slideSettings(),
      1
    );
    const withoutDescription = createSlideCard(
      FULL_ITEM,
      undefined,
      slideSettings(),
      1
    );

    expect(
      getBoxStyle(withDescription, LABELS.precautionTitle)?.marginTop
    ).toBe(6);
    expect(
      getBoxStyle(withoutDescription, LABELS.precautionTitle)?.marginTop
    ).toBe(0);
  });

  it("白黒では注意点を白背景に濃い枠線で囲む", () => {
    const card = createSlideCard(
      FULL_ITEM,
      undefined,
      slideSettings({ printColorMode: "monochrome" }),
      1
    );

    expect(getBoxStyle(card, LABELS.precautionTitle)).toMatchObject({
      backgroundColor: "#ffffff",
      borderWidth: 1,
      borderColor: "#334155",
    });
  });

  it("用量は左の列に 3 列で並べる", () => {
    const card = createSlideCard(FULL_ITEM, undefined, slideSettings(), 1);

    const texts = extractTextContent(card);
    expect(texts).toEqual(
      expect.arrayContaining(["10回", "3セット", "1日2回", LABELS.reps])
    );
    expect(
      findElementsByType(card, "View").filter(
        (el) => (el as { key?: string }).key === "dosages"
      )
    ).toHaveLength(1);
  });
});
