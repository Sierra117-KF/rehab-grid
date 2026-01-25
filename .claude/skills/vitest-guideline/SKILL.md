---
name: vitest-guideline
description: Vitest v4の仕様・変更点および原則や理念を全て記述しています。テストファイルを編集する際には必ず参照してください。
---

# Vitest v4 テスティングガイドライン

Next.jsプロジェクトにおける「メンテナンスしやすく、信頼性の高いテスト」を実現するためのガイドラインです。

## テスティングの原則と理念

### テスティング・トロフィーの採用

結合テスト（Integration Test）に最も比重を置きます。

- **Static** (ESLint / TypeScript): 文法や型の整合性（開発中に常時）
- **Unit** (単体): 複雑なロジックや util 関数の正当性
- **Integration** (結合): コンポーネント間の連携、ユーザー操作（**最重要**）
- **E2E** (Playwright 等): クリティカルパスの担保

### コア原則

| 原則             | 悪い例                                             | 良い例                                               |
| ---------------- | -------------------------------------------------- | ---------------------------------------------------- |
| 振る舞いをテスト | 内部 state が `isOpen` であることを確認            | ボタン押下でダイアログ表示を確認                     |
| ユーザー視点     | DOM 構造で要素を探す                               | アクセシビリティロールやテキストで探す               |
| 壊れにくさ       | デザイン変更で落ちるテスト                         | デザイン変更に強いテスト                             |
| 独立性           | テスト間で状態を共有                               | テストごとに状態をリセット                           |
| Tautology禁止    | テスト内で実装と同じ計算結果をそのまま期待値にする | 入力と期待値を分離し、外部から観測可能な結果のみ検証 |

### テスト対象の分類

| テスト種別   | 対象                                                 | 環境          |
| ------------ | ---------------------------------------------------- | ------------- |
| **単体**     | utils関数、hooks、Server Actions、Store              | node / jsdom  |
| **結合**     | Client Components、フォームフロー、ページ構成要素   | jsdom         |
| **Browser**  | 実ブラウザ必須の動作、Visual Regression              | Browser Mode  |
| **E2E**      | RSC全体、クリティカルパス                            | Playwright    |

---

## Vitest v4 Breaking Changes

### 設定オプションの移行

| v3 以前                             | v4                               | 説明                     |
| ----------------------------------- | -------------------------------- | ------------------------ |
| `poolOptions.threads.maxThreads`    | `maxWorkers`                     | 最大ワーカー数           |
| `poolOptions.threads.singleThread`  | `maxWorkers: 1, isolate: false`  | シングルスレッド         |
| `poolOptions.vmThreads.memoryLimit` | `vmMemoryLimit`                  | VMメモリ制限             |
| `workspace`                         | `projects`                       | プロジェクト設定         |
| `coverage.all`                      | （削除）                         | `include` で明示指定     |
| `coverage.extensions`               | （削除）                         | `include` パターンで指定 |
| `browser.provider: 'playwright'`    | `browser.provider: playwright()` | 関数形式に変更           |
| `deps.external`                     | `server.deps.external`           | 外部依存設定             |

### 環境変数の変更

```bash
# v3 以前
VITEST_MAX_THREADS=4

# v4
VITEST_MAX_WORKERS=4
```

### インポートパスの変更

```typescript
// v3
import { page, userEvent } from "@vitest/browser/context";

// v4
import { page, userEvent } from "vitest/browser";
```

### テストオプションの位置

```typescript
// v3: オプションは最後
test("example", () => { /* ... */ }, { retry: 2, timeout: 5000 });

// v4: オプションはコールバックの前
test("example", { retry: 2, timeout: 5000 }, () => { /* ... */ });
```

### コンストラクタのモック

```typescript
// v4 - アロー関数はエラー
vi.spyOn(cart, "Apples").mockImplementation(() => ({ getApples: () => 0 }));

// v4 - class（推奨）
vi.spyOn(cart, "Apples").mockImplementation(
  class MockApples {
    getApples() { return 0; }
  }
);
```

### モック関数の巻き上げ（vi.hoisted）

```typescript
// エラー: モック関数がvi.mock内で参照できない
const mockFn = vi.fn();
vi.mock("@/lib/module", () => ({ fn: mockFn }));

// OK: vi.hoisted で事前定義
const { mockFn } = vi.hoisted(() => ({ mockFn: vi.fn() }));
vi.mock("@/lib/module", () => ({ exportedFn: mockFn }));
```

### カバレッジ無視コメント

```typescript
// v3（Istanbul形式）
/* istanbul ignore next */

// v4（V8形式）
/* v8 ignore next */   // 次の行を無視
/* v8 ignore start */  // ここから無視開始
/* v8 ignore stop */   // 無視終了
```

### その他の変更

```typescript
// vi.fn().getMockName() の戻り値: 'spy' → 'vi.fn()'

// invocationCallOrder は v4 で 1 から開始（Jest と同様）
const mockFn = vi.fn();
mockFn();
mockFn();
// v3: [0, 1] → v4: [1, 2]
```

---

## 設定リファレンス

### 基本設定テンプレート（Next.js 用）

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: ["**/node_modules/**", "**/e2e/**", "**/.next/**"],

    // 並列実行設定（v4: トップレベル）
    maxWorkers: "50%",
    minWorkers: 1,

    // カバレッジ設定
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.{ts,tsx}"],  // v4で必須
      exclude: ["src/**/*.test.{ts,tsx}", "src/**/*.d.ts"],
    },

    typecheck: { enabled: true },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### プロジェクト設定（unit/integration/browser分離）

```typescript
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
          isolate: false,
        },
      },
      {
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "jsdom",
          isolate: true,
          maxWorkers: 1,
        },
      },
      {
        test: {
          name: "browser",
          include: ["tests/**/*.browser.test.{ts,tsx}"],
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
```

### カバレッジ設定

```typescript
// v4: include を明示的に指定（必須）
coverage: {
  include: ["src/**/*.{js,jsx,ts,tsx}"],
  exclude: ["**/*.test.{js,jsx,ts,tsx}", "**/node_modules/**"],
  ignoreClassMethods: ["constructor"],
}
```

---

## Next.js 16 対応

### Server Components とテスト戦略

| 対象                   | テスト方法                    |
| ---------------------- | ----------------------------- |
| データフェッチロジック | 別関数に切り出して単体テスト  |
| RSC 全体の動作         | E2E テスト（Playwright）      |
| Client Components      | 結合テスト（Testing Library） |

### 非同期 API（Next.js 15/16）

`params`, `searchParams`, `cookies()`, `headers()` は **Promise** です：

```typescript
// app/posts/[id]/page.tsx
export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;  // Promise型
}) {
  const { id } = await params;
}
```

### ルーターのモック

```typescript
// __mocks__/next-navigation.ts
export const useRouter = vi.fn(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
}));

export const usePathname = vi.fn(() => "/current-path");
export const useSearchParams = vi.fn(
  () => new URLSearchParams({ query: "test" })
);
export const redirect = vi.fn();
export const notFound = vi.fn();

// vitest.config.ts
vi.mock("next/navigation", () => import("./__mocks__/next-navigation"));
```

---

## scripts 例

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:unit": "vitest run --project=unit",
    "test:integration": "vitest run --project=integration",
    "test:browser": "vitest run --project=browser",
    "test:browser:ui": "vitest --project=browser --ui"
  }
}
```

---

## 関連ドキュメント

- [vitest-jsdom.md](vitest-jsdom.md) - jsdom環境での単体テスト・結合テスト
- [vitest-browser.md](vitest-browser.md) - Browser Mode と Visual Regression Testing

---

## v4 移行チェックリスト

```
- [ ] poolOptions → maxWorkers, isolate に移行
- [ ] workspace → projects に移行
- [ ] coverage.include を明示的に指定
- [ ] インポートパスを vitest/browser に更新
- [ ] テストオプションの位置を修正
- [ ] コンストラクタモックを class に修正
- [ ] カバレッジコメントを v8 ignore に更新
- [ ] 環境変数を VITEST_MAX_WORKERS に更新
```
