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
import { entryV110 } from "./v1.1.0";
import { entryV120 } from "./v1.2.0";
import { entryV130 } from "./v1.3.0";
import { entryV131 } from "./v1.3.1";
import { entryV132 } from "./v1.3.2";

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
  entryV110,
  entryV120,
  entryV130,
  entryV131,
  entryV132,
];
