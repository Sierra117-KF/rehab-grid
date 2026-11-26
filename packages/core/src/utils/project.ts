/**
 * プロジェクト関連のユーティリティ関数
 */

import { createProjectRecord, db } from "@rehab-grid/core/lib/db";
import { type ImportResult } from "@rehab-grid/core/types";

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
