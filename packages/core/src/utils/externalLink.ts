/**
 * 外部リンクユーティリティ
 *
 * Desktop版（Tauri）とWeb版で適切な方法で外部URLを開くための関数群。
 * セキュリティのため、ホワイトリストに登録されたURLのみを許可する。
 */

import { ALLOWED_EXTERNAL_URLS } from "../lib/constants/externalLinks";
import { Platform } from "../lib/platform";

/**
 * 指定されたURLがホワイトリストに含まれているかを検証する
 *
 * @param url - 検証するURL
 * @returns ホワイトリストに含まれている場合はtrue
 */
export function isAllowedExternalUrl(url: string): boolean {
  return ALLOWED_EXTERNAL_URLS.includes(url);
}

/**
 * 外部URLを適切な方法で開く
 *
 * Desktop版（Tauri）ではOSのデフォルトブラウザでURLを開き、
 * Web版では新しいタブでURLを開く。
 *
 * @param url - 開くURL（ALLOWED_EXTERNAL_URLSに含まれている必要がある）
 * @returns 処理が成功した場合はtrue、失敗または許可されていないURLの場合はfalse
 *
 * @example
 * ```tsx
 * import { openExternalUrl, GITHUB_REPO_URL } from "@rehab-grid/core";
 *
 * const handleClick = async (e: React.MouseEvent) => {
 *   e.preventDefault();
 *   await openExternalUrl(GITHUB_REPO_URL);
 * };
 * ```
 */
export async function openExternalUrl(url: string): Promise<boolean> {
  // ホワイトリストの検証
  if (!isAllowedExternalUrl(url)) {
    return false;
  }

  try {
    if (Platform.isTauri) {
      // Tauri環境: plugin-shellのopen関数でデフォルトブラウザを起動
      const { open } = await import("@tauri-apps/plugin-shell");
      await open(url);
      return true;
    }

    // Web環境: 新しいタブで開く
    if (Platform.isBrowser) {
      const newWindow = window.open(url, "_blank", "noopener,noreferrer");
      return newWindow !== null;
    }

    // SSR環境では何もしない
    return false;
  } catch {
    return false;
  }
}
