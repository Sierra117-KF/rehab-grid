"use client";

import { isAllowedExternalUrl, openExternalUrl } from "@rehab-grid/core";
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
 * href属性を出力せず、クリックしても何も起こらない。
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
      await openExternalUrl(href);
    },
    [href],
  );

  return (
    <a
      // 許可外URLはhref自体を出さず、中クリック等でブラウザが直接開くのを防ぐ
      href={isAllowedExternalUrl(href) ? href : undefined}
      onClick={handleClick}
      // target="_blank" は付けない。Desktop 版では tauri-plugin-shell の注入スクリプトが
      // target="_blank" のリンクを横取りして開くため、openExternalUrl と二重に開いてしまう
      rel="noopener noreferrer"
      className={className}
    >
      {children}
      {showIcon ? <ExternalLinkIcon className="h-3.5 w-3.5" /> : null}
    </a>
  );
}
