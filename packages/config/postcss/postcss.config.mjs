/**
 * @rehab-grid/config - 共有PostCSS設定
 *
 * Tailwind CSS v4用のPostCSS設定です。
 * 各パッケージでこの設定をそのまま使用するか、postcss.config.mjsから参照します。
 *
 * 使用例:
 * ```js
 * // apps/web/postcss.config.mjs
 * export { default } from "@rehab-grid/config/postcss";
 * ```
 */
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
