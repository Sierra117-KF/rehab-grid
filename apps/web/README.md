# @rehab-grid/web

リハぐり Web版 - PWA対応の自主トレーニング指導箋作成アプリケーション

## 概要

`apps/web` は、リハビリテーションセラピスト向け自主トレーニング指導箋作成ツール「リハぐり」のWeb版実装です。Next.js 16 の静的エクスポート機能を使用し、Cloudflare Pages でホスティングされる完全クライアントサイドアプリケーションです。

### 主な特徴

- **PWA対応**: Service Worker によるオフライン動作、ホーム画面への追加
- **完全ローカル動作**: サーバー通信なし、IndexedDB でデータ永続化
- **静的エクスポート**: CDN配信による高速読み込み

### Desktop版との主な違い

| 項目               | Web版                    | Desktop版                              |
| ------------------ | ------------------------ | -------------------------------------- |
| エントリーポイント | `/` = ランディングページ | `/` = エディタ直接表示                 |
| ヘッダー           | 共有EditorHeader         | Desktop専用ヘッダー + 情報リンク       |
| 起動時モーダル     | なし                     | セキュリティ免責モーダル表示           |
| ファイルアクセス   | Web File API             | Tauri File API（ネイティブダイアログ） |
| CSP                | 標準CSP                  | `ipc:`, `tauri:` スキーム追加          |
| ホスティング       | Cloudflare Pages         | ローカルインストール（Tauri）          |
| オフライン動作     | PWA（Service Worker）    | 完全ネイティブ                         |

## ディレクトリ構造

```
apps/web/
├── public/                         # 静的アセット
│   ├── _headers                    # Cloudflare Pages用セキュリティヘッダー
│   ├── sw.js                       # Service Worker（オフライン対応）
│   ├── sw-register.js              # Service Worker登録スクリプト
│   ├── fonts/                      # 日本語フォント（自動コピー）
│   ├── icons/                      # PWA/ロゴアイコン
│   ├── images/
│   │   ├── og-image.webp           # OGP画像（SNS共有用）
│   │   ├── bento-grid/             # トップページ装飾画像
│   │   └── samples/                # サンプル運動画像（自動コピー）
│   └── templates/                  # テンプレートJSON（自動コピー）
│
├── src/app/                        # Next.js App Router
│   ├── layout.tsx                  # ルートレイアウト（PWA設定、CSP）
│   ├── page.tsx                    # トップページ（アプリ紹介）
│   ├── manifest.ts                 # PWAマニフェスト
│   ├── not-found.tsx               # 404エラーページ
│   ├── (editor)/                   # エディタページグループ
│   │   ├── layout.tsx
│   │   └── training/page.tsx       # /training - エディタ本体
│   └── (info)/                     # 情報ページグループ
│       ├── layout.tsx
│       ├── changelog/page.tsx      # /changelog - 更新履歴
│       ├── privacy/page.tsx        # /privacy - プライバシーポリシー
│       └── terms/page.tsx          # /terms - 利用規約
│
├── tests/                          # 統合テスト（ブラウザモード）
│   ├── setup.browser.ts            # テストセットアップ
│   ├── mocks/browser-common.ts     # 共通モック・ヘルパー
│   └── integration/                # 統合テストファイル
│
├── scripts/
│   └── copy-assets.mjs             # 共有アセット自動コピースクリプト
│
├── package.json
├── next.config.ts                  # Next.js設定（静的エクスポート）
├── tsconfig.json                   # TypeScript設定
├── tsconfig.test.json              # テスト用TypeScript設定
├── vitest.config.ts                # Vitest設定（ブラウザモード）
├── eslint.config.mjs               # ESLint設定
└── postcss.config.mjs              # PostCSS設定
```

## 技術スタック

| カテゴリ       | 技術                | バージョン |
| -------------- | ------------------- | ---------- |
| フレームワーク | Next.js             | 16.1.4     |
| UI             | React               | 19.2.3     |
| 言語           | TypeScript          | ^5         |
| スタイル       | Tailwind CSS        | ^4         |
| アイコン       | lucide-react        | 0.562.0    |
| テスト         | Vitest + Playwright | -          |

### 内部パッケージ依存

```
@rehab-grid/web
    ↓
@rehab-grid/pages → @rehab-grid/ui → @rehab-grid/core
```

## 開発コマンド

```bash
# 開発サーバー起動（アセット自動コピー付き）
pnpm dev

# Turbopack使用の高速開発サーバー
pnpm dev:fast

# 本番ビルド（静的エクスポート）
pnpm build

# ビルド結果のプレビュー
pnpm preview

# リント
pnpm lint

# 型チェック
pnpm type-check

# テスト実行
pnpm test

# アセット手動コピー
pnpm copy-assets
```

## URL構造

| パス         | 説明                                   |
| ------------ | -------------------------------------- |
| `/`          | トップページ（アプリ紹介・導線）       |
| `/training`  | 自主トレーニング指導箋エディタ         |
| `/privacy`   | プライバシーポリシー                   |
| `/terms`     | 利用規約                               |
| `/changelog` | 更新履歴                               |
| `/*`         | 404ページ（5秒後トップへリダイレクト） |

## ページ構成

### トップページ (`/`)

アプリケーションの紹介ページ。以下のセクションで構成：

1. **ヒーローセクション**: タイトル、バージョン表示、メインCTA
2. **機能紹介**: ベンチグリッドレイアウトで3大機能を紹介
3. **FAQセクション**: よくある質問
4. **最新更新情報**: 最新バージョンの変更内容
5. **コールアウト**: 最終CTA

### エディタページ (`/training`)

自主トレーニング指導箋を作成するメインエディタ。`@rehab-grid/pages` の `TrainingPage` コンポーネントを使用。

### 情報ページ (`/privacy`, `/terms`, `/changelog`)

共通レイアウト（Header + Footer）で表示。コンテンツは `@rehab-grid/pages` から提供。

## テスト

### テスト環境

- **実行環境**: Playwright + Chromium（実ブラウザ）
- **フレームワーク**: Vitest
- **ファイル命名**: `*.browser.test.{ts,tsx}`

### テストファイル一覧

| ファイル                                | テスト対象           |
| --------------------------------------- | -------------------- |
| `db.browser.test.ts`                    | IndexedDB操作        |
| `delete-project.browser.test.tsx`       | プロジェクト削除     |
| `dnd.browser.test.tsx`                  | ドラッグ&ドロップ    |
| `export-zip.browser.test.ts`            | ZIPエクスポート      |
| `grid-select.browser.test.tsx`          | グリッド切り替え     |
| `import-project.browser.test.tsx`       | インポート機能       |
| `pdf-export.browser.test.tsx`           | PDF出力              |
| `template-select.browser.test.tsx`      | テンプレート選択     |
| `training-page.browser.test.tsx`        | エディタメインフロー |
| `training-page-mobile.browser.test.tsx` | モバイルビュー       |
| `paste-image.browser.test.tsx`          | 画像ペースト         |

### テスト実行

```bash
# 単発実行
pnpm test

# ルートからフィルター実行
pnpm --filter @rehab-grid/web test
```

## ビルドとデプロイ

### ビルドフロー

```
pnpm build
  ├─ prebuild: アセット自動コピー
  │   └─ packages/assets/ → public/
  └─ next build
      └─ out/ に静的ファイル生成
```

### デプロイ先

- **Cloudflare Pages**: `out/` ディレクトリをデプロイ
- **セキュリティヘッダー**: `public/_headers` で設定

## セキュリティ設定

### Content Security Policy (CSP)

```
default-src 'self';
img-src 'self' blob: data:;
style-src 'self' 'unsafe-inline';
script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval';
font-src 'self';
connect-src 'self';
worker-src 'self' blob:;
frame-src 'self' blob:;
object-src 'none';
base-uri 'self';
```

### その他セキュリティヘッダー

- `X-Frame-Options: DENY` - クリックジャッキング対策
- `X-Content-Type-Options: nosniff` - MIME型嗅ぎ対策
- `Strict-Transport-Security` - HTTPS強制（1年）
- `Permissions-Policy` - 不要なブラウザ機能を無効化

## PWA対応

### マニフェスト設定

- **起動URL**: `/training`（エディタ直接起動）
- **表示モード**: `standalone`
- **テーマカラー**: `#f97316`（オレンジ）

### Service Worker

- **キャッシュ戦略**: キャッシュ優先（Cache First）
- **オフライン対応**: 静的ページとアセットをキャッシュ
- **データ永続化**: IndexedDB（Service Workerとは独立）

## 共有アセットの自動コピー

`scripts/copy-assets.mjs` により、ビルド・開発時に以下のアセットが自動コピーされます：

| コピー元                          | コピー先                 |
| --------------------------------- | ------------------------ |
| `packages/assets/fonts/`          | `public/fonts/`          |
| `packages/assets/images/samples/` | `public/images/samples/` |
| `packages/assets/templates/`      | `public/templates/`      |
| `packages/assets/icons/logo.png`  | `public/icons/logo.png`  |

これらのファイルは `.gitignore` で管理外とし、ビルドごとにクリーンコピーされます。

## OGPメタデータ

SNS（note、X、Facebookなど）でリンク共有時にサムネイル画像とメタ情報が表示されるよう、OGP（Open Graph Protocol）メタデータを設定しています。

### 設定内容

- **OGP画像**: `public/images/og-image.webp`（1200×630px）
- **Twitter Card**: `summary_large_image`（大きな画像カード）

### OGP画像の更新

新しいOGP画像を作成する場合は、`scripts/convert-ogp-image.mjs` を使用して1200×630pxにリサイズ・変換できます：

```bash
node scripts/convert-ogp-image.mjs 元画像.png apps/web/public/images/og-image.webp
```

### 確認方法

デプロイ後、以下のツールでOGPが正しく設定されているか確認できます：

- [OGP確認ツール（ラッコツールズ）](https://rakko.tools/tools/9/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)

## 設定ファイル

### next.config.ts

```typescript
const nextConfig: NextConfig = {
  output: "export", // 静的エクスポート
  images: { unoptimized: true },
  reactStrictMode: true,
  transpilePackages: [
    "@rehab-grid/core",
    "@rehab-grid/ui",
    "@rehab-grid/pages",
  ],
};
```

### vitest.config.ts

```typescript
test: {
  name: "web-browser",
  globals: true,
  browser: {
    enabled: true,
    provider: playwright({ launchOptions: { headless: true } }),
    instances: [{ browser: "chromium" }],
  },
  include: ["tests/**/*.browser.test.{ts,tsx}"],
}
```

## 関連ドキュメント

- [packages/core](../../packages/core/) - コアロジック
- [packages/ui](../../packages/ui/) - UIコンポーネント
- [packages/pages](../../packages/pages/) - 共有ページコンポーネント
- [apps/desktop](../desktop/) - Desktop版（Tauri）
