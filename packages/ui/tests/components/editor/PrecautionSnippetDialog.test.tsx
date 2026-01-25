import {
  MAX_PRECAUTIONS_COUNT,
  PRECAUTION_SNIPPET_CATEGORIES,
  PRECAUTION_SNIPPETS,
  SNIPPET_ADD_BUTTON_LABEL,
  SNIPPET_DIALOG_DESCRIPTION,
  SNIPPET_DIALOG_TITLE,
  SNIPPET_MAX_EXCEEDED_MESSAGE,
} from "@rehab-grid/core/lib/constants";
import type {
  PrecautionSnippet,
  PrecautionSnippetCategoryId,
} from "@rehab-grid/core/lib/constants/precautions";
import {
  PrecautionSnippetDialog,
  type PrecautionSnippetDialogProps,
} from "@rehab-grid/ui/components/editor/PrecautionSnippetDialog";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

/**
 * 指定カテゴリの最初のスニペットを取得
 *
 * テストで定型文の具体的な内容に依存しないよう、
 * 定数から動的にスニペットを取得する。
 */
function getFirstSnippetByCategory(
  categoryId: PrecautionSnippetCategoryId
): PrecautionSnippet {
  const snippet = PRECAUTION_SNIPPETS.find((s) => s.category === categoryId);
  if (!snippet) {
    throw new Error(`No snippet found for category: ${categoryId}`);
  }
  return snippet;
}

/**
 * 異なるカテゴリから複数のスニペットを取得（複数選択テスト用）
 *
 * カテゴリの順番で1つずつ取得することで、
 * 定型文の追加・削除があっても安定したテストを実現。
 */
function getSnippetsFromDifferentCategories(count: number): PrecautionSnippet[] {
  const result: PrecautionSnippet[] = [];
  for (const category of PRECAUTION_SNIPPET_CATEGORIES) {
    if (result.length >= count) break;
    const snippet = PRECAUTION_SNIPPETS.find((s) => s.category === category.id);
    if (snippet) result.push(snippet);
  }
  return result;
}

/**
 * デフォルトのpropsを生成
 */
function createDefaultProps(): PrecautionSnippetDialogProps {
  return {
    open: true,
    onOpenChange: vi.fn(),
    onSelect: vi.fn(),
    currentCount: 0,
  };
}

/**
 * PrecautionSnippetDialog のセットアップヘルパー
 *
 * テストごとに props を組み立てる重複を減らし、Arrange/Act/Assert を明確にする。
 */
function setupDialog(
  overrides: Partial<PrecautionSnippetDialogProps> = {}
): PrecautionSnippetDialogProps {
  const props = { ...createDefaultProps(), ...overrides };
  render(<PrecautionSnippetDialog {...props} />);
  return props;
}

describe("PrecautionSnippetDialog", () => {
  describe("表示テスト", () => {
    it("ダイアログが開いているときタイトルが表示される", () => {
      setupDialog();

      expect(screen.getByText(SNIPPET_DIALOG_TITLE)).toBeInTheDocument();
    });

    it("説明文が表示される", () => {
      setupDialog();

      expect(screen.getByText(SNIPPET_DIALOG_DESCRIPTION)).toBeInTheDocument();
    });

    it("全カテゴリが表示される", () => {
      setupDialog();

      for (const category of PRECAUTION_SNIPPET_CATEGORIES) {
        expect(screen.getByText(category.label)).toBeInTheDocument();
      }
    });

    it("全ての定型文がボタンとして表示される", () => {
      setupDialog();

      // 定義されている全てのスニペットがボタンとして表示される
      for (const snippet of PRECAUTION_SNIPPETS) {
        expect(
          screen.getByRole("button", { name: snippet.value })
        ).toBeInTheDocument();
      }
    });

    it("open=false のときダイアログが表示されない", () => {
      setupDialog({ open: false });

      expect(screen.queryByText(SNIPPET_DIALOG_TITLE)).not.toBeInTheDocument();
    });
  });

  describe("選択機能", () => {
    it("定型文をクリックで選択状態になる", async () => {
      const user = userEvent.setup();
      setupDialog();

      const snippet = getFirstSnippetByCategory("breathing");
      const snippetButton = screen.getByRole("button", { name: snippet.value });
      await user.click(snippetButton);

      // 選択中の件数が1になることを確認
      expect(screen.getByText(/選択中: 1 件/)).toBeInTheDocument();
    });

    it("選択済みアイテムを再クリックで選択解除", async () => {
      const user = userEvent.setup();
      setupDialog();

      const snippet = getFirstSnippetByCategory("breathing");
      const snippetButton = screen.getByRole("button", { name: snippet.value });
      await user.click(snippetButton);
      expect(screen.getByText(/選択中: 1 件/)).toBeInTheDocument();

      await user.click(snippetButton);
      expect(screen.getByText(/選択中: 0 件/)).toBeInTheDocument();
    });

    it("複数選択が可能", async () => {
      const user = userEvent.setup();
      setupDialog();

      const snippets = getSnippetsFromDifferentCategories(3);
      for (const snippet of snippets) {
        await user.click(screen.getByRole("button", { name: snippet.value }));
      }

      expect(screen.getByText(/選択中: 3 件/)).toBeInTheDocument();
    });

    it("選択中の件数と追加可能件数が表示される", () => {
      setupDialog({ currentCount: 2 });

      // 残り3件選択可能
      expect(screen.getByText(/追加可能: 3 件/)).toBeInTheDocument();
    });
  });

  describe("選択制限", () => {
    it("currentCount=3 のとき、残り2件まで選択可能", async () => {
      const user = userEvent.setup();
      setupDialog({ currentCount: 3 });

      expect(screen.getByText(/追加可能: 2 件/)).toBeInTheDocument();

      // 2件選択できる
      const snippets = getSnippetsFromDifferentCategories(2);
      for (const snippet of snippets) {
        await user.click(screen.getByRole("button", { name: snippet.value }));
      }

      expect(screen.getByText(/選択中: 2 件/)).toBeInTheDocument();
    });

    it("残り件数を超える選択ができない", async () => {
      const user = userEvent.setup();
      setupDialog({ currentCount: 4 }); // 残り1件のみ

      // 異なるカテゴリから2つのスニペットを取得
      const snippets = getSnippetsFromDifferentCategories(2);
      const firstSnippet = snippets[0]!;
      const secondSnippet = snippets[1]!;

      // 1件選択
      await user.click(screen.getByRole("button", { name: firstSnippet.value }));
      expect(screen.getByText(/選択中: 1 件/)).toBeInTheDocument();

      // 2件目は選択できない（ボタンが無効化されている）
      const secondButton = screen.getByRole("button", {
        name: secondSnippet.value,
      });
      expect(secondButton).toBeDisabled();
    });

    it("currentCount=MAX のとき警告メッセージが表示される", () => {
      setupDialog({ currentCount: MAX_PRECAUTIONS_COUNT });

      expect(screen.getByText(SNIPPET_MAX_EXCEEDED_MESSAGE)).toBeInTheDocument();
    });

    it("currentCount=MAX のとき全ての定型文ボタンが無効化される", () => {
      setupDialog({ currentCount: MAX_PRECAUTIONS_COUNT });

      // 定型文は必ず存在するが、型安全のため存在確認
      const firstSnippetValue = PRECAUTION_SNIPPETS[0]?.value ?? "";
      const snippetButton = screen.getByRole("button", { name: firstSnippetValue });
      expect(snippetButton).toBeDisabled();
    });
  });

  describe("ボタン動作", () => {
    it("選択なしの場合、追加ボタンが無効", () => {
      setupDialog();

      const addButton = screen.getByRole("button", { name: SNIPPET_ADD_BUTTON_LABEL });
      expect(addButton).toBeDisabled();
    });

    it("選択ありの場合、追加ボタンが有効", async () => {
      const user = userEvent.setup();
      setupDialog();

      const snippet = getFirstSnippetByCategory("breathing");
      await user.click(screen.getByRole("button", { name: snippet.value }));

      const addButton = screen.getByRole("button", {
        name: SNIPPET_ADD_BUTTON_LABEL,
      });
      expect(addButton).toBeEnabled();
    });

    it("追加ボタンクリックで onSelect が選択値配列で呼ばれる", async () => {
      const user = userEvent.setup();
      const props = setupDialog();

      const snippets = getSnippetsFromDifferentCategories(2);
      const selectedValues = snippets.map((s) => s.value);
      for (const snippet of snippets) {
        await user.click(screen.getByRole("button", { name: snippet.value }));
      }

      const addButton = screen.getByRole("button", {
        name: SNIPPET_ADD_BUTTON_LABEL,
      });
      await user.click(addButton);

      expect(props.onSelect).toHaveBeenCalledTimes(1);
      expect(props.onSelect).toHaveBeenCalledWith(
        expect.arrayContaining(selectedValues)
      );
    });

    it("追加ボタンクリック後、ダイアログが閉じる", async () => {
      const user = userEvent.setup();
      const props = setupDialog();

      const snippet = getFirstSnippetByCategory("breathing");
      await user.click(screen.getByRole("button", { name: snippet.value }));

      const addButton = screen.getByRole("button", {
        name: SNIPPET_ADD_BUTTON_LABEL,
      });
      await user.click(addButton);

      expect(props.onOpenChange).toHaveBeenCalledWith(false);
    });

    it("キャンセルボタンクリックで onOpenChange(false) が呼ばれる", async () => {
      const user = userEvent.setup();
      const props = setupDialog();

      const cancelButton = screen.getByRole("button", { name: "キャンセル" });
      await user.click(cancelButton);

      expect(props.onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("リセット動作", () => {
    it("ダイアログを閉じると選択状態がリセットされる", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      const { rerender } = render(
        <PrecautionSnippetDialog
          open
          onOpenChange={onOpenChange}
          onSelect={vi.fn()}
          currentCount={0}
        />
      );

      // 選択する
      const snippet = getFirstSnippetByCategory("breathing");
      await user.click(screen.getByRole("button", { name: snippet.value }));
      expect(screen.getByText(/選択中: 1 件/)).toBeInTheDocument();

      // キャンセルでダイアログを閉じる
      const cancelButton = screen.getByRole("button", { name: "キャンセル" });
      await user.click(cancelButton);

      // 再度開く
      rerender(
        <PrecautionSnippetDialog
          open
          onOpenChange={onOpenChange}
          onSelect={vi.fn()}
          currentCount={0}
        />
      );

      // 選択状態がリセットされている
      expect(screen.getByText(/選択中: 0 件/)).toBeInTheDocument();
    });
  });
});
