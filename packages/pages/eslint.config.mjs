import path from "node:path";
import { fileURLToPath } from "node:url";

import baseConfig from "@rehab-grid/config/eslint";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default baseConfig.map((config) => {
  if (!config.languageOptions?.parserOptions) {
    return config;
  }
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
});
