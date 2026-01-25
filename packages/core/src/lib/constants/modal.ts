/**
 * モーダル関連の定数
 */

/**
 * セキュリティモーダルの有効期限（ミリ秒）
 *
 * @remarks
 * この期間内に再度エディタへ遷移する場合、モーダルをスキップする。
 * 必要に応じてこの値を変更することで有効期限を調整可能。
 * ただしsessionStorageが存在している間はモーダルがスキップされる。
 * タブを閉じるとsessionStorageがクリアされる。
 */
export const SECURITY_DISCLAIMER_EXPIRY_MS = 30 * 60 * 1000;

/**
 * LocalStorage キー: 同意タイムスタンプ
 *
 * @remarks
 * 最後にセキュリティモーダルに同意した時刻（Unix timestamp）を保存する。
 * ブラウザ全体で共有され、有効期限の判定に使用される。
 */
export const SECURITY_DISCLAIMER_TIMESTAMP_KEY =
  "rehabgrid_disclaimer_timestamp";

/**
 * sessionStorage キー: セッション内同意フラグ
 *
 * @remarks
 * 同一タブ内での往復時にモーダルをスキップするためのフラグ。
 * タブを閉じると自動的にクリアされる。
 */
export const SECURITY_DISCLAIMER_SESSION_KEY = "rehabgrid_disclaimer_session";
