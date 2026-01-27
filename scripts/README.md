# スクリプトディレクトリ

本ディレクトリには、リハぐり（Rehab-Grid）プロジェクトの開発・ビルド時に使用するユーティリティスクリプトが含まれています。

## 概要

このディレクトリのスクリプトは、以下の3つの目的で使用されます：

1. **フォント最適化**: PDF出力機能で使用する日本語フォント（Noto Sans JP）のサブセット化
2. **テンプレート画像マッピング**: テンプレート内の重複画像をサンプル画像への参照に置き換えるためのマッピング生成
3. **PWAアイコン生成**: ロゴ画像から各種サイズのPWAアイコンを自動生成
4. **OGP画像変換**: SNS共有用のOGP画像を最適なサイズ・形式に変換

## ディレクトリ構造

```
scripts/
├── README.md                           # 本ファイル
├── generate_chars.mjs                  # 文字リスト生成（Node.js）
├── chars.txt                           # 生成された文字リスト
├── subset-fonts.py                     # フォントサブセット化（Python）
├── create-template-image-mapping.mjs   # テンプレート画像マッピング生成
├── generate-pwa-icons.mjs              # PWAアイコン生成
├── convert-ogp-image.mjs               # OGP画像変換
└── output/
    └── template-image-mapping.json     # 生成されたマッピングファイル
```

---

## スクリプト一覧

### 1. `generate_chars.mjs`

**目的**: PDF出力に必要な文字セットを生成し、`chars.txt` ファイルを作成します。

**生成される文字セット**:

- ASCII文字（U+0020-007E）
- ひらがな（U+3040-309F）
- カタカナ（U+30A0-30FF）
- 半角カタカナ（U+FF65-FF9F）
- 記号・句読点
- JIS第一水準漢字（約3,000文字）
- 医療・リハビリ関連の専門用語（例: 膝、腰、肩、屈、伸、歩行など）

**使用方法**:

```bash
node scripts/generate_chars.mjs
```

**出力**: `scripts/chars.txt` が生成されます。

**注意事項**:

- Node.js の `TextDecoder` が EUC-JP エンコーディングをサポートしている必要があります
- 通常の Node.js 環境（full-icu または最新版）では問題なく動作します

---

### 2. `subset-fonts.py`

**目的**: Noto Sans JP フォントをサブセット化し、WOFF形式で出力します。

**処理内容**:

1. `chars.txt` に含まれる文字のみを抽出
2. 不要なフォントテーブル（GPOS、GSUB、MATH等）を削除
3. ヒンティング情報を削除
4. WOFF形式（Zlib圧縮）で出力

**前提条件**:

- Python 3.6 以上
- 必要なPythonパッケージのインストール

**依存パッケージのインストール**:

```bash
pip install fonttools brotli
```

**使用方法**:

```bash
# Windows
py scripts/subset-fonts.py
```

**入力ファイル（Git管理外）**:

- `packages/assets/fonts/originals/NotoSansJP-Regular.ttf`
- `packages/assets/fonts/originals/NotoSansJP-Bold.ttf`

**出力ファイル（Git管理対象）**:

- `packages/assets/fonts/NotoSansJP-Regular.woff`
- `packages/assets/fonts/NotoSansJP-Bold.woff`

**目標サイズ**: 500-700KB（フォント1ファイルあたり）

**注意事項**:

- `@react-pdf/renderer` が WOFF2 形式をサポートしていないため、WOFF形式で出力します
- 元フォントファイルは `packages/assets/fonts/originals/` ディレクトリに配置してください
- このディレクトリは `.gitignore` に含まれているため、リポジトリには含まれません

---

### 3. `create-template-image-mapping.mjs`

**目的**: テンプレート内の画像とサンプル画像の対応関係をファイルサイズに基づいて特定し、JSONマッピングファイルを生成します。

**処理内容**:

1. `packages/assets/images/samples/` 内のサンプル画像をスキャンし、ファイルサイズでインデックス化
2. 各テンプレート（`packages/assets/templates/*/images/`）の画像をスキャン
3. ファイルサイズの一致によりサンプル画像との対応関係を特定
4. マッピング結果をJSONで出力

**使用方法**:

```bash
node scripts/create-template-image-mapping.mjs
```

**入力**:

- `packages/assets/images/samples/*.webp` - サンプル画像群
- `packages/assets/templates/*/images/*.webp` - 各テンプレートの画像

**出力**:

- `scripts/output/template-image-mapping.json` - マッピングファイル

**出力例**:

```json
{
  "low-back-pain": {
    "images/img_001.webp": "sample_lying_09",
    "images/img_002.webp": "sample_lying_03"
  }
}
```

**用途**:

- テンプレート内の重複画像を削除し、サンプル画像への参照に置き換えることで、アプリケーションのバンドルサイズを削減できます

---

### 4. `generate-pwa-icons.mjs`

**目的**: ロゴ画像から各種サイズのPWAアイコンを自動生成します。

**生成されるファイル**:

| ファイル名             | サイズ  | 用途                              |
| ---------------------- | ------- | --------------------------------- |
| `icon-192x192.png`     | 192×192 | Android用                         |
| `icon-512x512.png`     | 512×512 | Android用、スプラッシュスクリーン |
| `apple-touch-icon.png` | 180×180 | iOS用                             |

**前提条件**:

- Node.js
- `sharp` パッケージ（画像処理ライブラリ）

**依存パッケージのインストール**:

```bash
pnpm add -D sharp
```

**使用方法**:

```bash
node scripts/generate-pwa-icons.mjs
```

**入力**:

- `packages/assets/icons/logo.png` - ソースロゴ画像

**出力**:

- `packages/assets/icons/icon-192x192.png`
- `packages/assets/icons/icon-512x512.png`
- `packages/assets/icons/apple-touch-icon.png`

---

### 5. `convert-ogp-image.mjs`

**目的**: 正方形の画像を1200×630pxのOGP推奨サイズにクロップし、WebP形式に変換します。

**処理内容**:

1. 元画像のアスペクト比を計算
2. OGP推奨サイズ（1200×630）に合わせて中央クロップ
3. WebP形式（品質85%）で出力

**前提条件**:

- Node.js
- `sharp` パッケージ（画像処理ライブラリ）

**使用方法**:

```bash
node scripts/convert-ogp-image.mjs <入力ファイル> [出力ファイル]

# 例
node scripts/convert-ogp-image.mjs ogp_source.png apps/web/public/images/og-image.webp
```

**入力**:

- 任意のPNG/JPEG/WebP画像（正方形推奨）

**出力**:

- 1200×630pxのWebP画像（OGP推奨サイズ）

**用途**:

- noteやX、Facebookなどでリンク共有時にサムネイル画像として表示される
- `apps/web/src/app/layout.tsx` のOGPメタデータで参照

---

### 6. `chars.txt`

**目的**: フォントサブセット化に使用する文字リストファイルです。

**生成方法**:

- `generate_chars.mjs` を実行すると自動生成されます
- 手動で編集することも可能です（文字を追加・削除）

**文字数の目安**:

- 約6,000-7,000文字（重複除去後）
- 文字数を減らすとフォントサイズが小さくなりますが、表示できない文字が増える可能性があります

**カスタマイズ**:

- 特定の医療用語を追加したい場合は、`generate_chars.mjs` の `medicalRaw` 変数を編集してください
- または、`chars.txt` に直接文字を追加することも可能です

---

## ワークフロー

### フォントサブセット化（初回セットアップ）

1. **元フォントファイルの配置**

   ```bash
   # packages/assets/fonts/originals/ ディレクトリを作成
   mkdir -p packages/assets/fonts/originals

   # Noto Sans JP フォントファイルを配置
   # - NotoSansJP-Regular.ttf
   # - NotoSansJP-Bold.ttf
   ```

2. **Pythonパッケージのインストール**

   ```bash
   pip install fonttools brotli
   ```

3. **文字リストの生成**

   ```bash
   node scripts/generate_chars.mjs
   ```

4. **フォントのサブセット化**
   ```bash
   py scripts/subset-fonts.py
   ```

### 文字セットの更新が必要な場合

1. `generate_chars.mjs` を編集（医療用語の追加など）
2. `node scripts/generate_chars.mjs` を実行して `chars.txt` を再生成
3. `py scripts/subset-fonts.py` を実行してフォントを再生成

### PWAアイコンの更新

1. `packages/assets/icons/logo.png` を新しいロゴに置き換え
2. `node scripts/generate-pwa-icons.mjs` を実行

### テンプレート画像マッピングの更新

テンプレートやサンプル画像を追加・変更した場合：

```bash
node scripts/create-template-image-mapping.mjs
```

---

## トラブルシューティング

### `subset-fonts.py` でエラーが発生する場合

**エラー: `chars.txt` が存在しません**

- `generate_chars.mjs` を実行して `chars.txt` を生成してください

**エラー: 元フォントファイルが見つかりません**

- `packages/assets/fonts/originals/` ディレクトリに Noto Sans JP の TTF ファイルを配置してください
- ファイル名は正確に `NotoSansJP-Regular.ttf` と `NotoSansJP-Bold.ttf` である必要があります

**エラー: `fonttools` が見つかりません**

- `pip install fonttools brotli` を実行してパッケージをインストールしてください

### フォントサイズが目標範囲外の場合

**サイズが大きすぎる（700KB以上）**:

- `chars.txt` から使用頻度の低い文字を削除してください
- JIS第一水準漢字から、医療・リハビリ関連の漢字のみに絞り込むことを検討してください

**サイズが小さすぎる（500KB未満）**:

- 文字が不足している可能性があります
- `chars.txt` の内容を確認し、必要な文字が含まれているか確認してください

### `generate_chars.mjs` でエラーが発生する場合

**エラー: TextDecoder/EUC-JP error**

- Node.js のバージョンを確認してください（推奨: Node.js 18以上）
- `full-icu` パッケージをインストールするか、最新の Node.js を使用してください

### `generate-pwa-icons.mjs` でエラーが発生する場合

**エラー: ソースファイルが見つかりません**

- `packages/assets/icons/logo.png` が存在することを確認してください

**エラー: sharp関連のエラー**

- `pnpm add -D sharp` で sharp パッケージをインストールしてください
- Node.js のバージョンが sharp の要件を満たしていることを確認してください

### `create-template-image-mapping.mjs` で警告が出る場合

**警告: マッチするサンプル画像が見つかりません**

- 該当するテンプレート画像に対応するサンプル画像が存在しない可能性があります
- サンプル画像を追加するか、テンプレート画像が正しいか確認してください

**警告: サイズが重複しています**

- 異なる画像が同じファイルサイズを持っているため、マッピングが一意に特定できません
- 画像を再圧縮するか、マッピングを手動で確認してください

---

## 関連ファイル

- `packages/assets/fonts/originals/` - 元フォントファイル（Git管理外）
- `packages/assets/fonts/` - サブセット化されたフォントファイル（Git管理対象）
- `packages/assets/icons/` - PWAアイコン（Git管理対象）
- `packages/assets/images/samples/` - サンプル画像（Git管理対象）
- `packages/assets/templates/` - テンプレート定義とその画像
- `.gitignore` - `originals/` ディレクトリが除外されています

---

## 参考情報

- [fonttools ドキュメント](https://fonttools.readthedocs.io/)
- [Noto Sans JP ダウンロード](https://fonts.google.com/noto/specimen/Noto+Sans+JP)
- [WOFF 形式の仕様](https://www.w3.org/TR/WOFF/)
- [sharp ドキュメント](https://sharp.pixelplumbing.com/)
- [PWA アイコン要件](https://web.dev/articles/add-manifest)
