/**
 * プロジェクト設定のデフォルト値補完
 */

import {
  CHECK_TABLE_OPTIONS,
  DEFAULT_THEME_COLOR,
  LABELS,
  LAYOUT_COLUMNS,
  PAGE_ORIENTATION_OPTIONS,
  PRINT_COLOR_MODE_OPTIONS,
  SHEET_DATE_MODE_OPTIONS,
  TEXT_LIMITS,
  TEXT_SCALE_OPTIONS,
  THEME_COLOR_PATTERN,
} from "@rehab-grid/core/lib/constants";
import {
  type BadgeType,
  type CheckTableType,
  type DosageLabels,
  type LayoutType,
  type PageOrientation,
  type PrintColorMode,
  type ProjectSettings,
  type ResolvedProjectSettings,
  type SheetDateMode,
  type SheetHeaderSettings,
  type TextScale,
} from "@rehab-grid/core/types";

/** レイアウトタイプが未指定・不正な場合に使うデフォルト値 */
const DEFAULT_LAYOUT_TYPE: LayoutType = "grid2";

/** 印刷の色づかいの選択肢 */
const PRINT_COLOR_MODES: readonly PrintColorMode[] =
  PRINT_COLOR_MODE_OPTIONS.map((option) => option.value);

/** 文字サイズの選択肢 */
const TEXT_SCALES: readonly TextScale[] = TEXT_SCALE_OPTIONS.map(
  (option) => option.value
);

/** 用紙の向きの選択肢 */
const PAGE_ORIENTATIONS: readonly PageOrientation[] =
  PAGE_ORIENTATION_OPTIONS.map((option) => option.value);

/** 日付欄の選択肢 */
const SHEET_DATE_MODES: readonly SheetDateMode[] = SHEET_DATE_MODE_OPTIONS.map(
  (option) => option.value
);

/** 実施チェック表の選択肢 */
const CHECK_TABLE_TYPES: readonly CheckTableType[] = CHECK_TABLE_OPTIONS.map(
  (option) => option.value
);

/** 用量ラベルのキー */
const DOSAGE_LABEL_KEYS: readonly BadgeType[] = ["reps", "sets", "frequency"];

/**
 * 値が LayoutType かどうかを判定する型ガード
 *
 * @remarks
 * IndexedDB からの復元や Worker へのメッセージは Zod を通らないため、実行時に検証する
 *
 * @param value - 判定する値
 * @returns value が LayoutType の場合 true
 */
export function isLayoutType(value: unknown): value is LayoutType {
  // in 演算子だと "toString" 等のプロトタイプのキーも通るため、自身のキーだけを見る
  return typeof value === "string" && Object.hasOwn(LAYOUT_COLUMNS, value);
}

/**
 * 値が選択肢に含まれていればその値を、そうでなければデフォルト値を返す
 *
 * @param value - 判定する値
 * @param options - 選択肢
 * @param fallback - デフォルト値
 * @returns 選択肢のいずれか
 */
function pickOption<T extends string>(
  value: unknown,
  options: readonly T[],
  fallback: T
): T {
  return options.find((option) => option === value) ?? fallback;
}

/**
 * 用量ラベルの未指定・空欄のキーをデフォルト値（LABELS）で補う
 *
 * @remarks
 * 前後の空白だけの値も空欄として扱う。最大文字数（TEXT_LIMITS.dosageLabel）を超えた分は切り捨てる。
 *
 * @param labels - 補完前のラベル
 * @returns 全キーがそろったラベル
 *
 * @example
 * ```typescript
 * resolveDosageLabels({ reps: "秒数", sets: "" });
 * // { reps: "秒数", sets: "セット", frequency: "頻度" }
 * ```
 */
export function resolveDosageLabels(
  labels: Partial<DosageLabels> | undefined
): DosageLabels {
  const result: DosageLabels = {
    reps: LABELS.reps,
    sets: LABELS.sets,
    frequency: LABELS.frequency,
  };
  for (const key of DOSAGE_LABEL_KEYS) {
    // IndexedDB からの復元は型どおりとは限らないため、文字列かどうかを実行時に確認する
    const value: unknown = labels?.[key];
    if (typeof value === "string" && value.trim() !== "") {
      result[key] = value.slice(0, TEXT_LIMITS.dosageLabel);
    }
  }
  return result;
}

/**
 * PDF ヘッダーの項目の未指定・不正な値をデフォルト値で補う
 *
 * @remarks
 * 氏名欄は明示的に false が指定されたときだけ消す（2-3 より前のデータは氏名欄ありのまま）
 *
 * @param header - 補完前のヘッダーの項目
 * @returns 全キーがそろったヘッダーの項目
 *
 * @example
 * ```typescript
 * resolveSheetHeader({ dateMode: "blank" });
 * // { showPatientNameBox: true, dateMode: "blank" }
 * ```
 */
export function resolveSheetHeader(
  header: Partial<SheetHeaderSettings> | undefined
): SheetHeaderSettings {
  return {
    showPatientNameBox: header?.showPatientNameBox !== false,
    dateMode: pickOption(header?.dateMode, SHEET_DATE_MODES, "none"),
  };
}

/**
 * プロジェクト設定の未指定・不正な値をデフォルト値で補う
 *
 * @remarks
 * IndexedDB からの復元は Zod を通らないため、ストアに入る入口と PDF 生成で呼ぶ。
 * テーマカラーは大文字・小文字の表記を保ったまま返す（Zod スキーマと同じ方針）。
 *
 * @param settings - 補完前の設定（古いデータでは項目が欠けていることがある）
 * @returns 全項目がそろった設定
 *
 * @example
 * ```typescript
 * resolveProjectSettings({ layoutType: "grid3" });
 * // { layoutType: "grid3", themeColor: "#3b82f6", printColorMode: "color", ... }
 * ```
 */
export function resolveProjectSettings(
  settings: Partial<ProjectSettings> | undefined
): ResolvedProjectSettings {
  const layoutType = settings?.layoutType;
  const themeColor = settings?.themeColor;

  return {
    layoutType: isLayoutType(layoutType) ? layoutType : DEFAULT_LAYOUT_TYPE,
    themeColor:
      typeof themeColor === "string" && THEME_COLOR_PATTERN.test(themeColor)
        ? themeColor
        : DEFAULT_THEME_COLOR,
    printColorMode: pickOption(
      settings?.printColorMode,
      PRINT_COLOR_MODES,
      "color"
    ),
    textScale: pickOption(settings?.textScale, TEXT_SCALES, "standard"),
    pageOrientation: pickOption(
      settings?.pageOrientation,
      PAGE_ORIENTATIONS,
      "auto"
    ),
    showCardNumbers: settings?.showCardNumbers === true,
    dosageLabels: resolveDosageLabels(settings?.dosageLabels),
    header: resolveSheetHeader(settings?.header),
    checkTable: pickOption(settings?.checkTable, CHECK_TABLE_TYPES, "none"),
  };
}
