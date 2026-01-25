/**
 * ZIPエクスポート 結合テスト（Browser Mode）
 *
 * @remarks
 * IndexedDB（Dexie）に保存した画像Blobを `getImages` で取得し、
 * `exportToZIP` が ZIP（project.json + images/）を正しく生成することを検証する。
 */

import { APP_VERSION } from "@rehab-grid/core/lib/constants";
import { db, getImages, saveImage } from "@rehab-grid/core/lib/db";
import type { ProjectFile } from "@rehab-grid/core/types";
import { exportToZIP } from "@rehab-grid/core/utils/export";
import JSZip from "jszip";
import { beforeEach, describe, expect, it } from "vitest";

async function resetDb(): Promise<void> {
  db.close();
  await db.delete();
  await db.open();
}

describe.sequential("utils/exportToZIP（IndexedDB画像と整合）", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("保存済み画像はZIPに同梱され、project.jsonのimageSourceが相対パスへ変換される（欠損画像は空文字）", async () => {
    const savedImageId = "img-saved";
    const missingImageId = "img-missing";

    const savedBlob = new Blob(["PNG_DATA"], { type: "image/png" });
    await saveImage(savedImageId, savedBlob);

    const project: ProjectFile = {
      meta: {
        version: APP_VERSION,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        title: "ZIPテスト",
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
          title: "運動1",
          imageSource: savedImageId,
          description: "",
        },
        {
          id: "item-2",
          order: 1,
          title: "運動2",
          imageSource: missingImageId,
          description: "",
        },
      ],
    };

    const images = await getImages([savedImageId, missingImageId]);
    const zipBlob = await exportToZIP(project, images);

    const zip = await JSZip.loadAsync(zipBlob);

    // project.json が存在する
    const projectJsonFile = zip.file("project.json");
    expect(projectJsonFile).toBeTruthy();

    const projectJsonText = await projectJsonFile!.async("text");
    const exported = JSON.parse(projectJsonText) as ProjectFile;

    // imageSource が相対パスへ変換される（保存済みのみ）
    expect(exported.items[0]?.imageSource).toBe("images/img_001.png");
    expect(exported.items[1]?.imageSource).toBe("");

    // ZIPに画像ファイルが含まれる
    const imageFile = zip.file("images/img_001.png");
    expect(imageFile).toBeTruthy();

    const imageText = await imageFile!.async("text");
    expect(imageText).toBe("PNG_DATA");

    // 欠損画像はZIPに含まれない
    expect(zip.file("images/img_002.png")).toBeNull();
  });
});
