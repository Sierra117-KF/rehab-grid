/**
 * BackupExportDialog / BackupRestoreDialog のユニットテスト
 */
import {
  BACKUP_CATEGORY_CUSTOM_SNIPPETS_LABEL,
  BACKUP_CATEGORY_EXERCISE_CARDS_LABEL,
  BACKUP_CATEGORY_PROJECTS_LABEL,
  BACKUP_CATEGORY_TEMPLATES_LABEL,
  BACKUP_CATEGORY_UNUSED_IMAGES_LABEL,
  BACKUP_EXPORT_BUTTON_LABEL,
  BACKUP_EXPORT_EMPTY_MESSAGE,
  BACKUP_EXPORT_SELECT_REQUIRED,
  BACKUP_RESTORE_BUTTON_LABEL,
  BACKUP_RESTORE_EMPTY_BACKUP_MESSAGE,
  BACKUP_RESTORE_MODE_MERGE_LABEL,
  BACKUP_RESTORE_MODE_REPLACE_LABEL,
  BACKUP_RESTORE_REPLACE_BUTTON_LABEL,
} from "@rehab-grid/core/lib/constants";
import { BACKUP_FORMAT, BACKUP_SCHEMA_VERSION } from "@rehab-grid/core/lib/schemas";
import type { BackupSummaryCounts, ParsedBackup } from "@rehab-grid/core/types";
import { BackupExportDialog } from "@rehab-grid/ui/components/editor/BackupExportDialog";
import { BackupRestoreDialog } from "@rehab-grid/ui/components/editor/BackupRestoreDialog";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

/** テスト用の件数サマリーを生成 */
function createCounts(
  overrides: Partial<BackupSummaryCounts> = {}
): BackupSummaryCounts {
  return {
    projects: 3,
    userTemplates: 2,
    exerciseCards: 4,
    customSnippets: 5,
    unusedImages: 1,
    totalImages: 3,
    ...overrides,
  };
}

/** テスト用の ParsedBackup を生成 */
function createParsedBackup(
  counts: BackupSummaryCounts = createCounts()
): ParsedBackup {
  return {
    manifest: {
      format: BACKUP_FORMAT,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      appVersion: "1.3.3",
      exportedAt: "2026-11-26T10:00:00.000Z",
      projects: [],
      userTemplates: [],
      exerciseCards: [],
      customSnippets: [],
      images: [],
    },
    images: new Map(),
    unusedImagePaths: new Set(),
    counts,
  };
}

describe("BackupExportDialog", () => {
  it("件数があるカテゴリがデフォルトでチェックされ、チェック変更して書き出せる", async () => {
    const user = userEvent.setup();
    const onExport = vi.fn().mockResolvedValue(undefined);
    const counts = createCounts({ userTemplates: 0 });

    render(
      <BackupExportDialog
        open
        onOpenChange={vi.fn()}
        counts={counts}
        onExport={onExport}
      />
    );

    const projectsCheckbox = screen.getByRole("checkbox", {
      name: new RegExp(BACKUP_CATEGORY_PROJECTS_LABEL),
    });
    const templatesCheckbox = screen.getByRole("checkbox", {
      name: new RegExp(BACKUP_CATEGORY_TEMPLATES_LABEL),
    });
    const unusedCheckbox = screen.getByRole("checkbox", {
      name: new RegExp(BACKUP_CATEGORY_UNUSED_IMAGES_LABEL),
    });

    expect(projectsCheckbox).toBeChecked();
    expect(templatesCheckbox).not.toBeChecked();
    expect(templatesCheckbox).toBeDisabled();
    expect(unusedCheckbox).toBeChecked();

    // マイ指導箋と未使用画像のチェックを外す（チーム配布想定）
    await user.click(projectsCheckbox);
    await user.click(unusedCheckbox);
    await user.click(
      screen.getByRole("button", { name: BACKUP_EXPORT_BUTTON_LABEL })
    );

    await waitFor(() => {
      expect(onExport).toHaveBeenCalledWith({
        projects: false,
        userTemplates: false,
        exerciseCards: true,
        customSnippets: true,
        unusedImages: false,
      });
    });
  });

  it("すべてのチェックを外すと案内を表示してボタンを無効化する", async () => {
    const user = userEvent.setup();
    render(
      <BackupExportDialog
        open
        onOpenChange={vi.fn()}
        counts={createCounts({
          projects: 1,
          userTemplates: 0,
          exerciseCards: 0,
          customSnippets: 0,
          unusedImages: 0,
        })}
        onExport={vi.fn()}
      />
    );

    await user.click(
      screen.getByRole("checkbox", {
        name: new RegExp(BACKUP_CATEGORY_PROJECTS_LABEL),
      })
    );

    expect(
      screen.getByText(BACKUP_EXPORT_SELECT_REQUIRED)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: BACKUP_EXPORT_BUTTON_LABEL })
    ).toBeDisabled();
  });

  it("データが1件もない場合は空メッセージを表示してボタンを無効化する", () => {
    render(
      <BackupExportDialog
        open
        onOpenChange={vi.fn()}
        counts={createCounts({
          projects: 0,
          userTemplates: 0,
          exerciseCards: 0,
          customSnippets: 0,
          unusedImages: 0,
          totalImages: 0,
        })}
        onExport={vi.fn()}
      />
    );

    expect(screen.getByText(BACKUP_EXPORT_EMPTY_MESSAGE)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: BACKUP_EXPORT_BUTTON_LABEL })
    ).toBeDisabled();
  });
});

describe("BackupRestoreDialog", () => {
  it("既定は「現在のデータに追加する（推奨）」で、選択カテゴリを指定して復元できる", async () => {
    const user = userEvent.setup();
    const onRestore = vi.fn().mockResolvedValue(undefined);
    const backup = createParsedBackup();

    render(
      <BackupRestoreDialog
        open
        onOpenChange={vi.fn()}
        backup={backup}
        currentCounts={createCounts()}
        onRestore={onRestore}
      />
    );

    expect(
      screen.getByRole("radio", { name: new RegExp(BACKUP_RESTORE_MODE_MERGE_LABEL) })
    ).toBeChecked();

    // マイ指導箋と未使用の取り込み画像を外して復元
    await user.click(
      screen.getByRole("checkbox", {
        name: new RegExp(BACKUP_CATEGORY_PROJECTS_LABEL),
      })
    );
    await user.click(
      screen.getByRole("checkbox", {
        name: new RegExp(BACKUP_CATEGORY_UNUSED_IMAGES_LABEL),
      })
    );
    await user.click(
      screen.getByRole("button", { name: BACKUP_RESTORE_BUTTON_LABEL })
    );

    await waitFor(() => {
      expect(onRestore).toHaveBeenCalledWith(
        backup,
        {
          projects: false,
          userTemplates: true,
          exerciseCards: true,
          customSnippets: true,
          unusedImages: false,
        },
        "merge"
      );
    });
  });

  it("「すべて置き換える」を選ぶと警告を表示し、カテゴリ選択を固定して replace モードで復元する", async () => {
    const user = userEvent.setup();
    const onRestore = vi.fn().mockResolvedValue(undefined);
    const backup = createParsedBackup();
    const currentCounts = createCounts({
      projects: 2,
      userTemplates: 1,
      exerciseCards: 0,
      customSnippets: 0,
      unusedImages: 0,
      totalImages: 3,
    });

    render(
      <BackupRestoreDialog
        open
        onOpenChange={vi.fn()}
        backup={backup}
        currentCounts={currentCounts}
        onRestore={onRestore}
      />
    );

    await user.click(
      screen.getByRole("radio", {
        name: new RegExp(BACKUP_RESTORE_MODE_REPLACE_LABEL),
      })
    );

    // 警告バナーに現在の端末件数が表示される
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("マイ指導箋 2件");
    expect(alert).toHaveTextContent("マイテンプレート 1件");
    expect(alert).toHaveTextContent("取り込み画像 3枚");

    // すべてのカテゴリチェックボックスが変更不可になる
    expect(
      screen.getByRole("checkbox", {
        name: new RegExp(BACKUP_CATEGORY_PROJECTS_LABEL),
      })
    ).toBeDisabled();
    expect(
      screen.getByRole("checkbox", {
        name: new RegExp(BACKUP_CATEGORY_EXERCISE_CARDS_LABEL),
      })
    ).toBeDisabled();
    expect(
      screen.getByRole("checkbox", {
        name: new RegExp(BACKUP_CATEGORY_CUSTOM_SNIPPETS_LABEL),
      })
    ).toBeDisabled();

    await user.click(
      screen.getByRole("button", { name: BACKUP_RESTORE_REPLACE_BUTTON_LABEL })
    );

    await waitFor(() => {
      expect(onRestore).toHaveBeenCalledWith(
        backup,
        expect.any(Object),
        "replace"
      );
    });
  });

  it("バックアップに復元できるデータが0件のときは空メッセージを表示しボタンを無効化する", () => {
    const emptyBackup = createParsedBackup(
      createCounts({
        projects: 0,
        userTemplates: 0,
        exerciseCards: 0,
        customSnippets: 0,
        unusedImages: 0,
        totalImages: 0,
      })
    );

    render(
      <BackupRestoreDialog
        open
        onOpenChange={vi.fn()}
        backup={emptyBackup}
        currentCounts={createCounts()}
        onRestore={vi.fn()}
      />
    );

    expect(
      screen.getByText(BACKUP_RESTORE_EMPTY_BACKUP_MESSAGE)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: BACKUP_RESTORE_BUTTON_LABEL })
    ).toBeDisabled();
  });
});
