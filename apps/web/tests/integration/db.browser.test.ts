/**
 * Dexie(IndexedDB) 結合テスト（Browser Mode）
 *
 * @remarks
 * 既存のユニットテスト（Dexieモック）とは住み分けし、
 * 実際の IndexedDB に読み書きできること（Round-trip）を検証する。
 */

import {
  APP_VERSION,
  LEGACY_PROJECT_ID,
  PROJECT_COPY_SUFFIX,
} from "@rehab-grid/core/lib/constants";
import {
  addCustomSnippet,
  collectReferencedImageIds,
  db,
  deleteExerciseCard,
  deleteImage,
  deleteProject,
  deleteUserTemplate,
  duplicateProject,
  getImage,
  getImages,
  getUserTemplate,
  listCustomSnippets,
  listExerciseCards,
  listProjects,
  listUserTemplates,
  loadProject,
  saveExerciseCard,
  saveImage,
  saveProject,
  saveUserTemplate,
} from "@rehab-grid/core/lib/db";
import type {
  ImageRecord,
  ProjectFile,
  ProjectRecord,
} from "@rehab-grid/core/types";
import { beforeEach, describe, expect, it } from "vitest";

/**
 * 旧バージョン（Dexie の version 1 = IndexedDB の version 10）の DB を作り、データを 1 件ずつ入れる
 *
 * @remarks
 * apps/web は dexie に直接依存しないため、IndexedDB の API で作る
 */
async function createLegacyDb(records: {
  project: ProjectRecord;
  image: ImageRecord;
}): Promise<void> {
  const request = indexedDB.open("RehabGridDB", 10);
  request.onupgradeneeded = () => {
    const legacy = request.result;
    const projects = legacy.createObjectStore("projects", { keyPath: "id" });
    projects.createIndex("title", "title");
    projects.createIndex("updatedAt", "updatedAt");
    const images = legacy.createObjectStore("images", { keyPath: "id" });
    images.createIndex("createdAt", "createdAt");
  };
  const legacy = await new Promise<IDBDatabase>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error(String(request.error)));
  });
  const tx = legacy.transaction(["projects", "images"], "readwrite");
  tx.objectStore("projects").put(records.project);
  tx.objectStore("images").put(records.image);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new Error(String(tx.error)));
  });
  legacy.close();
}

/**
 * DBを空状態にリセットする
 *
 * @remarks
 * `db` はモジュール単位のシングルトンなので、テスト間の独立性を担保するために毎回削除する。
 */
async function resetDb(): Promise<void> {
  db.close();
  await db.delete();
  await db.open();
}

/**
 * テスト用のプロジェクトを作る
 */
function createProject(title: string, imageSources: string[] = []): ProjectFile {
  return {
    meta: {
      version: APP_VERSION,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      title,
      projectType: "training",
    },
    settings: {
      layoutType: "grid2",
      themeColor: "#3b82f6",
    },
    items: imageSources.map((imageSource, index) => ({
      id: `item-${String(index)}`,
      order: index,
      title: "運動",
      imageSource,
      description: "",
    })),
  };
}

describe("lib/db（実IndexedDB）", { concurrent: false }, () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("saveProject → loadProject で保存したプロジェクトが復元でき、updatedAt が更新される", async () => {
    const beforeUpdatedAt = "2024-01-01T00:00:00.000Z";
    const project: ProjectFile = {
      meta: {
        version: APP_VERSION,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: beforeUpdatedAt,
        title: "テストプロジェクト",
        projectType: "training",
      },
      settings: {
        layoutType: "grid2",
        themeColor: "#3b82f6",
      },
      items: [],
    };

    await saveProject("project-1", project);

    const loaded = await loadProject("project-1");
    expect(loaded).toBeDefined();
    expect(loaded?.meta.title).toBe("テストプロジェクト");
    expect(loaded?.meta.updatedAt).not.toBe(beforeUpdatedAt);

    // updatedAt が ISO文字列として妥当（例外が出ない）であること
    expect(() => new Date(String(loaded?.meta.updatedAt))).not.toThrow();
  });

  it("deleteProject で指定したプロジェクトだけが削除される", async () => {
    const project: ProjectFile = {
      meta: {
        version: APP_VERSION,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        title: "削除テスト",
        projectType: "training",
      },
      settings: {
        layoutType: "grid2",
        themeColor: "#3b82f6",
      },
      items: [],
    };

    await saveProject("project-1", project);
    await saveProject("project-2", createProject("残すプロジェクト"));
    expect(await loadProject("project-1")).toBeDefined();

    await deleteProject("project-1");
    expect(await loadProject("project-1")).toBeUndefined();

    // 実DB上も消えていること（直接確認）。他のプロジェクトは残る
    const raw = await db.projects.get("project-1");
    expect(raw).toBeUndefined();
    expect(await loadProject("project-2")).toBeDefined();
  });

  it("旧バージョンの current のレコードが一覧の 1 件目として見つかり、そのまま読み込める", async () => {
    // 旧バージョンの saveProject が書いていた形のレコードを直接入れる
    const legacy = createProject("旧バージョンの指導箋", ["sample_lying_01"]);
    await db.projects.put({
      id: LEGACY_PROJECT_ID,
      title: legacy.meta.title,
      data: legacy,
      updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    });

    const [first] = await listProjects();
    expect(first?.id).toBe("current");
    expect(first?.title).toBe("旧バージョンの指導箋");
    expect(first?.cardCount).toBe(1);
    expect(await loadProject(LEGACY_PROJECT_ID)).toEqual(legacy);
  });

  it("listProjects は更新日時の新しい順に並ぶ", async () => {
    await saveProject("project-old", createProject("古い"));
    await new Promise((resolve) => setTimeout(resolve, 5));
    await saveProject("project-new", createProject("新しい"));

    const list = await listProjects();
    expect(list.map((project) => project.id)).toEqual([
      "project-new",
      "project-old",
    ]);
  });

  it("duplicateProject で別IDのコピーが保存され、元のプロジェクトは残る", async () => {
    await saveProject("project-1", createProject("腰痛体操", ["img-1"]));

    const newId = await duplicateProject("project-1");

    expect(newId).toBeDefined();
    const copy = await loadProject(newId ?? "");
    expect(copy?.meta.title).toBe(`腰痛体操${PROJECT_COPY_SUFFIX}`);
    expect(copy?.items[0]?.imageSource).toBe("img-1");
    expect(await loadProject("project-1")).toBeDefined();
    expect(await listProjects()).toHaveLength(2);
  });

  it("collectReferencedImageIds は指定プロジェクトを除いた参照画像IDを返す", async () => {
    await saveProject("project-1", createProject("A", ["img-1", "img-2"]));
    await saveProject("project-2", createProject("B", ["img-2", "img-3"]));

    expect(await collectReferencedImageIds("project-1")).toEqual(
      new Set(["img-2", "img-3"])
    );
  });

  it("saveImage → getImage で保存したBlobが復元できる", async () => {
    const id = "img-roundtrip-1";
    const blob = new Blob(["画像データ"], { type: "image/png" });

    await saveImage(id, blob);

    const got = await getImage(id);
    expect(got).toBeDefined();
    expect(got?.type).toBe("image/png");
    await expect(got?.text()).resolves.toBe("画像データ");
  });

  it("getImage: 存在しないIDは undefined を返す", async () => {
    const got = await getImage("non-existent");
    expect(got).toBeUndefined();
  });

  it("getImages: 複数IDをMapで返し、一部欠損は undefined になる", async () => {
    const id1 = "img-1";
    const idMissing = "img-missing";
    const blob1 = new Blob(["A"], { type: "image/webp" });

    await saveImage(id1, blob1);

    const map = await getImages([id1, idMissing]);
    expect(map.size).toBe(2);

    const got1 = map.get(id1);
    expect(got1).toBeDefined();
    await expect(got1?.text()).resolves.toBe("A");

    expect(map.get(idMissing)).toBeUndefined();
  });

  it("getImages: 空配列は空Mapを返す", async () => {
    const map = await getImages([]);
    expect(map.size).toBe(0);
  });

  it("deleteImage で画像が削除される", async () => {
    const id = "img-to-delete";
    const blob = new Blob(["Z"], { type: "image/png" });

    await saveImage(id, blob);
    expect(await getImage(id)).toBeDefined();

    await deleteImage(id);
    expect(await getImage(id)).toBeUndefined();
  });

  it("version 1 の DB から更新しても、既存の指導箋・画像が残り、マイライブラリのテーブルが使える", async () => {
    // 旧バージョン（Dexie の version 1）のアプリが作った DB を再現する
    db.close();
    await db.delete();
    await createLegacyDb({
      project: {
        id: LEGACY_PROJECT_ID,
        title: "旧データ",
        data: createProject("旧データ", ["img-legacy"]),
        updatedAt: new Date("2024-01-01T00:00:00.000Z"),
      },
      image: { id: "img-legacy", blob: new Blob(["L"]), createdAt: new Date() },
    });

    // 現行の DB（version 2）として開き直す
    await db.open();

    expect((await loadProject(LEGACY_PROJECT_ID))?.meta.title).toBe("旧データ");
    await expect((await getImage("img-legacy"))?.text()).resolves.toBe("L");
    await addCustomSnippet("息を止めない");
    expect((await listCustomSnippets()).map((s) => s.value)).toEqual([
      "息を止めない",
    ]);
  });

  it("マイテンプレート: 保存 → 一覧 → 取得 → 削除ができる", async () => {
    const id = await saveUserTemplate("膝の自主トレ", createProject("元の指導箋", ["img-1"]));

    const [listed] = await listUserTemplates();
    expect(listed?.name).toBe("膝の自主トレ");
    expect((await getUserTemplate(id))?.data.items[0]?.imageSource).toBe("img-1");

    await deleteUserTemplate(id);
    expect(await listUserTemplates()).toEqual([]);
  });

  it("マイ運動: 保存 → 一覧 → 削除ができる", async () => {
    const [item] = createProject("指導箋", ["img-1"]).items;
    if (item === undefined) throw new Error("テストデータのカードがありません");

    const id = await saveExerciseCard({ ...item, order: 4 });

    const [listed] = await listExerciseCards();
    expect(listed).toMatchObject({ id, title: item.title, item: { order: 0 } });

    await deleteExerciseCard(id);
    expect(await listExerciseCards()).toEqual([]);
  });

  it("collectReferencedImageIds: マイテンプレート・マイ運動が参照する画像も集める", async () => {
    await saveProject("editing", createProject("編集中", ["img-editing"]));
    await saveUserTemplate("テンプレート", createProject("テンプレート", ["img-template"]));
    const [cardItem] = createProject("カード", ["img-card"]).items;
    if (cardItem === undefined) throw new Error("テストデータのカードがありません");
    await saveExerciseCard(cardItem);

    expect(await collectReferencedImageIds("editing")).toEqual(
      new Set(["img-template", "img-card"])
    );
  });
});
