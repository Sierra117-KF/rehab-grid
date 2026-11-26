/**
 * 更新履歴モジュール
 *
 * @remarks
 * 更新エントリの管理とユーティリティ関数を提供
 */
import { APP_VERSION } from "@rehab-grid/core/lib/constants";
import type { ChangelogEntry } from "@rehab-grid/core/types";

import { entries } from "./entries";

/**
 * ISO形式の日付を日本語表示形式に変換
 *
 * @param isoDate - ISO形式の日付文字列（例: "2025-12-20"）
 * @returns 日本語形式の日付文字列（例: "2025年12月20日"）
 */
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * バージョン文字列（例: "v1.3.0"）を数値配列に分解する
 *
 * @param version - バージョン文字列
 * @returns パースできた場合は数値配列、形式外なら null
 */
function parseVersion(version: string): number[] | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/**
 * 2 つのバージョンを降順（新しい方が先）で比較する
 */
function compareVersionDesc(a: string, b: string): number {
  const parsedA = parseVersion(a);
  const parsedB = parseVersion(b);
  if (parsedA === null || parsedB === null) return 0;

  for (let i = 0; i < parsedA.length; i += 1) {
    const diff = (parsedB[i] ?? 0) - (parsedA[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * 日付でソートした全エントリを取得（新しい順）
 *
 * @remarks
 * entries配列の順序に依存せず、常に日付の新しい順でソートして返す。
 * 同じ日付に複数のバージョンがある場合はセマンティックバージョンの降順で並べる。
 * 更新履歴ページなど、全エントリを表示する場合に使用する。
 *
 * @returns 全エントリ配列（新しい順）
 */
export function getSortedEntries(): ChangelogEntry[] {
  return [...entries].sort((a, b) => {
    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return compareVersionDesc(a.version, b.version);
  });
}

/**
 * 最新バージョンを取得
 *
 * @remarks
 * エントリがある場合は最新エントリのバージョンを返す。
 * エントリがない場合はAPP_VERSIONにフォールバック。
 *
 * @returns 最新バージョン文字列（例: "v0.1.0"）
 */
export function getLatestVersion(): string {
  const sorted = getSortedEntries();
  const latest = sorted[0];
  return latest ? latest.version : `v${APP_VERSION}`;
}

/**
 * 最新N件のエントリを取得
 *
 * @remarks
 * 日付でソートして新しい順に返すため、entries配列の順序は問わない
 *
 * @param count - 取得する件数
 * @returns 最新N件のエントリ配列（新しい順）
 */
export function getRecentEntries(count: number): ChangelogEntry[] {
  return getSortedEntries().slice(0, count);
}

/**
 * エントリ内の全カテゴリのアイテム合計数を計算
 *
 * @param entry - 更新エントリ
 * @returns アイテムの合計数
 */
export function getTotalItemCount(entry: ChangelogEntry): number {
  const { features, improvements, fixes } = entry.categories;
  return (
    (features?.length ?? 0) +
    (improvements?.length ?? 0) +
    (fixes?.length ?? 0)
  );
}
