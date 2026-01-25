import {
  BUTTON_ADD_CARD,
  CANVAS_EMPTY_DESCRIPTION,
  CANVAS_EMPTY_TITLE,
  LABELS,
  LAYOUT_COLUMNS,
  MOBILE_TAP_TO_SELECT_IMAGE,
} from "@rehab-grid/core/lib/constants";
import { type EditorItem } from "@rehab-grid/core/types";
import { Canvas, type CanvasProps } from "@rehab-grid/ui/components/editor/Canvas";
import { render, screen } from "@testing-library/react";
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
