/**
 * @rehab-grid/config - 共有ESLint設定
 *
 * このファイルは既存のeslint.config.jsの規約を一切緩めずに移植したものです。
 * 各パッケージ（packages/*, apps/*）でこの設定を継承して使用します。
 *
 * React/React Hooksプラグインは標準で含まれているため、
 * 各パッケージではtsconfigRootDirの設定のみが必要です。
 *
 * 使用例:
 * ```js
 * // packages/core/eslint.config.mjs
 * import baseConfig from "@rehab-grid/config/eslint";
 * import path from "node:path";
 * import { fileURLToPath } from "node:url";
 *
 * const __filename = fileURLToPath(import.meta.url);
 * const __dirname = path.dirname(__filename);
 *
 * export default baseConfig.map((config) => {
 *   if (!config.languageOptions?.parserOptions) return config;
 *   return {
 *     ...config,
 *     languageOptions: {
 *       ...config.languageOptions,
 *       parserOptions: {
 *         ...config.languageOptions.parserOptions,
 *         tsconfigRootDir: __dirname,
 *       },
 *     },
 *   };
 * });
 * ```
 */
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import nextConfig from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import vitest from "@vitest/eslint-plugin";
import testingLibrary from "eslint-plugin-testing-library";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";
import jsdoc from "eslint-plugin-jsdoc";
import globals from "globals";
import importPlugin from "eslint-plugin-import";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

const NEXT_APP_FILES = ["apps/**"];
const nextConfigs = nextConfig.map((config) => ({
  ...config,
  files: NEXT_APP_FILES,
}));
const nextTypeConfigs = nextTs.map((config) => ({
  ...config,
  files: NEXT_APP_FILES,
}));

export default defineConfig(
  // ========================================================
  // 1. グローバル無視設定
  // ========================================================
  {
    name: "global-ignores",
    ignores: [
      ".next/**",
      "node_modules/**",
      "src-tauri/**",
      ".vercel/**",
      "coverage/**",
      "dist/**",
      "build/**",
      "out/**",
      "public/**",
      "scripts/**",
      "**/*.min.js",
      "**/*.tsbuildinfo",
      "next-env.d.ts",
      "next.config.*",
      "vitest.config.*",
      "vitest.browser.config.*",
      "postcss.config.*",
      "tailwind.config.*",
      "eslint.config.*",
      "vitest-example/**",
    ],
  },

  // ========================================================
  // 2. ベース設定 (JS / Next.js / A11y)
  // ========================================================
  js.configs.recommended,
  ...nextConfigs,
  ...nextTypeConfigs,

  // ========================================================
  // 3. TypeScript Strict設定
  // ========================================================
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // ========================================================
  // 4. グローバル設定 & Parser Options
  // ========================================================
  {
    name: "global-settings",
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        React: "readonly",
      },
      parserOptions: {
        projectService: true,
        // 注意: tsconfigRootDirは各パッケージで上書きする必要があります
        // このデフォルト値はルートから使用する場合に適用されます
        tsconfigRootDir: process.cwd(),
      },
    },
    settings: {
      react: { version: "detect" },
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json",
        },
        node: true,
      },
      "import/extensions": [".js", ".jsx", ".ts", ".tsx"],
    },
  },

  // ========================================================
  // 5. 共通プラグイン設定
  // ========================================================
  {
    name: "plugins-setup",
    plugins: {
      "simple-import-sort": simpleImportSort,
      "unused-imports": unusedImports,
      import: importPlugin,
      react,
      "react-hooks": reactHooks,
    },
  },

  // ========================================================
  // 6. メインルール（プロジェクト全体の規律）
  // ========================================================
  {
    name: "main-rules",
    files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"],
    rules: {
      // ----------------------------------------------------
      // セキュリティ & 堅牢性
      // ----------------------------------------------------
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      curly: ["error", "all"],
      "no-param-reassign": "error",
      "no-var": "error",
      "prefer-const": "error",
      "no-shadow": "off",
      "@typescript-eslint/no-shadow": "error",
      "no-proto": "error",
      "no-extend-native": "error",
      "no-with": "error",
      "no-unreachable": "error",
      "no-unreachable-loop": "error",

      "prefer-destructuring": [
        "error",
        { array: false, object: true },
        { enforceForRenamedProperties: false },
      ],

      "no-case-declarations": "error",
      "no-duplicate-case": "error",

      // 不正な空白文字の制限（日本語対応）
      "no-irregular-whitespace": [
        "error",
        {
          skipStrings: true,
          skipComments: false,
          skipRegExps: true,
          skipTemplates: true,
        },
      ],

      // ----------------------------------------------------
      // TypeScript 厳格化
      // ----------------------------------------------------
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/unified-signatures": "error",
      "@typescript-eslint/no-empty-object-type": "error",

      "@typescript-eslint/prefer-nullish-coalescing": [
        "error",
        { ignorePrimitives: { string: true, number: true, boolean: true } },
      ],
      "@typescript-eslint/prefer-optional-chain": "error",

      // 厳格なBooleanチェック
      "@typescript-eslint/strict-boolean-expressions": [
        "error",
        {
          // 一部緩和
          allowString: true,
          allowNumber: true,
          allowNullableObject: true,
          allowNullableBoolean: true,
          allowNullableString: false,
          allowNullableNumber: false,
          allowAny: false,
        },
      ],

      "@typescript-eslint/no-confusing-void-expression": [
        "error",
        { ignoreArrowShorthand: true },
      ],
      "@typescript-eslint/no-unnecessary-type-parameters": "error",

      // Promise誤用防止（Reactイベントハンドラ対応）
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksConditionals: true,
          checksVoidReturn: {
            attributes: false,
            arguments: false, // ★重要: これがないと非同期コールバックでエラー多発
            properties: true,
            returns: true,
            variables: true,
          },
        },
      ],

      // 命名規則
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "default",
          format: ["camelCase", "PascalCase", "UPPER_CASE"],
          leadingUnderscore: "allow",
        },
        {
          selector: "typeLike",
          format: ["PascalCase"],
        },
        {
          selector: "variable",
          format: ["camelCase", "PascalCase", "UPPER_CASE"],
          leadingUnderscore: "allow",
        },
        {
          selector: "function",
          format: ["camelCase", "PascalCase"],
          leadingUnderscore: "allow",
        },
        {
          selector: "parameter",
          format: ["camelCase"],
          leadingUnderscore: "allow",
        },
      ],

      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-expect-error": "allow-with-description",
          "ts-ignore": true,
          "ts-nocheck": true,
          "ts-check": false,
          minimumDescriptionLength: 10,
        },
      ],

      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/consistent-type-assertions": [
        "error",
        { assertionStyle: "as", objectLiteralTypeAssertions: "never" },
      ],
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/method-signature-style": ["error", "property"],

      "@typescript-eslint/restrict-plus-operands": [
        "error",
        {
          allowAny: false,
          allowBoolean: false,
          allowNullish: false,
          allowNumberAndString: false,
          allowRegExp: false,
        },
      ],
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowNumber: true,
          allowBoolean: false,
          allowAny: false,
          allowNullish: false,
          allowRegExp: false,
        },
      ],
      "@typescript-eslint/no-unnecessary-condition": [
        "error",
        { allowConstantLoopConditions: true },
      ],
      "@typescript-eslint/no-floating-promises": [
        "error",
        { ignoreVoid: true, ignoreIIFE: false },
      ],
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/promise-function-async": "error",

      // ----------------------------------------------------
      // Import & Code Cleanup
      // ----------------------------------------------------
      "no-console": "error",
      "no-duplicate-imports": "off",
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      "import/no-default-export": "error",
      "import/no-duplicates": "error",
      "import/extensions": [
        "error",
        "ignorePackages",
        {
          js: "never",
          jsx: "never",
          ts: "never",
          tsx: "never",
        },
      ],

      // ----------------------------------------------------
      // React / Next.js 安全性強化
      // ----------------------------------------------------
      "react/button-has-type": "error",
      "react/jsx-boolean-value": ["error", "never"],
      "react/self-closing-comp": "error",
      "react/jsx-no-useless-fragment": ["error", { allowExpressions: true }],
      "react/jsx-curly-brace-presence": [
        "error",
        { props: "never", children: "never" },
      ],
      "react/jsx-no-leaked-render": [
        "error",
        { validStrategies: ["ternary", "coerce"] },
      ],
      "react/jsx-key": [
        "error",
        {
          checkFragmentShorthand: true,
          checkKeyMustBeforeSpread: true,
          warnOnDuplicates: true,
        },
      ],
      "react/destructuring-assignment": ["error", "always"],

      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": [
        "error",
        {
          additionalHooks: "(useCustomEffect|useCustomMemo)",
        },
      ],

      "react/no-danger": "warn",
      "react/no-array-index-key": "error",
      "react/no-unused-prop-types": "off",

      "react/jsx-no-target-blank": ["error", { enforceDynamicLinks: "always" }],
      "react/no-unescaped-entities": "error",

      "react/jsx-no-bind": [
        "error",
        {
          ignoreRefs: true,
          allowArrowFunctions: true,
          allowFunctions: false,
          allowBind: false,
        },
      ],
    },
  },
  // ========================================================
  // 6.1 Next.js専用ルール（アプリ配下のみ）
  // ========================================================
  {
    name: "nextjs-app-rules",
    files: NEXT_APP_FILES,
    rules: {
      "@next/next/no-html-link-for-pages": "error",
      "@next/next/no-img-element": "error",
      "@next/next/no-sync-scripts": "error",
      "@next/next/no-css-tags": "error",
    },
  },

  // ========================================================
  // 7. JSDoc/TSDoc設定（TypeScriptファイル専用）
  // ========================================================
  {
    name: "jsdoc-rules",
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      jsdoc,
    },
    settings: {
      jsdoc: {
        mode: "typescript", // TypeScript/TSDocモード
        tagNamePreference: {
          returns: "returns", // TSDocスタイル
        },
      },
    },
    rules: {
      // ----------------------------------------------------
      // JSDoc構文チェック（TSDocスタイル）
      // ----------------------------------------------------
      "jsdoc/check-syntax": "warn", // TSDoc構文の検証

      // ----------------------------------------------------
      // ドキュメント存在チェック（重要な場所のみ）
      // ----------------------------------------------------
      "jsdoc/require-jsdoc": [
        "warn",
        {
          publicOnly: false,
          require: {
            FunctionDeclaration: true, // 通常の関数宣言
            ClassDeclaration: true, // クラス
            MethodDefinition: false, // メソッド（任意）
            ArrowFunctionExpression: false, // アロー関数（任意）
          },
          contexts: [
            // TypeScript固有の型
            "TSInterfaceDeclaration", // interface
            "TSTypeAliasDeclaration", // type
            // exportされた関数
            "ExportNamedDeclaration > FunctionDeclaration",
            // exportされた定数（JSDocは親のExportNamedDeclarationに付与されるためhas句で指定）
            "ExportNamedDeclaration:has(VariableDeclaration)",
          ],
        },
      ],

      // ----------------------------------------------------
      // パラメータと戻り値の記述（推奨だが強制しない）
      // ----------------------------------------------------
      "jsdoc/require-param": "off", // パラメータ記述は任意
      "jsdoc/require-returns": "off", // 戻り値記述は任意

      // ----------------------------------------------------
      // TSDoc追加検証
      // ----------------------------------------------------
      "jsdoc/check-tag-names": [
        "warn",
        {
          typed: true,
          definedTags: ["remarks", "example", "see", "public", "internal"], // TSDocタグを許可
        },
      ], // 正しいタグ名
      "jsdoc/check-types": "off", // TypeScriptの型システムを使用
      "jsdoc/no-types": "warn", // TSDoc形式では型注釈を使用しない
      "jsdoc/require-param-type": "off", // TypeScriptの型を使用
      "jsdoc/require-returns-type": "off", // TypeScriptの型を使用
    },
  },

  // ========================================================
  // 8. JavaScript/JSXファイル専用設定（型チェック無効化）
  // ========================================================
  {
    name: "javascript-overrides",
    files: ["*.js", "*.jsx", "*.mjs", "*.cjs"],
    // tseslint.configs.disableTypeChecked を継承するのが最も確実です
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: null,
      },
    },
    rules: {
      "@typescript-eslint/no-var-requires": "off",
      "no-unused-vars": "error",
    },
  },

  // ========================================================
  // 9. 型定義ファイル専用設定
  // ========================================================
  {
    name: "type-definition-files",
    files: ["types/**/*.ts", "**/*.d.ts"],
    rules: {
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },

  // ========================================================
  // 10. Next.js専用ファイル（デフォルトエクスポート許可）
  // ========================================================
  {
    name: "nextjs-special-files",
    files: [
      "**/app/**/page.{ts,tsx}",
      "**/app/**/layout.{ts,tsx}",
      "**/app/**/loading.{ts,tsx}",
      "**/app/**/error.{ts,tsx}",
      "**/app/**/global-error.{ts,tsx}",
      "**/app/**/not-found.{ts,tsx}",
      "**/app/**/template.{ts,tsx}",
      "**/app/**/default.{ts,tsx}",
      "**/app/**/route.{ts,tsx}",
      "**/app/**/manifest.{ts,tsx}",
      "**/pages/**/*.{ts,tsx}",
      "**/pages/api/**/*.{ts,tsx}",
      "**/app/api/**/*.{ts,tsx}",
      "**/proxy.{ts,tsx}",
      "**/next.config.{js,mjs,ts}",
      "**/tailwind.config.{js,ts}",
    ],
    rules: {
      "import/no-default-export": "off",
      "import/prefer-default-export": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "jsdoc/require-jsdoc": "off", // Next.js特殊ファイルはドキュメント不要
    },
  },

  // ========================================================
  // 10.1 PWAマニフェスト専用設定（Web App Manifest仕様のスネークケース許可）
  // ========================================================
  {
    name: "pwa-manifest",
    files: ["**/app/**/manifest.{ts,tsx}"],
    rules: {
      // Web App Manifestの仕様でスネークケースのプロパティ名が必要
      // https://developer.mozilla.org/en-US/docs/Web/Manifest
      "@typescript-eslint/naming-convention": "off",
    },
  },

  // ========================================================
  // 11. テスト環境
  // ========================================================
  {
    name: "test-environment",
    files: [
      "**/*.test.{ts,tsx}",
      "**/*.spec.{ts,tsx}",
      "tests/**/*.{ts,tsx}",
      "**/__tests__/**/*.{ts,tsx}",
    ],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.test.json",
        projectService: false,
      },
    },
    plugins: {
      vitest,
      "testing-library": testingLibrary,
    },
    settings: {
      // テストファイル専用のTypeScript設定を参照
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.test.json",
        },
        node: true,
      },
    },
    rules: {
      ...vitest.configs.recommended.rules,
      ...testingLibrary.configs["flat/react"].rules,

      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/strict-boolean-expressions": "off",
      // モック作成用に空関数を許可
      "@typescript-eslint/no-empty-function": "off",

      "vitest/expect-expect": "error",
      "vitest/consistent-test-it": [
        "error",
        { fn: "test", withinDescribe: "it" },
      ],
      "vitest/no-disabled-tests": "warn",
      "vitest/no-focused-tests": "error",
      "vitest/prefer-to-be": "error",
      "vitest/prefer-to-have-length": "error",
      "vitest/prefer-to-be-truthy": "warn",
      "vitest/prefer-to-be-falsy": "warn",

      "no-console": "off",
      "react/jsx-no-bind": "off",
      "import/no-default-export": "off",
      "jsdoc/require-jsdoc": "off", // テストファイルはドキュメント不要
    },
  },

  // ========================================================
  // 12. Browser Mode テスト専用設定
  // ========================================================
  {
    name: "browser-mode-tests",
    files: ["**/*.browser.test.{ts,tsx}"],
    rules: {
      // Browser Modeではpageオブジェクトを使用するため、prefer-screen-queriesは無効化
      "testing-library/prefer-screen-queries": "off",
    },
  },

  // ========================================================
  // 13. Prettier
  // ========================================================
  eslintConfigPrettier,
);
