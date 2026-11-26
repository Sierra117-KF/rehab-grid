# リリースガイド

リハぐり（Rehab-Grid）の新バージョンをリリースする際の標準手順と、GitHub Releases ページの説明文テンプレートをまとめたガイドです。

---

## リリース全体の流れ

1. **リリース準備 PR（`chore/release-vX.Y.Z` → 作業フェーズブランチ or `main`）**
   - バージョン番号の一括更新、`CHANGELOG.md` の確定、アプリ内更新履歴の最終調整
2. **フェーズブランチ → `main` へのマージ**
   - CI 全項目通過後にマージ（フェーズブランチの場合は各タスク履歴を保持するコミットマージ、単発リリースはスクワッシュマージ）
3. **注釈付きタグ `vX.Y.Z` の作成と push**
   - GitHub Actions（`release-desktop.yml`）が自動で Windows インストーラーをビルドし、ドラフト Release を作成
4. **GitHub Release ページの編集・公開**
   - ドラフトの説明文を下記の定型フォーマットで記述し、`Latest` として公開
5. **公開後の Web 側反映（`chore/web-installer-link-vX.Y.Z` → `main`）**
   - 公開完了後にトップページの Windows インストーラー直リンクを更新（公開前に変えると 404 になるため必ず公開後に行う）
   - 公開日（JST）が `CHANGELOG.md` やアプリ内更新履歴の日付とずれた場合は合わせて修正
6. **ブランチ整理**
   - マージ済みのローカル・リモートブランチを削除し、`main` のみに整備

---

## 1. バージョン更新対象ファイル

バージョンを `X.Y.Z` へ上げる際は、以下のファイルをすべて更新します。

| 種別 | ファイル | 更新箇所 |
| --- | --- | --- |
| ルート / Workspace | `package.json` | `"version"` |
| Web アプリ | `apps/web/package.json` | `"version"` |
| Desktop アプリ | `apps/desktop/package.json` | `"version"` |
| 共有パッケージ | `packages/{assets,config,core,pages,ui}/package.json` | `"version"` |
| Tauri / Rust | `apps/desktop/src-tauri/Cargo.toml` | `[package]` の `version` |
| Rust ロックファイル | `apps/desktop/src-tauri/Cargo.lock` | `name = "app"` の `version` |
| Tauri 設定 | `apps/desktop/src-tauri/tauri.conf.json` | `"version"` |
| アプリ定数 | `packages/core/src/lib/constants/app.ts` | `APP_VERSION` |
| 変更履歴（ドキュメント） | `CHANGELOG.md` | `## [X.Y.Z] - YYYY-MM-DD` と比較リンク |
| 変更履歴（アプリ内表示） | `packages/core/src/lib/changelog/entries/vX.Y.Z.ts` | 日付・文言・リリース前コメント整理 |

> **公開後に更新するファイル**
> - `apps/web/src/app/page.tsx`: Windows インストーラーのダウンロード URL（`.../releases/download/vX.Y.Z/rehab-grid_X.Y.Z_x64-setup.exe`）

---

## 2. タグ作成と Desktop ビルド監視

`main` を最新にした状態で注釈付きタグを作成して push します。

```bash
git checkout main
git pull origin main
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

タグ push により `.github/workflows/release-desktop.yml` が起動し、Windows インストーラー（`rehab-grid_X.Y.Z_x64-setup.exe`）付きのドラフト Release「`リハぐり vX.Y.Z`」が生成されます。

```bash
# ワークフローの進捗を監視
gh run list --workflow=release-desktop.yml --limit 3
gh run watch <run-id> --exit-status
```

---

## 3. GitHub Release 説明文の定型フォーマット

`release-desktop.yml` の `releaseBody` により、ドラフト作成時点で以下の定型構造（ダウンロード手順・CHANGELOG リンク・バージョン番号展開済み）が自動挿入されます。

公開前に冒頭の概要と変更点セクションを埋め、該当項目がないセクション（例：`🔧 改善` や `🐛 バグ修正`）は削除して公開してください。

### 記述方針

- **対象読者**: リハビリテーションセラピスト（利用者）にも伝わる平易な日本語で書く。技術的な詳細は `CHANGELOG.md` に任せる。
- **構成**:
  1. 冒頭に 1〜2 文でこのバージョンのハイライトを記載（見出しなし）。
  2. `### ✨ 新機能` / `### 🔧 改善` / `### 🐛 バグ修正` の 3 セクションで整理する（`packages/core/src/lib/changelog/entries/vX.Y.Z.ts` および `CHANGELOG.md` の内容と整合させる）。
  3. 新機能の箇条書きは `- **機能名**：説明` の形式に統一する。
  4. 水平線（`---`）以下は定型フッター（ダウンロード手順と `CHANGELOG.md` へのリンク）をそのまま使用する。

### テンプレート

```markdown
<このバージョンの特徴をまとめた1〜2文の概要>アップデートです。

### ✨ 新機能

- **機能名**：ユーザー視点での分かりやすい説明
- **機能名**：ユーザー視点での分かりやすい説明

### 🔧 改善

- 改善内容の説明

### 🐛 バグ修正

- 修正内容の説明

---

### 📥 Windows版のダウンロード・インストール

1. 下部の **「Assets」** から `rehab-grid_X.Y.Z_x64-setup.exe` をダウンロードして実行してください。
2. 対応環境：Windows 10 / 11（64bit）・オフライン動作対応（外部サーバーへのデータ送信はありません）。
3. **アップデートの方へ**：旧バージョンが入っている場合も、そのまま上書きインストールで更新できます（保存データは引き継がれます）。
4. 実行時に「Windows によって PC が保護されました」と表示された場合は、**「詳細情報」→「実行」** を選択してください。

### 🔗 詳細な変更履歴

技術的な詳細や過去の変更点は [CHANGELOG.md](https://github.com/Sierra117-KF/rehab-grid/blob/main/CHANGELOG.md) をご覧ください。
```

### `gh` CLI での更新・公開例

```bash
# 説明文を更新し、ドラフトを解除して Latest として公開
gh release edit vX.Y.Z --title "リハぐり vX.Y.Z" --notes-file release-notes.md --draft=false --latest
```

---

## 4. 公開後の仕上げ

1. **Web トップページのダウンロードリンク更新**
   - `chore/web-installer-link-vX.Y.Z` ブランチを `main` から作成
   - `apps/web/src/app/page.tsx` のインストーラー URL を `vX.Y.Z` に更新
   - 公開日（JST）が `CHANGELOG.md` / `vX.Y.Z.ts` と異なる場合は合わせて更新
   - `main` 向け PR を作成し、CI 通過後にスクワッシュマージ
2. **ブランチ整理**
   - `git fetch --prune` でリモート追跡ブランチを同期
   - マージ済みの作業ブランチ（ローカル・リモート）を削除し、`main` のみにする
