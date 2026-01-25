import "@rehab-grid/ui/styles/globals.css";

import { Toaster } from "@rehab-grid/ui/components/wrapped/Toaster";
import type { Metadata } from "next";
import localFont from "next/font/local";

import { DesktopDisclaimerModalProvider } from "@/components/DesktopDisclaimerModalProvider";
import { DesktopNavFooter } from "@/components/DesktopNavFooter";

/**
 * Noto Sans JP ローカルフォント設定
 * サブセット化されたフォントファイルを使用（CSP準拠）
 */
const notoSansJP = localFont({
  src: [
    {
      path: "../../public/fonts/NotoSansJP-Regular.woff",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/NotoSansJP-Bold.woff",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

/**
 * アプリケーションのメタデータ（Desktop版）
 */
export const metadata: Metadata = {
  title: "リハぐり - 自主トレーニング指導箋作成アプリ",
  description:
    "リハビリテーションセラピスト向け「自主トレーニング指導箋」作成アプリ。Wordより圧倒的に速い作成体験を提供します。完全クライアントサイド動作でセキュリティも安心。",
  keywords: [
    "リハビリ",
    "自主トレーニング",
    "指導箋",
    "PT",
    "OT",
    "ST",
    "理学療法士",
    "作業療法士",
    "言語聴覚士",
  ],
  authors: [{ name: "リハぐり開発チーム" }],
};

/**
 * ルートレイアウトコンポーネント（Desktop版）
 *
 * Tauriデスクトップアプリケーション用のルートレイアウトを定義します。
 * PWA関連の設定は削除されています。
 *
 * @param children - 子コンポーネント（ページコンテンツ）
 * @returns HTML構造を持つルートレイアウト
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // セキュリティCSP設定
  // Next.jsの `output: 'export'` (静的エクスポート) では、サーバーサイドでのNonce生成が不可能
  // ハイドレーションスクリプトを実行するには `'unsafe-inline'` が技術的に必須
  // 本番環境: script-src 'self' 'unsafe-inline'
  // 開発環境: HMR対応の為、'unsafe-eval' も許可
  const isDev = process.env.NODE_ENV === "development";
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'";
  // Tauri環境でのIPC通信を許可するため、connect-srcにipc:とtauri:を追加
  const csp = `default-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; ${scriptSrc}; font-src 'self'; connect-src 'self' ipc: http://ipc.localhost tauri:; worker-src 'self' blob:; frame-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self';`;

  return (
    <html lang="ja">
      <head>
        <meta httpEquiv="Content-Security-Policy" content={csp} />
        <meta name="theme-color" content="#f97316" />
      </head>
      <body className={`${notoSansJP.variable} antialiased`}>
        <div className="grid h-screen grid-rows-[1fr_auto] overflow-hidden">
          <div className="min-h-0 overflow-hidden">{children}</div>
          <DesktopNavFooter />
        </div>
        <Toaster />
        <DesktopDisclaimerModalProvider />
      </body>
    </html>
  );
}
