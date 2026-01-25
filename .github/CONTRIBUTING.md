# .github ディレクトリ

このディレクトリには、リハぐりプロジェクトの GitHub 運用に必要な設定ファイルが含まれています。

## ディレクトリ構造

```
.github/
├── CONTRIBUTING.md            # このファイル
├── dependabot.yml             # 依存関係自動更新設定
├── PULL_REQUEST_TEMPLATE.md   # PR テンプレート
├── ISSUE_TEMPLATE/            # Issue テンプレート
│   ├── config.yml             # Issue テンプレート設定
│   ├── bug_report.md          # バグ報告（日本語）
│   ├── bug_report_en.md       # バグ報告（英語）
│   ├── feature_request.md     # 機能要望（日本語）
│   └── feature_request_en.md  # 機能要望（英語）
└── workflows/                 # GitHub Actions ワークフロー
    ├── ci.yml                 # CI パイプライン
    ├── release-desktop.yml    # Desktop版リリース
    └── lighthouse.yml         # Lighthouse CI
```

---

## Issue テンプレート

Issue作成時に選択可能なテンプレートを提供しています。

### テンプレート一覧

| ファイル                 | 名前            | 説明                         |
| ------------------------ | --------------- | ---------------------------- |
| `bug_report.md`          | バグ報告        | 不具合報告用（日本語）       |
| `bug_report_en.md`       | Bug Report      | 不具合報告用（英語）         |
| `feature_request.md`     | 機能要望        | 新機能リクエスト用（日本語） |
| `feature_request_en.md`  | Feature Request | 新機能リクエスト用（英語）   |

### config.yml

```yaml
blank_issues_enabled: true # テンプレートなしの空Issue作成を許可
contact_links: [] # 外部リンク（未設定）
```

---

## Pull Request テンプレート

`PULL_REQUEST_TEMPLATE.md` は PR 作成時に自動で適用されます。

### テンプレート内容

- **概要**: 変更内容の説明
- **関連Issue**: 関連するIssueへのリンク
- **変更の種類**: バグ修正、新機能、リファクタリング等
- **テスト**: テスト方法・確認事項
- **チェックリスト**: lint, type-check, test の確認
- **スクリーンショット**: UI変更時の添付

---

## CI/CD ワークフロー

### ワークフロー一覧

| ファイル               | 名前            | トリガー                  | 説明                                      |
| ---------------------- | --------------- | ------------------------- | ----------------------------------------- |
| `ci.yml`               | CI              | main ブランチへの push/PR | リント、型チェック、テスト、ビルド        |
| `release-desktop.yml`  | Release Desktop | `v*` タグ push            | Desktop版インストーラーのビルドとリリース |
| `lighthouse.yml`       | Lighthouse CI   | main ブランチへの push/PR | PWA品質チェック                           |

---

### CI (`workflows/ci.yml`)

#### 概要

プルリクエストとmainブランチへのpush時に、コード品質とビルドの検証を行います。

#### ジョブ構成

```
lint ─────────┐
type-check ───┼──→ test-jsdom ───┐
audit ────────┘    test-browser ─┴──→ build
```

1. **lint**: ESLint によるコードスタイルチェック
2. **type-check**: TypeScript の型チェック（ソース・テスト両方）
3. **audit**: npm パッケージのセキュリティ監査
4. **test-jsdom**: jsdom 環境でのユニットテスト
5. **test-browser**: Playwright を使用したブラウザテスト
6. **build**: プロダクションビルドの検証

#### 実行条件

- `main` ブランチへの push
- `main` ブランチへの PR
- 手動実行（workflow_dispatch）

---

### Release Desktop (`workflows/release-desktop.yml`)

#### 概要

バージョンタグ（`v*`）をpushすると、Windows用のDesktopアプリケーションをビルドし、GitHub Releasesにドラフトとしてアップロードします。

#### 生成される成果物

| 形式        | ファイル                       | 用途                           |
| ----------- | ------------------------------ | ------------------------------ |
| NSIS (.exe) | `リハぐり_x.x.x_x64-setup.exe` | 一般ユーザー向けインストーラー |

#### リリース手順

1. **バージョン更新**

   ```bash
   # apps/desktop/src-tauri/tauri.conf.json の version を更新
   # 例: "1.0.0" → "1.1.0"
   ```

2. **コミット・タグ作成**

   ```bash
   git add .
   git commit -m "chore: bump version to v1.1.0"
   git tag v1.1.0
   git push origin main --tags
   ```

3. **リリース確認**
   - GitHub Actions が自動でビルドを開始
   - 完了後、リポジトリの Releases ページにドラフトが作成される
   - リリースノートを確認・編集し、「Publish release」をクリック

#### 必要なシークレット

| シークレット   | 説明                  | 設定方法                     |
| -------------- | --------------------- | ---------------------------- |
| `GITHUB_TOKEN` | GitHub API アクセス用 | 自動で提供される（設定不要） |

#### ビルド環境

- **OS**: Windows Server (windows-latest)
- **Node.js**: v22
- **pnpm**: v10
- **Rust**: stable

#### キャッシュ

ビルド時間短縮のため、以下をキャッシュしています：

- pnpm パッケージキャッシュ（`pnpm-lock.yaml` ベース）
- Cargo レジストリ・依存関係（`Cargo.lock` ベース）
- Tauri ビルドターゲット（増分ビルド用）

---

### Lighthouse CI (`workflows/lighthouse.yml`)

#### 概要

Web版のPWA品質、パフォーマンス、アクセシビリティを自動チェックします。

#### 計測対象

- `/training` ページ（エディタ画面）

#### スコア閾値

| カテゴリ       | 閾値 | 説明                                 |
| -------------- | ---- | ------------------------------------ |
| PWA            | 90%  | Progressive Web App の要件準拠度     |
| Performance    | 80%  | ページ読み込み・インタラクション速度 |
| Accessibility  | 90%  | アクセシビリティ対応度               |
| Best Practices | 90%  | Web開発のベストプラクティス準拠度    |
| SEO            | 90%  | 検索エンジン最適化                   |

> **Note**: 閾値未満の場合は警告（warn）として表示されますが、ビルドは失敗しません。

#### レポートの確認

1. GitHub Actions の実行結果ページを開く
2. 「Artifacts」セクションから `lighthouse-results` をダウンロード
3. HTML レポートをブラウザで開いて詳細を確認

#### 設定ファイル

Lighthouse CI の設定は `lighthouserc.json`（リポジトリルート）で管理しています。

```json
{
  "ci": {
    "collect": {
      "staticDistDir": "apps/web/out",
      "url": ["http://localhost/training"],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:pwa": ["warn", { "minScore": 0.9 }]
      }
    }
  }
}
```

---

## ローカルでの動作確認

### CI相当のチェック

```bash
# リント
pnpm lint

# 型チェック
pnpm type-check
pnpm type-check:test

# テスト
pnpm test:jsdom
pnpm test:browser

# ビルド
pnpm build
```

### Desktop版ビルド

```bash
# 開発モード
pnpm dev:desktop

# プロダクションビルド（インストーラー生成）
pnpm build:desktop
```

### Lighthouse ローカル実行

```bash
# Web版をビルド
pnpm --filter @rehab-grid/web build

# Lighthouse CLI でチェック（要: lighthouse をグローバルインストール）
npx lighthouse http://localhost:3000/training --view
```

---

## トラブルシューティング

### CI が失敗する

| エラー              | 原因                         | 解決策                                                 |
| ------------------- | ---------------------------- | ------------------------------------------------------ |
| `pnpm install` 失敗 | lockfile の不整合            | `pnpm install` をローカルで実行し、lockfile をコミット |
| 型エラー            | TypeScript の型定義が不足    | `pnpm type-check` でローカル確認後、修正               |
| テスト失敗          | テストコードまたは実装のバグ | `pnpm test` でローカル確認後、修正                     |

### Desktop版ビルドが失敗する

| エラー                     | 原因                     | 解決策                                               |
| -------------------------- | ------------------------ | ---------------------------------------------------- |
| Rust コンパイルエラー      | 依存関係の問題           | `Cargo.lock` を更新してコミット                      |
| フロントエンドビルドエラー | Next.js ビルドの問題     | `pnpm --filter @rehab-grid/web build` でローカル確認 |
| タイムアウト               | 初回ビルドに時間がかかる | 2回目以降はキャッシュで高速化される                  |

### Lighthouse スコアが低い

| カテゴリ      | よくある原因         | 改善策                       |
| ------------- | -------------------- | ---------------------------- |
| Performance   | 画像サイズが大きい   | WebP形式で圧縮、遅延読み込み |
| Accessibility | aria属性の不足       | スクリーンリーダー対応を追加 |
| PWA           | Service Worker未登録 | sw.js の登録確認             |

---

## 参考リンク

- [Tauri公式ドキュメント](https://v2.tauri.app/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Dependabot options reference](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference)
- [Dependabot pnpm workspace catalogs サポート](https://github.blog/changelog/2025-02-04-dependabot-now-supports-pnpm-workspace-catalogs-ga/)
