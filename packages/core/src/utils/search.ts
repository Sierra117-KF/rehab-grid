/**
 * テキスト検索ユーティリティ
 *
 * 全角/半角・大文字/小文字・ひらがな/カタカナの表記揺れを吸収して部分一致検索する
 */

/** カタカナ（ァ〜ヶ）にマッチするパターン */
const KATAKANA_PATTERN = /[ァ-ヶ]/gu;

/** カタカナからひらがなへのコードポイントの差 */
const KATAKANA_TO_HIRAGANA_OFFSET = 0x60;

/** 検索語の区切り（全角スペースは NFKC で半角になる） */
const SEARCH_TERM_SEPARATOR = /\s+/u;

/**
 * 検索用にテキストを正規化する
 *
 * NFKC 正規化（全角英数・半角カナの統一）→ 小文字化 → カタカナをひらがなへ変換する。
 * 検索語と検索対象の両方に適用して比較する。
 *
 * @param text - 正規化するテキスト
 * @returns 正規化後のテキスト
 *
 * @example
 * ```ts
 * normalizeSearchText("スクワット"); // "すくわっと"
 * normalizeSearchText("ＳＬＲ"); // "slr"
 * normalizeSearchText("ｽｸﾜｯﾄ"); // "すくわっと"
 * ```
 */
export function normalizeSearchText(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(KATAKANA_PATTERN, (char) =>
      String.fromCodePoint(
        (char.codePointAt(0) ?? 0) - KATAKANA_TO_HIRAGANA_OFFSET
      )
    );
}

/**
 * テキストが検索語に一致するか判定する
 *
 * 検索語は空白で区切った複数語の AND 条件で、それぞれ正規化したうえで部分一致を判定する。
 * 検索語が空（空白のみを含む）の場合は常に一致とみなす。
 *
 * @param target - 検索対象のテキスト
 * @param query - 検索語
 * @returns すべての語を含んでいれば true
 *
 * @example
 * ```ts
 * matchesSearchQuery("足上げ（SLR）", "slr"); // true
 * matchesSearchQuery("四つ這い股関節伸展", "よつ 伸展"); // false（「四つ」は漢字）
 * matchesSearchQuery("四つ這い股関節伸展", "四つ 伸展"); // true
 * ```
 */
export function matchesSearchQuery(target: string, query: string): boolean {
  const terms = normalizeSearchText(query)
    .split(SEARCH_TERM_SEPARATOR)
    .filter((term) => term !== "");
  if (terms.length === 0) return true;

  const normalizedTarget = normalizeSearchText(target);
  return terms.every((term) => normalizedTarget.includes(term));
}
