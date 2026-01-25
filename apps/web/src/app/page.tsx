"use client";

import { useHasEditorHistory } from "@rehab-grid/core/hooks/useHasEditorHistory";
import { getLatestVersion } from "@rehab-grid/core/lib/changelog";
import {
  CTA_BUTTON_LABEL_CREATE,
  CTA_BUTTON_LABEL_RESUME,
  CTA_BUTTON_LABEL_TRY,
} from "@rehab-grid/core/lib/constants";
import { useModalStore } from "@rehab-grid/core/lib/store/useModalStore";
import { cn } from "@rehab-grid/core/lib/utils";
import { FAQ } from "@rehab-grid/ui/components/layout/FAQ";
import { Footer } from "@rehab-grid/ui/components/layout/Footer";
import { Header } from "@rehab-grid/ui/components/layout/Header";
import { RecentUpdates } from "@rehab-grid/ui/components/layout/RecentUpdates";
import { ScrollAnimationSection } from "@rehab-grid/ui/components/layout/ScrollAnimationSection";
import { Button } from "@rehab-grid/ui/components/wrapped/Button";
import { ArrowRight, Download, Monitor } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * 機能紹介データ (Bento Grid用)
 */
const FEATURES = [
  {
    title: "自動レイアウト",
    description: "画像を放り込むだけでグリッドが整列",
    className: "md:col-span-2 md:row-span-2", // ベントグリッド: 大きなアイテム
    bgImage: "/images/bento-grid/bento-01.webp",
    isLarge: true, // 大きなカード用フラグ
  },
  {
    title: "完全ローカル",
    description: "サーバー送信なし。データは端末内に保存",
    className: "md:col-span-1 md:row-span-1",
    bgImage: "/images/bento-grid/bento-02.webp",
    isLarge: false,
  },
  {
    title: "定型文入力",
    description: "頻出語句をワンタップで配置",
    className: "md:col-span-1 md:row-span-1",
    bgImage: "/images/bento-grid/bento-03.webp",
    isLarge: false,
  },
];

/**
 * トップページ（ホームページ）
 *
 * アプリの紹介と自主トレーニング指導箋エディタへの導線を提供
 */
export default function HomePage() {
  const router = useRouter();
  const { tryNavigateToEditor } = useModalStore();
  const hasHistory = useHasEditorHistory();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      <Header />

      <main className="relative">
        {/* 背景ノイズ & 装飾 */}
        <div className="fixed inset-0 z-[-1] bg-noise" />
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full bg-primary/10 blur-[120px] mix-blend-multiply opacity-30 animate-pulse" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-accent-secondary/10 blur-[100px] mix-blend-multiply opacity-20" />
        </div>

        {/* ヒーローセクション */}
        <section className="relative pt-24 pb-12 md:pt-32 md:pb-16 px-6">
          <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
            <div className="md:col-span-8 flex flex-col items-center md:items-start gap-6 z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 w-fit animate-fade-in text-sm font-mono text-primary tracking-wider uppercase">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                {getLatestVersion()} Available Now
              </div>

              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter leading-[0.9] animate-fade-up animate-fade-up-delay-1 text-center md:text-left">
                REHAB
                <br />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-primary-light">
                  GRID_
                </span>
                SYSTEM
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed animate-fade-up animate-fade-up-delay-2 text-center md:text-left">
                自主トレ指導箋の作成支援ツール{" "}
              </p>

              <div className="flex flex-wrap gap-4 mt-4 animate-fade-up animate-fade-up-delay-3 justify-center md:justify-start">
                {/* メインCTA: エディタへの導線（免責モーダル経由） */}
                <Button
                  size="lg"
                  className="h-12 px-8 text-base"
                  onClick={() => tryNavigateToEditor(router)}
                >
                  {hasHistory
                    ? CTA_BUTTON_LABEL_RESUME
                    : CTA_BUTTON_LABEL_CREATE}{" "}
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </div>
            </div>

            {/* 右側: アニメーショングリッド */}
            <div className="hidden desktop:flex md:col-span-5 lg:col-span-4 justify-center items-center relative">
              <div className="grid grid-cols-2 gap-3 w-full max-w-[240px] hero-grid">
                <div className="hero-grid-card aspect-square rounded-xl border border-border bg-card shadow-sm" />
                <div className="hero-grid-card aspect-square rounded-xl border border-border bg-card/80 shadow-sm" />
                <div className="hero-grid-card aspect-square rounded-xl border border-border bg-card/80 shadow-sm" />
                <div className="hero-grid-card hero-grid-card-accent aspect-square rounded-xl border border-primary/50 bg-linear-to-br from-primary/20 to-primary-light/20 shadow-sm" />
              </div>
            </div>
          </div>
        </section>

        {/* 機能セクション（ベンチグリッド） */}
        <ScrollAnimationSection className="py-12 md:py-16 px-6 relative">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 md:mb-10 text-center md:text-left">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-3">
                WORKFLOW <span className="text-primary">OPTIMIZED</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl text-lg mx-auto md:mx-0">
                自主トレ指導箋に必要な機能だけを厳選
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[200px]">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className={cn(
                    "group relative overflow-hidden rounded-xl border border-border transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10",
                    "flex flex-col", // flexレイアウト（縦積み）
                    feature.className
                  )}
                >
                  {/* 上部: 背景画像エリア */}
                  <div
                    className={cn(
                      "relative flex-6 overflow-hidden",
                      // デスクトップ大: 80%, デスクトップ小: 65%
                      feature.isLarge ? "md:flex-8" : "md:flex-[6.5]"
                    )}
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-500 group-hover:scale-105"
                      style={{ backgroundImage: `url(${feature.bgImage})` }}
                    />
                  </div>

                  {/* 下部: テキストエリア（完全不透明） */}
                  <div
                    className={cn(
                      "relative z-10 bg-card border-t border-border/50",
                      "p-4 md:px-4 md:py-2", // デスクトップでは上下パディングを削減
                      // デスクトップ大: 20%, デスクトップ小: 35%
                      feature.isLarge ? "md:flex-2" : "md:flex-[3.5]",
                      // 大きなカードのみ垂直中央揃え
                      feature.isLarge && "md:flex md:flex-col md:justify-center"
                    )}
                  >
                    <h3 className="text-xl font-bold mb-1 tracking-tight">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {feature.description}
                    </p>
                  </div>

                  {/* ホバー時のハイライト（画像エリアのみ） */}
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </div>
              ))}
            </div>
          </div>
        </ScrollAnimationSection>

        {/* FAQセクション */}
        <ScrollAnimationSection>
          <FAQ />
        </ScrollAnimationSection>

        {/* 最新更新情報セクション */}
        <ScrollAnimationSection>
          <RecentUpdates />
        </ScrollAnimationSection>

        {/* コールアウトセクション */}
        <ScrollAnimationSection className="py-10 md:py-12 px-6">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 flex flex-col md:flex-row items-center justify-between gap-6 hover:bg-primary/10 hover:border-primary/30 transition-colors">
              <div className="space-y-1 text-center md:text-left">
                <h3 className="text-xl text-foreground">
                  リハぐりを使ってみませんか？
                </h3>
              </div>
              <Button
                size="lg"
                className="shrink-0 h-12 px-8 text-base"
                onClick={() => tryNavigateToEditor(router)}
              >
                {hasHistory ? CTA_BUTTON_LABEL_RESUME : CTA_BUTTON_LABEL_TRY}{" "}
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>
          </div>
        </ScrollAnimationSection>

        {/* PC専用: Windowsインストーラーダウンロードセクション */}
        <ScrollAnimationSection className="hidden desktop:block py-10 md:py-12 px-6">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-xl border border-border bg-card/50 p-8 md:p-10 transition-colors hover:border-primary/30">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                {/* 左側: テキストコンテンツ */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Monitor className="size-6 text-primary" />
                    <h3 className="text-xl font-bold tracking-tight text-foreground">
                      Windows版をインストール
                    </h3>
                  </div>
                  <p className="text-muted-foreground max-w-xl">
                    ブラウザを開かずに、デスクトップから直接起動。<br />
                    オフラインでも動作し、より快適な操作性を提供します。
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Windows 10/11 (64bit) 対応
                  </p>
                </div>

                {/* 右側: ダウンロードボタン */}
                <a
                  href="https://github.com/Sierra117-KF/rehab-grid/releases/download/v1.0.0/rehab-grid_1.0.0_x64-setup.exe"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                >
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 px-8 text-base border-primary/50 hover:bg-primary/10 hover:border-primary"
                  >
                    <Download className="mr-2 size-5" />
                    ダウンロード
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </ScrollAnimationSection>

        <Footer />
      </main>
    </div>
  );
}
