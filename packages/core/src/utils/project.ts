/**
 * プロジェクト関連のユーティリティ関数
 */

import {
  APP_VERSION,
  getSampleImagePath,
  PRECAUTION_SNIPPETS,
} from "@rehab-grid/core/lib/constants";
import { createProjectRecord, db } from "@rehab-grid/core/lib/db";
import {
  type BackupCategorySelection,
  type BackupRestoreMode,
  type BackupRestoreSummary,
  type CustomSnippetRecord,
  type EditorItem,
  type ExerciseCardRecord,
  type ImageRecord,
  type ImportResult,
  type ParsedBackup,
  type ProjectFile,
  type ProjectRecord,
  type UserTemplateRecord,
} from "@rehab-grid/core/types";
import { nanoid } from "nanoid";

import { parseIsoDateOrFallback } from "./date";
import { cloneItemWithNewIds } from "./template";

/** すべてのバックアップカテゴリを選択した状態 */
export const ALL_BACKUP_CATEGORIES_SELECTED: BackupCategorySelection = {
  projects: true,
  userTemplates: true,
  exerciseCards: true,
  customSnippets: true,
  unusedImages: true,
};

/**
 * 復元時の画像ソースを新しい画像IDへ解決する
 *
 * @remarks
 * 実在するサンプル画像 ID（`getSampleImagePath` に存在する ID）のみそのまま維持する
 */
function resolveImageSourceForRestore(
  imageSource: string,
  pathToNewId: ReadonlyMap<string, string>
): string {
  if (imageSource === "" || getSampleImagePath(imageSource) !== undefined) {
    return imageSource;
  }
  return pathToNewId.get(imageSource) ?? "";
}

/**
 * 復元するカードアイテムの ID を振り直し、画像参照を新 ID へ書き換える
 */
function prepareRestoredItem(
  item: EditorItem,
  pathToNewId: ReadonlyMap<string, string>,
  order?: number
): EditorItem {
  const cloned = cloneItemWithNewIds(item);
  return {
    ...cloned,
    ...(order !== undefined ? { order } : {}),
    imageSource: resolveImageSourceForRestore(cloned.imageSource, pathToNewId),
  };
}

/**
 * 復元する ProjectFile のアイテム ID と画像参照を整備する
 */
function prepareRestoredProject(
  project: ProjectFile,
  pathToNewId: ReadonlyMap<string, string>
): ProjectFile {
  return {
    ...project,
    meta: {
      ...project.meta,
      version: APP_VERSION,
    },
    items: project.items.map((item) => prepareRestoredItem(item, pathToNewId)),
  };
}

/**
 * インポート結果を IndexedDB に保存する
 *
 * 画像とプロジェクトを 1 つのトランザクションで保存する。
 * インポートとテンプレート適用の共通処理。ストアへの反映は呼び出し側（ストアの openImportResult）が行う。
 *
 * @param result - インポート結果（プロジェクトデータと画像のマップ）
 * @param projectId - 保存先のプロジェクトID（新しい指導箋として開く場合は新しいID）
 *
 * @example
 * ```typescript
 * const result = await importProject(file);
 * await applyImportResult(result, projectId);
 * ```
 */
export async function applyImportResult(
  result: ImportResult,
  projectId: string
): Promise<void> {
  const { project, images } = result;
  const now = new Date();

  // Dexieトランザクションで画像とプロジェクトをアトミックに保存
  // 途中で失敗した場合は全てロールバックされる
  await db.transaction("rw", [db.projects, db.images], async () => {
    // 画像をIndexedDBに保存
    for (const [id, blob] of images) {
      await db.images.put({
        id,
        blob,
        createdAt: now,
      });
    }

    // プロジェクトをIndexedDBに保存
    await db.projects.put(createProjectRecord(projectId, project));
  });
}

/**
 * パース済み一括バックアップを IndexedDB へ反映する
 *
 * @remarks
 * - `mode === "replace"` では全カテゴリ強制対象とし、5テーブルを 1 トランザクションで全置換する
 * - `mode === "merge"` では選択カテゴリのみ追加し、既存データを保持する
 * - 指導箋・マイテンプレート・マイ運動は常に新しい ID を採番して安全に追加する
 * - マイ定型文は組み込みおよび既存登録済みと文言が一致するものを重複スキップする
 *
 * @param backup - 検証済みのバックアップデータ
 * @param selection - 復元対象のカテゴリ選択（replace 時は全選択として扱う）
 * @param mode - 復元方法（"merge" | "replace"）
 * @returns 復元件数サマリーと、復元した指導箋のうち最新のプロジェクトID
 */
export async function applyBackupToDB(
  backup: ParsedBackup,
  selection: BackupCategorySelection,
  mode: BackupRestoreMode
): Promise<{
  summary: BackupRestoreSummary;
  latestProjectId: string | undefined;
}> {
  const effectiveSelection: BackupCategorySelection =
    mode === "replace" ? ALL_BACKUP_CATEGORIES_SELECTED : selection;

  const targetProjects = effectiveSelection.projects
    ? backup.manifest.projects
    : [];
  const targetTemplates = effectiveSelection.userTemplates
    ? backup.manifest.userTemplates
    : [];
  const targetCards = effectiveSelection.exerciseCards
    ? backup.manifest.exerciseCards
    : [];
  const targetSnippets = effectiveSelection.customSnippets
    ? backup.manifest.customSnippets
    : [];

  // 保存する画像パスを決定（選択カテゴリから参照される画像 ＋ 未使用画像）
  const neededImagePaths = new Set<string>();
  const targetItems: EditorItem[] = [
    ...targetProjects.flatMap((entry) => entry.data.items),
    ...targetTemplates.flatMap((entry) => entry.data.items),
    ...targetCards.map((entry) => entry.item),
  ];
  for (const item of targetItems) {
    if (backup.images.has(item.imageSource)) {
      neededImagePaths.add(item.imageSource);
    }
  }
  if (effectiveSelection.unusedImages) {
    for (const path of backup.unusedImagePaths) {
      if (backup.images.has(path)) {
        neededImagePaths.add(path);
      }
    }
  }

  // 画像 1 枚につき新しい ID を 1 つ発行し、複数カード間の共有参照を維持する
  const pathToNewId = new Map<string, string>();
  const imageRecords: ImageRecord[] = [];
  for (const path of neededImagePaths) {
    const parsedImage = backup.images.get(path);
    if (!parsedImage) continue;

    const newId = nanoid();
    pathToNewId.set(path, newId);
    imageRecords.push({
      id: newId,
      blob: parsedImage.blob,
      createdAt: parsedImage.createdAt,
      ...(parsedImage.fileName !== undefined && parsedImage.fileName !== ""
        ? { fileName: parsedImage.fileName }
        : {}),
    });
  }

  const now = new Date();

  const projectRecords: ProjectRecord[] = targetProjects.map((entry) => {
    const updatedAt = parseIsoDateOrFallback(entry.updatedAt, now);
    const data = prepareRestoredProject(entry.data, pathToNewId);
    return {
      id: nanoid(),
      title: data.meta.title,
      data: {
        ...data,
        meta: {
          ...data.meta,
          updatedAt: updatedAt.toISOString(),
        },
      },
      updatedAt,
    };
  });

  const templateRecords: UserTemplateRecord[] = targetTemplates.map((entry) => ({
    id: nanoid(),
    name: entry.name,
    data: prepareRestoredProject(entry.data, pathToNewId),
    updatedAt: parseIsoDateOrFallback(entry.updatedAt, now),
  }));

  const cardRecords: ExerciseCardRecord[] = targetCards.map((entry) => {
    const item = prepareRestoredItem(entry.item, pathToNewId, 0);
    return {
      id: nanoid(),
      title: item.title,
      item,
      updatedAt: parseIsoDateOrFallback(entry.updatedAt, now),
    };
  });

  const builtInSnippetValues = new Set(
    PRECAUTION_SNIPPETS.map((snippet) => snippet.value)
  );

  let insertedSnippetCount = 0;
  let skippedSnippetCount = 0;

  await db.transaction(
    "rw",
    [
      db.projects,
      db.images,
      db.userTemplates,
      db.exerciseCards,
      db.customSnippets,
    ],
    async () => {
      const existingSnippetValues = new Set<string>(builtInSnippetValues);

      if (mode === "replace") {
        await Promise.all([
          db.projects.clear(),
          db.images.clear(),
          db.userTemplates.clear(),
          db.exerciseCards.clear(),
          db.customSnippets.clear(),
        ]);
      } else if (targetSnippets.length > 0) {
        const currentSnippets = await db.customSnippets.toArray();
        for (const snippet of currentSnippets) {
          existingSnippetValues.add(snippet.value);
        }
      }

      const snippetRecords: CustomSnippetRecord[] = [];
      for (const entry of targetSnippets) {
        if (entry.value === "" || existingSnippetValues.has(entry.value)) {
          skippedSnippetCount += 1;
          continue;
        }
        existingSnippetValues.add(entry.value);
        snippetRecords.push({
          id: nanoid(),
          value: entry.value,
          createdAt: parseIsoDateOrFallback(entry.createdAt, now),
        });
      }
      insertedSnippetCount = snippetRecords.length;

      if (imageRecords.length > 0) {
        await db.images.bulkPut(imageRecords);
      }
      if (projectRecords.length > 0) {
        await db.projects.bulkPut(projectRecords);
      }
      if (templateRecords.length > 0) {
        await db.userTemplates.bulkPut(templateRecords);
      }
      if (cardRecords.length > 0) {
        await db.exerciseCards.bulkPut(cardRecords);
      }
      if (snippetRecords.length > 0) {
        await db.customSnippets.bulkPut(snippetRecords);
      }
    }
  );

  // replace 時に開く指導箋として、更新日時が最新のプロジェクト ID を選ぶ
  const latestProject = [...projectRecords].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  )[0];

  return {
    summary: {
      projects: projectRecords.length,
      userTemplates: templateRecords.length,
      exerciseCards: cardRecords.length,
      customSnippets: insertedSnippetCount,
      skippedSnippets: skippedSnippetCount,
      images: imageRecords.length,
    },
    latestProjectId: latestProject?.id,
  };
}
