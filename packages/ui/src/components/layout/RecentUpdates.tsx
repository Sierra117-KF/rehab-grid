import {
  formatDate,
  getRecentEntries,
  getTotalItemCount,
} from "@rehab-grid/core/lib/changelog";
import { RECENT_ENTRIES_COUNT } from "@rehab-grid/core/lib/constants";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

/**
 * トップページ用の最新更新情報セクション
 *
 * @remarks
 * - 最新3件の更新情報を表示
 * - 最新の1件にはNEWバッジを表示
 * - エントリが0件の場合はnullを返す（何も表示しない）
 */
export function RecentUpdates() {
  const recentEntries = getRecentEntries(RECENT_ENTRIES_COUNT);

  // エントリがない場合は何も表示しない
  if (recentEntries.length === 0) {
    return null;
  }

  return (
    <section className="py-10 md:py-12 px-6 relative">
      <div className="mx-auto max-w-6xl">
        {/* セクションヘッダー */}
        <div className="flex items-center justify-center md:justify-between mb-8">
          <div className="flex items-center gap-3">
            <Sparkles className="size-5 text-primary" />
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              最新の更新
            </h2>
          </div>
          <Link
            href="/changelog"
            className="group flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 transition-colors ml-4"
          >
            すべて見る
            <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* エントリリスト */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recentEntries.map((entry, index) => {
            const isLatest = index === 0;
            const totalItems = getTotalItemCount(entry);

            return (
              <div
                key={entry.version}
                data-testid={`entry-card-${entry.version}`}
                className={`group relative overflow-hidden rounded-lg border p-5 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 ${
                  isLatest
                    ? "border-primary/30 bg-primary/5"
                    : "border-white/10 bg-card/30"
                }`}
              >
                {/* NEWバッジ（最新の1件のみ） */}
                {isLatest ? (
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground rounded animate-pulse">
                      NEW
                    </span>
                  </div>
                ) : null}

                {/* バージョンと日付 */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {entry.version}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(entry.date)}
                  </span>
                </div>

                {/* タイトル */}
                <h3 className="font-medium text-foreground mb-2">
                  {entry.title}
                </h3>

                {/* 更新件数 */}
                <p className="text-xs text-muted-foreground">
                  {totalItems} 件の変更
                </p>

                {/* ホバー時のグラデーション */}
                <div className="absolute inset-0 bg-linear-to-t from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
