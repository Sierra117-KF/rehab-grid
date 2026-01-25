# packages ディレクトリ

モノレポ（Turborepo）で共有される内部パッケージ群です。アプリケーション（`apps/web`, `apps/desktop`）から利用される共通機能を提供します。

## パッケージ一覧

| パッケージ | 説明 | 依存先 |
|-----------|------|--------|
| [@rehab-grid/assets](#rehab-gridassets) | 共有静的アセット（フォント、画像、テンプレート） | - |
| [@rehab-grid/config](#rehab-gridconfig) | 共有設定（ESLint, TypeScript, PostCSS） | - |
| [@rehab-grid/core](#rehab-gridcore) | コアロジック（DB, Store, Utils, Hooks） | - |
| [@rehab-grid/ui](#rehab-gridui) | 共通UIコンポーネント | core |
| [@rehab-grid/pages](#rehab-gridpages) | 共有ページコンポーネント | ui, core |

## 依存関係図

```
apps/web & apps/desktop
        │
        ▼
  @rehab-grid/pages
        │
        ▼
  @rehab-grid/ui
        │
        ▼
  @rehab-grid/core ◄── @rehab-grid/config (設定継承)
        │
        ▼
  @rehab-grid/assets (ビルド時コピー)
```

---

## @rehab-grid/assets

[詳細はこちら](./assets/README.md)

共有静的アセット。ビルド時に各アプリの `public/` ディレクトリへ自動コピーされます。

### ディレクトリ構成

```
assets/
├── fonts/              # PDF生成用日本語フォント
│   ├── NotoSansJP-Regular.woff
│   └── NotoSansJP-Bold.woff
├── icons/              # アプリアイコン
│   └── logo.png
├── images/
│   └── samples/        # サンプル画像（44枚）
│       ├── standing/   # 立位（10枚）
│       ├── sitting/    # 座位（12枚）
│       └── lying/      # 臥位（22枚）
└── templates/          # プリセットテンプレート（8種類）
    ├── low-back-pain/
    ├── shoulder-stiffness/
    ├── swallowing/
    └── ...
```

### 特徴

- **git管理対象外**: コピー先のアセットは `.gitignore` で除外
- **WebP形式**: 画像はファイルサイズ最適化済み（14-79KB/枚）
- **テンプレート**: 各テンプレートは `project.json` + 画像ファイルで構成

---

## @rehab-grid/config

[詳細はこちら](./config/README.md)

モノレポ全体で共有する設定ファイルの一元管理パッケージ。

### エクスポート

```javascript
// ESLint設定
import eslintConfig from "@rehab-grid/config/eslint";

// TypeScript設定（tsconfig.json の extends で使用）
{ "extends": "@rehab-grid/config/typescript" }

// PostCSS設定
import postcssConfig from "@rehab-grid/config/postcss";
```

### ESLint設定の特徴

- **strictTypeChecked** 水準の厳格な型チェック
- React / Next.js / Vitest 対応
- JSDoc 要件（export関数にドキュメント必須）
- 13セクション構成による細かな制御

### TypeScript設定の特徴

```json
{
  "target": "ES2022",
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "moduleResolution": "bundler"
}
```

### 管理する依存関係

ESLint関連の依存関係はすべてこのパッケージで一元管理：
- `typescript-eslint` (v8.53)
- `eslint-config-next` (v16.1.4)
- `eslint-plugin-react` / `react-hooks`
- `eslint-plugin-jsdoc`
- `@vitest/eslint-plugin`

---

## @rehab-grid/core

[詳細はこちら](./core/README.md)

アプリケーション共通のコアロジック、ユーティリティ、型定義を提供。

### エクスポート

```typescript
// メインエクスポート
import { db, useEditorStore, CONSTANTS } from "@rehab-grid/core";

// サブパスエクスポート
import { useImageUpload } from "@rehab-grid/core/hooks/useImageUpload";
import { projectFileSchema } from "@rehab-grid/core/lib/schemas/project";
import type { EditorItem, ProjectFile } from "@rehab-grid/core/types";
```

### ディレクトリ構成

```
core/src/
├── index.ts            # バレルエクスポート
├── hooks/              # カスタムフック（7個）
├── lib/
│   ├── db/             # Dexie IndexedDB
│   ├── store/          # Zustand ストア
│   ├── schemas/        # Zod スキーマ
│   ├── constants/      # 定数定義
│   ├── templates/      # テンプレートメタデータ
│   └── changelog/      # 更新履歴データ
├── types/              # 型定義
├── utils/              # ユーティリティ関数
└── workers/            # Web Worker
```

### 主要モジュール

#### カスタムフック

| フック名 | 用途 |
|---------|------|
| `useCanvasImages` | IndexedDB + サンプル画像のURL生成 |
| `useImageUpload` | ファイル選択による画像アップロード |
| `usePasteImage` | クリップボード貼り付け（Ctrl+V） |
| `useObjectUrls` | Object URL のライフサイクル管理 |
| `useMediaQuery` | レスポンシブ判定（モバイル検出） |
| `usePdfWorker` | Web Worker による非同期PDF生成 |
| `useHasEditorHistory` | undo/redo 可能状態判定 |

#### Zustand ストア

```typescript
// エディタ状態管理
const { items, addNewItem, updateItem } = useEditorStore();

// モーダル状態管理
const { openModal, closeModal } = useModalStore();
```

#### データベース（Dexie IndexedDB）

```typescript
import { db, saveProject, loadProject, saveImage } from "@rehab-grid/core";

// プロジェクト保存・読み込み
await saveProject(projectData);
const project = await loadProject();

// 画像保存・取得
await saveImage(id, blob, fileName);
const image = await getImage(id);
```

#### Zod スキーマ

```typescript
import { projectFileSchema } from "@rehab-grid/core/lib/schemas/project";

// インポート時のバリデーション
const result = projectFileSchema.safeParse(importedData);
```

#### ユーティリティ

| ファイル | 機能 |
|---------|------|
| `export.ts` | JSON/ZIP エクスポート・インポート |
| `image.ts` | 画像圧縮・処理（長辺1200px, WebP推奨） |
| `pdf.ts` | PDF生成ヘルパー |
| `editor.ts` | エディタロジック（並び替え等） |
| `template.ts` | テンプレート読み込み |
| `download.ts` | ファイルダウンロード処理 |
| `debounce.ts` | debounce関数 |

### 主要な型定義

```typescript
// エディタアイテム
type EditorItem = {
  id: string;
  order: number;
  title: string;
  imageSource: string;
  description: string;
  dosages?: Dosages;
  precautions: Precaution[];
};

// プロジェクトファイル
type ProjectFile = {
  meta: ProjectMeta;
  settings: ProjectSettings;
  items: EditorItem[];
};

// グリッドレイアウト
type LayoutType = "grid1" | "grid2" | "grid3" | "grid4";
```

### 外部依存ライブラリ

| ライブラリ | バージョン | 用途 |
|-----------|-----------|------|
| zustand | 5.0.10 | グローバル状態管理 |
| dexie | 4.2.1 | IndexedDB ラッパー |
| zod | 4.3.5 | スキーマバリデーション |
| @react-pdf/renderer | 4.3.2 | PDF生成 |
| browser-image-compression | 2.0.2 | 画像圧縮 |
| jszip | 3.10.1 | ZIP生成 |
| dompurify | 3.3.1 | XSS対策 |
| nanoid | 5.1.6 | ID生成 |

---

## @rehab-grid/ui

[詳細はこちら](./ui/README.md)

共通UIコンポーネント。Web版・Desktop版で共有されます。

### エクスポート

```typescript
// メインエクスポート
import { Canvas, EditorHeader, PropertyPanel } from "@rehab-grid/ui";

// サブパスエクスポート
import { Button } from "@rehab-grid/ui/components/wrapped/Button";

// グローバルスタイル
import "@rehab-grid/ui/styles/globals.css";
```

### ディレクトリ構成

```
ui/src/
├── index.ts                    # バレルエクスポート
├── components/
│   ├── editor/                 # エディタUI
│   │   ├── Canvas/             # ドラッグ&ドロップグリッド
│   │   ├── EditorHeader/       # ヘッダー（メニュー群）
│   │   ├── ImageLibraryPanel/  # 画像ライブラリ
│   │   ├── PropertyPanel.tsx   # プロパティパネル
│   │   └── ...
│   ├── layout/                 # レイアウトUI
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── FAQ.tsx
│   │   └── ...
│   ├── pdf/                    # PDF関連
│   │   └── TrainingSheetPDF.tsx
│   ├── ui/                     # shadcn/ui（直接編集禁止）
│   └── wrapped/                # shadcn/ui ラッパー
└── styles/
    └── globals.css             # Tailwind CSS v4
```

### 主要コンポーネント

#### エディタコンポーネント

| コンポーネント | 説明 |
|--------------|------|
| `Canvas` | @dnd-kit 統合ドラッグ&ドロップグリッド |
| `EditorHeader` | エクスポート/インポート/PDF出力メニュー |
| `ImageLibraryPanel` | 画像アップロード・管理・一括削除 |
| `PropertyPanel` | 選択カードの編集パネル |
| `GridSelectDialog` | グリッドレイアウト選択（1-4列） |
| `TemplateSelectModal` | テンプレート選択 |
| `PdfPreviewModal` | PDFプレビュー |
| `PrecautionSnippetDialog` | 注意点スニペット挿入 |

#### レイアウトコンポーネント

| コンポーネント | 説明 |
|--------------|------|
| `Header` | ナビゲーションヘッダー |
| `Footer` | フッター |
| `FAQ` | FAQセクション |
| `SecurityDisclaimerModal` | セキュリティ免責事項モーダル |
| `MobileSidebar` | モバイルサイドバー |
| `MobileFloatingHeader` | モバイル浮遊ヘッダー |

#### shadcn/ui ラッパー

`ui/` ディレクトリの shadcn/ui コンポーネントは**直接編集禁止**。カスタマイズが必要な場合は `wrapped/` にラッパーを作成：

```typescript
// wrapped/Button.tsx - プロジェクト固有のスタイル拡張
import { Button as ShadcnButton } from "../ui/button";
export const Button = ({ ... }) => { ... };
```

### 外部依存ライブラリ

| ライブラリ | バージョン | 用途 |
|-----------|-----------|------|
| @dnd-kit/core | 6.3.1 | ドラッグ&ドロップ |
| @dnd-kit/sortable | 10.0.0 | ソート機能 |
| @radix-ui/react-* | 各種 | shadcn/ui 基盤（10パッケージ） |
| class-variance-authority | 0.7.1 | CVAスタイリング |
| sonner | 2.0.7 | トースト通知 |

---

## @rehab-grid/pages

[詳細はこちら](./pages/README.md)

共有ページコンポーネント。Web版・Desktop版で共有されます。

### エクスポート

```typescript
// メインエクスポート
import { TrainingPage, ChangelogPage, PrivacyPage, TermsPage } from "@rehab-grid/pages";

// サブパスエクスポート
import { TrainingPage } from "@rehab-grid/pages/training";
```

### ページ一覧

| ページ | パス | 説明 |
|-------|------|------|
| `TrainingPage` | /training (Web) / / (Desktop) | 自主トレーニング指導箋エディタ |
| `ChangelogPage` | /changelog | 更新履歴 |
| `PrivacyPage` | /privacy | プライバシーポリシー |
| `TermsPage` | /terms | 利用規約 |

### TrainingPage の構成

3カラムレイアウト：
- **左**: ImageLibraryPanel（画像ライブラリ）
- **中央**: Canvas（編集キャンバス）
- **右**: PropertyPanel（プロパティパネル）

モバイル時はシングルカラム + フローティングボタンで切り替え。

---

## テスト構成

各パッケージの `tests/` ディレクトリにテストファイルを配置。

### テスト環境

| パッケージ | 環境 | テストファイル数 |
|-----------|------|-----------------|
| core | jsdom | 21 |
| ui | jsdom | 19 |
| pages | - | - |

### テストコマンド

```bash
# 全テスト実行
pnpm test

# パッケージ別
pnpm --filter @rehab-grid/core test
pnpm --filter @rehab-grid/ui test

# jsdom環境のみ
pnpm test:jsdom

# ウォッチモード
pnpm test:watch
```

### テストファイル命名規則

- jsdomテスト: `*.test.{ts,tsx}`
- ブラウザテスト: `*.browser.test.{ts,tsx}`

---

## 開発ガイドライン

### インポート規約

```typescript
// パッケージ間: パッケージエイリアス使用
import { useEditorStore } from "@rehab-grid/core";

// パッケージ内: @/ エイリアスまたは相対パス
import { debounce } from "@/utils/debounce";
```

### 新規コンポーネント追加時

1. **UIコンポーネント**: `packages/ui/src/components/` に配置
2. **ページコンポーネント**: `packages/pages/src/` に配置
3. **アプリ固有UI**: 各アプリの `src/components/` に配置

### 新規フック追加時

1. `packages/core/src/hooks/` に実装
2. `packages/core/src/index.ts` にエクスポート追加
3. `packages/core/tests/hooks/` にテスト追加

### 定数追加時

1. `packages/core/src/lib/constants/` に追加
2. 関連する `index.ts` にエクスポート追加
