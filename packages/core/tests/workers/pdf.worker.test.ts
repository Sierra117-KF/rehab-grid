/**
 * pdf.worker.ts のユニットテスト
 *
 * Web Worker で PDF を生成するためのヘルパー関数群をテストします。
 * jsdom 環境では @react-pdf/renderer が動作しないため、モックを使用。
 */

import {
  LABELS,
  LAYOUT_COLUMNS,
  PDF_LABELS,
  PDF_SUPPORTED_IMAGE_PREFIXES,
} from "@rehab-grid/core/lib/constants";
import {
  type EditorItem,
  type PdfGenerationData,
  type ProjectMeta,
} from "@rehab-grid/core/types";
import { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// モック設定
// ============================================================================

/**
 * vi.hoisted でモック関数を事前定義
 *
 * @remarks
 * vi.mock 内で参照するモック関数は vi.hoisted で事前定義が必要（Vitest v4）
 */
const {
  mockFontLoad,
  mockFontRegister,
  mockFontRegisterHyphenationCallback,
  mockPdf,
} = vi.hoisted(() => {
  const toBlobFn = vi
    .fn()
    .mockResolvedValue(new Blob(["test"], { type: "application/pdf" }));
  return {
    mockFontLoad: vi.fn().mockResolvedValue(undefined),
    mockFontRegister: vi.fn(),
    mockFontRegisterHyphenationCallback: vi.fn(),
    mockPdf: vi.fn(() => ({ toBlob: toBlobFn })),
  };
});

/**
 * react-pdf/renderer のモック
 *
 * - createElement で生成される要素の type は関数への参照になるため、
 *   名前付き関数を使用して function.name でコンポーネントを識別可能にする
 * - 実際のPDF生成は行わず、構造の検証のみを行う
 */
vi.mock("@react-pdf/renderer", () => {
  // 名前付き関数でモックコンポーネントを定義（createElement後もtype.nameで識別可能）
  function Document({ children }: { children?: ReactNode }) {
    return { type: "Document", props: { children } };
  }
  function Page({
    children,
    ...props
  }: {
    children?: ReactNode;
    size?: number[];
    style?: object;
  }) {
    return { type: "Page", props: { children, ...props } };
  }
  function View({
    children,
    ...props
  }: {
    children?: ReactNode;
    style?: object;
  }) {
    return { type: "View", props: { children, ...props } };
  }
  function Text({
    children,
    ...props
  }: {
    children?: ReactNode;
    style?: object;
  }) {
    return { type: "Text", props: { children, ...props } };
  }
  function Image(props: { src?: string; style?: object }) {
    return { type: "Image", props };
  }

  return {
    Document,
    Page,
    View,
    Text,
    Image,
    StyleSheet: {
      create: <T extends object>(styles: T): T => styles,
    },
    Font: {
      register: mockFontRegister,
      load: mockFontLoad,
      registerHyphenationCallback: mockFontRegisterHyphenationCallback,
    },
    pdf: mockPdf,
  };
});

/**
 * self.location のモック（Worker コンテキスト）
 */
vi.stubGlobal("self", {
  location: { origin: "http://localhost:3000" },
  postMessage: vi.fn(),
  onmessage: null,
});

// モック後にインポート
import {
  createCard,
  createHeader,
  createPdfDocument,
  isLayoutType,
  registerFonts,
} from "@/workers/pdf.worker";

// ============================================================================
// ヘルパー関数
// ============================================================================

/**
 * テスト用の EditorItem を生成
 */
function createTestItem(overrides: Partial<EditorItem> = {}): EditorItem {
  return {
    id: "test-item-1",
    order: 0,
    title: "テスト運動",
    imageSource: "",
    description: "",
    ...overrides,
  };
}

/**
 * テスト用の ProjectMeta を生成
 */
function createTestMeta(overrides: Partial<ProjectMeta> = {}): ProjectMeta {
  return {
    version: "1.0.0",
    createdAt: "2025-01-15T00:00:00.000Z",
    updatedAt: "2025-01-15T00:00:00.000Z",
    title: "テストプロジェクト",
    projectType: "training",
    ...overrides,
  };
}

/**
 * テスト用の PdfGenerationData を生成
 */
function createTestData(
  overrides: Partial<PdfGenerationData> = {}
): PdfGenerationData {
  return {
    meta: createTestMeta(),
    layoutType: "grid2",
    items: [],
    images: {},
    ...overrides,
  };
}

/**
 * React 要素のツリーから特定の type を持つ要素を再帰的に検索
 *
 * @remarks
 * createElement で生成された要素の type は関数への参照になるため、
 * type.name（関数名）でもマッチングを行う
 */
function findElementByType(element: unknown, targetType: string): unknown[] {
  const results: unknown[] = [];

  if (!element || typeof element !== "object") return results;

  const el = element as {
    type?: string | ((...args: unknown[]) => unknown);
    props?: { children?: unknown };
  };

  // type が文字列の場合は直接比較、関数の場合は function.name で比較
  const typeName = typeof el.type === "function" ? el.type.name : el.type;
  if (typeName === targetType) {
    results.push(element);
  }

  if (el.props?.children) {
    const children = Array.isArray(el.props.children)
      ? el.props.children
      : [el.props.children];

    for (const child of children) {
      results.push(...findElementByType(child, targetType));
    }
  }

  return results;
}

/**
 * React 要素から Text 要素のテキスト内容を抽出
 */
function extractTextContent(element: unknown): string[] {
  const textElements = findElementByType(element, "Text");
  return textElements.map((el) => {
    const textEl = el as { props?: { children?: string } };
    return textEl.props?.children ?? "";
  });
}

// ============================================================================
// テスト
// ============================================================================

describe("pdf.worker.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isLayoutType", () => {
    it.each(Object.keys(LAYOUT_COLUMNS))(
      "有効なLayoutType '%s' で true を返す",
      (layoutType) => {
        expect(isLayoutType(layoutType)).toBeTruthy();
      }
    );

    it.each(["invalid", "grid5", "", "Grid2", "GRID2"])(
      "無効な値 '%s' で false を返す",
      (value) => {
        expect(isLayoutType(value)).toBeFalsy();
      }
    );
  });

  describe("registerFonts", () => {
    it("Font.register が正しいパラメータで呼ばれる", async () => {
      await registerFonts();

      expect(mockFontRegister).toHaveBeenCalledWith({
        family: "NotoSansJP",
        fonts: [
          {
            src: "http://localhost:3000/fonts/NotoSansJP-Regular.woff",
            fontWeight: "normal",
          },
          {
            src: "http://localhost:3000/fonts/NotoSansJP-Bold.woff",
            fontWeight: "bold",
          },
        ],
      });
    });

    it("Font.registerHyphenationCallback が登録される", async () => {
      await registerFonts();

      expect(mockFontRegisterHyphenationCallback).toHaveBeenCalledTimes(1);
      expect(mockFontRegisterHyphenationCallback).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it("CJK文字を含む単語は文字単位で分割される", async () => {
      await registerFonts();

      // 登録されたコールバック関数を取得
      const callArg = mockFontRegisterHyphenationCallback.mock.calls[0]?.[0];
      expect(callArg).toBeDefined();
      const callback = callArg as (word: string) => string[];

      // 日本語テスト（各文字の後に空文字を挿入してハイフン表示を無効化）
      expect(callback("こんにちは")).toEqual([
        "こ",
        "",
        "ん",
        "",
        "に",
        "",
        "ち",
        "",
        "は",
        "",
      ]);
      // 英語テスト（分割されない）
      expect(callback("Hello")).toEqual(["Hello"]);
      // 混合テスト（CJK文字を含むので空文字挿入方式）
      expect(callback("日本語")).toEqual(["日", "", "本", "", "語", ""]);
    });

    it("Font.load が両方のウェイトで呼ばれる", async () => {
      await registerFonts();

      expect(mockFontLoad).toHaveBeenCalledTimes(2);
      expect(mockFontLoad).toHaveBeenCalledWith({
        fontFamily: "NotoSansJP",
        fontWeight: 400,
      });
      expect(mockFontLoad).toHaveBeenCalledWith({
        fontFamily: "NotoSansJP",
        fontWeight: 700,
      });
    });

    it("フォント読み込み失敗時にエラーがthrowされる", async () => {
      mockFontLoad.mockRejectedValueOnce(new Error("Network error"));

      await expect(registerFonts()).rejects.toThrow(
        "フォントの読み込みに失敗しました: Network error"
      );
    });

    it("非Errorオブジェクトの失敗もエラーメッセージに含まれる", async () => {
      mockFontLoad.mockRejectedValueOnce("Unknown error");

      await expect(registerFonts()).rejects.toThrow(
        "フォントの読み込みに失敗しました: Unknown error"
      );
    });
  });

  describe("createHeader", () => {
    it("タイトルがある場合、タイトルが表示される", () => {
      const header = createHeader("自主トレーニング指導箋");

      const textContents = extractTextContent(header);
      expect(textContents).toContain("自主トレーニング指導箋");
    });

    it("タイトルが空の場合、タイトル行は非表示", () => {
      const header = createHeader("");

      const textContents = extractTextContent(header);
      // 空タイトルは含まれない
      expect(textContents).not.toContain("");
    });

    it("タイトルが空白のみの場合、タイトル行は非表示", () => {
      const header = createHeader("   ");

      const textContents = extractTextContent(header);
      // トリムされて空になるため、空白のみの要素は含まれない
      const hasOnlyWhitespace = textContents.some((t) => t.trim() === "");
      expect(hasOnlyWhitespace).toBeFalsy();
    });

    it("患者情報（氏名ラベル）は常に表示される", () => {
      const header = createHeader("");

      const textContents = extractTextContent(header);
      expect(textContents).toContain(PDF_LABELS.patientLabel);
    });

    it("患者名ボックス（View）が生成される", () => {
      const header = createHeader("テスト");

      const views = findElementByType(header, "View");
      // ヘッダー自体 + 患者情報View + 患者名ボックス = 3つ以上
      expect(views.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("createCard", () => {
    describe("タイトル表示", () => {
      it("タイトルが正しく表示される", () => {
        const item = createTestItem({ title: "スクワット" });
        const card = createCard(item, 200);

        const textContents = extractTextContent(card);
        expect(textContents).toContain("スクワット");
      });

      it("タイトルが空の場合「無題の運動」が表示される", () => {
        const item = createTestItem({ title: "" });
        const card = createCard(item, 200);

        const textContents = extractTextContent(card);
        expect(textContents).toContain(LABELS.untitledExercise);
      });

      it("長いタイトルはトランケートされる", () => {
        const longTitle = "あ".repeat(100);
        const item = createTestItem({ title: longTitle });
        const card = createCard(item, 200);

        const textContents = extractTextContent(card);
        // タイトルが省略記号で終わるか、元のタイトルより短いことを確認
        const titleText = textContents.find((t) => t.includes("あ"));
        expect(titleText).toBeDefined();
        expect(titleText!.length).toBeLessThan(longTitle.length);
      });
    });

    describe("説明文表示", () => {
      it("説明文が正しく表示される", () => {
        const item = createTestItem({ description: "膝を90度に曲げる" });
        const card = createCard(item, 200);

        const textContents = extractTextContent(card);
        expect(textContents).toContainEqual(
          expect.stringContaining("膝を90度に曲げる")
        );
      });

      it("説明文が空の場合は表示されない", () => {
        const item = createTestItem({ title: "テスト", description: "" });
        const card = createCard(item, 200);

        // 説明文の Text 要素は生成されない
        const textContents = extractTextContent(card);
        // タイトルと画像プレースホルダーのみ（説明文なし）
        const nonTitleOrPlaceholder = textContents.filter(
          (t) => t !== "テスト" && t !== LABELS.noImage
        );
        expect(nonTitleOrPlaceholder).toHaveLength(0);
      });
    });

    describe("画像表示", () => {
      it("画像URLがある場合Imageコンポーネントが生成される", () => {
        const item = createTestItem({ imageSource: "img-1" });
        const imageUrl = "data:image/jpeg;base64,test123";
        const card = createCard(item, 200, imageUrl);

        const images = findElementByType(card, "Image");
        expect(images).toHaveLength(1);

        const image = images[0] as { props?: { src?: string } };
        expect(image.props?.src).toBe(imageUrl);
      });

      it("画像URLがない場合、空白プレースホルダーが表示される", () => {
        const item = createTestItem({ imageSource: "" });
        const card = createCard(item, 200);

        // 画像要素がないことを確認
        const images = findElementByType(card, "Image");
        expect(images).toHaveLength(0);

        // 「画像なし」テキストは表示されない（PDF印刷後に手書きで追加できるよう空白にする）
        const textContents = extractTextContent(card);
        expect(textContents).not.toContain(LABELS.noImage);
      });

      it("画像URLがundefinedの場合、空白プレースホルダーが表示される", () => {
        const item = createTestItem({ imageSource: "" });
        const card = createCard(item, 200, undefined);

        // 「画像なし」テキストは表示されない
        const textContents = extractTextContent(card);
        expect(textContents).not.toContain(LABELS.noImage);
      });

      it.each([
        ["data:image/webp;base64,test", "WebP"],
        ["data:image/gif;base64,test", "GIF"],
        ["data:image/svg+xml;base64,test", "SVG"],
        ["blob:http://localhost/abc", "Blob URL"],
        ["https://example.com/image.jpg", "外部URL"],
      ])("非対応形式 %s は空白プレースホルダーになる", (url) => {
        const item = createTestItem({ imageSource: "img-1" });
        const card = createCard(item, 200, url);

        // 画像要素がないことを確認
        const images = findElementByType(card, "Image");
        expect(images).toHaveLength(0);

        // 「画像なし」テキストは表示されない
        const textContents = extractTextContent(card);
        expect(textContents).not.toContain(LABELS.noImage);
      });

      it.each(PDF_SUPPORTED_IMAGE_PREFIXES)(
        "対応形式 %s は画像として表示される",
        (prefix) => {
          const item = createTestItem({ imageSource: "img-1" });
          const imageUrl = `${prefix};base64,test123`;
          const card = createCard(item, 200, imageUrl);

          const images = findElementByType(card, "Image");
          expect(images).toHaveLength(1);
        }
      );
    });

    describe("バッジ表示（dosages）", () => {
      it("全てのdosagesが設定されている場合、3つのバッジが表示される", () => {
        const item = createTestItem({
          dosages: {
            reps: "10回",
            sets: "3セット",
            frequency: "1日2回",
          },
        });
        const card = createCard(item, 200);

        const textContents = extractTextContent(card);
        expect(textContents).toContain("10回");
        expect(textContents).toContain("3セット");
        expect(textContents).toContain("1日2回");
        expect(textContents).toContain(LABELS.reps);
        expect(textContents).toContain(LABELS.sets);
        expect(textContents).toContain(LABELS.frequency);
      });

      it("一部のdosagesのみ設定されている場合、設定されている項目が表示される", () => {
        const item = createTestItem({
          dosages: {
            reps: "10回",
            sets: "",
            frequency: "",
          },
        });
        const card = createCard(item, 200);

        const textContents = extractTextContent(card);
        expect(textContents).toContain("10回");
        expect(textContents).toContain(LABELS.reps);
        // 空のバッジはラベル・値なし（View のみ）
      });

      it("dosagesが未定義の場合、バッジコンテナは生成されない", () => {
        const item = createTestItem({ dosages: undefined });
        const card = createCard(item, 200);

        const textContents = extractTextContent(card);
        expect(textContents).not.toContain(LABELS.reps);
        expect(textContents).not.toContain(LABELS.sets);
        expect(textContents).not.toContain(LABELS.frequency);
      });

      it("dosagesの全フィールドが空の場合、バッジコンテナは生成されない", () => {
        const item = createTestItem({
          dosages: { reps: "", sets: "", frequency: "" },
        });
        const card = createCard(item, 200);

        const textContents = extractTextContent(card);
        expect(textContents).not.toContain(LABELS.reps);
      });
    });

    describe("注意点表示（precautions）", () => {
      it("注意点が正しく表示される", () => {
        const item = createTestItem({
          precautions: [
            { id: "p1", value: "痛みが出たら中止" },
            { id: "p2", value: "呼吸を止めない" },
          ],
        });
        const card = createCard(item, 200);

        const textContents = extractTextContent(card);
        expect(textContents).toContain(LABELS.precautionTitle);
        expect(textContents).toContainEqual(
          expect.stringContaining("痛みが出たら中止")
        );
        expect(textContents).toContainEqual(
          expect.stringContaining("呼吸を止めない")
        );
      });

      it("注意点の先頭にビュレット（•）が付く", () => {
        const item = createTestItem({
          precautions: [{ id: "p1", value: "痛みが出たら中止" }],
        });
        const card = createCard(item, 200);

        const textContents = extractTextContent(card);
        expect(textContents).toContainEqual(expect.stringMatching(/^• /));
      });

      it("注意点が空配列の場合、注意点セクションは生成されない", () => {
        const item = createTestItem({ precautions: [] });
        const card = createCard(item, 200);

        const textContents = extractTextContent(card);
        expect(textContents).not.toContain(LABELS.precautionTitle);
      });

      it("注意点がundefinedの場合、注意点セクションは生成されない", () => {
        const item = createTestItem({ precautions: undefined });
        const card = createCard(item, 200);

        const textContents = extractTextContent(card);
        expect(textContents).not.toContain(LABELS.precautionTitle);
      });
    });
  });

  describe("createPdfDocument", () => {
    it("有効なlayoutTypeでドキュメントが生成される", () => {
      const data = createTestData({ layoutType: "grid2" });
      const doc = createPdfDocument(data);

      expect(doc).toBeDefined();
      // createElement の結果、type は Document 関数への参照になる
      const docEl = doc as unknown as { type?: { name?: string } | string };
      const typeName =
        typeof docEl.type === "function" ? docEl.type.name : docEl.type;
      expect(typeName).toBe("Document");
    });

    it("無効なlayoutTypeの場合デフォルト（grid2）が使用される", () => {
      const data = createTestData({
        // @ts-expect-error - テスト用に無効な値を渡す
        layoutType: "invalid",
      });
      const doc = createPdfDocument(data);

      // エラーなく生成される（内部でgrid2にフォールバック）
      expect(doc).toBeDefined();
    });

    it("itemsがorder順でソートされる", () => {
      const items = [
        createTestItem({ id: "item-3", order: 2, title: "3番目" }),
        createTestItem({ id: "item-1", order: 0, title: "1番目" }),
        createTestItem({ id: "item-2", order: 1, title: "2番目" }),
      ];
      const data = createTestData({ items });
      const doc = createPdfDocument(data);

      // Viewコンテナ内のカードを取得
      const views = findElementByType(doc, "View");

      // gridContainerを探す（style.flexWrap: "wrap" を持つView）
      const gridContainer = views.find((v) => {
        const view = v as { props?: { style?: { flexWrap?: string } } };
        return view.props?.style?.flexWrap === "wrap";
      });

      expect(gridContainer).toBeDefined();

      // 順序が正しいか確認（タイトルの順序）
      const textContents = extractTextContent(doc);
      const titleIndex1 = textContents.indexOf("1番目");
      const titleIndex2 = textContents.indexOf("2番目");
      const titleIndex3 = textContents.indexOf("3番目");

      expect(titleIndex1).toBeLessThan(titleIndex2);
      expect(titleIndex2).toBeLessThan(titleIndex3);
    });

    it("ヘッダー・グリッドが生成される", () => {
      const data = createTestData({
        meta: createTestMeta({
          title: "テストタイトル",
        }),
        items: [createTestItem()],
      });
      const doc = createPdfDocument(data);

      const textContents = extractTextContent(doc);

      // ヘッダー
      expect(textContents).toContain("テストタイトル");
      expect(textContents).toContain(PDF_LABELS.patientLabel);

      // カード（グリッド内）
      expect(textContents).toContain("テスト運動");
    });

    it("画像マップから正しい画像URLが渡される", () => {
      /** テスト用画像ID */
      const IMG_ID_1 = "img1";
      const IMG_ID_2 = "img2";

      const items = [
        createTestItem({ id: "item-1", imageSource: IMG_ID_1 }),
        createTestItem({ id: "item-2", imageSource: IMG_ID_2, order: 1 }),
      ];
      const images: Record<string, string> = {
        [IMG_ID_1]: "data:image/jpeg;base64,image1",
        [IMG_ID_2]: "data:image/png;base64,image2",
      };
      const data = createTestData({ items, images });
      const doc = createPdfDocument(data);

      const imageElements = findElementByType(doc, "Image");
      expect(imageElements).toHaveLength(2);

      const imageSrcs = imageElements.map((el) => {
        const img = el as { props?: { src?: string } };
        return img.props?.src;
      });

      expect(imageSrcs).toContain("data:image/jpeg;base64,image1");
      expect(imageSrcs).toContain("data:image/png;base64,image2");
    });

    it("imageSourceが空のアイテムには空白プレースホルダーが表示される", () => {
      const items = [createTestItem({ id: "item-1", imageSource: "" })];
      const data = createTestData({ items, images: {} });
      const doc = createPdfDocument(data);

      // 画像要素がないことを確認
      const images = findElementByType(doc, "Image");
      expect(images).toHaveLength(0);

      // 「画像なし」テキストは表示されない（PDF印刷後に手書きで追加できるよう空白にする）
      const textContents = extractTextContent(doc);
      expect(textContents).not.toContain(LABELS.noImage);
    });

    it("Page要素にサイズとスタイルが設定される", () => {
      const data = createTestData({ layoutType: "grid2" });
      const doc = createPdfDocument(data);

      const pages = findElementByType(doc, "Page");
      expect(pages).toHaveLength(1);

      const page = pages[0] as { props?: { size?: number[]; style?: object } };
      expect(page.props?.size).toBeDefined();
      expect(Array.isArray(page.props?.size)).toBeTruthy();
      expect(page.props?.style).toBeDefined();
    });
  });
});
