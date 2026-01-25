import type { MetadataRoute } from "next";

/**
 * 静的エクスポートモード（output: "export"）で必須の設定
 * Route Handlerを静的に事前生成することを明示的に宣言
 */
export const dynamic = "force-static";

/**
 * PWAマニフェスト
 *
 * Web App Manifestを生成し、PWAとしてのインストールを可能にします。
 * Next.js App Routerの規約により、このファイルは自動的に /manifest.webmanifest として配信されます。
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "リハぐり - 自主トレーニング指導箋作成ツール",
    short_name: "リハぐり",
    description:
      "リハビリテーション専門職向け自主トレーニング指導箋作成ツール。完全クライアントサイド動作でセキュリティも安心。",
    start_url: "/training",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#f97316", // オレンジ（ロゴカラー）
    orientation: "portrait-primary",
    categories: ["medical", "health", "productivity"],
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
