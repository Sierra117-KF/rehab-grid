/**
 * PWAアイコン生成スクリプト
 *
 * packages/assets/icons/logo.png をベースに、PWA用の各サイズアイコンを生成します。
 *
 * 生成されるファイル:
 * - packages/assets/icons/icon-192x192.png (Android用)
 * - packages/assets/icons/icon-512x512.png (Android用、スプラッシュ)
 * - packages/assets/icons/apple-touch-icon.png (iOS用、180x180)
 *
 * 使用方法:
 * node scripts/generate-pwa-icons.mjs
 */

import sharp from "sharp";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, "..", "packages", "assets", "icons");
const sourcePath = path.join(iconsDir, "logo.png");

/** 生成するアイコンの設定 */
const icons = [
  { name: "icon-192x192.png", size: 192 },
  { name: "icon-512x512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

/**
 * アイコンを生成する
 */
async function generateIcons() {
  // ソースファイルの存在確認
  try {
    await fs.access(sourcePath);
  } catch {
    console.error(`エラー: ソースファイルが見つかりません: ${sourcePath}`);
    process.exit(1);
  }

  console.log(`ソースファイル: ${sourcePath}`);
  console.log("PWAアイコンを生成中...\n");

  for (const icon of icons) {
    const outputPath = path.join(iconsDir, icon.name);

    try {
      await sharp(sourcePath)
        .resize(icon.size, icon.size, {
          fit: "contain",
          background: { r: 255, g: 255, b: 255, alpha: 0 }, // 透明背景
        })
        .png()
        .toFile(outputPath);

      console.log(`✅ ${icon.name} (${icon.size}x${icon.size}) を生成しました`);
    } catch (error) {
      console.error(`❌ ${icon.name} の生成に失敗しました:`, error.message);
      process.exit(1);
    }
  }

  console.log("\n✨ すべてのPWAアイコンを生成しました");
}

generateIcons();
