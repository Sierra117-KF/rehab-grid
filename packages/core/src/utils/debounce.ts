/**
 * debounce 関数
 *
 * 連続した呼び出しを抑制し、最後の呼び出しから指定時間経過後に実行する
 */

/**
 * debounce された関数
 *
 * @remarks
 * 呼び出しに加えて、保留中の実行を今すぐ行う flush と、捨てる cancel を持つ
 */
export type DebouncedFunction<Args extends unknown[]> = ((
  ...args: Args
) => void) & {
  /**
   * 保留中の実行があれば今すぐ実行し、完了を待つ
   *
   * @remarks
   * 保留中の実行がなくても、すでに始まっている実行（fn が返した Promise）があればその完了を待つ
   */
  flush: () => Promise<void>;
  /** 保留中の実行を捨てる */
  cancel: () => void;
};

/**
 * 関数の実行を遅延させるdebounce関数
 *
 * @param fn - 遅延実行する関数（Promise を返す場合は flush でその完了を待てる）
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
 * await debouncedSave.flush(); // 2 秒を待たずに今すぐ実行して完了を待つ
 * ```
 */
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void | Promise<void>,
  delay: number
): DebouncedFunction<Args> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: Args | null = null;
  // 実行中の fn の完了（失敗しても reject しない。失敗はその実行を flush した呼び出し元にだけ返す）
  let running: Promise<void> = Promise.resolve();

  /** 保留中の引数で fn を実行する（保留がなければ実行中の fn の完了を待つ） */
  const run = async () => {
    const args = pendingArgs;
    timeoutId = null;
    pendingArgs = null;
    if (args === null) return running;
    const result = Promise.resolve(fn(...args));
    running = result.catch(() => undefined);
    return result;
  };

  /** 保留中のタイマーを止める */
  const clearTimer = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const debounced = (...args: Args) => {
    clearTimer();
    pendingArgs = args;
    timeoutId = setTimeout(() => {
      // タイマーからの実行は失敗を返す相手がいないため、未処理の reject にしない
      run().catch(() => undefined);
    }, delay);
  };

  debounced.flush = async () => {
    clearTimer();
    await run();
  };

  debounced.cancel = () => {
    clearTimer();
    pendingArgs = null;
  };

  return debounced;
}
