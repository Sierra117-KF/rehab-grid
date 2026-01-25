/**
 * テキストサニタイズユーティリティ
 *
 * XSS攻撃を防ぐため、インポートされたテキストからHTMLタグを除去する
 *
 * @remarks
 * DOMPurifyを使用してHTMLタグを完全に除去し、プレーンテキストのみを返す
 */

import DOMPurify from "dompurify";

/**
 * HTMLタグを除去してテキストのみを返す
 *
 * XSS攻撃パターン（`<script>`, `<img onerror>` 等）を無害化し、
 * プレーンテキストのみを抽出する
 *
 * @param value - サニタイズ対象の文字列
 * @returns HTMLタグを除去した文字列
 *
 * @example
 * ```typescript
 * sanitizeText("Hello <script>alert('xss')</script> World")
 * // => "Hello World"
 *
 * sanitizeText("<b>太字</b>テキスト")
 * // => "太字テキスト"
 *
 * sanitizeText("通常のテキスト")
 * // => "通常のテキスト"
 * ```
 */
export function sanitizeText(value: string): string {
  return DOMPurify.sanitize(value, { ALLOWED_TAGS: [] });
}
