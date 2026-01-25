# リハぐり（Rehab-Grid）プロジェクトガイド

ユーザーへの出力は全て日本語で行ってください

## プロジェクト概要

### 目的

- リハビリテーションセラピストの「自主トレーニング指導箋」作成業務を効率化
- **完全クライアントサイド動作**でセキュリティを担保しつつ、Word より圧倒的に速い作成体験を提供

### コア・バリュー（Word/PPT に対する優位性）

- **自動レイアウト**: 画像を放り込むだけでグリッドが整列
- **定型文入力**: 「20 回 ×3 セット」「痛みが出たら中止」など頻出語句をワンタップで入力
- **完全ローカル**: サーバー送信なしで院内規定に抵触せず即日導入可能

### マルチプラットフォーム対応

- **Web版**: URL直接アクセス（ブラウザから即利用）
- **PWA版**: ホーム画面に追加（モバイルでアプリライク利用）
- **Desktop版**: インストーラー配布（Windows PC向け、Tauri）

---

## 技術スタック

### フレームワーク・ビルドツール

- Next.js 16.x（`output: 'export'`）
- React / React DOM 19.x
- Tauri 2.x
- TypeScript 5.x
- Tailwind CSS 4.x
- Turborepo 2.x
- pnpm workspace

### 状態管理・データ永続化

- `zustand`: グローバル状態管理
- `dexie` / `dexie-react-hooks`: IndexedDB ラッパー
- `zod`: スキーマバリデーション

### UIコンポーネント

- `@radix-ui/react-*`: shadcn/ui 基盤
- `@dnd-kit/*`: ドラッグ＆ドロップ
- `@react-pdf/renderer`: クライアントサイド PDF 生成
- `lucide-react`: アイコン

### ユーティリティ

- `browser-image-compression`: 画像圧縮
- `jszip`: ZIP ファイル生成
- `dompurify`: HTML サニタイズ
- `nanoid`: 一意 ID 生成

---

## ディレクトリ構造

```
rehab-grid/
├── apps/
│   ├── desktop/                # Windows版（Tauri）
│   │   ├── public/             # 静的アセット
│   │   ├── scripts/            # アセットコピースクリプト
│   │   ├── src/
│   │   │   ├── app/            # Next.js App Router
│   │   │   │   ├── page.tsx    # ルートページ（エディタ直接表示）
│   │   │   │   ├── layout.tsx  # ルートレイアウト
│   │   │   │   └── (info)/     # 情報ページグループ
│   │   │   │       ├── layout.tsx
│   │   │   │       ├── changelog/page.tsx
│   │   │   │       ├── privacy/page.tsx
│   │   │   │       └── terms/page.tsx
│   │   │   ├── components/     # Desktop専用コンポーネント
│   │   │   └── hooks/          # Desktop専用カスタムフック
│   │   ├── tests/              # 単体テスト（jsdom）
│   │   ├── src-tauri/          # Rust バックエンド
│   │   └── [設定ファイル群]
│   │
│   └── web/                    # Web版（PWA対応）
│       ├── public/             # 静的アセット（_headers, sw.js等）
│       ├── scripts/            # アセットコピースクリプト
│       ├── src/app/            # Next.js App Router
│       ├── tests/              # 統合テスト（browser mode）
│       └── [設定ファイル群]
│
├── packages/
│   ├── assets/                 # 共有静的アセット（ビルド時に各アプリへ自動コピー）
│   │   ├── fonts/              # 日本語フォント（PDF生成用）
│   │   ├── icons/              # アイコン
│   │   ├── images/samples/     # サンプル画像
│   │   └── templates/          # テンプレート定義
│   │
│   ├── config/                 # 共有設定
│   │   ├── eslint/base.mjs
│   │   ├── postcss/postcss.config.mjs
│   │   └── typescript/base.json
│   │
│   ├── core/                   # 共通ロジック
│   │   ├── src/
│   │   │   ├── index.ts        # バレルエクスポート
│   │   │   ├── hooks/          # カスタムフック
│   │   │   ├── lib/            # DB, Store, Schemas, Constants
│   │   │   ├── types/          # 型定義
│   │   │   ├── utils/          # ユーティリティ関数
│   │   │   └── workers/        # Web Worker
│   │   ├── tests/              # コアロジックテスト
│   │   └── [設定ファイル群]
│   │
│   ├── pages/                  # 共有ページコンポーネント
│   │   ├── src/
│   │   │   ├── index.ts        # バレルエクスポート
│   │   │   ├── changelog/      # 更新履歴
│   │   │   ├── privacy/        # プライバシーポリシー
│   │   │   ├── terms/          # 利用規約
│   │   │   └── training/       # 自主トレーニング指導箋エディタ
│   │   └── [設定ファイル群]
│   │
│   └── ui/                     # 共通UIコンポーネント
│       ├── src/
│       │   ├── index.ts        # バレルエクスポート
│       │   ├── components/
│       │   │   ├── editor/     # エディタUI
│       │   │   ├── layout/     # レイアウトUI
│       │   │   ├── pdf/        # PDF関連
│       │   │   ├── ui/         # shadcn/ui（直接編集禁止）
│       │   │   └── wrapped/    # shadcn/uiラッパー
│       │   └── styles/
│       │       └── globals.css # 共通スタイル
│       ├── tests/              # UIコンポーネントテスト
│       └── [設定ファイル群]
│
├── pnpm-workspace.yaml
├── turbo.json                  # Turborepo設定
├── eslint.config.js            # ルートESLint設定
├── vitest.config.ts            # ルートテスト設定
├── tsconfig.json               # ルートTypeScript設定
├── tsconfig.test.json          # ルートテストTypeScript設定
├── package.json
├── scripts/                    # スクリプト（フォントサブセット生成等）
└── [設定ファイル群]
```

### パッケージ依存関係

```
apps/web, apps/desktop
    ↓
@rehab-grid/pages → @rehab-grid/ui → @rehab-grid/core
                                          ↓
                                    Dexie, Zustand, Zod
```

### 設計方針

- `packages/core/src/lib`: アプリケーション固有のコアロジック（DB、Store、定数、スキーマ）
- `packages/core/src/utils`: 汎用的なヘルパー関数（他プロジェクトでも再利用可能なもの）

**ファイル配置の原則:**

- **定数**: 原則として`packages/core/src/lib/constants` に集約するが、コンポーネント固有で再利用性が低い定数など、管理上コロケーションする方が妥当な場合はこの限りではない
- **型定義**: 原則として`packages/core/src/types` に集約するが、コンポーネント固有の型定義は使用ファイル内で保持する
- **Zodスキーマ**: 原則として`packages/core/src/lib/schemas` に集約

**共通アセットの配置と自動コピー**:

- `packages/assets/`に配置した共通アセットは、ビルド時に実行されるスクリプトによって各アプリの公開ディレクトリへコピーされる
- 各アプリ内へコピーされた共通アセットはgit管理から除外され、ビルドの度にクリーンアップされる

**アプリ固有コンポーネントの配置**:

- 共通UIは `packages/ui/` に配置（Web版・Desktop版で共有）
- アプリ固有のUIカスタマイズが必要な場合は、各アプリの `src/components/` に配置
- 例: `apps/desktop/src/components/DesktopEditorHeader.tsx`（Desktop専用ヘッダー）
- 共有コンポーネントをラップして拡張するパターンを推奨（コードの重複を最小化）

**共有設定パッケージ（`@rehab-grid/config`）**:

モノレポ全体で共有する設定を `packages/config/` に一元管理し、各パッケージから継承して使用する。

- `@rehab-grid/config/eslint`: ESLint共有設定（strictTypeChecked + React/Next.js対応）
- `@rehab-grid/config/typescript`: TypeScript基本設定（strict + noUncheckedIndexedAccess）
- `@rehab-grid/config/postcss`: PostCSS設定（Tailwind CSS v4統合）

- 各パッケージは `extends` または `import` でこれらの設定を継承し、`tsconfigRootDir` のみ個別に設定
- ESLint/TypeScript関連の依存関係は `packages/config` で一元管理（バージョン管理が1箇所で完結）
- 各パッケージには `peerDependencies`（`eslint`, `typescript`）を満たす最小限の `devDependencies` が必要

**モノレポでの型解決と依存関係**:

pnpmモノレポでは、パッケージ境界を超えた間接的な依存関係の型をTypeScriptが自動解決しない場合がある。

例: `apps/web` のテストから `packages/core` の依存モジュール（`jszip` 等）の型が見つからないケース

**対処法（優先順位順）**:

1. **`package.json`に依存関係を追加**（推奨）
   - 使用するパッケージに明示的に依存関係を追加する
   - pnpmワークスペースでは同じバージョンがホイスティングされるため、実質的な重複は発生しない
   - Turbopack / Next.js 16.x で確実に動作する

2. **`tsconfig.test.json`の`paths`でワークスペースパッケージをマッピング**（テスト環境のみ）
   - テスト実行時のみ必要な型解決に限定して使用
   - 例: `"@rehab-grid/core/*": ["../../packages/core/src/*"]`

**禁止事項**:

- ❌ `tsconfig.json`の`paths`で`node_modules`内のパッケージにマッピングしない
  - 理由: Turbopackがpathsをモジュール解決に使用するため、ChunkLoadErrorやバージョン不整合が発生する
  - 例（NG）: `"lucide-react": ["../../packages/ui/node_modules/lucide-react"]`

### テスト環境

- `packages/core`: jsdom（ユーティリティ、フック、ストア）
- `packages/ui`: jsdom（UIコンポーネント）
- `apps/web`: browser（統合テスト）

### テストファイル配置

- 各パッケージの `tests/` ディレクトリに配置
- ブラウザテスト: `*.browser.test.{ts,tsx}`
- jsdomテスト: `*.test.{ts,tsx}`

---

## 開発コマンド

### ルートコマンド（Turborepo経由）

```bash
pnpm dev              # 全アプリ開発サーバー
pnpm dev:web          # Web版のみ
pnpm dev:desktop      # Desktop版（Tauri）

pnpm build            # 全体ビルド
pnpm build:web        # Web版ビルド
pnpm build:desktop    # Desktop版ビルド（インストーラー生成）

pnpm lint             # 全体リント
pnpm lint:fix         # 自動修正付き
pnpm type-check       # 全体型チェック
```

### テストコマンド

```bash
pnpm test             # 全テスト（単発実行）
pnpm test:watch       # ウォッチモード
pnpm test:ui          # Vitest UI
pnpm test:coverage    # カバレッジ付き
pnpm test:jsdom       # jsdom環境のみ（core, ui）
pnpm test:browser     # ブラウザ環境のみ（web）
```

### パッケージ別コマンド

```bash
pnpm --filter @rehab-grid/web type-check
pnpm --filter @rehab-grid/core test
pnpm --filter @rehab-grid/ui lint
```

---

## コーディング規約

### TypeScript / ESLint

- **strictTypeChecked**水準の型チェック
- ESLintルールの緩和（`// eslint-disable`等）は原則禁止
- 緩和が必要な場合は必ずユーザーに確認

### インポート規約

- パッケージ間のインポートはパッケージエイリアス（`@rehab-grid/xxx`）を使用し、相対パスでパッケージ境界を越えないこと
- 同一パッケージ内では `@/` エイリアスまたは相対パスを使用する

### エクスポート規約

- **原則**: 名前付きエクスポート（Named Export）
- **例外**: Next.js特殊ファイル（page.tsx, layout.tsx等）のみデフォルトエクスポート許可

### 命名規則

- コンポーネント: PascalCase
- カスタムフック: use + PascalCase
- ユーティリティ: camelCase
- 型定義: PascalCase
- 定数: SCREAMING_SNAKE_CASE

### useEffect使用禁止

- アプリケーションロジックにおける `useEffect` は原則禁止
- 例外使用時はカスタムフックに隠蔽し、理由をコメントで明記

**代替手段**:

- データ取得 → `useLiveQuery`
- 状態同期 → Zustand Actions
- 操作反応 → イベントハンドラ

**例外（システム制御のみ）**:

- `beforeunload` イベントリスナー
- `ResizeObserver` / `IntersectionObserver`
- File System Access API の変更検知
- サードパーティライブラリ統合

### shadcn/ui ラッパー規約

- `packages/ui/src/components/ui/`: shadcn/ui ベース（**直接編集禁止**）
- `packages/ui/src/components/wrapped/`: プロジェクト固有ラッパー
- カスタマイズが必要なコンポーネントのみラップ

### JSDoc/TSDoc

- TypeScriptファイルの以下の要素にはJSDocコメントを付与すること（ESLint: warn）:
  - 関数宣言（FunctionDeclaration）
  - クラス（ClassDeclaration）
  - interface/type定義
  - exportされた関数・定数
- 型情報はTypeScriptの型システムを使用（JSDoc内で `@param {type}` のような型記述は不要）
- パラメータと戻り値の説明は任意だが、複雑なロジックには記述推奨
- TSDocの標準タグを使用: `@remarks`, `@example`, `@see`, `@public`, `@internal`
- Next.js特殊ファイル、テストファイルはドキュメント不要

### Skills使用規約

- **テストファイル編集時**: 必ず `vitest-guideline` Skills を使用
- **UIコンポーネント作成時**: 必ず `frontend-design` Skills を使用

---

## 非機能要件

### セキュリティ・プライバシー

- **通信遮断**: 外部APIへの送信を一切行わない
- **Content Security Policy（CSP）**:

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

- **Desktop版追加CSP**: `connect-src 'self' ipc: http://ipc.localhost tauri:;`
- **フォント**: `public/fonts/` にローカル配置（CDN不使用）

### パフォーマンス

- 画像20枚程度でもD&Dや文字入力がカクつかない
- エクスポートJSON: 5〜10MB以内
- PDF生成: Web Workerでメインスレッドをブロックしない

---

## 機能要件

### 画像管理機能

- ローカルからのドラッグ＆ドロップ / ファイル選択
- クリップボード貼り付け（Ctrl+V / Cmd+V）
- 取り込み時に自動圧縮（長辺1200px / WebP推奨）
- IndexedDBに**Blob**として保存

### 編集・レイアウト機能

- テンプレート選択（腰痛体操セット等）
- グリッド切替（1～4列）
- カード型編集（D&Dで順序入れ替え）
- スニペット（定型文）挿入

### 保存・復元機能

- IndexedDBへのリアルタイム/オートセーブ
- **軽量JSON形式**（.json）: テキストのみ
- **完全バックアップ形式**（.zip）: JSON + 画像
- インポート時: Zodバリデーション + DOMPurifyサニタイズ

### PDF出力機能

- `@react-pdf/renderer` でクライアントサイド生成
- キャンバスUI上のレイアウト・PDFプレビュー・PDF出力が一致
- A4サイズ、日本語フォント（Noto Sans JP）埋め込み
- Web Worker で生成（メインスレッド非ブロック）

---

## URL構造

### Web版

- `/`: トップページ（アプリ紹介）
- `/training`: 自主トレーニング指導箋エディタ
- `/privacy`: プライバシーポリシー
- `/terms`: 利用規約
- `/changelog`: 更新履歴
- `/*`: 404（5秒後にトップへリダイレクト）

### Desktop版

- `/`: エディタページ（起動時に直接表示、Desktop専用ヘッダー付き）
- `/privacy`: プライバシーポリシー
- `/terms`: 利用規約
- `/changelog`: 更新履歴

**Web版との主なUI差異**:

- ランディングページなし（起動時に即エディタ表示）
- Desktop専用ヘッダー: 情報ページへのリンク（利用規約、プライバシー、更新履歴）をヘッダー上部に配置
- 起動時にセキュリティ免責モーダルを自動表示（セッション/時間ベースの判定）

---

## 開発上の注意点

### 必須遵守事項

1. **外部API通信禁止**: ユーザーデータ・画像データはサーバーに送信しない
2. **完全クライアントサイド動作**: 静的ファイル配信のみ
3. **セキュリティ**: XSS、SQLインジェクション等OWASP Top 10を意識

### 開発3原則

1. **DRY (Don't Repeat Yourself)**: 同じロジックが2箇所以上なら要リファクタリング
2. **KISS (Keep It Simple, Stupid)**: 不必要な複雑性を排除
3. **YAGNI (You Aren't Gonna Need It)**: 現在必要な機能のみ実装

### ファイル作成・編集時の検証

```bash
pnpm type-check       # 型チェック
pnpm lint             # リント
pnpm test             # テスト
```

テストファイル編集時は`pnpm type-check:test`を追加で実行すること
