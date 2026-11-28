import {
  BUTTON_ADD_CARD,
  CANVAS_EMPTY_DESCRIPTION,
  CANVAS_EMPTY_TITLE,
  DUPLICATE_TOOLTIP,
  EDITOR_TEXT_STYLE_LARGE,
  EDITOR_TEXT_STYLE_SINGLE_COLUMN,
  INLINE_EDIT_TITLE_LABEL,
  LABELS,
  LAYOUT_COLUMNS,
  MOBILE_TAP_TO_SELECT_IMAGE,
  SHEET_SUMMARY_BUTTON_LABEL,
  TEXT_LIMITS,
} from "@rehab-grid/core/lib/constants";
import { getPdfSlideCardSize } from "@rehab-grid/core/lib/pdf/metrics";
import { resolveProjectSettings } from "@rehab-grid/core/lib/settings";
import { type EditorItem } from "@rehab-grid/core/types";
import { Canvas, type CanvasProps } from "@rehab-grid/ui/components/editor/Canvas";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

/**
 * next/image のモック
 *
 * @remarks dnd-kit のモックは tests/setup.jsdom.ts でグローバルに登録済み
 */
vi.mock("next/image", async () => {
  const { mockNextImage } = await import("@/tests/mocks/next-image");
  return mockNextImage;
});

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
 * デフォルトのpropsを生成
 */
function createDefaultProps(): CanvasProps {
  return {
    items: [],
    onItemsChange: vi.fn(),
    layoutType: "grid2",
    selectedItemId: null,
    onItemSelect: vi.fn(),
    onAddCard: vi.fn(),
    onImageDrop: vi.fn(),
    imageUrls: new Map<string, string>(),
    onAddCardWithImage: vi.fn(),
    canAddCard: true,
    // モバイル用プロパティ
    onImageAreaClick: undefined,
    onSettingsClick: undefined,
    isMobile: false,
  };
}

/**
 * Canvas のセットアップヘルパー
 *
 * テストごとに props を組み立てる重複を減らし、Arrange/Act/Assert を明確にする。
 */
function setupCanvas(overrides: Partial<CanvasProps> = {}): CanvasProps {
  const props = { ...createDefaultProps(), ...overrides };
  render(<Canvas {...props} />);
  return props;
}

describe("Canvas", () => {
  describe("空状態", () => {
    it("items が空のとき EmptyState が表示される", () => {
      setupCanvas();

      expect(screen.getByText(CANVAS_EMPTY_TITLE)).toBeInTheDocument();
      expect(screen.getByText(CANVAS_EMPTY_DESCRIPTION)).toBeInTheDocument();
    });

    it("「カードを追加」ボタンクリックで onAddCard が呼ばれる", async () => {
      const user = userEvent.setup();
      const props = setupCanvas();

      const addButton = screen.getByRole("button", { name: BUTTON_ADD_CARD });
      await user.click(addButton);

      expect(props.onAddCard).toHaveBeenCalledTimes(1);
    });

    it("canAddCard=false のとき追加ボタンが無効になる", () => {
      setupCanvas({ canAddCard: false });

      const addButton = screen.getByRole("button", { name: BUTTON_ADD_CARD });
      expect(addButton).toBeDisabled();
    });
  });

  describe("カード表示", () => {
    it("items があるときカードが表示される", () => {
      setupCanvas({ items: [createTestItem({ title: "スクワット" })] });

      expect(screen.getByText("スクワット")).toBeInTheDocument();
      expect(screen.queryByText(CANVAS_EMPTY_TITLE)).not.toBeInTheDocument();
    });

    it("複数のアイテムがすべて表示される", () => {
      setupCanvas({
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

    it("タイトルが空の場合「無題の運動」と表示される", () => {
      setupCanvas({ items: [createTestItem({ title: "" })] });

      expect(screen.getByText(LABELS.untitledExercise)).toBeInTheDocument();
    });

    it("説明がある場合に正しく表示される", () => {
      setupCanvas({
        items: [
          createTestItem({
            description: "膝を90度に曲げて、ゆっくり立ち上がる",
          }),
        ],
      });

      expect(
        screen.getByText("膝を90度に曲げて、ゆっくり立ち上がる")
      ).toBeInTheDocument();
    });

    it("dosages（回数・セット数・頻度）が正しく表示される", () => {
      setupCanvas({
        items: [
          createTestItem({
            dosages: {
              reps: "10回",
              sets: "3セット",
              frequency: "1日2回",
            },
          }),
        ],
      });

      expect(screen.getByText("10回")).toBeInTheDocument();
      expect(screen.getByText("3セット")).toBeInTheDocument();
      expect(screen.getByText("1日2回")).toBeInTheDocument();
    });

    it("dosagesの一部のみ設定されている場合、設定されている項目のみ表示される", () => {
      setupCanvas({
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

      expect(screen.getByText("10回")).toBeInTheDocument();
    });

    it("用量の文字列が親幅を超える場合、1行に収まるフォントサイズへ自動縮小される", () => {
      const clientWidthSpy = vi
        .spyOn(HTMLElement.prototype, "clientWidth", "get")
        .mockReturnValue(80);
      const scrollWidthSpy = vi
        .spyOn(HTMLElement.prototype, "scrollWidth", "get")
        .mockImplementation(function (this: HTMLElement) {
          // 基準サイズでは 160px（幅の 2 倍）、縮小後は 80px に収まる想定
          return this.style.fontSize === "" ? 160 : 80;
        });
      const originalGetComputedStyle = window.getComputedStyle.bind(window);
      const getComputedStyleSpy = vi
        .spyOn(window, "getComputedStyle")
        .mockImplementation((el, pseudo) =>
          Object.assign(originalGetComputedStyle(el, pseudo), {
            fontSize: "24px",
          })
        );

      try {
        setupCanvas({
          items: [
            createTestItem({
              dosages: {
                reps: "左右各１０回ずつ",
                sets: "",
                frequency: "",
              },
            }),
          ],
          layoutType: "grid3",
        });

        const valueEl = screen.getByText("左右各１０回ずつ");
        expect(valueEl).toHaveClass("whitespace-nowrap");
        expect(valueEl.style.fontSize).toBe("12px");
      } finally {
        clientWidthSpy.mockRestore();
        scrollWidthSpy.mockRestore();
        getComputedStyleSpy.mockRestore();
      }
    });

    it("用量の文字列が親幅に収まる場合は縮小しない", () => {
      const clientWidthSpy = vi
        .spyOn(HTMLElement.prototype, "clientWidth", "get")
        .mockReturnValue(120);
      const scrollWidthSpy = vi
        .spyOn(HTMLElement.prototype, "scrollWidth", "get")
        .mockReturnValue(60);

      try {
        setupCanvas({
          items: [
            createTestItem({
              dosages: {
                reps: "10回",
                sets: "",
                frequency: "",
              },
            }),
          ],
          layoutType: "grid3",
        });

        const valueEl = screen.getByText("10回");
        expect(valueEl.style.fontSize).toBe("");
      } finally {
        clientWidthSpy.mockRestore();
        scrollWidthSpy.mockRestore();
      }
    });

    it("precautions（注意点）が正しく表示される", () => {
      setupCanvas({
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

    it("画像がない場合にプレースホルダーが表示される", () => {
      setupCanvas({ items: [createTestItem({ imageSource: "" })] });

      expect(screen.getByText(LABELS.noImage)).toBeInTheDocument();
    });

    it("画像がある場合に Image コンポーネントが表示される", () => {
      setupCanvas({
        items: [createTestItem({ imageSource: "img-123", title: "運動A" })],
        imageUrls: new Map([["img-123", "blob:http://example.com/image"]]),
      });

      const image = screen.getByRole("img", { name: "運動A" });
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute("src", "blob:http://example.com/image");
      expect(image).toHaveAttribute("alt", "運動A");
    });
  });

  describe("選択機能", () => {
    it("カードクリックで onItemSelect(itemId) が呼ばれる", async () => {
      const user = userEvent.setup();
      const props = setupCanvas({
        items: [createTestItem({ id: "item-1", title: "運動A" })],
      });

      const card = screen.getByTestId("card-item-1");
      await user.click(card);

      expect(props.onItemSelect).toHaveBeenCalledWith("item-1");
    });

    it("キャンバス背景クリックで onItemSelect(null) が呼ばれる", async () => {
      const user = userEvent.setup();
      const props = setupCanvas({ items: [createTestItem()] });

      // キャンバスの背景をクリック
      const canvas = screen.getByRole("region", { name: "キャンバス" });
      await user.click(canvas);

      expect(props.onItemSelect).toHaveBeenCalledWith(null);
    });

    it("selectedItemId に一致するカードが選択状態のスタイルを持つ", () => {
      setupCanvas({
        items: [
          createTestItem({ id: "item-1", title: "運動A" }),
          createTestItem({ id: "item-2", title: "運動B", order: 1 }),
        ],
        selectedItemId: "item-1",
      });

      // 選択されたカードを探す
      const selectedCard = screen.getByTestId("card-item-1");
      const unselectedCard = screen.getByTestId("card-item-2");

      // 実装詳細（Tailwindクラス）ではなく、外部から観測できるシグナルで検証する
      expect(selectedCard).toHaveAttribute("data-selected", "true");
      expect(unselectedCard).toHaveAttribute("data-selected", "false");
    });
  });

  describe("複製ボタン（ホバーアクション）", () => {
    it("クリックで onItemDuplicate(itemId) が呼ばれ、カードの選択は起きない", async () => {
      const user = userEvent.setup();
      const onItemDuplicate = vi.fn();
      const props = setupCanvas({
        items: [createTestItem({ id: "item-1" })],
        onItemDuplicate,
      });

      await user.click(screen.getByRole("button", { name: DUPLICATE_TOOLTIP }));

      expect(onItemDuplicate).toHaveBeenCalledWith("item-1");
      expect(props.onItemSelect).not.toHaveBeenCalled();
    });

    it("Enter キーで押しても onItemDuplicate が呼ばれ、選択は起きない", async () => {
      const user = userEvent.setup();
      const onItemDuplicate = vi.fn();
      const props = setupCanvas({
        items: [createTestItem({ id: "item-1" })],
        onItemDuplicate,
      });

      screen.getByRole("button", { name: DUPLICATE_TOOLTIP }).focus();
      await user.keyboard("{Enter}");

      expect(onItemDuplicate).toHaveBeenCalledWith("item-1");
      expect(props.onItemSelect).not.toHaveBeenCalled();
    });

    it("onItemDuplicate が渡されない場合は表示しない", () => {
      setupCanvas({ items: [createTestItem()] });

      expect(
        screen.queryByRole("button", { name: DUPLICATE_TOOLTIP })
      ).not.toBeInTheDocument();
    });

    it("モバイルでは表示しない", () => {
      setupCanvas({
        items: [createTestItem()],
        onItemDuplicate: vi.fn(),
        isMobile: true,
      });

      expect(
        screen.queryByRole("button", { name: DUPLICATE_TOOLTIP })
      ).not.toBeInTheDocument();
    });
  });

  describe("レイアウト", () => {
    it.each([
      ["grid1", 1],
      ["grid2", 2],
      ["grid3", 3],
      ["grid4", 4],
    ] as const)(
      "layoutType=%s のとき列数が %d になる",
      (layoutType, expectedColumns) => {
        setupCanvas({ items: [createTestItem()], layoutType });

        // グリッドコンテナのスタイルを確認
        const gridContainer = screen.getByRole("list");
        expect(gridContainer).toBeInTheDocument();
        expect(gridContainer).toHaveStyle({
          gridTemplateColumns: `repeat(${expectedColumns}, minmax(0, 1fr))`,
        });

        // LAYOUT_COLUMNS定数との整合性も確認
        expect(LAYOUT_COLUMNS[layoutType]).toBe(expectedColumns);
      }
    );
  });

  describe("テーマカラー", () => {
    /** キャンバスのスクロールコンテナに設定された CSS 変数の値 */
    function getCanvasVariable(name: string) {
      return screen.getByTestId("canvas-scroll").style.getPropertyValue(name);
    }

    it("カードの枠線はテーマカラー、用量の区切り線はテーマカラーを白地に重ねた色で上書きする", () => {
      setupCanvas({ items: [createTestItem()], themeColor: "#059669" });

      expect(getCanvasVariable("--card-border-color")).toBe("#059669");
      expect(getCanvasVariable("--dosage-accent-light")).toBe("#b4e0d2");
    });

    it("カードの枠線は CSS 変数を参照する", () => {
      setupCanvas({ items: [createTestItem({ id: "item-1" })] });

      expect(screen.getByTestId("card-item-1").style.borderColor).toBe(
        "var(--card-border-color)"
      );
    });

    it("themeColor を省略すると CSS 変数を上書きしない（globals.css の既定色）", () => {
      setupCanvas({ items: [createTestItem()] });

      expect(getCanvasVariable("--card-border-color")).toBe("");
      expect(getCanvasVariable("--dosage-accent-light")).toBe("");
    });

    it("カード番号バッジの背景もテーマカラーで上書きする", () => {
      setupCanvas({ items: [createTestItem()], themeColor: "#059669" });

      expect(getCanvasVariable("--card-number-bg")).toBe("#059669");
    });

    it("白黒モードではテーマカラーの代わりに slate 系の色にし、注意点の塗りつぶしを白・枠線を濃い色にする", () => {
      setupCanvas({
        items: [createTestItem()],
        themeColor: "#059669",
        printColorMode: "monochrome",
      });

      expect(getCanvasVariable("--card-border-color")).toBe("#64748b");
      expect(getCanvasVariable("--dosage-accent-light")).toBe("#cbd5e1");
      expect(getCanvasVariable("--dosage-label")).toBe("#475569");
      expect(getCanvasVariable("--card-number-bg")).toBe("#0f172a");
      expect(getCanvasVariable("--precaution-bg")).toBe("#ffffff");
      expect(getCanvasVariable("--precaution-border")).toBe("#334155");
    });
  });

  describe("印刷スタイル", () => {
    const items = [
      createTestItem({ id: "a", title: "運動A", order: 0 }),
      createTestItem({ id: "b", title: "運動B", order: 1 }),
    ];

    it("カード番号を表示する設定では、運動名の前に並び順の番号を表示する", () => {
      setupCanvas({ items, showCardNumbers: true });

      expect(
        screen.getByRole("heading", { level: 3, name: "1運動A" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { level: 3, name: "2運動B" })
      ).toBeInTheDocument();
    });

    it("カード番号は既定では表示しない", () => {
      setupCanvas({ items });

      expect(
        screen.getByRole("heading", { level: 3, name: "運動A" })
      ).toBeInTheDocument();
    });

    it("用量のラベルを設定値で表示する", () => {
      setupCanvas({
        items: [
          createTestItem({
            dosages: { reps: "30", sets: "2", frequency: "毎日" },
          }),
        ],
        dosageLabels: { reps: "秒数", sets: "左右", frequency: "目安" },
      });

      expect(screen.getByText("秒数")).toBeInTheDocument();
      expect(screen.getByText("左右")).toBeInTheDocument();
      expect(screen.getByText("目安")).toBeInTheDocument();
      expect(screen.queryByText(LABELS.reps)).not.toBeInTheDocument();
    });

    it.each([
      ["2列で「大きめ」", "grid2", false, EDITOR_TEXT_STYLE_LARGE.titleSize],
      ["モバイルの1列表示で「大きめ」", "grid1", true, EDITOR_TEXT_STYLE_LARGE.titleSize],
      ["デスクトップの1列は「大きめ」でも1列用", "grid1", false, EDITOR_TEXT_STYLE_SINGLE_COLUMN.titleSize],
    ] as const)("%s の文字サイズで表示する", (_, layoutType, isMobile, titleClass) => {
      setupCanvas({
        items: [createTestItem({ title: "運動A" })],
        layoutType,
        isMobile,
        textScale: "large",
      });

      expect(screen.getByRole("heading", { level: 3 })).toHaveClass(titleClass);
    });
  });

  describe("ヘッダー・チェック表の要約", () => {
    const defaultHeader = resolveProjectSettings(undefined).header;

    /** 要約のボタン（title 属性で特定する） */
    function getSummaryButton() {
      return screen.getByTitle(SHEET_SUMMARY_BUTTON_LABEL);
    }

    it("既定の設定では「氏名欄」と「チェック表：なし」を表示する", () => {
      setupCanvas({
        items: [createTestItem()],
        sheetHeader: defaultHeader,
        checkTable: "none",
        onSheetSettingsClick: vi.fn(),
      });

      expect(getSummaryButton()).toHaveTextContent(
        "ヘッダー：氏名欄／チェック表：なし"
      );
    });

    it("選んだヘッダー項目とチェック表を並べて表示する", () => {
      setupCanvas({
        items: [createTestItem()],
        sheetHeader: {
          ...defaultHeader,
          dateMode: "blank",
        },
        checkTable: "weekly",
        onSheetSettingsClick: vi.fn(),
      });

      expect(getSummaryButton()).toHaveTextContent(
        "ヘッダー：日付欄・氏名欄／チェック表：1週間"
      );
    });

    it("何も出さないときは「タイトルのみ」と表示する", () => {
      setupCanvas({
        items: [createTestItem()],
        sheetHeader: { ...defaultHeader, showPatientNameBox: false },
        checkTable: "none",
        onSheetSettingsClick: vi.fn(),
      });

      expect(getSummaryButton()).toHaveTextContent("ヘッダー：タイトルのみ");
    });

    it("押すと設定を開くコールバックを呼び、カードの選択解除は起こさない", async () => {
      const user = userEvent.setup();
      const props = setupCanvas({
        items: [createTestItem()],
        sheetHeader: defaultHeader,
        checkTable: "none",
        onSheetSettingsClick: vi.fn(),
      });

      await user.click(getSummaryButton());

      expect(props.onSheetSettingsClick).toHaveBeenCalledTimes(1);
      expect(props.onItemSelect).not.toHaveBeenCalled();
    });

    it("カードがないときは表示しない", () => {
      setupCanvas({
        items: [],
        sheetHeader: defaultHeader,
        checkTable: "none",
        onSheetSettingsClick: vi.fn(),
      });

      expect(
        screen.queryByTitle(SHEET_SUMMARY_BUTTON_LABEL)
      ).not.toBeInTheDocument();
    });
  });

  describe("A4 ページ数の目安", () => {
    /** 3 枚のカード */
    const threeItems = [1, 2, 3].map((n) =>
      createTestItem({ id: `item-${String(n)}`, order: n - 1, title: `運動${String(n)}` })
    );

    it("1 ページに収まるときは「目安: A4 1ページ」だけを表示し、区切り線は出さない", () => {
      setupCanvas({
        items: threeItems,
        pageEstimate: {
          pageCount: 1,
          firstCardIndexByPage: [0],
          checkTablePage: null,
        },
      });

      expect(screen.getByTestId("page-estimate")).toHaveTextContent(
        "目安: A4 1ページ"
      );
      expect(screen.queryByTestId("page-break")).not.toBeInTheDocument();
    });

    it("2 ページ以上になるときは次のページの先頭のカードを案内し、その手前に区切り線を出す", () => {
      setupCanvas({
        items: threeItems,
        pageEstimate: {
          pageCount: 2,
          firstCardIndexByPage: [0, 2],
          checkTablePage: null,
        },
      });

      expect(screen.getByTestId("page-estimate")).toHaveTextContent(
        "目安: A4 2ページ（3枚目から2ページ目）"
      );
      const divider = screen.getByTestId("page-break");
      expect(divider).toHaveTextContent("ここから2ページ目（目安）");
      // 区切り線は 2 枚目と 3 枚目のカードの間（一覧の項目としては数えない）
      expect(screen.getByTestId("canvas-grid")).toHaveTextContent(
        /運動2.*ここから2ページ目（目安）.*運動3/
      );
      expect(divider).toHaveAttribute("aria-hidden", "true");
    });

    it("カードは 1 ページに収まり、チェック表だけ次のページになるときはそれを案内する", () => {
      setupCanvas({
        items: threeItems,
        pageEstimate: {
          pageCount: 2,
          firstCardIndexByPage: [0],
          checkTablePage: 2,
        },
      });

      expect(screen.getByTestId("page-estimate")).toHaveTextContent(
        "目安: A4 2ページ（チェック表は2ページ目）"
      );
    });

    it("モバイルでは目安だけを表示し、区切り線は出さない", () => {
      setupCanvas({
        items: threeItems,
        isMobile: true,
        pageEstimate: {
          pageCount: 2,
          firstCardIndexByPage: [0, 2],
          checkTablePage: null,
        },
      });

      expect(screen.getByTestId("page-estimate")).toBeInTheDocument();
      expect(screen.queryByTestId("page-break")).not.toBeInTheDocument();
    });
  });

  describe("カード上のインライン編集", () => {
    const item = createTestItem({
      title: "スクワット",
      dosages: { reps: "10回", sets: "3セット", frequency: "" },
    });

    function setupSelected(overrides: Partial<CanvasProps> = {}) {
      return setupCanvas({
        items: [item],
        selectedItemId: item.id,
        onItemInlineEdit: vi.fn(),
        ...overrides,
      });
    }

    it("選択中のカードのタイトルをダブルクリックすると入力欄になり、Enter で 1 回だけ確定する", async () => {
      const user = userEvent.setup();
      const props = setupSelected();

      await user.dblClick(screen.getByText("スクワット"));
      const input = screen.getByLabelText(INLINE_EDIT_TITLE_LABEL);
      expect(input).toHaveValue("スクワット");
      expect(input).toHaveAttribute("maxLength", String(TEXT_LIMITS.title));

      await user.clear(input);
      await user.type(input, "ランジ{Enter}");

      expect(props.onItemInlineEdit).toHaveBeenCalledTimes(1);
      expect(props.onItemInlineEdit).toHaveBeenCalledWith(item.id, {
        title: "ランジ",
      });
      expect(
        screen.queryByLabelText(INLINE_EDIT_TITLE_LABEL)
      ).not.toBeInTheDocument();
    });

    it("Esc で取り消すと確定しない", async () => {
      const user = userEvent.setup();
      const props = setupSelected();

      await user.dblClick(screen.getByText("スクワット"));
      await user.type(screen.getByLabelText(INLINE_EDIT_TITLE_LABEL), "改{Escape}");

      expect(props.onItemInlineEdit).not.toHaveBeenCalled();
      expect(screen.getByText("スクワット")).toBeInTheDocument();
    });

    it("フォーカスが外れると確定する", async () => {
      const user = userEvent.setup();
      const props = setupSelected();

      await user.dblClick(screen.getByText("スクワット"));
      await user.type(screen.getByLabelText(INLINE_EDIT_TITLE_LABEL), "改");
      await user.tab();

      expect(props.onItemInlineEdit).toHaveBeenCalledWith(item.id, {
        title: "スクワット改",
      });
    });

    it("用量の数値も編集でき、ほかの用量はそのまま渡す", async () => {
      const user = userEvent.setup();
      const props = setupSelected();

      await user.dblClick(screen.getByText("10回"));
      const input = screen.getByLabelText(`${LABELS.reps}（カード上で編集）`);
      expect(input).toHaveAttribute("maxLength", String(TEXT_LIMITS.reps));
      await user.clear(input);
      await user.type(input, "15回{Enter}");

      expect(props.onItemInlineEdit).toHaveBeenCalledWith(item.id, {
        dosages: { reps: "15回", sets: "3セット", frequency: "" },
      });
    });

    it("入力中のクリックはカードの選択に伝えない", async () => {
      const user = userEvent.setup();
      const props = setupSelected();

      await user.dblClick(screen.getByText("スクワット"));
      vi.mocked(props.onItemSelect!).mockClear();
      await user.click(screen.getByLabelText(INLINE_EDIT_TITLE_LABEL));

      expect(props.onItemSelect).not.toHaveBeenCalled();
    });

    it("選択していないカードやコールバックがないときは編集に入らない", async () => {
      const user = userEvent.setup();
      setupCanvas({ items: [item], selectedItemId: null, onItemInlineEdit: vi.fn() });

      await user.dblClick(screen.getByText("10回"));
      expect(
        screen.queryByLabelText(`${LABELS.reps}（カード上で編集）`)
      ).not.toBeInTheDocument();
    });

    it("モバイルでは編集に入らない", async () => {
      const user = userEvent.setup();
      setupSelected({ isMobile: true });

      await user.dblClick(screen.getByText("スクワット"));
      expect(
        screen.queryByLabelText(INLINE_EDIT_TITLE_LABEL)
      ).not.toBeInTheDocument();
    });
  });

  describe("スライド", () => {
    const slideItem = createTestItem({
      id: "item-1",
      title: "スクワット",
      imageSource: "img-123",
      description: "膝を90度に曲げて、ゆっくり立ち上がる",
      dosages: { reps: "10回", sets: "3セット", frequency: "1日2回" },
      precautions: [{ id: "p1", value: "痛みが出たら中止" }],
    });
    const imageUrls = new Map([["img-123", "blob:http://example.com/image"]]);

    /** スライドのカードを描画する（sheetHeader は省略して既定値で計算させる） */
    function setupSlide(overrides: Partial<CanvasProps> = {}) {
      return setupCanvas({
        items: [slideItem],
        imageUrls,
        layoutType: "slide",
        ...overrides,
      });
    }

    it("1 列で、左の列に画像と用量、右の列に説明と注意点を置いた横型のカードを描く", () => {
      setupSlide();

      expect(screen.getByRole("list")).toHaveStyle({
        gridTemplateColumns: "repeat(1, minmax(0, 1fr))",
      });
      const body = screen.getByTestId("slide-card-body");
      const { width, height } = getPdfSlideCardSize();
      expect(body.style.aspectRatio).toBe(String(width / height));

      const left = within(screen.getByTestId("slide-left-column"));
      expect(left.getByRole("img", { name: "スクワット" })).toBeInTheDocument();
      expect(left.getByText("10回")).toBeInTheDocument();
      const rightEl = screen.getByTestId("slide-right-column");
      expect(rightEl).toHaveClass("justify-center");
      const right = within(rightEl);
      expect(right.getByText(slideItem.description)).toBeInTheDocument();
      expect(right.getByText(/痛みが出たら中止/)).toBeInTheDocument();
      expect(
        within(body).getByRole("heading", { level: 3, name: "スクワット" })
      ).toBeInTheDocument();
    });

    it("用量がないときは左の列ごと垂直中央寄せにする", () => {
      setupSlide({
        items: [{ ...slideItem, dosages: undefined }],
      });

      expect(screen.getByTestId("slide-left-column")).toHaveClass(
        "justify-center"
      );
    });

    it("収まらない説明・注意点は、画面の幅によらず PDF と同じ位置で切り詰めて末尾に「…」を付ける", () => {
      const longDescription = "膝を曲げてゆっくり立ち上がる。".repeat(14).slice(0, 200);
      // 4 行ある注意点を 5 件並べ、説明・注意点ともに切り詰められる状態を作る
      const multiLinePrecaution =
        "1行目の注意点\n2行目の注意点\n3行目の注意点\n4行目の注意点";
      setupSlide({
        printColorMode: "monochrome",
        items: [
          {
            ...slideItem,
            description: longDescription,
            precautions: [1, 2, 3, 4, 5].map((n) => ({
              id: `p${String(n)}`,
              value: multiLinePrecaution,
            })),
          },
        ],
      });

      const right = within(screen.getByTestId("slide-right-column"));
      const description = right.getByText(/^膝を曲げてゆっくり立ち上がる。/);
      const shown = description.textContent;
      expect(shown.endsWith("…")).toBeTruthy();
      expect(longDescription.startsWith(shown.slice(0, -1))).toBeTruthy();
      expect(shown.length).toBeLessThan(longDescription.length);
      // 注意点も 3 行で切り詰められ、行頭の「•」付き＋末尾「…」になる
      const precautions = right.getAllByText(/^• 1行目の注意点/);
      expect(precautions).toHaveLength(5);
      for (const precaution of precautions) {
        expect(precaution.textContent.endsWith("…")).toBeTruthy();
        expect(precaution.textContent).not.toContain("4行目の注意点");
      }
    });

    it("説明が空のときは説明を描かず、注意点だけを出す", () => {
      setupSlide({ items: [{ ...slideItem, description: "" }] });

      const right = within(screen.getByTestId("slide-right-column"));
      expect(right.queryByText(slideItem.description)).not.toBeInTheDocument();
      expect(right.getByText(/痛みが出たら中止/)).toBeInTheDocument();
    });

    it("モバイルでも改ページの目安の区切り線を出す（PDF も 1 ページ 1 枚のため）", () => {
      setupSlide({
        items: [
          { ...slideItem, id: "a", order: 0, title: "運動A" },
          { ...slideItem, id: "b", order: 1, title: "運動B" },
        ],
        isMobile: true,
        pageEstimate: {
          pageCount: 2,
          firstCardIndexByPage: [0, 1],
          checkTablePage: null,
        },
      });

      expect(screen.getByTestId("page-break")).toHaveTextContent(
        "ここから2ページ目（目安）"
      );
    });

    it("モバイルではタイトルに重ねず、スライドの上の操作バーにドラッグハンドルと編集ボタンを置く", async () => {
      const user = userEvent.setup();
      const onSettingsClick = vi.fn();
      setupSlide({ isMobile: true, onSettingsClick });

      const bar = within(screen.getByTestId("slide-mobile-actions"));
      const dragHandle = bar.getByRole("button", {
        name: "ドラッグして並べ替え",
      });
      const editButton = bar.getByRole("button", { name: "カードを編集" });
      expect(dragHandle).not.toHaveClass("absolute");
      expect(editButton).not.toHaveClass("absolute");
      expect(
        within(screen.getByTestId("slide-card-body")).getByRole("heading", {
          level: 3,
          name: "スクワット",
        })
      ).toBeInTheDocument();

      await user.click(editButton);
      expect(onSettingsClick).toHaveBeenCalledWith("item-1");
    });

    it("タイトルと用量をインライン編集できる", async () => {
      const user = userEvent.setup();
      const props = setupSlide({
        selectedItemId: slideItem.id,
        onItemInlineEdit: vi.fn(),
      });

      await user.dblClick(screen.getByText("スクワット"));
      const input = screen.getByLabelText(INLINE_EDIT_TITLE_LABEL);
      expect(input).toHaveClass("text-left");
      await user.clear(input);
      await user.type(input, "ランジ{Enter}");
      expect(props.onItemInlineEdit).toHaveBeenCalledWith(slideItem.id, {
        title: "ランジ",
      });

      await user.dblClick(screen.getByText("3セット"));
      await user.type(
        screen.getByLabelText(`${LABELS.sets}（カード上で編集）`),
        "{Backspace}{Backspace}{Backspace}{Enter}"
      );
      expect(props.onItemInlineEdit).toHaveBeenLastCalledWith(slideItem.id, {
        dosages: { reps: "10回", sets: "3", frequency: "1日2回" },
      });
    });

    it("複製ボタンが使える", async () => {
      const user = userEvent.setup();
      const onItemDuplicate = vi.fn();
      setupSlide({ onItemDuplicate });

      await user.click(screen.getByRole("button", { name: DUPLICATE_TOOLTIP }));

      expect(onItemDuplicate).toHaveBeenCalledWith("item-1");
    });

    it("スライド以外では横型のカードを描かない", () => {
      setupSlide({ layoutType: "grid1" });

      expect(screen.queryByTestId("slide-card-body")).not.toBeInTheDocument();
    });
  });

  describe("縦型カードの注意点省略表示", () => {
    const longPrecaution = "あ".repeat(50);
    const itemWithLongPrecaution = createTestItem({
      id: "item-precaution",
      precautions: [{ id: "p1", value: longPrecaution }],
    });

    it("4列縦向きなど表示幅に収まらない設定ではキャンバスでも末尾に「…」を付けて表示する", () => {
      setupCanvas({
        items: [itemWithLongPrecaution],
        layoutType: "grid4",
        pageOrientation: "portrait",
        textScale: "standard",
      });

      const shown = screen.getByText(/^• あ+/).textContent;
      expect(shown.endsWith("…")).toBeTruthy();
      expect(shown.length).toBeLessThan(longPrecaution.length + 2);
    });

    it("同じ注意点でも 2 列や 4 列横向き（標準文字）など収まる設定では「…」を付けずに全文表示する", () => {
      setupCanvas({
        items: [itemWithLongPrecaution],
        layoutType: "grid4",
        pageOrientation: "landscape",
        textScale: "standard",
      });

      expect(screen.getByText(`• ${longPrecaution}`)).toBeInTheDocument();
    });

    it("4列横向きでも文字サイズを「大きめ」にすると収まらなくなり「…」で表示される", () => {
      setupCanvas({
        items: [itemWithLongPrecaution],
        layoutType: "grid4",
        pageOrientation: "landscape",
        textScale: "large",
      });

      const shown = screen.getByText(/^• あ+/).textContent;
      expect(shown.endsWith("…")).toBeTruthy();
      expect(shown.length).toBeLessThan(longPrecaution.length + 2);
    });

    it("改行が 4 行以上ある注意点は 2 列でも 3 行で切り詰められて「…」が付く", () => {
      setupCanvas({
        items: [
          createTestItem({
            id: "item-multiline",
            precautions: [
              { id: "p1", value: "1行目\n2行目\n3行目\n4行目" },
            ],
          }),
        ],
        layoutType: "grid2",
      });

      const shown = screen.getByText(/^• 1行目/).textContent;
      expect(shown.endsWith("…")).toBeTruthy();
      expect(shown).not.toContain("4行目");
    });
  });

  describe("モバイルモード", () => {
    it("isMobile=true のとき layoutType に関わらず常に1列表示になる", () => {
      setupCanvas({
        items: [createTestItem()],
        layoutType: "grid3",
        isMobile: true,
      });

      const gridContainer = screen.getByRole("list");
      expect(gridContainer).toHaveStyle({
        gridTemplateColumns: "repeat(1, minmax(0, 1fr))",
      });
    });

    it("isMobile=true かつ画像がない場合、デフォルトプレースホルダーが表示されない", () => {
      setupCanvas({
        items: [createTestItem({ imageSource: "" })],
        isMobile: true,
      });

      expect(screen.queryByText(LABELS.noImage)).not.toBeInTheDocument();
    });

    it("isMobile=true かつ画像がない場合、「タップで画像選択」が表示される", () => {
      setupCanvas({
        items: [createTestItem({ imageSource: "" })],
        isMobile: true,
        onImageAreaClick: vi.fn(),
      });

      expect(screen.getByText(MOBILE_TAP_TO_SELECT_IMAGE)).toBeInTheDocument();
    });

    it("画像領域タップで onImageAreaClick が呼ばれる", async () => {
      const user = userEvent.setup();
      const props = setupCanvas({
        items: [createTestItem({ id: "item-1", imageSource: "" })],
        isMobile: true,
        onImageAreaClick: vi.fn(),
      });

      const imageAreaButton = screen.getByRole("button", {
        name: "画像を選択",
      });
      await user.click(imageAreaButton);

      expect(props.onImageAreaClick).toHaveBeenCalledWith("item-1");
    });

    it("設定ボタンタップで onSettingsClick が呼ばれる", async () => {
      const user = userEvent.setup();
      const props = setupCanvas({
        items: [createTestItem({ id: "item-1" })],
        isMobile: true,
        onSettingsClick: vi.fn(),
      });

      const settingsButton = screen.getByRole("button", {
        name: "カードを編集",
      });
      await user.click(settingsButton);

      expect(props.onSettingsClick).toHaveBeenCalledWith("item-1");
    });

    it("items があるときグリッド下部にカード追加ボタンが表示される", () => {
      setupCanvas({
        items: [createTestItem()],
        isMobile: true,
      });

      const addButtons = screen.getAllByRole("button", {
        name: BUTTON_ADD_CARD,
      });
      expect(addButtons).toHaveLength(1);
    });

    it("グリッド下部のカード追加ボタンクリックで onAddCard が呼ばれる", async () => {
      const user = userEvent.setup();
      const props = setupCanvas({
        items: [createTestItem()],
        isMobile: true,
      });

      const addButton = screen.getByRole("button", { name: BUTTON_ADD_CARD });
      await user.click(addButton);

      expect(props.onAddCard).toHaveBeenCalledTimes(1);
    });

    it("isMobile=true かつ画像がある場合、タップオーバーレイのメッセージは表示されない", () => {
      setupCanvas({
        items: [createTestItem({ imageSource: "img-123" })],
        imageUrls: new Map([["img-123", "blob:http://example.com/image"]]),
        isMobile: true,
        onImageAreaClick: vi.fn(),
      });

      expect(
        screen.queryByText(MOBILE_TAP_TO_SELECT_IMAGE)
      ).not.toBeInTheDocument();
    });
  });
});
