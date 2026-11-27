/**
 * ProjectListModal（マイ指導箋）のユニットテスト
 */
import {
  BUTTON_DELETE,
  createProjectDeleteConfirmDescription,
  DEFAULT_PROJECT_TITLE,
  PROJECT_CREATE_SUCCESS_MESSAGE,
  PROJECT_DELETE_SUCCESS_MESSAGE,
  PROJECT_DUPLICATE_SUCCESS_MESSAGE,
  PROJECT_LIST_BACKUP_NOTICE,
  PROJECT_LIST_CURRENT_BADGE,
  PROJECT_LIST_NEW_LABEL,
  PROJECT_LIST_NO_MATCHES,
  PROJECT_LIST_SEARCH_LABEL,
} from "@rehab-grid/core/lib/constants";
import type { ProjectSummary } from "@rehab-grid/core/types";
import { ProjectListModal } from "@rehab-grid/ui/components/editor/ProjectListModal";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockUseLiveQuery,
  mockSwitchProject,
  mockCreateProject,
  mockDuplicateProject,
  mockDeleteProject,
  mockToastSuccess,
  mockToastError,
} = vi.hoisted(() => ({
  mockUseLiveQuery: vi.fn(),
  mockSwitchProject: vi.fn(),
  mockCreateProject: vi.fn(),
  mockDuplicateProject: vi.fn(),
  mockDeleteProject: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: mockUseLiveQuery,
}));

vi.mock("sonner", () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}));

/** モック用のストア状態（編集中のプロジェクト） */
let mockStoreState: {
  projectId: string;
  meta: { title: string; updatedAt: string };
  items: unknown[];
  settings: { layoutType: string };
  isSwitchingProject: boolean;
};

vi.mock("@/lib/store/useEditorStore", () => ({
  useEditorStore: (selector: (state: unknown) => unknown) =>
    selector({
      ...mockStoreState,
      switchProject: mockSwitchProject,
      createProject: mockCreateProject,
      duplicateProject: mockDuplicateProject,
      deleteProject: mockDeleteProject,
    }),
}));

/** 一覧用の概要を作る */
function createSummary(overrides: Partial<ProjectSummary>): ProjectSummary {
  return {
    id: "project-x",
    title: "指導箋",
    updatedAt: new Date(2026, 10, 26, 9, 5),
    cardCount: 3,
    layoutType: "grid2",
    ...overrides,
  };
}

/** 「膝の自主トレ」を開くボタンの名前（複製・削除ボタンと区別するため、カード枚数まで含める） */
const OPEN_PROJECT_B = /膝の自主トレ.*カード/;

/** 保存済みの指導箋（DB から読んだ値） */
const SAVED_PROJECTS: ProjectSummary[] = [
  createSummary({ id: "project-a", title: "腰痛体操（保存済み）" }),
  createSummary({
    id: "project-b",
    title: "膝の自主トレ",
    cardCount: 6,
    layoutType: "grid3",
  }),
];

/**
 * ProjectListModal を開いた状態で描画する
 */
function setupModal(savedProjects: ProjectSummary[] = SAVED_PROJECTS) {
  mockUseLiveQuery.mockReturnValue(savedProjects);
  const onOpenChange = vi.fn();
  render(<ProjectListModal open onOpenChange={onOpenChange} />);
  return { onOpenChange };
}

describe("ProjectListModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = {
      projectId: "project-a",
      meta: { title: "腰痛体操", updatedAt: "2026-11-26T00:00:00.000Z" },
      items: [{}, {}],
      settings: { layoutType: "grid1" },
      isSwitchingProject: false,
    };
    mockSwitchProject.mockResolvedValue(undefined);
    mockCreateProject.mockResolvedValue(undefined);
    mockDuplicateProject.mockResolvedValue("project-copy");
    mockDeleteProject.mockResolvedValue(undefined);
  });

  describe("一覧表示", () => {
    it("タイトル・更新日時・カード枚数・レイアウトを表示する", () => {
      setupModal();

      expect(screen.getByText("膝の自主トレ")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: OPEN_PROJECT_B })
      ).toHaveTextContent("2026年11月26日 09:05 ・ 6カード ・ 3列");
    });

    it("スライドの指導箋は「スライド」と表示する（列数ではない）", () => {
      setupModal([
        ...SAVED_PROJECTS,
        createSummary({
          id: "project-c",
          title: "肩の体操",
          cardCount: 4,
          layoutType: "slide",
        }),
      ]);

      expect(
        screen.getByRole("button", { name: /肩の体操.*カード/ })
      ).toHaveTextContent("4カード ・ スライド");
    });

    it("編集中の指導箋は保存前の値（ストア）で表示し、バッジを付ける", () => {
      setupModal();

      // DB のタイトル「腰痛体操（保存済み）」ではなくストアのタイトルを表示する
      expect(screen.getByText("腰痛体操")).toBeInTheDocument();
      expect(screen.queryByText("腰痛体操（保存済み）")).not.toBeInTheDocument();
      expect(screen.getByText(PROJECT_LIST_CURRENT_BADGE)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /腰痛体操.*カード/ })
      ).toHaveTextContent("2カード ・ 1列");
    });

    it("まだ保存されていない編集中の指導箋も一覧に出す", () => {
      mockStoreState.projectId = "project-new";
      mockStoreState.meta.title = "";
      setupModal();

      expect(screen.getByText(DEFAULT_PROJECT_TITLE)).toBeInTheDocument();
      expect(screen.getByText("腰痛体操（保存済み）")).toBeInTheDocument();
    });

    it("バックアップの案内を表示する", () => {
      setupModal();

      expect(screen.getByText(PROJECT_LIST_BACKUP_NOTICE)).toBeInTheDocument();
    });
  });

  describe("タイトル検索", () => {
    it("タイトルで絞り込める（ひらがな・カタカナを区別しない）", async () => {
      const user = userEvent.setup();
      setupModal();

      await user.type(
        screen.getByRole("textbox", { name: PROJECT_LIST_SEARCH_LABEL }),
        "ひざ"
      );

      // 「膝」は漢字のため一致しない
      expect(screen.getByText(PROJECT_LIST_NO_MATCHES)).toBeInTheDocument();

      await user.clear(
        screen.getByRole("textbox", { name: PROJECT_LIST_SEARCH_LABEL })
      );
      await user.type(
        screen.getByRole("textbox", { name: PROJECT_LIST_SEARCH_LABEL }),
        "膝"
      );

      expect(screen.getByText("膝の自主トレ")).toBeInTheDocument();
      expect(screen.queryByText("腰痛体操")).not.toBeInTheDocument();
    });
  });

  describe("操作", () => {
    it("指導箋をクリックすると切り替えて一覧を閉じる", async () => {
      const user = userEvent.setup();
      const { onOpenChange } = setupModal();

      await user.click(screen.getByRole("button", { name: OPEN_PROJECT_B }));

      expect(mockSwitchProject).toHaveBeenCalledWith("project-b");
      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it("切り替えに失敗したらエラーを表示し、一覧は開いたまま", async () => {
      mockSwitchProject.mockRejectedValueOnce(new Error("開けません"));
      const user = userEvent.setup();
      const { onOpenChange } = setupModal();

      await user.click(screen.getByRole("button", { name: OPEN_PROJECT_B }));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith("開けません");
      });
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("「新しい指導箋」で新規作成して一覧を閉じる", async () => {
      const user = userEvent.setup();
      const { onOpenChange } = setupModal();

      await user.click(
        screen.getByRole("button", { name: PROJECT_LIST_NEW_LABEL })
      );

      expect(mockCreateProject).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
      expect(mockToastSuccess).toHaveBeenCalledWith(
        PROJECT_CREATE_SUCCESS_MESSAGE
      );
    });

    it("複製ボタンで複製する（一覧は開いたまま）", async () => {
      const user = userEvent.setup();
      const { onOpenChange } = setupModal();

      await user.click(
        screen.getByRole("button", { name: "膝の自主トレを複製" })
      );

      expect(mockDuplicateProject).toHaveBeenCalledWith("project-b");
      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith(
          PROJECT_DUPLICATE_SUCCESS_MESSAGE
        );
      });
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("削除ボタンで確認ダイアログを出し、確定すると削除する", async () => {
      const user = userEvent.setup();
      setupModal();

      await user.click(
        screen.getByRole("button", { name: "膝の自主トレを削除" })
      );
      expect(
        screen.getByText(createProjectDeleteConfirmDescription("膝の自主トレ"))
      ).toBeInTheDocument();
      expect(mockDeleteProject).not.toHaveBeenCalled();

      await user.click(screen.getByRole("button", { name: BUTTON_DELETE }));

      expect(mockDeleteProject).toHaveBeenCalledWith("project-b");
      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith(
          PROJECT_DELETE_SUCCESS_MESSAGE
        );
      });
    });

    it("指導箋を開いて閉じたあと、再度開くと検索語がリセットされている", async () => {
      const user = userEvent.setup();
      mockUseLiveQuery.mockReturnValue(SAVED_PROJECTS);
      const onOpenChange = vi.fn();
      const { rerender } = render(
        <ProjectListModal open onOpenChange={onOpenChange} />
      );

      await user.type(
        screen.getByRole("textbox", { name: PROJECT_LIST_SEARCH_LABEL }),
        "膝"
      );
      await user.click(screen.getByRole("button", { name: OPEN_PROJECT_B }));
      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });

      rerender(<ProjectListModal open onOpenChange={onOpenChange} />);

      expect(
        screen.getByRole("textbox", { name: PROJECT_LIST_SEARCH_LABEL })
      ).toHaveValue("");
    });

    it("「新しい指導箋」を作成して閉じたあと、検索語がリセットされている", async () => {
      const user = userEvent.setup();
      mockUseLiveQuery.mockReturnValue(SAVED_PROJECTS);
      const onOpenChange = vi.fn();
      const { rerender } = render(
        <ProjectListModal open onOpenChange={onOpenChange} />
      );

      await user.type(
        screen.getByRole("textbox", { name: PROJECT_LIST_SEARCH_LABEL }),
        "膝"
      );
      await user.click(
        screen.getByRole("button", { name: PROJECT_LIST_NEW_LABEL })
      );
      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });

      rerender(<ProjectListModal open onOpenChange={onOpenChange} />);

      expect(
        screen.getByRole("textbox", { name: PROJECT_LIST_SEARCH_LABEL })
      ).toHaveValue("");
    });

    it("処理中は操作ボタンを無効にする", () => {
      mockStoreState.isSwitchingProject = true;
      setupModal();

      expect(
        screen.getByRole("button", { name: PROJECT_LIST_NEW_LABEL })
      ).toBeDisabled();
      expect(
        screen.getByRole("button", { name: OPEN_PROJECT_B })
      ).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "膝の自主トレを削除" })
      ).toBeDisabled();
    });
  });
});
