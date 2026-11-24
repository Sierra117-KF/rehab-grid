/**
 * プロジェクト関連のユーティリティ関数
 */

import { CURRENT_PROJECT_ID } from "@rehab-grid/core/lib/constants";
import { db } from "@rehab-grid/core/lib/db";
import { type ImportResult, type ProjectFile } from "@rehab-grid/core/types";

/**
 * インポート結果をアプリに適用する
 *
 * 画像をIndexedDBに保存し、プロジェクトを保存・ストアに反映する。
 * インポートとテンプレート適用の共通処理を抽出したもの。
 *
 * @param result - インポート結果（プロジェクトデータと画像のマップ）
 * @param initializeFromDB - ストア初期化関数
 *
 * @example
 * ```typescript
 * const result = await importProject(file);
 * await applyImportResult(result, initializeFromDB);
 * toast.success("インポートしました");
 * ```
 */
export async function applyImportResult(
  result: ImportResult,
  initializeFromDB: (project: ProjectFile) => void
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
    const updatedProject: ProjectFile = {
      ...project,
      meta: {
        ...project.meta,
        updatedAt: now.toISOString(),
      },
    };

    await db.projects.put({
      id: CURRENT_PROJECT_ID,
      title: updatedProject.meta.title,
      data: updatedProject,
      updatedAt: now,
    });
  });

  // ストアを更新（トランザクション成功後のみ実行される）
  initializeFromDB(project);
}
