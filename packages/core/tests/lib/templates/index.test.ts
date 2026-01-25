import { getTemplateById, TEMPLATES } from "@rehab-grid/core/lib/templates";
import { describe, expect, it } from "vitest";

describe("lib/templates", () => {
  describe("TEMPLATES", () => {
    it("テンプレート配列が空でないこと", () => {
      expect(TEMPLATES.length).toBeGreaterThan(0);
    });

    it("各テンプレートが必須プロパティを持つこと", () => {
      TEMPLATES.forEach((template) => {
        expect(template).toHaveProperty("id");
        expect(template).toHaveProperty("name");
        expect(template).toHaveProperty("description");
        expect(template).toHaveProperty("cardCount");
        expect(template).toHaveProperty("path");
      });
    });

    it("各テンプレートの id が空でない文字列であること", () => {
      TEMPLATES.forEach((template) => {
        expect(typeof template.id).toBe("string");
        expect(template.id.length).toBeGreaterThan(0);
      });
    });

    it("各テンプレートの name が空でない文字列であること", () => {
      TEMPLATES.forEach((template) => {
        expect(typeof template.name).toBe("string");
        expect(template.name.length).toBeGreaterThan(0);
      });
    });

    it("各テンプレートの cardCount が正の整数であること", () => {
      TEMPLATES.forEach((template) => {
        expect(Number.isInteger(template.cardCount)).toBeTruthy();
        expect(template.cardCount).toBeGreaterThan(0);
      });
    });

    it("各テンプレートの path が空でない文字列であること", () => {
      TEMPLATES.forEach((template) => {
        expect(typeof template.path).toBe("string");
        expect(template.path.length).toBeGreaterThan(0);
      });
    });

    it("テンプレート ID が一意であること", () => {
      const ids = TEMPLATES.map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe("getTemplateById", () => {
    it("存在する ID で該当テンプレートを返す", () => {
      // TEMPLATES の最初の要素で検証（空配列は別テストで検証済み）
      const firstTemplate = TEMPLATES[0];
      if (firstTemplate === undefined) {
        throw new Error("TEMPLATES is empty");
      }

      const result = getTemplateById(firstTemplate.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(firstTemplate.id);
      expect(result?.name).toBe(firstTemplate.name);
    });

    it("存在しない ID で undefined を返す", () => {
      const result = getTemplateById("non-existent-id");

      expect(result).toBeUndefined();
    });

    it("空文字列で undefined を返す", () => {
      const result = getTemplateById("");

      expect(result).toBeUndefined();
    });

    it.each(TEMPLATES)(
      "テンプレート '$name' を ID '$id' で取得できる",
      (template) => {
        const result = getTemplateById(template.id);

        expect(result).toEqual(template);
      }
    );
  });
});
