/**
 * backupManifestSchema（一括バックアップマニフェスト）のユニットテスト
 */
import {
  DEFAULT_PROJECT_TITLE,
  MAX_BACKUP_RECORD_COUNT,
  TEXT_LIMITS,
} from "@rehab-grid/core/lib/constants";
import {
  BACKUP_FORMAT,
  BACKUP_SCHEMA_VERSION,
  backupManifestSchema,
} from "@rehab-grid/core/lib/schemas";
import { describe, expect, it } from "vitest";

/** 最小限の有効な ProjectFile */
function createValidProjectData() {
  return {
    meta: {
      version: "1.3.3",
      createdAt: "2026-11-26T00:00:00.000Z",
      updatedAt: "2026-11-26T00:00:00.000Z",
      title: "腰痛体操",
      projectType: "training" as const,
    },
    settings: {
      layoutType: "grid2" as const,
      themeColor: "#3b82f6",
    },
    items: [],
  };
}

/** 最小限の有効な BackupManifest 入力 */
function createValidManifest(overrides: Record<string, unknown> = {}) {
  return {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    appVersion: "1.3.3",
    exportedAt: "2026-11-26T10:00:00.000Z",
    projects: [],
    userTemplates: [],
    exerciseCards: [],
    customSnippets: [],
    images: [],
    ...overrides,
  };
}

describe("backupManifestSchema", () => {
  it("有効なマニフェストをパースできる", () => {
    const input = createValidManifest({
      projects: [
        {
          id: "p1",
          updatedAt: "2026-11-26T09:00:00.000Z",
          data: createValidProjectData(),
        },
      ],
      userTemplates: [
        {
          id: "t1",
          name: "基本セット",
          updatedAt: "2026-11-26T09:00:00.000Z",
          data: createValidProjectData(),
        },
      ],
      exerciseCards: [
        {
          id: "c1",
          updatedAt: "2026-11-26T09:00:00.000Z",
          item: {
            id: "item-1",
            order: 0,
            title: "スクワット",
            imageSource: "images/img_001.webp",
            description: "ゆっくり行う",
          },
        },
      ],
      customSnippets: [
        {
          id: "s1",
          value: "食後30分は避ける",
          createdAt: "2026-11-26T09:00:00.000Z",
        },
      ],
      images: [
        {
          path: "images/img_001.webp",
          fileName: "スクワット解説",
          createdAt: "2026-11-26T09:00:00.000Z",
        },
      ],
    });

    const result = backupManifestSchema.safeParse(input);

    expect(result.success).toBeTruthy();
    if (!result.success) return;
    expect(result.data.projects).toHaveLength(1);
    expect(result.data.userTemplates[0]?.name).toBe("基本セット");
    expect(result.data.exerciseCards[0]?.item.title).toBe("スクワット");
    expect(result.data.customSnippets[0]?.value).toBe("食後30分は避ける");
    expect(result.data.images[0]?.fileName).toBe("スクワット解説");
  });

  it("配列フィールドが省略されても空配列として補完する", () => {
    const result = backupManifestSchema.safeParse({
      format: BACKUP_FORMAT,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      appVersion: "1.3.3",
      exportedAt: "2026-11-26T10:00:00.000Z",
    });

    expect(result.success).toBeTruthy();
    if (!result.success) return;
    expect(result.data.projects).toEqual([]);
    expect(result.data.userTemplates).toEqual([]);
    expect(result.data.exerciseCards).toEqual([]);
    expect(result.data.customSnippets).toEqual([]);
    expect(result.data.images).toEqual([]);
  });

  it("format や schemaVersion が不正なら拒否する", () => {
    expect(
      backupManifestSchema.safeParse(
        createValidManifest({ format: "unknown-format" })
      ).success
    ).toBeFalsy();
    expect(
      backupManifestSchema.safeParse(createValidManifest({ schemaVersion: 2 }))
        .success
    ).toBeFalsy();
  });

  it("パストラバーサルを含む画像パスを拒否する", () => {
    const withTraversal = createValidManifest({
      images: [
        {
          path: "images/../secret.webp",
          createdAt: "2026-11-26T09:00:00.000Z",
        },
      ],
    });
    const withNestedPath = createValidManifest({
      images: [
        {
          path: "images/sub/img_001.webp",
          createdAt: "2026-11-26T09:00:00.000Z",
        },
      ],
    });

    expect(backupManifestSchema.safeParse(withTraversal).success).toBeFalsy();
    expect(backupManifestSchema.safeParse(withNestedPath).success).toBeFalsy();
  });

  it("XSS を含むテキストをサニタイズし、空になった定型文を除外する", () => {
    const input = createValidManifest({
      userTemplates: [
        {
          id: "t1",
          name: "<script>alert(1)</script>   ",
          updatedAt: "invalid-date",
          data: createValidProjectData(),
        },
      ],
      customSnippets: [
        {
          id: "s1",
          value: "<b>ゆっくり</b>行う",
          createdAt: "2026-11-26T09:00:00.000Z",
        },
        {
          id: "s2",
          value: "<script>alert(1)</script>",
          createdAt: "2026-11-26T09:00:00.000Z",
        },
      ],
      images: [
        {
          path: "images/img_001.webp",
          fileName: "<img>画像名",
          createdAt: "2026-11-26T09:00:00.000Z",
        },
      ],
    });

    const result = backupManifestSchema.safeParse(input);
    expect(result.success).toBeTruthy();
    if (!result.success) return;

    expect(result.data.userTemplates[0]?.name).toBe(DEFAULT_PROJECT_TITLE);
    // 不正な日付は現在時刻 ISO 文字列にフォールバック
    expect(
      Number.isNaN(
        new Date(result.data.userTemplates[0]?.updatedAt ?? "").getTime()
      )
    ).toBeFalsy();
    expect(result.data.customSnippets).toHaveLength(1);
    expect(result.data.customSnippets[0]?.value).toBe("ゆっくり行う");
    expect(result.data.images[0]?.fileName).toBe("画像名");
  });

  it("テンプレート名の文字数上限とレコード最大件数をカットする", () => {
    const manySnippets = Array.from(
      { length: MAX_BACKUP_RECORD_COUNT + 10 },
      (_, i) => ({
        id: `s-${String(i)}`,
        value: `定型文${String(i)}`,
        createdAt: "2026-11-26T09:00:00.000Z",
      })
    );

    const input = createValidManifest({
      userTemplates: [
        {
          id: "t1",
          name: "あ".repeat(TEXT_LIMITS.projectTitle + 10),
          updatedAt: "2026-11-26T09:00:00.000Z",
          data: createValidProjectData(),
        },
      ],
      customSnippets: manySnippets,
    });

    const result = backupManifestSchema.safeParse(input);
    expect(result.success).toBeTruthy();
    if (!result.success) return;

    expect(result.data.userTemplates[0]?.name).toHaveLength(
      TEXT_LIMITS.projectTitle
    );
    expect(result.data.customSnippets).toHaveLength(MAX_BACKUP_RECORD_COUNT);
  });
});
