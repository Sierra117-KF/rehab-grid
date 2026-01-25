"use client";

import { useHasEditorHistory } from "@rehab-grid/core/hooks/useHasEditorHistory";
import {
  APP_NAME,
  CTA_BUTTON_LABEL_CREATE,
  CTA_BUTTON_LABEL_RESUME,
} from "@rehab-grid/core/lib/constants";
import { useModalStore } from "@rehab-grid/core/lib/store/useModalStore";
import { cn } from "@rehab-grid/core/lib/utils";
import type { NavLink } from "@rehab-grid/core/types";
import { MobileSidebar } from "@rehab-grid/ui/components/layout/MobileSidebar";
import { Button } from "@rehab-grid/ui/components/wrapped/Button";
import { ArrowRight, ExternalLink, Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * ナビゲーションリンク一覧（デスクトップ用）
 */
const NAV_LINKS: NavLink[] = [
  { href: "/changelog", label: "更新履歴" },
  { href: "/terms", label: "利用規約" },
  { href: "/privacy", label: "プライバシー" },
];

/**
 * モバイルサイドバーのセクションリンク型定義
 */
type MobileSidebarLink = {
  href: string;
  label: string;
  external?: boolean;
};

/**
 * モバイルサイドバーのセクション型定義
 */
type MobileSidebarSection = {
  titleEn: string;
  links: MobileSidebarLink[];
};

/**
 * モバイルサイドバー用セクション定義（フッターと同様の構造）
 */
const MOBILE_SIDEBAR_SECTIONS: MobileSidebarSection[] = [
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
 * Headerコンポーネント
 * サイト全体のナビゲーションを提供します。
 *
 * SSR/ハイドレーション時のちらつきを防ぐため、
 * JavaScriptによるメディアクエリ判定ではなく、
 * TailwindのCSSレスポンシブクラスで表示を切り替えています。
 *
 * @returns ヘッダーコンポーネント
 */
export function Header() {
  const router = useRouter();
  const { tryNavigateToEditor } = useModalStore();
  const hasHistory = useHasEditorHistory();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  /** CTAボタンのラベル（エディタ使用履歴に応じて変更） */
  const ctaButtonLabel = hasHistory
    ? CTA_BUTTON_LABEL_RESUME
    : CTA_BUTTON_LABEL_CREATE;

  return (
    <>
      {/* モバイル用ヘッダー（タッチデバイス・狭い画面で表示） */}
      <header className="fixed z-50 bg-white/80 backdrop-blur-md top-3 left-3 right-3 rounded-xl shadow-lg desktop:hidden">
        <div className="mx-auto flex h-14 items-center justify-between px-4">
          {/* ハンバーガーメニュー */}
          <Button
            variant="ghost"
            size="icon"
            className="size-10 text-muted-foreground hover:text-foreground"
            onClick={() => setIsMenuOpen(true)}
            aria-label="メニューを開く"
          >
            <Menu className="size-5" />
          </Button>

          {/* ロゴ（中央配置） */}
          <Link
            href="/"
            className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 text-lg font-bold tracking-tight transition-colors hover:text-primary"
          >
            <Image
              src="/icons/logo.png"
              alt=""
              width={32}
              height={32}
              className="rounded-md"
              priority
            />
            <span>{APP_NAME}</span>
          </Link>

          {/* 右側のスペーサー（中央揃えのため） */}
          <div className="size-10" aria-hidden="true" />
        </div>
      </header>

      {/* デスクトップ用ヘッダー（マウス操作PC向け） */}
      <header className="fixed z-50 bg-white/80 backdrop-blur-md top-0 left-0 right-0 border-b border-border/40 hidden desktop:block">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          {/* ロゴ（左配置） */}
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight transition-colors hover:text-primary"
          >
            <Image
              src="/icons/logo.png"
              alt=""
              width={32}
              height={32}
              className="rounded-md"
              priority
            />
            <span>{APP_NAME}</span>
          </Link>

          {/* デスクトップナビゲーション */}
          <nav className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-base font-medium text-muted-foreground",
                  "transition-colors hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}

            {/* エディタボタン（CTA） */}
            <Button
              size="default"
              className="ml-4 h-10 px-6 text-base"
              onClick={() => tryNavigateToEditor(router)}
            >
              {ctaButtonLabel} <ArrowRight className="ml-2 size-4" />
            </Button>
          </nav>
        </div>
      </header>

      {/* モバイルサイドバーメニュー */}
      <MobileSidebar
        open={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        side="left"
        title="メニュー"
      >
        {/* ブランドエリア */}
        <Link
          href="/"
          className={cn(
            "flex items-center gap-3 py-4 mb-2",
            "transition-colors hover:opacity-80",
            "animate-fade-up"
          )}
          onClick={() => setIsMenuOpen(false)}
        >
          <Image
            src="/icons/logo.png"
            alt=""
            width={40}
            height={40}
            className="rounded-md"
          />
          <div>
            <span className="block text-lg font-bold tracking-tight text-foreground">
              {APP_NAME}
            </span>
            <span className="block text-sm text-muted-foreground">
              自主トレ指導箋の作成支援
            </span>
          </div>
        </Link>

        {/* セクションナビゲーション */}
        <nav className="flex-1 space-y-4 overflow-y-auto">
          {MOBILE_SIDEBAR_SECTIONS.map((section, sectionIndex) => (
            <div
              key={section.titleEn}
              className={cn(
                "animate-fade-up",
                sectionIndex === 0 && "animate-fade-up-delay-1",
                sectionIndex === 1 && "animate-fade-up-delay-2",
                sectionIndex === 2 && "animate-fade-up-delay-3"
              )}
            >
              {/* セクションタイトル */}
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-2 px-1">
                {section.titleEn}
              </h3>
              {/* セクションリンク */}
              <div className="space-y-1">
                {section.links.map((link) =>
                  link.external ? (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-2.5 text-base text-foreground",
                        "transition-colors hover:bg-accent hover:text-primary"
                      )}
                    >
                      {link.label}
                      <ExternalLink className="size-4 text-muted-foreground" />
                    </a>
                  ) : (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "flex items-center rounded-lg px-3 py-2.5 text-base text-foreground",
                        "transition-colors hover:bg-accent hover:text-primary"
                      )}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  )
                )}
              </div>
            </div>
          ))}
        </nav>

        {/* CTA ボタン */}
        <div
          className={cn(
            "mt-auto pt-4 border-t border-border/40",
            "animate-fade-up animate-fade-up-delay-4"
          )}
        >
          <Button
            size="lg"
            className="w-full h-12 text-base"
            onClick={() => {
              setIsMenuOpen(false);
              tryNavigateToEditor(router);
            }}
          >
            {ctaButtonLabel} <ArrowRight className="ml-2 size-4" />
          </Button>
        </div>
      </MobileSidebar>
    </>
  );
}
