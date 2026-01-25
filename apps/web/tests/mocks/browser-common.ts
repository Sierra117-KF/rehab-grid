/**
 * ブラウザテスト用 共通ヘルパー・モックファクトリー
 *
 * 結合テスト（ブラウザモード）で共通して使用する
 * ヘルパー関数とモック実装を提供します。
 *
 * @remarks
 * vi.mock は静的解析時に処理されるため、各テストファイルで個別に呼び出す必要があります。
 * このファイルではモック実装のファクトリー関数とヘルパー関数のみを提供します。
 *
 * @example
 * ```typescript
 * // テストファイルでの使用例
 * import { vi } from "vitest";
 * import {
 *   createDbMock,
 *   createNextImageMock,
 *   createTestMeta,
 *   createTestItem,
 *   getInitialEditorState,
 * } from "@/tests/mocks/browser-common";
 *
 * vi.mock("@/lib/db", () => createDbMock());
 * vi.mock("next/image", () => createNextImageMock());
 * ```
 */
import type { EditorItem, LayoutType, ProjectMeta } from "@rehab-grid/core/types";
import { vi } from "vitest";

// ========== テスト用定数 ==========

/**
 * 「状態変化がないこと」を確認するための待機時間（ミリ秒）
 *
 * @remarks
 * 非同期処理が完了する機会を与えた後に、状態が変化していないことを確認するために使用。
 * vi.waitFor は「条件が満たされるまで待機」するため、この用途には適さない。
 */
export const WAIT_FOR_NO_STATE_CHANGE_MS = 100;

// ========== モックファクトリー ==========

/**
 * useLiveQuery のモック関数を生成
 *
 * vi.hoisted で呼び出す必要があります。
 */
export function createMockUseLiveQuery() {
  return vi.fn(() => []);
}

/**
 * dexie-react-hooks モックの実装を返す
 *
 * @param mockUseLiveQuery - vi.hoisted で生成した mockUseLiveQuery
 */
export function createDexieReactHooksMock(
  mockUseLiveQuery: ReturnType<typeof vi.fn>
) {
  return {
    useLiveQuery: mockUseLiveQuery,
  };
}

/**
 * /lib/db モックの実装を返す
 */
export function createDbMock() {
  return {
    db: {
      images: {
        orderBy: vi.fn(() => ({
          reverse: vi.fn(() => ({
            toArray: vi.fn(async () => Promise.resolve([])),
          })),
        })),
        put: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        bulkGet: vi.fn().mockResolvedValue([]),
      },
      projects: {
        put: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      },
    },
    loadProject: vi.fn().mockResolvedValue(undefined),
    saveProject: vi.fn().mockResolvedValue(undefined),
    createNewProject: () => ({
      meta: {
        version: "1.0.0",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        title: "無題のプロジェクト",
        projectType: "training",
      },
      settings: {
        layoutType: "grid2",
        themeColor: "#3b82f6",
      },
      items: [],
    }),
    deleteProject: vi.fn().mockResolvedValue(undefined),
    deleteImage: vi.fn().mockResolvedValue(undefined),
    saveImage: vi.fn().mockResolvedValue(undefined),
    getImage: vi.fn().mockResolvedValue(undefined),
    getImages: vi.fn().mockResolvedValue(new Map()),
  };
}

/**
 * next/image モックの実装を返す（ブラウザモード用）
 *
 * @remarks
 * 非同期でReactをインポートするため、vi.mock 内で使用します。
 */
export async function createNextImageMock() {
  const { createElement } = await import("react");
  const mod = {
    default: (props: Record<string, unknown>) => {
      const { src, alt, className, draggable } = props;
      return createElement("img", {
        src: src as string,
        alt: alt as string,
        className: className as string,
        draggable: draggable as boolean,
      });
    },
  };
  (mod as Record<string, unknown>).__esModule = true;
  return mod;
}

// ========== テストデータ生成ヘルパー ==========

/**
 * テスト用の ProjectMeta を生成
 *
 * @param overrides - 上書きするプロパティ
 */
export function createTestMeta(
  overrides: Partial<ProjectMeta> = {}
): ProjectMeta {
  return {
    version: "1.0.0",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    title: "テストプロジェクト",
    projectType: "training",
    ...overrides,
  };
}

/**
 * テスト用の EditorItem を生成
 *
 * @param overrides - 上書きするプロパティ
 */
export function createTestItem(
  overrides: Partial<EditorItem> = {}
): EditorItem {
  return {
    id: "test-item-1",
    order: 0,
    title: "テスト運動",
    imageSource: "",
    description: "",
    ...overrides,
  };
}

/**
 * EditorStore の初期状態を生成
 *
 * @param overrides - 上書きするプロパティ
 */
export function getInitialEditorState(
  overrides: Partial<{
    isLoaded: boolean;
    meta: ProjectMeta;
    items: EditorItem[];
    layoutType: LayoutType;
    themeColor: string;
    selectedItemId: string | null;
    mobileImageLibraryOpen: boolean;
    mobilePropertyPanelOpen: boolean;
    mobileImageLibraryTargetItemId: string | null;
  }> = {}
) {
  return {
    isLoaded: true,
    meta: createTestMeta({ title: "無題のプロジェクト" }),
    items: [] as EditorItem[],
    layoutType: "grid2" as LayoutType,
    themeColor: "#3b82f6",
    selectedItemId: null,
    mobileImageLibraryOpen: false,
    mobilePropertyPanelOpen: false,
    mobileImageLibraryTargetItemId: null,
    ...overrides,
  };
}

// ========== D&D テスト用ヘルパー ==========

/**
 * HTML5 D&D イベントをシミュレートするヘルパー
 *
 * userEvent.dragAndDrop では dataTransfer が正しく伝播しない場合があるため、
 * イベントを手動で作成・ディスパッチして確実にテストする
 *
 * @param sourceElement - ドラッグ元の要素
 * @param targetElement - ドロップ先の要素
 * @param dataType - dataTransfer に設定するデータタイプ
 * @param dataValue - dataTransfer に設定するデータ値
 */
export function simulateDragAndDrop(
  sourceElement: Element,
  targetElement: Element,
  dataType: string,
  dataValue: string
): void {
  const dataTransfer = new DataTransfer();
  dataTransfer.setData(dataType, dataValue);

  // dragstart イベント（ソース要素で発火）
  sourceElement.dispatchEvent(
    new DragEvent("dragstart", {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    })
  );

  // dragover イベント（ターゲット要素で発火、preventDefault が必要なためcancelableをtrue）
  targetElement.dispatchEvent(
    new DragEvent("dragover", {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    })
  );

  // drop イベント（ターゲット要素で発火）
  targetElement.dispatchEvent(
    new DragEvent("drop", {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    })
  );

  // dragend イベント（ソース要素で発火）
  sourceElement.dispatchEvent(
    new DragEvent("dragend", {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    })
  );
}

// ========== クリップボード ペーストテスト用ヘルパー ==========

/**
 * テスト用の画像ファイルを生成
 *
 * @param name - ファイル名
 * @param type - MIMEタイプ
 * @returns テスト用 File オブジェクト
 */
export function createTestImageFile(
  name = "test.png",
  type = "image/png"
): File {
  return new File(["dummy-image-data"], name, { type });
}

/**
 * テスト用の DataTransferItem を生成
 *
 * @param type - MIMEタイプ
 * @param file - ファイル（nullの場合はテキストアイテム）
 * @returns DataTransferItem モック
 */
export function createDataTransferItem(
  type: string,
  file: File | null
): DataTransferItem {
  return {
    kind: file ? "file" : "string",
    type,
    getAsFile: () => file,
    getAsString: vi.fn(),
    webkitGetAsEntry: vi.fn(),
  };
}

/**
 * テスト用の DataTransferItemList を生成
 *
 * @param items - DataTransferItem の配列
 * @returns DataTransferItemList モック
 */
export function createDataTransferItemList(
  items: DataTransferItem[]
): DataTransferItemList {
  const list = {
    length: items.length,
    add: vi.fn(),
    clear: vi.fn(),
    remove: vi.fn(),
    [Symbol.iterator]: function* () {
      for (const item of items) yield item;
    },
  } as unknown as DataTransferItemList;

  // インデックスアクセス用のプロパティを追加
  items.forEach((item, index) => {
    Object.defineProperty(list, index, { value: item, enumerable: true });
  });

  return list;
}

/**
 * 空の FileList を生成
 *
 * @returns 空の FileList モック
 */
export function createEmptyFileList(): FileList {
  return {
    length: 0,
    item: () => null,
    [Symbol.iterator]: function* () {
      // empty iterator
    },
  } as unknown as FileList;
}

/**
 * テスト用の ClipboardEvent を生成
 *
 * @param items - DataTransferItem の配列（nullの場合は clipboardData が null）
 * @returns ClipboardEvent
 */
export function createPasteEvent(items: DataTransferItem[] | null): Event {
  if (items === null) {
    // clipboardData が null のケース
    const event = new Event("paste", { bubbles: true });
    Object.defineProperty(event, "clipboardData", { value: null });
    return event;
  }

  const clipboardData = {
    items: createDataTransferItemList(items),
    files: createEmptyFileList(),
    types: [],
    getData: vi.fn(),
    setData: vi.fn(),
    clearData: vi.fn(),
    setDragImage: vi.fn(),
    dropEffect: "none" as const,
    effectAllowed: "none" as const,
  } as unknown as DataTransfer;

  const event = new Event("paste", { bubbles: true });
  Object.defineProperty(event, "clipboardData", { value: clipboardData });
  return event;
}

/**
 * ペーストイベントを生成してディスパッチ
 *
 * @param items - DataTransferItem の配列（nullの場合は clipboardData が null）
 */
export function dispatchPasteEvent(items: DataTransferItem[] | null): void {
  const event = createPasteEvent(items);
  document.dispatchEvent(event);
}

// ========== 待機用ヘルパー ==========

/**
 * 「状態変化がないこと」を確認するための待機
 *
 * @remarks
 * 非同期処理が完了する機会を与えた後に、状態が変化していないことを確認する
 * テストケースで使用。vi.waitFor は「条件が満たされるまで待機」するため、
 * この用途には適さない。
 *
 * @param ms - 待機時間（ミリ秒）。デフォルトは WAIT_FOR_NO_STATE_CHANGE_MS
 */
export async function waitForNoStateChange(
  ms = WAIT_FOR_NO_STATE_CHANGE_MS
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
