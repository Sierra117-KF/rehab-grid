/**
 * 運動カードの中身の部品で共有するスタイル
 */

/**
 * CSS 変数（--xxx）を含められる style の型
 */
export type CssVariableStyle = React.CSSProperties &
  Record<`--${string}`, string>;

/** 行数の上限を渡す CSS 変数の名前 */
const LINE_CLAMP_VARIABLE = "--line-clamp";

/**
 * 行数を CSS 変数（--line-clamp）の値で切るクラス
 *
 * @remarks
 * -webkit-box-orient は React の型で非推奨扱いのため、Tailwind の line-clamp ユーティリティに任せ、
 * 行数だけを getLineClampStyle で渡す
 */
export const LINE_CLAMP_CLASS = "line-clamp-(--line-clamp)";

/**
 * LINE_CLAMP_CLASS に行数を渡すインラインスタイル
 *
 * @param lines - 行数の上限
 * @returns style に渡す値
 */
export function getLineClampStyle(lines: number): CssVariableStyle {
  return { [LINE_CLAMP_VARIABLE]: String(lines) };
}
