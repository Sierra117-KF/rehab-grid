/**
 * backup.ts のユニットテスト
 *
 * 一括バックアップ ZIP の生成・検証・自動判別・DB 復元ロジックを検証
 */
import {
  APP_VERSION,
  BACKUP_CATEGORY_CUSTOM_SNIPPETS_LABEL,
  BACKUP_ERROR_NO_BACKUP,
  BACKUP_ERROR_UNSUPPORTED_VERSION,
  createBackupImageLimitExceededMessage,
  createBackupRecordLimitExceededMessage,
  IMPORT_ERROR_CORRUPTED_ZIP,
  IMPORT_ERROR_EXTRACTED_TOO_LARGE,
  IMPORT_ERROR_FILE_TOO_LARGE,
  IMPORT_ERROR_INVALID_FORMAT,
  IMPORT_ERROR_NO_PROJECT,
  IMPORT_ERROR_TOO_MANY_IMAGES,
  IMPORT_ERROR_VALIDATION,
  MAX_BACKUP_EXTRACTED_SIZE,
  MAX_BACKUP_IMAGE_COUNT,
  MAX_BACKUP_RECORD_COUNT,
  MAX_BACKUP_ZIP_SIZE,
  PRECAUTION_SNIPPETS,
} from "@rehab-grid/core/lib/constants";
import { BACKUP_FORMAT, BACKUP_SCHEMA_VERSION } from "@rehab-grid/core/lib/schemas";
import {
  type BackupManifest,
  type CustomSnippetRecord,
  type ExerciseCardRecord,
  type ImageRecord,
  type ProjectFile,
  type ProjectRecord,
  type UserTemplateRecord,
} from "@rehab-grid/core/types";
import JSZip from "jszip";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// モック設定
// ============================================================================

const {
  mockFlushAutosave,
  mockProjectsToArray,
  mockProjectsClear,
  mockProjectsBulkPut,
  mockImagesToArray,
  mockImagesClear,
  mockImagesBulkPut,
  mockTemplatesToArray,
  mockTemplatesClear,
  mockTemplatesBulkPut,
  mockCardsToArray,
  mockCardsClear,
  mockCardsBulkPut,
  mockSnippetsToArray,
  mockSnippetsClear,
  mockSnippetsBulkPut,
  mockTransaction,
} = vi.hoisted(() => ({
  mockFlushAutosave: vi.fn().mockResolvedValue(undefined),
  mockProjectsToArray: vi.fn().mockResolvedValue([]),
  mockProjectsClear: vi.fn().mockResolvedValue(undefined),
  mockProjectsBulkPut: vi.fn().mockResolvedValue(undefined),
  mockImagesToArray: vi.fn().mockResolvedValue([]),
  mockImagesClear: vi.fn().mockResolvedValue(undefined),
  mockImagesBulkPut: vi.fn().mockResolvedValue(undefined),
  mockTemplatesToArray: vi.fn().mockResolvedValue([]),
  mockTemplatesClear: vi.fn().mockResolvedValue(undefined),
  mockTemplatesBulkPut: vi.fn().mockResolvedValue(undefined),
  mockCardsToArray: vi.fn().mockResolvedValue([]),
  mockCardsClear: vi.fn().mockResolvedValue(undefined),
  mockCardsBulkPut: vi.fn().mockResolvedValue(undefined),
  mockSnippetsToArray: vi.fn().mockResolvedValue([]),
  mockSnippetsClear: vi.fn().mockResolvedValue(undefined),
  mockSnippetsBulkPut: vi.fn().mockResolvedValue(undefined),
  mockTransaction: vi.fn(
    async (_mode: string, _tables: unknown[], cb: () => Promise<void>) => {
      await cb();
    }
  ),
}));

vi.mock("@/lib/store/autosaveFlusher", () => ({
  flushRegisteredAutosave: mockFlushAutosave,
}));

vi.mock("@/lib/db", () => ({
  db: {
    projects: {
      toArray: mockProjectsToArray,
      clear: mockProjectsClear,
      bulkPut: mockProjectsBulkPut,
    },
    images: {
      toArray: mockImagesToArray,
      clear: mockImagesClear,
      bulkPut: mockImagesBulkPut,
    },
    userTemplates: {
      toArray: mockTemplatesToArray,
      clear: mockTemplatesClear,
      bulkPut: mockTemplatesBulkPut,
    },
    exerciseCards: {
      toArray: mockCardsToArray,
      clear: mockCardsClear,
      bulkPut: mockCardsBulkPut,
    },
    customSnippets: {
      toArray: mockSnippetsToArray,
      clear: mockSnippetsClear,
      bulkPut: mockSnippetsBulkPut,
    },
    transaction: mockTransaction,
  },
  getImages: vi.fn().mockResolvedValue(new Map()),
  createProjectRecord: vi.fn((id: string, data: unknown) => ({ id, data })),
}));

import {
  BACKUP_MANIFEST_FILENAME,
  type BackupSourceData,
  collectCurrentBackupCounts,
  createBackupZIP,
  createInitialBackupSelection,
  inspectImportFile,
  parseBackupZIP,
} from "@rehab-grid/core/utils/backup";
import {
  ALL_BACKUP_CATEGORIES_SELECTED,
  applyBackupToDB,
} from "@rehab-grid/core/utils/project";

// ============================================================================
// テストヘルパー
// ============================================================================

/** 有効な PNG マジックバイトを持つダミーバイト列を生成 */
function createPngBytes(label: string): Uint8Array<ArrayBuffer> {
  const header = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const body = Array.from(new TextEncoder().encode(label));
  return new Uint8Array([...header, ...body]);
}

/** jsdom で Blob.slice().arrayBuffer() が動く PNG Blob を生成 */
function createPngBlob(label: string): Blob {
  const bytes = createPngBytes(label);
  const blob = new Blob([bytes], { type: "image/png" });
  const originalSlice = blob.slice.bind(blob);
  Object.defineProperty(blob, "slice", {
    value: (start?: number, end?: number, contentType?: string) => {
      const sliced = originalSlice(start, end, contentType);
      Object.defineProperty(sliced, "arrayBuffer", {
        value: async () =>
          Promise.resolve(bytes.slice(start ?? 0, end ?? bytes.length).buffer),
      });
      return sliced;
    },
  });
  return blob;
}

/** Blob の slice().arrayBuffer() を jsdom 向けに補う */
function createZipFileFromBytes(
  name: string,
  bytes: Uint8Array<ArrayBuffer>,
  type = "application/zip"
): File {
  const file = new File([bytes], name, { type });
  const originalSlice = file.slice.bind(file);
  Object.defineProperty(file, "slice", {
    value: (start?: number, end?: number, contentType?: string) => {
      const sliced = originalSlice(start, end, contentType);
      Object.defineProperty(sliced, "arrayBuffer", {
        value: async () =>
          Promise.resolve(bytes.slice(start ?? 0, end ?? bytes.length).buffer),
      });
      return sliced;
    },
  });
  return file;
}

/** テスト用の ProjectFile を生成 */
function createProjectFile(
  title: string,
  imageSource = ""
): ProjectFile {
  return {
    meta: {
      version: APP_VERSION,
      createdAt: "2026-11-20T00:00:00.000Z",
      updatedAt: "2026-11-25T00:00:00.000Z",
      title,
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
        imageSource,
        description: "ゆっくり行う",
        precautions: [{ id: "prec-1", value: "痛みがあれば中止" }],
      },
    ],
  };
}

/** テスト用の全テーブルデータを生成 */
function createFullSourceData(): BackupSourceData {
  const sharedImageId = "img-shared";
  const unusedImageId = "img-unused";

  const projects: ProjectRecord[] = [
    {
      id: "proj-1",
      title: "腰痛指導箋",
      data: createProjectFile("腰痛指導箋", sharedImageId),
      updatedAt: new Date("2026-11-25T10:00:00.000Z"),
    },
    {
      id: "proj-2",
      title: "サンプル利用指導箋",
      data: createProjectFile("サンプル利用指導箋", "sample_lying_01"),
      updatedAt: new Date("2026-11-26T10:00:00.000Z"),
    },
  ];
  const userTemplates: UserTemplateRecord[] = [
    {
      id: "tpl-1",
      name: "基本テンプレート",
      data: createProjectFile("基本テンプレート", sharedImageId),
      updatedAt: new Date("2026-11-24T10:00:00.000Z"),
    },
  ];
  const exerciseCards: ExerciseCardRecord[] = [
    {
      id: "card-1",
      title: "マイスクワット",
      item: {
        id: "card-item-1",
        order: 0,
        title: "マイスクワット",
        imageSource: sharedImageId,
        description: "膝に注意",
      },
      updatedAt: new Date("2026-11-23T10:00:00.000Z"),
    },
  ];
  const customSnippets: CustomSnippetRecord[] = [
    {
      id: "snip-1",
      value: "食後30分は避ける",
      createdAt: new Date("2026-11-22T10:00:00.000Z"),
    },
  ];
  const images: ImageRecord[] = [
    {
      id: sharedImageId,
      blob: createPngBlob("SHARED"),
      createdAt: new Date("2026-11-20T10:00:00.000Z"),
      fileName: "共有画像",
    },
    {
      id: unusedImageId,
      blob: createPngBlob("UNUSED"),
      createdAt: new Date("2026-11-21T10:00:00.000Z"),
      fileName: "未使用画像",
    },
  ];

  return { projects, userTemplates, exerciseCards, customSnippets, images };
}

/** jsdom で JSZip 生成 Blob を File 化（内部 ArrayBuffer を取り出す） */
async function zipBlobToFile(blob: Blob, name = "backup.zip"): Promise<File> {
  const zip = await JSZip.loadAsync(blob);
  const buffer = await zip.generateAsync({ type: "uint8array" });
  return createZipFileFromBytes(name, buffer as Uint8Array<ArrayBuffer>);
}

// ============================================================================
// テストケース
// ============================================================================

describe("backup.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProjectsToArray.mockResolvedValue([]);
    mockTemplatesToArray.mockResolvedValue([]);
    mockCardsToArray.mockResolvedValue([]);
    mockSnippetsToArray.mockResolvedValue([]);
    mockImagesToArray.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("collectCurrentBackupCounts", () => {
    it("オートセーブを確定した上で各カテゴリと未使用画像の件数を返す", async () => {
      const source = createFullSourceData();
      mockProjectsToArray.mockResolvedValue(source.projects);
      mockTemplatesToArray.mockResolvedValue(source.userTemplates);
      mockCardsToArray.mockResolvedValue(source.exerciseCards);
      mockSnippetsToArray.mockResolvedValue(source.customSnippets);
      mockImagesToArray.mockResolvedValue(source.images);

      const counts = await collectCurrentBackupCounts();

      expect(mockFlushAutosave).toHaveBeenCalledTimes(1);
      expect(counts).toEqual({
        projects: 2,
        userTemplates: 1,
        exerciseCards: 1,
        customSnippets: 1,
        unusedImages: 1,
        totalImages: 2,
      });
    });

    it("createInitialBackupSelection は件数が1件以上のカテゴリのみ true にする", () => {
      expect(
        createInitialBackupSelection({
          projects: 2,
          userTemplates: 0,
          exerciseCards: 3,
          customSnippets: 0,
          unusedImages: 1,
          totalImages: 2,
        })
      ).toEqual({
        projects: true,
        userTemplates: false,
        exerciseCards: true,
        customSnippets: false,
        unusedImages: true,
      });
    });
  });

  describe("createBackupZIP", () => {
    it("全カテゴリを書き出し、共有画像を重複排除し、サンプル画像はIDのまま保持する", async () => {
      const source = createFullSourceData();
      const blob = await createBackupZIP(
        source,
        ALL_BACKUP_CATEGORIES_SELECTED
      );

      const zip = await JSZip.loadAsync(blob);
      const manifestText = await zip
        .file(BACKUP_MANIFEST_FILENAME)
        ?.async("string");
      expect(manifestText).toBeDefined();

      const manifest = JSON.parse(manifestText!) as BackupManifest;
      expect(manifest.format).toBe(BACKUP_FORMAT);
      expect(manifest.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
      expect(manifest.projects).toHaveLength(2);
      expect(manifest.userTemplates).toHaveLength(1);
      expect(manifest.exerciseCards).toHaveLength(1);
      expect(manifest.customSnippets).toHaveLength(1);

      // 共有画像は 1 回だけ格納され、未使用画像と合わせて 2 ファイル
      expect(manifest.images).toHaveLength(2);
      expect(manifest.images[0]?.fileName).toBe("共有画像");
      expect(manifest.images[1]?.fileName).toBe("未使用画像");

      // 複数箇所から参照されていた共有画像が同じ ZIP パスに統一されている
      const sharedPath = manifest.projects[0]?.data.items[0]?.imageSource;
      expect(sharedPath).toBe("images/img_001.png");
      expect(manifest.userTemplates[0]?.data.items[0]?.imageSource).toBe(
        sharedPath
      );
      expect(manifest.exerciseCards[0]?.item.imageSource).toBe(sharedPath);

      // サンプル画像は ZIP に実体を含めず ID を維持する
      expect(manifest.projects[1]?.data.items[0]?.imageSource).toBe(
        "sample_lying_01"
      );
    });

    it("マイ運動・マイ定型文のみ選択（未使用画像OFF）すると、不要データと未使用画像は含まれない", async () => {
      const source = createFullSourceData();
      const blob = await createBackupZIP(source, {
        projects: false,
        userTemplates: false,
        exerciseCards: true,
        customSnippets: true,
        unusedImages: false,
      });

      const zip = await JSZip.loadAsync(blob);
      const manifest = JSON.parse(
        (await zip.file(BACKUP_MANIFEST_FILENAME)?.async("string")) ?? "{}"
      ) as BackupManifest;

      expect(manifest.projects).toHaveLength(0);
      expect(manifest.userTemplates).toHaveLength(0);
      expect(manifest.exerciseCards).toHaveLength(1);
      expect(manifest.customSnippets).toHaveLength(1);
      // マイ運動が参照する共有画像 1 枚のみ格納（未使用画像は除外）
      expect(manifest.images).toHaveLength(1);
      expect(manifest.images[0]?.fileName).toBe("共有画像");
    });

    it("未知の sample_* ID は空文字に正規化される", async () => {
      const source = createFullSourceData();
      source.projects = [
        {
          id: "proj-unknown-sample",
          title: "未知サンプル",
          data: createProjectFile("未知サンプル", "sample_nonexistent_99"),
          updatedAt: new Date("2026-11-26T10:00:00.000Z"),
        },
      ];
      const blob = await createBackupZIP(source, {
        projects: true,
        userTemplates: false,
        exerciseCards: false,
        customSnippets: false,
        unusedImages: false,
      });

      const zip = await JSZip.loadAsync(blob);
      const manifest = JSON.parse(
        (await zip.file(BACKUP_MANIFEST_FILENAME)?.async("string")) ?? "{}"
      ) as BackupManifest;
      expect(manifest.projects[0]?.data.items[0]?.imageSource).toBe("");
    });

    it("書き出し時にレコード件数や画像枚数が上限を超えるとエラーを投げる", async () => {
      const tooManySnippets: CustomSnippetRecord[] = Array.from(
        { length: MAX_BACKUP_RECORD_COUNT + 1 },
        (_, i) => ({
          id: `s-${String(i)}`,
          value: `定型文${String(i)}`,
          createdAt: new Date("2026-11-26T00:00:00.000Z"),
        })
      );
      await expect(
        createBackupZIP(
          {
            projects: [],
            userTemplates: [],
            exerciseCards: [],
            customSnippets: tooManySnippets,
            images: [],
          },
          ALL_BACKUP_CATEGORIES_SELECTED
        )
      ).rejects.toThrow(
        createBackupRecordLimitExceededMessage(
          BACKUP_CATEGORY_CUSTOM_SNIPPETS_LABEL,
          MAX_BACKUP_RECORD_COUNT + 1,
          MAX_BACKUP_RECORD_COUNT
        )
      );

      const tooManyImages: ImageRecord[] = Array.from(
        { length: MAX_BACKUP_IMAGE_COUNT + 1 },
        (_, i) => ({
          id: `img-${String(i)}`,
          blob: createPngBlob(`IMG${String(i)}`),
          createdAt: new Date("2026-11-26T00:00:00.000Z"),
        })
      );
      await expect(
        createBackupZIP(
          {
            projects: [],
            userTemplates: [],
            exerciseCards: [],
            customSnippets: [],
            images: tooManyImages,
          },
          ALL_BACKUP_CATEGORIES_SELECTED
        )
      ).rejects.toThrow(
        createBackupImageLimitExceededMessage(
          MAX_BACKUP_IMAGE_COUNT + 1,
          MAX_BACKUP_IMAGE_COUNT
        )
      );
    });
  });

  describe("parseBackupZIP", () => {
    it("書き出したバックアップZIPを検証・パースでき、MIMEタイプと未使用画像を復元する", async () => {
      const source = createFullSourceData();
      const blob = await createBackupZIP(
        source,
        ALL_BACKUP_CATEGORIES_SELECTED
      );
      const file = await zipBlobToFile(blob, "rehab-grid-backup-2026-11-26.zip");

      const parsed = await parseBackupZIP(file);

      expect(parsed.counts).toEqual({
        projects: 2,
        userTemplates: 1,
        exerciseCards: 1,
        customSnippets: 1,
        unusedImages: 1,
        totalImages: 2,
      });
      expect(parsed.images.get("images/img_001.png")?.blob.type).toBe(
        "image/png"
      );
      expect(parsed.images.get("images/img_001.png")?.fileName).toBe("共有画像");
      expect(parsed.unusedImagePaths.has("images/img_002.png")).toBeTruthy();
    });

    it("ZIP 以外の形式・サイズ超過・破損 ZIP・backup.json 不在・未対応バージョンでエラーを投げる", async () => {
      // 不正形式
      const txtFile = createZipFileFromBytes(
        "notes.txt",
        new TextEncoder().encode("hello"),
        "text/plain"
      );
      await expect(parseBackupZIP(txtFile)).rejects.toThrow(
        IMPORT_ERROR_INVALID_FORMAT
      );

      // サイズ超過（size プロパティをモック）
      const oversized = createZipFileFromBytes(
        "big.zip",
        new Uint8Array([0x50, 0x4b, 0x03, 0x04])
      );
      Object.defineProperty(oversized, "size", {
        value: MAX_BACKUP_ZIP_SIZE + 1,
      });
      await expect(parseBackupZIP(oversized)).rejects.toThrow(
        IMPORT_ERROR_FILE_TOO_LARGE
      );

      // 破損 ZIP
      const corrupted = createZipFileFromBytes(
        "broken.zip",
        new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00])
      );
      await expect(parseBackupZIP(corrupted)).rejects.toThrow(
        IMPORT_ERROR_CORRUPTED_ZIP
      );

      // backup.json 不在
      const noBackupZip = new JSZip();
      noBackupZip.file("other.txt", "abc");
      const noBackupBytes = (await noBackupZip.generateAsync({
        type: "uint8array",
      })) as Uint8Array<ArrayBuffer>;
      await expect(
        parseBackupZIP(createZipFileFromBytes("no-backup.zip", noBackupBytes))
      ).rejects.toThrow(BACKUP_ERROR_NO_BACKUP);

      // 未対応バージョン
      const futureZip = new JSZip();
      futureZip.file(
        BACKUP_MANIFEST_FILENAME,
        JSON.stringify({
          format: BACKUP_FORMAT,
          schemaVersion: 99,
          appVersion: "9.0.0",
          exportedAt: "2030-01-01T00:00:00.000Z",
        })
      );
      const futureBytes = (await futureZip.generateAsync({
        type: "uint8array",
      })) as Uint8Array<ArrayBuffer>;
      await expect(
        parseBackupZIP(createZipFileFromBytes("future.zip", futureBytes))
      ).rejects.toThrow(BACKUP_ERROR_UNSUPPORTED_VERSION);

      // スキーマ不正
      const invalidZip = new JSZip();
      invalidZip.file(BACKUP_MANIFEST_FILENAME, JSON.stringify({ foo: "bar" }));
      const invalidBytes = (await invalidZip.generateAsync({
        type: "uint8array",
      })) as Uint8Array<ArrayBuffer>;
      await expect(
        parseBackupZIP(createZipFileFromBytes("invalid.zip", invalidBytes))
      ).rejects.toThrow(IMPORT_ERROR_VALIDATION);
    });

    it("レコード件数が上限を超える ZIP は切り捨てずにエラーを投げる", async () => {
      const zip = new JSZip();
      zip.file(
        BACKUP_MANIFEST_FILENAME,
        JSON.stringify({
          format: BACKUP_FORMAT,
          schemaVersion: BACKUP_SCHEMA_VERSION,
          appVersion: APP_VERSION,
          exportedAt: "2026-11-26T00:00:00.000Z",
          customSnippets: Array.from(
            { length: MAX_BACKUP_RECORD_COUNT + 1 },
            (_, i) => ({
              id: `s-${String(i)}`,
              value: `定型文${String(i)}`,
              createdAt: "2026-11-26T00:00:00.000Z",
            })
          ),
        })
      );
      const bytes = (await zip.generateAsync({
        type: "uint8array",
      })) as Uint8Array<ArrayBuffer>;

      await expect(
        parseBackupZIP(createZipFileFromBytes("too-many-records.zip", bytes))
      ).rejects.toThrow(
        createBackupRecordLimitExceededMessage(
          BACKUP_CATEGORY_CUSTOM_SNIPPETS_LABEL,
          MAX_BACKUP_RECORD_COUNT + 1,
          MAX_BACKUP_RECORD_COUNT
        )
      );
    });

    it("画像枚数が上限を超える ZIP は拒否する（ZIP爆弾対策）", async () => {
      const zip = new JSZip();
      zip.file(
        BACKUP_MANIFEST_FILENAME,
        JSON.stringify({
          format: BACKUP_FORMAT,
          schemaVersion: BACKUP_SCHEMA_VERSION,
          appVersion: APP_VERSION,
          exportedAt: "2026-11-26T00:00:00.000Z",
        })
      );
      const imagesFolder = zip.folder("images");
      for (let i = 0; i < MAX_BACKUP_IMAGE_COUNT + 1; i++) {
        imagesFolder?.file(`img_${String(i)}.png`, "x");
      }
      const bytes = (await zip.generateAsync({
        type: "uint8array",
      })) as Uint8Array<ArrayBuffer>;

      await expect(
        parseBackupZIP(createZipFileFromBytes("many-images.zip", bytes))
      ).rejects.toThrow(IMPORT_ERROR_TOO_MANY_IMAGES);
    });

    it("展開後サイズが上限を超える ZIP は拒否する（ZIP爆弾対策）", async () => {
      const zip = new JSZip();
      zip.file(
        BACKUP_MANIFEST_FILENAME,
        JSON.stringify({
          format: BACKUP_FORMAT,
          schemaVersion: BACKUP_SCHEMA_VERSION,
          appVersion: APP_VERSION,
          exportedAt: "2026-11-26T00:00:00.000Z",
          images: [
            {
              path: "images/img_001.png",
              createdAt: "2026-11-26T00:00:00.000Z",
            },
          ],
        })
      );
      zip.file("images/img_001.png", createPngBytes("SMALL"));
      const bytes = (await zip.generateAsync({
        type: "uint8array",
      })) as Uint8Array<ArrayBuffer>;

      // internalStream が上限超えチャンクを返す状況をモックする代わりに、
      // JSZip.loadAsync の戻り値エントリの internalStream を差し替えてテスト
      const realZip = await JSZip.loadAsync(bytes);
      const imageEntry = realZip.file("images/img_001.png");
      expect(imageEntry).not.toBeNull();
      Object.defineProperty(imageEntry!, "internalStream", {
        value: () => {
          const handlers: Record<string, (arg?: unknown) => void> = {};
          const helper = {
            on(event: string, cb: (arg?: unknown) => void) {
              handlers[event] = cb;
              return helper;
            },
            pause: vi.fn(),
            resume() {
              handlers.data?.(new Uint8Array(MAX_BACKUP_EXTRACTED_SIZE + 1));
              return helper;
            },
          };
          return helper;
        },
      });
      vi.spyOn(JSZip, "loadAsync").mockResolvedValueOnce(realZip);

      await expect(
        parseBackupZIP(createZipFileFromBytes("bomb.zip", bytes))
      ).rejects.toThrow(IMPORT_ERROR_EXTRACTED_TOO_LARGE);
    });
  });

  describe("inspectImportFile（自動判別）", () => {
    it("backup.json を含む ZIP は backup として判別する", async () => {
      const source = createFullSourceData();
      const blob = await createBackupZIP(
        source,
        ALL_BACKUP_CATEGORIES_SELECTED
      );
      const file = await zipBlobToFile(blob, "any-name.zip");

      const inspected = await inspectImportFile(file);

      expect(inspected.kind).toBe("backup");
      if (inspected.kind !== "backup") return;
      expect(inspected.backup.counts.projects).toBe(2);
    });

    it("project.json を含む ZIP は project として判別し、JSZip.loadAsync を1回だけ呼ぶ", async () => {
      const zip = new JSZip();
      zip.file("project.json", JSON.stringify(createProjectFile("単一指導箋")));
      const bytes = (await zip.generateAsync({
        type: "uint8array",
      })) as Uint8Array<ArrayBuffer>;
      const loadSpy = vi.spyOn(JSZip, "loadAsync");

      const inspected = await inspectImportFile(
        createZipFileFromBytes("single.zip", bytes)
      );

      expect(loadSpy).toHaveBeenCalledTimes(1);
      expect(inspected.kind).toBe("project");
      if (inspected.kind !== "project") return;
      expect(inspected.result.project.meta.title).toBe("単一指導箋");
    });

    it("project.json も backup.json もない ZIP はエラーを投げる", async () => {
      const zip = new JSZip();
      zip.file("readme.txt", "hello");
      const bytes = (await zip.generateAsync({
        type: "uint8array",
      })) as Uint8Array<ArrayBuffer>;

      await expect(
        inspectImportFile(createZipFileFromBytes("empty.zip", bytes))
      ).rejects.toThrow(IMPORT_ERROR_NO_PROJECT);
    });
  });

  describe("applyBackupToDB", () => {
    it("merge モードでは既存テーブルを消さず、選択カテゴリのみ新IDで追加し、重複定型文をスキップする", async () => {
      const source = createFullSourceData();
      // 組み込み定型文と既存登録済みの定型文を混ぜる
      const builtIn = PRECAUTION_SNIPPETS[0]?.value ?? "ゆっくり呼吸する";
      source.customSnippets = [
        { id: "s1", value: "新規定型文", createdAt: new Date("2026-11-20T00:00:00.000Z") },
        { id: "s2", value: "既存と同じ定型文", createdAt: new Date("2026-11-21T00:00:00.000Z") },
        { id: "s3", value: builtIn, createdAt: new Date("2026-11-22T00:00:00.000Z") },
      ];
      mockSnippetsToArray.mockResolvedValue([
        { id: "existing-s", value: "既存と同じ定型文", createdAt: new Date() },
      ]);

      const blob = await createBackupZIP(
        source,
        ALL_BACKUP_CATEGORIES_SELECTED
      );
      const parsed = await parseBackupZIP(await zipBlobToFile(blob));

      const { summary } = await applyBackupToDB(
        parsed,
        {
          projects: true,
          userTemplates: false,
          exerciseCards: true,
          customSnippets: true,
          unusedImages: false,
        },
        "merge"
      );

      // clear は呼ばれない
      expect(mockProjectsClear).not.toHaveBeenCalled();
      expect(mockImagesClear).not.toHaveBeenCalled();

      expect(summary).toEqual({
        projects: 2,
        userTemplates: 0,
        exerciseCards: 1,
        customSnippets: 1,
        skippedSnippets: 2,
        // 未使用画像は OFF なので、参照されている共有画像 1 枚のみ保存
        images: 1,
      });

      // 新しい ID が採番され、プロジェクトとマイ運動が同じ新画像 ID を共有する
      const savedImages = mockImagesBulkPut.mock.calls[0]?.[0] as ImageRecord[];
      const savedProjects = mockProjectsBulkPut.mock.calls[0]?.[0] as ProjectRecord[];
      const savedCards = mockCardsBulkPut.mock.calls[0]?.[0] as ExerciseCardRecord[];

      expect(savedImages).toHaveLength(1);
      expect(savedImages[0]?.fileName).toBe("共有画像");
      expect(savedProjects[0]?.id).not.toBe("proj-1");
      expect(savedProjects[0]?.data.items[0]?.imageSource).toBe(
        savedImages[0]?.id
      );
      expect(savedCards[0]?.item.imageSource).toBe(savedImages[0]?.id);
      // サンプル画像 ID はそのまま維持
      expect(savedProjects[1]?.data.items[0]?.imageSource).toBe(
        "sample_lying_01"
      );
    });

    it("replace モードでは全テーブルをクリアして全カテゴリを復元し、最新プロジェクトIDを返す", async () => {
      const source = createFullSourceData();
      const blob = await createBackupZIP(
        source,
        ALL_BACKUP_CATEGORIES_SELECTED
      );
      const parsed = await parseBackupZIP(await zipBlobToFile(blob));

      // selection が一部 false でも replace では全カテゴリが復元される
      const { summary, latestProjectId } = await applyBackupToDB(
        parsed,
        {
          projects: false,
          userTemplates: false,
          exerciseCards: false,
          customSnippets: false,
          unusedImages: false,
        },
        "replace"
      );

      expect(mockProjectsClear).toHaveBeenCalledTimes(1);
      expect(mockImagesClear).toHaveBeenCalledTimes(1);
      expect(mockTemplatesClear).toHaveBeenCalledTimes(1);
      expect(mockCardsClear).toHaveBeenCalledTimes(1);
      expect(mockSnippetsClear).toHaveBeenCalledTimes(1);

      expect(summary).toEqual({
        projects: 2,
        userTemplates: 1,
        exerciseCards: 1,
        customSnippets: 1,
        skippedSnippets: 0,
        images: 2,
      });

      // 更新日時が最も新しい proj-2（「サンプル利用指導箋」）に対応する新 ID が返る
      const savedProjects = mockProjectsBulkPut.mock.calls[0]?.[0] as ProjectRecord[];
      const latest = savedProjects.find(
        (p) => p.title === "サンプル利用指導箋"
      );
      expect(latestProjectId).toBe(latest?.id);
    });
  });
});
