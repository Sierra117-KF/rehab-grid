/**
 * ブラウザのストレージ関連のユーティリティ
 */

/**
 * ブラウザにストレージの永続化を要求する
 *
 * @remarks
 * 永続化されたストレージは、容量不足時などにブラウザが自動で削除しにくくなる。
 * 外部への通信は発生しない。未対応の環境や要求が失敗した場合は何もしない。
 *
 * @returns 永続化されていれば true
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (typeof navigator === "undefined" || !("storage" in navigator)) {
      return false;
    }
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/**
 * localStorage から値を読む（使えない環境では undefined）
 *
 * @remarks
 * プライベートモードやストレージの無効化で例外になりうるため try/catch で囲む
 *
 * @param key - キー
 * @returns 保存されている値（なければ undefined）
 */
export function readLocalStorage(key: string): string | undefined {
  try {
    return window.localStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * localStorage に値を書く（使えない環境では何もしない）
 *
 * @param key - キー
 * @param value - 値
 */
export function writeLocalStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // 保存できなくても動作は続ける（次回起動時に最新の指導箋が開くだけ）
  }
}
