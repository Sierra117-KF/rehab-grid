/**
 * Dexie データベースのセットアップ
 *
 * IndexedDB を使用したプロジェクトと画像の永続化を提供
 */

import {
  APP_VERSION,
  DEFAULT_PROJECT_TITLE,
  DEFAULT_THEME_COLOR,
  LIBRARY_SAVE_FAILED_MESSAGE,
  PROJECT_COPY_SUFFIX,
  TEXT_LIMITS,
} from "@rehab-grid/core/lib/constants";
import {
  editorItemSchema,
  normalizeCustomSnippetValue,
  projectFileSchema,
  sanitizeText,
} from "@rehab-grid/core/lib/schemas";
import {
  type CustomSnippetRecord,
  type EditorItem,
  type ExerciseCardRecord,
  type ImageRecord,
  type ProjectFile,
  type ProjectRecord,
  type ProjectSummary,
  type UserTemplateRecord,
} from "@rehab-grid/core/types";
import Dexie, { type EntityTable } from "dexie";
import { nanoid } from "nanoid";

/**
 * RehabGrid データベースクラス
 *
 * @remarks
 * Dexie を継承し、指導箋（projects）・画像（images）と、
 * マイライブラリ（userTemplates / exerciseCards / customSnippets）のテーブルを定義
 */
class RehabGridDB extends Dexie {
  projects!: EntityTable<ProjectRecord, "id">;
  images!: EntityTable<ImageRecord, "id">;
  userTemplates!: EntityTable<UserTemplateRecord, "id">;
  exerciseCards!: EntityTable<ExerciseCardRecord, "id">;
  customSnippets!: EntityTable<CustomSnippetRecord, "id">;

  constructor() {
    super("RehabGridDB");

    // 旧バージョンの DB から更新できるよう、version(1) の宣言は残す
    this.version(1).stores({
      projects: "id, title, updatedAt",
      images: "id, createdAt",
    });

    // テーブルを足すだけなので upgrade() でのデータ移行は不要
    this.version(2).stores({
      projects: "id, title, updatedAt",
      images: "id, createdAt",
      userTemplates: "id, name, updatedAt",
      exerciseCards: "id, title, updatedAt",
      customSnippets: "id, createdAt",
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
  const sourceTitle = source.meta.title.trim() || DEFAULT_PROJECT_TITLE;
  const baseTitle = sourceTitle.slice(
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
 * 指導箋・マイテンプレート・マイ運動のカードが参照している画像IDを集める
 *
 * @remarks
 * 画像ライブラリから画像を削除する前に、他の場所で使われているかを確かめるために使う。
 * 編集中のプロジェクトは保存前の変更がストアにしかないため、呼び出し側で除外して別に判定する。
 *
 * @param excludeProjectId - 対象から除くプロジェクトID（編集中のプロジェクト）
 * @returns 参照されている画像IDの集合（サンプル画像のIDも含む）
 */
export async function collectReferencedImageIds(
  excludeProjectId?: string
): Promise<Set<string>> {
  const [projects, templates, cards] = await Promise.all([
    db.projects.toArray(),
    db.userTemplates.toArray(),
    db.exerciseCards.toArray(),
  ]);
  const items: EditorItem[] = [
    ...projects
      .filter((record) => record.id !== excludeProjectId)
      .flatMap((record) => record.data.items),
    ...templates.flatMap((record) => record.data.items),
    ...cards.map((record) => record.item),
  ];

  const ids = new Set<string>();
  for (const item of items) {
    if (item.imageSource !== "") ids.add(item.imageSource);
  }
  return ids;
}

/**
 * マイテンプレートとして保存する
 *
 * @remarks
 * 将来の書き出し・読み込みに備え、インポートと同じスキーマで検証してから保存する。
 * 名前が空ならプロジェクトの既定のタイトルにする。
 *
 * @param name - テンプレート名
 * @param data - 保存する指導箋の内容
 * @returns 保存したテンプレートのID
 * @throws 内容がスキーマに合わないとき
 */
export async function saveUserTemplate(
  name: string,
  data: ProjectFile
): Promise<string> {
  const result = projectFileSchema.safeParse(data);
  if (!result.success) throw new Error(LIBRARY_SAVE_FAILED_MESSAGE);

  const id = nanoid();
  const normalizedName = sanitizeText(name)
    .trim()
    .slice(0, TEXT_LIMITS.projectTitle);
  await db.userTemplates.put({
    id,
    name: normalizedName || DEFAULT_PROJECT_TITLE,
    data: result.data,
    updatedAt: new Date(),
  });
  return id;
}

/**
 * マイテンプレートの一覧を取得（更新日時の新しい順）
 *
 * @returns マイテンプレート
 */
export async function listUserTemplates(): Promise<UserTemplateRecord[]> {
  const records = await db.userTemplates.toArray();
  return records.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

/**
 * マイテンプレートを取得
 *
 * @param id - テンプレートID
 * @returns マイテンプレート、存在しない場合は undefined
 */
export async function getUserTemplate(
  id: string
): Promise<UserTemplateRecord | undefined> {
  return db.userTemplates.get(id);
}

/**
 * マイテンプレートを削除
 *
 * @remarks
 * 取り込み画像は画像ライブラリの資産として残す
 *
 * @param id - 削除するテンプレートID
 */
export async function deleteUserTemplate(id: string): Promise<void> {
  await db.userTemplates.delete(id);
}

/**
 * カードをマイ運動として保存する
 *
 * @remarks
 * インポートと同じスキーマで検証してから保存する。
 * 呼び出し時に ID と並び順を振り直すため、order は 0 にそろえる。
 *
 * @param item - 保存するカード
 * @returns 保存したマイ運動のID
 * @throws 内容がスキーマに合わないとき
 */
export async function saveExerciseCard(item: EditorItem): Promise<string> {
  const result = editorItemSchema.safeParse(item);
  if (!result.success) throw new Error(LIBRARY_SAVE_FAILED_MESSAGE);

  const id = nanoid();
  await db.exerciseCards.put({
    id,
    title: result.data.title,
    item: { ...result.data, order: 0 },
    updatedAt: new Date(),
  });
  return id;
}

/**
 * マイ運動の一覧を取得（更新日時の新しい順）
 *
 * @returns マイ運動
 */
export async function listExerciseCards(): Promise<ExerciseCardRecord[]> {
  const records = await db.exerciseCards.toArray();
  return records.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

/**
 * マイ運動を削除
 *
 * @param id - 削除するマイ運動のID
 */
export async function deleteExerciseCard(id: string): Promise<void> {
  await db.exerciseCards.delete(id);
}

/**
 * マイ定型文を登録する
 *
 * @remarks
 * HTML タグと前後の空白を除き、注意点の文字数上限で切り詰める。
 * 正規化後に空文字になる場合は保存せずエラーにする。
 * 組み込みの定型文・登録済みの定型文との重複は呼び出し側で確かめる。
 *
 * @param value - 定型文の内容
 * @returns 登録したマイ定型文
 * @throws 正規化後に文字が残らないとき
 */
export async function addCustomSnippet(
  value: string
): Promise<CustomSnippetRecord> {
  const normalized = normalizeCustomSnippetValue(value);
  if (normalized === "") throw new Error(LIBRARY_SAVE_FAILED_MESSAGE);

  const record: CustomSnippetRecord = {
    id: nanoid(),
    value: normalized,
    createdAt: new Date(),
  };
  await db.customSnippets.put(record);
  return record;
}

/**
 * マイ定型文の一覧を取得（登録した順）
 *
 * @returns マイ定型文
 */
export async function listCustomSnippets(): Promise<CustomSnippetRecord[]> {
  const records = await db.customSnippets.toArray();
  return records.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

/**
 * マイ定型文を削除
 *
 * @param id - 削除するマイ定型文のID
 */
export async function deleteCustomSnippet(id: string): Promise<void> {
  await db.customSnippets.delete(id);
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
