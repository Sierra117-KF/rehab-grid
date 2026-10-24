# public ディレクトリ

このディレクトリには Web 専用の静的アセットを配置します。

## 含まれるもの

- `_headers`（Cloudflare Pages 用 HTTP ヘッダー設定）
- `sw-register.js`（PWA Service Worker の登録）
- `sw.js`（ビルド前に `scripts/generate-sw.mjs` が `scripts/sw.template.js` から生成。Git 管理外）
- `icons/`（PWA アイコン）
- `images/bento-grid/`（トップページ用の装飾画像）

共有アセット（fonts, images/samples, templates, logo）は `packages/assets/` で管理します。
