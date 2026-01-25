# @rehab-grid/core

アプリケーション共通のコアロジック、ユーティリティ、型定義を提供するパッケージです。

## 概要

このパッケージは以下の責務を担います：

| 責務 | 説明 |
|-----|------|
| **データ永続化** | Dexie を用いた IndexedDB 管理（プロジェクト・画像保存） |
| **状態管理** | Zustand によるグローバルストア（エディタ・モーダル） |
| **検証・サニタイズ** | Zod スキーマ + DOMPurify による安全性確保 |
| **マルチメディア処理** | 画像圧縮、PDF 生成（Web Worker）、ZIP 操作 |
| **定数・テンプレート管理** | 8 個の自主トレテンプレートと 140 以上のメッセージ定数 |

---

## エクスポート一覧

### メインエクスポート

```typescript
import {
  // データベース
  db,
  saveProject,
  loadProject,
  createNewProject,
  saveImage,
  getImage,
  deleteImage,

  // ストア
  useEditorStore,
  useModalStore,

  // スキーマ
  projectFileSchema,
  sanitizeText,

  // 定数
  APP_NAME,
  APP_VERSION,
  MESSAGES,
  SAMPLE_IMAGES,

  // テンプレート
  TEMPLATES,

  // プラットフォーム
  Platform,

  // ユーティリティ
  cn,
  debounce,
  downloadBlob,
  exportToJSON,
  exportToZip,
  importProject,
  processAndSaveImage,
} from "@rehab-grid/core";
```

### サブパスエクスポート

```typescript
// フック（個別インポート推奨）
import { useCanvasImages } from "@rehab-grid/core/hooks/useCanvasImages";
import { useImageUpload } from "@rehab-grid/core/hooks/useImageUpload";
import { usePasteImage } from "@rehab-grid/core/hooks/usePasteImage";
import { usePdfWorker } from "@rehab-grid/core/hooks/usePdfWorker";

// スキーマ
import { projectFileSchema } from "@rehab-grid/core/lib/schemas";

// 型定義
import type { EditorItem, ProjectFile } from "@rehab-grid/core/types";
```

---

## ディレクトリ構成

```
packages/core/
├── src/
│   ├── index.ts            # バレルエクスポート
│   ├── hooks/              # カスタムフック（7個）
│   │   ├── useCanvasImages.ts
│   │   ├── useHasEditorHistory.ts
│   │   ├── useImageUpload.ts
│   │   ├── useMediaQuery.ts
│   │   ├── useObjectUrls.ts
│   │   ├── usePasteImage.ts
│   │   └── usePdfWorker.ts
│   ├── lib/
│   │   ├── changelog/      # 更新履歴エントリ
│   │   ├── constants/      # 定数定義（12モジュール）
│   │   ├── db/             # IndexedDB（Dexie）
│   │   ├── schemas/        # Zod スキーマ
│   │   ├── store/          # Zustand ストア
│   │   ├── templates/      # テンプレートメタデータ
│   │   ├── platform.ts     # プラットフォーム検出
│   │   └── utils.ts        # cn() 関数
│   ├── types/              # 型定義（8モジュール）
│   ├── utils/              # ユーティリティ関数（9モジュール）
│   └── workers/            # Web Worker
│       └── pdf.worker.ts
├── tests/                  # テストファイル（21個）
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## hooks/ - カスタムフック

### フック一覧

| フック名 | 用途 | 主な戻り値 |
|---------|------|-----------|
| `useCanvasImages` | IndexedDB + サンプル画像の URL 統合 | `Map<string, string>` (id → URL) |
| `useHasEditorHistory` | LocalStorage からエディタ使用履歴を判定 | `boolean` |
| `useImageUpload` | ファイル選択による画像アップロード | `{ openFilePicker, isUploading }` |
| `useMediaQuery` | メディアクエリ監視 | `boolean` |
| `useObjectUrls` | Blob → Object URL 変換・メモリ管理 | `Map<string, string>` |
| `usePasteImage` | クリップボード貼り付け（Ctrl+V） | `void`（自動保存） |
| `usePdfWorker` | Web Worker による非同期 PDF 生成 | `{ generatePdf, state, blob }` |

### 使用例

```typescript
// 画像ライブラリ用 URL Map 取得
const { imageUrlMap, isLoading } = useCanvasImages(imageIds);

// ファイル選択ダイアログ
const { openFilePicker, isUploading } = useImageUpload({
  onSuccess: (id) => console.log("Saved:", id),
  onError: (err) => console.error(err),
});

// クリップボード貼り付け監視
usePasteImage({
  onSuccess: (id) => addImageToCanvas(id),
  enabled: isEditorFocused,
});

// PDF 生成
const { generatePdf, state, blob } = usePdfWorker();
await generatePdf(projectData);
```

---

## lib/ - コアロジック

### db/ - IndexedDB 管理

Dexie を使用した IndexedDB ラッパー。2 つのテーブルを管理します。

| テーブル | 用途 | 主キー |
|---------|------|--------|
| `projects` | プロジェクトデータ | `id` |
| `images` | 画像 Blob | `id` |

```typescript
import {
  db,
  saveProject,
  loadProject,
  createNewProject,
  saveImage,
  getImage,
  getImages,
  deleteImage,
  deleteProject,
} from "@rehab-grid/core";

// プロジェクト操作
await saveProject(projectData);
const project = await loadProject();
await createNewProject("新しい指導箋");

// 画像操作
await saveImage("img_001", blob, "exercise.webp");
const imageRecord = await getImage("img_001");
const imageMap = await getImages(["img_001", "img_002"]); // Map<string, ImageRecord>
await deleteImage("img_001");
```

### store/ - Zustand ストア

#### useEditorStore

エディタの状態管理。アイテム、メタデータ、レイアウト設定を管理します。

```typescript
const {
  // 状態
  items,
  meta,
  settings,

  // アクション
  addNewItem,
  updateItem,
  deleteItem,
  reorderItems,
  setLayoutType,
  setMeta,
  loadFromProject,
  reset,
} = useEditorStore();
```

#### useModalStore

セキュリティ免責モーダルの状態管理。2 層キャッシュ（SessionStorage + LocalStorage）を使用。

```typescript
const {
  isOpen,
  openModal,
  closeModal,
  checkShouldShow,
} = useModalStore();
```

### schemas/ - Zod スキーマ

インポート時のバリデーションと XSS 対策を提供。

```typescript
import {
  projectFileSchema,
  projectMetaSchema,
  projectSettingsSchema,
  editorItemSchema,
  layoutTypeSchema,
  dosagesSchema,
  precautionSchema,
  sanitizeText,
} from "@rehab-grid/core/lib/schemas";

// インポートデータのバリデーション
const result = projectFileSchema.safeParse(importedData);
if (result.success) {
  const validProject = result.data;
}

// XSS 対策（DOMPurify 使用）
const safeText = sanitizeText(userInput);
```

### constants/ - 定数定義

| モジュール | 主な定数 |
|-----------|---------|
| `app.ts` | `APP_NAME`, `APP_VERSION`, `AUTOSAVE_DELAY`, `CURRENT_PROJECT_ID` |
| `shared.ts` | `LAYOUT_COLUMNS`, `FONT_SIZES`, `LABELS`, `TEXT_LIMITS` |
| `editor.ts` | `DEFAULT_PROJECT_TITLE`, `MAX_ITEM_COUNT`, `LAYOUT_OPTIONS` |
| `messages.ts` | UI メッセージ（140 以上） |
| `image.ts` | `MAX_FILE_SIZE`, `IMAGE_ACCEPT_TYPES`, `MAX_IMPORT_ZIP_SIZE` |
| `sampleImages.ts` | `SAMPLE_IMAGES`, `getSampleImagePath()`, `isSampleImage()` |
| `pdf.ts` | `PDF_PAGE_SIZE`, `PDF_MARGINS`, `PDF_FONT_FAMILY`, `PDF_COLORS` |
| `precautions.ts` | `PRECAUTION_SNIPPETS`, `PRECAUTION_SNIPPET_CATEGORIES` |
| `externalLinks.ts` | `GITHUB_REPO_URL`, `FEEDBACK_FORM_URL` |
| `modal.ts` | `SECURITY_DISCLAIMER_EXPIRY_MS` |

```typescript
import {
  APP_NAME,
  MESSAGES,
  SAMPLE_IMAGES,
  isSampleImage,
} from "@rehab-grid/core";

console.log(APP_NAME); // "リハぐり"
console.log(MESSAGES.EXPORT_SUCCESS); // "エクスポートが完了しました"
console.log(isSampleImage("sample_standing_01")); // true
```

### templates/ - テンプレート管理

8 個のプリセットテンプレートのメタデータを管理。

```typescript
import { TEMPLATES } from "@rehab-grid/core";

// TEMPLATES の構造
type TemplateMetadata = {
  id: string;          // "lying-ex"
  name: string;        // "寝たまま簡単トレーニング"
  description: string; // "ベッド上でできる運動メニュー"
  cardCount: number;   // 4
  path: string;        // "lying-ex"
};
```

| テンプレート ID | 名前 | カード数 |
|----------------|------|---------|
| `stroke-bed` | 脳卒中向け（ベッド上） | 6 |
| `stroke-sitting` | 脳卒中向け（座位） | 6 |
| `stroke-upper-limb` | 脳卒中向け（上肢） | 4 |
| `swallowing` | 嚥下体操 | 8 |
| `full-body` | 全身の自主トレ | 8 |
| `lower-limb-ortho` | 下肢整形外科術後 | 6 |
| `low-back-pain` | 腰痛体操 | 6 |
| `shoulder-stiffness` | 肩こり体操 | 6 |

---

## utils/ - ユーティリティ関数

| ファイル | 主な関数 | 用途 |
|---------|---------|------|
| `debounce.ts` | `debounce()` | 関数呼び出しの遅延実行 |
| `download.ts` | `downloadBlob()`, `downloadJSON()` | ファイルダウンロード |
| `editor.ts` | `getDosageBadgeLayout()` | バッジレイアウト計算 |
| `export.ts` | `exportToJSON()`, `exportToZip()`, `importProject()` | プロジェクトのエクスポート・インポート |
| `externalLink.ts` | `isAllowedExternalUrl()` | 外部リンク検証 |
| `image.ts` | `processAndSaveImage()`, `isValidImageBlob()`, `partitionImageIds()` | 画像処理・検証 |
| `pdf.ts` | `calculatePdfCardWidth()`, `truncateToLines()` | PDF レイアウト計算 |
| `project.ts` | プロジェクト操作 | プロジェクトデータ操作 |
| `template.ts` | テンプレート読み込み | テンプレート適用処理 |

### 使用例

```typescript
import {
  exportToJSON,
  exportToZip,
  importProject,
  processAndSaveImage,
  debounce,
} from "@rehab-grid/core";

// JSON エクスポート（軽量、画像なし）
const jsonBlob = await exportToJSON(projectData);

// ZIP エクスポート（完全バックアップ、画像含む）
const zipBlob = await exportToZip(projectData, imageMap);

// インポート（JSON または ZIP）
const result = await importProject(file);
if (result.success) {
  const { project, images } = result.data;
}

// 画像処理（圧縮 + IndexedDB 保存）
const imageId = await processAndSaveImage(file, {
  maxSizeMB: 1,
  maxWidthOrHeight: 1200,
});

// デバウンス
const debouncedSave = debounce(saveProject, 1000);
```

---

## types/ - 型定義

### 主要な型

```typescript
import type {
  // エディタ関連
  EditorItem,
  Dosages,
  Precaution,
  BlobRecord,
  UnifiedImageRecord,

  // プロジェクト関連
  ProjectFile,
  ProjectMeta,
  ProjectSettings,
  ProjectRecord,
  ImageRecord,
  ImportResult,

  // PDF 関連
  PdfGenerationData,
  PdfGenerationState,
  PdfWorkerRequest,
  PdfWorkerResponse,

  // その他
  ChangelogEntry,
  ModalState,
  NavLink,
  TemplateMetadata,
} from "@rehab-grid/core/types";
```

### 型定義の詳細

#### EditorItem

```typescript
type EditorItem = {
  id: string;
  order: number;
  title: string;
  imageSource: string;
  description: string;
  dosages?: Dosages;
  precautions: Precaution[];
};

type Dosages = {
  reps?: string;      // "10回"
  sets?: string;      // "3セット"
  frequency?: string; // "1日3回"
};

type Precaution = {
  id: string;
  value: string;
};
```

#### ProjectFile

```typescript
type ProjectFile = {
  meta: ProjectMeta;
  settings: ProjectSettings;
  items: EditorItem[];
};

type ProjectMeta = {
  version: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  projectType: "training";
};

type ProjectSettings = {
  layoutType: LayoutType;
  themeColor: string;
};

type LayoutType = "grid1" | "grid2" | "grid3" | "grid4";
```

---

## workers/ - Web Worker

### pdf.worker.ts

`@react-pdf/renderer` を使用して PDF をメインスレッドをブロックせずに生成。

```typescript
// Worker へのメッセージ
type PdfWorkerRequest = {
  type: "generate";
  data: PdfGenerationData;
};

// Worker からのレスポンス
type PdfWorkerResponse =
  | { type: "progress"; progress: number }
  | { type: "success"; blob: Blob }
  | { type: "error"; error: string };
```

フック経由で使用:

```typescript
const { generatePdf, state, blob, error } = usePdfWorker();

// 生成開始
await generatePdf({
  items,
  meta,
  settings,
  imageUrlMap,
});

// 状態監視
// state: "idle" | "generating" | "success" | "error"
```

---

## 外部依存ライブラリ

| ライブラリ | バージョン | 用途 |
|-----------|-----------|------|
| zustand | 5.0.10 | グローバル状態管理 |
| dexie | 4.2.1 | IndexedDB ラッパー |
| dexie-react-hooks | 1.1.9 | Dexie の React フック |
| zod | 4.3.6 | スキーマバリデーション |
| @react-pdf/renderer | 4.3.2 | PDF 生成 |
| browser-image-compression | 2.0.2 | 画像圧縮 |
| jszip | 3.10.1 | ZIP 生成・展開 |
| dompurify | 3.3.1 | XSS 対策 |
| nanoid | 5.1.6 | 一意 ID 生成 |
| lucide-react | 0.563.0 | アイコン |
| tailwind-merge | 3.4.0 | Tailwind クラス結合 |
| clsx | 2.1.1 | 条件付きクラス結合 |

---

## テスト構成

### テストファイル構造

```
tests/
├── hooks/
│   ├── useCanvasImages.test.tsx
│   ├── useImageUpload.test.tsx
│   ├── useMediaQuery.test.tsx
│   ├── useObjectUrls.test.tsx
│   ├── usePasteImage.test.tsx
│   └── usePdfWorker.test.tsx
├── lib/
│   ├── db/
│   │   └── index.test.ts
│   ├── schemas/
│   │   ├── project.test.ts
│   │   └── sanitize.test.ts
│   ├── store/
│   │   ├── useEditorStore.test.ts
│   │   └── useModalStore.test.ts
│   └── templates/
│       └── index.test.ts
├── utils/
│   ├── debounce.test.ts
│   ├── download.test.ts
│   ├── editor.test.ts
│   ├── export.test.ts
│   ├── image.test.ts
│   ├── pdf.test.ts
│   ├── project.test.ts
│   └── template.test.ts
└── workers/
    └── pdf.worker.test.ts
```

### テスト実行

```bash
# このパッケージのテストのみ
pnpm --filter @rehab-grid/core test

# ウォッチモード
pnpm --filter @rehab-grid/core test:watch

# カバレッジ
pnpm --filter @rehab-grid/core test:coverage
```

---

## 新規モジュール追加時の手順

### カスタムフックの追加

1. `src/hooks/useXxx.ts` にフックを実装
2. `src/index.ts` にエクスポートを追加（必要に応じて）
3. `tests/hooks/useXxx.test.tsx` にテストを追加
4. JSDoc コメントを記述

```typescript
// src/hooks/useNewHook.ts
/**
 * 新しいフックの説明
 * @param options - オプション
 * @returns 戻り値の説明
 */
export function useNewHook(options: NewHookOptions): NewHookReturn {
  // 実装
}
```

### ユーティリティ関数の追加

1. `src/utils/xxx.ts` に関数を実装
2. `src/index.ts` にエクスポートを追加
3. `tests/utils/xxx.test.ts` にテストを追加

### 型定義の追加

1. 既存ファイルに追加、または `src/types/xxx.ts` に新規作成
2. `src/types/index.ts` にエクスポートを追加

### 定数の追加

1. `src/lib/constants/` 内の適切なファイルに追加
2. `src/lib/constants/index.ts` にエクスポートを追加

---

## 関連ファイル

| ファイルパス | 説明 |
|-------------|------|
| `packages/README.md` | パッケージ一覧と依存関係図 |
| `packages/assets/README.md` | アセット管理ガイド |
| `packages/config/README.md` | 設定パッケージガイド |
| `packages/ui/` | UI コンポーネント（このパッケージに依存） |
| `packages/pages/` | ページコンポーネント（このパッケージに依存） |

---

## 注意事項

1. **useEffect 禁止**: アプリケーションロジックでの `useEffect` は原則禁止。代わりに `useLiveQuery`、Zustand Actions、イベントハンドラを使用

2. **型安全性**: `noUncheckedIndexedAccess` が有効なため、配列・オブジェクトアクセス時は `undefined` を考慮

3. **XSS 対策**: ユーザー入力は必ず `sanitizeText()` でサニタイズ

4. **画像処理**: `processAndSaveImage()` は自動的に圧縮（長辺 1200px、WebP 推奨）を行う
