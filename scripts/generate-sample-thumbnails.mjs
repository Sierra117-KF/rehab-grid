/**
 * サンプル画像の一覧用サムネイル生成スクリプト
 *
 * packages/assets/images/samples/*.webp を長辺 THUMBNAIL_LONG_SIDE px の WebP に縮小し、
 * packages/assets/images/samples/thumbs/ に同じファイル名で書き出します。
 * 画像ライブラリの一覧はこのサムネイルを表示し、カード・PDF・ZIP は元画像を使います。
 *
 * 生成物はリポジトリにコミットします（ビルドや CI で sharp を不要にするため）。
 * サンプル画像を追加・差し替えたら再実行してください。
 *
 * 使用方法:
 *   node scripts/generate-sample-thumbnails.mjs
 */

import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

import sharp from "sharp";

/** サムネイルの長辺（px）。一覧のセル（デスクトップ約 64px・モバイル約 170px）を高解像度画面でも粗く見せない大きさ */
const THUMBNAIL_LONG_SIDE = 240;

/** WebP の品質 */
const WEBP_QUALITY = 70;

const SAMPLES_DIR = resolve(import.meta.dirname, "../packages/assets/images/samples");
const THUMBS_DIR = join(SAMPLES_DIR, "thumbs");

async function generateSampleThumbnails() {
  const files = (await readdir(SAMPLES_DIR)).filter((f) => f.endsWith(".webp"));

  // 削除・改名されたサンプルのサムネイルを残さないよう、毎回作り直す
  await rm(THUMBS_DIR, { recursive: true, force: true });
  await mkdir(THUMBS_DIR, { recursive: true });

  let originalTotal = 0;
  let thumbTotal = 0;

  for (const file of files) {
    const input = join(SAMPLES_DIR, file);
    const output = join(THUMBS_DIR, file);

    await sharp(input)
      .resize(THUMBNAIL_LONG_SIDE, THUMBNAIL_LONG_SIDE, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY, effort: 6 })
      .toFile(output);

    const originalSize = (await stat(input)).size;
    const thumbSize = (await stat(output)).size;
    originalTotal += originalSize;
    thumbTotal += thumbSize;
    console.log(
      `${file}: ${(originalSize / 1024).toFixed(1)}KB → ${(thumbSize / 1024).toFixed(1)}KB`
    );
  }

  console.log(
    `\n✅ ${String(files.length)} 枚を生成: 合計 ${(originalTotal / 1024).toFixed(1)}KB → ${(thumbTotal / 1024).toFixed(1)}KB`
  );
}

generateSampleThumbnails().catch((err) => {
  console.error("❌ エラー:", err.message);
  process.exit(1);
});
