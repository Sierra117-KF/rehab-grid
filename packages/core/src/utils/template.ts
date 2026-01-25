/**
 * テンプレート読み込みユーティリティ
 *
 * public/templates/ に配置されたテンプレートを読み込み、
 * 既存のインポートフローと同様の形式で返す
 */

import {
  APP_VERSION,
  isSampleImage,
  TEMPLATE_BASE_PATH,
  TEMPLATE_INVALID_DATA_ERROR,
  TEMPLATE_LOAD_ERROR,
  TEMPLATE_NOT_FOUND_ERROR,
} from "@rehab-grid/core/lib/constants";
import { projectFileSchema } from "@rehab-grid/core/lib/schemas";
import { getTemplateById } from "@rehab-grid/core/lib/templates";
import { type ImportResult, type ProjectFile } from "@rehab-grid/core/types";
import { nanoid } from "nanoid";

/**
 * テンプレートを読み込む
 *
 * @remarks
 * public/templates/{path}/project.json と画像を読み込み、
 * ImportResult 形式で返す。既存のインポートフローで処理可能。
 *
 * @param templateId - テンプレートID
 * @returns インポート結果（プロジェクトデータと画像のマップ）
 * @throws テンプレートが見つからない、読み込みエラー、バリデーションエラー時
 *
 * @example
 * ```typescript
 * const { project, images } = await loadTemplate("lower-back-exercises");
 *
 * // 画像をDBに保存
 * for (const [id, blob] of images) {
 *   await saveImage(id, blob);
 * }
 *
 * // ストアを更新
 * useEditorStore.getState().initializeFromDB(project);
 * ```
 */
export async function loadTemplate(templateId: string): Promise<ImportResult> {
  // メタデータを取得
  const metadata = getTemplateById(templateId);
  if (!metadata) {
    throw new Error(TEMPLATE_NOT_FOUND_ERROR);
  }

  const basePath = `${TEMPLATE_BASE_PATH}/${metadata.path}`;

  // 1. project.json を取得
  let projectData: unknown;
  try {
    const res = await fetch(`${basePath}/project.json`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    projectData = await res.json();
  } catch {
    throw new Error(TEMPLATE_LOAD_ERROR);
  }

  // 2. Zodスキーマでバリデーション
  const result = projectFileSchema.safeParse(projectData);
  if (!result.success) {
    throw new Error(TEMPLATE_INVALID_DATA_ERROR);
  }

  const validatedData = result.data;

  // 3. 画像を取得して新しいIDを割り当て
  // サンプル画像（sample_*）の場合はfetchせずIDをそのまま維持
  const images = new Map<string, Blob>();
  const pathToNewId = new Map<string, string>();

  for (const item of validatedData.items) {
    if (item.imageSource) {
      // サンプル画像IDの場合はそのまま維持（fetchスキップ）
      if (isSampleImage(item.imageSource)) {
        pathToNewId.set(item.imageSource, item.imageSource);
        continue;
      }

      // 相対パスの場合は画像をfetchして新しいIDを割り当て
      try {
        const imageRes = await fetch(`${basePath}/${item.imageSource}`);
        if (imageRes.ok) {
          const blob = await imageRes.blob();
          const newId = nanoid();
          images.set(newId, blob);
          pathToNewId.set(item.imageSource, newId);
        }
      } catch {
        // 画像取得に失敗した場合はスキップ（imageSourceは空文字列になる）
      }
    }
  }

  // 4. imageSource を新しいIDに置換
  const project: ProjectFile = {
    ...validatedData,
    meta: {
      ...validatedData.meta,
      version: APP_VERSION,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    items: validatedData.items.map((item) => ({
      ...item,
      id: nanoid(),
      imageSource: pathToNewId.get(item.imageSource) ?? "",
      precautions: item.precautions?.map((p) => ({ ...p, id: nanoid() })),
    })),
  };

  return { project, images };
}
