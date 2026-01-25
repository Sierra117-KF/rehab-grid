/**
 * テンプレート選択機能 結合テスト（ブラウザモード）
 *
 * @remarks
 * 実ブラウザ（Vitest Browser Mode）上で、エディタヘッダーからのテンプレート適用フローを検証する。
 * - モーダル表示
 * - テンプレートカード選択
 * - 既存データがある場合の確認ビュー
 * - 適用後のストア状態とCanvas反映
 * - キャンセル操作（確認ビュー/モーダルクローズ）
 *
 * 安定性のため、テンプレート読み込み（fetch）はモックし、固定のImportResultを返す。
 */

import {
  BUTTON_CANCEL,
  TEMPLATE_BUTTON_LABEL,
  TEMPLATE_CONFIRM_BUTTON,
  TEMPLATE_CONFIRM_DESCRIPTION,
  TEMPLATE_CONFIRM_TITLE,
  TEMPLATE_MODAL_TITLE,
} from "@rehab-grid/core/lib/constants";
import { useEditorStore } from "@rehab-grid/core/lib/store/useEditorStore";
import { TEMPLATES } from "@rehab-grid/core/lib/templates";
import type { ImportResult, ProjectFile, TemplateMetadata } from "@rehab-grid/core/types";
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

/**
 * テストで使用するテンプレート（必須）
 *
 * @remarks
 * `TEMPLATES[0]` が存在しない場合は、以降のテストが意味をなさないため早期にエラーにする。
 */
function getRequiredFirstTemplate(): TemplateMetadata {
  const first = TEMPLATES[0];
  if (first === undefined) {
    throw new Error(
      "TEMPLATES配列が空です。テストを実行するには少なくとも1つのテンプレートが必要です。"
    );
  }
  return first;
}

const TEST_TEMPLATE = getRequiredFirstTemplate();

// モック関数の定義（vi.hoisted で巻き上げ）
// 注意: vi.hoisted 内では外部モジュールからインポートした関数を使用できない
const { mockLoadTemplate } = vi.hoisted(() => ({
  mockLoadTemplate: vi.fn(),
}));

// テンプレート読み込みをモック（fetch等に依存しない）
vi.mock("@/utils/template", () => ({
  loadTemplate: mockLoadTemplate,
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

// デスクトップUIに固定（「テンプレート」ボタンを確実に表示）
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

// applyImportResult が参照する db.transaction / images.put / projects.put を最小実装でモック
// また、useEditorStore のモジュールスコープ初期化で参照される loadProject / createNewProject も提供する
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

// ========== テスト用データ ==========

/**
 * テンプレート適用時にストアへ入る ProjectFile（loadTemplate の戻り値用）
 */
function createMockTemplateProject(): ProjectFile {
  return {
    meta: {
      version: "1.0.0",
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
      title: "寝たまま簡単トレーニング（テスト）",
      projectType: "training",
    },
    settings: {
      layoutType: "grid2",
      themeColor: "#3b82f6",
    },
    items: [
      {
        id: "tpl-item-1",
        order: 0,
        title: "上体起こし",
        imageSource: "",
        description: "テンプレート1",
      },
      {
        id: "tpl-item-2",
        order: 1,
        title: "ブリッジ（お尻上げ）",
        imageSource: "",
        description: "テンプレート2",
      },
      {
        id: "tpl-item-3",
        order: 2,
        title: "片足上げ",
        imageSource: "",
        description: "テンプレート3",
      },
      {
        id: "tpl-item-4",
        order: 3,
        title: "手と腰のストレッチ",
        imageSource: "",
        description: "テンプレート4",
      },
    ],
  };
}

/**
 * loadTemplate の戻り値（ImportResult）
 */
function createMockImportResult(): ImportResult {
  return {
    project: createMockTemplateProject(),
    images: new Map(),
  };
}

// ========== ヘルパー ==========

/**
 * エディタ（ヘッダー + ページ本体）をレンダリング
 */
async function renderEditor() {
  await render(
    <>
      <EditorHeader />
      <TrainingEditorPage />
    </>
  );
}

/**
 * ヘッダーの「テンプレート」ボタンを取得
 */
function getTemplateButton() {
  return page.getByRole("button", { name: TEMPLATE_BUTTON_LABEL });
}

/**
 * テンプレートカードボタンを取得
 */
function getTemplateCardButton() {
  return page.getByRole("button", { name: new RegExp(TEST_TEMPLATE.name) });
}

describe("テンプレート選択機能（browser）", () => {
  beforeEach(() => {
    // ストアを初期状態にリセット（テスト独立性）
    useEditorStore.setState(getInitialEditorState());

    vi.clearAllMocks();

    // デフォルトでテンプレート読み込み成功にする
    mockLoadTemplate.mockResolvedValue(createMockImportResult());
  });

  afterEach(() => {
    useEditorStore.setState(getInitialEditorState());
    vi.clearAllMocks();
  });

  it("テンプレート選択モーダルが表示できる", async () => {
    await renderEditor();

    await userEvent.click(getTemplateButton());

    await expect.element(page.getByRole("dialog")).toBeInTheDocument();
    await expect
      .element(page.getByRole("heading", { name: TEMPLATE_MODAL_TITLE }))
      .toBeInTheDocument();
  });

  it("既存データがある場合、テンプレートカード選択で確認ビューが表示される", async () => {
    useEditorStore.setState(
      getInitialEditorState({
        items: [
          createTestItem({ id: "existing-1", title: "既存カード", order: 0 }),
        ],
      })
    );

    await renderEditor();
    await userEvent.click(getTemplateButton());
    await userEvent.click(getTemplateCardButton());

    await expect
      .element(page.getByText(TEMPLATE_CONFIRM_TITLE))
      .toBeInTheDocument();
    await expect
      .element(page.getByText(TEMPLATE_CONFIRM_DESCRIPTION))
      .toBeInTheDocument();
    await expect
      .element(page.getByText(TEST_TEMPLATE.name))
      .toBeInTheDocument();
  });

  it("既存データがある場合、確認ビューのキャンセルでテンプレート一覧に戻り、既存カードが維持される", async () => {
    useEditorStore.setState(
      getInitialEditorState({
        items: [
          createTestItem({ id: "existing-1", title: "既存カード", order: 0 }),
        ],
      })
    );

    await renderEditor();
    await userEvent.click(getTemplateButton());
    await userEvent.click(getTemplateCardButton());

    // 確認ビュー → キャンセル
    await userEvent.click(page.getByRole("button", { name: BUTTON_CANCEL }));

    // テンプレート一覧に戻る
    await expect
      .element(page.getByRole("heading", { name: TEMPLATE_MODAL_TITLE }))
      .toBeInTheDocument();
    await expect
      .element(page.getByText(TEMPLATE_CONFIRM_TITLE))
      .not.toBeInTheDocument();

    // ストアとUI（Canvas）が既存カードのまま
    expect(useEditorStore.getState().items).toHaveLength(1);
    expect(useEditorStore.getState().items[0]?.title).toBe("既存カード");
    await expect.element(page.getByText("既存カード")).toBeInTheDocument();
  });

  it("既存データがある場合、確認ビューで適用するとストアが置換されCanvasに反映される", async () => {
    useEditorStore.setState(
      getInitialEditorState({
        items: [
          createTestItem({ id: "existing-1", title: "既存カード", order: 0 }),
        ],
      })
    );

    await renderEditor();
    await userEvent.click(getTemplateButton());
    await userEvent.click(getTemplateCardButton());

    await userEvent.click(
      page.getByRole("button", { name: TEMPLATE_CONFIRM_BUTTON })
    );

    // ストアがテンプレートの4件に置換されるのを待つ
    await expect
      .poll(() => useEditorStore.getState().items.length, { timeout: 5000 })
      .toBe(4);

    // UI反映: テンプレートのタイトルが見え、既存カードは消える
    await expect.element(page.getByText("上体起こし")).toBeInTheDocument();
    await expect.element(page.getByText("既存カード")).not.toBeInTheDocument();

    // モーダルは閉じる
    await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();
  });

  it("既存データがない場合、テンプレートカードクリックで直接適用される（確認ビューは出ない）", async () => {
    useEditorStore.setState(getInitialEditorState({ items: [] }));

    await renderEditor();
    await userEvent.click(getTemplateButton());
    await userEvent.click(getTemplateCardButton());

    // 確認ビューに遷移しない
    await expect
      .element(page.getByText(TEMPLATE_CONFIRM_TITLE))
      .not.toBeInTheDocument();

    await expect
      .poll(() => useEditorStore.getState().items.length, { timeout: 5000 })
      .toBe(4);

    await expect.element(page.getByText("上体起こし")).toBeInTheDocument();
    await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();
  });

  it("モーダルをCloseで閉じた場合、ストアは変化しない（適用されない）", async () => {
    useEditorStore.setState(
      getInitialEditorState({
        items: [
          createTestItem({ id: "existing-1", title: "既存カード", order: 0 }),
        ],
      })
    );

    await renderEditor();
    await userEvent.click(getTemplateButton());

    // Radix Dialog の Close ボタン（shadcn既定）
    await userEvent.click(page.getByRole("button", { name: "Close" }));

    await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();
    expect(useEditorStore.getState().items).toHaveLength(1);
    expect(useEditorStore.getState().items[0]?.title).toBe("既存カード");
  });
});
