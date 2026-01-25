# Browser Mode & Visual Regression Testing

**「実ブラウザでの動作確認」** — 実際のブラウザ環境でテストを実行します。

---

## jsdom環境とBrowser Modeの使い分け

| 環境             | 用途                                | userEventのインポート元       | レンダリング             |
| ---------------- | ----------------------------------- | ----------------------------- | ------------------------ |
| **jsdom**        | 通常の結合テスト（軽量・高速）      | `@testing-library/user-event` | `@testing-library/react` |
| **Browser Mode** | 実ブラウザが必要・Visual Regression | `vitest/browser`              | `vitest-browser-react`   |

### Browser Mode を使うべき場面

- 実際のブラウザ環境でしか再現できない動作（Canvas、WebGL、Shadow DOM等）
- Visual Regression Testing（スクリーンショット比較）
- ブラウザAPI（`window`、`document`、`localStorage`等）の実際の挙動が必要
- E2Eに近い統合テスト（ただし、E2Eツール（Playwright等）の方が適切な場合も多い）

> **基本方針**: 通常はjsdom環境で十分。上記に該当する場合のみBrowser Modeを使用。

---

## Browser Mode 設定（v4）

### 基本設定

```typescript
import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: playwright(),  // v4: 関数形式（必須）
      // 少なくとも1つのインスタンスが必要
      instances: [{ browser: "chromium" }],  // v4: name → instances
      // ヘッドレスモード（CI用）
      headless: true,
    },
  },
});
```

### v3 → v4 の設定変更

```typescript
// v3
browser: {
  name: "chromium",
  provider: "playwright",
}

// v4
browser: {
  provider: playwright(),  // 関数として呼び出す
  instances: [{ browser: "chromium" }],  // name → instances配列
}
```

### プロジェクト設定での分離（推奨）

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
        },
      },
      {
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "jsdom",
        },
      },
      {
        test: {
          name: "browser",
          // ファイル名規則の例
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

---

## コンポーネントテスト

### React コンポーネントのレンダリング

```typescript
import { render } from "vitest-browser-react";
import { expect, test } from "vitest";
import { page } from "vitest/browser";
import Fetch from "./fetch";

test("読み込みと表示が正しく動作する", async () => {
  // React要素をDOMにレンダリング
  const screen = render(<Fetch url="/greeting" />);

  await screen.getByText("Load Greeting").click();
  // 要素が見つからない場合、エラーをスローする前に待機
  const heading = screen.getByRole("heading");

  // アサート
  await expect.element(heading).toHaveTextContent("hello there");
  await expect.element(screen.getByRole("button")).toBeDisabled();
});
```

### pageロケーターを使用したテスト

```typescript
import { page, userEvent } from "vitest/browser";

test("フォーム入力のハンドリング", async () => {
  render(<MyForm />);  // DOM要素をマウント

  // 初期状態をアサート
  await expect
    .element(page.getByText("Hi, my name is Alice"))
    .toBeInTheDocument();

  // 関連付けられたラベルをクエリしてinput DOM nodeを取得
  const usernameInput = page.getByLabelText(/username/i);

  // userEventを使用して入力（Chrome DevTools Protocol使用）
  await userEvent.fill(usernameInput, "Bob");
  // または locator.fill を使用
  await usernameInput.fill("Bob");

  await expect
    .element(page.getByText("Hi, my name is Bob"))
    .toBeInTheDocument();
});
```

---

## 重要な注意事項

### userEvent のインポート

```typescript
// jsdom環境
import userEvent from "@testing-library/user-event";

// Browser Mode（vitest/browserから）
import { userEvent } from "vitest/browser";
```

**理由**:
- **jsdom環境**: イベントをシミュレート
- **Browser Mode**: 実際にイベントをトリガー（Chrome DevTools Protocol / Webdriver）

### フレームワーク専用レンダリングヘルパー

| パッケージ              | フレームワーク | インストール                        |
| ----------------------- | -------------- | ----------------------------------- |
| `vitest-browser-react`  | React          | `pnpm add -D vitest-browser-react`  |
| `vitest-browser-vue`    | Vue            | `pnpm add -D vitest-browser-vue`    |
| `vitest-browser-svelte` | Svelte         | `pnpm add -D vitest-browser-svelte` |

**コミュニティパッケージ:**
- `vitest-browser-lit` - Lit
- `vitest-browser-preact` - Preact
- `vitest-browser-qwik` - Qwik

---

## Visual Regression Testing

```typescript
test("ホームページの見た目", async () => {
  await page.goto("/");
  await expect(page).toMatchScreenshot();
});

test("ボタンの状態", async () => {
  const button = page.getByRole("button");
  await expect(button).toMatchScreenshot("button-default.png");
  await button.hover();
  await expect(button).toMatchScreenshot("button-hover.png");
});
```

---

## 新しい Expect アサーション

```typescript
// toBeNullable（v4新機能）
expect(null).toBeNullable();
expect("").not.toBeNullable();

// toHaveLength（Locator サポート）
await expect(page.getByRole("listitem")).toHaveLength(5);

// expect.element を使用した DOM アサーション
await expect.element(page.getByText("Hello World")).toBeInTheDocument();
await expect.element(page.getByRole("button")).toBeDisabled();
await expect.element(page.getByText("エラー")).not.toBeInTheDocument();
```

---

## 制限事項

### スレッドブロッキングダイアログ

`alert`や`confirm`などのスレッドブロッキングダイアログはネイティブに使用できません（実行がハングするため）。Vitestはデフォルトモックを提供しますが、テストで使用する場合は明示的にモックしてください。

```typescript
// モック例
vi.spyOn(window, "alert").mockImplementation(() => {});
vi.spyOn(window, "confirm").mockReturnValue(true);
```

### モジュールエクスポートのスパイ

Browser Modeでは、ブラウザのネイティブESMサポートを使用するため、モジュール名前空間オブジェクトは封印されています。`{ spy: true }`オプションを使用してください：

```typescript
// エラーになる
import * as module from "./module.js";
vi.spyOn(module, "method");

// v4での推奨方法
vi.mock("./module.js", { spy: true });
vi.mocked(module.method).mockImplementation(() => {
  // ...
});
```

---

## Browser Mode チェックリスト

- [ ] `instances`配列で設定しているか（`name`ではなく）
- [ ] `provider: playwright()`を関数形式で呼び出しているか
- [ ] `vitest/browser`から`userEvent`をインポートしているか
- [ ] フレームワーク専用レンダリングヘルパー（`vitest-browser-react`等）を使用しているか
- [ ] `expect.element()`を使用してDOM assertionsを行っているか
- [ ] スレッドブロッキングダイアログをモックしているか
- [ ] モジュールスパイに`{ spy: true }`を使用しているか
