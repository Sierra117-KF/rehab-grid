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

テンプレート選択（腰痛体操セット等の公式テンプレート・マイテンプレート）、グリッド 1〜4 列とスライド（A4 横・1 ページ 1 運動）の切替、カード型編集（D&D で並べ替え）、マイ運動からのカード追加、スニペット（定型文・マイ定型文）挿入。

### 保存・復元

IndexedDB へオートセーブ（最後の変更から 2 秒後）。指導箋は複数保存でき、「マイ指導箋」一覧から切り替え・新規作成・複製・削除・タイトル検索ができる。

- `projects` テーブルに 1 指導箋 1 レコード（新規は `nanoid`、旧バージョンのデータは ID `"current"` のまま 1 件目として扱う）。`images` テーブルは全指導箋で共有するライブラリ
- 編集中の指導箋の ID はストアの `projectId`。最後に開いた ID を localStorage（`rehab-grid-active-project-id`）に記録し、起動時は「記録した ID → 更新日時が最新 → 新規作成」の順に開く
- オートセーブの保存先は保存を予約した時点の ID。切り替え・新規作成・インポート（新規）の前に保留中の保存を確定（`flush`）し、編集中の指導箋を削除するときは破棄（`cancel`）する
- 取り込み画像を削除するとき、他の指導箋・マイテンプレート・マイ運動が参照していれば確認ダイアログで警告する。指導箋を削除しても取り込み画像は残す
- 2 件目以降の指導箋を作るとき `navigator.storage.persist()` を要求する（外部通信なし）

### マイライブラリ（マイテンプレート・マイ運動・マイ定型文）

Dexie の version 2 で `userTemplates`（`ProjectFile` を名前付きで保存）・`exerciseCards`（カード 1 枚）・`customSnippets`（注意点の定型文）のテーブルを追加した（version 1 の宣言は残す。テーブル追加のみなのでデータ移行なし）。

- 保存時はインポートと同じ Zod スキーマ（`projectFileSchema` / `editorItemSchema`）を通す。取り込み画像は画像ライブラリの ID で参照し、画像は複製しない
- 呼び出し時はカード・注意点の ID を `cloneItemWithNewIds` で振り直す（公式テンプレートの適用・カードの複製と共通）。マイテンプレートはインポートと同じ `openImportResult` で開き、タイトルはテンプレート名になる。マイ運動の追加は 1 件の履歴
- マイ定型文は定型文ダイアログの先頭カテゴリ「マイ定型文」に表示する。定型文の内容を React の key・選択状態のキーに使うため、組み込み・登録済みと同じ文言は登録しない

エクスポートは 2 形式:

- **軽量 JSON**（`.json`）: テキストのみ
- **完全バックアップ**（`.zip`）: JSON + 画像

インポート時は Zod バリデーション + DOMPurify サニタイズを必ず通す。インポート・テンプレート適用は、編集中の指導箋にカードがあれば「新しい指導箋で開く」（既定）か「現在の指導箋に上書き」を選ばせる。

### PDF 出力

`@react-pdf/renderer` でクライアントサイド生成。A4 サイズ、Noto Sans JP 埋め込み。キャンバス UI のレイアウト・PDF プレビュー・PDF 出力の 3 者が一致すること。生成は Web Worker で行う。

スライド（`layoutType: "slide"`）は用紙の向きの設定に関わらず A4 横で、カード 1 枚ごとに 1 ページを作り、全ページにヘッダー（全体メモを含む）を出す。カードの大きさはヘッダーの高さから決まる固定値で、説明・注意点の行数は PDF とキャンバスで共通の関数（`getSlideTextLines`）で決める。1 週間のチェック表はヘッダー付きの別ページに出す。

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
