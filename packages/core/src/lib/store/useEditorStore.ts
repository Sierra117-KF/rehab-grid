/**
 * エディタの状態管理ストア
 *
 * 自主トレーニング指導箋エディタの状態を管理する Zustand ストア
 * IndexedDB との連携によるオートセーブ機能を提供
 */

import { AUTOSAVE_DELAY, MAX_ITEM_COUNT } from "@rehab-grid/core/lib/constants";
import { createNewProject, loadProject, saveProject } from "@rehab-grid/core/lib/db";
import {
  type EditorItem,
  type LayoutType,
  type ProjectFile,
  type ProjectMeta,
} from "@rehab-grid/core/types";
import { debounce } from "@rehab-grid/core/utils/debounce";
import { nanoid } from "nanoid";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { shallow } from "zustand/shallow";

/**
 * エディタストアの状態
 */
type EditorState = {
  /** 初期読み込み完了フラグ */
  isLoaded: boolean;
  /** プロジェクトメタ情報 */
  meta: ProjectMeta;
  /** アイテム一覧 */
  items: EditorItem[];
  /** レイアウトタイプ */
  layoutType: LayoutType;
  /** テーマカラー */
  themeColor: string;
  /** 選択中のアイテムID */
  selectedItemId: string | null;

  // モバイルUI用ステート
  /** モバイル画像ライブラリサイドバーの開閉状態 */
  mobileImageLibraryOpen: boolean;
  /** モバイルプロパティパネルサイドバーの開閉状態 */
  mobilePropertyPanelOpen: boolean;
  /** 画像選択対象のアイテムID（モバイル用） */
  mobileImageLibraryTargetItemId: string | null;
};

/**
 * エディタストアのアクション
 */
type EditorActions = {
  /** DBからプロジェクトを初期化 */
  initializeFromDB: (data: ProjectFile) => void;
  /** アイテム一覧を設定 */
  setItems: (items: EditorItem[]) => void;
  /** アイテムを追加 */
  addItem: (item: EditorItem) => void;
  /** 新しいアイテムを作成して追加（ID自動生成、選択状態も設定） */
  addNewItem: (title?: string) => string | null;
  /** アイテムを更新 */
  updateItem: (id: string, updates: Partial<EditorItem>) => void;
  /** アイテムを削除 */
  deleteItem: (id: string) => void;
  /** アイテムを並び替え */
  reorderItems: (items: EditorItem[]) => void;
  /** レイアウトタイプを設定 */
  setLayoutType: (layout: LayoutType) => void;
  /** 選択中のアイテムIDを設定 */
  setSelectedItemId: (id: string | null) => void;
  /** プロジェクトタイトルを更新 */
  setProjectTitle: (title: string) => void;
  /** プロジェクトを削除し、初期状態にリセット */
  deleteProject: () => Promise<void>;
  /** 画像を削除し、関連するアイテムのimageSourceをクリア */
  deleteImageAndClearReferences: (imageId: string) => Promise<void>;

  // モバイルUI用アクション
  /** モバイル画像ライブラリサイドバーの開閉を設定 */
  setMobileImageLibraryOpen: (
    open: boolean,
    targetItemId?: string | null
  ) => void;
  /** モバイルプロパティパネルサイドバーの開閉を設定 */
  setMobilePropertyPanelOpen: (open: boolean) => void;
};

/** 初期プロジェクトデータ */
const initialProject = createNewProject();

/**
 * エディタストア
 *
 * @remarks
 * subscribeWithSelector ミドルウェアを使用して、
 * 特定のステート変更のみを監視可能にする
 *
 * @example
 * ```tsx
 * // コンポーネントで使用
 * const items = useEditorStore((state) => state.items);
 * const addItem = useEditorStore((state) => state.addItem);
 * ```
 */
export const useEditorStore = create<EditorState & EditorActions>()(
  subscribeWithSelector((set, get) => ({
    // 状態の初期値（空の状態で開始）
    isLoaded: false,
    meta: initialProject.meta,
    items: [],
    layoutType: initialProject.settings.layoutType,
    themeColor: initialProject.settings.themeColor,
    selectedItemId: null,

    // モバイルUI用ステートの初期値
    mobileImageLibraryOpen: false,
    mobilePropertyPanelOpen: false,
    mobileImageLibraryTargetItemId: null,

    // アクション
    initializeFromDB: (data) =>
      set({
        isLoaded: true,
        meta: data.meta,
        items: data.items,
        layoutType: data.settings.layoutType,
        themeColor: data.settings.themeColor,
      }),

    setItems: (items) => set({ items }),

    addItem: (item) =>
      set((state) => {
        // UI以外の経路（貼り付け等）でも最大数を超えないよう、ストア側で保証する
        if (state.items.length >= MAX_ITEM_COUNT) {
          return {};
        }

        return {
          items: [...state.items, item],
        };
      }),

    addNewItem: (title = "新しい運動") => {
      // UI以外の経路（貼り付け等）でも最大数を超えないよう、ストア側で保証する
      if (get().items.length >= MAX_ITEM_COUNT) {
        return null;
      }

      const newId = nanoid();
      set((state) => {
        const newItem: EditorItem = {
          id: newId,
          order: state.items.length,
          title,
          imageSource: "",
          description: "",
        };
        return {
          items: [...state.items, newItem],
          selectedItemId: newId,
        };
      });
      return newId;
    },

    updateItem: (id, updates) =>
      set((state) => ({
        items: state.items.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        ),
      })),

    deleteItem: (id) =>
      set((state) => {
        // 削除後にorderを詰め直す
        const filteredItems = state.items
          .filter((item) => item.id !== id)
          .map((item, index) => ({ ...item, order: index }));
        return {
          items: filteredItems,
          selectedItemId:
            state.selectedItemId === id ? null : state.selectedItemId,
        };
      }),

    reorderItems: (items) => set({ items }),

    setLayoutType: (layout) => set({ layoutType: layout }),

    setSelectedItemId: (id) => set({ selectedItemId: id }),

    setProjectTitle: (title) =>
      set((state) => ({
        meta: { ...state.meta, title },
      })),

    deleteProject: async () => {
      // 1. IndexedDBから即座にプロジェクトを削除（リロード時の復元を防ぐ）
      const { deleteProject: deleteFromDB } = await import(
        "@rehab-grid/core/lib/db"
      );
      await deleteFromDB();

      // 2. Zustandストアの全状態を初期値にリセット
      // createNewProject()を使用することで、layoutType, themeColorを含めて
      // 一貫した初期状態にリセットされる
      const newProject = createNewProject();
      set({
        isLoaded: true,
        meta: newProject.meta,
        items: newProject.items,
        layoutType: newProject.settings.layoutType,
        themeColor: newProject.settings.themeColor,
        selectedItemId: null,
      });
    },

    deleteImageAndClearReferences: async (imageId) => {
      // 1. 該当画像を参照しているアイテムを検索
      const currentItems = useEditorStore.getState().items;
      const affectedItems = currentItems.filter(
        (item) => item.imageSource === imageId
      );

      // 2. 該当アイテムの imageSource をクリア
      if (affectedItems.length > 0) {
        set((state) => ({
          items: state.items.map((item) =>
            item.imageSource === imageId ? { ...item, imageSource: "" } : item
          ),
        }));
      }

      // 3. IndexedDBから画像を削除
      const { deleteImage } = await import("@rehab-grid/core/lib/db");
      await deleteImage(imageId);
    },

    // モバイルUI用アクション
    setMobileImageLibraryOpen: (open, targetItemId = null) =>
      set({
        mobileImageLibraryOpen: open,
        mobileImageLibraryTargetItemId: open ? targetItemId : null,
      }),

    setMobilePropertyPanelOpen: (open) =>
      set({
        mobilePropertyPanelOpen: open,
      }),
  }))
);

/**
 * ストアの状態からProjectFileを生成
 *
 * @remarks
 * エクスポート機能などで現在のプロジェクト状態を取得する際に使用
 *
 * @param state - エディタストアの状態
 * @returns ProjectFile形式のデータ
 */
export function stateToProjectFile(state: EditorState): ProjectFile {
  return {
    meta: state.meta,
    settings: {
      layoutType: state.layoutType,
      themeColor: state.themeColor,
    },
    items: state.items,
  };
}

/**
 * オートセーブ関数（debounce適用済み）
 */
const debouncedSave = debounce((state: EditorState) => {
  void saveProject(stateToProjectFile(state));
}, AUTOSAVE_DELAY);

/**
 * オートセーブの設定
 *
 * @remarks
 * items, layoutType, themeColor, meta の変更を監視し、
 * 変更があった場合に debounce 付きで保存を実行
 */
useEditorStore.subscribe(
  (state) => ({
    items: state.items,
    layoutType: state.layoutType,
    themeColor: state.themeColor,
    meta: state.meta,
  }),
  () => {
    // 初期読み込み完了後のみオートセーブを実行
    if (useEditorStore.getState().isLoaded) {
      debouncedSave(useEditorStore.getState());
    }
  },
  { equalityFn: shallow }
);

/**
 * モジュール読み込み時にDBからプロジェクトを初期化
 *
 * @remarks
 * useEffect を使用せず、モジュールスコープで初期化を実行
 * クライアントサイドでのみ実行される
 */
if (typeof window !== "undefined") {
  void loadProject()
    .then((data) => {
      if (data) {
        useEditorStore.getState().initializeFromDB(data);
      } else {
        // DBが空の場合も initializeFromDB を使用して一貫した状態遷移を保証
        // これにより、サーバー/クライアント間で状態が統一される
        useEditorStore.getState().initializeFromDB(createNewProject());
      }
    })
    .catch(() => {
      // 以下のケースで DB の読み込みが失敗する可能性がある：
      // - ブラウザのストレージ制限やプライベートモードによる制限
      // - DB初期化中のタイミング競合（テスト環境含む）
      //
      // 重要:
      // ここで `initializeFromDB(createNewProject())` を行うと、
      // 状態更新 → オートセーブ（debounce）により「既存データを空で上書き」するリスクが理論上発生する。
      //
      // そのため、失敗時は「UIを操作可能にする」最小限として isLoaded のみ true にし、
      // データの上書きはユーザー操作による明示的な変更が発生した時点に限定する。
      useEditorStore.setState({ isLoaded: true });

      // 一時的な失敗（DB初期化中など）に備え、1回だけ遅延リトライする。
      // 成功すれば正しいデータで初期化される（この場合は読み込んだデータで上書きされる）。
      setTimeout(() => {
        void loadProject()
          .then((data) => {
            if (data) {
              useEditorStore.getState().initializeFromDB(data);
            }
          })
          .catch(() => {
            // 2回目も失敗した場合は無視（空状態で継続）
          });
      }, 0);
    });
}
