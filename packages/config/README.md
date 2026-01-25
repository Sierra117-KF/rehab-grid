# @rehab-grid/config

モノレポ全体で共有する設定ファイルを管理するパッケージです。

## 概要

このパッケージは以下の設定を一元管理し、各パッケージから継承して使用します：

- **ESLint**: コード品質・スタイルチェック
- **TypeScript**: 型チェック設定
- **PostCSS**: Tailwind CSS v4 統合

## エクスポート一覧

| エクスポートパス | ファイル | 用途 |
|-----------------|---------|------|
| `@rehab-grid/config/eslint` | `eslint/base.mjs` | ESLint共有設定 |
| `@rehab-grid/config/typescript` | `typescript/base.json` | TypeScript基本設定 |
| `@rehab-grid/config/postcss` | `postcss/postcss.config.mjs` | PostCSS設定 |

---

## ESLint設定

### 設計思想

- **厳格な型安全性**: `typescript-eslint`のstrictTypeChecked設定を採用
- **React/Next.js対応**: React Hooks、アクセシビリティ、Next.js固有ルールを統合
- **一貫したコードスタイル**: import順序、命名規則、JSDoc要件を標準化
- **テスト環境の柔軟性**: テストファイルでは型安全性ルールを緩和

### 含まれるプラグイン・設定

```
dependencies:
├── @eslint/js              # ESLint推奨ルール
├── @vitest/eslint-plugin   # Vitestテストルール
├── eslint-config-next      # Next.js Core Web Vitals
├── eslint-config-prettier  # Prettier競合解決
├── eslint-plugin-import    # インポート検証
├── eslint-plugin-jsdoc     # JSDoc/TSDoc検証
├── eslint-plugin-react     # Reactルール
├── eslint-plugin-react-hooks # React Hooksルール
├── eslint-plugin-simple-import-sort # インポート自動ソート
├── eslint-plugin-testing-library    # Testing Libraryルール
├── eslint-plugin-unused-imports     # 未使用インポート検出
├── globals                 # グローバル変数定義
└── typescript-eslint       # TypeScript ESLint統合
```

### 設定セクション構成

`eslint/base.mjs`は以下の13セクションで構成されています：

| # | セクション名 | 概要 |
|---|-------------|------|
| 1 | global-ignores | 除外パターン（.next, node_modules等） |
| 2 | ベース設定 | JS推奨 + Next.js Core Web Vitals |
| 3 | TypeScript Strict | strictTypeChecked + stylisticTypeChecked |
| 4 | global-settings | グローバル変数、parserOptions |
| 5 | plugins-setup | 共通プラグイン登録（react, react-hooks含む） |
| 6 | main-rules | プロジェクト共通ルール |
| 6.1 | nextjs-app-rules | Next.js専用ルール（apps/**のみ） |
| 7 | jsdoc-rules | JSDoc/TSDoc要件 |
| 8 | javascript-overrides | JSファイルの型チェック無効化 |
| 9 | type-definition-files | .d.ts用設定 |
| 10 | nextjs-special-files | page.tsx等でdefault export許可 |
| 10.1 | pwa-manifest | manifest.tsの命名規則緩和 |
| 11 | test-environment | テストファイル用設定 |
| 12 | browser-mode-tests | ブラウザテスト専用設定 |
| 13 | Prettier | eslint-config-prettier |

### 主要ルール詳細

#### セキュリティ・堅牢性

```javascript
eqeqeq: ["error", "always", { null: "ignore" }]  // 厳密等価演算子必須
"no-eval": "error"              // eval禁止
"no-implied-eval": "error"      // 暗黙eval禁止
curly: ["error", "all"]         // ブロック文必須
"no-param-reassign": "error"    // パラメータ再代入禁止
```

#### TypeScript厳格化

```javascript
"@typescript-eslint/no-explicit-any": "error"      // any禁止
"@typescript-eslint/no-non-null-assertion": "error" // !演算子禁止
"@typescript-eslint/strict-boolean-expressions": ["error", {...}]  // Boolean厳格チェック
"@typescript-eslint/no-floating-promises": "error"  // Promise処理漏れ防止
"@typescript-eslint/consistent-type-imports": ["error", {...}]     // type import統一
```

#### React/Next.js

```javascript
"react/jsx-no-leaked-render": "error"     // &&によるリーク防止
"react/no-array-index-key": "error"       // index key禁止
"react-hooks/exhaustive-deps": "error"    // 依存配列チェック
"@next/next/no-img-element": "error"      // next/image使用強制
```

#### インポート管理

```javascript
"simple-import-sort/imports": "error"       // インポート自動ソート
"simple-import-sort/exports": "error"       // エクスポート自動ソート
"unused-imports/no-unused-imports": "error" // 未使用インポート削除
"import/no-default-export": "error"         // default export禁止（例外あり）
```

### テスト環境での緩和ルール

テストファイル（`**/*.test.{ts,tsx}`, `tests/**/*`等）では以下のルールが無効化されます：

```javascript
"@typescript-eslint/no-explicit-any": "off"
"@typescript-eslint/no-unsafe-argument": "off"
"@typescript-eslint/no-unsafe-assignment": "off"
"@typescript-eslint/no-unsafe-call": "off"
"@typescript-eslint/no-unsafe-member-access": "off"
"@typescript-eslint/no-unsafe-return": "off"
"@typescript-eslint/no-non-null-assertion": "off"
"@typescript-eslint/strict-boolean-expressions": "off"
"@typescript-eslint/no-empty-function": "off"
"no-console": "off"
"react/jsx-no-bind": "off"
"import/no-default-export": "off"
"jsdoc/require-jsdoc": "off"
```

### 各パッケージでの使用方法

各パッケージでは`eslint.config.mjs`を作成し、`tsconfigRootDir`のみを設定します：

```javascript
// packages/*/eslint.config.mjs または apps/*/eslint.config.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";

import baseConfig from "@rehab-grid/config/eslint";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default baseConfig.map((config) => {
  if (!config.languageOptions?.parserOptions) {
    return config;
  }
  return {
    ...config,
    languageOptions: {
      ...config.languageOptions,
      parserOptions: {
        ...config.languageOptions.parserOptions,
        tsconfigRootDir: __dirname,
      },
    },
  };
});
```

---

## TypeScript設定

### base.json

すべてのパッケージが継承する基本設定です。

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "strict": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "jsx": "react-jsx"
  }
}
```

### 主要オプション解説

| オプション | 値 | 説明 |
|-----------|-----|------|
| `strict` | `true` | 厳格モード有効（strictNullChecks等含む） |
| `noUncheckedIndexedAccess` | `true` | 配列/オブジェクトアクセスで`undefined`を考慮 |
| `verbatimModuleSyntax` | `true` | type importの明示的記述を強制 |
| `moduleResolution` | `bundler` | バンドラー向け解決方式 |
| `noEmit` | `true` | 型チェックのみ（Next.jsがトランスパイル） |

### 各パッケージでの使用方法

```json
// packages/*/tsconfig.json
{
  "extends": "@rehab-grid/config/typescript",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

---

## PostCSS設定

### postcss.config.mjs

Tailwind CSS v4用のシンプルな設定です。

```javascript
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

### 各パッケージでの使用方法

```javascript
// apps/*/postcss.config.mjs
export { default } from "@rehab-grid/config/postcss";
```

---

## Vitest設定（参考）

Vitestの設定は**ルートおよび各パッケージで個別管理**しています（このパッケージには含まれません）。

### ルート設定（vitest.config.ts）

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "packages/core/vitest.config.ts",
      "packages/ui/vitest.config.ts",
      "apps/web/vitest.config.ts",
    ],
  },
});
```

### テスト環境

| パッケージ | 環境 | 用途 |
|-----------|------|------|
| `packages/core` | jsdom | ユーティリティ、フック、ストアのユニットテスト |
| `packages/ui` | jsdom | UIコンポーネントのユニットテスト |
| `apps/web` | playwright (browser) | 統合テスト、E2Eテスト |

### 実行コマンド

```bash
pnpm test              # 全テスト（単発実行）
pnpm test:jsdom        # jsdom環境のみ（core + ui）
pnpm test:browser      # ブラウザ環境のみ（web）
pnpm test:watch        # ウォッチモード
pnpm test:coverage     # カバレッジ付き
```

---

## 依存関係管理方針

### このパッケージの役割

- ESLint関連の全依存関係をここに集約
- 各パッケージは`@rehab-grid/config`を参照するだけで済む
- バージョン管理が1箇所で完結

### peerDependencies

```json
{
  "peerDependencies": {
    "eslint": "^9",
    "typescript": "^5"
  }
}
```

各パッケージには以下の最低限のdevDependenciesが必要です：

```json
{
  "devDependencies": {
    "@rehab-grid/config": "workspace:*",
    "eslint": "^9",
    "typescript": "^5"
  }
}
```

---

## 設定の変更・拡張

### ESLintルールの追加・変更

1. `eslint/base.mjs`の該当セクションを編集
2. `pnpm lint`で全パッケージに反映を確認
3. 必要に応じて新しい依存関係を`package.json`に追加

### 新しいプラグインの追加

```bash
# 1. このパッケージに依存関係を追加
cd packages/config
pnpm add eslint-plugin-xxx

# 2. base.mjsでimportしてplugins-setupセクションに追加
```

### パッケージ固有のルール追加

特定パッケージでのみ必要なルールは、そのパッケージの`eslint.config.mjs`で追加設定を行います：

```javascript
// 例: 特定パッケージで追加ルールを設定
import baseConfig from "@rehab-grid/config/eslint";

export default [
  ...baseConfig.map((config) => {
    // tsconfigRootDir設定
  }),
  // パッケージ固有のルール追加
  {
    files: ["src/special/**/*.ts"],
    rules: {
      "some-rule": "warn",
    },
  },
];
```

---

## トラブルシューティング

### ESLintが動作しない

```bash
# 依存関係の再インストール
pnpm install

# ESLintキャッシュのクリア
pnpm lint -- --cache-location .eslintcache && rm -rf .eslintcache
```

### 型エラーが出る

各パッケージの`tsconfig.json`が正しく`@rehab-grid/config/typescript`を継承しているか確認：

```json
{
  "extends": "@rehab-grid/config/typescript"
}
```

### turboキャッシュが古い

```bash
# turboキャッシュのクリア
pnpm turbo clean
```

### 他パッケージの依存モジュールの型が見つからない

モノレポでは、あるパッケージ（例: `apps/web`）のテストファイルが、別パッケージ（例: `packages/core`）の依存モジュールを直接インポートすると、TypeScriptが型を解決できない場合があります。

**症状例:**

```
error TS2307: Cannot find module 'jszip' or its corresponding type declarations.
```

この場合、`jszip`は`packages/core`の`dependencies`に定義されていますが、`apps/web`からは型が見えません。

**原因:**

- pnpmのモノレポでは、各パッケージは独自の`node_modules`を持つ
- TypeScriptはパッケージ境界を超えた間接的な依存関係の型を自動解決しない
- これは依存関係の配置の問題ではなく、**TypeScriptの型解決の問題**

**解決策:**

`tsconfig.test.json`（または該当するtsconfig）の`paths`に、他パッケージの`node_modules`内のモジュールへのパスマッピングを追加します：

```json
{
  "compilerOptions": {
    "paths": {
      // 既存のパスマッピング...
      "@rehab-grid/core": ["../../packages/core/src"],
      "@rehab-grid/core/*": ["../../packages/core/src/*"],
      // 他パッケージの依存モジュールへのパスマッピングを追加
      "jszip": ["../../packages/core/node_modules/jszip"]
    }
  }
}
```

**ポイント:**

- ❌ 依存関係を重複して定義しない（`apps/web`のdevDependenciesに`jszip`を追加するのは避ける）
- ✅ `paths`マッピングで型解決のみを対応する
- ✅ 本番の依存関係は元のパッケージ（`packages/core`）で一元管理を維持

---

## ファイル構成

```
packages/config/
├── eslint/
│   └── base.mjs          # ESLint共有設定（約660行）
├── typescript/
│   └── base.json         # TypeScript基本設定
├── postcss/
│   └── postcss.config.mjs # PostCSS設定
├── package.json          # パッケージ定義・依存関係
└── README.md             # このファイル
```

---

## 変更履歴

### 2026-01-25

- ESLint依存関係を各パッケージからこのパッケージに集約
- React/React Hooksプラグインを`base.mjs`に統合
- テスト環境に`@typescript-eslint/no-unsafe-argument`, `no-unsafe-return`を追加
- トラブルシューティングに「他パッケージの依存モジュールの型が見つからない」を追加
