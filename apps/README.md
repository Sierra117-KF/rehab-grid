# apps/

リハぐりのアプリケーション実装ディレクトリ

## 概要

このディレクトリには、異なるプラットフォーム向けのアプリケーション実装が含まれています。各アプリケーションは共通パッケージ（`@rehab-grid/core`, `@rehab-grid/ui`, `@rehab-grid/pages`）を使用し、プラットフォーム固有の設定とカスタマイズのみを保持します。

## 構造

```
apps/
├── desktop/          # Windows版（Tauri 2.x）
│   ├── src/          # Next.js App Router + Desktop専用コンポーネント
│   ├── src-tauri/    # Rust バックエンド
│   └── README.md     # Desktop版詳細ドキュメント
│
└── web/              # Web版（PWA対応）
    ├── src/          # Next.js App Router
    ├── public/       # 静的アセット（Service Worker等）
    └── README.md     # Web版詳細ドキュメント
```

## プラットフォーム比較

| 項目               | Web版                    | Desktop版                              |
| ------------------ | ------------------------ | -------------------------------------- |
| エントリーポイント | `/` = ランディングページ | `/` = エディタ直接表示                 |
| ホスティング       | Cloudflare Pages         | ローカルインストール（Tauri）          |
| オフライン動作     | PWA（Service Worker）    | 完全ネイティブ                         |
| ファイルアクセス   | Web File API             | Tauri File API（ネイティブダイアログ） |

## 開発コマンド

```bash
# Web版開発サーバー
pnpm dev:web

# Desktop版開発（Tauri + Turbopack）
pnpm dev:desktop

# 個別フィルター実行
pnpm --filter @rehab-grid/web dev
pnpm --filter @rehab-grid/desktop tauri:dev:fast
```

## 詳細ドキュメント

- **[Web版 README](./web/README.md)** - PWA、テスト、デプロイ設定
- **[Desktop版 README](./desktop/README.md)** - Tauri、Rust設定、ビルド手順
