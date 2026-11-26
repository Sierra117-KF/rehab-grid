/**
 * エディタの状態管理ストア
 *
 * 自主トレーニング指導箋エディタの状態を管理する Zustand ストア
 * IndexedDB との連携によるオートセーブ機能と、編集履歴（Undo / Redo）を提供
 */

import {
  ACTIVE_PROJECT_ID_STORAGE_KEY,
  AUTOSAVE_DELAY,
  HISTORY_LIMIT,
  HISTORY_MERGE_WINDOW_MS,
  MAX_ITEM_COUNT,
  MAX_PRECAUTIONS_COUNT,
  PROJECT_SWITCH_FAILED_MESSAGE,
} from "@rehab-grid/core/lib/constants";
import {
  createNewProject,
  deleteImage,
  deleteProject as deleteProjectFromDB,
  duplicateProject as duplicateProjectInDB,
  listProjects,
  loadProject,
  saveProject,
} from "@rehab-grid/core/lib/db";
import { resolveProjectSettings } from "@rehab-grid/core/lib/settings";
import { registerAutosaveFlusher } from "@rehab-grid/core/lib/store/autosaveFlusher";
import {
  type BackupCategorySelection,
  type BackupRestoreMode,
  type BackupRestoreSummary,
  type Dosages,
  type EditorItem,
  type ImportOpenMode,
  type ImportResult,
  type ParsedBackup,
  type Precaution,
  type ProjectFile,
  type ProjectMeta,
  type ResolvedProjectSettings,
} from "@rehab-grid/core/types";
import { debounce } from "@rehab-grid/core/utils/debounce";
import {
  applyBackupToDB,
  applyImportResult,
} from "@rehab-grid/core/utils/project";
import {
  readLocalStorage,
  requestPersistentStorage,
  writeLocalStorage,
} from "@rehab-grid/core/utils/storage";
import { cloneItemWithNewIds } from "@rehab-grid/core/utils/template";
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
  /** 編集中のプロジェクトID（オートセーブの保存先） */
  projectId: string;
  /** プロジェクトの切り替え・作成・複製・削除・インポートの処理中か（処理中は一覧の操作を無効にする） */
  isSwitchingProject: boolean;
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
  /** DBからプロジェクトを初期化（編集履歴もクリアする。編集中のプロジェクトIDは変えない） */
  initializeFromDB: (data: ProjectFile) => void;
  /**
   * 指定IDのプロジェクトとして開く（編集履歴をクリアし、次回起動時に開くプロジェクトとして記録する）
   *
   * @remarks
   * 保留中のオートセーブは破棄するため、必要なら呼び出し前に確定させておく
   */
  openProject: (projectId: string, data: ProjectFile) => void;
  /**
   * 保存済みの別のプロジェクトへ切り替える
   *
   * @remarks
   * 保留中のオートセーブを元のプロジェクトへ保存し終えてから読み込む
   */
  switchProject: (projectId: string) => Promise<void>;
  /** 新しい空のプロジェクトを作って開く（カードやタイトルを編集した時点で保存される） */
  createProject: () => Promise<void>;
  /**
   * プロジェクトを複製して保存する（開いているプロジェクトは変えない）
   *
   * @returns 複製したプロジェクトのID（複製元が存在しない場合は undefined）
   */
  duplicateProject: (projectId: string) => Promise<string | undefined>;
  /**
   * インポート結果（ファイル・テンプレート）を保存して開く
   *
   * @param mode - new: 新しい指導箋として開く / overwrite: 現在の指導箋に上書き
   */
  openImportResult: (result: ImportResult, mode: ImportOpenMode) => Promise<void>;
  /**
   * 一括バックアップを IndexedDB へ復元する
   *
   * @remarks
   * replace 時は保留中のオートセーブを破棄してから全テーブルを入れ替え、復元後の最新指導箋を開く。
   * merge 時は保留中のオートセーブを確定してから追加し、現在開いている指導箋を維持する。
   *
   * @param backup - 検証済みの一括バックアップ
   * @param selection - 復元対象とするカテゴリの選択状態
   * @param mode - 復元方法（merge: 追加 / replace: 全置換）
   * @returns 復元件数サマリー（他処理の実行中でスキップされた場合は undefined）
   */
  restoreBackup: (
    backup: ParsedBackup,
    selection: BackupCategorySelection,
    mode: BackupRestoreMode
  ) => Promise<BackupRestoreSummary | undefined>;
  /**
   * 保留中のオートセーブを今すぐ保存し、完了を待つ
   *
   * @remarks
   * ページを再読み込みする前（アプリの更新など）に呼び、直前の編集を失わないようにする。
   * 保存に失敗した場合は reject する
   */
  flushAutosave: () => Promise<void>;
  /** アイテム一覧を設定 */
  setItems: (items: EditorItem[]) => void;
  /**
   * 保存済みのカード（マイ運動）のコピーを末尾に追加し、選択する
   *
   * @remarks
   * カード・注意点の ID を振り直すため、同じカードを何度追加しても重ならない
   *
   * @returns 追加したアイテムのID（最大数に達している場合は null）
   */
  addItem: (item: EditorItem) => string | null;
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
  /**
   * プロジェクト設定を部分的に更新（レイアウトタイプ・テーマカラー・印刷スタイル等）
   *
   * @remarks
   * 用量ラベル（dosageLabels）・ヘッダーの項目（header）は全キーそろった値で渡す
   */
  updateSettings: (
    updates: Partial<ResolvedProjectSettings>,
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
  /**
   * プロジェクトを削除する（省略時は編集中のプロジェクト）
   *
   * @remarks
   * 編集中のプロジェクトを削除した場合は、残りのうち最新のもの（なければ新しい空のプロジェクト）を開く
   */
  deleteProject: (projectId?: string) => Promise<void>;
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
 * 注意点一覧が同じ値かどうか
 */
function isSamePrecautions(
  a: Precaution[] | undefined,
  b: Precaution[] | undefined
) {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  if (a.length !== b.length) return false;
  return a.every((item, index) => {
    const other = b[index];
    if (other === undefined) return false;
    return item.id === other.id && item.value === other.value;
  });
}

/**
 * アイテム 1 件が同じ値かどうか
 */
function isSameItem(a: EditorItem, b: EditorItem) {
  if (a === b) return true;
  return (
    a.id === b.id &&
    a.order === b.order &&
    a.title === b.title &&
    a.imageSource === b.imageSource &&
    a.description === b.description &&
    isSameDosages(a.dosages, b.dosages) &&
    isSamePrecautions(a.precautions, b.precautions)
  );
}

/**
 * 設定の 1 項目が同じ値かどうか
 *
 * @remarks
 * テーマカラーは大文字・小文字を区別しない（インポートした大文字 HEX と
 * UI からの小文字 HEX を同じ色とみなす）。
 * 用量ラベル・ヘッダーの項目は毎回新しいオブジェクトで渡されるため shallow で中身を比べる。
 */
function isSameSettingValue<K extends keyof ResolvedProjectSettings>(
  key: K,
  current: ResolvedProjectSettings[K],
  next: ResolvedProjectSettings[K] | undefined
): boolean {
  if (key === "themeColor") {
    return (
      typeof current === "string" &&
      typeof next === "string" &&
      current.toLowerCase() === next.toLowerCase()
    );
  }
  return shallow(current, next);
}

/**
 * プロジェクト設定がすべて同じ値かどうか
 */
function isSameSettings(
  a: ResolvedProjectSettings,
  b: ResolvedProjectSettings
) {
  if (a === b) return true;
  return (Object.keys(a) as (keyof ResolvedProjectSettings)[]).every((key) =>
    isSameSettingValue(key, a[key], b[key])
  );
}

/**
 * 2 つのスナップショットが同じ内容かどうか
 */
function isSameSnapshot(a: EditorSnapshot, b: EditorSnapshot) {
  if (!shallow(a.meta, b.meta)) return false;
  if (!isSameSettings(a.settings, b.settings)) return false;
  if (a.items === b.items) return true;
  if (a.items.length !== b.items.length) return false;
  return a.items.every((item, index) => {
    const other = b.items[index];
    return other !== undefined && isSameItem(item, other);
  });
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
 * 履歴内のスナップショットから指定画像への参照を除去する
 *
 * @remarks
 * 参照がないスナップショットは同じオブジェクト参照を返す
 * （トーストの「元に戻す」が past 末尾の参照一致で有効性を判定するため）
 */
function clearImageReferencesInHistory(
  history: EditorSnapshot[],
  imageId: string
): EditorSnapshot[] {
  if (
    !history.some((snapshot) =>
      snapshot.items.some((item) => item.imageSource === imageId)
    )
  ) {
    return history;
  }
  return history.map((snapshot) => {
    const nextItems = clearImageReferences(snapshot.items, imageId);
    return nextItems === snapshot.items
      ? snapshot
      : { ...snapshot, items: nextItems };
  });
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
 * 前回の保存に失敗した未保存データ（再試行用）
 *
 * @remarks
 * `debounce.flush()` は実行開始時に保留引数を消すため、保存失敗後に再度 `flushAutosave()` を
 * 呼ぶと何も保存せず成功してしまう。失敗分をここに残し、次の `flushAutosave()` で再試行する。
 * 新しい変更の予約・保存成功・キャンセル（別プロジェクトを開く／削除）でクリアする
 */
let failedSave: { projectId: string; state: EditorSnapshot } | null = null;

/**
 * オートセーブの保存処理（失敗時は再試行用に控える）
 */
async function performAutosave(
  projectId: string,
  state: EditorSnapshot
): Promise<void> {
  try {
    await saveProject(projectId, stateToProjectFile(state));
    if (failedSave?.projectId === projectId) {
      failedSave = null;
    }
  } catch (error) {
    failedSave = { projectId, state };
    throw error;
  }
}

/**
 * オートセーブ関数（debounce適用済み）
 *
 * @remarks
 * 保存先IDはスケジュールした時点の値を引数で受け取る。
 * 実行時にストアの projectId を読むと、切り替え直後に発火したとき切り替え先へ旧プロジェクトの内容を書き込んでしまう。
 */
const debouncedSave = debounce(performAutosave, AUTOSAVE_DELAY);

/**
 * 保留中・失敗済みのオートセーブを確定して完了を待つ
 */
async function flushPendingAutosave(): Promise<void> {
  await debouncedSave.flush();
  if (failedSave !== null) {
    const retry = failedSave;
    failedSave = null;
    await performAutosave(retry.projectId, retry.state);
  }
}

/**
 * 保留中・失敗済みのオートセーブを破棄する
 */
function cancelPendingAutosave(): void {
  debouncedSave.cancel();
  failedSave = null;
}

/**
 * 起動時に開くプロジェクトを DB から探す
 *
 * @remarks
 * 前回開いていたID → 更新日時が最新のもの、の順に探す。
 * 旧バージョンの 'current' のレコードも、ほかのプロジェクトと同じく一覧の 1 件として見つかる。
 *
 * @returns 開くプロジェクト（DB が空なら undefined）
 */
async function findInitialProject(): Promise<
  { projectId: string; data: ProjectFile } | undefined
> {
  const activeId = readLocalStorage(ACTIVE_PROJECT_ID_STORAGE_KEY);
  if (activeId !== undefined) {
    const data = await loadProject(activeId);
    if (data) return { projectId: activeId, data };
  }

  const [latest] = await listProjects();
  if (latest === undefined) return undefined;
  const data = await loadProject(latest.id);
  return data ? { projectId: latest.id, data } : undefined;
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

        if (shouldMerge) {
          const base = state.past.at(-1);
          const nextSnapshot = toSnapshot({ ...state, ...next });
          // マージ中に変更前の状態と完全に同じ値に戻ったら、空振りの履歴を取り除く
          if (base !== undefined && isSameSnapshot(base, nextSnapshot)) {
            return {
              ...next,
              past: state.past.slice(0, -1),
              future: [],
              lastHistoryCommit: null,
            };
          }
        }

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

    /**
     * プロジェクトの切り替え系の処理を 1 つずつ実行する
     *
     * @remarks
     * 「保存の確定 → 読み込み → ストアへの反映」の途中で別の切り替えが割り込むと、
     * 保存先と内容が食い違う恐れがあるため、処理中に呼ばれた操作は何もしない。
     */
    const runProjectTransition = async <T>(
      task: () => Promise<T>
    ): Promise<T | undefined> => {
      if (get().isSwitchingProject) return undefined;
      set({ isSwitchingProject: true });
      try {
        return await task();
      } finally {
        set({ isSwitchingProject: false });
      }
    };

    /**
     * 新しい空のプロジェクトを開く
     */
    const openNewProject = () => {
      get().openProject(nanoid(), createNewProject());
    };

    return {
      // 状態の初期値（空の状態で開始）
      isLoaded: false,
      projectId: nanoid(),
      isSwitchingProject: false,
      ...projectToState(initialProject),

      // モバイルUI用ステートの初期値
      mobileImageLibraryOpen: false,
      mobilePropertyPanelOpen: false,
      mobileImageLibraryTargetItemId: null,

      // アクション
      initializeFromDB: (data) =>
        set({ isLoaded: true, ...projectToState(data) }),

      openProject: (projectId, data) => {
        set({ isLoaded: true, projectId, ...projectToState(data) });
        // 読み込んだ内容は DB と同じなので、この set を拾ったオートセーブは捨てる
        // （開いただけで更新日時が変わり、一覧の並び順が入れ替わるのを防ぐ）
        cancelPendingAutosave();
        writeLocalStorage(ACTIVE_PROJECT_ID_STORAGE_KEY, projectId);
      },

      switchProject: async (projectId) => {
        if (projectId === get().projectId) return;
        await runProjectTransition(async () => {
          // 編集中の内容を元のプロジェクトへ保存し終えてから切り替える
          await flushPendingAutosave();
          const data = await loadProject(projectId);
          if (!data) throw new Error(PROJECT_SWITCH_FAILED_MESSAGE);
          get().openProject(projectId, data);
        });
      },

      createProject: async () => {
        await runProjectTransition(async () => {
          await flushPendingAutosave();
          openNewProject();
          // 保存件数が増えると、ブラウザに消されたときの損失が大きくなるため
          void requestPersistentStorage();
        });
      },

      duplicateProject: async (projectId) =>
        runProjectTransition(async () => {
          if (projectId === get().projectId) {
            // 編集中のプロジェクトは保存前の変更も含めて複製する（未保存の新規プロジェクトも複製できる）
            cancelPendingAutosave();
            await saveProject(projectId, stateToProjectFile(get()));
          }
          const newId = await duplicateProjectInDB(projectId);
          if (newId !== undefined) void requestPersistentStorage();
          return newId;
        }),

      openImportResult: async (result, mode) => {
        await runProjectTransition(async () => {
          // 新規でも上書きでも、編集中の内容はいったん元のプロジェクトへ保存しておく
          // （上書きの保存に失敗しても直前の編集を失わない。保留中の保存が上書き後に発火することも防ぐ）
          await flushPendingAutosave();
          const projectId = mode === "new" ? nanoid() : get().projectId;
          await applyImportResult(result, projectId);
          get().openProject(projectId, result.project);
          if (mode === "new") void requestPersistentStorage();
        });
      },

      restoreBackup: async (backup, selection, mode) =>
        runProjectTransition(async () => {
          // 置換でも追加でも、先に未保存の編集を確定しておく
          // （置換が失敗しても直前の編集や failedSave を失わない。成功すれば全消去される）
          await flushPendingAutosave();

          if (mode === "replace") {
            const { summary, latestProjectId } = await applyBackupToDB(
              backup,
              selection,
              "replace"
            );
            const data =
              latestProjectId !== undefined
                ? await loadProject(latestProjectId)
                : undefined;
            if (latestProjectId !== undefined && data !== undefined) {
              get().openProject(latestProjectId, data);
            } else {
              openNewProject();
            }
            void requestPersistentStorage();
            return summary;
          }

          const { summary } = await applyBackupToDB(backup, selection, "merge");
          void requestPersistentStorage();
          return summary;
        }),

      flushAutosave: flushPendingAutosave,

      setItems: (items) => commit({ items }),

      addItem: (item) => {
        // UI以外の経路でも最大数を超えないよう、ストア側で保証する
        const { items } = get();
        if (items.length >= MAX_ITEM_COUNT) return null;

        const newItem = { ...cloneItemWithNewIds(item), order: items.length };
        commit({ items: [...items, newItem], selectedItemId: newItem.id });
        return newItem.id;
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
        const copy = cloneItemWithNewIds(source);
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
          Object.keys(updates) as (keyof ResolvedProjectSettings)[]
        ).some((key) => !isSameSettingValue(key, settings[key], updates[key]));
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

      deleteProject: async (projectId = get().projectId) => {
        await runProjectTransition(async () => {
          if (projectId !== get().projectId) {
            await deleteProjectFromDB(projectId);
            return;
          }

          // 保留中の保存が削除後に発火して、消したプロジェクトを復活させないよう捨てる
          cancelPendingAutosave();
          await deleteProjectFromDB(projectId);

          // 残りのうち最新のプロジェクトを開く（なければ新しい空のプロジェクト）
          const [latest] = await listProjects();
          const data = latest ? await loadProject(latest.id) : undefined;
          if (latest && data) {
            get().openProject(latest.id, data);
          } else {
            openNewProject();
          }
        });
      },

      deleteImageAndClearReferences: async (imageId) => {
        // 画像の Blob は IndexedDB から消えるため、Undo で imageSource だけ戻ると参照切れになる。
        // そのためこの操作は履歴に積まず、履歴内の同じ画像への参照も空にする。
        set((state) => ({
          items: clearImageReferences(state.items, imageId),
          past: clearImageReferencesInHistory(state.past, imageId),
          future: clearImageReferencesInHistory(state.future, imageId),
        }));

        // IndexedDBから画像を削除
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
    // 初期読み込み完了後かつプロジェクト切り替え・復元処理中でないときのみオートセーブを予約する
    const state = useEditorStore.getState();
    if (state.isLoaded && !state.isSwitchingProject) {
      // 保存先はこの時点のプロジェクトID（実行時に読むと切り替え先へ書き込む恐れがある）
      failedSave = null;
      debouncedSave(state.projectId, state);
    }
  },
  { equalityFn: shallow }
);

// アプリ更新などの外部処理から保留中のオートセーブを確定できるよう登録する
registerAutosaveFlusher(async () => useEditorStore.getState().flushAutosave());

/**
 * モジュール読み込み時にDBからプロジェクトを初期化
 *
 * @remarks
 * useEffect を使用せず、モジュールスコープで初期化を実行
 * クライアントサイドでのみ実行される
 */
if (typeof window !== "undefined") {
  void findInitialProject()
    .then((initial) => {
      if (initial) {
        useEditorStore.getState().openProject(initial.projectId, initial.data);
      } else {
        // DB が空の場合も openProject を通して一貫した状態遷移を保証する
        // （新しいプロジェクトはカードやタイトルを編集した時点で保存される）
        useEditorStore.getState().openProject(nanoid(), createNewProject());
      }
    })
    .catch(() => {
      // 以下のケースで DB の読み込みが失敗する可能性がある：
      // - ブラウザのストレージ制限やプライベートモードによる制限
      // - DB初期化中のタイミング競合（テスト環境含む）
      //
      // 失敗時は「UIを操作可能にする」最小限として isLoaded のみ true にする。
      // 保存先は初期値の新しい ID のままなので、編集しても既存のプロジェクトを上書きしない。
      useEditorStore.setState({ isLoaded: true });

      // 一時的な失敗（DB初期化中など）に備え、1回だけ遅延リトライする。
      // 成功すれば正しいデータで初期化される（この場合は読み込んだデータで上書きされる）。
      setTimeout(() => {
        void findInitialProject()
          .then((initial) => {
            if (initial) {
              useEditorStore
                .getState()
                .openProject(initial.projectId, initial.data);
            }
          })
          .catch(() => {
            // 2回目も失敗した場合は無視（空状態で継続）
          });
      }, 0);
    });
}
