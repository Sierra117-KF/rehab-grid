import type { ChangelogEntry } from "@rehab-grid/core/types";
import { RecentUpdates } from "@rehab-grid/ui/components/layout/RecentUpdates";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * lib/changelog モジュールのモック
 *
 * @remarks
 * vi.hoisted でモック関数を事前定義し、vi.mock 内で参照可能にする。
 * Vitest v4 では vi.mock のコールバック内で外部変数を直接参照できないため必須。
 */
const { mockGetRecentEntries, mockFormatDate, mockGetTotalItemCount } =
  vi.hoisted(() => ({
    mockGetRecentEntries: vi.fn<(count: number) => ChangelogEntry[]>(),
    mockFormatDate: vi.fn<(isoDate: string) => string>(),
    mockGetTotalItemCount: vi.fn<(entry: ChangelogEntry) => number>(),
  }));

vi.mock("@/lib/changelog", () => ({
  getRecentEntries: mockGetRecentEntries,
  formatDate: mockFormatDate,
  getTotalItemCount: mockGetTotalItemCount,
}));

/**
 * テスト用 ChangelogEntry を生成
 */
function createTestEntry(
  overrides: Partial<ChangelogEntry> = {}
): ChangelogEntry {
  return {
    version: "v1.0.0",
    date: "2025-01-01",
    title: "テスト更新",
    categories: { features: ["機能追加"] },
    ...overrides,
  };
}

/**
 * デフォルトのモックセットアップ
 *
 * @param entries - getRecentEntries が返すエントリ配列
 */
function setupMocks(entries: ChangelogEntry[]) {
  mockGetRecentEntries.mockReturnValue(entries);
  mockFormatDate.mockImplementation(
    (isoDate: string) =>
      `${isoDate.replace(/-/g, "年").slice(0, 7)}月${isoDate.slice(8)}日`
  );
  mockGetTotalItemCount.mockImplementation((entry: ChangelogEntry) => {
    const { features, improvements, fixes } = entry.categories;
    return (
      (features?.length ?? 0) +
      (improvements?.length ?? 0) +
      (fixes?.length ?? 0)
    );
  });
}

describe("RecentUpdates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("空状態", () => {
    it("エントリが0件のとき何も表示されない", () => {
      setupMocks([]);

      render(<RecentUpdates />);

      // セクションが表示されないことを確認（nullを返すため）
      expect(
        screen.queryByRole("heading", { name: "最新の更新" })
      ).not.toBeInTheDocument();
    });
  });

  describe("セクションヘッダー", () => {
    it("セクションタイトル「最新の更新」が表示される", () => {
      setupMocks([createTestEntry()]);

      render(<RecentUpdates />);

      expect(
        screen.getByRole("heading", { name: "最新の更新", level: 2 })
      ).toBeInTheDocument();
    });

    it("「すべて見る」リンクが /changelog へのリンクになっている", () => {
      setupMocks([createTestEntry()]);

      render(<RecentUpdates />);

      const link = screen.getByRole("link", { name: /すべて見る/ });
      expect(link).toHaveAttribute("href", "/changelog");
    });
  });

  describe("エントリ表示", () => {
    it("バージョン番号が表示される", () => {
      setupMocks([createTestEntry({ version: "v2.5.0" })]);

      render(<RecentUpdates />);

      expect(screen.getByText("v2.5.0")).toBeInTheDocument();
    });

    it("フォーマット済み日付が表示される", () => {
      setupMocks([createTestEntry({ date: "2025-12-25" })]);

      render(<RecentUpdates />);

      // mockFormatDate の実装により変換された日付
      expect(screen.getByText("2025年12月25日")).toBeInTheDocument();
      expect(mockFormatDate).toHaveBeenCalledWith("2025-12-25");
    });

    it("タイトルが表示される", () => {
      setupMocks([createTestEntry({ title: "大型アップデート" })]);

      render(<RecentUpdates />);

      expect(
        screen.getByRole("heading", { name: "大型アップデート", level: 3 })
      ).toBeInTheDocument();
    });

    it("変更件数が表示される", () => {
      const entry = createTestEntry({
        categories: {
          features: ["機能A", "機能B"],
          improvements: ["改善A"],
        },
      });
      setupMocks([entry]);

      render(<RecentUpdates />);

      expect(screen.getByText("3 件の変更")).toBeInTheDocument();
      expect(mockGetTotalItemCount).toHaveBeenCalledWith(entry);
    });

    it("複数エントリがすべて表示される", () => {
      setupMocks([
        createTestEntry({ version: "v1.2.0", title: "更新A" }),
        createTestEntry({ version: "v1.1.0", title: "更新B" }),
        createTestEntry({ version: "v1.0.0", title: "更新C" }),
      ]);

      render(<RecentUpdates />);

      expect(screen.getByText("v1.2.0")).toBeInTheDocument();
      expect(screen.getByText("v1.1.0")).toBeInTheDocument();
      expect(screen.getByText("v1.0.0")).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "更新A", level: 3 })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "更新B", level: 3 })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "更新C", level: 3 })
      ).toBeInTheDocument();
    });
  });

  describe("NEWバッジ", () => {
    it("最新の1件にNEWバッジが表示される", () => {
      setupMocks([
        createTestEntry({ version: "v1.2.0", title: "最新" }),
        createTestEntry({ version: "v1.1.0", title: "2番目" }),
      ]);

      render(<RecentUpdates />);

      // NEWバッジが1つだけ存在することを確認
      const newBadges = screen.getAllByText("NEW");
      expect(newBadges).toHaveLength(1);

      // 最新エントリカード内にNEWバッジがあることを確認
      const latestCard = screen.getByTestId("entry-card-v1.2.0");
      expect(within(latestCard).getByText("NEW")).toBeInTheDocument();
    });

    it("2件目以降にはNEWバッジが表示されない", () => {
      setupMocks([
        createTestEntry({ version: "v1.2.0", title: "最新" }),
        createTestEntry({ version: "v1.1.0", title: "2番目" }),
        createTestEntry({ version: "v1.0.0", title: "3番目" }),
      ]);

      render(<RecentUpdates />);

      // 2番目のエントリカードにNEWバッジがないことを確認
      const secondCard = screen.getByTestId("entry-card-v1.1.0");
      expect(within(secondCard).queryByText("NEW")).not.toBeInTheDocument();

      // 3番目のエントリカードにNEWバッジがないことを確認
      const thirdCard = screen.getByTestId("entry-card-v1.0.0");
      expect(within(thirdCard).queryByText("NEW")).not.toBeInTheDocument();
    });
  });
});
