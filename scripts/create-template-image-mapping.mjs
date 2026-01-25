/**
 * テンプレート画像とサンプル画像のマッピングを生成するスクリプト
 *
 * ファイルサイズに基づいて対応関係を特定し、JSONで出力します
 *
 * 使用方法:
 *   node scripts/create-template-image-mapping.mjs
 */

import {
  readdirSync,
  statSync,
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync,
  mkdirSync,
} from "fs";
import { join, basename } from "path";

const ASSETS_DIR = join("packages", "assets");
const SAMPLES_DIR = join(ASSETS_DIR, "images", "samples");
const TEMPLATES_DIR = join(ASSETS_DIR, "templates");
const OUTPUT_DIR = "scripts/output";
const OUTPUT_FILE = join(OUTPUT_DIR, "template-image-mapping.json");

/**
 * サンプル画像のファイルサイズ→ファイル名のマップを作成
 */
function getSampleImageMap() {
  const map = new Map();
  const files = readdirSync(SAMPLES_DIR);

  for (const file of files) {
    if (!file.endsWith(".webp")) continue;

    const filePath = join(SAMPLES_DIR, file);
    const size = statSync(filePath).size;

    // サイズが重複している場合はエラー（マッピングが一意でない）
    if (map.has(size)) {
      console.warn(
        `警告: サイズ ${size} が重複しています: ${file} と ${map.get(size)}`,
      );
    }

    map.set(size, file);
  }

  return map;
}

/**
 * テンプレートIDからサンプル画像IDを生成
 * @example 'lying_01_hip-up.webp' → 'sample_lying_01'
 */
function toSampleImageId(filename) {
  // lying_01_hip-up.webp → lying_01
  const match = filename.match(/^(lying|sitting|standing)_(\d{2})/);
  if (match) {
    return `sample_${match[1]}_${match[2]}`;
  }
  return null;
}

/**
 * 各テンプレートの画像マッピングを取得
 */
function getTemplateMapping(templatePath, sampleImageMap) {
  const imagesDir = join(templatePath, "images");

  if (!existsSync(imagesDir)) {
    return {};
  }

  const mapping = {};
  const files = readdirSync(imagesDir);

  for (const file of files) {
    if (!file.endsWith(".webp")) continue;

    const filePath = join(imagesDir, file);
    const size = statSync(filePath).size;

    const sampleFile = sampleImageMap.get(size);
    if (sampleFile) {
      const sampleId = toSampleImageId(sampleFile);
      if (sampleId) {
        mapping[`images/${file}`] = sampleId;
      }
    } else {
      console.warn(
        `警告: マッチするサンプル画像が見つかりません: ${filePath} (size: ${size})`,
      );
    }
  }

  return mapping;
}

/**
 * メイン処理
 */
function main() {
  console.log("=== テンプレート画像マッピング生成 ===\n");

  // 出力ディレクトリを作成
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // 1. サンプル画像のマップを作成
  console.log("サンプル画像を読み込み中...");
  const sampleImageMap = getSampleImageMap();
  console.log(`  ${sampleImageMap.size} 枚のサンプル画像を読み込みました\n`);

  // 2. 各テンプレートのマッピングを作成
  const templates = readdirSync(TEMPLATES_DIR);
  const result = {};
  let totalImages = 0;

  for (const template of templates) {
    const templatePath = join(TEMPLATES_DIR, template);
    if (!statSync(templatePath).isDirectory()) continue;

    const mapping = getTemplateMapping(templatePath, sampleImageMap);
    const count = Object.keys(mapping).length;

    if (count > 0) {
      result[template] = mapping;
      totalImages += count;
      console.log(`${template}: ${count} 枚の画像をマッピング`);
    }
  }

  // 3. 結果を出力
  console.log(
    `\n合計: ${totalImages} 枚のテンプレート画像をサンプル画像にマッピングしました`,
  );

  writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), "utf-8");
  console.log(`\nマッピングを ${OUTPUT_FILE} に保存しました`);

  // 4. 削減できる容量を計算
  let totalBytes = 0;
  for (const template of templates) {
    const imagesDir = join(TEMPLATES_DIR, template, "images");
    if (!existsSync(imagesDir)) continue;

    const files = readdirSync(imagesDir);
    for (const file of files) {
      totalBytes += statSync(join(imagesDir, file)).size;
    }
  }

  console.log(
    `\n削除可能な重複画像の合計サイズ: ${(totalBytes / 1024).toFixed(1)} KB`,
  );
}

main();
