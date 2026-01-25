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
        replacement: path.resolve(__dirname, "../core/src/$1"),
      },
      {
        find: "@rehab-grid/core",
        replacement: path.resolve(__dirname, "../core/src/index.ts"),
      },
      {
        find: /^@rehab-grid\/ui\/(.*)$/,
        replacement: path.resolve(__dirname, "./src/$1"),
      },
      {
        find: "@rehab-grid/ui",
        replacement: path.resolve(__dirname, "./src/index.ts"),
      },
      {
        find: /^@\/tests\/(.*)$/,
        replacement: path.resolve(__dirname, "./tests/$1"),
      },
      {
        find: /^@\/components\/(.*)$/,
        replacement: path.resolve(__dirname, "./src/components/$1"),
      },
      {
        find: /^@\/lib\/(.*)$/,
        replacement: path.resolve(__dirname, "../core/src/lib/$1"),
      },
      {
        find: /^@\/utils\/(.*)$/,
        replacement: path.resolve(__dirname, "../core/src/utils/$1"),
      },
      {
        find: /^@\/hooks\/(.*)$/,
        replacement: path.resolve(__dirname, "../core/src/hooks/$1"),
      },
      {
        find: /^@\/types\/(.*)$/,
        replacement: path.resolve(__dirname, "../core/src/types/$1"),
      },
      {
        find: /^@\/types$/,
        replacement: path.resolve(__dirname, "../core/src/types"),
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
    name: "ui",
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.jsdom.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["**/*.browser.test.{ts,tsx}", "**/node_modules/**"],
  },
});
