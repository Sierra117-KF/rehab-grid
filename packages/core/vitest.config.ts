import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@rehab-grid\/core\/(.*)$/,
        replacement: path.resolve(__dirname, "./src/$1"),
      },
      {
        find: "@rehab-grid/core",
        replacement: path.resolve(__dirname, "./src/index.ts"),
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
    ],
  },
  test: {
    name: "core",
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.jsdom.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["**/*.browser.test.{ts,tsx}", "**/node_modules/**"],
  },
});
