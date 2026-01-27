/**
 * OGP画像変換スクリプト
 *
 * 正方形の画像を1200×630pxにクロップし、WebP形式に変換します。
 *
 * 使用方法:
 *   node scripts/convert-ogp-image.mjs <入力ファイル> [出力ファイル]
 *
 * 例:
 *   node scripts/convert-ogp-image.mjs ogp_image.png apps/web/public/images/og-image.webp
 */

import sharp from "sharp";
import { stat } from "fs/promises";
import { resolve } from "path";

// OGP推奨サイズ
const OGP_WIDTH = 1200;
const OGP_HEIGHT = 630;

async function convertOgpImage(inputPath, outputPath) {
  const absoluteInputPath = resolve(process.cwd(), inputPath);
  const absoluteOutputPath = resolve(process.cwd(), outputPath);

  console.log(`📷 入力ファイル: ${absoluteInputPath}`);
  console.log(`📁 出力ファイル: ${absoluteOutputPath}`);

  // 元画像のメタデータを取得
  const metadata = await sharp(absoluteInputPath).metadata();
  console.log(`📐 元画像サイズ: ${metadata.width}×${metadata.height}`);

  // アスペクト比を計算して中央クロップ
  const targetRatio = OGP_WIDTH / OGP_HEIGHT; // 1.9048...
  const sourceRatio = metadata.width / metadata.height;

  let cropWidth, cropHeight, left, top;

  if (sourceRatio > targetRatio) {
    // 元画像の方が横長 → 左右をクロップ
    cropHeight = metadata.height;
    cropWidth = Math.round(metadata.height * targetRatio);
    left = Math.round((metadata.width - cropWidth) / 2);
    top = 0;
  } else {
    // 元画像の方が縦長（正方形含む） → 上下をクロップ
    cropWidth = metadata.width;
    cropHeight = Math.round(metadata.width / targetRatio);
    left = 0;
    top = Math.round((metadata.height - cropHeight) / 2);
  }

  console.log(
    `✂️  クロップ領域: ${cropWidth}×${cropHeight} (開始位置: ${left}, ${top})`,
  );

  // 画像を処理
  await sharp(absoluteInputPath)
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .resize(OGP_WIDTH, OGP_HEIGHT)
    .webp({ quality: 85 })
    .toFile(absoluteOutputPath);

  // 出力ファイルのサイズを確認
  const outputMetadata = await sharp(absoluteOutputPath).metadata();
  const { size } = await stat(absoluteOutputPath);

  console.log(`✅ 変換完了!`);
  console.log(`   サイズ: ${outputMetadata.width}×${outputMetadata.height}`);
  console.log(`   ファイルサイズ: ${(size / 1024).toFixed(1)} KB`);
}

// メイン処理
const args = process.argv.slice(2);

if (args.length < 1) {
  console.log(
    "使用方法: node scripts/convert-ogp-image.mjs <入力ファイル> [出力ファイル]",
  );
  console.log(
    "例: node scripts/convert-ogp-image.mjs ogp_image.png apps/web/public/images/og-image.webp",
  );
  process.exit(1);
}

const inputFile = args[0];
const outputFile = args[1] || "og-image.webp";

convertOgpImage(inputFile, outputFile).catch((err) => {
  console.error("❌ エラー:", err.message);
  process.exit(1);
});
