# アーキテクチャ・仕様リファレンス

CLAUDE.md / AGENTS.md に常駐させるほどではないが、実装判断で参照する情報をまとめる。

---

## ディレクトリ構成

```
rehab-grid/
├── apps/
│   ├── desktop/            # Windows版（Tauri）。src-tauri/ に Rust バックエンド
│   └── web/                # Web版（PWA対応）
├── packages/
│   ├── assets/             # 共有アセット（fonts / icons / images / templates）
│   ├── config/             # eslint, typescript, postcss の共有設定
│   ├── core/               # hooks, lib（DB/Store/Schemas/Constants）, types, utils, workers
│   ├── pages/              # 共有ページ（training / privacy / terms / changelog）
│   └── ui/                 # components（editor / layout / pdf / ui / wrapped）, styles
├── docs/
└── scripts/                # フォントサブセット生成等
```

各アプリ・パッケージのテストは `tests/` に配置する。

## 共有設定パッケージ（`@rehab-grid/config`）

- `@rehab-grid/config/eslint`: strictTypeChecked + React/Next.js 対応
- `@rehab-grid/config/typescript`: strict + `noUncheckedIndexedAccess`
- `@rehab-grid/config/postcss`: Tailwind CSS v4 統合

各パッケージは `extends` / `import` で継承し、`tsconfigRootDir` のみ個別指定する。ESLint / TypeScript の依存はここで一元管理するため、各パッケージには `peerDependencies`（`eslint`, `typescript`）を満たす最小限の `devDependencies` だけを置く。

## 共有アセットの自動コピー

`packages/assets/` に置いたファイルは、ビルド時のスクリプトで各アプリの公開ディレクトリへコピーされる。コピー先は git 管理外で、ビルドごとにクリーンアップされる。アプリ側の `public/` に直接アセットを追加しても消えるので、必ず `packages/assets/` に置く。

## モノレポでの型解決の落とし穴

pnpm モノレポでは、パッケージ境界を越えた間接依存の型を TypeScript が解決できないことがある（例: `apps/web` のテストから `packages/core` が依存する `jszip` の型が見つからない）。

対処は優先順位順に:

1. **使用するパッケージの `package.json` に依存を明示追加する**（推奨）。pnpm ワークスペースでは同バージョンがホイスティングされるため実質的な重複は起きず、Turbopack / Next.js 16 で確実に動く。
2. テスト環境限定なら `tsconfig.test.json` の `paths` にワークスペースパッケージをマッピングする（例: `"@rehab-grid/core/*": ["../../packages/core/src/*"]`）。

**禁止**: `tsconfig.json` の `paths` で `node_modules` 内のパッケージにマッピングしないこと。Turbopack が `paths` をモジュール解決に使うため、ChunkLoadError やバージョン不整合を引き起こす。

```jsonc
// NG
"lucide-react": ["../../packages/ui/node_modules/lucide-react"]
```

## セキュリティ・プライバシー要件

外部 API への送信を一切行わない。CSP は以下を維持する。

```
default-src 'self';
img-src 'self' blob: data:;
style-src 'self' 'unsafe-inline';
script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval';
font-src 'self';
connect-src 'self';
worker-src 'self' blob:;
frame-src 'self' blob:;
object-src 'none';
base-uri 'self';
```

- Desktop 版のみ `connect-src 'self' ipc: http://ipc.localhost tauri:;` を追加
- フォントは `public/fonts/` にローカル配置（CDN 不使用）
- XSS 等 OWASP Top 10 を意識する

## パフォーマンス目標

- 画像 20 枚程度で D&D・文字入力がカクつかない
- エクスポート JSON は 5〜10MB 以内
- PDF 生成は Web Worker でメインスレッドをブロックしない

## 機能仕様

### 画像管理

ドラッグ＆ドロップ / ファイル選択 / クリップボード貼り付け（Ctrl+V）。取り込み時に自動圧縮（長辺 1200px / WebP 推奨）し、IndexedDB に **Blob** として保存する。

### 編集・レイアウト

テンプレート選択（腰痛体操セット等）、グリッド 1〜4 列切替、カード型編集（D&D で並べ替え）、スニペット（定型文）挿入。

### 保存・復元

IndexedDB へオートセーブ。エクスポートは 2 形式:

- **軽量 JSON**（`.json`）: テキストのみ
- **完全バックアップ**（`.zip`）: JSON + 画像

インポート時は Zod バリデーション + DOMPurify サニタイズを必ず通す。

### PDF 出力

`@react-pdf/renderer` でクライアントサイド生成。A4 サイズ、Noto Sans JP 埋め込み。キャンバス UI のレイアウト・PDF プレビュー・PDF 出力の 3 者が一致すること。生成は Web Worker で行う。

CJK ハイフネーション問題は [react-pdf-renderer-hyphenation.md](./react-pdf-renderer-hyphenation.md) を参照。

## URL 構造

| パス         | Web版                        | Desktop版           |
| ------------ | ---------------------------- | ------------------- |
| `/`          | トップページ（アプリ紹介）   | エディタ（直接表示）|
| `/training`  | エディタ                     | —                   |
| `/privacy`   | プライバシーポリシー         | 同左                |
| `/terms`     | 利用規約                     | 同左                |
| `/changelog` | 更新履歴                     | 同左                |
| `/*`         | 404（5秒後にトップへ）       | —                   |

Desktop 版の UI 差異:

- ランディングページなし（起動時に即エディタ）
- 専用ヘッダー（`apps/desktop/src/components/DesktopEditorHeader.tsx`）に情報ページへのリンクを配置
- 起動時にセキュリティ免責モーダルを自動表示（セッション/時間ベースの判定）
