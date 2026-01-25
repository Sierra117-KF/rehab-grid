import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// モノレポルートからの相対パス
const monorepoRoot = path.resolve(__dirname, "../..");

export default defineConfig({
  plugins: [react()],
  define: {
    "process.env": "{}",
  },
  server: {
    fs: {
      // モノレポ全体へのアクセスを許可（依存関係解決に必要）
      allow: [monorepoRoot],
    },
  },
  optimizeDeps: {
    // Viteの自動依存関係スキャンを有効化し、明示的なincludeは最小限に
    esbuildOptions: {
      define: {
        "process.env": "{}",
      },
    },
  },
  resolve: {
    alias: [
      // packages/core の依存関係へのパスマッピング（テストで直接インポートされるもの）
      {
        find: "jszip",
        replacement: path.resolve(
          monorepoRoot,
          "packages/core/node_modules/jszip"
        ),
      },
      {
        find: /^@rehab-grid\/core\/(.*)$/,
        replacement: path.resolve(__dirname, "../../packages/core/src/$1"),
      },
      {
        find: "@rehab-grid/core",
        replacement: path.resolve(__dirname, "../../packages/core/src/index.ts"),
      },
      {
        find: /^@rehab-grid\/ui\/(.*)$/,
        replacement: path.resolve(__dirname, "../../packages/ui/src/$1"),
      },
      {
        find: "@rehab-grid/ui",
        replacement: path.resolve(__dirname, "../../packages/ui/src/index.ts"),
      },
      {
        find: /^@rehab-grid\/pages\/(.*)$/,
        replacement: path.resolve(__dirname, "../../packages/pages/src/$1"),
      },
      {
        find: "@rehab-grid/pages",
        replacement: path.resolve(__dirname, "../../packages/pages/src/index.ts"),
      },
      {
        find: /^@\/tests\/(.*)$/,
        replacement: path.resolve(__dirname, "./tests/$1"),
      },
      {
        find: /^@\/components\/(.*)$/,
        replacement: path.resolve(__dirname, "../../packages/ui/src/components/$1"),
      },
      {
        find: /^@\/lib\/(.*)$/,
        replacement: path.resolve(__dirname, "../../packages/core/src/lib/$1"),
      },
      {
        find: /^@\/utils\/(.*)$/,
        replacement: path.resolve(__dirname, "../../packages/core/src/utils/$1"),
      },
      {
        find: /^@\/hooks\/(.*)$/,
        replacement: path.resolve(__dirname, "../../packages/core/src/hooks/$1"),
      },
      {
        find: /^@\/types\/(.*)$/,
        replacement: path.resolve(__dirname, "../../packages/core/src/types/$1"),
      },
      {
        find: /^@\/types$/,
        replacement: path.resolve(__dirname, "../../packages/core/src/types"),
      },
      {
        find: /^@\/(.*)$/,
        replacement: path.resolve(__dirname, "./src/$1"),
      },
      {
        find: "@/tests",
        replacement: path.resolve(__dirname, "./tests"),
      },
      {
        find: "@",
        replacement: path.resolve(__dirname, "./src"),
      },
    ],
  },
  test: {
    name: "web-browser",
    globals: true,
    browser: {
      enabled: true,
      provider: playwright({
        launchOptions: {
          headless: true,
        },
      }),
      instances: [
        {
          browser: "chromium",
        },
      ],
    },
    include: ["tests/**/*.browser.test.{ts,tsx}"],
    setupFiles: ["./tests/setup.browser.ts"],
  },
});
