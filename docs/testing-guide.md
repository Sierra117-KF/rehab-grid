# テストガイド

本プロジェクト（モノレポ構成）のテスト環境に関するガイドです。

## 技術スタック

| カテゴリ             | ライブラリ/ツール                                               |
| -------------------- | --------------------------------------------------------------- |
| テストフレームワーク | Vitest v4                                                       |
| DOMテスト環境        | jsdom                                                           |
| ブラウザテスト       | Playwright (via @vitest/browser-playwright)                     |
| コンポーネントテスト | @testing-library/react                                          |
| ユーザーイベント     | @testing-library/user-event（jsdom）/ vitest/browser（browser） |
| カバレッジ           | @vitest/coverage-v8                                             |

---

## ディレクトリ構造

```
rehab-grid/
├── vitest.config.ts                      # ルート設定（ワークスペース定義）
│
├── packages/
│   ├── core/
│   │   ├── vitest.config.ts              # core パッケージ設定
│   │   └── tests/
│   │       ├── setup.jsdom.ts            # jsdom 環境用セットアップ
│   │       ├── tsconfig.json             # テスト用 TypeScript 設定
│   │       ├── mocks/
│   │       │   └── dnd-kit.tsx           # dnd-kit モック
│   │       ├── hooks/                    # カスタムフックテスト
│   │       ├── lib/                      # ライブラリ関数テスト
│   │       ├── utils/                    # ユーティリティ関数テスト
│   │       └── workers/                  # Web Worker テスト
│   │
│   └── ui/
│       ├── vitest.config.ts              # ui パッケージ設定
│       └── tests/
│           ├── setup.jsdom.ts            # jsdom 環境用セットアップ
│           ├── tsconfig.json             # テスト用 TypeScript 設定
│           ├── mocks/
│           │   ├── dnd-kit.tsx           # dnd-kit モック
│           │   └── next-image.tsx        # next/image モック
│           └── components/               # UIコンポーネントテスト
│
└── apps/
    ├── web/
    │   ├── vitest.config.ts              # web アプリ設定（ブラウザモード）
    │   └── tests/
    │       ├── setup.browser.ts          # ブラウザ環境用セットアップ
    │       ├── tsconfig.json             # テスト用 TypeScript 設定
    │       ├── mocks/
    │       │   └── browser-common.ts     # ブラウザテスト用ヘルパー
    │       └── integration/              # 統合テスト（ブラウザモード）
    │
    └── desktop/
        ├── vitest.config.ts              # desktop アプリ設定
        └── tests/
            ├── setup.jsdom.ts            # jsdom 環境用セットアップ
            └── tsconfig.json             # テスト用 TypeScript 設定
```

---

## テスト環境

本プロジェクトでは **2つのテスト環境** を使い分けています。

### jsdom 環境（通常のテスト）

| 項目               | 内容                                           |
| ------------------ | ---------------------------------------------- |
| **用途**           | 単体テスト、コンポーネントテスト               |
| **対象パッケージ** | `packages/core`, `packages/ui`, `apps/desktop` |
| **ファイル命名**   | `*.test.ts`, `*.test.tsx`                      |
| **セットアップ**   | 各パッケージ内の `tests/setup.jsdom.ts`        |

**特徴**:

- 軽量・高速
- dnd-kit などのブラウザ依存ライブラリはモック化
- @testing-library/user-event を使用

### Browser モード（実ブラウザテスト）

| 項目               | 内容                                        |
| ------------------ | ------------------------------------------- |
| **用途**           | D&D、統合テストなど実ブラウザが必要なテスト |
| **対象パッケージ** | `apps/web`                                  |
| **ファイル命名**   | `*.browser.test.ts`, `*.browser.test.tsx`   |
| **セットアップ**   | `apps/web/tests/setup.browser.ts`           |

**特徴**:

- 実際の Chromium ブラウザで実行
- ライブラリをモックせず実際の動作を検証
- `vitest/browser` から userEvent をインポート

---

## コマンド一覧

すべてのコマンドはモノレポルートから実行します。

```bash
# 全テスト（単発実行）
pnpm test

# ウォッチモード
pnpm test:watch

# Vitest UI
pnpm test:ui

# カバレッジ付き
pnpm test:coverage

# jsdom 環境のみ（core, ui, desktop）
pnpm test:jsdom

# ブラウザ環境のみ（web）
pnpm test:browser

# ブラウザテスト（ウォッチモード）
pnpm test:browser:watch

# ブラウザテスト（ヘッドレス無効 = ブラウザ表示）
pnpm test:browser:ui
```

### パッケージ別実行

```bash
# 特定パッケージのみ
pnpm test --project=core
pnpm test --project=ui
pnpm test --project=web-browser
pnpm test --project=desktop
```

---

## モックファイル

モックファイルは各パッケージの `tests/mocks/` ディレクトリに配置されています。

### dnd-kit.tsx（`packages/core`, `packages/ui`）

jsdom 環境で dnd-kit を使用するコンポーネントをテストするためのモック。

```typescript
// setup.jsdom.ts で自動適用済み
vi.mock("@dnd-kit/core", () => mockDndKitCore);
vi.mock("@dnd-kit/sortable", () => mockDndKitSortable);
vi.mock("@dnd-kit/utilities", () => mockDndKitUtilities);
```

### next-image.tsx（`packages/ui`）

Next.js の Image コンポーネントを標準の `<img>` 要素に置き換えるモック。

```typescript
import { mockNextImage } from "@/tests/mocks/next-image";
vi.mock("next/image", () => mockNextImage);
```

### browser-common.ts（`apps/web`）

ブラウザテスト用の共通ヘルパー・モックファクトリー。

| 関数                      | 用途                                    |
| ------------------------- | --------------------------------------- |
| `createDbMock()`          | IndexedDB (Dexie) のモック              |
| `createNextImageMock()`   | next/image のモック（ブラウザモード用） |
| `createTestMeta()`        | テスト用 ProjectMeta 生成               |
| `createTestItem()`        | テスト用 EditorItem 生成                |
| `getInitialEditorState()` | EditorStore の初期状態生成              |

---

## テスト作成ガイドライン

### 基本原則

1. **振る舞いをテスト**: 内部実装ではなくユーザーから見える振る舞いを検証
2. **ユーザー視点**: DOM構造ではなくロール・ラベル・テキストで要素を探索
3. **独立性**: テスト間で状態を共有しない
4. **Tautology禁止**: テスト内で実装と同じ計算をしない

### クエリの優先順位

```typescript
// 推奨順
screen.getByRole("button", { name: /送信/ }); // 1. ロール
screen.getByLabelText("メールアドレス"); // 2. ラベル
screen.getByPlaceholderText("入力..."); // 3. プレースホルダー
screen.getByText("メッセージ"); // 4. テキスト
screen.getByTestId("submit-button"); // 5. TestId（最終手段）
```

### 非同期処理

```typescript
// 要素の出現を待つ
const message = await screen.findByText("完了");

// 要素の消失を待つ
await waitForElementToBeRemoved(() => screen.getByText("読み込み中..."));

// 複数条件を待つ
await waitFor(() => {
  expect(screen.getByText("成功")).toBeInTheDocument();
  expect(mockCallback).toHaveBeenCalled();
});
```

### ユーザーイベント

```typescript
// jsdom 環境
import userEvent from "@testing-library/user-event";
const user = userEvent.setup();
await user.click(screen.getByRole("button"));
await user.type(screen.getByLabelText("名前"), "山田太郎");

// Browser モード
import { userEvent } from "vitest/browser";
await userEvent.click(page.getByRole("button"));
await userEvent.fill(page.getByLabelText("名前"), "山田太郎");
```

---

## Vitest v4 の注意点

### テストオプションの位置

```typescript
// v4: オプションはコールバックの前
test("example", { retry: 2, timeout: 5000 }, () => {
  /* ... */
});
```

### vi.hoisted によるモック関数の巻き上げ

```typescript
// モック関数を vi.mock 内で参照するには vi.hoisted が必要
const { mockFn } = vi.hoisted(() => ({ mockFn: vi.fn() }));
vi.mock("@/lib/module", () => ({ exportedFn: mockFn }));
```

### コンストラクタのモック

```typescript
// v4 ではアロー関数ではなく class を使用
vi.spyOn(cart, "Apples").mockImplementation(
  class MockApples {
    getApples() {
      return 0;
    }
  },
);
```

### カバレッジ無視コメント

```typescript
/* v8 ignore next */ // 次の行を無視
/* v8 ignore start */ // ここから無視開始
/* v8 ignore stop */ // 無視終了
```

---

## TypeScript 型チェック

テストファイルの型チェックは専用のコマンドを使用してください。

```bash
pnpm type-check:test
```

このコマンドは各パッケージの `tsconfig.test.json` を使用し、テストファイル専用の型解決を行います。

---

## 関連ドキュメント

- [Vitest 公式ドキュメント](https://vitest.dev/)
- [Testing Library 公式ドキュメント](https://testing-library.com/)
- [プロジェクト要件定義](./requirements-definition.md)
