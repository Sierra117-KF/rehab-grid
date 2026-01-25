/**
 * エディタ関連の型定義
 *
 * 自主トレーニング指導箋エディタで使用する型を定義
 */

/**
 * 運動の負荷・回数設定
 */
export type Dosages = {
  /** 回数（例: "10回"） */
  reps: string;
  /** セット数（例: "3セット"） */
  sets: string;
  /** 頻度（例: "1日2回"） */
  frequency: string;
};

/**
 * バッジの種類
 */
export type BadgeType = "reps" | "sets" | "frequency";

/**
 * バッジ情報
 *
 * 用量バッジのレンダリングに必要な情報を保持
 */
export type BadgeInfo = {
  /** バッジの種類 */
  type: BadgeType;
  /** 表示値 */
  value: string;
  /** 値が設定されているか */
  hasValue: boolean;
};

/**
 * バッジレイアウト行
 *
 * 1行に表示するバッジのグループを表現
 */
export type BadgeRow = {
  /** 行に含まれるバッジ */
  badges: BadgeInfo[];
  /** 横幅いっぱいに表示するか（4列レイアウト時の頻度バッジ用） */
  isFullWidth?: boolean;
};

/**
 * 注意点アイテム
 *
 * 各注意点は一意のIDを持ち、Reactのkey属性として使用される
 */
export type Precaution = {
  /** 一意のID（nanoid で生成） */
  id: string;
  /** 注意点の内容 */
  value: string;
};

/**
 * エディタカードのアイテム
 *
 * 1枚のカードに表示される運動指導の情報を保持
 */
export type EditorItem = {
  /** 一意のID（nanoid で生成） */
  id: string;
  /** 並び順（グリッド内での表示順序） */
  order: number;
  /** 運動名（例: "スクワット"） */
  title: string;
  /**
   * 画像ソース
   * - IndexedDB: 画像ID
   * - ZIPエクスポート: 相対パス（例: "images/img_001.webp"）
   * - JSONエクスポート: 空文字列
   */
  imageSource: string;
  /** 運動の説明・手順 */
  description: string;
  /** 負荷・回数設定（オプション） */
  dosages?: Dosages;
  /** 注意点のリスト（オプション） */
  precautions?: Precaution[];
};

/**
 * グリッドレイアウトタイプ
 *
 * - grid1: 1列表示（大きな画像）
 * - grid2: 2列表示
 * - grid3: 3列表示
 * - grid4: 4列表示（リスト風）
 */
export type LayoutType = "grid1" | "grid2" | "grid3" | "grid4";

/**
 * Blob レコード
 *
 * id と blob を持つオブジェクト。Object URL 管理などで使用する。
 */
export type BlobRecord = {
  /** 一意のID */
  id: string;
  /** 画像データ */
  blob: Blob;
};

/**
 * 統合画像レコード（サンプル画像 + 取り込み画像）
 *
 * 画像ライブラリで使用する、サンプル画像と取り込み画像を統一的に扱うための型
 */
export type UnifiedImageRecord = {
  /** 画像ID */
  id: string;
  /** ファイル名（拡張子なし） */
  fileName: string;
  /** サンプル画像かどうか */
  isSample: boolean;
  /** サンプル画像の場合の静的パス（取り込み画像の場合は undefined） */
  path?: string;
};
