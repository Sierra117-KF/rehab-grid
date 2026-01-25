# @rehab-grid/ui

共通UIコンポーネントパッケージです。Web版・Desktop版で共有されるUI要素を提供します。

## 概要

このパッケージは以下を提供します：

- **エディタUI**: 自主トレーニング指導箋エディタのコアコンポーネント
- **レイアウトUI**: ヘッダー、フッター、モーダル等の共通レイアウト
- **PDF生成**: `@react-pdf/renderer` を使用したクライアントサイドPDF生成
- **shadcn/uiラッパー**: プロジェクト固有のカスタマイズを施したUIコンポーネント

## ディレクトリ構成

```
packages/ui/
├── src/
│   ├── index.ts                    # バレルエクスポート
│   ├── components/
│   │   ├── editor/                 # エディタUI
│   │   │   ├── Canvas/             # D&Dグリッド
│   │   │   │   ├── index.tsx
│   │   │   │   ├── EmptyState.tsx
│   │   │   │   └── SortableCard.tsx
│   │   │   ├── EditorHeader/       # ヘッダーメニュー群
│   │   │   │   ├── index.tsx
│   │   │   │   ├── ExportMenu.tsx
│   │   │   │   ├── ImportConfirmDialog.tsx
│   │   │   │   ├── MobileEditorMenu.tsx
│   │   │   │   ├── PdfMenu.tsx
│   │   │   │   └── ProjectInfo.tsx
│   │   │   ├── ImageLibraryPanel/  # 画像ライブラリ
│   │   │   │   ├── index.tsx
│   │   │   │   ├── BulkDeleteControls.tsx
│   │   │   │   ├── CategoryFilter.tsx
│   │   │   │   ├── ImageDropzone.tsx
│   │   │   │   ├── MobileImageButtons.tsx
│   │   │   │   ├── ThumbnailCard.tsx
│   │   │   │   └── ThumbnailGrid.tsx
│   │   │   ├── GridSelectDialog.tsx
│   │   │   ├── PdfPreviewModal.tsx
│   │   │   ├── PrecautionSnippetDialog.tsx
│   │   │   ├── PropertyPanel.tsx
│   │   │   └── TemplateSelectModal.tsx
│   │   ├── layout/                 # レイアウトUI
│   │   │   ├── DisclaimerModalProvider.tsx
│   │   │   ├── FAQ.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── MobileDropdownMenu.tsx
│   │   │   ├── MobileFloatingHeader.tsx
│   │   │   ├── MobileSidebar.tsx
│   │   │   ├── RecentUpdates.tsx
│   │   │   ├── ScrollAnimationSection.tsx
│   │   │   └── SecurityDisclaimerModal.tsx
│   │   ├── pdf/                    # PDF関連
│   │   │   └── TrainingSheetPDF.tsx
│   │   ├── ui/                     # shadcn/ui（直接編集禁止）
│   │   │   ├── alert-dialog.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── hover-card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── select.tsx
│   │   │   └── textarea.tsx
│   │   └── wrapped/                # shadcn/uiラッパー
│   │       ├── AlertDialog.tsx
│   │       ├── Button.tsx
│   │       ├── Dialog.tsx
│   │       ├── DropdownMenu.tsx
│   │       ├── ExternalLink.tsx
│   │       ├── Input.tsx
│   │       ├── Label.tsx
│   │       ├── Textarea.tsx
│   │       └── Toaster.tsx
│   └── styles/
│       └── globals.css             # Tailwind CSS v4 グローバルスタイル
├── tests/                          # テストファイル
│   └── components/
│       ├── editor/                 # エディタコンポーネントテスト（8ファイル）
│       ├── layout/                 # レイアウトコンポーネントテスト（10ファイル）
│       └── pdf/                    # PDFコンポーネントテスト（1ファイル）
├── package.json
├── tsconfig.json
├── eslint.config.mjs
└── vitest.config.ts
```

---

## エクスポート一覧

### package.json exports

| エクスポートパス | ファイル | 用途 |
|-----------------|---------|------|
| `@rehab-grid/ui` | `src/index.ts` | メインエクスポート |
| `@rehab-grid/ui/styles/globals.css` | `src/styles/globals.css` | グローバルスタイル |
| `@rehab-grid/ui/components/*` | `src/components/*` | 個別コンポーネント |

### 使用例

```typescript
// メインエクスポートからインポート（推奨）
import { Canvas, EditorHeader, Button, Dialog } from "@rehab-grid/ui";

// グローバルスタイルのインポート（レイアウトで使用）
import "@rehab-grid/ui/styles/globals.css";

// 個別コンポーネントのインポート（必要な場合のみ）
import { Button } from "@rehab-grid/ui/components/wrapped/Button";
```

---

## コンポーネント詳細

### エディタコンポーネント（editor/）

自主トレーニング指導箋エディタのコア機能を提供します。

| コンポーネント | 説明 | サブコンポーネント |
|--------------|------|------------------|
| `Canvas` | @dnd-kit統合ドラッグ&ドロップグリッド | `EmptyState`, `SortableCard` |
| `EditorHeader` | エクスポート/インポート/PDF出力メニュー | `ExportMenu`, `ImportConfirmDialog`, `PdfMenu`, `ProjectInfo`, `MobileEditorMenu` |
| `ImageLibraryPanel` | 画像アップロード・管理・一括削除 | `BulkDeleteControls`, `CategoryFilter`, `ImageDropzone`, `ThumbnailCard`, `ThumbnailGrid`, `MobileImageButtons` |
| `GridSelectDialog` | グリッドレイアウト選択（1-4列） | - |
| `PdfPreviewModal` | PDFプレビュー表示 | - |
| `PrecautionSnippetDialog` | 注意点スニペット挿入 | - |
| `PropertyPanel` | 選択カードの編集パネル | - |
| `TemplateSelectModal` | プリセットテンプレート選択 | - |

#### Canvas

D&Dによるカード並び替えを実現するメインキャンバスコンポーネント。

```typescript
import { Canvas } from "@rehab-grid/ui";

<Canvas
  items={editorItems}
  layoutType="grid2"
  onItemSelect={handleSelect}
  onReorder={handleReorder}
/>
```

#### EditorHeader

エディタ上部のツールバー。プロジェクト管理、エクスポート、PDF出力機能を提供。

```typescript
import { EditorHeader } from "@rehab-grid/ui";

<EditorHeader
  onTemplateSelect={handleTemplate}
  onGridChange={handleGridChange}
/>
```

#### ImageLibraryPanel

画像のアップロード、サンプル画像の選択、一括削除を管理。

```typescript
import { ImageLibraryPanel } from "@rehab-grid/ui";

<ImageLibraryPanel
  onImageSelect={handleImageSelect}
  onImageUpload={handleUpload}
/>
```

---

### レイアウトコンポーネント（layout/）

アプリケーション全体で使用される共通レイアウト要素。

| コンポーネント | 説明 |
|--------------|------|
| `Header` | ナビゲーションヘッダー |
| `Footer` | フッター（リンク、コピーライト） |
| `FAQ` | FAQアコーディオンセクション |
| `DisclaimerModalProvider` | 免責モーダル表示制御プロバイダー |
| `SecurityDisclaimerModal` | セキュリティ免責事項モーダル |
| `MobileSidebar` | モバイル用サイドバーナビゲーション |
| `MobileFloatingHeader` | モバイル用浮遊ヘッダー |
| `MobileDropdownMenu` | モバイル用ドロップダウンメニュー |
| `RecentUpdates` | 最近の更新情報表示 |
| `ScrollAnimationSection` | スクロールアニメーション付きセクション |

#### FAQ

FAQ_ITEMS定数と組み合わせて使用：

```typescript
import { FAQ, FAQ_ITEMS } from "@rehab-grid/ui";

<FAQ items={FAQ_ITEMS} />
```

#### SecurityDisclaimerModal

初回起動時またはセッション開始時に表示される免責モーダル：

```typescript
import { DisclaimerModalProvider, SecurityDisclaimerModal } from "@rehab-grid/ui";

<DisclaimerModalProvider>
  <App />
  <SecurityDisclaimerModal />
</DisclaimerModalProvider>
```

---

### PDFコンポーネント（pdf/）

`@react-pdf/renderer` を使用したPDF生成コンポーネント。

| コンポーネント | 説明 |
|--------------|------|
| `TrainingSheetPDF` | 自主トレーニング指導箋PDF生成 |

```typescript
import { TrainingSheetPDF } from "@rehab-grid/ui";
import { pdf } from "@react-pdf/renderer";

// PDF Blobを生成
const blob = await pdf(
  <TrainingSheetPDF
    items={editorItems}
    layoutType="grid2"
    title="自主トレーニング指導箋"
  />
).toBlob();
```

**特徴:**

- A4サイズ対応
- 日本語フォント（Noto Sans JP）埋め込み
- キャンバスUIと同一レイアウト

---

### shadcn/ui（ui/）

> **重要**: このディレクトリ内のファイルは**直接編集禁止**です。
> shadcn/uiのアップデート時に上書きされることを前提としています。

| コンポーネント | 説明 |
|--------------|------|
| `alert-dialog` | アラートダイアログ |
| `button` | ボタン |
| `card` | カード |
| `checkbox` | チェックボックス |
| `dialog` | ダイアログ |
| `dropdown-menu` | ドロップダウンメニュー |
| `hover-card` | ホバーカード |
| `input` | 入力フィールド |
| `label` | ラベル |
| `select` | セレクト |
| `textarea` | テキストエリア |

---

### ラッパーコンポーネント（wrapped/）

shadcn/uiをベースに、プロジェクト固有のカスタマイズを施したコンポーネント。

| コンポーネント | ベース | カスタマイズ内容 |
|--------------|-------|----------------|
| `AlertDialog` | alert-dialog | プロジェクト固有スタイル |
| `Button` | button | アイコン統合、ローディング状態 |
| `Dialog` | dialog | アクセシビリティ強化 |
| `DropdownMenu` | dropdown-menu | プロジェクト固有スタイル |
| `ExternalLink` | - | 外部リンク（target="_blank"、セキュリティ属性） |
| `Input` | input | バリデーションスタイル |
| `Label` | label | 必須マーク対応 |
| `Textarea` | textarea | 自動リサイズ対応 |
| `Toaster` | sonner | 通知トースト |

```typescript
// アプリケーションコードでは wrapped/ のコンポーネントを使用
import { Button, Dialog, Input } from "@rehab-grid/ui";

// ❌ ui/ から直接インポートしない
// import { Button } from "@rehab-grid/ui/components/ui/button";
```

---

## 外部依存ライブラリ

| ライブラリ | バージョン | 用途 |
|-----------|-----------|------|
| `@dnd-kit/core` | 6.3.1 | ドラッグ&ドロップ基盤 |
| `@dnd-kit/sortable` | 10.0.0 | ソート機能 |
| `@dnd-kit/utilities` | 3.2.2 | D&Dユーティリティ |
| `@radix-ui/react-*` | 各種 | shadcn/ui基盤（10パッケージ） |
| `@react-pdf/renderer` | 4.3.2 | クライアントサイドPDF生成 |
| `class-variance-authority` | 0.7.1 | CVAスタイリング |
| `clsx` | 2.1.1 | クラス名結合 |
| `lucide-react` | 0.563.0 | アイコン |
| `sonner` | 2.0.7 | トースト通知 |
| `tailwind-merge` | 3.4.0 | Tailwindクラスマージ |

### Radix UIパッケージ一覧

```
@radix-ui/react-alert-dialog
@radix-ui/react-checkbox
@radix-ui/react-dialog
@radix-ui/react-dropdown-menu
@radix-ui/react-hover-card
@radix-ui/react-label
@radix-ui/react-select
@radix-ui/react-slot
```

---

## テスト構成

### 環境

- **テストランナー**: Vitest
- **環境**: jsdom
- **テストファイル数**: 19

### テストファイル配置

```
tests/
└── components/
    ├── editor/          # 8ファイル
    │   ├── Canvas.test.tsx
    │   ├── EditorHeader.test.tsx
    │   ├── GridSelectDialog.test.tsx
    │   ├── ImageLibraryPanel.test.tsx
    │   ├── PdfPreviewModal.test.tsx
    │   ├── PrecautionSnippetDialog.test.tsx
    │   ├── PropertyPanel.test.tsx
    │   └── TemplateSelectModal.test.tsx
    ├── layout/          # 10ファイル
    │   ├── DisclaimerModalProvider.test.tsx
    │   ├── FAQ.test.tsx
    │   ├── Footer.test.tsx
    │   ├── Header.test.tsx
    │   ├── MobileDropdownMenu.test.tsx
    │   ├── MobileFloatingHeader.test.tsx
    │   ├── MobileSidebar.test.tsx
    │   ├── RecentUpdates.test.tsx
    │   ├── ScrollAnimationSection.test.tsx
    │   └── SecurityDisclaimerModal.test.tsx
    └── pdf/             # 1ファイル
        └── TrainingSheetPDF.test.tsx
```

### テスト実行コマンド

```bash
# このパッケージのテストのみ実行
pnpm --filter @rehab-grid/ui test

# ウォッチモード
pnpm --filter @rehab-grid/ui test -- --watch

# カバレッジ付き
pnpm --filter @rehab-grid/ui test -- --coverage
```

---

## 開発ガイドライン

### 新規コンポーネント追加

1. **カテゴリを決定**
   - エディタ機能 → `editor/`
   - 共通レイアウト → `layout/`
   - PDF関連 → `pdf/`
   - shadcn/uiカスタマイズ → `wrapped/`

2. **コンポーネントを作成**

   ```typescript
   // src/components/editor/NewComponent.tsx

   /**
    * 新しいコンポーネントの説明
    */
   export function NewComponent(props: NewComponentProps) {
     // ...
   }
   ```

3. **バレルエクスポートに追加**

   ```typescript
   // src/index.ts
   export { NewComponent } from "./components/editor/NewComponent";
   ```

4. **テストを作成**

   ```typescript
   // tests/components/editor/NewComponent.test.tsx
   import { render, screen } from "@testing-library/react";
   import { NewComponent } from "@/components/editor/NewComponent";

   describe("NewComponent", () => {
     it("renders correctly", () => {
       // ...
     });
   });
   ```

### shadcn/ui コンポーネント追加

1. **shadcn/ui CLIでコンポーネントを追加**

   ```bash
   # プロジェクトルートから実行
   npx shadcn@latest add accordion
   ```

2. **生成されたファイルを `ui/` に配置**

3. **必要に応じて `wrapped/` にラッパーを作成**

4. **`index.ts` にエクスポートを追加**

### shadcn/ui 更新時の注意

- `ui/` ディレクトリは上書き前提
- カスタマイズは必ず `wrapped/` で行う
- 直接 `ui/` を編集した場合、更新時に消失する

---

## 関連ファイル

| ファイルパス | 説明 |
|-------------|------|
| `packages/core/src/hooks/` | UIで使用するカスタムフック |
| `packages/core/src/lib/store/` | Zustandストア定義 |
| `packages/core/src/types/` | 型定義 |
| `packages/pages/src/training/` | TrainingPageでのUI統合 |
| `apps/*/src/app/layout.tsx` | グローバルスタイルのインポート |
