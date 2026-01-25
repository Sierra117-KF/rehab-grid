/**
 * サンプル画像の定数とユーティリティ
 *
 * 開発者が用意したサンプル自主トレ画像のマニフェストを管理
 */

/**
 * サンプル画像の型定義
 */
export type SampleImage = {
  /** サンプル画像ID（sample_ プレフィックス） */
  id: string;
  /** ファイル名（拡張子なし） */
  fileName: string;
  /** 静的ファイルパス */
  path: string;
};

/** サンプル画像IDのプレフィックス */
export const SAMPLE_IMAGE_ID_PREFIX = "sample_";

/**
 * サンプル画像のマニフェスト
 *
 * @remarks
 * - 画像は `public/images/samples/` に配置
 * - ファイル名形式: `{position}_{order:2桁}_{displayName}.webp`
 * - 表示順序は配列の並び順で制御
 */
export const SAMPLE_IMAGES: readonly SampleImage[] = [

  // 臥位（lying）
  {
    id: "sample_lying_01",
    fileName: "lying_01_ヒップアップ",
    path: "/images/samples/lying_01_hip-up.webp",
  },
  {
    id: "sample_lying_02",
    fileName: "lying_02_足上げ（SLR）",
    path: "/images/samples/lying_02_SLR.webp",
  },
  {
    id: "sample_lying_03",
    fileName: "lying_03_股関節回旋",
    path: "/images/samples/lying_03_hip-rotation.webp",
  },
  {
    id: "sample_lying_04",
    fileName: "lying_04_股関節外転",
    path: "/images/samples/lying_04_hip-abduction.webp",
  },
  {
    id: "sample_lying_05",
    fileName: "lying_05_股関節伸展",
    path: "/images/samples/lying_05_hip-extension.webp",
  },
  {
    id: "sample_lying_06",
    fileName: "lying_06_膝関節屈伸",
    path: "/images/samples/lying_06_knee-extension.webp",
  },
  {
    id: "sample_lying_07",
    fileName: "lying_07_上体起こし",
    path: "/images/samples/lying_07_trunk-curl.webp",
  },
  {
    id: "sample_lying_08",
    fileName: "lying_08_腹部ブレーシング",
    path: "/images/samples/lying_08_abdominal-bracing.webp",
  },
  {
    id: "sample_lying_09",
    fileName: "lying_09_DNS 3 ヶ月肢位",
    path: "/images/samples/lying_09_3-month-exercise.webp",
  },
  {
    id: "sample_lying_10",
    fileName: "lying_10_体幹回旋",
    path: "/images/samples/lying_10_trunk-rotation.webp",
  },
  {
    id: "sample_lying_11",
    fileName: "lying_11_寝返り",
    path: "/images/samples/lying_11_roll-over.webp",
  },
  {
    id: "sample_lying_12",
    fileName: "lying_12_麻痺側上肢リーチング",
    path: "/images/samples/lying_12_arm-extension.webp",
  },
  {
    id: "sample_lying_13",
    fileName: "lying_13_足関節底背屈",
    path: "/images/samples/lying_13_ankle-exercise.webp",
  },
  {
    id: "sample_lying_14",
    fileName: "lying_14_足指じゃんけん",
    path: "/images/samples/lying_14_toe-rock-paper-scissors.webp",
  },
  {
    id: "sample_lying_15",
    fileName: "lying_15_キャットエクササイズ",
    path: "/images/samples/lying_15_cat-exercise.webp",
  },
  {
    id: "sample_lying_16",
    fileName: "lying_16_ライオンエクササイズ",
    path: "/images/samples/lying_16_lion-exercise.webp",
  },
  {
    id: "sample_lying_17",
    fileName: "lying_17_四つ這い肩関節屈曲",
    path: "/images/samples/lying_17_quadruped-shoulder-flexion.webp",
  },
  {
    id: "sample_lying_18",
    fileName: "lying_18_四つ這い股関節伸展1",
    path: "/images/samples/lying_18_quadruped-hip-extension1.webp",
  },
  {
    id: "sample_lying_19",
    fileName: "lying_19_四つ這い股関節伸展2",
    path: "/images/samples/lying_19_quadruped-hip-extension2.webp",
  },
  {
    id: "sample_lying_20",
    fileName: "lying_20_ハンドニー",
    path: "/images/samples/lying_20_hand-knee.webp",
  },

  // 座位（sitting）
  {
    id: "sample_sitting_01",
    fileName: "sitting_01_股関節屈曲",
    path: "/images/samples/sitting_01_hip-fexion.webp",
  },
  {
    id: "sample_sitting_02",
    fileName: "sitting_02_ハムストレッチ",
    path: "/images/samples/sitting_02_ham-stretching.webp",
  },
  {
    id: "sample_sitting_03",
    fileName: "sitting_03_足関節底背屈",
    path: "/images/samples/sitting_03_ankle-exercise.webp",
  },
  {
    id: "sample_sitting_04",
    fileName: "sitting_04_麻痺側上肢挙上",
    path: "/images/samples/sitting_04_arm-raise.webp",
  },
  {
    id: "sample_sitting_05",
    fileName: "sitting_05_ブリュガー体操",
    path: "/images/samples/sitting_05-brugger-exercise.webp",
  },
  {
    id: "sample_sitting_06",
    fileName: "sitting_06_肩甲骨外旋 1",
    path: "/images/samples/sitting_06_scapular-external-rotation1.webp",
  },
  {
    id: "sample_sitting_07",
    fileName: "sitting_07_肩甲骨外旋 2",
    path: "/images/samples/sitting_07_scapular-external-rotation2.webp",
  },
  {
    id: "sample_sitting_08",
    fileName: "sitting_08_タオル拭き",
    path: "/images/samples/sitting_08_towel-wipes.webp",
  },
  {
    id: "sample_sitting_09",
    fileName: "sitting_09_棒体操",
    path: "/images/samples/sitting_09_bar-exercise.webp",
  },
  {
    id: "sample_sitting_10",
    fileName: "sitting_10_口唇体操",
    path: "/images/samples/sitting_10_lip-exercise.webp",
  },
  {
    id: "sample_sitting_11",
    fileName: "sitting_11_舌体操 1",
    path: "/images/samples/sitting_11_tongue-exercise1.webp",
  },
  {
    id: "sample_sitting_12",
    fileName: "sitting_12_舌体操 2",
    path: "/images/samples/sitting_12_tongue-exercise2.webp",
  },

  // 立位（standing）
  {
    id: "sample_standing_01",
    fileName: "standing_01_起立訓練（テーブル）",
    path: "/images/samples/standing_01_stand-up-table.webp",
  },
  {
    id: "sample_standing_02",
    fileName: "standing_02_起立訓練（右手すり）",
    path: "/images/samples/standing_02_stand-up-right-side-rail.webp",
  },
  {
    id: "sample_standing_03",
    fileName: "standing_03_起立訓練（左手すり）",
    path: "/images/samples/standing_03_stand-up-left-side-rail.webp",
  },
  {
    id: "sample_standing_04",
    fileName: "standing_04_起立訓練（椅子）",
    path: "/images/samples/standing_04_stand-up-chair.webp",
  },
  {
    id: "sample_standing_05",
    fileName: "standing_05_スクワット",
    path: "/images/samples/standing_05_squat.webp",
  },
  {
    id: "sample_standing_06",
    fileName: "standing_06_カーフレイズ",
    path: "/images/samples/standing_06_calf-raise.webp",
  },
  {
    id: "sample_standing_07",
    fileName: "standing_07_カーフストレッチ",
    path: "/images/samples/standing_07_calf-stretching.webp",
  },
  {
    id: "sample_standing_08",
    fileName: "standing_08_テーブルデッドリフト",
    path: "/images/samples/standing_08_table-dead-lift.webp",
  },
  {
    id: "sample_standing_09",
    fileName: "standing_09_腕立て伏せ（壁）",
    path: "/images/samples/standing_09_wall-push-up.webp",
  },
  {
    id: "sample_standing_10",
    fileName: "standing_10_壁スライド",
    path: "/images/samples/standing_10_wall-slide.webp",
  },

] as const;

/**
 * サンプル画像ID→メタデータのインデックス
 *
 * @remarks
 * `getSampleImagePath` 等の O(1) 参照に使用する
 */
const SAMPLE_IMAGE_BY_ID: ReadonlyMap<string, SampleImage> = new Map(
  SAMPLE_IMAGES.map((img) => [img.id, img])
);

/**
 * サンプル画像かどうかを判定
 *
 * @param imageId - 画像ID
 * @returns サンプル画像の場合は true
 *
 * @example
 * ```ts
 * isSampleImage("sample_standing_01") // true
 * isSampleImage("abc123")             // false
 * ```
 */
export function isSampleImage(imageId: string): boolean {
  return imageId.startsWith(SAMPLE_IMAGE_ID_PREFIX);
}

/**
 * サンプル画像IDから静的ファイルパスを取得
 *
 * @param imageId - サンプル画像ID
 * @returns 静的ファイルパス、見つからない場合は undefined
 *
 * @example
 * ```ts
 * getSampleImagePath("sample_standing_01")
 * // "/images/samples/standing_01_スクワット.webp"
 * ```
 */
export function getSampleImagePath(imageId: string): string | undefined {
  return SAMPLE_IMAGE_BY_ID.get(imageId)?.path;
}

/**
 * サンプル画像IDからファイル名を取得
 *
 * @param imageId - サンプル画像ID
 * @returns ファイル名（拡張子なし）、見つからない場合は undefined
 */
export function getSampleImageFileName(imageId: string): string | undefined {
  return SAMPLE_IMAGE_BY_ID.get(imageId)?.fileName;
}
