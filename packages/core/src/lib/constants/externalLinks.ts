/**
 * 外部リンク定数
 *
 * Desktop版（Tauri）でデフォルトブラウザを開く機能、
 * およびWeb版で新規タブを開く機能で使用する外部URL定数。
 */

/** GitHub リポジトリURL */
export const GITHUB_REPO_URL = "https://github.com/Sierra117-KF/rehab-grid";

/** GitHub Issues URL */
export const GITHUB_ISSUES_URL =
  "https://github.com/Sierra117-KF/rehab-grid/issues";

/** GitHub LICENSE URL */
export const GITHUB_LICENSE_URL =
  "https://github.com/Sierra117-KF/rehab-grid/blob/main/LICENSE";

/** Googleフォーム ご意見箱URL */
export const FEEDBACK_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfCEVpML2K8qPpOaCSapN6BiqUXqSC-jy0ynBK6E0g7eA01TA/viewform";

/**
 * 許可された外部URLのホワイトリスト
 *
 * @remarks
 * セキュリティのため、外部リンクを開く際はこのリストに含まれるURLのみを許可する。
 * Desktop版（Tauri）ではこのホワイトリストを使用して、
 * 意図しないURLがデフォルトブラウザで開かれることを防止する。
 */
export const ALLOWED_EXTERNAL_URLS: readonly string[] = [
  GITHUB_REPO_URL,
  GITHUB_ISSUES_URL,
  GITHUB_LICENSE_URL,
  FEEDBACK_FORM_URL,
] as const;
