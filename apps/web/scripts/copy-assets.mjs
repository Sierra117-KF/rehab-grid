import { cpSync, rmSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = resolve(__dirname, "../../../packages/assets");
const publicDir = resolve(__dirname, "../public");

/**
 * ディレクトリを削除してから再作成する（クリーンコピー用）
 * @param {string} dir - 対象ディレクトリパス
 */
const cleanDir = (dir) => {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
  mkdirSync(dir, { recursive: true });
};

/**
 * ディレクトリが存在しない場合に作成する
 * @param {string} dir - 作成するディレクトリパス
 */
const ensureDir = (dir) => {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

// コピー先をクリーンアップ（古いファイルが残らないようにする）
cleanDir(`${publicDir}/fonts`);
cleanDir(`${publicDir}/images/samples`);
cleanDir(`${publicDir}/templates`);
ensureDir(`${publicDir}/icons`);

// アセットコピー
cpSync(`${assetsDir}/fonts`, `${publicDir}/fonts`, { recursive: true });
cpSync(`${assetsDir}/images/samples`, `${publicDir}/images/samples`, {
  recursive: true,
});
cpSync(`${assetsDir}/templates`, `${publicDir}/templates`, { recursive: true });
cpSync(`${assetsDir}/icons/logo.png`, `${publicDir}/icons/logo.png`);

console.log("✅ Shared assets copied successfully");
