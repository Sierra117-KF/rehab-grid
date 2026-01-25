/**
 * 更新履歴関連の定数
 */
import type { ChangelogCategory } from "@rehab-grid/core/types";

/** 更新カテゴリのラベル（日本語） */
export const CATEGORY_LABELS: Record<ChangelogCategory, string> = {
  features: "新機能",
  improvements: "改善",
  fixes: "バグ修正",
};

/**
 * カテゴリの表示順序
 *
 * @remarks
 * 更新履歴のカテゴリセクションを表示する順序を定義。
 * 新機能 → 改善 → バグ修正 の順に表示される。
 */
export const CATEGORY_ORDER: ChangelogCategory[] = [
  "features",
  "improvements",
  "fixes",
];

/**
 * カテゴリごとのスタイル設定（色クラス）
 *
 * @remarks
 * 各カテゴリのバッジやセクションに適用するTailwind CSSクラス。
 * アイコンはReactコンポーネントのため、ここには含めない。
 */
export const CATEGORY_COLOR_CLASSES: Record<ChangelogCategory, string> = {
  features: "text-primary bg-primary/10 border-primary/20",
  improvements:
    "text-accent-secondary bg-accent-secondary/10 border-accent-secondary/20",
  fixes: "text-muted-foreground bg-muted/50 border-white/10",
};

/** トップページに表示する最新エントリの件数 */
export const RECENT_ENTRIES_COUNT = 3;
