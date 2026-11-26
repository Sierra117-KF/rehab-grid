import {
  formatDate,
  getLatestVersion,
  getRecentEntries,
  getSortedEntries,
  getTotalItemCount,
} from "@rehab-grid/core/lib/changelog";
import type { ChangelogEntry } from "@rehab-grid/core/types";
import { describe, expect, it } from "vitest";

describe("lib/changelog", () => {
  describe("getSortedEntries", () => {
    it("日付の新しい順に並び、同日バージョンはセマンティックバージョンの降順になること", () => {
      const sorted = getSortedEntries();
      const versions = sorted.map((entry) => entry.version);

      // v1.2.0・v1.3.0・v1.3.1・v1.3.2 は同日（2026-11-26）でもセマンティックバージョンの降順になる
      expect(versions.indexOf("v1.3.2")).toBeLessThan(
        versions.indexOf("v1.3.1")
      );
      expect(versions.indexOf("v1.3.1")).toBeLessThan(
        versions.indexOf("v1.3.0")
      );
      expect(versions.indexOf("v1.3.0")).toBeLessThan(
        versions.indexOf("v1.2.0")
      );
      expect(versions[0]).toBe("v1.3.2");

      // 全体として日付の降順が保たれている
      for (let i = 1; i < sorted.length; i += 1) {
        const prev = sorted[i - 1]!;
        const curr = sorted[i]!;
        expect(new Date(prev.date).getTime()).toBeGreaterThanOrEqual(
          new Date(curr.date).getTime()
        );
      }
    });
  });

  describe("getLatestVersion", () => {
    it("最新エントリのバージョンを返すこと", () => {
      const sorted = getSortedEntries();

      expect(getLatestVersion()).toBe(sorted[0]?.version);
      expect(getLatestVersion()).toBe("v1.3.2");
    });
  });

  describe("getRecentEntries", () => {
    it("指定件数の最新エントリを新しい順で返すこと", () => {
      const recent = getRecentEntries(2);

      expect(recent).toHaveLength(2);
      expect(recent[0]?.version).toBe("v1.3.2");
      expect(recent[1]?.version).toBe("v1.3.1");
    });
  });

  describe("getTotalItemCount", () => {
    it("全カテゴリの項目数の合計を返すこと", () => {
      const entry: ChangelogEntry = {
        version: "v1.0.0",
        date: "2026-01-01",
        title: "テスト",
        categories: {
          features: ["A", "B"],
          improvements: ["C"],
          fixes: ["D", "E", "F"],
        },
      };

      expect(getTotalItemCount(entry)).toBe(6);
    });
  });

  describe("formatDate", () => {
    it("ISO 形式の日付を日本語表記に変換すること", () => {
      expect(formatDate("2026-11-26")).toBe("2026年11月26日");
    });
  });
});
