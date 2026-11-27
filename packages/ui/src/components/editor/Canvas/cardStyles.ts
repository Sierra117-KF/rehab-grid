/**
 * 運動カードの中身の部品で共有するスタイル
 */

import { PDF_CONTENT_SIZE_LANDSCAPE } from "@rehab-grid/core/lib/constants";

/**
 * PDF のスライドのカードの幅（ポイント単位）
 *
 * キャンバスのスライドは、この幅に対する比率で寸法と文字の大きさを決める
 */
const SLIDE_CARD_WIDTH_PT = PDF_CONTENT_SIZE_LANDSCAPE.width;

/**
 * PDF のスライドでの長さ（ポイント）を、キャンバスのスライドの幅に比例する CSS の長さにする
 *
 * @remarks
 * スライドの外枠（container-type: inline-size）の幅に対するコンテナクエリ単位（cqw）で表す。
 * 下限を指定すると、狭い画面でも読める大きさを保つ（`max(cqw, px)`）
 *
 * @param pt - PDF での長さ（ポイント単位）
 * @param minPx - 下限（px。省略時は下限なし）
 * @returns CSS の長さ
 */
export function ptToSlideCqw(pt: number, minPx?: number): string {
  const cqw = `${((pt / SLIDE_CARD_WIDTH_PT) * 100).toFixed(3)}cqw`;
  return minPx === undefined ? cqw : `max(${cqw}, ${String(minPx)}px)`;
}

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
