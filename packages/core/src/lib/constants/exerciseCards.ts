/**
 * マイ運動（保存した運動カード）関連の定数
 */

/** マイ運動の名前（モーダルのタイトル） */
export const EXERCISE_CARD_LIBRARY_LABEL = "マイ運動";

/** マイ運動モーダルの説明 */
export const EXERCISE_CARD_LIBRARY_DESCRIPTION =
  "保存した運動カードを選ぶと、指導箋の末尾に追加します。";

/** マイ運動からカードを追加するボタンのラベル */
export const EXERCISE_CARD_ADD_BUTTON_LABEL = "マイ運動から追加";

/** カードをマイ運動に保存するボタンのラベル */
export const EXERCISE_CARD_SAVE_LABEL = "マイ運動に保存";

/** カードをマイ運動に保存するボタンのツールチップ */
export const EXERCISE_CARD_SAVE_TOOLTIP =
  "このカードを保存して、ほかの指導箋でも呼び出せるようにします";

/** マイ運動保存成功 */
export const EXERCISE_CARD_SAVE_SUCCESS_MESSAGE = "マイ運動に保存しました";

/** マイ運動が 1 件もないときの案内 */
export const EXERCISE_CARD_EMPTY_MESSAGE =
  "保存したマイ運動はまだありません。カード編集の「マイ運動に保存」から追加できます。";

/** 検索に一致するマイ運動がないとき */
export const EXERCISE_CARD_NO_MATCHES = "該当するマイ運動がありません";

/** マイ運動の検索欄のラベル */
export const EXERCISE_CARD_SEARCH_LABEL = "運動名で検索";

/** マイ運動の検索欄のプレースホルダー */
export const EXERCISE_CARD_SEARCH_PLACEHOLDER = "運動名で検索（例: 足上げ）";

/** マイ運動の削除ボタンのラベル */
export const EXERCISE_CARD_DELETE_LABEL = "削除";

/** マイ運動削除確認のタイトル */
export const EXERCISE_CARD_DELETE_CONFIRM_TITLE = "マイ運動を削除しますか？";

/**
 * マイ運動削除確認の説明文を生成
 *
 * @param title - 運動名
 * @returns 説明文
 */
export function createExerciseCardDeleteConfirmDescription(
  title: string
): string {
  return `「${title}」をマイ運動から削除します。すでに指導箋に追加したカードは残ります。`;
}

/** マイ運動削除成功 */
export const EXERCISE_CARD_DELETE_SUCCESS_MESSAGE =
  "マイ運動から削除しました";

/** マイライブラリ（マイテンプレート・マイ運動・マイ定型文）への保存に失敗したとき */
export const LIBRARY_SAVE_FAILED_MESSAGE = "保存に失敗しました";
