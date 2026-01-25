import {
  MAX_ITEM_COUNT,
  MAX_PRECAUTIONS_COUNT,
  TEXT_LIMITS,
} from "@rehab-grid/core/lib/constants";
import {
  dosagesSchema,
  editorItemSchema,
  layoutTypeSchema,
  precautionSchema,
  projectFileSchema,
  projectMetaSchema,
  projectSettingsSchema,
} from "@rehab-grid/core/lib/schemas/project";
import { describe, expect, it } from "vitest";

/**
 * 有効な dosages オブジェクトを生成
 */
function createValidDosages() {
  return {
    reps: "10回",
    sets: "3セット",
    frequency: "1日2回",
  };
}

/**
 * 有効な precaution オブジェクトを生成
 */
function createValidPrecaution(
  overrides: { id?: string; value?: string } = {}
) {
  return {
    id: "precaution-1",
    value: "痛みが出たら中止",
    ...overrides,
  };
}

/**
 * EditorItem のベースプロパティ型
 */
type EditorItemBase = {
  id: string;
  order: number;
  title: string;
  imageSource: string;
  description: string;
};

/**
 * 有効な editorItem オブジェクトを生成
 */
function createValidEditorItem(
  overrides: Partial<EditorItemBase> = {}
): EditorItemBase {
  return {
    id: "item-1",
    order: 0,
    title: "スクワット",
    imageSource: "",
    description: "膝を90度に曲げて立ち上がる",
    ...overrides,
  };
}

/**
 * 有効な projectMeta オブジェクトを生成
 */
function createValidProjectMeta() {
  return {
    version: "1.0.0",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    title: "テストプロジェクト",
    projectType: "training" as const,
  };
}

/**
 * 有効な projectSettings オブジェクトを生成
 */
function createValidProjectSettings() {
  return {
    layoutType: "grid2" as const,
    themeColor: "#3b82f6",
  };
}

/**
 * 有効な projectFile オブジェクトを生成
 */
function createValidProjectFile() {
  return {
    meta: createValidProjectMeta(),
    settings: createValidProjectSettings(),
    items: [createValidEditorItem()],
  };
}

/**
 * 指定した長さの文字列を生成
 */
function generateString(length: number): string {
  return "あ".repeat(length);
}

describe("lib/schemas/project", () => {
  describe("dosagesSchema", () => {
    it("有効なデータでパース成功する", () => {
      const data = createValidDosages();
      const result = dosagesSchema.safeParse(data);

      expect(result.success).toBeTruthy();
      expect(result.data).toEqual(data);
    });

    it("空文字列でもパース成功する", () => {
      const data = { reps: "", sets: "", frequency: "" };
      const result = dosagesSchema.safeParse(data);

      expect(result.success).toBeTruthy();
      expect(result.data).toEqual(data);
    });

    it("TEXT_LIMITS.reps を超える文字列が自動カットされる", () => {
      const longString = generateString(TEXT_LIMITS.reps + 10);
      const data = { ...createValidDosages(), reps: longString };
      const result = dosagesSchema.safeParse(data);

      expect(result.success).toBeTruthy();
      expect(result.data?.reps).toHaveLength(TEXT_LIMITS.reps);
    });

    it("TEXT_LIMITS.sets を超える文字列が自動カットされる", () => {
      const longString = generateString(TEXT_LIMITS.sets + 10);
      const data = { ...createValidDosages(), sets: longString };
      const result = dosagesSchema.safeParse(data);

      expect(result.success).toBeTruthy();
      expect(result.data?.sets).toHaveLength(TEXT_LIMITS.sets);
    });

    it("TEXT_LIMITS.frequency を超える文字列が自動カットされる", () => {
      const longString = generateString(TEXT_LIMITS.frequency + 10);
      const data = { ...createValidDosages(), frequency: longString };
      const result = dosagesSchema.safeParse(data);

      expect(result.success).toBeTruthy();
      expect(result.data?.frequency).toHaveLength(TEXT_LIMITS.frequency);
    });

    it("reps が欠落しているとエラー", () => {
      const data = { sets: "3セット", frequency: "1日2回" };
      const result = dosagesSchema.safeParse(data);

      expect(result.success).toBeFalsy();
    });

    it("sets が欠落しているとエラー", () => {
      const data = { reps: "10回", frequency: "1日2回" };
      const result = dosagesSchema.safeParse(data);

      expect(result.success).toBeFalsy();
    });

    it("frequency が欠落しているとエラー", () => {
      const data = { reps: "10回", sets: "3セット" };
      const result = dosagesSchema.safeParse(data);

      expect(result.success).toBeFalsy();
    });
  });

  describe("precautionSchema", () => {
    it("有効なデータでパース成功する", () => {
      const data = createValidPrecaution();
      const result = precautionSchema.safeParse(data);

      expect(result.success).toBeTruthy();
      expect(result.data).toEqual(data);
    });

    it("TEXT_LIMITS.precaution を超える文字列が自動カットされる", () => {
      const longValue = generateString(TEXT_LIMITS.precaution + 20);
      const data = createValidPrecaution({ value: longValue });
      const result = precautionSchema.safeParse(data);

      expect(result.success).toBeTruthy();
      expect(result.data?.value).toHaveLength(TEXT_LIMITS.precaution);
    });

    it("id が欠落しているとエラー", () => {
      const result = precautionSchema.safeParse({ value: "痛みが出たら中止" });

      expect(result.success).toBeFalsy();
    });

    it("value が欠落しているとエラー", () => {
      const result = precautionSchema.safeParse({ id: "precaution-1" });

      expect(result.success).toBeFalsy();
    });
  });

  describe("layoutTypeSchema", () => {
    it.each(["grid1", "grid2", "grid3", "grid4"] as const)(
      "有効な値 '%s' でパース成功する",
      (layoutType) => {
        const result = layoutTypeSchema.safeParse(layoutType);

        expect(result.success).toBeTruthy();
        expect(result.data).toBe(layoutType);
      }
    );

    it("無効な値でエラー", () => {
      const result = layoutTypeSchema.safeParse("invalid");

      expect(result.success).toBeFalsy();
    });

    it("旧値 'list' は無効な値としてエラー", () => {
      const result = layoutTypeSchema.safeParse("list");

      expect(result.success).toBeFalsy();
    });

    it("空文字列でエラー", () => {
      const result = layoutTypeSchema.safeParse("");

      expect(result.success).toBeFalsy();
    });
  });

  describe("editorItemSchema", () => {
    it("完全なデータでパース成功する", () => {
      const data = {
        ...createValidEditorItem(),
        dosages: createValidDosages(),
        precautions: [createValidPrecaution()],
      };
      const result = editorItemSchema.safeParse(data);

      expect(result.success).toBeTruthy();
    });

    it("dosages なしでパース成功する", () => {
      const data = createValidEditorItem();
      const result = editorItemSchema.safeParse(data);

      expect(result.success).toBeTruthy();
      expect(result.data?.dosages).toBeUndefined();
    });

    it("precautions なしでパース成功する", () => {
      const data = createValidEditorItem();
      const result = editorItemSchema.safeParse(data);

      expect(result.success).toBeTruthy();
      expect(result.data?.precautions).toBeUndefined();
    });

    it("空の precautions 配列でパース成功する", () => {
      const data = { ...createValidEditorItem(), precautions: [] };
      const result = editorItemSchema.safeParse(data);

      expect(result.success).toBeTruthy();
      expect(result.data?.precautions).toEqual([]);
    });

    it("TEXT_LIMITS.title を超える文字列が自動カットされる", () => {
      const longTitle = generateString(TEXT_LIMITS.title + 10);
      const data = createValidEditorItem({ title: longTitle });
      const result = editorItemSchema.safeParse(data);

      expect(result.success).toBeTruthy();
      expect(result.data?.title).toHaveLength(TEXT_LIMITS.title);
    });

    it("TEXT_LIMITS.description を超える文字列が自動カットされる", () => {
      const longDescription = generateString(TEXT_LIMITS.description + 50);
      const data = createValidEditorItem({ description: longDescription });
      const result = editorItemSchema.safeParse(data);

      expect(result.success).toBeTruthy();
      expect(result.data?.description).toHaveLength(TEXT_LIMITS.description);
    });

    it("id が欠落しているとエラー", () => {
      const { id: _, ...data } = createValidEditorItem();
      const result = editorItemSchema.safeParse(data);

      expect(result.success).toBeFalsy();
    });

    it("order が欠落しているとエラー", () => {
      const { order: _, ...data } = createValidEditorItem();
      const result = editorItemSchema.safeParse(data);

      expect(result.success).toBeFalsy();
    });

    it("order が数値以外でエラー", () => {
      const data = createValidEditorItem({ order: "0" as unknown as number });
      const result = editorItemSchema.safeParse(data);

      expect(result.success).toBeFalsy();
    });

    it("MAX_PRECAUTIONS_COUNT を超える注意点が自動カットされる", () => {
      const manyPrecautions = Array.from(
        { length: MAX_PRECAUTIONS_COUNT + 3 },
        (_, i) => createValidPrecaution({ id: `precaution-${i}` })
      );
      const data = {
        ...createValidEditorItem(),
        precautions: manyPrecautions,
      };
      const result = editorItemSchema.safeParse(data);

      expect(result.success).toBeTruthy();
      expect(result.data?.precautions).toHaveLength(MAX_PRECAUTIONS_COUNT);
    });
  });

  describe("projectMetaSchema", () => {
    it("完全なデータでパース成功する", () => {
      const data = { ...createValidProjectMeta(), author: "テスト作成者" };
      const result = projectMetaSchema.safeParse(data);

      expect(result.success).toBeTruthy();
      expect(result.data?.author).toBe("テスト作成者");
    });

    it("author なしでパース成功する（オプショナル）", () => {
      const data = createValidProjectMeta();
      const result = projectMetaSchema.safeParse(data);

      expect(result.success).toBeTruthy();
      expect(result.data?.author).toBeUndefined();
    });

    it("projectType が 'training' でパース成功する", () => {
      const data = createValidProjectMeta();
      const result = projectMetaSchema.safeParse(data);

      expect(result.success).toBeTruthy();
      expect(result.data?.projectType).toBe("training");
    });

    it("projectType が 'training' 以外でエラー（literal型）", () => {
      const data = { ...createValidProjectMeta(), projectType: "other" };
      const result = projectMetaSchema.safeParse(data);

      expect(result.success).toBeFalsy();
    });

    it("version が欠落しているとエラー", () => {
      const { version: _, ...data } = createValidProjectMeta();
      const result = projectMetaSchema.safeParse(data);

      expect(result.success).toBeFalsy();
    });

    it("createdAt が欠落しているとエラー", () => {
      const { createdAt: _, ...data } = createValidProjectMeta();
      const result = projectMetaSchema.safeParse(data);

      expect(result.success).toBeFalsy();
    });

    it("updatedAt が欠落しているとエラー", () => {
      const { updatedAt: _, ...data } = createValidProjectMeta();
      const result = projectMetaSchema.safeParse(data);

      expect(result.success).toBeFalsy();
    });

    it("title が欠落しているとエラー", () => {
      const { title: _, ...data } = createValidProjectMeta();
      const result = projectMetaSchema.safeParse(data);

      expect(result.success).toBeFalsy();
    });

    it("TEXT_LIMITS.projectTitle を超える文字列が自動カットされる", () => {
      const longTitle = generateString(TEXT_LIMITS.projectTitle + 10);
      const data = { ...createValidProjectMeta(), title: longTitle };
      const result = projectMetaSchema.safeParse(data);

      expect(result.success).toBeTruthy();
      expect(result.data?.title).toHaveLength(TEXT_LIMITS.projectTitle);
    });
  });

  describe("projectSettingsSchema", () => {
    it("有効なデータでパース成功する", () => {
      const data = createValidProjectSettings();
      const result = projectSettingsSchema.safeParse(data);

      expect(result.success).toBeTruthy();
      expect(result.data).toEqual(data);
    });

    it.each(["grid1", "grid2", "grid3", "grid4"] as const)(
      "layoutType '%s' でパース成功する",
      (layoutType) => {
        const data = { ...createValidProjectSettings(), layoutType };
        const result = projectSettingsSchema.safeParse(data);

        expect(result.success).toBeTruthy();
        expect(result.data?.layoutType).toBe(layoutType);
      }
    );

    it("layoutType が無効な値でエラー", () => {
      const data = { ...createValidProjectSettings(), layoutType: "invalid" };
      const result = projectSettingsSchema.safeParse(data);

      expect(result.success).toBeFalsy();
    });

    it("themeColor が欠落しているとエラー", () => {
      const { themeColor: _, ...data } = createValidProjectSettings();
      const result = projectSettingsSchema.safeParse(data);

      expect(result.success).toBeFalsy();
    });

    it("layoutType が欠落しているとエラー", () => {
      const { layoutType: _, ...data } = createValidProjectSettings();
      const result = projectSettingsSchema.safeParse(data);

      expect(result.success).toBeFalsy();
    });

    it("themeColor からHTMLタグが除去される", () => {
      const data = {
        ...createValidProjectSettings(),
        themeColor: "<script>alert('xss')</script>#3b82f6",
      };
      const result = projectSettingsSchema.safeParse(data);

      expect(result.success).toBeTruthy();
      expect(result.data?.themeColor).toBe("#3b82f6");
      expect(result.data?.themeColor).not.toContain("<script>");
    });
  });

  describe("projectFileSchema", () => {
    it("完全なプロジェクトデータでパース成功する", () => {
      const data = createValidProjectFile();
      const result = projectFileSchema.safeParse(data);

      expect(result.success).toBeTruthy();
    });

    it("items が空配列でもパース成功する", () => {
      const data = { ...createValidProjectFile(), items: [] };
      const result = projectFileSchema.safeParse(data);

      expect(result.success).toBeTruthy();
      expect(result.data?.items).toEqual([]);
    });

    it("複数アイテムでパース成功する", () => {
      const data = {
        ...createValidProjectFile(),
        items: [
          createValidEditorItem({ id: "item-1", order: 0 }),
          createValidEditorItem({ id: "item-2", order: 1 }),
          createValidEditorItem({ id: "item-3", order: 2 }),
        ],
      };
      const result = projectFileSchema.safeParse(data);

      expect(result.success).toBeTruthy();
      expect(result.data?.items).toHaveLength(3);
    });

    it("ネストしたスキーマの文字数制限が適用される", () => {
      const longTitle = generateString(TEXT_LIMITS.title + 10);
      const longReps = generateString(TEXT_LIMITS.reps + 10);
      const longPrecaution = generateString(TEXT_LIMITS.precaution + 10);

      const data = {
        ...createValidProjectFile(),
        items: [
          {
            ...createValidEditorItem({ title: longTitle }),
            dosages: { ...createValidDosages(), reps: longReps },
            precautions: [{ id: "p1", value: longPrecaution }],
          },
        ],
      };
      const result = projectFileSchema.safeParse(data);

      expect(result.success).toBeTruthy();

      // 最初のアイテムを取得して検証
      const firstItem = result.data?.items[0];
      expect(firstItem).toBeDefined();
      expect(firstItem?.title).toHaveLength(TEXT_LIMITS.title);
      expect(firstItem?.dosages?.reps).toHaveLength(TEXT_LIMITS.reps);
      expect(firstItem?.precautions?.[0]?.value).toHaveLength(
        TEXT_LIMITS.precaution
      );
    });

    it("meta が欠落しているとエラー", () => {
      const { meta: _, ...data } = createValidProjectFile();
      const result = projectFileSchema.safeParse(data);

      expect(result.success).toBeFalsy();
    });

    it("settings が欠落しているとエラー", () => {
      const { settings: _, ...data } = createValidProjectFile();
      const result = projectFileSchema.safeParse(data);

      expect(result.success).toBeFalsy();
    });

    it("items が欠落しているとエラー", () => {
      const { items: _, ...data } = createValidProjectFile();
      const result = projectFileSchema.safeParse(data);

      expect(result.success).toBeFalsy();
    });

    it("meta の projectType が不正だとエラー", () => {
      const data = {
        ...createValidProjectFile(),
        meta: { ...createValidProjectMeta(), projectType: "invalid" },
      };
      const result = projectFileSchema.safeParse(data);

      expect(result.success).toBeFalsy();
    });

    it("settings の layoutType が不正だとエラー", () => {
      const data = {
        ...createValidProjectFile(),
        settings: { ...createValidProjectSettings(), layoutType: "invalid" },
      };
      const result = projectFileSchema.safeParse(data);

      expect(result.success).toBeFalsy();
    });

    it("MAX_ITEM_COUNT を超えるアイテムが自動カットされる", () => {
      const manyItems = Array.from({ length: MAX_ITEM_COUNT + 5 }, (_, i) =>
        createValidEditorItem({ id: `item-${i}`, order: i })
      );
      const data = {
        ...createValidProjectFile(),
        items: manyItems,
      };
      const result = projectFileSchema.safeParse(data);

      expect(result.success).toBeTruthy();
      expect(result.data?.items).toHaveLength(MAX_ITEM_COUNT);
    });
  });

  describe("XSSサニタイズ", () => {
    it("editorItemSchema の title からHTMLタグが除去される", () => {
      const data = createValidEditorItem({
        title: "<script>alert('xss')</script>スクワット",
      });
      const result = editorItemSchema.safeParse(data);

      expect(result.success).toBeTruthy();
      expect(result.data?.title).toBe("スクワット");
      expect(result.data?.title).not.toContain("<script>");
    });

    it("editorItemSchema の description からHTMLタグが除去される", () => {
      const data = createValidEditorItem({
        description: '<img onerror="alert(1)">膝を曲げる',
      });
      const result = editorItemSchema.safeParse(data);

      expect(result.success).toBeTruthy();
      expect(result.data?.description).toBe("膝を曲げる");
      expect(result.data?.description).not.toContain("onerror");
    });

    it("dosagesSchema の各フィールドからHTMLタグが除去される", () => {
      const data = {
        reps: "<b>10回</b>",
        sets: "<i>3セット</i>",
        frequency: "<a href='#'>1日2回</a>",
      };
      const result = dosagesSchema.safeParse(data);

      expect(result.success).toBeTruthy();
      expect(result.data?.reps).toBe("10回");
      expect(result.data?.sets).toBe("3セット");
      expect(result.data?.frequency).toBe("1日2回");
    });

    it("scriptタグとその内容は完全に除去される", () => {
      // DOMPurifyはscriptタグ内のコンテンツも除去する（XSS対策）
      const data = createValidEditorItem({
        title: "<script>悪意のあるコード</script>タイトル",
      });
      const result = editorItemSchema.safeParse(data);

      expect(result.success).toBeTruthy();
      expect(result.data?.title).toBe("タイトル");
      expect(result.data?.title).not.toContain("悪意のあるコード");
    });

    it("precautionSchema の value からHTMLタグが除去される", () => {
      const data = createValidPrecaution({
        value: "<style>body{}</style>痛みが出たら中止",
      });
      const result = precautionSchema.safeParse(data);

      expect(result.success).toBeTruthy();
      expect(result.data?.value).toBe("痛みが出たら中止");
      expect(result.data?.value).not.toContain("style");
    });

    it("projectMetaSchema の title からHTMLタグが除去される", () => {
      const data = {
        ...createValidProjectMeta(),
        title: "<script>xss</script>プロジェクト",
      };
      const result = projectMetaSchema.safeParse(data);

      expect(result.success).toBeTruthy();
      expect(result.data?.title).toBe("プロジェクト");
    });

    it("projectMetaSchema の author からHTMLタグが除去される", () => {
      const data = {
        ...createValidProjectMeta(),
        author: "<b>作成者</b>",
      };
      const result = projectMetaSchema.safeParse(data);

      expect(result.success).toBeTruthy();
      expect(result.data?.author).toBe("作成者");
    });

    it("サニタイズ後に文字数制限が適用される", () => {
      // HTMLタグを含む長い文字列（タグ除去後にTEXT_LIMITS.titleを超える）
      const longTitle = "<b>" + generateString(TEXT_LIMITS.title + 10) + "</b>";
      const data = createValidEditorItem({ title: longTitle });
      const result = editorItemSchema.safeParse(data);

      expect(result.success).toBeTruthy();
      expect(result.data?.title).toHaveLength(TEXT_LIMITS.title);
      expect(result.data?.title).not.toContain("<b>");
    });

    it("projectFileSchema でネストしたフィールドもサニタイズされる", () => {
      const data = {
        ...createValidProjectFile(),
        meta: {
          ...createValidProjectMeta(),
          title: "<script>xss</script>テスト",
        },
        items: [
          {
            ...createValidEditorItem({
              title: "<b>運動</b>",
              description: "<script>alert(1)</script>手順",
            }),
            dosages: {
              reps: "<i>10回</i>",
              sets: "<u>3セット</u>",
              frequency: "1日",
            },
            precautions: [{ id: "p1", value: "<span>注意</span>" }],
          },
        ],
      };
      const result = projectFileSchema.safeParse(data);

      expect(result.success).toBeTruthy();
      expect(result.data?.meta.title).toBe("テスト");
      expect(result.data?.items[0]?.title).toBe("運動");
      expect(result.data?.items[0]?.description).toBe("手順");
      expect(result.data?.items[0]?.dosages?.reps).toBe("10回");
      expect(result.data?.items[0]?.dosages?.sets).toBe("3セット");
      expect(result.data?.items[0]?.precautions?.[0]?.value).toBe("注意");
    });
  });
});
