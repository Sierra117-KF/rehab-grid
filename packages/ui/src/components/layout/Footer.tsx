import { APP_NAME, APP_NAME_EN } from "@rehab-grid/core/lib/constants";
import { ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

/**
 * フッターナビゲーションリンクの型定義
 */
type FooterLink = {
  href: string;
  label: string;
  /** 外部リンクの場合はtrue（セキュリティ属性を付与） */
  external?: boolean;
};

/**
 * フッターリンクセクションの型定義
 */
type FooterLinkSection = {
  titleEn: string;
  links: FooterLink[];
};

/**
 * フッターリンクセクション定義
 */
const FOOTER_SECTIONS: FooterLinkSection[] = [
  {
    titleEn: "Support",
    links: [
      { href: "/changelog", label: "更新履歴" },
      {
        href: "https://docs.google.com/forms/d/e/1FAIpQLSfCEVpML2K8qPpOaCSapN6BiqUXqSC-jy0ynBK6E0g7eA01TA/viewform",
        label: "ご意見箱",
        external: true,
      },
    ],
  },
  {
    titleEn: "Legal",
    links: [
      { href: "/privacy", label: "プライバシー" },
      { href: "/terms", label: "利用規約" },
    ],
  },
  {
    titleEn: "Source",
    links: [
      {
        href: "https://github.com/Sierra117-KF/rehab-grid",
        label: "GitHub",
        external: true,
      },
    ],
  },
];

/**
 * 共通フッターコンポーネント
 *
 * トップページと(Info)配下ページで共通して使用されるフッター。
 * ナビゲーションリンク、コピーライト、装飾テキストを含む。
 *
 * @remarks サーバーコンポーネントとして実装（'use client'なし）
 */
export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative border-t border-border/40 bg-white pt-8 md:pt-10 pb-6 px-4 md:px-6 overflow-hidden">
      <div className="mx-auto max-w-6xl">
        {/* 上部: リンクグリッド */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-10 md:mb-12">
          {/* ブランドエリア */}
          <div className="flex flex-col items-center md:items-start gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-xl font-bold tracking-tighter hover:text-primary transition-colors"
            >
              <Image
                src="/icons/logo.png"
                alt=""
                width={40}
                height={40}
                className="rounded-md"
              />
              <span>{APP_NAME}</span>
            </Link>
            <p className="text-base text-muted-foreground leading-relaxed text-center md:text-left">
              自主トレ指導箋の作成支援ツール
            </p>
          </div>

          {/* ナビゲーションセクション（モバイルで横並び） */}
          <div className="col-span-1 md:col-span-2 grid grid-cols-3 gap-8 md:gap-12">
            {FOOTER_SECTIONS.map((section) => (
              <div
                key={section.titleEn}
                className="flex flex-col items-center md:items-start"
              >
                <h4 className="text-base font-semibold text-primary uppercase tracking-wider mb-3 md:mb-4">
                  {section.titleEn}
                </h4>
                <nav className="flex flex-col items-center md:items-start gap-4 md:gap-5">
                  {section.links.map((link) =>
                    link.external ? (
                      <a
                        key={link.href}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-base text-muted-foreground hover:text-primary transition-colors"
                      >
                        {link.label}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="text-base text-muted-foreground hover:text-primary transition-colors"
                      >
                        {link.label}
                      </Link>
                    )
                  )}
                </nav>
              </div>
            ))}
          </div>
        </div>

        {/* 下部: コピーライト */}
        <div className="border-t border-border/40 pt-6 md:pt-8 flex flex-col md:flex-row justify-center items-center gap-4">
          <p className="text-sm text-muted-foreground font-mono text-center">
            &copy; {currentYear} REHAB-GRID SYSTEM. —{" "}
            <a
              href="https://github.com/Sierra117-KF/rehab-grid/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              AGPL-3.0
            </a>
          </p>
        </div>
      </div>

      {/* 装飾: 大きな背景テキスト */}
      <div
        className="absolute bottom-0 right-0 -z-10 translate-y-[30%] translate-x-[10%] pointer-events-none select-none hidden desktop:block"
        aria-hidden="true"
      >
        <span className="text-9xl font-bold tracking-tighter text-foreground/5 leading-none whitespace-nowrap">
          {APP_NAME_EN}
        </span>
      </div>
    </footer>
  );
}
