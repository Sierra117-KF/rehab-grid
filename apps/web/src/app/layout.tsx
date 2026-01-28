import "@rehab-grid/ui/styles/globals.css";

import { DisclaimerModalProvider } from "@rehab-grid/ui/components/layout/DisclaimerModalProvider";
import { Toaster } from "@rehab-grid/ui/components/wrapped/Toaster";
import type { Metadata } from "next";
import localFont from "next/font/local";

/** サイトのベースURL */
const SITE_URL = "https://rehaguri.com";
/** サイト名 */
const SITE_NAME = "リハぐり";
/** アプリケーションタイトル（OGP/Twitter共通） */
const APP_TITLE = "リハぐり - 自主トレーニング指導箋作成アプリ";
/** OGP/Twitter用の説明文 */
const OGP_DESCRIPTION =
  "Wordより圧倒的に速い自主トレ指導箋の作成体験。完全ローカル動作で安心。";
/** OGP画像URL */
const OGP_IMAGE_URL = `${SITE_URL}/images/og-image.png`;

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
 * アプリケーションのメタデータ
 */
export const metadata: Metadata = {
  title: APP_TITLE,
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
  openGraph: {
    title: APP_TITLE,
    description: OGP_DESCRIPTION,
    type: "website",
    locale: "ja_JP",
    url: SITE_URL,
    siteName: SITE_NAME,
    images: [
      {
        url: OGP_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: APP_TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: APP_TITLE,
    description: OGP_DESCRIPTION,
    images: [OGP_IMAGE_URL],
  },
};

/**
 * ルートレイアウトコンポーネント
 *
 * アプリケーション全体の共通レイアウトを定義します。
 * フォント設定やテーマクラスの適用を行います。
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
  // Cloudflare Pages以外のサーバーでホストする場合や、`_headers`ファイルが機能しない場合のフォールバックとして設定
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
        {/* PWA / iOS Safari 対応メタタグ */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="リハぐり" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="theme-color" content="#f97316" />
        {/* Service Worker 登録（外部スクリプト） */}
        <script src="/sw-register.js" defer />
      </head>
      <body className={`${notoSansJP.variable} antialiased`}>
        {children}
        <Toaster />
        <DisclaimerModalProvider />
      </body>
    </html>
  );
}
