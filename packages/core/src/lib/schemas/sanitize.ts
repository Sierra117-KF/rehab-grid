/**
 * テキストサニタイズユーティリティ
 *
 * XSS攻撃を防ぐため、インポートされたテキストからHTMLタグを除去する
 *
 * @remarks
 * DOMPurifyを使用してHTMLタグを完全に除去し、プレーンテキストのみを返す。
 * 戻り値はHTMLエスケープしない（表示時は React がエスケープする）
 */

import DOMPurify from "dompurify";

/**
 * HTMLタグを除去してテキストのみを返す
 *
 * XSS攻撃パターン（`<script>`, `<img onerror>` 等）を無害化し、
 * プレーンテキストのみを抽出する
 *
 * @remarks
 * 文字列で受け取ると HTML としてシリアライズされ `<` `&` が `&lt;` `&amp;` になり、
 * インポート・エクスポートの往復でエスケープが重なるため、DOM から textContent を取り出す
 *
 * @param value - サニタイズ対象の文字列
 * @returns HTMLタグを除去したプレーンテキスト（エスケープなし）
 *
 * @example
 * ```typescript
 * sanitizeText("Hello <script>alert('xss')</script> World")
 * // => "Hello World"
 *
 * sanitizeText("<b>太字</b>テキスト")
 * // => "太字テキスト"
 *
 * sanitizeText("膝 < 90° & 痛みなし")
 * // => "膝 < 90° & 痛みなし"
 * ```
 */
export function sanitizeText(value: string): string {
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [],
    RETURN_DOM_FRAGMENT: true,
  }).textContent;
}
