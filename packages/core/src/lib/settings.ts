/**
 * プロジェクト設定のデフォルト値補完
 */

import {
  DEFAULT_THEME_COLOR,
  LAYOUT_COLUMNS,
  THEME_COLOR_PATTERN,
} from "@rehab-grid/core/lib/constants";
import {
  type LayoutType,
  type ProjectSettings,
  type ResolvedProjectSettings,
} from "@rehab-grid/core/types";

/** レイアウトタイプが未指定・不正な場合に使うデフォルト値 */
const DEFAULT_LAYOUT_TYPE: LayoutType = "grid2";

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
 * // { layoutType: "grid3", themeColor: "#3b82f6" }
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
  };
}
