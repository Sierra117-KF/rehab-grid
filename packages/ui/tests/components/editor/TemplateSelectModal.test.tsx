import {
  BUTTON_CANCEL,
  BUTTON_DELETE,
  OPEN_AS_NEW_PROJECT_LABEL,
  OVERWRITE_CURRENT_PROJECT_LABEL,
  TEMPLATE_CARD_COUNT_LABEL,
  TEMPLATE_CONFIRM_DESCRIPTION,
  TEMPLATE_CONFIRM_TITLE,
  TEMPLATE_LOADING_LABEL,
  TEMPLATE_MODAL_DESCRIPTION,
  TEMPLATE_MODAL_TITLE,
  TEMPLATE_TAB_USER_LABEL,
  USER_TEMPLATE_DELETE_SUCCESS_MESSAGE,
  USER_TEMPLATE_EMPTY_MESSAGE,
  USER_TEMPLATE_NAME_LABEL,
  USER_TEMPLATE_SAVE_EMPTY_HINT,
  USER_TEMPLATE_SAVE_LABEL,
} from "@rehab-grid/core/lib/constants";
import type { UserTemplateRecord } from "@rehab-grid/core/types";
import {
  TemplateSelectModal,
  type TemplateSelectModalProps,
} from "@rehab-grid/ui/components/editor/TemplateSelectModal";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockUseLiveQuery,
  mockDeleteUserTemplate,
  mockToastSuccess,
  mockToastError,
} = vi.hoisted(() => ({
  mockUseLiveQuery: vi.fn(),
  mockDeleteUserTemplate: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: mockUseLiveQuery,
}));

vi.mock("@/lib/db", () => ({
  listUserTemplates: vi.fn(),
  deleteUserTemplate: mockDeleteUserTemplate,
}));

vi.mock("sonner", () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}));

/** テスト用のマイテンプレート */
const USER_TEMPLATE: UserTemplateRecord = {
  id: "user-template-1",
  name: "膝の自主トレ",
  updatedAt: new Date(2026, 10, 26),
  data: {
    meta: {
      version: "1.3.0",
      createdAt: "2026-11-26T00:00:00.000Z",
      updatedAt: "2026-11-26T00:00:00.000Z",
      title: "膝の自主トレ",
      projectType: "training",
    },
    settings: { layoutType: "grid2", themeColor: "#3b82f6" },
    items: [
      { id: "a", order: 0, title: "スクワット", imageSource: "", description: "" },
      { id: "b", order: 1, title: "足上げ", imageSource: "", description: "" },
    ],
  },
};

// ==============================================================================
// テスト用モックデータ
// ==============================================================================

/**
 * テスト用のモックテンプレート
 *
 * @remarks
 * vi.hoisted を使用して vi.mock より先にモックデータを定義。
 * 実際のテンプレートデータに依存しないようにモックを使用。
 * これによりテンプレートの追加・変更でテストが壊れることを防ぐ。
 */
const { MOCK_TEMPLATES } = vi.hoisted(() => ({
  MOCK_TEMPLATES: [
    {
      id: "mock-template-1",
      name: "モックテンプレート1",
      description: "テスト用のテンプレート説明1",
      path: "mock-template-1",
      cardCount: 4,
    },
    {
      id: "mock-template-2",
      name: "モックテンプレート2",
      description: "テスト用のテンプレート説明2",
      path: "mock-template-2",
      cardCount: 6,
    },
  ] as const,
}));

// lib/templates モジュールをモック
vi.mock("@/lib/templates", () => ({
  TEMPLATES: MOCK_TEMPLATES,
  getTemplateById: (id: string) =>
    MOCK_TEMPLATES.find((t) => t.id === id) ?? null,
}));

/** テストで使用するテンプレート（モックデータの最初の項目） */
const TEST_TEMPLATE = MOCK_TEMPLATES[0];

// ==============================================================================
// ヘルパー関数
// ==============================================================================

/**
 * デフォルトのpropsを生成
 */
function createDefaultProps(): TemplateSelectModalProps {
  return {
    open: true,
    onOpenChange: vi.fn(),
    onSelect: vi.fn().mockResolvedValue(undefined),
    requireConfirmation: false,
    currentTitle: "腰痛体操",
    canSaveCurrent: true,
    onSaveCurrent: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * TemplateSelectModal のセットアップヘルパー
 *
 * テストごとに props を組み立てる重複を減らし、Arrange/Act/Assert を明確にする。
 */
function setupModal(
  overrides: Partial<TemplateSelectModalProps> = {},
): TemplateSelectModalProps {
  const props = { ...createDefaultProps(), ...overrides };
  render(<TemplateSelectModal {...props} />);
  return props;
}

/**
 * 全テンプレートカードのボタンを取得
 *
 * @remarks
 * テンプレート名を使用してボタンを識別することで、実装詳細への依存を避ける
 */
function getAllTemplateCardButtons(): HTMLElement[] {
  return MOCK_TEMPLATES.map((template) =>
    screen.getByRole("button", { name: new RegExp(template.name) }),
  );
}

// ==============================================================================
// テストケース
// ==============================================================================

describe("TemplateSelectModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 既定ではマイテンプレートなし
    mockUseLiveQuery.mockReturnValue([]);
    mockDeleteUserTemplate.mockResolvedValue(undefined);
  });

  describe("モーダル表示", () => {
    it("open=true でモーダルが表示される", () => {
      setupModal();

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText(TEMPLATE_MODAL_TITLE)).toBeInTheDocument();
      expect(screen.getByText(TEMPLATE_MODAL_DESCRIPTION)).toBeInTheDocument();
    });

    it("open=false でモーダルが表示されない", () => {
      setupModal({ open: false });

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("テンプレート一覧表示", () => {
    it("モック内の全テンプレートが表示される", () => {
      setupModal();

      for (const template of MOCK_TEMPLATES) {
        expect(screen.getByText(template.name)).toBeInTheDocument();
        expect(screen.getByText(template.description)).toBeInTheDocument();
      }
    });

    it("各テンプレートにカード数が表示される", () => {
      setupModal();

      for (const template of MOCK_TEMPLATES) {
        // カード数とラベルが結合されて表示される（例: "4カード"）
        const cardCountText = `${template.cardCount}${TEMPLATE_CARD_COUNT_LABEL}`;
        expect(screen.getByText(cardCountText)).toBeInTheDocument();
      }
    });
  });

  describe("テンプレート選択（確認不要: requireConfirmation=false）", () => {
    it("テンプレートカードクリックで onSelect が上書き（現在の空の指導箋へ適用）で呼ばれる", async () => {
      const user = userEvent.setup();
      const props = setupModal({ requireConfirmation: false });

      const templateCard = screen.getByRole("button", {
        name: new RegExp(TEST_TEMPLATE.name),
      });
      await user.click(templateCard);

      expect(props.onSelect).toHaveBeenCalledWith(
        TEST_TEMPLATE.id,
        "overwrite",
        "official",
      );
    });

    it("選択後にモーダルが閉じる", async () => {
      const user = userEvent.setup();
      const props = setupModal({ requireConfirmation: false });

      const templateCard = screen.getByRole("button", {
        name: new RegExp(TEST_TEMPLATE.name),
      });
      await user.click(templateCard);

      await waitFor(() => {
        expect(props.onOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe("テンプレート選択（確認必要: requireConfirmation=true）", () => {
    it("テンプレートカードクリックで確認画面に遷移する", async () => {
      const user = userEvent.setup();
      setupModal({ requireConfirmation: true });

      const templateCard = screen.getByRole("button", {
        name: new RegExp(TEST_TEMPLATE.name),
      });
      await user.click(templateCard);

      // 確認画面のタイトル・説明が表示される
      expect(screen.getByText(TEMPLATE_CONFIRM_TITLE)).toBeInTheDocument();
      expect(
        screen.getByText(TEMPLATE_CONFIRM_DESCRIPTION),
      ).toBeInTheDocument();
    });

    it("確認画面に選択したテンプレートの情報が表示される", async () => {
      const user = userEvent.setup();
      setupModal({ requireConfirmation: true });

      const templateCard = screen.getByRole("button", {
        name: new RegExp(TEST_TEMPLATE.name),
      });
      await user.click(templateCard);

      // 確認画面にテンプレート名とカード数が表示される
      expect(screen.getByText(TEST_TEMPLATE.name)).toBeInTheDocument();
      expect(
        screen.getByText(
          `${TEST_TEMPLATE.cardCount}${TEMPLATE_CARD_COUNT_LABEL}`,
        ),
      ).toBeInTheDocument();
    });

    it("「新しい指導箋で開く」クリックで onSelect が new で呼ばれる", async () => {
      const user = userEvent.setup();
      const props = setupModal({ requireConfirmation: true });

      const templateCard = screen.getByRole("button", {
        name: new RegExp(TEST_TEMPLATE.name),
      });
      await user.click(templateCard);

      const confirmButton = screen.getByRole("button", {
        name: OPEN_AS_NEW_PROJECT_LABEL,
      });
      await user.click(confirmButton);

      expect(props.onSelect).toHaveBeenCalledWith(
        TEST_TEMPLATE.id,
        "new",
        "official",
      );
    });

    it("「現在の指導箋に上書き」クリックで onSelect が overwrite で呼ばれる", async () => {
      const user = userEvent.setup();
      const props = setupModal({ requireConfirmation: true });

      await user.click(
        screen.getByRole("button", { name: new RegExp(TEST_TEMPLATE.name) }),
      );
      await user.click(
        screen.getByRole("button", { name: OVERWRITE_CURRENT_PROJECT_LABEL }),
      );

      expect(props.onSelect).toHaveBeenCalledWith(
        TEST_TEMPLATE.id,
        "overwrite",
        "official",
      );
    });

    it("「新しい指導箋で開く」クリック後にモーダルが閉じる", async () => {
      const user = userEvent.setup();
      const props = setupModal({ requireConfirmation: true });

      const templateCard = screen.getByRole("button", {
        name: new RegExp(TEST_TEMPLATE.name),
      });
      await user.click(templateCard);

      const confirmButton = screen.getByRole("button", {
        name: OPEN_AS_NEW_PROJECT_LABEL,
      });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(props.onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it("「キャンセル」ボタンクリックでテンプレート一覧に戻る", async () => {
      const user = userEvent.setup();
      setupModal({ requireConfirmation: true });

      const templateCard = screen.getByRole("button", {
        name: new RegExp(TEST_TEMPLATE.name),
      });
      await user.click(templateCard);

      // 確認画面に遷移したことを確認
      expect(screen.getByText(TEMPLATE_CONFIRM_TITLE)).toBeInTheDocument();

      const cancelButton = screen.getByRole("button", { name: BUTTON_CANCEL });
      await user.click(cancelButton);

      // テンプレート一覧に戻る
      expect(screen.getByText(TEMPLATE_MODAL_TITLE)).toBeInTheDocument();
      expect(
        screen.queryByText(TEMPLATE_CONFIRM_TITLE),
      ).not.toBeInTheDocument();
    });
  });

  describe("ローディング状態", () => {
    it("ローディング中はテンプレートカードが無効化される", async () => {
      const user = userEvent.setup();
      // onSelect が解決されない Promise を返す
      const neverResolve = new Promise<void>(() => {});
      setupModal({
        requireConfirmation: false,
        onSelect: vi.fn().mockReturnValue(neverResolve),
      });

      const templateCard = screen.getByRole("button", {
        name: new RegExp(TEST_TEMPLATE.name),
      });
      await user.click(templateCard);

      // 全てのテンプレートカードが無効化される
      await waitFor(() => {
        const templateCardButtons = getAllTemplateCardButtons();
        expect(templateCardButtons.length).toBeGreaterThan(0);
        for (const button of templateCardButtons) {
          expect(button).toBeDisabled();
        }
      });
    });

    it("ローディング中は確認画面のボタンが無効化される", async () => {
      const user = userEvent.setup();
      const neverResolve = new Promise<void>(() => {});
      setupModal({
        requireConfirmation: true,
        onSelect: vi.fn().mockReturnValue(neverResolve),
      });

      const templateCard = screen.getByRole("button", {
        name: new RegExp(TEST_TEMPLATE.name),
      });
      await user.click(templateCard);

      const confirmButton = screen.getByRole("button", {
        name: OPEN_AS_NEW_PROJECT_LABEL,
      });
      await user.click(confirmButton);

      // ローディング中はボタンが無効化される
      await waitFor(() => {
        expect(
          screen.getByRole("button", {
            name: new RegExp(TEMPLATE_LOADING_LABEL),
          }),
        ).toBeDisabled();
        expect(
          screen.getByRole("button", { name: BUTTON_CANCEL }),
        ).toBeDisabled();
        expect(
          screen.getByRole("button", { name: OVERWRITE_CURRENT_PROJECT_LABEL }),
        ).toBeDisabled();
      });
    });

    it("ローディング中は「読み込み中...」が表示される", async () => {
      const user = userEvent.setup();
      const neverResolve = new Promise<void>(() => {});
      setupModal({
        requireConfirmation: true,
        onSelect: vi.fn().mockReturnValue(neverResolve),
      });

      const templateCard = screen.getByRole("button", {
        name: new RegExp(TEST_TEMPLATE.name),
      });
      await user.click(templateCard);

      const confirmButton = screen.getByRole("button", {
        name: OPEN_AS_NEW_PROJECT_LABEL,
      });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(TEMPLATE_LOADING_LABEL)).toBeInTheDocument();
      });
    });
  });

  describe("状態リセット", () => {
    it("モーダルクローズ時に内部状態がリセットされる", async () => {
      const user = userEvent.setup();
      const props = { ...createDefaultProps(), requireConfirmation: true };
      const { onOpenChange } = props;
      const { rerender } = render(<TemplateSelectModal {...props} />);

      // 確認画面に遷移
      const templateCard = screen.getByRole("button", {
        name: new RegExp(TEST_TEMPLATE.name),
      });
      await user.click(templateCard);
      expect(screen.getByText(TEMPLATE_CONFIRM_TITLE)).toBeInTheDocument();

      // Dialog の Close ボタンをクリックしてモーダルを閉じる
      // これにより handleDialogOpenChange(false) が発火し、内部状態がリセットされる
      const closeButton = screen.getByRole("button", { name: "Close" });
      await user.click(closeButton);

      // onOpenChange(false) が呼ばれたことを確認
      expect(onOpenChange).toHaveBeenCalledWith(false);

      // モーダルを閉じた状態に更新
      rerender(<TemplateSelectModal {...props} open={false} />);

      // 再度モーダルを開く
      rerender(<TemplateSelectModal {...props} open />);

      // テンプレート一覧が表示される（確認画面ではない）
      expect(screen.getByText(TEMPLATE_MODAL_TITLE)).toBeInTheDocument();
      expect(
        screen.queryByText(TEMPLATE_CONFIRM_TITLE),
      ).not.toBeInTheDocument();
    });
  });

  describe("マイテンプレート", () => {
    /** マイテンプレートのタブを開く */
    async function openUserTab(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole("tab", { name: TEMPLATE_TAB_USER_LABEL }));
    }

    it("保存したテンプレートがなければ案内を表示する", async () => {
      const user = userEvent.setup();
      setupModal();

      await openUserTab(user);

      expect(screen.getByRole("tab", { name: TEMPLATE_TAB_USER_LABEL })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      expect(screen.getByText(USER_TEMPLATE_EMPTY_MESSAGE)).toBeInTheDocument();
    });

    it("名前の初期値は編集中の指導箋のタイトルで、変更した名前で保存できる", async () => {
      const user = userEvent.setup();
      const props = setupModal({ currentTitle: "腰痛体操" });
      await openUserTab(user);

      const nameInput = screen.getByRole("textbox", {
        name: USER_TEMPLATE_NAME_LABEL,
      });
      expect(nameInput).toHaveValue("腰痛体操");

      await user.clear(nameInput);
      await user.type(nameInput, "腰痛セット");
      await user.click(
        screen.getByRole("button", { name: USER_TEMPLATE_SAVE_LABEL }),
      );

      expect(props.onSaveCurrent).toHaveBeenCalledWith("腰痛セット");
      // 保存後は名前の入力を編集中のタイトルに戻す
      await waitFor(() => {
        expect(nameInput).toHaveValue("腰痛体操");
      });
    });

    it("カードがない指導箋は保存できず、案内を表示する", async () => {
      const user = userEvent.setup();
      setupModal({ canSaveCurrent: false });
      await openUserTab(user);

      expect(
        screen.getByRole("button", { name: USER_TEMPLATE_SAVE_LABEL }),
      ).toBeDisabled();
      expect(screen.getByText(USER_TEMPLATE_SAVE_EMPTY_HINT)).toBeInTheDocument();
    });

    it("マイテンプレートを選ぶと出どころ user で onSelect が呼ばれる", async () => {
      const user = userEvent.setup();
      mockUseLiveQuery.mockReturnValue([USER_TEMPLATE]);
      const props = setupModal({ requireConfirmation: false });
      await openUserTab(user);

      // カード枚数はテンプレートの中身から数える
      expect(screen.getByText(`2${TEMPLATE_CARD_COUNT_LABEL}`)).toBeInTheDocument();
      await user.click(
        // 削除ボタンと区別するため、カード枚数まで含めた名前で探す
        screen.getByRole("button", { name: /膝の自主トレ.*カード/ }),
      );

      expect(props.onSelect).toHaveBeenCalledWith(
        USER_TEMPLATE.id,
        "overwrite",
        "user",
      );
    });

    it("確認ダイアログを経てマイテンプレートを削除できる", async () => {
      const user = userEvent.setup();
      mockUseLiveQuery.mockReturnValue([USER_TEMPLATE]);
      setupModal();
      await openUserTab(user);

      await user.click(
        screen.getByRole("button", { name: `${USER_TEMPLATE.name}を削除` }),
      );
      await user.click(screen.getByRole("button", { name: BUTTON_DELETE }));

      expect(mockDeleteUserTemplate).toHaveBeenCalledWith(USER_TEMPLATE.id);
      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith(
          USER_TEMPLATE_DELETE_SUCCESS_MESSAGE,
        );
      });
    });
  });
});
