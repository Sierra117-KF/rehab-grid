import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * クラス名を結合し、Tailwind CSSのクラス競合を解決するユーティリティ関数
 * @param inputs - 結合するクラス名（条件付きクラスも可）
 * @returns 結合・最適化されたクラス名文字列
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
