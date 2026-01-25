/**
 * 画像関連の定数
 *
 * 画像アップロード時のバリデーション設定
 */

/** アップロード可能な最大ファイルサイズ（20MB） */
export const MAX_FILE_SIZE = 20 * 1024 * 1024;

/** インポート可能なJSONファイルの最大サイズ（10MB） */
export const MAX_IMPORT_JSON_SIZE = 10 * 1024 * 1024;

/** インポート可能なZIPファイルの最大サイズ（50MB） */
export const MAX_IMPORT_ZIP_SIZE = 50 * 1024 * 1024;

/** ZIPファイル内の画像の最大数（ZIP爆弾対策） */
export const MAX_ZIP_IMAGE_COUNT = 15;

/** ZIPファイル展開後の合計最大サイズ（100MB、ZIP爆弾対策） */
export const MAX_ZIP_EXTRACTED_SIZE = 100 * 1024 * 1024;

/** 許可される画像形式 */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

/** 許可される画像形式の型 */
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

/** input[type=file] の accept 属性用文字列 */
export const IMAGE_ACCEPT_TYPES = ALLOWED_IMAGE_TYPES.join(",");

/**
 * 画像フィルターカテゴリの型
 *
 * ファイル名の接頭語に基づいて画像をフィルタリングするためのカテゴリ定義
 */
export type ImageFilterCategory = {
  /** Selectコンポーネントの値（"all" = すべて） */
  value: string;
  /** ファイル名検索用の接頭語（空文字 = フィルタなし） */
  prefix: string;
  /** 表示ラベル */
  label: string;
  /** ユーザー取り込み画像のみ表示するフラグ */
  isUserImported?: boolean;
};

/** 「取り込み画像」フィルターの値 */
export const IMPORTED_IMAGE_FILTER = "imported";

/**
 * 画像フィルターカテゴリ一覧
 *
 * @remarks
 * - "all": 全画像を表示
 * - "imported": 取り込み画像
 * - "standing": 立位の運動画像（standing_*.jpg）
 * - "sitting": 座位の運動画像（sitting_*.jpg）
 * - "lying": 臥位の運動画像（lying_*.jpg）
 */
export const IMAGE_FILTER_CATEGORIES: readonly ImageFilterCategory[] = [
  { value: "all", prefix: "", label: "すべて" },
  {
    value: IMPORTED_IMAGE_FILTER,
    prefix: "",
    label: "取り込み画像",
    isUserImported: true,
  },
  { value: "standing", prefix: "standing_", label: "立位" },
  { value: "sitting", prefix: "sitting_", label: "座位" },
  { value: "lying", prefix: "lying_", label: "臥位" },
];

/** デフォルトのフィルター値 */
export const DEFAULT_IMAGE_FILTER = "all";

/**
 * 画像表示名から除去する接頭辞一覧
 *
 * @remarks
 * ホバープレビューやその他のUI表示時に、
 * ファイル名からこれらの接頭辞を除去して読みやすくする
 */
export const IMAGE_DISPLAY_NAME_PREFIXES = [
  "standing_",
  "sitting_",
  "lying_",
] as const;

/**
 * 画像表示名から除去する番号パターン
 *
 * @remarks
 * サンプル画像のファイル名形式 `{position}_{order:2桁}_{displayName}`
 * から番号部分（例: "01_"）を除去するための正規表現
 *
 * @example
 * "01_スクワット".replace(IMAGE_DISPLAY_NAME_NUMBER_PATTERN, "") // "スクワット"
 */
export const IMAGE_DISPLAY_NAME_NUMBER_PATTERN = /^\d+_/;
