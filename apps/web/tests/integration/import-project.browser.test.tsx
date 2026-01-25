/**
 * プロジェクトインポート 結合テスト（Browser Mode）
 *
 * @remarks
 * JSONファイル/ZIPファイルのインポート機能を実ブラウザ環境で検証する。
 * 実際のIndexedDB操作とストア更新を検証するため、Browser Modeを使用。
 *
 * - JSONインポート（画像なし）
 * - ZIPインポート（画像あり）
 * - バリデーションエラーのハンドリング
 * - インポート後のストア状態とDB状態
 */

import {
  APP_VERSION,
  IMPORT_ERROR_CORRUPTED_ZIP,
  IMPORT_ERROR_INVALID_FORMAT,
  IMPORT_ERROR_NO_PROJECT,
  IMPORT_ERROR_VALIDATION,
} from "@rehab-grid/core/lib/constants";
import { db, getImage, loadProject } from "@rehab-grid/core/lib/db";
import { useEditorStore } from "@rehab-grid/core/lib/store/useEditorStore";
import type { ProjectFile } from "@rehab-grid/core/types";
import { importProject } from "@rehab-grid/core/utils/export";
import { applyImportResult } from "@rehab-grid/core/utils/project";
import JSZip from "jszip";
import { beforeEach, describe, expect, it } from "vitest";

// ========== ヘルパー関数 ==========

/**
 * DBを空状態にリセットする
 */
async function resetDb(): Promise<void> {
  db.close();
  await db.delete();
  await db.open();
}

/**
 * エディタストアを初期状態にリセットする
 */
function resetStore(): void {
  useEditorStore.setState({
    isLoaded: true,
    meta: {
      version: APP_VERSION,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      title: "無題のプロジェクト",
      projectType: "training",
    },
    items: [],
    layoutType: "grid2",
    themeColor: "#3b82f6",
    selectedItemId: null,
    mobileImageLibraryOpen: false,
    mobilePropertyPanelOpen: false,
    mobileImageLibraryTargetItemId: null,
  });
}

/**
 * 有効なProjectFileオブジェクトを生成
 */
function createValidProject(
  overrides: Partial<ProjectFile> = {}
): ProjectFile {
  return {
    meta: {
      version: APP_VERSION,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      title: "インポートテスト",
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
        title: "スクワット",
        imageSource: "",
        description: "膝を曲げてしゃがむ運動",
      },
      {
        id: "item-2",
        order: 1,
        title: "腕立て伏せ",
        imageSource: "",
        description: "腕を曲げて体を上下させる運動",
      },
    ],
    ...overrides,
  };
}

/**
 * 有効なJSON Fileを生成
 */
function createValidJSONFile(
  overrides: Partial<ProjectFile> = {}
): File {
  const project = createValidProject(overrides);
  const jsonString = JSON.stringify(project, null, 2);
  return new File([jsonString], "test-project.json", {
    type: "application/json",
  });
}

/**
 * 有効なZIP Fileを生成（画像付き）
 */
async function createValidZIPFile(
  options: {
    project?: Partial<ProjectFile>;
    images?: { filename: string; data: Uint8Array }[];
  } = {}
): Promise<File> {
  const zip = new JSZip();

  // PNGマジックバイト + ダミーデータ
  const pngHeader = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);

  // デフォルト画像（PNGマジックバイト付き）
  const defaultImages = [
    {
      filename: "img_001.png",
      data: new Uint8Array([...pngHeader, ...new TextEncoder().encode("IMAGE1")]),
    },
    {
      filename: "img_002.png",
      data: new Uint8Array([...pngHeader, ...new TextEncoder().encode("IMAGE2")]),
    },
  ];
  const images = options.images ?? defaultImages;

  // デフォルトプロジェクト（画像参照あり）
  const defaultProject: ProjectFile = {
    meta: {
      version: APP_VERSION,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      title: "ZIPインポートテスト",
      projectType: "training",
    },
    settings: {
      layoutType: "grid3",
      themeColor: "#ef4444",
    },
    items: [
      {
        id: "item-1",
        order: 0,
        title: "運動A",
        imageSource: "images/img_001.png",
        description: "説明A",
      },
      {
        id: "item-2",
        order: 1,
        title: "運動B",
        imageSource: "images/img_002.png",
        description: "説明B",
      },
    ],
  };

  const project = { ...defaultProject, ...options.project };

  // project.json を追加
  zip.file("project.json", JSON.stringify(project, null, 2));

  // 画像を追加
  const imagesFolder = zip.folder("images");
  for (const img of images) {
    imagesFolder?.file(img.filename, img.data);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  return new File([blob], "test-project.zip", { type: "application/zip" });
}

/**
 * 破損したZIP Fileを生成
 */
function createCorruptedZIPFile(): File {
  return new File(["NOT_A_VALID_ZIP_FILE"], "corrupted.zip", {
    type: "application/zip",
  });
}

/**
 * project.jsonがないZIP Fileを生成
 */
async function createZIPWithoutProjectJSON(): Promise<File> {
  const zip = new JSZip();
  const imagesFolder = zip.folder("images");
  imagesFolder?.file("img_001.png", "DUMMY");
  const blob = await zip.generateAsync({ type: "blob" });
  return new File([blob], "no-project.zip", { type: "application/zip" });
}

// ========== テストケース ==========

describe.sequential("プロジェクトインポート（Browser Mode）", () => {
  beforeEach(async () => {
    await resetDb();
    resetStore();
  });

  describe("JSONファイルのインポート", () => {
    it("有効なJSONファイルをインポートすると、ImportResultが返される", async () => {
      const file = createValidJSONFile({
        meta: {
          version: APP_VERSION,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          title: "JSONインポートテスト",
          projectType: "training",
        },
        settings: {
          layoutType: "grid3",
          themeColor: "#22c55e",
        },
        items: [
          {
            id: "json-item-1",
            order: 0,
            title: "ストレッチ",
            imageSource: "",
            description: "体を伸ばす",
          },
        ],
      });

      const result = await importProject(file);

      expect(result.project.meta.title).toBe("JSONインポートテスト");
      expect(result.project.settings.layoutType).toBe("grid3");
      expect(result.project.items).toHaveLength(1);
      expect(result.project.items[0]?.title).toBe("ストレッチ");
      expect(result.images.size).toBe(0); // JSONでは画像なし
    });

    it("JSONインポートでは画像参照がクリアされる", async () => {
      const file = createValidJSONFile({
        items: [
          {
            id: "item-with-image",
            order: 0,
            title: "画像付きアイテム",
            imageSource: "some-image-id",
            description: "",
          },
        ],
      });

      const result = await importProject(file);

      expect(result.project.items[0]?.imageSource).toBe("");
    });

    it("applyImportResultでストアとDBが更新される", async () => {
      const file = createValidJSONFile({
        meta: {
          version: APP_VERSION,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          title: "ストア更新テスト",
          projectType: "training",
        },
      });

      const result = await importProject(file);
      const { initializeFromDB } = useEditorStore.getState();
      await applyImportResult(result, initializeFromDB);

      // ストア状態の検証
      const state = useEditorStore.getState();
      expect(state.meta.title).toBe("ストア更新テスト");
      expect(state.items).toHaveLength(2);

      // DB状態の検証
      const savedProject = await loadProject();
      expect(savedProject).toBeDefined();
      expect(savedProject?.meta.title).toBe("ストア更新テスト");
    });
  });

  describe("ZIPファイルのインポート", () => {
    it("有効なZIPファイルをインポートすると、画像Mapが返される", async () => {
      const file = await createValidZIPFile();

      const result = await importProject(file);

      expect(result.project.meta.title).toBe("ZIPインポートテスト");
      expect(result.project.settings.layoutType).toBe("grid3");
      expect(result.project.items).toHaveLength(2);
      expect(result.images.size).toBe(2);
    });

    it("ZIPインポートで画像IDが新しいIDに変換される", async () => {
      const file = await createValidZIPFile();

      const result = await importProject(file);

      // 元のパスではなく、nanoidで生成された新しいIDになっている
      const imageSource1 = result.project.items[0]?.imageSource ?? "";
      const imageSource2 = result.project.items[1]?.imageSource ?? "";

      expect(imageSource1).not.toBe("images/img_001.png");
      expect(imageSource2).not.toBe("images/img_002.png");
      expect(imageSource1).not.toBe("");
      expect(imageSource2).not.toBe("");

      // imagesマップに新しいIDがキーとして存在する
      expect(result.images.has(imageSource1)).toBeTruthy();
      expect(result.images.has(imageSource2)).toBeTruthy();
    });

    it("applyImportResultで画像がIndexedDBに保存される", async () => {
      const file = await createValidZIPFile();

      const result = await importProject(file);
      const { initializeFromDB } = useEditorStore.getState();
      await applyImportResult(result, initializeFromDB);

      // 画像がDBに保存されていることを確認
      const imageSource1 = result.project.items[0]?.imageSource ?? "";
      const imageSource2 = result.project.items[1]?.imageSource ?? "";

      const image1 = await getImage(imageSource1);
      const image2 = await getImage(imageSource2);

      expect(image1).toBeDefined();
      expect(image2).toBeDefined();
    });

    it("ZIPインポート後、ストア状態が正しく更新される", async () => {
      const file = await createValidZIPFile({
        project: {
          meta: {
            version: APP_VERSION,
            createdAt: "2024-01-01T00:00:00.000Z",
            updatedAt: "2024-01-01T00:00:00.000Z",
            title: "ZIPストア更新テスト",
            projectType: "training",
          },
          settings: {
            layoutType: "grid1",
            themeColor: "#8b5cf6",
          },
        },
      });

      const result = await importProject(file);
      const { initializeFromDB } = useEditorStore.getState();
      await applyImportResult(result, initializeFromDB);

      const state = useEditorStore.getState();
      expect(state.meta.title).toBe("ZIPストア更新テスト");
      expect(state.layoutType).toBe("grid1");
      expect(state.themeColor).toBe("#8b5cf6");
    });
  });

  describe("バリデーションエラーのハンドリング", () => {
    it("不正なJSON構造の場合、IMPORT_ERROR_VALIDATIONエラーがスローされる", async () => {
      const invalidJson = JSON.stringify({ invalid: "structure" });
      const file = new File([invalidJson], "invalid.json", {
        type: "application/json",
      });

      await expect(importProject(file)).rejects.toThrow(IMPORT_ERROR_VALIDATION);
    });

    it("JSONパースエラーの場合、IMPORT_ERROR_VALIDATIONエラーがスローされる", async () => {
      const file = new File(["{ invalid json "], "broken.json", {
        type: "application/json",
      });

      await expect(importProject(file)).rejects.toThrow(IMPORT_ERROR_VALIDATION);
    });

    it("破損したZIPファイルの場合、IMPORT_ERROR_CORRUPTED_ZIPエラーがスローされる", async () => {
      const file = createCorruptedZIPFile();

      await expect(importProject(file)).rejects.toThrow(
        IMPORT_ERROR_CORRUPTED_ZIP
      );
    });

    it("project.jsonがないZIPの場合、IMPORT_ERROR_NO_PROJECTエラーがスローされる", async () => {
      const file = await createZIPWithoutProjectJSON();

      await expect(importProject(file)).rejects.toThrow(IMPORT_ERROR_NO_PROJECT);
    });

    it("不正なファイル形式の場合、IMPORT_ERROR_INVALID_FORMATエラーがスローされる", async () => {
      const file = new File(["plain text content"], "document.txt", {
        type: "text/plain",
      });

      await expect(importProject(file)).rejects.toThrow(
        IMPORT_ERROR_INVALID_FORMAT
      );
    });

    it("必須フィールドが欠けたJSONの場合、バリデーションエラー", async () => {
      // metaが欠けている
      const invalidProject = {
        settings: { layoutType: "grid2", themeColor: "#000" },
        items: [],
      };
      const file = new File([JSON.stringify(invalidProject)], "partial.json", {
        type: "application/json",
      });

      await expect(importProject(file)).rejects.toThrow(IMPORT_ERROR_VALIDATION);
    });
  });

  describe("インポート後のデータ整合性", () => {
    it("複数アイテムの順序が保持される", async () => {
      const file = createValidJSONFile({
        items: [
          { id: "a", order: 0, title: "First", imageSource: "", description: "" },
          { id: "b", order: 1, title: "Second", imageSource: "", description: "" },
          { id: "c", order: 2, title: "Third", imageSource: "", description: "" },
        ],
      });

      const result = await importProject(file);
      const { initializeFromDB } = useEditorStore.getState();
      await applyImportResult(result, initializeFromDB);

      const state = useEditorStore.getState();
      expect(state.items[0]?.title).toBe("First");
      expect(state.items[1]?.title).toBe("Second");
      expect(state.items[2]?.title).toBe("Third");
    });

    it("dosages（回数・セット数）がインポートされる", async () => {
      const file = createValidJSONFile({
        items: [
          {
            id: "item-1",
            order: 0,
            title: "回数テスト",
            imageSource: "",
            description: "",
            dosages: {
              reps: "10回",
              sets: "3セット",
              frequency: "毎日",
            },
          },
        ],
      });

      const result = await importProject(file);

      expect(result.project.items[0]?.dosages?.reps).toBe("10回");
      expect(result.project.items[0]?.dosages?.sets).toBe("3セット");
      expect(result.project.items[0]?.dosages?.frequency).toBe("毎日");
    });

    it("precautions（注意点）がインポートされる", async () => {
      const file = createValidJSONFile({
        items: [
          {
            id: "item-1",
            order: 0,
            title: "注意点テスト",
            imageSource: "",
            description: "",
            precautions: [
              { id: "p1", value: "痛みが出たら中止" },
              { id: "p2", value: "呼吸を止めない" },
            ],
          },
        ],
      });

      const result = await importProject(file);

      expect(result.project.items[0]?.precautions).toHaveLength(2);
      expect(result.project.items[0]?.precautions?.[0]?.value).toBe(
        "痛みが出たら中止"
      );
    });

    it("インポートでサニタイズが適用される（XSS対策）", async () => {
      const file = createValidJSONFile({
        meta: {
          version: APP_VERSION,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          title: '<script>alert("XSS")</script>',
          projectType: "training",
        },
        items: [
          {
            id: "item-1",
            order: 0,
            title: '<img src="x" onerror="alert(1)">',
            imageSource: "",
            description: '<a href="javascript:void(0)">危険</a>',
          },
        ],
      });

      const result = await importProject(file);

      // スクリプトタグやイベントハンドラが除去されている
      expect(result.project.meta.title).not.toContain("<script>");
      expect(result.project.items[0]?.title).not.toContain("onerror");
    });
  });
});
