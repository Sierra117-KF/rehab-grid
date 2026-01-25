/**
 * メッセージ定数
 *
 * エラーメッセージ、通知メッセージなどを定義
 */

/** 不明なエラー時のデフォルトメッセージ */
export const UNKNOWN_ERROR_MESSAGE = "不明なエラーが発生しました";

/** 画像処理失敗時のメッセージ */
export const IMAGE_PROCESSING_ERROR_MESSAGE = "画像の処理に失敗しました";

// インポート関連メッセージ
/** インポート成功メッセージ */
export const IMPORT_SUCCESS_MESSAGE = "プロジェクトをインポートしました";

/** 対応していないファイル形式 */
export const IMPORT_ERROR_INVALID_FORMAT = "対応していないファイル形式です";

/** バリデーションエラー */
export const IMPORT_ERROR_VALIDATION = "ファイル形式が正しくありません";

/** 破損したZIPファイル */
export const IMPORT_ERROR_CORRUPTED_ZIP = "ZIPファイルが破損しています";

/** ZIPにプロジェクトデータがない */
export const IMPORT_ERROR_NO_PROJECT =
  "ZIPファイルにプロジェクトデータがありません";

/** 上書き確認ダイアログのタイトル */
export const IMPORT_CONFIRM_TITLE = "プロジェクトを開く";

/** 上書き確認ダイアログの説明 */
export const IMPORT_CONFIRM_DESCRIPTION =
  "現在のプロジェクトは上書きされます。続行しますか？";

/** ファイルサイズ超過エラー */
export const IMPORT_ERROR_FILE_TOO_LARGE = "ファイルサイズが大きすぎます";

/** ZIPファイル内の画像数超過エラー */
export const IMPORT_ERROR_TOO_MANY_IMAGES = "ZIPファイル内の画像数が多すぎます";

/** ZIPファイル展開後サイズ超過エラー */
export const IMPORT_ERROR_EXTRACTED_TOO_LARGE =
  "ZIPファイルの展開後サイズが大きすぎます";

// カード削除関連メッセージ
/** カード削除成功メッセージ */
export const DELETE_SUCCESS_MESSAGE = "カードを削除しました";

/** カード削除確認ダイアログのタイトル */
export const DELETE_CONFIRM_TITLE = "カードを削除";

/** カード削除確認ダイアログの説明 */
export const DELETE_CONFIRM_DESCRIPTION =
  "このカードを削除してもよろしいですか？この操作は取り消せません。";

// プロジェクト削除関連メッセージ
/** プロジェクト削除ボタンのツールチップ */
export const PROJECT_DELETE_TOOLTIP = "現在のプロジェクトを削除";

/** プロジェクト削除確認ダイアログのタイトル */
export const PROJECT_DELETE_CONFIRM_TITLE = "プロジェクトを削除";

/** プロジェクト削除確認ダイアログの説明 */
export const PROJECT_DELETE_CONFIRM_DESCRIPTION =
  "現在表示されているプロジェクトを削除します。この操作は元に戻せません。保存する場合は事前にバックアップをダウンロードしてください。";

/** プロジェクト削除成功メッセージ */
export const PROJECT_DELETE_SUCCESS_MESSAGE = "プロジェクトを削除しました";

// PDF出力関連メッセージ
/** PDF出力対象がない場合のエラーメッセージ */
export const PDF_NO_CARDS_ERROR = "出力するカードがありません";

/** PDF生成中のメッセージ */
export const PDF_GENERATING_MESSAGE = "PDF を生成しています...";

/** PDFダウンロード成功メッセージ */
export const PDF_DOWNLOAD_SUCCESS = "PDF をダウンロードしました";

/** PDF生成失敗メッセージ */
export const PDF_GENERATE_FAILED = "PDF 生成に失敗しました";

/** Workerエラー時のデフォルトメッセージ */
export const WORKER_ERROR_MESSAGE = "Worker でエラーが発生しました";

/** インポート失敗メッセージ */
export const IMPORT_FAILED_MESSAGE = "インポートに失敗しました";

// PDFメニューのラベル
/** PDFプレビューのラベル */
export const PDF_PREVIEW_LABEL = "プレビュー";

/** PDFダウンロードのラベル */
export const PDF_DOWNLOAD_LABEL = "ダウンロード";

/** PDFプレビューモーダルのタイトル */
export const PDF_PREVIEW_TITLE = "PDFプレビュー";

/** PDFプレビュー拡大ボタンのツールチップ */
export const PDF_PREVIEW_EXPAND_TOOLTIP = "拡大表示";

/** PDFプレビューフルスクリーンボタンのツールチップ */
export const PDF_PREVIEW_FULLSCREEN_TOOLTIP = "フルスクリーン";

/** PDFプレビュー生成中メッセージ */
export const PDF_PREVIEW_GENERATING = "プレビューを生成中...";

// 共通ボタンラベル
/** キャンセルボタンのラベル */
export const BUTTON_CANCEL = "キャンセル";

/** 続行ボタンのラベル */
export const BUTTON_CONTINUE = "続行";

// エクスポートメニューのラベル
/** 軽量JSONエクスポートのラベル */
export const EXPORT_JSON_LABEL = "テキストのみ";

/** 完全バックアップ（ZIP）エクスポートのラベル */
export const EXPORT_ZIP_LABEL = "画像付き";

// インポートボタンのラベル
/** ファイル読み込み中のラベル */
export const IMPORT_LOADING_LABEL = "読み込み中...";

/** ファイルを開くボタンのラベル */
export const IMPORT_OPEN_LABEL = "指導箋を開く";

// EditorHeader関連ラベル
/** プロジェクトタイトルラベル */
export const LABEL_PROJECT_TITLE = "タイトル：";

/** バックアップボタンのラベル */
export const BUTTON_BACKUP = "バックアップ";

/** PDFメニューボタンのラベル */
export const PDF_MENU_LABEL = "PDF";

/** PDF生成中の短いラベル */
export const PDF_GENERATING_SHORT = "生成中...";

/** ホームリンクのツールチップ */
export const HOME_LINK_TOOLTIP = "トップページへ戻る";

// Canvas関連ラベル
/** カードへの画像ドロップ時のプレースホルダー */
export const CANVAS_DROP_HERE = "ここにドロップ";

/** 空のキャンバス - タイトル */
export const CANVAS_EMPTY_TITLE = "カードがありません";

/** 空のキャンバス - 説明 */
export const CANVAS_EMPTY_DESCRIPTION =
  "左の画像ライブラリから画像をドラッグするか、下の「カードを追加」ボタンで新しいカードを作成してください";

/** カード追加ボタンのラベル */
export const BUTTON_ADD_CARD = "カードを追加";

/** モバイル用: タップで画像選択のラベル */
export const MOBILE_TAP_TO_SELECT_IMAGE = "タップで画像選択";

/** 削除ボタンのラベル */
export const BUTTON_DELETE = "削除";

/**
 * カードの最大数に達したときのメッセージを生成
 *
 * @param maxCount - カードの最大数
 * @returns 表示用メッセージ
 */
export function createMaxItemCountReachedMessage(maxCount: number): string {
  return `カードは最大${String(maxCount)}枚までです`;
}

// 画像ライブラリパネル関連
/** カテゴリ選択のプレースホルダー */
export const IMAGE_LIBRARY_CATEGORY_PLACEHOLDER = "カテゴリを選択";

/** アップロード中メッセージ */
export const IMAGE_LIBRARY_UPLOADING = "アップロード中...";

/** ドラッグ＆ドロップ案内 */
export const IMAGE_LIBRARY_DROP_INSTRUCTION = "ドラッグ＆ドロップ";

/** クリック選択案内 */
export const IMAGE_LIBRARY_CLICK_INSTRUCTION = "または クリックして選択";

/** フィルター結果なしメッセージ */
export const IMAGE_LIBRARY_NO_MATCHES = "該当する画像がありません";

/** まとめて削除ボタンのラベル */
export const IMAGE_LIBRARY_BULK_DELETE = "まとめて削除";

/** まとめて削除終了ボタンのラベル */
export const IMAGE_LIBRARY_BULK_DELETE_END = "まとめて削除を終わる";

/** モバイル用 ギャラリーボタンのラベル */
export const IMAGE_LIBRARY_GALLERY = "ギャラリー";

/** モバイル用 ギャラリーボタンの短縮ラベル */
export const IMAGE_LIBRARY_GALLERY_SHORT = "画像";

/** 貼り付けボタンのラベル */
export const IMAGE_LIBRARY_PASTE = "貼り付け";

/** モバイル用 貼り付けボタンの短縮ラベル */
export const IMAGE_LIBRARY_PASTE_SHORT = "貼付";

/** モバイル用 カメラボタンの短縮ラベル */
export const IMAGE_LIBRARY_CAMERA_SHORT = "撮影";

/** 貼り付け成功メッセージ */
export const IMAGE_LIBRARY_PASTE_SUCCESS = "画像を貼り付けました";

/** クリップボードに画像がないメッセージ */
export const IMAGE_LIBRARY_NO_IMAGE_IN_CLIPBOARD =
  "クリップボードに画像がありません";

/** クリップボード貼り付け失敗メッセージ（権限拒否やAPI未対応など） */
export const IMAGE_LIBRARY_PASTE_FAILED =
  "クリップボードからの画像の読み取りに失敗しました";

/** クリップボードアクセス権限エラーメッセージ */
export const IMAGE_LIBRARY_CLIPBOARD_NOT_ALLOWED =
  "クリップボードへのアクセスが許可されていません";

/** カメラ撮影成功メッセージ */
export const IMAGE_LIBRARY_CAMERA_SUCCESS = "写真を保存しました";

/** 動画ファイル非対応メッセージ */
export const IMAGE_LIBRARY_VIDEO_NOT_SUPPORTED = "動画ファイルは保存できません";

/** 選択した画像を削除ボタンのラベル */
export const IMAGE_LIBRARY_DELETE_SELECTED = "選択した画像を削除";

// 画像削除ダイアログ関連
/** 単一画像削除ダイアログのタイトル */
export const IMAGE_DELETE_TITLE = "画像を削除";

/** 単一画像削除ダイアログの説明 */
export const IMAGE_DELETE_DESCRIPTION =
  "この画像をライブラリから削除しますか？この操作は取り消せません。";

/** 選択画像削除ダイアログのタイトル */
export const IMAGE_DELETE_SELECTED_TITLE = "選択した画像を削除";

/** 表示中画像削除ダイアログのタイトル */
export const IMAGE_DELETE_DISPLAYED_TITLE = "表示中の画像を削除";

/** 全画像削除ダイアログのタイトル */
export const IMAGE_DELETE_ALL_TITLE = "全ての画像を削除";

// 動的メッセージ生成関数

/**
 * 画像削除成功メッセージを生成
 *
 * @param count - 削除した画像数
 * @returns トースト用メッセージ
 */
export function createImageDeleteSuccessMessage(count: number): string {
  return `${String(count)}件の画像を削除しました`;
}

/**
 * 表示中画像削除成功メッセージを生成
 *
 * @param count - 削除した画像数
 * @param isFiltered - フィルター適用中かどうか
 * @returns トースト用メッセージ
 */
export function createDisplayedImagesDeleteMessage(
  count: number,
  isFiltered: boolean
): string {
  return isFiltered
    ? `表示中の画像（${String(count)}件）を削除しました`
    : `全ての画像（${String(count)}件）を削除しました`;
}

/**
 * 削除ボタンのラベルを生成
 *
 * @param count - 画像数
 * @param isFiltered - フィルター適用中かどうか
 * @returns ボタンラベル
 */
export function createDeleteAllLabel(
  count: number,
  isFiltered: boolean
): string {
  return isFiltered
    ? `表示中の画像を削除（${String(count)}件）`
    : `全ての画像を削除（${String(count)}件）`;
}

/**
 * 削除ダイアログのタイトルを生成
 *
 * @param isFiltered - フィルター適用中かどうか
 * @returns ダイアログタイトル
 */
export function createDeleteAllDialogTitle(isFiltered: boolean): string {
  return isFiltered ? IMAGE_DELETE_DISPLAYED_TITLE : IMAGE_DELETE_ALL_TITLE;
}

/**
 * 削除ダイアログの説明を生成
 *
 * @param count - 画像数
 * @param isFiltered - フィルター適用中かどうか
 * @returns ダイアログ説明文
 */
export function createDeleteAllDialogDescription(
  count: number,
  isFiltered: boolean
): string {
  return isFiltered
    ? `フィルター中の${String(count)}件の画像を削除しますか？この操作は取り消せません。`
    : `ライブラリ内の全ての画像（${String(count)}件）を削除しますか？この操作は取り消せません。`;
}

/**
 * 選択画像削除ダイアログの説明を生成
 *
 * @param count - 選択画像数
 * @returns ダイアログ説明文
 */
export function createSelectedImagesDeleteDescription(count: number): string {
  return `選択した${String(count)}件の画像をライブラリから削除しますか？この操作は取り消せません。`;
}

/**
 * 選択画像削除ボタンのラベルを生成
 *
 * @param count - 選択画像数
 * @returns ボタンラベル（件数付き）
 */
export function createSelectedImagesDeleteLabel(count: number): string {
  return count > 0
    ? `${IMAGE_LIBRARY_DELETE_SELECTED}（${String(count)}件）`
    : IMAGE_LIBRARY_DELETE_SELECTED;
}

// セキュリティ免責モーダル関連
/** モーダルタイトル */
export const SECURITY_DISCLAIMER_TITLE = "ご利用前の確認事項";

/** セキュリティについての見出し */
export const SECURITY_DISCLAIMER_SECURITY_TITLE = "セキュリティについて";

/** セキュリティについての説明 */
export const SECURITY_DISCLAIMER_SECURITY_DESCRIPTION =
  "本アプリは外部サーバーへの通信をブロックしており、データは全てお使いの端末内にのみ保存されます。しかし、予期せぬ状況において完全な情報保護を保証するものではありません。";

/** 端末・ブラウザの安全性の見出し */
export const SECURITY_DISCLAIMER_DEVICE_TITLE = "端末・ブラウザの安全性";

/** 端末・ブラウザの安全性の説明 */
export const SECURITY_DISCLAIMER_DEVICE_DESCRIPTION =
  "お使いの端末やブラウザがマルウェア等に侵害されている場合、入力された情報を保護できません。";

/** 要配慮個人情報の入力禁止の見出し */
export const SECURITY_DISCLAIMER_PRIVACY_TITLE = "要配慮個人情報の入力禁止";

/** 要配慮個人情報の入力禁止の説明 */
export const SECURITY_DISCLAIMER_PRIVACY_DESCRIPTION =
  "患者様の顔写真、氏名、病歴等の要配慮個人情報の入力は禁止されています。禁止事項に違反した場合の責任は利用者に帰属します。";

/** シークレットモードの推奨の見出し */
export const SECURITY_DISCLAIMER_INCOGNITO_TITLE = "シークレットモードの推奨";

/** シークレットモードの推奨の説明 */
export const SECURITY_DISCLAIMER_INCOGNITO_DESCRIPTION =
  "より安全にご利用いただくため、ブラウザのシークレットモード（プライベートブラウズ）のご利用を推奨します。※終了時にデータが自動削除されます";

/** 利用規約リンクテキスト */
export const SECURITY_DISCLAIMER_TERMS_LINK =
  "詳しくは利用規約をご確認ください";

/** 同意ボタンのラベル */
export const SECURITY_DISCLAIMER_AGREE_BUTTON = "同意して進む";

/** 確認チェックボックスのラベル */
export const SECURITY_DISCLAIMER_CHECKBOX_LABEL = "上記の内容を確認しました";

/** スクロール案内テキスト */
export const SECURITY_DISCLAIMER_SCROLL_HINT =
  "▼ 全て表示されない場合は下にスクロールしてください";

// グリッド選択関連
/** グリッド選択ボタンのラベル */
export const GRID_SELECT_BUTTON_LABEL = "グリッド選択";

/** グリッド選択モーダルのタイトル */
export const GRID_SELECT_MODAL_TITLE = "グリッド選択";

/** グリッド選択モーダルの説明 */
export const GRID_SELECT_MODAL_DESCRIPTION =
  "カードの表示列数を選択してください";

// 画像アップロード関連
/** 画像アップロード時の警告メッセージ */
export const IMAGE_UPLOAD_WARNING = "患者様の画像は使用禁止";

// プロパティパネル関連
/** プロパティパネルの個人情報入力禁止警告メッセージ */
export const PROPERTY_PANEL_WARNING = "氏名・個人情報の入力は禁止";

// CTAボタンラベル関連
/** 指導箋作成ボタンのラベル（初回ユーザー向け） */
export const CTA_BUTTON_LABEL_CREATE = "指導箋を作成";

/** 続きから再開ボタンのラベル（リピーター向け） */
export const CTA_BUTTON_LABEL_RESUME = "続きから再開";

/** 使ってみるボタンのラベル（初回ユーザー向け） */
export const CTA_BUTTON_LABEL_TRY = "使ってみる";
