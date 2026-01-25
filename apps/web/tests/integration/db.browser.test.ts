/**
 * Dexie(IndexedDB) 結合テスト（Browser Mode）
 *
 * @remarks
 * 既存のユニットテスト（Dexieモック）とは住み分けし、
 * 実際の IndexedDB に読み書きできること（Round-trip）を検証する。
 */

import { APP_VERSION, CURRENT_PROJECT_ID } from "@rehab-grid/core/lib/constants";
import {
  db,
  deleteImage,
  deleteProject,
  getImage,
  getImages,
  loadProject,
  saveImage,
  saveProject,
} from "@rehab-grid/core/lib/db";
import type { ProjectFile } from "@rehab-grid/core/types";
import { beforeEach, describe, expect, it } from "vitest";

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

describe.sequential("lib/db（実IndexedDB）", () => {
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

    await saveProject(project);

    const loaded = await loadProject();
    expect(loaded).toBeDefined();
    expect(loaded?.meta.title).toBe("テストプロジェクト");
    expect(loaded?.meta.updatedAt).not.toBe(beforeUpdatedAt);

    // updatedAt が ISO文字列として妥当（例外が出ない）であること
    expect(() => new Date(String(loaded?.meta.updatedAt))).not.toThrow();
  });

  it("deleteProject で現在のプロジェクトが削除される", async () => {
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

    await saveProject(project);
    expect(await loadProject()).toBeDefined();

    await deleteProject();
    expect(await loadProject()).toBeUndefined();

    // 実DB上も消えていること（直接確認）
    const raw = await db.projects.get(CURRENT_PROJECT_ID);
    expect(raw).toBeUndefined();
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
});
