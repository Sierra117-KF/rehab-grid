import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatePath = resolve(__dirname, "sw.template.js");
const outputPath = resolve(__dirname, "../public/sw.js");
const packageJsonPath = resolve(__dirname, "../package.json");

// ビルドごとに一意な識別子（バージョン + ビルド日時）。
// CACHE_NAME が変わることで、デプロイ後に旧ビルドのキャッシュが削除される
const { version } = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const buildTime = new Date().toISOString().replace(/[-:.]/g, "");
const buildId = `${version}-${buildTime}`;

const template = readFileSync(templatePath, "utf8");
if (!template.includes("__BUILD_ID__")) {
  throw new Error("sw.template.js に __BUILD_ID__ が見つかりません");
}

const header =
  "// このファイルは scripts/generate-sw.mjs が自動生成します。編集は scripts/sw.template.js へ。\n";
writeFileSync(outputPath, header + template.replaceAll("__BUILD_ID__", buildId));

console.log(`✅ Service Worker generated (cache: rehab-grid-${buildId})`);
