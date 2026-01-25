import { Footer } from "@rehab-grid/ui/components/layout/Footer";
import { Header } from "@rehab-grid/ui/components/layout/Header";

/**
 * 情報ページ共通レイアウト
 *
 * プライバシーポリシー、利用規約、マニュアル、更新履歴などの
 * 静的コンテンツページ用のレイアウトを提供します。
 *
 * @remarks サーバーコンポーネントとして実装（'use client'なし）
 * @param children - ページコンテンツ
 */
export default function InfoLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      <Header />

      {/* 背景装飾 */}
      <div className="fixed inset-0 z-[-1] bg-noise" />
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] mix-blend-multiply opacity-20" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-accent-secondary/5 blur-[100px] mix-blend-multiply opacity-15" />
      </div>

      {/* メインコンテンツ */}
      <main className="relative pt-24 pb-16 md:pt-32 md:pb-24 px-6">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>

      <Footer />
    </div>
  );
}
