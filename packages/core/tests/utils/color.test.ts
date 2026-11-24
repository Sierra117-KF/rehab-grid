import { mixWithWhite } from "@rehab-grid/core/utils/color";
import { describe, expect, it } from "vitest";

describe("mixWithWhite", () => {
  it.each([
    // blue-500 を 30% 重ねた色（旧 rgba(59, 130, 246, 0.3) を白地に描いた色）
    ["#3b82f6", 0.3, "#c4dafc"],
    ["#000000", 0.5, "#808080"],
    ["#000000", 0, "#ffffff"],
    ["#123456", 1, "#123456"],
  ])("%s を濃さ %s で白に重ねると %s になる", (hex, opacity, expected) => {
    expect(mixWithWhite(hex, opacity)).toBe(expected);
  });

  it("大文字の HEX も受け付け、小文字で返す", () => {
    expect(mixWithWhite("#3B82F6", 0.3)).toBe("#c4dafc");
  });
});
