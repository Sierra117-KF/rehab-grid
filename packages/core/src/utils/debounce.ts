/**
 * debounce 関数
 *
 * 連続した呼び出しを抑制し、最後の呼び出しから指定時間経過後に実行する
 */

/**
 * 関数の実行を遅延させるdebounce関数
 *
 * @param fn - 遅延実行する関数
 * @param delay - 遅延時間（ミリ秒）
 * @returns debounce された関数
 *
 * @example
 * ```ts
 * const debouncedSave = debounce((data) => saveToDb(data), 2000);
 * // 連続して呼び出しても、最後の呼び出しから2秒後に1回だけ実行
 * debouncedSave(data1);
 * debouncedSave(data2);
 * debouncedSave(data3); // これだけが2秒後に実行される
 * ```
 */
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delay: number
): (...args: Args) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Args) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}
