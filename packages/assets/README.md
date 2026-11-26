# packages/assets ディレクトリ

このディレクトリには、アプリケーションで使用される共有静的アセット（フォント、アイコン、画像、テンプレート）を配置します。各アプリの公開ディレクトリへコピーされる前提で管理します。

## ディレクトリ構成

```
packages/assets/
├── fonts/            # PDF 生成用日本語フォント
├── icons/            # アプリケーションアイコン
├── images/           # サンプル画像
│   └── samples/      # デモ用サンプル自主トレ画像
│       └── thumbs/   # 画像ライブラリ一覧用の軽量サムネイル（生成物）
└── templates/        # プリセットテンプレート
    └── {template-id}/
        ├── project.json
        └── images/
```

---

## `fonts/` - PDF 生成用フォント

PDF 生成時に使用する日本語フォントを配置します。

### 現在のフォント

| ファイル名                | サイズ   | 用途                             |
| ------------------------- | -------- | -------------------------------- |
| `NotoSansJP-Regular.woff` | 約 604KB | 本文用（サブセット済み）         |
| `NotoSansJP-Bold.woff`    | 約 610KB | 見出し・強調用（サブセット済み） |

### `originals/` サブディレクトリ

オリジナルの TTF ファイル（約 5.3MB 各）を保管しています。サブセット生成時の元ファイルとして使用します。

### フォント追加・更新の手順

1. 新しいフォントの TTF ファイルを `fonts/originals/` に配置
2. `scripts/` 内のサブセット生成スクリプトを使用して WOFF 形式に変換
3. 生成されたサブセットフォントを `fonts/` に配置
4. `packages/core/src/lib/constants/pdf.ts` でフォント登録を更新

> **注意**: CDN からのフォント読み込みは CSP 違反となるため、必ずローカル配置してください。

---

## `icons/` - アプリケーションアイコン

| ファイル名 | 用途                  |
| ---------- | --------------------- |
| `logo.png` | アプリロゴ（約 14KB） |

---

## `images/samples/` - サンプル画像

デモ用のサンプル自主トレーニング画像を配置します。ユーザーが画像なしでもアプリを試せるよう提供しています。

### 現在のサンプル画像

合計 **42枚** のサンプル画像（2 コマ構成）を収録しています：

| カテゴリ         | 画像数 |
| ---------------- | ------ |
| 臥位（lying）    | 20枚   |
| 座位（sitting）  | 12枚   |
| 立位（standing） | 10枚   |

### ファイル命名規則

```text
{position}_{order:2桁}_{slug}.webp
```

**例:**

- `standing_01_stand-up-table.webp`
- `sitting_04_arm-raise.webp`
- `lying_02_SLR.webp`

> UI 上の日本語表示名は `packages/core/src/lib/constants/sampleImages.ts` の `fileName` フィールド（例: `"standing_01_起立訓練（テーブル）"`）で定義します。

### 新しいサンプル画像を追加する手順

1. **画像を WebP 形式で用意**
   - 推奨サイズ: 長辺 1200px 以下
   - ファイルサイズ: 50KB 以下推奨

2. **命名規則に従ってファイル名を設定**

   ```text
   {position}_{order:2桁}_{displayName}.webp
   ```

3. **画像を `packages/assets/images/samples/` に配置**

4. **マニフェストファイルを更新**

   `packages/core/src/lib/constants/sampleImages.ts` の `SAMPLE_IMAGES` 配列に追加:

   ```typescript
   {
     id: "sample_{position}_{order}",
     fileName: "{position}_{order}_{displayName}",
     path: "/images/samples/{position}_{order}_{displayName}.webp",
   },
   ```

**例（新しい立位画像を追加）:**

```typescript
// packages/core/src/lib/constants/sampleImages.ts

export const SAMPLE_IMAGES: readonly SampleImage[] = [
  // ... 既存のエントリ

  // 新規追加
  {
    id: "sample_standing_07",
    fileName: "standing_07_ランジ",
    path: "/images/samples/standing_07_ランジ.webp",
  },
];
```

5. **一覧用サムネイルを生成**

   ```bash
   node scripts/generate-sample-thumbnails.mjs
   ```

   `images/samples/thumbs/` に同じファイル名の軽量サムネイル（長辺 240px）が書き出されます。生成物もコミットしてください（サムネイルがないとテストが失敗します）。

> **重要**: `id` は `sample_` プレフィックスで始まる必要があります。このプレフィックスでサンプル画像とユーザーアップロード画像を区別しています。

### `thumbs/` - 一覧用サムネイル

画像ライブラリの一覧（約 64px のセル）は、印刷用の元画像（合計 約 1.06MB）の代わりにこのサムネイル（合計 約 97KB）を読み込みます。パスは `getSampleThumbnailPath(path)`（`sampleImages.ts`）で求めます。ホバー拡大・カード・PDF・ZIP は元画像を使います。直接編集せず、スクリプトで再生成してください。

---

## `templates/` - プリセットテンプレート

新規プロジェクト作成時に選択可能なプリセットテンプレートを配置します。

### テンプレートの構成

各テンプレートは独自のディレクトリを持ち、以下の構成となります:

```text
templates/
└── {template-id}/
    ├── project.json     # プロジェクトデータ（必須）
    └── images/          # テンプレート用画像（任意）
        ├── img_001.webp
        ├── img_002.webp
        └── ...
```

### 新しいテンプレートを追加する手順

#### 1. テンプレートディレクトリを作成

```text
packages/assets/templates/{template-id}/
├── project.json
└── images/
    └── (画像ファイル)
```

- `{template-id}`: 英数字とハイフンのみ使用（例: `lower-back-exercises`）

#### 2. `project.json` を作成

```json
{
  "meta": {
    "version": "1.3.1",
    "createdAt": "2026-01-25T00:00:00.000Z",
    "updatedAt": "2026-01-25T00:00:00.000Z",
    "title": "テンプレート名",
    "projectType": "training"
  },
  "settings": {
    "layoutType": "grid2",
    "themeColor": "#3b82f6"
  },
  "items": [
    {
      "id": "一意のID（nanoid形式）",
      "order": 0,
      "title": "運動名",
      "imageSource": "images/img_001.webp",
      "description": "運動の説明文",
      "dosages": {
        "reps": "10回",
        "sets": "3セット",
        "frequency": "1日3回"
      },
      "precautions": [
        {
          "id": "一意のID",
          "value": "注意事項1"
        }
      ]
    }
  ]
}
```

**各フィールドの説明:**

| フィールド            | 説明                                               |
| --------------------- | -------------------------------------------------- |
| `meta.version`        | プロジェクトファイルバージョン                     |
| `meta.title`          | プロジェクトタイトル（PDF ヘッダーにも使用）       |
| `meta.projectType`    | `"training"` 固定                                  |
| `settings.layoutType` | グリッドレイアウト（`grid1`〜`grid4`）             |
| `settings.themeColor` | テーマカラー（HEX 形式）                           |
| `items[].imageSource` | 画像パス（相対パス）またはサンプル画像 ID（例: `"sample_lying_01"`） |
| `items[].dosages`     | 回数・セット数・頻度                               |
| `items[].precautions` | 注意事項リスト                                     |

#### 3. 画像を配置

テンプレート用画像を `images/` サブディレクトリに配置します。

**推奨形式:**

- フォーマット: WebP
- ファイルサイズ: 各 50KB 以下
- ファイル名: `img_{連番:3桁}.webp`（例: `img_001.webp`）

> **注意**: `imageSource` には `images/img_001.webp` のようにテンプレートディレクトリからの相対パスを指定します。

#### 4. メタデータを登録

`packages/core/src/lib/templates/index.ts` の `TEMPLATES` 配列に追加:

```typescript
export const TEMPLATES: TemplateMetadata[] = [
  // 既存のテンプレート...

  // 新規追加
  {
    id: "lower-back-exercises", // project.json のディレクトリ名と一致
    name: "腰痛体操セット", // UI に表示される名前
    description: "腰痛予防・改善のための運動メニュー",
    cardCount: 6, // items 配列の要素数
    path: "lower-back-exercises", // templates/ からの相対パス
  },
];
```

### 既存テンプレートの例

現在の公式プリセットテンプレート（全 8 種類）は、サンプル画像 ID を参照する形で `project.json` のみで構成されています（独自画像を含める場合は `images/` を併用できます）：

#### `low-back-pain` - 腰痛体操

```text
templates/low-back-pain/
└── project.json      # 6カードのプロジェクト（サンプル画像 ID を参照）
```

---

## 関連ファイル

| ファイルパス                        | 説明                                     |
| ----------------------------------- | ---------------------------------------- |
| `packages/core/src/lib/constants/sampleImages.ts` | サンプル画像のマニフェスト定義           |
| `packages/core/src/lib/templates/index.ts`        | テンプレートメタデータ定義               |
| `packages/core/src/lib/constants/template.ts`     | テンプレート関連の定数（パス、ラベル等） |
| `packages/core/src/types/template.ts`             | テンプレートの型定義                     |
| `packages/core/src/utils/template.ts`             | テンプレート読み込みユーティリティ       |

---

## 注意事項

1. **CSP 遵守**: 外部 CDN からのリソース読み込みは禁止されています。すべてのアセットはローカル配置してください。

2. **画像形式**: WebP 形式を推奨。ファイルサイズを小さく保つことで、IndexedDB への保存やエクスポート時のパフォーマンスが向上します。

3. **ファイル名の日本語**: ファイル名に日本語を使用できますが、URL エンコーディングに注意してください。

4. **ID の一意性**: `items[].id` や `precautions[].id` には `nanoid` 形式の一意 ID を使用してください。
