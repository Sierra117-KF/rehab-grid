import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
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
        replacement: path.resolve(
          __dirname,
          "../../packages/pages/src/index.ts"
        ),
      },
      {
        find: /^@\/tests\/(.*)$/,
        replacement: path.resolve(__dirname, "./tests/$1"),
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
      {
        find: "lucide-react",
        replacement: path.resolve(
          __dirname,
          "../../packages/ui/node_modules/lucide-react"
        ),
      },
    ],
  },
  test: {
    name: "desktop",
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.jsdom.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["**/*.browser.test.{ts,tsx}", "**/node_modules/**"],
  },
});
