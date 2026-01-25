/**
 * Dexie データベースのセットアップ
 *
 * IndexedDB を使用したプロジェクトと画像の永続化を提供
 */

import {
  APP_VERSION,
  CURRENT_PROJECT_ID,
  DEFAULT_PROJECT_TITLE,
} from "@rehab-grid/core/lib/constants";
import {
  type ImageRecord,
  type ProjectFile,
  type ProjectRecord,
} from "@rehab-grid/core/types";
import Dexie, { type EntityTable } from "dexie";

/**
 * RehabGrid データベースクラス
 *
 * @remarks
 * Dexie を継承し、projects と images テーブルを定義
 */
class RehabGridDB extends Dexie {
  projects!: EntityTable<ProjectRecord, "id">;
  images!: EntityTable<ImageRecord, "id">;

  constructor() {
    super("RehabGridDB");

    this.version(1).stores({
      projects: "id, title, updatedAt",
      images: "id, createdAt",
    });
  }
}

/** データベースインスタンス */
export const db = new RehabGridDB();

/**
 * 現在のプロジェクトを保存
 *
 * @param data - 保存するプロジェクトデータ
 */
export async function saveProject(data: ProjectFile): Promise<void> {
  const now = new Date();
  const updatedData: ProjectFile = {
    ...data,
    meta: {
      ...data.meta,
      updatedAt: now.toISOString(),
    },
  };

  await db.projects.put({
    id: CURRENT_PROJECT_ID,
    title: updatedData.meta.title,
    data: updatedData,
    updatedAt: now,
  });
}

/**
 * 現在のプロジェクトを読み込み
 *
 * @returns プロジェクトデータ、存在しない場合は undefined
 */
export async function loadProject(): Promise<ProjectFile | undefined> {
  const record = await db.projects.get(CURRENT_PROJECT_ID);
  return record?.data;
}

/**
 * 新規プロジェクトのデフォルトデータを作成
 *
 * @param title - プロジェクトタイトル
 * @returns 新規プロジェクトデータ
 */
export function createNewProject(title = DEFAULT_PROJECT_TITLE): ProjectFile {
  const now = new Date().toISOString();
  return {
    meta: {
      version: APP_VERSION,
      createdAt: now,
      updatedAt: now,
      title,
      projectType: "training",
    },
    settings: {
      layoutType: "grid2",
      themeColor: "#3b82f6",
    },
    items: [],
  };
}

/**
 * 画像を保存
 *
 * @param id - 画像ID
 * @param blob - 画像データ（Blob形式）
 * @param fileName - ファイル名（拡張子なし、オプショナル）
 */
export async function saveImage(
  id: string,
  blob: Blob,
  fileName?: string
): Promise<void> {
  await db.images.put({
    id,
    blob,
    createdAt: new Date(),
    fileName,
  });
}

/**
 * 画像を取得
 *
 * @param id - 画像ID
 * @returns 画像データ、存在しない場合は undefined
 */
export async function getImage(id: string): Promise<Blob | undefined> {
  const record = await db.images.get(id);
  return record?.blob;
}

/**
 * 画像を削除
 *
 * @param id - 削除する画像ID
 */
export async function deleteImage(id: string): Promise<void> {
  await db.images.delete(id);
}

/**
 * 現在のプロジェクトを削除
 *
 * @remarks
 * プロジェクト削除時に即座にIndexedDBからデータを削除する。
 * オートセーブのdebounce遅延に関係なく、確実にデータを削除するために使用。
 */
export async function deleteProject(): Promise<void> {
  await db.projects.delete(CURRENT_PROJECT_ID);
}

/**
 * 複数の画像を一括取得
 *
 * @param ids - 画像IDの配列
 * @returns 画像ID と Blob のマップ
 */
export async function getImages(
  ids: string[]
): Promise<Map<string, Blob | undefined>> {
  const records = await db.images.bulkGet(ids);
  const map = new Map<string, Blob | undefined>();
  ids.forEach((id, index) => {
    map.set(id, records[index]?.blob);
  });
  return map;
}
