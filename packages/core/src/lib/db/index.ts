/**
 * Dexie データベースのセットアップ
 *
 * IndexedDB を使用したプロジェクトと画像の永続化を提供
 */

import {
  APP_VERSION,
  DEFAULT_PROJECT_TITLE,
  DEFAULT_THEME_COLOR,
  PROJECT_COPY_SUFFIX,
  TEXT_LIMITS,
} from "@rehab-grid/core/lib/constants";
import {
  type ImageRecord,
  type ProjectFile,
  type ProjectRecord,
  type ProjectSummary,
} from "@rehab-grid/core/types";
import Dexie, { type EntityTable } from "dexie";
import { nanoid } from "nanoid";

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
 * 保存用のプロジェクトレコードを作る（更新日時を現在時刻にそろえる）
 *
 * @param id - プロジェクトID
 * @param data - 保存するプロジェクトデータ
 * @returns IndexedDB に保存するレコード
 */
export function createProjectRecord(
  id: string,
  data: ProjectFile
): ProjectRecord {
  const now = new Date();
  return {
    id,
    title: data.meta.title,
    data: {
      ...data,
      meta: {
        ...data.meta,
        updatedAt: now.toISOString(),
      },
    },
    updatedAt: now,
  };
}

/**
 * プロジェクトを保存
 *
 * @param id - 保存先のプロジェクトID
 * @param data - 保存するプロジェクトデータ
 */
export async function saveProject(id: string, data: ProjectFile): Promise<void> {
  await db.projects.put(createProjectRecord(id, data));
}

/**
 * プロジェクトを読み込み
 *
 * @param id - プロジェクトID
 * @returns プロジェクトデータ、存在しない場合は undefined
 */
export async function loadProject(
  id: string
): Promise<ProjectFile | undefined> {
  const record = await db.projects.get(id);
  return record?.data;
}

/**
 * 保存済みのプロジェクト一覧を取得（更新日時の新しい順）
 *
 * @remarks
 * 件数は多くないため全件を読み込む
 *
 * @returns 一覧表示用のプロジェクトの概要
 */
export async function listProjects(): Promise<ProjectSummary[]> {
  const records = await db.projects.toArray();
  return records
    .map((record) => ({
      id: record.id,
      title: record.title,
      updatedAt: record.updatedAt,
      cardCount: record.data.items.length,
      layoutType: record.data.settings.layoutType,
    }))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

/**
 * プロジェクトを複製して保存
 *
 * @remarks
 * タイトルの末尾に「のコピー」を付ける（プロジェクト名の文字数上限に収まるよう元のタイトルを切り詰める）。
 * 取り込み画像は ID で参照しているため、画像そのものは複製しない。
 *
 * @param id - 複製元のプロジェクトID
 * @returns 複製したプロジェクトのID（複製元が存在しない場合は undefined）
 */
export async function duplicateProject(
  id: string
): Promise<string | undefined> {
  const source = await loadProject(id);
  if (!source) return undefined;

  const newId = nanoid();
  const baseTitle = source.meta.title.slice(
    0,
    TEXT_LIMITS.projectTitle - PROJECT_COPY_SUFFIX.length
  );
  await saveProject(newId, {
    ...source,
    meta: {
      ...source.meta,
      title: `${baseTitle}${PROJECT_COPY_SUFFIX}`,
      createdAt: new Date().toISOString(),
    },
  });
  return newId;
}

/**
 * プロジェクトのカードが参照している画像IDを集める
 *
 * @remarks
 * 画像ライブラリから画像を削除する前に、他のプロジェクトで使われているかを確かめるために使う。
 * 編集中のプロジェクトは保存前の変更がストアにしかないため、呼び出し側で除外して別に判定する。
 *
 * @param excludeProjectId - 対象から除くプロジェクトID（編集中のプロジェクト）
 * @returns 参照されている画像IDの集合（サンプル画像のIDも含む）
 */
export async function collectReferencedImageIds(
  excludeProjectId?: string
): Promise<Set<string>> {
  const records = await db.projects.toArray();
  const ids = new Set<string>();
  for (const record of records) {
    if (record.id === excludeProjectId) continue;
    for (const item of record.data.items) {
      if (item.imageSource !== "") ids.add(item.imageSource);
    }
  }
  return ids;
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
      themeColor: DEFAULT_THEME_COLOR,
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
 * 画像レコード（Blob とファイル名）を取得
 *
 * @param id - 画像ID
 * @returns 画像レコード、存在しない場合は undefined
 */
export async function getImageRecord(
  id: string
): Promise<ImageRecord | undefined> {
  return db.images.get(id);
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
 * プロジェクトを削除
 *
 * @remarks
 * 取り込み画像は他のプロジェクトやライブラリの資産として残すため削除しない。
 *
 * @param id - 削除するプロジェクトID
 */
export async function deleteProject(id: string): Promise<void> {
  await db.projects.delete(id);
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
