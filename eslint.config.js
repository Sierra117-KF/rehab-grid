/**
 * ルートESLint設定
 *
 * @rehab-grid/config/eslint の共有設定を継承し、
 * ルートディレクトリ用にtsconfigRootDirを設定します。
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import baseConfig from "@rehab-grid/config/eslint";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ルートからの実行時はtsconfigRootDirをルートに設定
export default baseConfig.map((config) => {
  if (config.languageOptions?.parserOptions) {
    return {
      ...config,
      languageOptions: {
        ...config.languageOptions,
        parserOptions: {
          ...config.languageOptions.parserOptions,
          tsconfigRootDir: __dirname,
        },
      },
    };
  }
  return config;
});
