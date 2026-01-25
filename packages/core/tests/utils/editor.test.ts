import { type Dosages, type EditorItem, type LayoutType } from "@rehab-grid/core/types";
import { getDosageBadgeLayout, reorderEditorItems } from "@rehab-grid/core/utils/editor";
import { describe, expect, it } from "vitest";

/**
 * テスト用のEditorItemを生成
 */
function createTestItem(overrides: Partial<EditorItem> = {}): EditorItem {
  return {
    id: "test-item-1",
    order: 0,
    title: "テスト運動",
    imageSource: "",
    description: "",
    ...overrides,
  };
}

describe("reorderEditorItems", () => {
  describe("正常系: 並び替え", () => {
    it("activeId を overId の位置へ移動し、order を再採番できる", () => {
      const items = [
        createTestItem({ id: "a", title: "A", order: 0 }),
        createTestItem({ id: "b", title: "B", order: 1 }),
        createTestItem({ id: "c", title: "C", order: 2 }),
      ];

      const result = reorderEditorItems(items, "a", "c");

      expect(result).not.toBeNull();
      expect(result?.map((item) => item.id)).toEqual(["b", "c", "a"]);
      expect(result?.map((item) => item.order)).toEqual([0, 1, 2]);
    });

    it("元の配列を変更しない（不変性）", () => {
      const items = [
        createTestItem({ id: "a", title: "A", order: 0 }),
        createTestItem({ id: "b", title: "B", order: 1 }),
        createTestItem({ id: "c", title: "C", order: 2 }),
      ];
      const originalIds = items.map((item) => item.id);

      reorderEditorItems(items, "a", "c");

      expect(items.map((item) => item.id)).toEqual(originalIds);
    });

    it("最初の要素を最後へ移動できる", () => {
      const items = [
        createTestItem({ id: "a", order: 0 }),
        createTestItem({ id: "b", order: 1 }),
        createTestItem({ id: "c", order: 2 }),
      ];

      const result = reorderEditorItems(items, "a", "c");

      expect(result?.map((item) => item.id)).toEqual(["b", "c", "a"]);
    });

    it("最後の要素を最初へ移動できる", () => {
      const items = [
        createTestItem({ id: "a", order: 0 }),
        createTestItem({ id: "b", order: 1 }),
        createTestItem({ id: "c", order: 2 }),
      ];

      const result = reorderEditorItems(items, "c", "a");

      expect(result?.map((item) => item.id)).toEqual(["c", "a", "b"]);
    });

    it("隣接する要素を前方へ移動できる", () => {
      const items = [
        createTestItem({ id: "a", order: 0 }),
        createTestItem({ id: "b", order: 1 }),
        createTestItem({ id: "c", order: 2 }),
      ];

      const result = reorderEditorItems(items, "b", "a");

      expect(result?.map((item) => item.id)).toEqual(["b", "a", "c"]);
    });

    it("隣接する要素を後方へ移動できる", () => {
      const items = [
        createTestItem({ id: "a", order: 0 }),
        createTestItem({ id: "b", order: 1 }),
        createTestItem({ id: "c", order: 2 }),
      ];

      const result = reorderEditorItems(items, "a", "b");

      expect(result?.map((item) => item.id)).toEqual(["b", "a", "c"]);
    });

    it("元のアイテムの全属性が保持される", () => {
      const items = [
        createTestItem({
          id: "a",
          order: 0,
          title: "スクワット",
          description: "膝を曲げてゆっくり",
          imageSource: "img-001",
          dosages: { reps: "10回", sets: "3セット", frequency: "毎日" },
          precautions: [{ id: "p1", value: "痛みが出たら中止" }],
        }),
        createTestItem({ id: "b", order: 1 }),
      ];

      const result = reorderEditorItems(items, "a", "b");

      expect(result).not.toBeNull();
      const movedItem = result?.find((item) => item.id === "a");
      expect(movedItem).toEqual({
        id: "a",
        order: 1,
        title: "スクワット",
        description: "膝を曲げてゆっくり",
        imageSource: "img-001",
        dosages: { reps: "10回", sets: "3セット", frequency: "毎日" },
        precautions: [{ id: "p1", value: "痛みが出たら中止" }],
      });
    });
  });

  describe("異常系: null を返すケース", () => {
    it("overId が null の場合は null を返す", () => {
      const items = [createTestItem({ id: "a", order: 0 })];

      expect(reorderEditorItems(items, "a", null)).toBeNull();
    });

    it("overId が undefined の場合は null を返す", () => {
      const items = [createTestItem({ id: "a", order: 0 })];

      expect(reorderEditorItems(items, "a", undefined)).toBeNull();
    });

    it("activeId と overId が同じ場合は null を返す", () => {
      const items = [
        createTestItem({ id: "a", order: 0 }),
        createTestItem({ id: "b", order: 1 }),
      ];

      expect(reorderEditorItems(items, "a", "a")).toBeNull();
    });

    it("activeId が見つからない場合は null を返す", () => {
      const items = [
        createTestItem({ id: "a", order: 0 }),
        createTestItem({ id: "b", order: 1 }),
      ];

      expect(reorderEditorItems(items, "missing", "b")).toBeNull();
    });

    it("overId が見つからない場合は null を返す", () => {
      const items = [
        createTestItem({ id: "a", order: 0 }),
        createTestItem({ id: "b", order: 1 }),
      ];

      expect(reorderEditorItems(items, "a", "missing")).toBeNull();
    });
  });

  describe("エッジケース", () => {
    it("空配列の場合は null を返す", () => {
      const items: EditorItem[] = [];

      expect(reorderEditorItems(items, "a", "b")).toBeNull();
    });

    it("1要素のみの配列で異なるIDを指定した場合は null を返す", () => {
      const items = [createTestItem({ id: "a", order: 0 })];

      expect(reorderEditorItems(items, "a", "b")).toBeNull();
    });

    it("2要素の配列で入れ替えができる", () => {
      const items = [
        createTestItem({ id: "a", order: 0 }),
        createTestItem({ id: "b", order: 1 }),
      ];

      const result = reorderEditorItems(items, "a", "b");

      expect(result?.map((item) => item.id)).toEqual(["b", "a"]);
      expect(result?.map((item) => item.order)).toEqual([0, 1]);
    });

    it("多数の要素でも正しく並び替えできる", () => {
      const items = Array.from({ length: 10 }, (_, i) =>
        createTestItem({ id: `item-${i}`, order: i })
      );

      // item-0 を item-9 の位置へ移動
      const result = reorderEditorItems(items, "item-0", "item-9");

      expect(result).not.toBeNull();
      expect(result?.[0]?.id).toBe("item-1");
      expect(result?.[9]?.id).toBe("item-0");
      // order が連番であること
      expect(result?.every((item, i) => item.order === i)).toBeTruthy();
    });
  });
});

describe("getDosageBadgeLayout", () => {
  /**
   * テスト用のDosagesを生成
   */
  function createDosages(overrides: Partial<Dosages> = {}): Dosages {
    return {
      reps: "",
      sets: "",
      frequency: "",
      ...overrides,
    };
  }

  describe("空配列を返すケース", () => {
    it("dosages が undefined の場合は空配列を返す", () => {
      const result = getDosageBadgeLayout(undefined, "grid2");

      expect(result).toEqual([]);
    });

    it("すべての値が空文字の場合は空配列を返す", () => {
      const dosages = createDosages({ reps: "", sets: "", frequency: "" });

      const result = getDosageBadgeLayout(dosages, "grid2");

      expect(result).toEqual([]);
    });
  });

  describe("通常レイアウト（grid1, grid2, grid3）", () => {
    const normalLayouts: LayoutType[] = ["grid1", "grid2", "grid3"];

    it.each(normalLayouts)("%s レイアウトでは全値を1行で返す", (layoutType) => {
      const dosages = createDosages({
        reps: "10回",
        sets: "3セット",
        frequency: "毎日",
      });

      const result = getDosageBadgeLayout(dosages, layoutType);

      expect(result).toHaveLength(1);
      expect(result[0]?.badges).toHaveLength(3);
      expect(result[0]?.isFullWidth).toBeUndefined();
    });

    it("一部の値のみの場合でも3列構成で返す", () => {
      const dosages = createDosages({ reps: "10回" });

      const result = getDosageBadgeLayout(dosages, "grid2");

      expect(result).toHaveLength(1);
      expect(result[0]?.badges).toHaveLength(3);

      // reps のみ hasValue が true
      expect(result[0]?.badges[0]).toEqual({
        type: "reps",
        value: "10回",
        hasValue: true,
      });
      expect(result[0]?.badges[1]).toEqual({
        type: "sets",
        value: "",
        hasValue: false,
      });
      expect(result[0]?.badges[2]).toEqual({
        type: "frequency",
        value: "",
        hasValue: false,
      });
    });
  });

  describe("grid4 レイアウト（4列）", () => {
    it("全値がある場合は2行で返す", () => {
      const dosages = createDosages({
        reps: "10回",
        sets: "3セット",
        frequency: "毎日",
      });

      const result = getDosageBadgeLayout(dosages, "grid4");

      expect(result).toHaveLength(2);

      // 1行目: 回数・セット
      expect(result[0]?.badges).toHaveLength(2);
      expect(result[0]?.badges[0]?.type).toBe("reps");
      expect(result[0]?.badges[1]?.type).toBe("sets");
      expect(result[0]?.isFullWidth).toBeUndefined();

      // 2行目: 頻度（横幅いっぱい）
      expect(result[1]?.badges).toHaveLength(1);
      expect(result[1]?.badges[0]?.type).toBe("frequency");
      expect(result[1]?.isFullWidth).toBeTruthy();
    });

    it("回数・セットのみの場合は1行で返す", () => {
      const dosages = createDosages({ reps: "10回", sets: "3セット" });

      const result = getDosageBadgeLayout(dosages, "grid4");

      expect(result).toHaveLength(1);
      expect(result[0]?.badges).toHaveLength(2);
      expect(result[0]?.badges[0]?.type).toBe("reps");
      expect(result[0]?.badges[1]?.type).toBe("sets");
    });

    it("回数のみの場合でも1行目は表示する", () => {
      const dosages = createDosages({ reps: "10回" });

      const result = getDosageBadgeLayout(dosages, "grid4");

      expect(result).toHaveLength(1);
      expect(result[0]?.badges).toHaveLength(2);
      expect(result[0]?.badges[0]?.hasValue).toBeTruthy();
      expect(result[0]?.badges[1]?.hasValue).toBeFalsy();
    });

    it("セットのみの場合でも1行目は表示する", () => {
      const dosages = createDosages({ sets: "3セット" });

      const result = getDosageBadgeLayout(dosages, "grid4");

      expect(result).toHaveLength(1);
      expect(result[0]?.badges[0]?.hasValue).toBeFalsy();
      expect(result[0]?.badges[1]?.hasValue).toBeTruthy();
    });

    it("頻度のみの場合は1行（isFullWidth）で返す", () => {
      const dosages = createDosages({ frequency: "1日2回" });

      const result = getDosageBadgeLayout(dosages, "grid4");

      expect(result).toHaveLength(1);
      expect(result[0]?.badges).toHaveLength(1);
      expect(result[0]?.badges[0]?.type).toBe("frequency");
      expect(result[0]?.badges[0]?.value).toBe("1日2回");
      expect(result[0]?.isFullWidth).toBeTruthy();
    });
  });

  describe("バッジ情報の構造", () => {
    it("各バッジが正しい構造を持つ", () => {
      const dosages = createDosages({
        reps: "20回",
        sets: "5セット",
        frequency: "週3回",
      });

      const result = getDosageBadgeLayout(dosages, "grid2");

      expect(result[0]?.badges[0]).toEqual({
        type: "reps",
        value: "20回",
        hasValue: true,
      });
      expect(result[0]?.badges[1]).toEqual({
        type: "sets",
        value: "5セット",
        hasValue: true,
      });
      expect(result[0]?.badges[2]).toEqual({
        type: "frequency",
        value: "週3回",
        hasValue: true,
      });
    });
  });
});
