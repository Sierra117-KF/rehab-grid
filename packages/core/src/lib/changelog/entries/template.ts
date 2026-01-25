/**
 * 更新情報テンプレート
 *
 * @remarks
 * 新しい更新情報を追加する際の手順:
 *
 * 1. このファイルを entries/ ディレクトリ内にコピー
 * 2. ファイル名をバージョン名に変更（例: v0.2.0.ts）
 * 3. 変数名とエクスポート名を適切なバージョン名に変更
 *    - entryTemplate → entryV020（アンダースコアなしで数字を連結）
 * 4. version, date, title, categories を更新
 * 5. entries/index.ts でインポートして配列に追加
 *
 * @example
 * ```typescript
 * // entries/v0.2.0.ts
 * import type { ChangelogEntry } from '@/types';
 *
 * export const entryV020: ChangelogEntry = {
 *   version: "v0.2.0",
 *   date: "2025-12-25",
 *   title: "機能強化アップデート",
 *   categories: {
 *     features: ["テンプレート機能を追加"],
 *     improvements: ["PDF出力速度を改善"],
 *   },
 * };
 * ```
 */
import type { ChangelogEntry } from "@rehab-grid/core/types";

/**
 * テンプレートエントリ
 *
 * @remarks
 * コピー時に適切なバージョン名（例: entryV0_2_0）に変更すること
 */
export const entryTemplate: ChangelogEntry = {
  version: "vX.X.X",
  date: "20XX-XX-XX",
  title: "更新タイトル",
  categories: {
    // features: ["新機能1", "新機能2"],
    // improvements: ["改善点1"],
    // fixes: ["バグ修正1"],
  },
};
