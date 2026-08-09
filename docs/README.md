# ドキュメントインデックス

このディレクトリには、リハぐり（Rehab-Grid）プロジェクトの技術ドキュメントが含まれています。

---

## アーキテクチャ

### [architecture.md](./architecture.md)

**アーキテクチャ・仕様リファレンス** - `AGENTS.md` に常駐させない詳細情報。

- ディレクトリ構成、共有設定パッケージ、共有アセットの自動コピー
- モノレポでの型解決の落とし穴（`paths` の禁止事項）
- CSP・パフォーマンス目標・機能仕様・URL 構造

---

## テスト

### [testing-guide.md](./testing-guide.md)

**テストガイド** - モノレポ構成でのテスト環境と実行方法。

- 技術スタック（Vitest v4, jsdom, Playwright）
- jsdom環境とBrowserモードの使い分け
- コマンド一覧とパッケージ別実行方法
- テスト作成ガイドラインとVitest v4の注意点

---

## 技術ノート

### [react-pdf-renderer-hyphenation.md](./react-pdf-renderer-hyphenation.md)

**@react-pdf/renderer v4.x 日本語ハイフン問題の解決ガイド** - PDF生成時のCJK文字ハイフネーション問題の解決策。

- 問題の根本原因（textkit v6.1.0の仕様変更）
- flatMap方式による解決策
- Web Worker環境での注意点

---

## 画像生成プロンプト

### [image-gen-prompts/](./image-gen-prompts/)

WebサイトやPR用の画像生成に使用するプロンプト集。

| ファイル                                               | 説明                  |
| ------------------------------------------------------ | --------------------- |
| [Instructions.md](./image-gen-prompts/Instructions.md) | 画像生成の基本手順    |
| [README.md](./image-gen-prompts/README.md)             | プロンプト集の概要    |
| [custom-gem.md](./image-gen-prompts/custom-gem.md)     | カスタムGemプロンプト |
| [model.md](./image-gen-prompts/model.md)               | モデル画像プロンプト  |
