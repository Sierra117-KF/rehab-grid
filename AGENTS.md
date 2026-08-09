# リハぐり（Rehab-Grid）

ユーザーへの出力は全て日本語で行うこと。

リハビリテーションセラピスト向けの「自主トレーニング指導箋」作成ツール。**完全クライアントサイド動作**（外部送信ゼロ）が製品の存在理由であり、院内規定に抵触せず導入できることが最大の価値。

pnpm workspace + Turborepo のモノレポ。Next.js 16（`output: 'export'`）/ React 19 / TypeScript 5 / Tailwind 4、Desktop 版は Tauri 2。

## 譲れない制約

- **外部への通信を追加しない**。ユーザーデータ・画像を送信する `fetch` / XHR、CDN からのフォントやスクリプト読み込みは、動いても仕様違反。CSP でも遮断されている。
- **ESLint ルールを無効化しない**（`eslint-disable` 等）。回避したくなったら実装側を直すか、ユーザーに相談する。
- **`packages/ui/src/components/ui/` を直接編集しない**（shadcn/ui の原本）。カスタマイズは `components/wrapped/` にラッパーを作る。カスタマイズ不要なもの（Separator, Skeleton 等）は `ui/` から直接 import してよい。

## パッケージ構成

```
apps/{web,desktop} → @rehab-grid/pages → @rehab-grid/ui → @rehab-grid/core
                                                              ↓
                                                    Dexie / Zustand / Zod
```

- DB・Store・定数・Zod スキーマ → `packages/core/src/lib`
- 他プロジェクトでも通用する汎用ヘルパー → `packages/core/src/utils`
- 型 → `packages/core/src/types`（コンポーネント固有の型は使用ファイル内に置く）
- アプリ固有 UI → 各アプリの `src/components/`。共有コンポーネントをラップして拡張する
- 共有アセットは `packages/assets/` に置く（各アプリの `public/` はビルド時に上書きされる）

ディレクトリ詳細・CSP・機能仕様・URL 構造・モノレポの型解決の落とし穴は `docs/architecture.md`。テストの方針は `docs/testing-guide.md`。

## コマンド

```bash
pnpm dev:web            # 開発サーバー（Desktop は dev:desktop）
pnpm lint               # 全パッケージ（自動修正は lint:fix、ルート限定）
pnpm type-check         # 全パッケージ
pnpm test               # 全テスト（jsdom: core/ui/desktop、browser: web）
pnpm type-check:test    # テストファイルを触ったときに追加で実行
```

パッケージ単位は `pnpm --filter @rehab-grid/core test` のように指定する。コードを変更したら、関係するパッケージの `type-check` と `lint` は通してから完了とする。

## 規約

- エクスポートは名前付き。デフォルトエクスポートは Next.js 特殊ファイル（`page.tsx`, `layout.tsx` 等）のみ。
- パッケージ間は `@rehab-grid/*` エイリアス経由。相対パスでパッケージ境界を越えない。同一パッケージ内は `@/` か相対パス。
- 命名: コンポーネント PascalCase / フック `useXxx` / 関数 camelCase / 型 PascalCase / 定数 SCREAMING_SNAKE_CASE。
- **`useEffect` をアプリケーションロジックに使わない**。データ取得は `useLiveQuery`、状態同期は Zustand の action、操作への反応はイベントハンドラで書く。`beforeunload` / `ResizeObserver` / File System Access API の変更検知など、システム制御が理由の場合のみカスタムフックに隠蔽し、理由をコメントで残す。
- export した関数・型・定数には JSDoc を付ける（ESLint warn）。型は TypeScript に任せ、`@param {type}` のような型記述は書かない。Next.js 特殊ファイルとテストファイルは不要。
- DRY / KISS / YAGNI。要求されていない抽象化・設定可能性・防御的コードを足さない。
