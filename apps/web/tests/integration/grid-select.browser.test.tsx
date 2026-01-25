/**
 * グリッドテンプレート切り替え機能 結合テスト（ブラウザモード）
 *
 * @remarks
 * 実ブラウザ（Vitest Browser Mode）上で、ヘッダーからグリッド選択ダイアログを開き、
 * 各レイアウト（grid1/grid2/grid3/grid4）へ切り替えた際に以下が成立することを検証する。
 * - ダイアログが表示される
 * - レイアウトオプションを選択できる
 * - 選択後にストア（layoutType）が更新される
 * - Canvas の表示（gridTemplateColumns）が更新される
 */

import {
  GRID_SELECT_BUTTON_LABEL,
  GRID_SELECT_MODAL_DESCRIPTION,
  GRID_SELECT_MODAL_TITLE,
} from "@rehab-grid/core/lib/constants";
import { useEditorStore } from "@rehab-grid/core/lib/store/useEditorStore";
import type { LayoutType } from "@rehab-grid/core/types";
import { EditorHeader } from "@rehab-grid/ui/components/editor/EditorHeader";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import TrainingEditorPage from "@/app/(editor)/training/page";
import {
  createTestItem,
  getInitialEditorState,
} from "@/tests/mocks/browser-common";

// ========== モック設定 ==========

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

// next/link のモック（process等のNode依存を避ける）
vi.mock("next/link", async () => {
  const { createElement } = await import("react");
  const mod = {
    default: (props: Record<string, unknown>) => {
      const { href, children, ...rest } = props as {
        href?: unknown;
        children?: ReactNode;
      } & Record<string, unknown>;

      const hrefString = typeof href === "string" ? href : "#";
      return createElement("a", { href: hrefString, ...rest }, children);
    },
  };
  (mod as Record<string, unknown>).__esModule = true;
  return mod;
});

// デスクトップUIに固定（ヘッダーの「グリッド選択」ボタンを確実に表示）
vi.mock("@/hooks/useMediaQuery", () => ({
  useMediaQuery: () => false,
  useIsMobile: () => false,
}));

// Workerを起動しない（今回のテスト対象外）
vi.mock("@/hooks/usePdfWorker", () => ({
  usePdfWorker: () => ({
    state: { isGenerating: false, progress: 0, error: null },
    generatePdf: async () => await Promise.resolve(null),
    cancel: () => {},
  }),
}));

// 画像URL解決は不要（IndexedDB/Dexie依存を避ける）
vi.mock("@/hooks/useCanvasImages", () => ({
  useCanvasImages: () => new Map<string, string>(),
}));

// グローバルpaste監視は無効化（副作用を避ける）
vi.mock("@/hooks/usePasteImage", () => ({
  usePasteImage: () => {},
}));

// EditorHeader / TrainingEditorPage が参照する db を最小実装でモック
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
    transaction: vi.fn(
      async (_mode: string, _tables: unknown[], fn: () => unknown) => await fn()
    ),
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

// ========== ヘルパー ==========

async function renderEditor() {
  await render(
    <>
      <EditorHeader />
      <TrainingEditorPage />
    </>
  );
}

function getGridSelectButton() {
  return page.getByRole("button", { name: GRID_SELECT_BUTTON_LABEL });
}

async function expectCanvasColumns(expectedColumns: number) {
  // Canvasは inline style で gridTemplateColumns を設定しているため、attributeで検証する
  // 実ブラウザでは `0px` としてシリアライズされるため、その形式に合わせて比較する
  const expectedStyle = `grid-template-columns: repeat(${String(
    expectedColumns
  )}, minmax(0px, 1fr));`;

  await expect
    .element(page.getByTestId("canvas-grid"))
    .toHaveAttribute("style", expectedStyle);
}

describe("グリッドテンプレート切り替え（browser）", () => {
  beforeEach(() => {
    // アイテムが0件だと canvas-grid が存在しないため、最低1件は入れておく
    useEditorStore.setState(
      getInitialEditorState({
        layoutType: "grid2",
        items: [
          createTestItem({ id: "item-1", title: "テスト運動", order: 0 }),
        ],
      })
    );

    vi.clearAllMocks();
  });

  afterEach(() => {
    useEditorStore.setState(getInitialEditorState());
    vi.clearAllMocks();
  });

  it("グリッド選択ダイアログが表示できる", async () => {
    await renderEditor();

    await userEvent.click(getGridSelectButton());

    await expect.element(page.getByRole("dialog")).toBeInTheDocument();
    await expect
      .element(page.getByRole("heading", { name: GRID_SELECT_MODAL_TITLE }))
      .toBeInTheDocument();
    await expect
      .element(page.getByText(GRID_SELECT_MODAL_DESCRIPTION))
      .toBeInTheDocument();

    // 4つのレイアウトオプション（ラベル）を確認
    await expect
      .element(page.getByRole("button", { name: "1列" }))
      .toBeInTheDocument();
    await expect
      .element(page.getByRole("button", { name: "2列" }))
      .toBeInTheDocument();
    await expect
      .element(page.getByRole("button", { name: "3列" }))
      .toBeInTheDocument();
    await expect
      .element(page.getByRole("button", { name: "4列" }))
      .toBeInTheDocument();
  });

  it.each([
    { label: "1列", layoutType: "grid1" as const, columns: 1 },
    { label: "2列", layoutType: "grid2" as const, columns: 2 },
    { label: "3列", layoutType: "grid3" as const, columns: 3 },
    { label: "4列", layoutType: "grid4" as const, columns: 4 },
  ] satisfies { label: string; layoutType: LayoutType; columns: number }[])(
    "レイアウトを '$label' に切り替えると Canvas 表示が更新される",
    async ({ label, layoutType, columns }) => {
      await renderEditor();

      // 初期状態（grid2）
      await expectCanvasColumns(2);

      await userEvent.click(getGridSelectButton());
      await userEvent.click(page.getByRole("button", { name: label }));

      // ダイアログは閉じる
      await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();

      // ストアが更新される
      await expect
        .poll(() => useEditorStore.getState().layoutType, { timeout: 5000 })
        .toBe(layoutType);

      // Canvas 表示が更新される
      await expectCanvasColumns(columns);
    }
  );
});
