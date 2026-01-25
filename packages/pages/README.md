# @rehab-grid/pages

共有ページコンポーネントを提供するパッケージです。Web版・Desktop版で共有されます。

## 概要

このパッケージは、アプリケーション全体で使用されるページレベルのコンポーネントを提供します：

- **TrainingPage**: 自主トレーニング指導箋エディタ（メイン機能）
- **ChangelogPage**: 更新履歴ページ
- **PrivacyPage**: プライバシーポリシーページ
- **TermsPage**: 利用規約ページ

## エクスポート一覧

| エクスポートパス | ファイル | 用途 |
|-----------------|---------|------|
| `@rehab-grid/pages` | `src/index.ts` | 全ページのバレルエクスポート |
| `@rehab-grid/pages/training` | `src/training/TrainingPage.tsx` | エディタページ |
| `@rehab-grid/pages/privacy` | `src/privacy/PrivacyPage.tsx` | プライバシーポリシー |
| `@rehab-grid/pages/terms` | `src/terms/TermsPage.tsx` | 利用規約 |
| `@rehab-grid/pages/changelog` | `src/changelog/ChangelogPage.tsx` | 更新履歴 |

### 使用例

```typescript
// メインエクスポート
import { TrainingPage, ChangelogPage, PrivacyPage, TermsPage } from "@rehab-grid/pages";

// サブパスエクスポート
import { TrainingPage } from "@rehab-grid/pages/training";
import { ChangelogPage } from "@rehab-grid/pages/changelog";
```

---

## ディレクトリ構成

```
packages/pages/
├── src/
│   ├── index.ts                    # バレルエクスポート
│   ├── changelog/                  # 更新履歴ページ
│   │   ├── index.ts
│   │   └── ChangelogPage.tsx
│   ├── privacy/                    # プライバシーポリシーページ
│   │   ├── index.ts
│   │   └── PrivacyPage.tsx
│   ├── terms/                      # 利用規約ページ
│   │   ├── index.ts
│   │   └── TermsPage.tsx
│   └── training/                   # エディタページ
│       ├── index.ts
│       └── TrainingPage.tsx
├── eslint.config.mjs               # ESLint設定
├── tsconfig.json                   # TypeScript設定
└── package.json                    # パッケージ定義
```

---

## ページ一覧

| ページ | レンダリング | URL（Web版） | URL（Desktop版） |
|-------|-------------|-------------|-----------------|
| TrainingPage | クライアント | `/training` | `/` |
| ChangelogPage | サーバー | `/changelog` | `/changelog` |
| PrivacyPage | サーバー | `/privacy` | `/privacy` |
| TermsPage | サーバー | `/terms` | `/terms` |

---

## ページ詳細

### TrainingPage - 自主トレーニング指導箋エディタ

メインのエディタ機能を提供するクライアントコンポーネント（`'use client'`）です。

#### レイアウト構成

**デスクトップ（3カラム）**:
- **左サイドバー（240px）**: 画像ライブラリパネル
- **中央**: キャンバス（ドラッグ&ドロップグリッド）
- **右サイドバー（288px）**: プロパティパネル（選択カード編集）

**モバイル（シングルカラム）**:
- 中央にキャンバスのみ表示
- 画像ライブラリ・プロパティパネルはスライドインサイドバーで表示

#### 主要機能

| 機能 | 説明 |
|------|------|
| カード追加 | 新規カードの作成（最大数制限あり） |
| 画像アップロード | ファイル選択・ドラッグ&ドロップ・クリップボード貼り付け |
| ドラッグ&ドロップ | カードの並び替え、画像のカードへのドロップ |
| プロパティ編集 | タイトル、説明、回数/セット、注意事項の編集 |

#### 使用するフック

```typescript
// @rehab-grid/core から
useEditorStore()       // Zustand ストア（状態管理）
useCanvasImages()      // 画像URL生成（IndexedDB + サンプル画像）
useIsMobile()          // モバイル判定
usePasteImage()        // クリップボード貼り付け
```

#### 使用するUIコンポーネント

```typescript
// @rehab-grid/ui から
Canvas              // ドラッグ&ドロップグリッド
ImageLibraryPanel   // 画像ライブラリ
PropertyPanel       // プロパティ編集パネル
MobileSidebar       // モバイル用スライドインサイドバー
```

---

### ChangelogPage - 更新履歴

タイムラインUIで更新履歴を表示するページです。サーバーコンポーネントとして利用可能（`'use client'`なし）。

#### 特徴

- **タイムラインUI**: 縦線とドットで時系列を視覚化
- **カテゴリ分類**: 機能追加（features）、改善（improvements）、修正（fixes）
- **Latestバッジ**: 最新バージョンを強調表示

#### データソース

更新履歴データは `@rehab-grid/core` の `getSortedEntries()` から取得します。

```typescript
// packages/core/src/lib/changelog/entries.ts
// で定義された ChangelogEntry[] を使用
```

---

### PrivacyPage - プライバシーポリシー

プライバシーポリシーを表示する静的ページです。サーバーコンポーネントとして利用可能。

#### 主要セクション

1. 基本方針（完全クライアントサイド動作）
2. 運営者情報
3. お問い合わせ窓口
4. 個人情報の収集について
5. ガイドライン上の位置づけ
6. データの保存場所（IndexedDB）
7. 外部サービスとの通信・第三者提供
8. Cookieの使用について
9. セキュリティ推奨事項
10. 開示・訂正・削除請求について
11. 要配慮個人情報の入力禁止
12. プライバシーポリシーの改定

---

### TermsPage - 利用規約

利用規約を表示する静的ページです。サーバーコンポーネントとして利用可能。

#### 主要セクション

1. 定義
2. 利用規約への同意
3. サービスの概要
4. 利用条件
5. 免責事項
6. 損害賠償
7. 禁止事項
8. オープンソースライセンス（AGPL-3.0）
9. サービスの変更・終了
10. 規約の変更
11. 準拠法・管轄
12. お問い合わせ

---

## 依存関係

### 内部パッケージ

| パッケージ | 用途 |
|-----------|------|
| `@rehab-grid/ui` | UIコンポーネント（Canvas, Panel等） |
| `@rehab-grid/core` | ストア、フック、定数、型定義 |

### 外部ライブラリ

| ライブラリ | バージョン | 用途 |
|-----------|-----------|------|
| `lucide-react` | 0.563.0 | アイコン（ChangelogPageで使用） |
| `sonner` | 2.0.7 | トースト通知（TrainingPageで使用） |

### peerDependencies

```json
{
  "react": "19.2.3",
  "react-dom": "19.2.3"
}
```

---

## アプリでの使用方法

### Web版（apps/web）

```typescript
// apps/web/src/app/training/page.tsx
import { TrainingPage } from "@rehab-grid/pages";

export default function Page() {
  return <TrainingPage />;
}

// apps/web/src/app/changelog/page.tsx
import { ChangelogPage } from "@rehab-grid/pages";

export default function Page() {
  return <ChangelogPage />;
}
```

### Desktop版（apps/desktop）

```typescript
// apps/desktop/src/app/page.tsx
// Desktop版はルート（/）にエディタを配置
import { TrainingPage } from "@rehab-grid/pages";

export default function Page() {
  return (
    <>
      <DesktopEditorHeader />  {/* Desktop専用ヘッダー */}
      <TrainingPage />
    </>
  );
}
```

### 情報ページのレイアウト

ChangelogPage、PrivacyPage、TermsPageは共通のレイアウトで表示されます：

```typescript
// apps/*/src/app/(info)/layout.tsx
export default function InfoLayout({ children }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-4xl mx-auto px-4 py-12">
        {children}
      </main>
      <Footer />
    </div>
  );
}
```

---

## 関連ファイル

| ファイルパス | 説明 |
|-------------|------|
| `packages/core/src/lib/store/editorStore.ts` | エディタ状態管理（Zustand） |
| `packages/core/src/hooks/useCanvasImages.ts` | 画像URL生成フック |
| `packages/core/src/lib/changelog/entries.ts` | 更新履歴データ定義 |
| `packages/core/src/lib/constants/urls.ts` | 外部URL定数 |
| `packages/ui/src/components/editor/` | エディタUIコンポーネント群 |
| `packages/ui/src/components/layout/` | レイアウトコンポーネント群 |

---

## 開発ガイドライン

### 新しいページを追加する場合

1. `src/{page-name}/` ディレクトリを作成
2. `{PageName}Page.tsx` コンポーネントを実装
3. `index.ts` でre-export
4. `src/index.ts` にバレルエクスポートを追加
5. `package.json` の `exports` にサブパスを追加

### コンポーネントの配置基準

| 種類 | 配置先 |
|------|--------|
| 複数ページで共有するUI | `packages/ui/` |
| 特定ページ専用のUI | 該当ページファイル内 or `packages/ui/` |
| アプリ固有のUI（Desktop専用ヘッダー等） | `apps/*/src/components/` |

### サーバーコンポーネント vs クライアントコンポーネント

- **サーバーコンポーネント推奨**: 静的コンテンツ（法的文書、更新履歴）
- **クライアントコンポーネント必須**: インタラクティブ機能（エディタ）、ブラウザAPI使用

---

## 注意事項

1. **TrainingPageのパフォーマンス**: 画像20枚程度でもスムーズに動作するよう、`useCallback` でメモ化を適用しています

2. **モバイル対応**: `useIsMobile()` フックでブレークポイントを判定し、UIを切り替えます（デスクトップ: 1024px以上）

3. **最大カード数**: `MAX_ITEM_COUNT` 定数で制限されています。上限に達すると追加ボタンが無効化されます

4. **法的文書の更新**: PrivacyPage、TermsPageの内容を変更した場合は、フッターの「最終更新日」も更新してください
