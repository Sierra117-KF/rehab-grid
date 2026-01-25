"use client";

import { cn } from "@rehab-grid/core";
import { FileText, History, Home, Shield } from "lucide-react";
import { usePathname } from "next/navigation";

/**
 * Desktop版フッターナビゲーションのリンク項目
 */
const NAV_ITEMS = [
  { href: "/", label: "エディタ", icon: Home },
  { href: "/terms/", label: "利用規約", icon: FileText },
  { href: "/privacy/", label: "プライバシー", icon: Shield },
  { href: "/changelog/", label: "更新履歴", icon: History },
] as const;

/**
 * Desktop版専用の共通フッターナビゲーション
 *
 * @remarks
 * 全ページの下部に固定表示され、ページ間のナビゲーションを提供。
 * 現在のページはハイライト表示され、視覚的なフィードバックを与える。
 *
 * Web版のHeader/Footerとは異なり、Desktop版ではこのシンプルな
 * タブバー風ナビゲーションで統一されたUXを実現。
 */
export function DesktopNavFooter() {
  const pathname = usePathname();

  return (
    <nav
      className="border-t border-border bg-background"
      aria-label="メインナビゲーション"
    >
      <div className="flex items-center justify-center gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const IconComponent = item.icon;
          return (
            <a
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <IconComponent className="size-5" aria-hidden="true" />
              <span>{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
