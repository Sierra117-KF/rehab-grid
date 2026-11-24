import { DEFAULT_THEME_COLOR } from "@rehab-grid/core/lib/constants";
import { isLayoutType, resolveProjectSettings } from "@rehab-grid/core/lib/settings";
import { describe, expect, it } from "vitest";

describe("isLayoutType", () => {
  it.each(["grid1", "grid2", "grid3", "grid4"])("'%s' で true を返す", (value) => {
    expect(isLayoutType(value)).toBeTruthy();
  });

  it.each([["invalid"], ["grid5"], [""], ["Grid2"], ["toString"], [2], [undefined]])(
    "%s で false を返す",
    (value) => {
      expect(isLayoutType(value)).toBeFalsy();
    }
  );
});

describe("resolveProjectSettings", () => {
  it("正しい設定はそのまま返す（テーマカラーの大文字表記も保つ）", () => {
    expect(
      resolveProjectSettings({ layoutType: "grid4", themeColor: "#ABCDEF" })
    ).toEqual({ layoutType: "grid4", themeColor: "#ABCDEF" });
  });

  it.each([
    ["undefined", undefined],
    ["空オブジェクト", {}],
  ])("設定が %s の場合はすべてデフォルト値になる", (_, settings) => {
    expect(resolveProjectSettings(settings)).toEqual({
      layoutType: "grid2",
      themeColor: DEFAULT_THEME_COLOR,
    });
  });

  it.each(["red", "#fff", "#12345g", "3b82f6", ""])(
    "テーマカラー '%s' は不正なのでデフォルト値になる",
    (themeColor) => {
      expect(
        resolveProjectSettings({ layoutType: "grid3", themeColor })
      ).toEqual({ layoutType: "grid3", themeColor: DEFAULT_THEME_COLOR });
    }
  );

  it("不正なレイアウトタイプは grid2 になり、テーマカラーは保たれる", () => {
    expect(
      resolveProjectSettings({
        // @ts-expect-error - IndexedDB の破損データ等で不正値が入った場合を想定
        layoutType: "grid9",
        themeColor: "#059669",
      })
    ).toEqual({ layoutType: "grid2", themeColor: "#059669" });
  });
});
