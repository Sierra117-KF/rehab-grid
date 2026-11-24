/**
 * 画像ライブラリ 結合テスト（ブラウザモード）
 *
 * 実際の ImageLibraryPanel をエディタページに組み込んだ状態で、
 * キーワード検索とクリック配置（デスクトップ）を実ブラウザ環境で検証する
 *
 * @remarks
 * training-page.browser.test.tsx は ImageLibraryPanel をスタブにモックしているため、
 * パネルとページの連携はこのファイルで扱う。
 */
import type { SampleImage } from "@rehab-grid/core/lib/constants";
import {
  BUTTON_DELETE,
  createMaxItemCountReachedMessage,
  IMAGE_LIBRARY_CLICK_HINT_ADD,
  IMAGE_LIBRARY_CLICK_HINT_SET,
  IMAGE_LIBRARY_SEARCH_LABEL,
  IMAGE_SET_SUCCESS_MESSAGE,
  MAX_ITEM_COUNT,
  SAMPLE_IMAGES,
  UNDO_LABEL,
} from "@rehab-grid/core/lib/constants";
import { useEditorStore } from "@rehab-grid/core/lib/store/useEditorStore";
import { Toaster } from "@rehab-grid/ui/components/wrapped/Toaster";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import TrainingEditorPage from "@/app/(editor)/training/page";
import {
  createTestItem,
  getInitialEditorState,
  waitForNoStateChange,
} from "@/tests/mocks/browser-common";

// ========== モック設定 ==========

// 注意: vi.hoisted 内では外部モジュールからインポートした関数を使用できない
const { mockUseLiveQuery } = vi.hoisted(() => ({
  mockUseLiveQuery: vi.fn((): unknown[] => []),
}));

// Dexie のモック（取り込み画像の一覧もここから返す）
vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: mockUseLiveQuery,
}));

// IndexedDB (Dexie) のモック
// 注意: vi.mock ファクトリは巻き上げられるため、外部関数を呼び出せない
vi.mock("@/lib/db", () => ({
  db: {
    images: {
      orderBy: vi.fn(() => ({
        reverse: vi.fn(() => ({
          toArray: vi.fn(async () => Promise.resolve([])),
        })),
      })),
      put: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      bulkGet: vi.fn().mockResolvedValue([]),
    },
    projects: {
      put: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
  },
  loadProject: vi.fn().mockResolvedValue(undefined),
  saveProject: vi.fn().mockResolvedValue(undefined),
  createNewProject: () => ({
    meta: {
      version: "1.0.0",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      title: "無題のプロジェクト",
      projectType: "training",
    },
    settings: {
      layoutType: "grid2",
      themeColor: "#3b82f6",
    },
    items: [],
  }),
  deleteProject: vi.fn().mockResolvedValue(undefined),
  deleteImage: vi.fn().mockResolvedValue(undefined),
  saveImage: vi.fn().mockResolvedValue(undefined),
  getImage: vi.fn().mockResolvedValue(undefined),
  getImages: vi.fn().mockResolvedValue(new Map()),
}));

// デスクトップUIに固定（クリック配置はデスクトップのみ）
vi.mock("@/hooks/useMediaQuery", () => ({
  useMediaQuery: () => false,
  useIsMobile: () => false,
}));

// next/image のモック（ブラウザモード用）
vi.mock("next/image", async () => {
  const { createElement } = await import("react");
  const mod = {
    default: (props: Record<string, unknown>) => {
      const { src, alt, className, draggable } = props;
      return createElement("img", {
        src: src as string,
        alt: alt as string,
        className: className as string,
        draggable: draggable as boolean,
      });
    },
  };
  (mod as Record<string, unknown>).__esModule = true;
  return mod;
});

// ========== ヘルパー ==========

/** トースト表示用の Toaster（本番はルートレイアウトに置かれる）と一緒に描画する */
async function renderPage() {
  await render(
    <>
      <TrainingEditorPage />
      <Toaster />
    </>
  );
}

/** ファイル名からサンプル画像を取得する */
function getSampleImage(fileName: string): SampleImage {
  const sample = SAMPLE_IMAGES.find((img) => img.fileName === fileName);
  if (sample === undefined) {
    throw new Error(`サンプル画像が見つかりません: ${fileName}`);
  }
  return sample;
}

/**
 * サムネイルをクリックする
 *
 * @remarks
 * サムネイルの img は pointer-events: none のため、クリックを受け取るカード要素（親）を押す
 */
async function clickThumbnail(altText: string) {
  const card = page.getByAltText(altText).element().parentElement;
  if (card === null) throw new Error(`サムネイルが見つかりません: ${altText}`);
  await userEvent.click(card);
}

const squat = getSampleImage("standing_05_スクワット");
const calfStretch = getSampleImage("standing_07_カーフストレッチ");
const hamStretch = getSampleImage("sitting_02_ハムストレッチ");

describe("画像ライブラリ（エディタページ結合）", () => {
  beforeEach(() => {
    useEditorStore.setState(getInitialEditorState());
    mockUseLiveQuery.mockReturnValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("キーワード検索", () => {
    it("姿勢カテゴリとキーワードの両方に当てはまる画像だけを表示する", async () => {
      await renderPage();

      // 「ストレッチ」は立位（カーフ）と座位（ハム）の両方にある
      await userEvent.fill(
        page.getByRole("textbox", { name: IMAGE_LIBRARY_SEARCH_LABEL }),
        "すとれっち"
      );
      await expect
        .element(page.getByAltText(calfStretch.fileName))
        .toBeInTheDocument();
      await expect
        .element(page.getByAltText(hamStretch.fileName))
        .toBeInTheDocument();

      // 姿勢を「立位」に絞る
      await userEvent.click(page.getByRole("combobox"));
      await userEvent.click(page.getByRole("option", { name: "立位" }));

      await expect
        .element(page.getByAltText(calfStretch.fileName))
        .toBeInTheDocument();
      await expect
        .element(page.getByAltText(hamStretch.fileName))
        .not.toBeInTheDocument();
    });
  });

  describe("クリック配置", () => {
    it("カード未選択でサムネイルを押すと、その画像付きのカードが追加される", async () => {
      await renderPage();

      await expect
        .element(page.getByText(IMAGE_LIBRARY_CLICK_HINT_ADD))
        .toBeInTheDocument();
      await clickThumbnail(squat.fileName);

      await vi.waitFor(() => {
        expect(useEditorStore.getState().items).toHaveLength(1);
      });
      const [added] = useEditorStore.getState().items;
      expect(added?.imageSource).toBe(squat.id);

      // 追加したカードが選択され、次のクリックは差し替えになる
      await expect
        .element(page.getByText(IMAGE_LIBRARY_CLICK_HINT_SET))
        .toBeInTheDocument();
    });

    it("カード選択中にサムネイルを押すと画像が差し替わり、トーストから元に戻せる", async () => {
      useEditorStore.setState({
        ...getInitialEditorState(),
        items: [
          createTestItem({
            id: "item-1",
            title: "スクワット",
            imageSource: squat.id,
          }),
        ],
        selectedItemId: "item-1",
      });
      await renderPage();

      await clickThumbnail(calfStretch.fileName);

      await expect
        .element(page.getByText(IMAGE_SET_SUCCESS_MESSAGE))
        .toBeInTheDocument();
      expect(useEditorStore.getState().items).toHaveLength(1);
      expect(useEditorStore.getState().items[0]?.imageSource).toBe(
        calfStretch.id
      );

      await userEvent.click(page.getByRole("button", { name: UNDO_LABEL }));

      await vi.waitFor(() => {
        expect(useEditorStore.getState().items[0]?.imageSource).toBe(squat.id);
      });
    });

    it("選択中のカードと同じ画像を押しても履歴もトーストも増えない", async () => {
      useEditorStore.setState({
        ...getInitialEditorState(),
        items: [createTestItem({ id: "item-1", imageSource: squat.id })],
        selectedItemId: "item-1",
      });
      await renderPage();

      await clickThumbnail(squat.fileName);
      await waitForNoStateChange();

      expect(useEditorStore.getState().past).toHaveLength(0);
      await expect
        .element(page.getByText(IMAGE_SET_SUCCESS_MESSAGE))
        .not.toBeInTheDocument();
    });

    it("カード未選択で上限に達していると、追加せずに案内を表示する", async () => {
      const maxItems = Array.from({ length: MAX_ITEM_COUNT }, (_, i) =>
        createTestItem({ id: `item-${String(i)}`, order: i })
      );
      useEditorStore.setState({ ...getInitialEditorState(), items: maxItems });
      await renderPage();

      await clickThumbnail(squat.fileName);

      await expect
        .element(page.getByText(createMaxItemCountReachedMessage(MAX_ITEM_COUNT)))
        .toBeInTheDocument();
      expect(useEditorStore.getState().items).toHaveLength(MAX_ITEM_COUNT);
    });

    it("取り込み画像の削除確認ダイアログで「削除」を押しても、画像は配置されない", async () => {
      mockUseLiveQuery.mockReturnValue([
        {
          id: "imported-1",
          blob: new Blob(["dummy"], { type: "image/png" }),
          createdAt: new Date(),
          fileName: "my_exercise.png",
        },
      ]);
      await renderPage();

      await userEvent.click(page.getByRole("button", { name: "画像を削除" }));
      await userEvent.click(
        page.getByRole("alertdialog").getByRole("button", { name: BUTTON_DELETE })
      );

      await expect.element(page.getByRole("alertdialog")).not.toBeInTheDocument();
      await waitForNoStateChange();
      expect(useEditorStore.getState().items).toHaveLength(0);
    });
  });
});
