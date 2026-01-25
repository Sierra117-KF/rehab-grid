import type { ChangelogCategory, ChangelogEntry } from "@rehab-grid/core";
import {
  CATEGORY_COLOR_CLASSES,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  formatDate,
  getSortedEntries,
} from "@rehab-grid/core";
import { Sparkles, TrendingUp, Wrench } from "lucide-react";

/** カテゴリごとのアイコン設定 */
const CATEGORY_ICONS: Record<ChangelogCategory, React.ReactNode> = {
  features: <Sparkles className="size-4" />,
  improvements: <TrendingUp className="size-4" />,
  fixes: <Wrench className="size-4" />,
};

/**
 * カテゴリセクションを描画
 */
function CategorySection({
  category,
  items,
}: {
  category: ChangelogCategory;
  items: string[];
}) {
  const icon = CATEGORY_ICONS[category];
  const label = CATEGORY_LABELS[category];
  const colorClass = CATEGORY_COLOR_CLASSES[category];

  return (
    <div className="space-y-2">
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colorClass}`}
      >
        {icon}
        {label}
      </div>
      <ul className="space-y-1.5 pl-1">
        {items.map((item) => (
          <li
            key={`${category}-${item}`}
            className="text-muted-foreground text-sm leading-relaxed flex items-start gap-2"
          >
            <span className="text-white/20 mt-1.5">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * タイムラインエントリを描画
 */
function TimelineEntry({
  entry,
  isFirst,
}: {
  entry: ChangelogEntry;
  isFirst: boolean;
}) {
  return (
    <div className="relative pl-8 pb-12 last:pb-0">
      {/* タイムラインの縦線 */}
      <div className="absolute left-[7px] top-3 bottom-0 w-px bg-linear-to-b from-primary/50 via-white/10 to-transparent" />

      {/* タイムラインのドット */}
      <div
        className={`absolute left-0 top-1.5 size-4 rounded-full border-2 ${
          isFirst
            ? "bg-primary border-primary shadow-[0_0_12px_rgba(var(--color-primary-rgb),0.5)]"
            : "bg-background border-white/20"
        }`}
      />

      {/* コンテンツ */}
      <div className="space-y-4">
        {/* ヘッダー: バージョン + 日付 */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-lg font-bold text-foreground tracking-tight">
            {entry.version}
          </span>
          {isFirst ? (
            <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-primary text-primary-foreground rounded">
              Latest
            </span>
          ) : null}
          <span className="text-sm text-muted-foreground">
            {formatDate(entry.date)}
          </span>
        </div>

        {/* タイトル */}
        <h3 className="text-xl font-semibold text-foreground">{entry.title}</h3>

        {/* カテゴリ別の更新内容 */}
        <div className="space-y-4 pt-2">
          {CATEGORY_ORDER.flatMap((category) => {
            const items =
              entry.categories[category];
            if (!items || items.length === 0) return [];
            return [
              <CategorySection
                key={category}
                category={category}
                items={items}
              />,
            ];
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * 更新情報がない場合の表示
 */
function EmptyState() {
  return (
    <div className="text-center py-16 px-4">
      <div className="inline-flex items-center justify-center size-16 rounded-full bg-muted/50 border border-white/10 mb-6">
        <Sparkles className="size-8 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">
        更新情報はまだありません
      </h3>
      <p className="text-muted-foreground max-w-md mx-auto">
        新しい機能や改善が追加されると、ここに表示されます。
      </p>
    </div>
  );
}

/**
 * 更新履歴ページコンポーネント
 *
 * @remarks サーバーコンポーネントとして利用可能（'use client'なし）
 */
export function ChangelogPage() {
  const entries = getSortedEntries();

  return (
    <article className="animate-fade-up">
      {/* ページヘッダー */}
      <header className="mb-12 md:mb-16">
        <p className="text-sm font-mono text-primary/70 uppercase tracking-wider mb-4">
          Changelog
        </p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-6">
          更新<span className="text-primary">履歴</span>
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          リハぐりの新機能、改善点、バグ修正などの変更履歴を確認できます。
        </p>
      </header>

      {/* タイムライン */}
      <div className="relative">
        {entries.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-0">
            {entries.map((entry, index) => (
              <TimelineEntry
                key={entry.version}
                entry={entry}
                isFirst={index === 0}
              />
            ))}
          </div>
        )}
      </div>

      {/* フッター */}
      {entries.length > 0 && (
        <footer className="mt-16 pt-8 border-t border-white/5">
          <p className="text-sm text-muted-foreground">
            全 {entries.length} 件の更新
          </p>
        </footer>
      )}
    </article>
  );
}
