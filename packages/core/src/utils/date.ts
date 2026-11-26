/**
 * 日付の整形ユーティリティ
 *
 * @remarks
 * いずれもローカル時刻の日付を使う（toISOString は UTC のため、日本時間 0〜9 時に前日の日付になる）
 */

/**
 * 日付の年・月・日（ローカル時刻）を取り出す
 *
 * @param date - 対象の日付
 * @returns 年・月（1〜12）・日
 */
function getLocalDateParts(date: Date): {
  year: number;
  month: number;
  day: number;
} {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

/**
 * 日付を YYYY-MM-DD 形式（ローカル時刻）で取得する
 *
 * @param date - 対象の日付（省略時は現在）
 * @returns YYYY-MM-DD 形式の日付文字列
 *
 * @example
 * ```typescript
 * getDateString(new Date(2026, 0, 5)); // "2026-01-05"
 * ```
 */
export function getDateString(date: Date = new Date()): string {
  const { year, month, day } = getLocalDateParts(date);
  return `${String(year)}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * 日付を「YYYY年M月D日」形式（ローカル時刻）で取得する
 *
 * @param date - 対象の日付
 * @returns 「2026年11月24日」形式の日付文字列（月・日はゼロ埋めしない）
 */
export function formatJapaneseDate(date: Date): string {
  const { year, month, day } = getLocalDateParts(date);
  return `${String(year)}年${String(month)}月${String(day)}日`;
}

/**
 * ISO 8601 日時文字列を Date へ変換する（不正な日時は fallback を返す）
 *
 * @param isoString - 変換対象の ISO 8601 文字列
 * @param fallback - パースできない場合に返す日時
 * @returns 有効な Date インスタンス
 */
export function parseIsoDateOrFallback(isoString: string, fallback: Date): Date {
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? fallback : date;
}
