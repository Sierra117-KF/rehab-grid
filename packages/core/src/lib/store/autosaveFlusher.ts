/**
 * エディタのオートセーブ確定処理を外部（Web 版のアプリ更新通知など）から呼ぶための登録口
 *
 * @remarks
 * ルートレイアウトから `useEditorStore` を直接・動的に import すると、
 * エディタを開いていないページでもストアのバンドル取得や DB 初期化が走ってしまう。
 * この軽量な登録口を介することで、エディタが開かれたときだけ保存処理を結びつける
 */

/** 保留中のオートセーブを確定して完了を待つ関数 */
type AutosaveFlusher = () => Promise<void>;

/** 登録済みのオートセーブ確定処理（エディタ未読み込み時は undefined） */
let registeredFlusher: AutosaveFlusher | undefined;

/**
 * オートセーブの確定処理を登録する
 *
 * @param flusher - 保留中のオートセーブを確定する関数（undefined で解除）
 */
export function registerAutosaveFlusher(
  flusher: AutosaveFlusher | undefined
): void {
  registeredFlusher = flusher;
}

/**
 * 登録済みのオートセーブ確定処理を実行する
 *
 * @remarks
 * エディタがまだ開かれていない（未登録の）場合は何もせず完了する。
 * 保存に失敗した場合はそのまま reject する
 */
export async function flushRegisteredAutosave(): Promise<void> {
  await registeredFlusher?.();
}
