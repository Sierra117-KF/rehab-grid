/**
 * プロジェクト削除機能 結合テスト（Browser Mode）
 *
 * @remarks
 * プロジェクト削除ボタンから確認ダイアログを経て削除実行までの
 * UIフローを実ブラウザ環境で検証する。
 *
 * - 削除ボタンクリック → 確認ダイアログ表示
 * - 確認後の削除実行とストアリセット
 * - キャンセル操作
 */
import {
  BUTTON_CANCEL,
  BUTTON_DELETE,
  PROJECT_DELETE_CONFIRM_DESCRIPTION,
  PROJECT_DELETE_CONFIRM_TITLE,
  PROJECT_DELETE_TOOLTIP,
} from "@rehab-grid/core/lib/constants";
import { useEditorStore } from "@rehab-grid/core/lib/store/useEditorStore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@rehab-grid/ui/components/ui/alert-dialog";
import { useCallback, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import {
  createTestItem,
  getInitialEditorState,
} from "@/tests/mocks/browser-common";

// ========== モック設定 ==========

// モック関数の定義（vi.hoisted で巻き上げ）
const { mockDeleteProject } = vi.hoisted(() => ({
  mockDeleteProject: vi.fn().mockResolvedValue(undefined),
}));

// IndexedDB (Dexie) のモック
vi.mock("@/lib/db", () => ({
  db: {
    images: {
      orderBy: vi.fn(() => ({
        reverse: vi.fn(() => ({
          toArray: vi.fn(async () => Promise.resolve([])),
        })),
      })),
    },
    projects: {
      put: vi.fn().mockResolvedValue(undefined),
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
  deleteProject: mockDeleteProject,
}));

// ========== テスト用コンポーネント ==========

/**
 * プロジェクト削除機能のテスト用コンポーネント
 *
 * EditorHeader の削除ダイアログ部分を抽出したミニマルな実装
 */
function DeleteProjectTestComponent() {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const deleteProject = useEditorStore((state) => state.deleteProject);

  const handleOpenDeleteDialog = useCallback(() => {
    setShowDeleteDialog(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    await deleteProject();
    setShowDeleteDialog(false);
  }, [deleteProject]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteDialog(false);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={handleOpenDeleteDialog}
        title={PROJECT_DELETE_TOOLTIP}
        aria-label={PROJECT_DELETE_TOOLTIP}
      >
        削除ボタン
      </button>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{PROJECT_DELETE_CONFIRM_TITLE}</AlertDialogTitle>
            <AlertDialogDescription>
              {PROJECT_DELETE_CONFIRM_DESCRIPTION}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>
              {BUTTON_CANCEL}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {BUTTON_DELETE}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ========== ヘルパー関数 ==========

/**
 * テスト用コンポーネントをレンダリング
 */
async function renderTestComponent() {
  await render(<DeleteProjectTestComponent />);
}

/**
 * 削除ボタンを取得
 */
function getDeleteButton() {
  return page.getByRole("button", { name: PROJECT_DELETE_TOOLTIP });
}

// ========== テストケース ==========

describe("プロジェクト削除機能", () => {
  beforeEach(() => {
    // 既存アイテムを持つ状態でストアを初期化
    useEditorStore.setState(
      getInitialEditorState({
        items: [
          createTestItem({ id: "item-1", title: "スクワット" }),
          createTestItem({ id: "item-2", order: 1, title: "腕立て伏せ" }),
        ],
      })
    );

    // モック関数をクリア
    mockDeleteProject.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("削除ボタンと確認ダイアログ", () => {
    it("削除ボタンクリックで確認ダイアログが表示される", async () => {
      await renderTestComponent();

      // 削除ボタンをクリック
      const deleteButton = getDeleteButton();
      await userEvent.click(deleteButton);

      // 確認ダイアログのタイトルが表示される
      await expect
        .element(
          page.getByRole("heading", { name: PROJECT_DELETE_CONFIRM_TITLE })
        )
        .toBeInTheDocument();

      // 確認ダイアログの説明が表示される
      await expect
        .element(page.getByText(PROJECT_DELETE_CONFIRM_DESCRIPTION))
        .toBeInTheDocument();

      // キャンセルボタンと削除ボタンが表示される
      await expect
        .element(page.getByRole("button", { name: BUTTON_CANCEL }))
        .toBeInTheDocument();
      await expect
        .element(page.getByRole("button", { name: BUTTON_DELETE }))
        .toBeInTheDocument();
    });
  });

  describe("削除実行", () => {
    it("確認後にプロジェクトが削除されストアがリセットされる", async () => {
      await renderTestComponent();

      // 削除前のストア状態を確認
      const itemsBefore = useEditorStore.getState().items;
      expect(itemsBefore).toHaveLength(2);

      // 削除ボタンをクリック
      const deleteButton = getDeleteButton();
      await userEvent.click(deleteButton);

      // 確認ダイアログで「削除」ボタンをクリック
      const confirmDeleteButton = page.getByRole("button", {
        name: BUTTON_DELETE,
      });
      await userEvent.click(confirmDeleteButton);

      // ストアのdeleteProject（DBの削除）が呼ばれたことを確認
      expect(mockDeleteProject).toHaveBeenCalledOnce();

      // ストアがリセットされる（itemsが空になる）
      const itemsAfter = useEditorStore.getState().items;
      expect(itemsAfter).toHaveLength(0);
    });
  });

  describe("キャンセル操作", () => {
    it("キャンセルでダイアログが閉じプロジェクトは維持される", async () => {
      await renderTestComponent();

      // 削除前のストア状態を確認
      const itemsBefore = useEditorStore.getState().items;
      expect(itemsBefore).toHaveLength(2);

      // 削除ボタンをクリック
      const deleteButton = getDeleteButton();
      await userEvent.click(deleteButton);

      // 確認ダイアログが表示されることを確認
      await expect
        .element(
          page.getByRole("heading", { name: PROJECT_DELETE_CONFIRM_TITLE })
        )
        .toBeInTheDocument();

      // キャンセルボタンをクリック
      const cancelButton = page.getByRole("button", { name: BUTTON_CANCEL });
      await userEvent.click(cancelButton);

      // ダイアログが閉じる（タイトルが非表示になる）
      await expect
        .element(
          page.getByRole("heading", { name: PROJECT_DELETE_CONFIRM_TITLE })
        )
        .not.toBeInTheDocument();

      // ストアのdeleteProjectは呼ばれていない
      expect(mockDeleteProject).not.toHaveBeenCalled();

      // ストアの状態は維持されている
      const itemsAfter = useEditorStore.getState().items;
      expect(itemsAfter).toHaveLength(2);
    });
  });
});
