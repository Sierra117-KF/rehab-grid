/**
 * エディタの状態管理ストア
 *
 * 自主トレーニング指導箋エディタの状態を管理する Zustand ストア
 * IndexedDB との連携によるオートセーブ機能と、編集履歴（Undo / Redo）を提供
 */

import {
  AUTOSAVE_DELAY,
  HISTORY_LIMIT,
  HISTORY_MERGE_WINDOW_MS,
  MAX_ITEM_COUNT,
  MAX_PRECAUTIONS_COUNT,
} from "@rehab-grid/core/lib/constants";
import { createNewProject, loadProject, saveProject } from "@rehab-grid/core/lib/db";
import { resolveProjectSettings } from "@rehab-grid/core/lib/settings";
import {
  type Dosages,
  type EditorItem,
  type Precaution,
  type ProjectFile,
  type ProjectMeta,
  type ProjectSettings,
  type ResolvedProjectSettings,
} from "@rehab-grid/core/types";
import { debounce } from "@rehab-grid/core/utils/debounce";
import { nanoid } from "nanoid";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { shallow } from "zustand/shallow";

/**
 * 編集履歴の 1 件（Undo / Redo で復元する対象）
 *
 * @remarks
 * ストアは不変更新なので、スナップショットは参照を共有するだけで済む。
 * 選択状態やモバイル UI の開閉は履歴の対象外。
 */
type EditorSnapshot = {
  /** プロジェクトメタ情報 */
  meta: ProjectMeta;
  /** アイテム一覧 */
  items: EditorItem[];
  /** プロジェクト設定（デフォルト値補完済み） */
  settings: ResolvedProjectSettings;
};

/**
 * 直前に記録した履歴の情報（連続入力のマージ判定に使う）
 */
type LastHistoryCommit = {
  /** 記録時の mergeKey（マージしない操作は undefined） */
  mergeKey: string | undefined;
  /** 記録した時刻（Date.now()） */
  at: number;
};

/**
 * エディタストアの状態
 */
type EditorState = EditorSnapshot & {
  /** 初期読み込み完了フラグ */
  isLoaded: boolean;
  /** 選択中のアイテムID */
  selectedItemId: string | null;

  // 編集履歴（永続化しない）
  /** Undo で戻れる過去の状態（末尾が直前の状態） */
  past: EditorSnapshot[];
  /** Redo で進める状態（先頭が次の状態） */
  future: EditorSnapshot[];
  /** 直前に記録した履歴の情報 */
  lastHistoryCommit: LastHistoryCommit | null;

  // モバイルUI用ステート
  /** モバイル画像ライブラリサイドバーの開閉状態 */
  mobileImageLibraryOpen: boolean;
  /** モバイルプロパティパネルサイドバーの開閉状態 */
  mobilePropertyPanelOpen: boolean;
  /** 画像選択対象のアイテムID（モバイル用） */
  mobileImageLibraryTargetItemId: string | null;
};

/**
 * updateItem / updateSettings のオプション
 */
type HistoryMergeOptions = {
  /**
   * 連続入力を 1 件の履歴にまとめるためのキー
   *
   * @remarks
   * 直前の記録と同じキーで、HISTORY_MERGE_WINDOW_MS 以内なら新しい履歴を積まない。
   * 例: `${itemId}:title`、`settings:themeColor`
   */
  mergeKey?: string;
};

/**
 * addNewItem のオプション
 */
type AddNewItemOptions = {
  /** カードのタイトル（デフォルト: 「新しい運動」） */
  title?: string;
  /** カードに設定する画像ID */
  imageSource?: string;
};

/**
 * appendPrecautionsToAll の結果
 */
type AppendPrecautionsResult = {
  /** 注意点が追加されたカードの枚数 */
  updatedCount: number;
  /** 上限（MAX_PRECAUTIONS_COUNT）を超えたため追加しなかった注意点の件数（全カード合計） */
  skippedCount: number;
};

/**
 * エディタストアのアクション
 */
type EditorActions = {
  /** DBからプロジェクトを初期化（編集履歴もクリアする） */
  initializeFromDB: (data: ProjectFile) => void;
  /** アイテム一覧を設定 */
  setItems: (items: EditorItem[]) => void;
  /** アイテムを追加 */
  addItem: (item: EditorItem) => void;
  /** 新しいアイテムを作成して追加（ID自動生成、選択状態も設定） */
  addNewItem: (options?: AddNewItemOptions) => string | null;
  /** アイテムを更新 */
  updateItem: (
    id: string,
    updates: Partial<EditorItem>,
    options?: HistoryMergeOptions
  ) => void;
  /** アイテムを削除 */
  deleteItem: (id: string) => void;
  /**
   * アイテムを複製して元の直後に挿入し、複製を選択する
   *
   * @returns 複製したアイテムのID（最大数に達している・元が存在しない場合は null）
   */
  duplicateItem: (id: string) => string | null;
  /**
   * 全アイテムの用量を上書きする
   *
   * @returns 値が変わったアイテムの枚数（0 なら履歴を積まない）
   */
  applyDosagesToAll: (dosages: Dosages) => number;
  /**
   * 全アイテムに注意点を追記する（同じ文言・空文字は追加しない）
   */
  appendPrecautionsToAll: (values: string[]) => AppendPrecautionsResult;
  /** アイテムを並び替え */
  reorderItems: (items: EditorItem[]) => void;
  /** プロジェクト設定を部分的に更新（レイアウトタイプ・テーマカラー等） */
  updateSettings: (
    updates: Partial<ProjectSettings>,
    options?: HistoryMergeOptions
  ) => void;
  /** 選択中のアイテムIDを設定 */
  setSelectedItemId: (id: string | null) => void;
  /** プロジェクトタイトルを更新 */
  setProjectTitle: (title: string) => void;
  /** 直前の操作を取り消す */
  undo: () => void;
  /** 取り消した操作をやり直す */
  redo: () => void;
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

/** 編集履歴を空にした状態 */
const EMPTY_HISTORY = {
  past: [],
  future: [],
  lastHistoryCommit: null,
} satisfies Pick<EditorState, "past" | "future" | "lastHistoryCommit">;

/** 初期プロジェクトデータ */
const initialProject = createNewProject();

/**
 * プロジェクトデータからストアに入れる状態を作る
 *
 * @remarks
 * 初期値・DB 復元・インポート・テンプレート適用・プロジェクト削除の共通の入口。
 * IndexedDB からの復元は Zod を通らないため、ここで設定のデフォルト値を補う。
 */
function projectToState(data: ProjectFile) {
  return {
    meta: data.meta,
    items: data.items,
    settings: resolveProjectSettings(data.settings),
    // 別のプロジェクトに切り替わるため、選択状態と前のプロジェクトの履歴は捨てる
    selectedItemId: null,
    ...EMPTY_HISTORY,
  } satisfies Partial<EditorState>;
}

/**
 * 状態から履歴用のスナップショットを取り出す
 */
function toSnapshot(state: EditorSnapshot): EditorSnapshot {
  return {
    meta: state.meta,
    items: state.items,
    settings: state.settings,
  };
}

/**
 * 用量が同じ値かどうか
 */
function isSameDosages(a: Dosages | undefined, b: Dosages | undefined) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.reps === b.reps && a.sets === b.sets && a.frequency === b.frequency;
}

/**
 * updates がアイテムの値を 1 つでも変えるかどうか
 *
 * @remarks
 * アクションは値が同じでも新しいオブジェクトを作るため、参照比較では変化なしを検出できない。
 * 変化のない更新で履歴を積まないよう、キーごとに値を比較する。
 */
function hasItemChanges(item: EditorItem, updates: Partial<EditorItem>) {
  return (Object.keys(updates) as (keyof EditorItem)[]).some((key) =>
    key === "dosages"
      ? !isSameDosages(item.dosages, updates.dosages)
      : !Object.is(item[key], updates[key])
  );
}

/**
 * 指定画像を参照しているアイテムの imageSource を空にする
 *
 * @remarks
 * 参照がなければ同じ配列を返す（不要なオートセーブを起こさないため）
 */
function clearImageReferences(items: EditorItem[], imageId: string) {
  if (!items.some((item) => item.imageSource === imageId)) return items;
  return items.map((item) =>
    item.imageSource === imageId ? { ...item, imageSource: "" } : item
  );
}

/**
 * アイテムを複製する（ID・注意点ID は振り直し、参照も共有しない）
 */
function cloneItem(item: EditorItem): EditorItem {
  return {
    ...item,
    id: nanoid(),
    ...(item.dosages && { dosages: { ...item.dosages } }),
    ...(item.precautions && {
      precautions: item.precautions.map((precaution) => ({
        ...precaution,
        id: nanoid(),
      })),
    }),
  };
}

/**
 * 1 枚のカードに注意点を追記した結果を返す
 *
 * @remarks
 * 前後の空白を除いて同じ文言はスキップする（values 内の重複も同様）。
 * MAX_PRECAUTIONS_COUNT を超える分は捨て、その件数を skipped で返す。
 * 注意点 ID は React の key に使われるため、カードごとに新しく振る。
 */
function appendPrecautions(item: EditorItem, values: string[]) {
  const current = item.precautions ?? [];
  const existing = new Set(current.map((precaution) => precaution.value.trim()));
  const added: Precaution[] = [];
  let skipped = 0;

  for (const value of values) {
    const normalized = value.trim();
    if (normalized === "" || existing.has(normalized)) continue;
    existing.add(normalized);

    if (current.length + added.length >= MAX_PRECAUTIONS_COUNT) {
      skipped += 1;
      continue;
    }
    added.push({ id: nanoid(), value });
  }

  return { precautions: [...current, ...added], added: added.length, skipped };
}

/**
 * 選択中のアイテムが items に存在しなければ null にする
 */
function keepSelectionIfExists(
  selectedItemId: string | null,
  items: EditorItem[]
) {
  return items.some((item) => item.id === selectedItemId)
    ? selectedItemId
    : null;
}

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
 * const canUndo = useEditorStore((state) => state.past.length > 0);
 * ```
 */
export const useEditorStore = create<EditorState & EditorActions>()(
  subscribeWithSelector((set, get) => {
    /**
     * 履歴に記録しながら状態を更新する
     *
     * @remarks
     * 変更前の状態を past に積み、future を空にする。
     * mergeKey が直前の記録と同じで、HISTORY_MERGE_WINDOW_MS 以内なら past は据え置く。
     *
     * @param next - 更新する状態
     * @param mergeKey - 連続入力をまとめるためのキー
     */
    const commit = (next: Partial<EditorState>, mergeKey?: string) => {
      set((state) => {
        const now = Date.now();
        const last = state.lastHistoryCommit;
        const shouldMerge =
          mergeKey !== undefined &&
          last?.mergeKey === mergeKey &&
          now - last.at <= HISTORY_MERGE_WINDOW_MS;

        return {
          ...next,
          past: shouldMerge
            ? state.past
            : [...state.past, toSnapshot(state)].slice(-HISTORY_LIMIT),
          future: [],
          lastHistoryCommit: { mergeKey, at: now },
        };
      });
    };

    return {
      // 状態の初期値（空の状態で開始）
      isLoaded: false,
      ...projectToState(initialProject),

      // モバイルUI用ステートの初期値
      mobileImageLibraryOpen: false,
      mobilePropertyPanelOpen: false,
      mobileImageLibraryTargetItemId: null,

      // アクション
      initializeFromDB: (data) =>
        set({ isLoaded: true, ...projectToState(data) }),

      setItems: (items) => commit({ items }),

      addItem: (item) => {
        // UI以外の経路（貼り付け等）でも最大数を超えないよう、ストア側で保証する
        const { items } = get();
        if (items.length >= MAX_ITEM_COUNT) return;

        commit({ items: [...items, item] });
      },

      addNewItem: ({ title = "新しい運動", imageSource = "" } = {}) => {
        // UI以外の経路（貼り付け等）でも最大数を超えないよう、ストア側で保証する
        const { items } = get();
        if (items.length >= MAX_ITEM_COUNT) {
          return null;
        }

        // 画像付きのカード追加も 1 件の履歴になるよう、1 回の commit で作る
        const newItem: EditorItem = {
          id: nanoid(),
          order: items.length,
          title,
          imageSource,
          description: "",
        };
        commit({ items: [...items, newItem], selectedItemId: newItem.id });
        return newItem.id;
      },

      updateItem: (id, updates, options) => {
        const { items } = get();
        const target = items.find((item) => item.id === id);
        if (!target || !hasItemChanges(target, updates)) return;

        commit(
          {
            items: items.map((item) =>
              item.id === id ? { ...item, ...updates } : item
            ),
          },
          options?.mergeKey
        );
      },

      deleteItem: (id) => {
        const { items, selectedItemId } = get();
        if (!items.some((item) => item.id === id)) return;

        // 削除後にorderを詰め直す
        commit({
          items: items
            .filter((item) => item.id !== id)
            .map((item, index) => ({ ...item, order: index })),
          selectedItemId: selectedItemId === id ? null : selectedItemId,
        });
      },

      duplicateItem: (id) => {
        const { items } = get();
        const index = items.findIndex((item) => item.id === id);
        const source = items[index];
        if (source === undefined || items.length >= MAX_ITEM_COUNT) {
          return null;
        }

        // PDF は order、Canvas は配列順で描画するため、挿入後に order を振り直して一致させる
        const copy = cloneItem(source);
        const nextItems = [
          ...items.slice(0, index + 1),
          copy,
          ...items.slice(index + 1),
        ].map((item, order) => ({ ...item, order }));

        commit({ items: nextItems, selectedItemId: copy.id });
        return copy.id;
      },

      applyDosagesToAll: (dosages) => {
        const { items } = get();
        let updatedCount = 0;
        const nextItems = items.map((item) => {
          if (isSameDosages(item.dosages, dosages)) return item;
          updatedCount += 1;
          // 参照を共有しないよう、カードごとに新しいオブジェクトにする
          return { ...item, dosages: { ...dosages } };
        });

        if (updatedCount > 0) commit({ items: nextItems });
        return updatedCount;
      },

      appendPrecautionsToAll: (values) => {
        const { items } = get();
        let updatedCount = 0;
        let skippedCount = 0;
        const nextItems = items.map((item) => {
          const result = appendPrecautions(item, values);
          skippedCount += result.skipped;
          if (result.added === 0) return item;
          updatedCount += 1;
          return { ...item, precautions: result.precautions };
        });

        if (updatedCount > 0) commit({ items: nextItems });
        return { updatedCount, skippedCount };
      },

      reorderItems: (items) => commit({ items }),

      updateSettings: (updates, options) => {
        const { settings } = get();
        const hasChanges = (
          Object.keys(updates) as (keyof ProjectSettings)[]
        ).some((key) => !Object.is(settings[key], updates[key]));
        if (!hasChanges) return;

        commit({ settings: { ...settings, ...updates } }, options?.mergeKey);
      },

      setSelectedItemId: (id) => set({ selectedItemId: id }),

      setProjectTitle: (title) => {
        const { meta } = get();
        if (meta.title === title) return;
        commit({ meta: { ...meta, title } });
      },

      undo: () =>
        set((state) => {
          const previous = state.past.at(-1);
          if (!previous) return {};

          return {
            ...previous,
            past: state.past.slice(0, -1),
            future: [toSnapshot(state), ...state.future],
            // 取り消し後の入力は、取り消し前の入力とまとめない
            lastHistoryCommit: null,
            // 削除の取り消しで戻ったカードは選択しない（選択は履歴の対象外）
            selectedItemId: keepSelectionIfExists(
              state.selectedItemId,
              previous.items
            ),
          };
        }),

      redo: () =>
        set((state) => {
          const [next, ...rest] = state.future;
          if (!next) return {};

          return {
            ...next,
            past: [...state.past, toSnapshot(state)].slice(-HISTORY_LIMIT),
            future: rest,
            lastHistoryCommit: null,
            selectedItemId: keepSelectionIfExists(
              state.selectedItemId,
              next.items
            ),
          };
        }),

      deleteProject: async () => {
        // 1. IndexedDBから即座にプロジェクトを削除（リロード時の復元を防ぐ）
        const { deleteProject: deleteFromDB } = await import(
          "@rehab-grid/core/lib/db"
        );
        await deleteFromDB();

        // 2. Zustandストアの全状態を初期値にリセット
        // 他のプロジェクト切り替えと同じ入口を通し、設定・選択・履歴まで一貫してリセットする
        get().initializeFromDB(createNewProject());
      },

      deleteImageAndClearReferences: async (imageId) => {
        // 画像の Blob は IndexedDB から消えるため、Undo で imageSource だけ戻ると参照切れになる。
        // そのためこの操作は履歴に積まず、履歴内の同じ画像への参照も空にする。
        set((state) => ({
          items: clearImageReferences(state.items, imageId),
          past: state.past.map((snapshot) => ({
            ...snapshot,
            items: clearImageReferences(snapshot.items, imageId),
          })),
          future: state.future.map((snapshot) => ({
            ...snapshot,
            items: clearImageReferences(snapshot.items, imageId),
          })),
        }));

        // IndexedDBから画像を削除
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
    };
  })
);

/**
 * ストアの状態からProjectFileを生成
 *
 * @remarks
 * エクスポート機能などで現在のプロジェクト状態を取得する際に使用
 *
 * @param state - エディタストアの状態（meta / settings / items のみ参照する）
 * @returns ProjectFile形式のデータ
 */
export function stateToProjectFile(state: EditorSnapshot): ProjectFile {
  return {
    meta: state.meta,
    settings: state.settings,
    items: state.items,
  };
}

/**
 * オートセーブ関数（debounce適用済み）
 */
const debouncedSave = debounce((state: EditorSnapshot) => {
  void saveProject(stateToProjectFile(state));
}, AUTOSAVE_DELAY);

/**
 * オートセーブの設定
 *
 * @remarks
 * items, settings, meta の変更を監視し、
 * 変更があった場合に debounce 付きで保存を実行。
 * Undo / Redo で値が戻った場合もここで保存される（past / future だけの変化では保存しない）。
 */
useEditorStore.subscribe(
  (state) => ({
    items: state.items,
    settings: state.settings,
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
