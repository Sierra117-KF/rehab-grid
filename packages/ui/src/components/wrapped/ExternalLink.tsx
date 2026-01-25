"use client";

import { openExternalUrl } from "@rehab-grid/core";
import { ExternalLink as ExternalLinkIcon } from "lucide-react";
import { type ReactNode, useCallback } from "react";

/**
 * ExternalLinkコンポーネントのプロパティ
 */
type ExternalLinkProps = {
  /** リンク先URL（ALLOWED_EXTERNAL_URLSに含まれている必要がある） */
  href: string;
  /** リンクの子要素（テキストやアイコンなど） */
  children: ReactNode;
  /** 外部リンクアイコンを表示するかどうか（デフォルト: true） */
  showIcon?: boolean;
  /** カスタムクラス名 */
  className?: string;
};

/**
 * 外部リンクコンポーネント
 *
 * Desktop版（Tauri）ではOSのデフォルトブラウザでURLを開き、
 * Web版では新しいタブでURLを開く。
 *
 * @remarks
 * セキュリティのため、hrefに指定できるURLはALLOWED_EXTERNAL_URLSに
 * 含まれているものに限定される。許可されていないURLの場合、
 * クリックしても何も起こらない。
 *
 * @example
 * ```tsx
 * import { ExternalLink } from "@rehab-grid/ui";
 * import { GITHUB_REPO_URL } from "@rehab-grid/core";
 *
 * <ExternalLink href={GITHUB_REPO_URL}>
 *   GitHubリポジトリ
 * </ExternalLink>
 * ```
 */
export function ExternalLink({
  href,
  children,
  showIcon = true,
  className = "text-blue-500 hover:text-blue-400 inline-flex items-center gap-1",
}: ExternalLinkProps) {
  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      const success = await openExternalUrl(href);
      if (!success) {
        // openExternalUrlが失敗した場合、フォールバックとしてネイティブの動作を使用
        window.open(href, "_blank", "noopener,noreferrer");
      }
    },
    [href],
  );

  return (
    <a
      href={href}
      onClick={handleClick}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
      {showIcon ? <ExternalLinkIcon className="h-3.5 w-3.5" /> : null}
    </a>
  );
}
