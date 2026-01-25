# @rehab-grid/desktop

リハぐり Desktop版 - Windows向けネイティブアプリケーション（Tauri 2.x）

## 概要

Desktop版は、Web版と同じNext.jsコードベースをTauriでラップし、Windowsネイティブアプリケーションとして提供します。完全オフライン動作を実現し、病院・クリニックのセキュリティポリシーに準拠した環境で利用できます。

### Web版との主な違い

| 項目               | Desktop版                              | Web版                    |
| ------------------ | -------------------------------------- | ------------------------ |
| エントリーポイント | `/` = エディタ直接表示                 | `/` = ランディングページ |
| ヘッダー           | Desktop専用ヘッダー + 情報リンク       | 共有EditorHeader         |
| 起動時モーダル     | セキュリティ免責モーダル表示           | なし                     |
| ファイルアクセス   | Tauri File API（ネイティブダイアログ） | Web File API             |
| CSP                | `ipc:`, `tauri:` スキーム追加          | 標準CSP                  |
| ホスティング       | ローカルインストール（Tauri）          | Cloudflare Pages         |
| オフライン動作     | 完全ネイティブ                         | PWA（Service Worker）    |

## ディレクトリ構造

```
apps/desktop/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx            # ルートレイアウト（CSP、フォント設定）
│   │   ├── page.tsx              # ルートページ（エディタ直接表示）
│   │   ├── favicon.ico
│   │   └── (info)/               # 情報ページグループ
│   │       ├── layout.tsx        # 情報ページ共通レイアウト
│   │       ├── changelog/page.tsx
│   │       ├── privacy/page.tsx
│   │       └── terms/page.tsx
│   └── components/               # Desktop専用コンポーネント
│       ├── DesktopDisclaimerModalProvider.tsx  # セキュリティ免責モーダル
│       ├── DesktopEditorHeader.tsx             # エディタヘッダー
│       └── DesktopNavFooter.tsx                # 情報ページナビゲーション
│
├── tests/                        # 単体テスト（jsdom環境）
│   ├── setup.jsdom.ts           # テストセットアップ
│   ├── tsconfig.json            # テスト用TypeScript設定
│   ├── components/              # コンポーネントテスト
│   └── mocks/                   # モック
│
├── src-tauri/                    # Rust バックエンド（Tauri）
│   ├── src/
│   │   ├── main.rs              # エントリーポイント
│   │   └── lib.rs               # アプリケーション初期化
│   ├── icons/                   # アプリケーションアイコン
│   ├── capabilities/
│   │   └── default.json         # パーミッション設定
│   ├── tauri.conf.json          # Tauri本体設定
│   ├── tauri.dev-fast.conf.json # 開発用高速設定（Turbopack）
│   ├── Cargo.toml               # Rust依存関係
│   └── build.rs                 # ビルドスクリプト
│
├── public/                       # 静的アセット（ビルド時に自動生成）
│   ├── fonts/                   # 日本語フォント
│   ├── icons/                   # ロゴ
│   ├── images/samples/          # サンプル画像
│   └── templates/               # テンプレート定義
│
├── out/                         # Next.js静的エクスポート出力
├── scripts/
│   └── copy-assets.mjs          # アセットコピースクリプト
│
├── package.json
├── tsconfig.json
├── tsconfig.test.json           # テスト用TypeScript設定
├── vitest.config.ts             # テスト設定
├── next.config.ts
├── eslint.config.mjs
└── postcss.config.mjs
```

## 開発コマンド

### 推奨: Turbopack高速開発

```bash
# Turbopack + Tauri（最速のHMR）
pnpm --filter @rehab-grid/desktop tauri:dev:fast
```

### その他のコマンド

```bash
# 通常開発（Next.js + Tauri）
pnpm --filter @rehab-grid/desktop tauri:dev

# デバッグツール付き開発
pnpm --filter @rehab-grid/desktop tauri:dev:debug

# Next.jsサーバーのみ（ブラウザでプレビュー）
pnpm --filter @rehab-grid/desktop dev

# リント
pnpm --filter @rehab-grid/desktop lint

# 型チェック
pnpm --filter @rehab-grid/desktop type-check
```

## ビルドコマンド

```bash
# 本番ビルド（NSISインストーラー生成）
pnpm --filter @rehab-grid/desktop tauri:build

# デバッグビルド（詳細エラー出力）
pnpm --filter @rehab-grid/desktop tauri:build:debug

# Next.jsビルドのみ
pnpm --filter @rehab-grid/desktop build
```

### ビルド成果物

- **静的ファイル**: `out/` ディレクトリ
- **実行ファイル**: `src-tauri/target/release/app.exe`
- **インストーラー**: `src-tauri/target/release/bundle/nsis/`

## 設定ファイル

### next.config.ts

```typescript
const nextConfig: NextConfig = {
  output: "export", // 静的エクスポート（完全クライアントサイド）
  images: { unoptimized: true }, // 静的環境では画像最適化無効
  transpilePackages: [
    "@rehab-grid/core",
    "@rehab-grid/ui",
    "@rehab-grid/pages",
  ],
};
```

### tauri.conf.json（主要設定）

```json
{
  "productName": "リハぐり",
  "identifier": "com.rehab-grid.app",
  "build": {
    "beforeDevCommand": "pnpm --filter @rehab-grid/desktop dev",
    "devUrl": "http://localhost:3000",
    "beforeBuildCommand": "pnpm --filter @rehab-grid/desktop build",
    "frontendDist": "../out"
  },
  "app": {
    "windows": [
      {
        "title": "リハぐり - 自主トレーニング指導箋作成ツール",
        "width": 1280,
        "height": 800,
        "minWidth": 1024,
        "minHeight": 768
      }
    ]
  },
  "bundle": {
    "targets": ["nsis"]
  }
}
```

### capabilities/default.json（パーミッション）

```json
{
  "permissions": [
    "core:default", // Tauri コアAPI
    "dialog:default", // ファイル開く/保存ダイアログ
    "fs:default" // ファイルシステムアクセス
  ]
}
```

## Desktop専用コンポーネント

### DesktopEditorHeader

Web版の`EditorHeader`をラップし、情報ページへのリンクを追加したDesktop専用ヘッダー。

```typescript
// src/components/DesktopEditorHeader.tsx
export function DesktopEditorHeader() {
  return (
    <>
      {/* 情報リンクバー（利用規約、プライバシー、更新履歴） */}
      <div className="...">
        <Link href="/terms">利用規約</Link>
        <Link href="/privacy">プライバシー</Link>
        <Link href="/changelog">更新履歴</Link>
      </div>
      {/* 既存のEditorHeader */}
      <EditorHeader />
    </>
  );
}
```

### DesktopDisclaimerModalProvider

Desktop版の起動時にセキュリティ免責モーダルを自動表示するプロバイダーコンポーネント。

- **表示条件**: セッション開始時、または前回の承認から24時間経過後
- **目的**: 医療機関で使用される可能性を考慮し、免責事項への同意を定期的に確認
- **状態管理**: `sessionStorage` でセッション内の表示済みフラグを管理

```typescript
// src/components/DesktopDisclaimerModalProvider.tsx
export function DesktopDisclaimerModalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // セッション開始時または24時間経過後に免責モーダルを表示
  // ユーザーが承認するまでメインコンテンツをブロック
}
```

### DesktopNavFooter

情報ページ（利用規約、プライバシー、更新履歴）共通のナビゲーションフッター。

- エディタへ戻るリンクと情報ページ間のナビゲーションを提供
- 情報ページ専用レイアウト `(info)/layout.tsx` で使用

```typescript
// src/components/DesktopNavFooter.tsx
export function DesktopNavFooter() {
  return (
    <footer className="...">
      <Link href="/">← エディタに戻る</Link>
      <nav>
        <Link href="/terms">利用規約</Link>
        <Link href="/privacy">プライバシー</Link>
        <Link href="/changelog">更新履歴</Link>
      </nav>
    </footer>
  );
}
```

## セキュリティ設定

### Content Security Policy（CSP）

Desktop版では、Tauri IPC通信のため追加のCSP設定が必要です。

```
connect-src 'self' ipc: http://ipc.localhost tauri:;
```

- `ipc:` - Tauri IPCメッセージング
- `http://ipc.localhost` - ローカルIPC通信
- `tauri:` - Tauriスキーム

### 開発時の注意

開発環境では`'unsafe-eval'`が必要（HMR対応）、本番では`'wasm-unsafe-eval'`のみ許可。

## Rustバックエンド

### lib.rs（プラグイン初期化）

```rust
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())  // ファイルダイアログ
    .plugin(tauri_plugin_fs::init())      // ファイルシステム
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
```

### 使用プラグイン

| プラグイン            | 用途                         |
| --------------------- | ---------------------------- |
| `tauri-plugin-dialog` | ネイティブファイルダイアログ |
| `tauri-plugin-fs`     | ファイルシステムアクセス     |
| `tauri-plugin-log`    | デバッグ時ログ出力           |

## アセット管理

### 自動コピーの仕組み

`scripts/copy-assets.mjs`が`predev`/`prebuild`フックで実行され、共有アセットをコピーします。

```
packages/assets/
  ├── fonts/           → public/fonts/
  ├── images/samples/  → public/images/samples/
  ├── templates/       → public/templates/
  └── icons/logo.png   → public/icons/logo.png
```

### Git管理

`public/`内の自動生成ファイルは`.gitignore`で除外されています。

## 依存関係

### Node.js（package.json）

```
@rehab-grid/desktop
├── @rehab-grid/core      # コアロジック
├── @rehab-grid/ui        # UIコンポーネント
├── @rehab-grid/pages     # ページコンポーネント
├── @tauri-apps/api       # Tauri JavaScript API
├── @tauri-apps/plugin-*  # Tauriプラグイン
├── next                  # Next.js 16.x
├── react / react-dom     # React 19.x
└── typescript            # TypeScript 5.x
```

### Rust（Cargo.toml）

```
app
├── tauri                 # Tauri 2.x
├── tauri-plugin-dialog   # ダイアログ
├── tauri-plugin-fs       # ファイルシステム
├── tauri-plugin-log      # ログ
├── serde / serde_json    # シリアライズ
└── log                   # ログユーティリティ
```

## トラブルシューティング

### アセットが見つからない

```bash
pnpm --filter @rehab-grid/desktop copy-assets
```

### CSPエラー

`tauri.conf.json`のCSP設定に`ipc:`と`tauri:`が含まれているか確認。

### ビルド失敗

1. Rustインストール確認: `rustc --version`
2. WebView2 Runtime確認（Windows 10/11必須）
3. キャッシュクリア:
   ```bash
   rm -rf src-tauri/target
   pnpm install
   ```

### 開発サーバーが起動しない

```bash
# ポート3000が使用中の場合
netstat -ano | findstr :3000
# または別ポートで起動
PORT=3001 pnpm --filter @rehab-grid/desktop dev
```

## URL構造

| パス         | 内容                         |
| ------------ | ---------------------------- |
| `/`          | エディタページ（メイン機能） |
| `/terms`     | 利用規約                     |
| `/privacy`   | プライバシーポリシー         |
| `/changelog` | 更新履歴                     |

## テスト

### テスト環境

Desktop版のテストはjsdom環境で実行されます。Vitestを使用し、Desktop専用コンポーネントの動作を検証します。

### テストコマンド

```bash
# テスト実行
pnpm --filter @rehab-grid/desktop test

# ウォッチモード
pnpm --filter @rehab-grid/desktop test:watch

# カバレッジ付き
pnpm --filter @rehab-grid/desktop test:coverage
```

### テストファイル構成

| ファイル                                  | 対象コンポーネント               |
| ----------------------------------------- | -------------------------------- |
| `DesktopDisclaimerModalProvider.test.tsx` | セキュリティ免責モーダルの表示   |
| `DesktopEditorHeader.test.tsx`            | Desktop専用ヘッダーのレンダリング |
| `DesktopNavFooter.test.tsx`               | ナビゲーションフッターのリンク   |

### モック

- `tests/mocks/next-image.tsx`: `next/image` コンポーネントのモック（静的テスト環境対応）

## 技術的特徴

1. **完全オフライン動作** - インターネット接続不要
2. **ネイティブファイルダイアログ** - OS標準UIでファイル操作
3. **セキュリティファースト** - 外部通信なし、厳格なCSP
4. **高速開発** - Turbopack + Tauri HMR
5. **共通コードベース** - Web版と同じReactコンポーネントを使用
