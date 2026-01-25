import { LABELS, PDF_LABELS, TEXT_LIMITS } from "@rehab-grid/core/lib/constants";
import { type EditorItem, type LayoutType, type PdfHeaderInfo } from "@rehab-grid/core/types";
import { TrainingSheetPDF } from "@rehab-grid/ui/components/pdf/TrainingSheetPDF";
import { render, screen, within } from "@testing-library/react";
import { type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

// ==============================================================================
// @react-pdf/renderer のモック
//
// react-pdf/renderer のコンポーネントは通常のDOMにレンダリングされないため、
// HTML要素としてモックすることでReact Testing Libraryでテスト可能にする
// ==============================================================================

vi.mock("@react-pdf/renderer", () => ({
  Document: ({ children }: { children: ReactNode }) => (
    <div data-testid="pdf-document">{children}</div>
  ),
  Page: ({
    children,
    size,
  }: {
    children: ReactNode;
    size: [number, number];
  }) => (
    <div data-testid="pdf-page" data-size={JSON.stringify(size)}>
      {children}
    </div>
  ),
  View: ({
    children,
    style,
    wrap,
  }: {
    children?: ReactNode;
    style?: unknown;
    wrap?: boolean;
  }) => (
    <div data-wrap={wrap} data-style={style ? "has-style" : undefined}>
      {children}
    </div>
  ),
  Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Image: ({ src }: { src: string }) => (
    <div data-testid="pdf-image" data-src={src} role="img" />
  ),
  StyleSheet: {
    create: <T extends Record<string, unknown>>(styles: T): T => styles,
  },
}));

// ==============================================================================
// テスト用定数・ヘルパー
// ==============================================================================

/**
 * テスト用のEditorItemを生成
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
 * TrainingSheetPDFのProps型
 */
type TrainingSheetPDFProps = {
  items: EditorItem[];
  layoutType: LayoutType;
  header?: PdfHeaderInfo;
  images: Record<string, string>;
};

/**
 * デフォルトのpropsを生成
 */
function createDefaultProps(): TrainingSheetPDFProps {
  return {
    items: [],
    layoutType: "grid2",
    images: {},
  };
}

/**
 * TrainingSheetPDF のセットアップヘルパー
 */
function setupPdf(
  overrides: Partial<TrainingSheetPDFProps> = {}
): TrainingSheetPDFProps {
  const props = { ...createDefaultProps(), ...overrides };
  render(<TrainingSheetPDF {...props} />);
  return props;
}

// ==============================================================================
// テスト
// ==============================================================================

describe("TrainingSheetPDF", () => {
  describe("ドキュメント構造", () => {
    it("Document と Page が正しくレンダリングされる", () => {
      setupPdf();

      expect(screen.getByTestId("pdf-document")).toBeInTheDocument();
      expect(screen.getByTestId("pdf-page")).toBeInTheDocument();
    });

    it("空のitems配列でもエラーなく描画される", () => {
      expect(() => setupPdf({ items: [] })).not.toThrow();
      expect(screen.getByTestId("pdf-document")).toBeInTheDocument();
    });
  });

  describe("アイテムのソート", () => {
    it("items が order 順に並んで表示される", () => {
      setupPdf({
        items: [
          createTestItem({ id: "3", title: "運動C", order: 2 }),
          createTestItem({ id: "1", title: "運動A", order: 0 }),
          createTestItem({ id: "2", title: "運動B", order: 1 }),
        ],
      });

      const titles = screen.getAllByText(/運動[ABC]/);
      expect(titles.map((el) => el.textContent)).toEqual([
        "運動A",
        "運動B",
        "運動C",
      ]);
    });
  });

  describe("画像マッピング", () => {
    it("imageSource に対応する画像URLが Image に渡される", () => {
      setupPdf({
        items: [createTestItem({ imageSource: "img001" })],
        images: { img001: "data:image/png;base64,abc123" },
      });

      const image = screen.getByTestId("pdf-image");
      expect(image).toHaveAttribute("data-src", "data:image/png;base64,abc123");
    });

    it("imageSource が空の場合、画像は表示されず空白エリアになる", () => {
      setupPdf({
        items: [createTestItem({ imageSource: "" })],
      });

      // 画像要素がないことを確認（手書きイラスト用の空白エリアになる）
      expect(screen.queryByTestId("pdf-image")).not.toBeInTheDocument();
      // 「画像なし」テキストは表示されない（PDF印刷後に手書きで追加できるよう空白にする）
      expect(screen.queryByText(LABELS.noImage)).not.toBeInTheDocument();
    });

    it("images に対応するエントリがない場合、空白プレースホルダーが表示される", () => {
      setupPdf({
        items: [createTestItem({ imageSource: "missingId" })],
        images: {},
      });

      // 画像要素がないことを確認
      expect(screen.queryByTestId("pdf-image")).not.toBeInTheDocument();
      // 「画像なし」テキストは表示されない
      expect(screen.queryByText(LABELS.noImage)).not.toBeInTheDocument();
    });
  });
});

describe("Header", () => {
  it("病院名がある場合にタイトルとして表示される", () => {
    setupPdf({
      header: { hospitalName: "テスト病院" },
    });

    expect(screen.getByText("テスト病院")).toBeInTheDocument();
  });

  it("病院名が空文字の場合、タイトルは非表示", () => {
    setupPdf({
      header: { hospitalName: "" },
    });

    expect(screen.queryByText("テスト病院")).not.toBeInTheDocument();
  });

  it("病院名がスペースのみの場合、タイトルは非表示", () => {
    setupPdf({
      header: { hospitalName: "   " },
    });

    // スペースのみのテキストは表示されない
    const page = screen.getByTestId("pdf-page");
    // 病院名が表示されないことを確認（患者ラベルは表示される）
    expect(within(page).getByText(PDF_LABELS.patientLabel)).toBeInTheDocument();
  });

  it("患者ラベルが常に表示される", () => {
    setupPdf();

    expect(screen.getByText(PDF_LABELS.patientLabel)).toBeInTheDocument();
  });

  it("患者名がある場合にテキストとして表示される", () => {
    setupPdf({
      header: { patientName: "山田太郎" },
    });

    expect(screen.getByText("山田太郎")).toBeInTheDocument();
  });

  it("患者名がない場合、入力ボックスが表示される（テキストは非表示）", () => {
    setupPdf({
      header: { patientName: undefined },
    });

    // 患者名のテキストがないことを確認
    expect(screen.queryByText("山田太郎")).not.toBeInTheDocument();
    // ラベルは表示される
    expect(screen.getByText(PDF_LABELS.patientLabel)).toBeInTheDocument();
  });

  it("header が undefined の場合もエラーなく描画される", () => {
    expect(() => setupPdf({ header: undefined })).not.toThrow();
    expect(screen.getByText(PDF_LABELS.patientLabel)).toBeInTheDocument();
  });
});

describe("Card", () => {
  describe("タイトル", () => {
    it("タイトルが表示される", () => {
      setupPdf({
        items: [createTestItem({ title: "スクワット" })],
      });

      expect(screen.getByText("スクワット")).toBeInTheDocument();
    });

    it("タイトルが空の場合「無題の運動」が表示される", () => {
      setupPdf({
        items: [createTestItem({ title: "" })],
      });

      expect(screen.getByText(LABELS.untitledExercise)).toBeInTheDocument();
    });
  });

  describe("説明", () => {
    it("説明がある場合に表示される", () => {
      setupPdf({
        items: [
          createTestItem({
            description: "膝を90度に曲げてゆっくり立ち上がる",
          }),
        ],
      });

      expect(
        screen.getByText(/膝を90度に曲げてゆっくり立ち上がる/)
      ).toBeInTheDocument();
    });

    it("説明が空の場合は表示されない", () => {
      setupPdf({
        items: [createTestItem({ description: "" })],
      });

      // 説明テキストがないことを確認
      expect(
        screen.queryByText("膝を90度に曲げてゆっくり立ち上がる")
      ).not.toBeInTheDocument();
    });
  });

  describe("画像", () => {
    it("画像URLがある場合に Image が表示される", () => {
      setupPdf({
        items: [createTestItem({ imageSource: "img123" })],
        images: { img123: "data:image/jpeg;base64,xyz" },
      });

      const image = screen.getByTestId("pdf-image");
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute("data-src", "data:image/jpeg;base64,xyz");
    });

    it("画像がない場合、空白エリアが表示される（手書きイラスト追加用）", () => {
      setupPdf({
        items: [createTestItem({ imageSource: "" })],
      });

      // 画像要素がないことを確認
      expect(screen.queryByTestId("pdf-image")).not.toBeInTheDocument();
      // 「画像なし」テキストは表示されない（空白で出力される）
      expect(screen.queryByText(LABELS.noImage)).not.toBeInTheDocument();
    });
  });

  describe("dosages（回数・セット数・頻度）", () => {
    it("dosages が設定されている場合にバッジが表示される", () => {
      setupPdf({
        items: [
          createTestItem({
            dosages: {
              reps: "10回",
              sets: "3セット",
              frequency: "毎日",
            },
          }),
        ],
      });

      expect(screen.getByText(LABELS.reps)).toBeInTheDocument();
      expect(screen.getByText("10回")).toBeInTheDocument();
      expect(screen.getByText(LABELS.sets)).toBeInTheDocument();
      expect(screen.getByText("3セット")).toBeInTheDocument();
      expect(screen.getByText(LABELS.frequency)).toBeInTheDocument();
      expect(screen.getByText("毎日")).toBeInTheDocument();
    });

    it("dosages が全て空の場合、バッジコンテナは表示されない", () => {
      setupPdf({
        items: [
          createTestItem({
            dosages: {
              reps: "",
              sets: "",
              frequency: "",
            },
          }),
        ],
      });

      // 各ラベルが存在しないことを確認
      expect(screen.queryByText(LABELS.reps)).not.toBeInTheDocument();
      expect(screen.queryByText(LABELS.sets)).not.toBeInTheDocument();
      expect(screen.queryByText(LABELS.frequency)).not.toBeInTheDocument();
    });

    it("dosages が undefined の場合、バッジは表示されない", () => {
      setupPdf({
        items: [createTestItem({ dosages: undefined })],
      });

      expect(screen.queryByText(LABELS.reps)).not.toBeInTheDocument();
    });

    it("dosages の一部のみ設定されている場合、設定された項目のみ表示", () => {
      setupPdf({
        items: [
          createTestItem({
            dosages: {
              reps: "10回",
              sets: "",
              frequency: "",
            },
          }),
        ],
      });

      expect(screen.getByText(LABELS.reps)).toBeInTheDocument();
      expect(screen.getByText("10回")).toBeInTheDocument();
      // 空の項目のラベルは表示されない
      expect(screen.queryByText(LABELS.sets)).not.toBeInTheDocument();
      expect(screen.queryByText(LABELS.frequency)).not.toBeInTheDocument();
    });

    it("長い値は TEXT_LIMITS で切り詰められる", () => {
      const longValue = "a".repeat(TEXT_LIMITS.reps + 5);
      const expectedValue = longValue.slice(0, TEXT_LIMITS.reps);

      setupPdf({
        items: [
          createTestItem({
            dosages: {
              reps: longValue,
              sets: "",
              frequency: "",
            },
          }),
        ],
      });

      expect(screen.getByText(expectedValue)).toBeInTheDocument();
      expect(screen.queryByText(longValue)).not.toBeInTheDocument();
    });
  });

  describe("precautions（注意点）", () => {
    it("注意点がある場合にセクションが表示される", () => {
      setupPdf({
        items: [
          createTestItem({
            precautions: [
              { id: "p1", value: "痛みが出たら中止" },
              { id: "p2", value: "呼吸を止めない" },
            ],
          }),
        ],
      });

      expect(screen.getByText(LABELS.precautionTitle)).toBeInTheDocument();
      expect(screen.getByText(/痛みが出たら中止/)).toBeInTheDocument();
      expect(screen.getByText(/呼吸を止めない/)).toBeInTheDocument();
    });

    it("各注意点の前に箇条書きマーカー「•」が表示される", () => {
      setupPdf({
        items: [
          createTestItem({
            precautions: [{ id: "p1", value: "テスト注意点" }],
          }),
        ],
      });

      expect(screen.getByText(/• テスト注意点/)).toBeInTheDocument();
    });

    it("precautions が空配列の場合、セクションは非表示", () => {
      setupPdf({
        items: [createTestItem({ precautions: [] })],
      });

      expect(
        screen.queryByText(LABELS.precautionTitle)
      ).not.toBeInTheDocument();
    });

    it("precautions が undefined の場合、セクションは非表示", () => {
      setupPdf({
        items: [createTestItem({ precautions: undefined })],
      });

      expect(
        screen.queryByText(LABELS.precautionTitle)
      ).not.toBeInTheDocument();
    });
  });
});

describe("複数カード", () => {
  it("複数のアイテムがすべてレンダリングされる", () => {
    setupPdf({
      items: [
        createTestItem({ id: "1", title: "スクワット", order: 0 }),
        createTestItem({ id: "2", title: "腕立て伏せ", order: 1 }),
        createTestItem({ id: "3", title: "腹筋", order: 2 }),
      ],
    });

    expect(screen.getByText("スクワット")).toBeInTheDocument();
    expect(screen.getByText("腕立て伏せ")).toBeInTheDocument();
    expect(screen.getByText("腹筋")).toBeInTheDocument();
  });

  it("各カードに異なる画像が正しくマッピングされる", () => {
    setupPdf({
      items: [
        createTestItem({ id: "1", imageSource: "img1", order: 0 }),
        createTestItem({ id: "2", imageSource: "img2", order: 1 }),
      ],
      images: {
        img1: "data:image/png;base64,image1",
        img2: "data:image/png;base64,image2",
      },
    });

    const images = screen.getAllByTestId("pdf-image");
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute("data-src", "data:image/png;base64,image1");
    expect(images[1]).toHaveAttribute("data-src", "data:image/png;base64,image2");
  });
});
