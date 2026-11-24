/**
 * 画像ライブラリ 結合テスト（ブラウザモード）
 *
 * 実際の ImageLibraryPanel をエディタページに組み込んだ状態で、
 * キーワード検索と、デスクトップでのサムネイルのクリックを実ブラウザ環境で検証する
 *
 * @remarks
 * training-page.browser.test.tsx は ImageLibraryPanel をスタブにモックしているため、
 * パネルとページの連携はこのファイルで扱う。
 */
import type { SampleImage } from "@rehab-grid/core/lib/constants";
import {
  IMAGE_LIBRARY_SEARCH_LABEL,
  SAMPLE_IMAGES,
} from "@rehab-grid/core/lib/constants";
import { useEditorStore } from "@rehab-grid/core/lib/store/useEditorStore";
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

// デスクトップUIに固定（デスクトップではサムネイルのクリックで何もしないことを確認する）
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

/** エディタページを描画する */
async function renderPage() {
  await render(<TrainingEditorPage />);
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

  describe("サムネイルのクリック（デスクトップ）", () => {
    it.each([
      { label: "カード未選択", selectedItemId: null },
      { label: "カード選択中", selectedItemId: "item-1" },
    ])(
      "$label でサムネイルを押しても、カードの追加や画像の変更は起きない（配置は D&D で行う）",
      async ({ selectedItemId }) => {
        useEditorStore.setState({
          ...getInitialEditorState(),
          items: [createTestItem({ id: "item-1", imageSource: squat.id })],
          selectedItemId,
        });
        await renderPage();

        await clickThumbnail(calfStretch.fileName);
        await waitForNoStateChange();

        const { items, past } = useEditorStore.getState();
        expect(items).toHaveLength(1);
        expect(items[0]?.imageSource).toBe(squat.id);
        expect(past).toHaveLength(0);
      }
    );
  });
});
