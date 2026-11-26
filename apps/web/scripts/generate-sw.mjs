/**
 * Service Worker 生成スクリプト
 *
 * scripts/sw.template.js の __BUILD_ID__ と __PDF_WORKER_ASSETS__ を置き換えて出力する。
 *
 * - 引数なし（predev / prebuild）: public/sw.js を出力する。PDF Worker のチャンクはまだ分からないので空
 * - --out（postbuild）: next build の出力（out/）から PDF Worker のチャンクを探し、
 *   インストール時にプリキャッシュする一覧として out/sw.js に埋め込む
 *   （デプロイ直後にオフラインになっても PDF を生成できるようにするため）
 */

import { readdirSync, readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatePath = resolve(__dirname, "sw.template.js");
const packageJsonPath = resolve(__dirname, "../package.json");
const outDir = resolve(__dirname, "../out");
const isPostBuild = process.argv.includes("--out");

/**
 * Turbopack が Worker を起動するときに渡す「エントリーポイント＋読み込むチャンク」の記述
 * 例: "static/chunks/turbopack-worker-xxxx.js",["static/chunks/aaaa.js","static/chunks/bbbb.js"]
 */
const WORKER_CHUNKS_PATTERN =
  /"(static\/chunks\/turbopack-worker-[\w.-]+\.js)",\[((?:"static\/chunks\/[\w.-]+\.js",?)+)\]/g;

/**
 * out/ のチャンクから PDF Worker の起動に必要なファイル（/_next/ からの絶対パス）を集める
 *
 * Turbopack の出力形式に依存するため、見つからなければビルドを失敗させて気付けるようにする
 */
function findPdfWorkerAssets() {
  const chunksDir = resolve(outDir, "_next/static/chunks");
  const assets = new Set();

  for (const file of readdirSync(chunksDir).filter((f) => f.endsWith(".js"))) {
    const source = readFileSync(resolve(chunksDir, file), "utf8");
    for (const [, entry, chunkList] of source.matchAll(WORKER_CHUNKS_PATTERN)) {
      assets.add(`/_next/${entry}`);
      for (const chunk of chunkList.matchAll(/"([^"]+)"/g)) {
        assets.add(`/_next/${chunk[1]}`);
      }
    }
  }

  if (assets.size === 0) {
    throw new Error(
      "PDF Worker のチャンクが out/ に見つかりません（Next.js / Turbopack の出力形式が変わった可能性があります）"
    );
  }
  return [...assets].sort();
}

// ビルドごとに一意な識別子（バージョン + ビルド日時）。
// CACHE_NAME が変わることで、デプロイ後に旧ビルドのキャッシュが削除される
const { version } = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const buildTime = new Date().toISOString().replace(/[-:.]/g, "");
const buildId = `${version}-${buildTime}`;

const template = readFileSync(templatePath, "utf8");
for (const placeholder of ["__BUILD_ID__", "__PDF_WORKER_ASSETS__"]) {
  if (!template.includes(placeholder)) {
    throw new Error(`sw.template.js に ${placeholder} が見つかりません`);
  }
}

const pdfWorkerAssets = isPostBuild ? findPdfWorkerAssets() : [];
const outputPath = isPostBuild
  ? resolve(outDir, "sw.js")
  : resolve(__dirname, "../public/sw.js");

const header =
  "// このファイルは scripts/generate-sw.mjs が自動生成します。編集は scripts/sw.template.js へ。\n";
writeFileSync(
  outputPath,
  header +
    template
      .replaceAll("__BUILD_ID__", buildId)
      .replaceAll("__PDF_WORKER_ASSETS__", JSON.stringify(pdfWorkerAssets))
);

console.log(
  `✅ Service Worker generated: ${outputPath} (cache: rehab-grid-${buildId}, PDF Worker assets: ${String(pdfWorkerAssets.length)})`
);
