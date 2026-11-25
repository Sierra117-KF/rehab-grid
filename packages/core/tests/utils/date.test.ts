import { formatJapaneseDate, getDateString } from "@rehab-grid/core/utils/date";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("getDateString", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("YYYY-MM-DD 形式で、月・日をゼロ埋めする", () => {
    expect(getDateString(new Date(2024, 0, 5, 12, 0))).toBe("2024-01-05");
  });

  it("引数を省略すると現在の日付を返す", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 5, 15, 12, 0));

    expect(getDateString()).toBe("2024-06-15");
  });

  it("日付の変わり目直後もローカル時刻の日付を返す（UTC の前日にならない）", () => {
    expect(getDateString(new Date(2026, 10, 25, 0, 30))).toBe("2026-11-25");
  });
});

describe("formatJapaneseDate", () => {
  it("「YYYY年M月D日」形式で、月・日をゼロ埋めしない", () => {
    expect(formatJapaneseDate(new Date(2026, 0, 5, 12, 0))).toBe(
      "2026年1月5日"
    );
    expect(formatJapaneseDate(new Date(2026, 10, 24, 12, 0))).toBe(
      "2026年11月24日"
    );
  });
});
