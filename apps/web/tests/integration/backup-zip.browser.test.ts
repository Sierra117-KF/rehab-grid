/**
 * 一括バックアップ・復元 結合テスト（Browser Mode）
 *
 * @remarks
 * 実ブラウザの IndexedDB（Dexie）と JSZip・useEditorStore を連携させ、
 * 全5テーブルの一括書き出し → ZIP 解析 → 追加（merge）／全置換（replace）の
 * エンドツーエンド動作を検証する。
 */

import { APP_VERSION, PRECAUTION_SNIPPETS } from "@rehab-grid/core/lib/constants";
import {
  addCustomSnippet,
  db,
  getImageRecord,
  listCustomSnippets,
  listExerciseCards,
  listProjects,
  listUserTemplates,
  saveExerciseCard,
  saveImage,
  saveProject,
  saveUserTemplate,
} from "@rehab-grid/core/lib/db";
import { resolveProjectSettings } from "@rehab-grid/core/lib/settings";
import { useEditorStore } from "@rehab-grid/core/lib/store/useEditorStore";
import type { ProjectFile } from "@rehab-grid/core/types";
import {
  createBackupZIP,
  inspectImportFile,
  parseBackupZIP,
} from "@rehab-grid/core/utils/backup";
import { ALL_BACKUP_CATEGORIES_SELECTED } from "@rehab-grid/core/utils/project";
import { beforeEach, describe, expect, it } from "vitest";

/** DB を空状態にリセットする */
async function resetDb(): Promise<void> {
  db.close();
  await db.delete();
  await db.open();
}

/** ストアを初期状態にリセットする */
function resetStore(): void {
  useEditorStore.setState({
    isLoaded: true,
    projectId: "initial-project",
    isSwitchingProject: false,
    meta: {
      version: APP_VERSION,
      createdAt: "2026-11-26T00:00:00.000Z",
      updatedAt: "2026-11-26T00:00:00.000Z",
      title: "編集中",
      projectType: "training",
    },
    items: [],
    settings: resolveProjectSettings(undefined),
    selectedItemId: null,
    past: [],
    future: [],
    lastHistoryCommit: null,
  });
}

/** 有効な PNG マジックバイトを持つ Blob を作成 */
function createPngBlob(label: string): Blob {
  const header = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  const body = new TextEncoder().encode(label);
  return new Blob([header, body], { type: "image/png" });
}

/** テスト用の ProjectFile を生成 */
function createProject(title: string, imageSource = ""): ProjectFile {
  return {
    meta: {
      version: APP_VERSION,
      createdAt: "2026-11-20T00:00:00.000Z",
      updatedAt: "2026-11-25T00:00:00.000Z",
      title,
      projectType: "training",
    },
    settings: {
      layoutType: "grid2",
      themeColor: "#3b82f6",
    },
    items: [
      {
        id: "item-1",
        order: 0,
        title: "ヒップアップ",
        imageSource,
        description: "お尻を持ち上げる",
      },
    ],
  };
}

/** 全5テーブルから BackupSourceData を読み取る */
async function readDbSnapshot() {
  const [projects, userTemplates, exerciseCards, customSnippets, images] =
    await Promise.all([
      db.projects.toArray(),
      db.userTemplates.toArray(),
      db.exerciseCards.toArray(),
      db.customSnippets.toArray(),
      db.images.toArray(),
    ]);
  return { projects, userTemplates, exerciseCards, customSnippets, images };
}

describe("一括バックアップ・復元（Browser Mode）", { concurrent: false }, () => {
  beforeEach(async () => {
    await resetDb();
    resetStore();
  });

  it("全データを一括バックアップし、空端末へ replace で完全復元できる（画像重複排除・fileName・サンプル画像ID維持）", async () => {
    // 1. 元データを作成
    await saveImage("img-shared", createPngBlob("SHARED"), "共有ポーズ");
    await saveImage("img-unused", createPngBlob("UNUSED"), "未使用素材");
    await saveProject("p1", createProject("腰痛プログラム", "img-shared"));
    await saveProject("p2", createProject("サンプル指導箋", "sample_lying_01"));
    await saveUserTemplate(
      "整形外科テンプレ",
      createProject("整形外科テンプレ", "img-shared")
    );
    await saveExerciseCard({
      id: "ec-1",
      order: 0,
      title: "お気に入り運動",
      imageSource: "img-shared",
      description: "ゆっくり",
    });
    await addCustomSnippet("食後30分は避ける");

    // 2. 一括バックアップ ZIP 生成
    const zipBlob = await createBackupZIP(
      await readDbSnapshot(),
      ALL_BACKUP_CATEGORIES_SELECTED
    );
    const backupFile = new File(
      [zipBlob],
      "rehab-grid-backup-2026-11-26.zip",
      { type: "application/zip" }
    );

    // 3. 自動判別で backup として認識される
    const inspected = await inspectImportFile(backupFile);
    expect(inspected.kind).toBe("backup");
    if (inspected.kind !== "backup") return;
    expect(inspected.backup.counts).toEqual({
      projects: 2,
      userTemplates: 1,
      exerciseCards: 1,
      customSnippets: 1,
      unusedImages: 1,
      totalImages: 2,
    });

    // 4. 端末データを別データに入れ替えたあと、replace で復元
    await resetDb();
    await saveProject("old-p", createProject("消える指導箋"));

    const summary = await useEditorStore
      .getState()
      .restoreBackup(
        inspected.backup,
        ALL_BACKUP_CATEGORIES_SELECTED,
        "replace"
      );

    expect(summary).toEqual({
      projects: 2,
      userTemplates: 1,
      exerciseCards: 1,
      customSnippets: 1,
      skippedSnippets: 0,
      images: 2,
    });

    const restoredProjects = await listProjects();
    const restoredTemplates = await listUserTemplates();
    const restoredCards = await listExerciseCards();
    const restoredSnippets = await listCustomSnippets();

    expect(restoredProjects.map((p) => p.title)).not.toContain("消える指導箋");
    expect(restoredProjects).toHaveLength(2);
    expect(restoredTemplates[0]?.name).toBe("整形外科テンプレ");
    expect(restoredCards[0]?.title).toBe("お気に入り運動");
    expect(restoredSnippets[0]?.value).toBe("食後30分は避ける");

    // 複数箇所で参照されていた画像が 1 枚として共有され、fileName と MIME タイプも保たれる
    const sharedProject = (await db.projects.toArray()).find(
      (p) => p.title === "腰痛プログラム"
    );
    const sharedImageId = sharedProject?.data.items[0]?.imageSource ?? "";
    expect(sharedImageId).not.toBe("");
    expect(restoredTemplates[0]?.data.items[0]?.imageSource).toBe(
      sharedImageId
    );
    expect(restoredCards[0]?.item.imageSource).toBe(sharedImageId);

    const imageRecord = await getImageRecord(sharedImageId);
    expect(imageRecord?.fileName).toBe("共有ポーズ");
    expect(imageRecord?.blob.type).toBe("image/png");

    // サンプル画像 ID は取り込み画像に複製されずそのまま維持される
    const sampleProject = (await db.projects.toArray()).find(
      (p) => p.title === "サンプル指導箋"
    );
    expect(sampleProject?.data.items[0]?.imageSource).toBe("sample_lying_01");

    // replace 後は復元された最新指導箋がエディタに開かれる
    expect(
      restoredProjects.some((p) => p.id === useEditorStore.getState().projectId)
    ).toBeTruthy();
  });

  it("チーム配布のマイ運動・マイ定型文を merge で取り込むと、既存データを残しつつ重複定型文はスキップする", async () => {
    // 配布用バックアップを作成
    await saveImage("team-img", createPngBlob("TEAM"), "チーム画像");
    await saveExerciseCard({
      id: "team-ec",
      order: 0,
      title: "チーム共通スクワット",
      imageSource: "team-img",
      description: "共有メニュー",
    });
    await addCustomSnippet("既存と重複する定型文");
    await addCustomSnippet("新しく追加される定型文");

    const teamZipBlob = await createBackupZIP(await readDbSnapshot(), {
      projects: false,
      userTemplates: false,
      exerciseCards: true,
      customSnippets: true,
      unusedImages: false,
    });
    const parsedTeamBackup = await parseBackupZIP(
      new File([teamZipBlob], "team-set.zip", { type: "application/zip" })
    );

    // 受け手側の端末データを準備
    await resetDb();
    await saveProject("my-proj", createProject("自分の指導箋"));
    await addCustomSnippet("既存と重複する定型文");
    useEditorStore
      .getState()
      .openProject("my-proj", createProject("自分の指導箋"));

    // merge で取り込む
    const summary = await useEditorStore.getState().restoreBackup(
      parsedTeamBackup,
      {
        projects: false,
        userTemplates: false,
        exerciseCards: true,
        customSnippets: true,
        unusedImages: false,
      },
      "merge"
    );

    expect(summary).toEqual({
      projects: 0,
      userTemplates: 0,
      exerciseCards: 1,
      customSnippets: 1,
      skippedSnippets: 1,
      images: 1,
    });

    // 既存の指導箋と編集中状態は維持される
    expect(useEditorStore.getState().projectId).toBe("my-proj");
    expect(await listProjects()).toHaveLength(1);
    expect(await listExerciseCards()).toHaveLength(1);

    const snippets = await listCustomSnippets();
    expect(snippets).toHaveLength(2);
    expect(snippets.map((s) => s.value)).toEqual(
      expect.arrayContaining([
        "既存と重複する定型文",
        "新しく追加される定型文",
      ])
    );
    // 組み込み定型文と同じ文言が入っていないことも確認
    expect(
      snippets.some((s) =>
        PRECAUTION_SNIPPETS.some((builtIn) => builtIn.value === s.value)
      )
    ).toBeFalsy();
  });
});
