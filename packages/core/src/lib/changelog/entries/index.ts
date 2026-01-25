/**
 * 更新エントリのバレルエクスポート
 *
 * @remarks
 * 新しいエントリを追加する際は:
 * 1. このディレクトリにバージョン名のファイルを作成（例: v0.2.0.ts）
 * 2. template.ts を参考にエントリを定義
 * 3. このファイルでインポート＆配列の末尾に追加
 */
import type { ChangelogEntry } from "@rehab-grid/core/types";

import { entryV100 } from "./v1.0.0";

/**
 * すべての更新エントリ（古い順）
 *
 * @remarks
 * 新しいエントリは配列の末尾に追加すること。
 * 表示時は getRecentEntries() が日付順にソートするため、
 * ここでの順序は問わない。
 */
// prettier-ignore
export const entries: ChangelogEntry[] = [
  entryV100,
];
