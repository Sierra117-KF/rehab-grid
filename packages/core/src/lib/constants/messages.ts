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
export const IMPORT_CONFIRM_TITLE = "指導箋を開きますか？";

/** 上書き確認ダイアログの説明 */
export const IMPORT_CONFIRM_DESCRIPTION =
  "新しい指導箋として開くと、現在の指導箋はそのまま「マイ指導箋」に残ります。上書きすると現在の指導箋の内容は失われます。";

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
  "このカードを削除してもよろしいですか？";

// 編集履歴（Undo / Redo）関連メッセージ
/** 元に戻すボタンのラベル */
export const UNDO_LABEL = "元に戻す";

/** やり直すボタンのラベル */
export const REDO_LABEL = "やり直す";

/** 元に戻すボタンのツールチップ */
export const UNDO_TOOLTIP = "元に戻す（Ctrl+Z）";

/** やり直すボタンのツールチップ */
export const REDO_TOOLTIP = "やり直す（Ctrl+Shift+Z）";

/** トーストの「元に戻す」を押したが、その後に別の操作が行われていた場合の案内 */
export const UNDO_STALE_MESSAGE =
  "他の操作が行われたため、ヘッダーの［元に戻す］を使ってください";

// カード複製・一括適用関連メッセージ
/** カード複製ボタンのラベル */
export const DUPLICATE_BUTTON_LABEL = "このカードを複製";

/** カード上の複製ボタンのツールチップ */
export const DUPLICATE_TOOLTIP = "カードを複製";

/** 全カードに反映ボタンのラベル */
export const APPLY_TO_ALL_LABEL = "全カードに反映";

/**
 * 用量の全カード反映ボタンのツールチップ（兼 aria-label）を生成
 *
 * @param labels - 現在の用量ラベル（省略時はデフォルトの回数・セット・頻度）
 * @returns 表示用文言
 */
export function createApplyDosagesToAllTooltip(
  labels: { reps: string; sets: string; frequency: string } = {
    reps: "回数",
    sets: "セット",
    frequency: "頻度",
  }
): string {
  return `このカードの${labels.reps}・${labels.sets}・${labels.frequency}を全カードに反映`;
}

/** 用量の全カード反映ボタンのデフォルトツールチップ */
export const APPLY_DOSAGES_TO_ALL_TOOLTIP = createApplyDosagesToAllTooltip();

/** 注意点の全カード反映ボタンのツールチップ */
export const APPLY_PRECAUTIONS_TO_ALL_TOOLTIP =
  "このカードの注意点を全カードに追加";

/** 一括適用で値が変わるカードがなかった場合のメッセージ */
export const APPLY_TO_ALL_NO_TARGET_MESSAGE = "反映するカードがありません";

/** 注意点の一括適用で、他の全カードが上限に達しているため追加できなかった場合のメッセージ */
export const APPLY_PRECAUTIONS_ALL_AT_LIMIT_MESSAGE =
  "他のカードは注意点が上限に達しているため追加できませんでした";

/**
 * 一括適用が完了したときのメッセージを生成
 *
 * @param updatedCount - 値が変わったカードの枚数
 * @param skippedCount - 上限を超えたため追加しなかった注意点の件数
 * @returns 表示用メッセージ
 */
export function createApplyToAllSuccessMessage(
  updatedCount: number,
  skippedCount = 0
): string {
  const base = `${String(updatedCount)}枚のカードに反映しました`;
  return skippedCount > 0
    ? `${base}（上限を超える${String(skippedCount)}件は追加していません）`
    : base;
}

// 画像編集関連メッセージ
/** 左右反転ボタンのラベル（プロパティパネル） */
export const IMAGE_FLIP_BUTTON_LABEL = "左右反転";

/** カード上の左右反転ボタンのツールチップ */
export const IMAGE_FLIP_TOOLTIP = "画像を左右反転";

/** 画像編集ボタンのラベル（モーダルのタイトルも兼ねる） */
export const IMAGE_EDIT_LABEL = "画像を編集";

/** 画像編集モーダルの説明 */
export const IMAGE_EDIT_DESCRIPTION =
  "編集した画像は新しい画像として保存されます。元の画像はライブラリに残ります";

/** 画像編集モーダルの「向き」セクションの見出し */
export const IMAGE_EDIT_ORIENTATION_HEADING = "向き";

/** 全体を左右反転するボタンのラベル */
export const IMAGE_EDIT_FLIP_WHOLE_LABEL = "全体を左右反転";

/** 左半分と右半分をそれぞれ左右反転するボタンのラベル */
export const IMAGE_EDIT_FLIP_PANELS_LABEL = "2コマずつ左右反転";

/** 2コマずつ左右反転の説明 */
export const IMAGE_EDIT_FLIP_PANELS_HINT =
  "左右2コマの画像は、コマの順番を変えずに向きだけ反転します";

/** 90°回転ボタンのラベル */
export const IMAGE_EDIT_ROTATE_LABEL = "右に90°回転";

/** 画像編集モーダルの「トリミング」セクションの見出し */
export const IMAGE_EDIT_CROP_HEADING = "トリミング（横5:縦3）";

/** トリミングの有無を切り替えるチェックボックスのラベル */
export const IMAGE_EDIT_CROP_TOGGLE_LABEL = "トリミングする";

/** トリミングの拡大率スライダーのラベル */
export const IMAGE_EDIT_ZOOM_LABEL = "拡大";

/** トリミング位置の調整方法の案内 */
export const IMAGE_EDIT_CROP_HINT =
  "注釈ツールを選んでいないときは、画像をドラッグして位置を調整できます";

/** 画像編集モーダルの「注釈」セクションの見出し */
export const IMAGE_EDIT_ANNOTATION_HEADING = "注釈";

/** 注釈の描き方の案内 */
export const IMAGE_EDIT_ANNOTATION_HINT =
  "ツールを選んで画像上をドラッグすると描けます";

/** 注釈ツール（矢印）のラベル */
export const ANNOTATION_TOOL_ARROW_LABEL = "矢印";

/** 注釈ツール（丸）のラベル */
export const ANNOTATION_TOOL_CIRCLE_LABEL = "丸";

/** 注釈ツール（四角）のラベル */
export const ANNOTATION_TOOL_RECT_LABEL = "四角";

/** 注釈の色の選択欄のラベル */
export const ANNOTATION_COLOR_LABEL = "色";

/** 注釈の線の太さの選択欄のラベル */
export const ANNOTATION_STROKE_LABEL = "太さ";

/** 注釈を 1 つ取り消すボタンのラベル */
export const ANNOTATION_UNDO_LABEL = "1つ戻す";

/** 注釈をすべて消すボタンのラベル */
export const ANNOTATION_CLEAR_LABEL = "全消去";

/** 画像編集の保存ボタンのラベル */
export const IMAGE_EDIT_SAVE_LABEL = "保存してカードに反映";

/** 画像編集の保存中ラベル */
export const IMAGE_EDIT_SAVING_LABEL = "保存中...";

/** 画像の読み込みに失敗したときのメッセージ */
export const IMAGE_EDIT_LOAD_FAILED_MESSAGE = "画像を読み込めませんでした";

/** 画像の編集・保存に失敗したときのメッセージ */
export const IMAGE_EDIT_FAILED_MESSAGE = "画像の編集に失敗しました";

/** 処理中にカードの画像が差し替えられたため、編集結果を反映しなかったときのメッセージ */
export const IMAGE_EDIT_STALE_MESSAGE =
  "処理中にカードの画像が変更されたため、編集結果は反映していません（編集した画像はライブラリに保存されています）";

// プロジェクト削除関連メッセージ
/** プロジェクト削除ボタンのツールチップ */
export const PROJECT_DELETE_TOOLTIP = "現在の指導箋を削除";

/** プロジェクト削除確認ダイアログのタイトル */
export const PROJECT_DELETE_CONFIRM_TITLE = "指導箋を削除";

/** プロジェクト削除確認ダイアログの説明 */
export const PROJECT_DELETE_CONFIRM_DESCRIPTION =
  "現在表示されている指導箋を削除します。この操作は元に戻せません。保存する場合は事前にバックアップをダウンロードしてください。";

/** プロジェクト削除成功メッセージ */
export const PROJECT_DELETE_SUCCESS_MESSAGE = "指導箋を削除しました";

/**
 * 指導箋一覧で削除するときの確認ダイアログの説明を生成
 *
 * @param title - 削除する指導箋のタイトル
 * @returns ダイアログ説明文
 */
export function createProjectDeleteConfirmDescription(title: string): string {
  return `「${title}」を削除します。この操作は元に戻せません。保存する場合は事前に開いてバックアップをダウンロードしてください。`;
}

// 指導箋一覧（複数プロジェクト保存）関連メッセージ
/** 指導箋一覧を開くボタンのラベル・一覧のタイトル */
export const PROJECT_LIST_LABEL = "マイ指導箋";

/** 指導箋一覧を開くボタンのツールチップ */
export const PROJECT_LIST_TOOLTIP = "保存した指導箋の一覧（切り替え・新規作成・複製・削除）";

/** 指導箋一覧の説明 */
export const PROJECT_LIST_DESCRIPTION =
  "この端末に保存した指導箋を切り替え・複製・削除できます。";

/** 指導箋一覧の検索欄のラベル */
export const PROJECT_LIST_SEARCH_LABEL = "タイトルで検索";

/** 指導箋一覧の検索欄のプレースホルダー */
export const PROJECT_LIST_SEARCH_PLACEHOLDER = "タイトルで検索（例: 腰痛）";

/** 新しい指導箋を作るボタンのラベル */
export const PROJECT_LIST_NEW_LABEL = "新しい指導箋";

/** 検索に一致する指導箋がないときのメッセージ */
export const PROJECT_LIST_NO_MATCHES = "該当する指導箋がありません";

/** 編集中の指導箋に付けるバッジ */
export const PROJECT_LIST_CURRENT_BADGE = "編集中";

/** 指導箋一覧の複製ボタンのラベル */
export const PROJECT_LIST_DUPLICATE_LABEL = "複製";

/** 指導箋一覧の削除ボタンのラベル */
export const PROJECT_LIST_DELETE_LABEL = "削除";

/** 指導箋一覧に置くバックアップの案内 */
export const PROJECT_LIST_BACKUP_NOTICE =
  "指導箋はこのブラウザの中にだけ保存されます。ブラウザのデータ削除などで消えることがあるため、大切な指導箋は「バックアップ」から画像付き（ZIP）で保存してください。";

/** 新しい指導箋を作ったときのメッセージ */
export const PROJECT_CREATE_SUCCESS_MESSAGE = "新しい指導箋を作成しました";

/** 指導箋を複製したときのメッセージ */
export const PROJECT_DUPLICATE_SUCCESS_MESSAGE = "指導箋を複製しました";

/** 指導箋を切り替えられなかったときのメッセージ */
export const PROJECT_SWITCH_FAILED_MESSAGE = "指導箋を開けませんでした";

/** 複製した指導箋のタイトルに付ける文字列 */
export const PROJECT_COPY_SUFFIX = "のコピー";

/** 新しい指導箋として開くボタンのラベル（インポート・テンプレート適用） */
export const OPEN_AS_NEW_PROJECT_LABEL = "新しい指導箋で開く";

/** 現在の指導箋に上書きするボタンのラベル（インポート・テンプレート適用） */
export const OVERWRITE_CURRENT_PROJECT_LABEL = "現在の指導箋に上書き";

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

/** 画像検索欄のラベル（aria-label） */
export const IMAGE_LIBRARY_SEARCH_LABEL = "画像を検索";

/** 画像検索欄のプレースホルダー */
export const IMAGE_LIBRARY_SEARCH_PLACEHOLDER = "運動名で検索";

/** 画像検索のクリアボタンのラベル */
export const IMAGE_LIBRARY_SEARCH_CLEAR = "検索をクリア";

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

/** 他の指導箋でも使われている画像を削除するときの警告 */
export const IMAGE_USED_IN_OTHER_PROJECTS_WARNING =
  "この画像は他の指導箋（またはマイテンプレート・マイ運動）でも使われています。削除すると、それらのカードは画像なしになります。";

/**
 * 他の指導箋でも使われている画像をまとめて削除するときの警告を生成
 *
 * @param count - 他の指導箋でも使われている画像の数
 * @returns 警告文
 */
export function createImagesUsedInOtherProjectsWarning(count: number): string {
  return `うち${String(count)}件の画像は他の指導箋（またはマイテンプレート・マイ運動）でも使われています。削除すると、それらのカードは画像なしになります。`;
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

// デザイン設定関連
/** デザイン設定ボタンのラベル（ダイアログのタイトルも兼ねる） */
export const DESIGN_SETTINGS_LABEL = "デザイン設定";

/** デザイン設定ダイアログの説明 */
export const DESIGN_SETTINGS_DESCRIPTION =
  "指導箋の見た目と印刷の設定を変更できます。変更はすぐに反映されます";

/** デザイン設定ダイアログの列数セクションの見出し */
export const DESIGN_SETTINGS_LAYOUT_HEADING = "列数";

/** デザイン設定ダイアログの用紙の向きセクションの見出し */
export const DESIGN_SETTINGS_ORIENTATION_HEADING = "用紙の向き（PDF）";

/** 用紙の向き「自動」の説明 */
export const PAGE_ORIENTATION_AUTO_HINT = "自動：1〜2列は縦、3〜4列は横";

/** 1列のときに横向きを選べない理由 */
export const PAGE_ORIENTATION_SINGLE_COLUMN_NOTE =
  "1列は縦向き固定です（横向きでは1枚のカードがページに収まりません）";

/** 4列を縦向きにしたときの注意 */
export const PAGE_ORIENTATION_NARROW_NOTE =
  "4列を縦向きにするとカードが細くなり、回数などの数値が窮屈になります";

/** デザイン設定ダイアログの用途別プリセットセクションの見出し */
export const DESIGN_SETTINGS_PRESET_HEADING = "用途別プリセット";

/** 用途別プリセットの説明（どの設定が変わるか） */
export const DESIGN_SETTINGS_PRESET_DESCRIPTION =
  "よく使う組み合わせをまとめて設定します（列数・色・用量のラベルは変わりません）";

/** デザイン設定ダイアログの印刷の色セクションの見出し */
export const DESIGN_SETTINGS_PRINT_COLOR_HEADING = "印刷の色";

/** 白黒・インク節約モードの説明 */
export const PRINT_COLOR_MONOCHROME_HINT =
  "白黒：注意点の塗りつぶしをなくし、白黒コピーでも読みやすくします（画像はカラーのまま）";

/** デザイン設定ダイアログの文字サイズセクションの見出し */
export const DESIGN_SETTINGS_TEXT_SCALE_HEADING = "文字サイズ";

/** 1列のときに文字サイズが変わらない理由 */
export const TEXT_SCALE_SINGLE_COLUMN_NOTE =
  "1列は常に大きめの文字で表示されます";

/** デザイン設定ダイアログのカード番号セクションの見出し */
export const DESIGN_SETTINGS_CARD_NUMBER_HEADING = "カード番号";

/** カード番号の表示切り替えのラベル */
export const CARD_NUMBER_TOGGLE_LABEL = "運動名の左に番号（①②…）を表示する";

/** デザイン設定ダイアログの用量ラベルセクションの見出し */
export const DESIGN_SETTINGS_DOSAGE_LABEL_HEADING = "用量のラベル";

/** 用量ラベルの説明 */
export const DOSAGE_LABEL_DESCRIPTION =
  "「回数」「セット」「頻度」の欄の名前を変えられます（6文字まで。空欄にすると元に戻ります）";

/**
 * 用量ラベルの入力欄のラベルを作る
 *
 * @param defaultLabel - その欄のデフォルトのラベル（例: 「回数」）
 * @returns 入力欄のラベル（例: 「回数」の欄）
 */
export const createDosageLabelInputLabel = (defaultLabel: string): string =>
  `「${defaultLabel}」の欄`;

/** デザイン設定ダイアログのヘッダー・チェック表セクションの見出し */
export const DESIGN_SETTINGS_SHEET_HEADING = "ヘッダー・チェック表（PDF）";

/** ヘッダー・チェック表セクションの説明 */
export const DESIGN_SETTINGS_SHEET_DESCRIPTION =
  "PDF の1ページ目の先頭に出す項目と、自主トレ実施チェック表を設定します（キャンバスには表示されません）";

/** 氏名欄の表示切り替えのラベル */
export const PATIENT_NAME_BOX_TOGGLE_LABEL =
  "氏名欄（印刷後に手書きする空欄）を表示する";

/** ヘッダーの日付欄の見出し */
export const SHEET_DATE_MODE_LABEL = "日付";

/** 病院・施設名の入力欄のラベル */
export const SHEET_FACILITY_NAME_LABEL = "病院・施設名";

/** 担当者名の入力欄のラベル */
export const SHEET_THERAPIST_NAME_LABEL = "担当者名";

/** 全体メモの入力欄のラベル */
export const SHEET_OVERALL_NOTE_LABEL = "全体メモ";

/** 全体メモのプレースホルダー（病名などを書きたくなりやすいため、書かない内容も示す） */
export const SHEET_OVERALL_NOTE_PLACEHOLDER =
  "目標・次回来院日など（病名・個人情報は書かない）";

/** 実施チェック表の見出し */
export const CHECK_TABLE_LABEL = "自主トレ実施チェック表";

/** 実施チェック表の出力先の説明 */
export const CHECK_TABLE_DESCRIPTION =
  "1週間：カードの後ろに追加／1か月：A4横の別ページに追加（月と日付は手書き）";

/** キャンバス上部のヘッダー・チェック表の要約の見出し */
export const SHEET_SUMMARY_LABEL = "PDFのみ";

/** 要約：ヘッダー */
export const SHEET_SUMMARY_HEADER_LABEL = "ヘッダー";

/** 要約：チェック表 */
export const SHEET_SUMMARY_CHECK_TABLE_LABEL = "チェック表";

/** 要約：ヘッダーにタイトルしか出さないとき */
export const SHEET_SUMMARY_TITLE_ONLY = "タイトルのみ";

/** 要約：氏名欄 */
export const SHEET_SUMMARY_PATIENT_NAME_BOX = "氏名欄";

/** 要約：日付の記入欄 */
export const SHEET_SUMMARY_DATE_BLANK = "日付欄";

/** 要約：出力日の印字 */
export const SHEET_SUMMARY_DATE_PRINTED = "出力日";

/** 要約：全体メモ */
export const SHEET_SUMMARY_OVERALL_NOTE = "メモ";

/** 要約ボタンの説明（クリックで設定を開く） */
export const SHEET_SUMMARY_BUTTON_LABEL =
  "PDFのヘッダー・チェック表の設定を開く";

/**
 * キャンバス上部の A4 ページ数の目安
 *
 * @param pageCount - 見積もったページ数
 * @returns 「目安: A4 2ページ」形式の文言
 */
export function createPageEstimateLabel(pageCount: number): string {
  return `目安: A4 ${String(pageCount)}ページ`;
}

/**
 * 2 ページ目に送られるカードの案内
 *
 * @param cardNumber - 2 ページ目の先頭になるカードの番号（1 始まり）
 * @returns 「7枚目から2ページ目」形式の文言
 */
export function createPageEstimateCardDetail(cardNumber: number): string {
  return `${String(cardNumber)}枚目から2ページ目`;
}

/**
 * カードは 1 ページに収まり、実施チェック表だけが次のページになるときの案内
 *
 * @param page - チェック表のページ（1 始まり）
 * @returns 「チェック表は2ページ目」形式の文言
 */
export function createPageEstimateCheckTableDetail(page: number): string {
  return `チェック表は${String(page)}ページ目`;
}

/** ページ数の目安の説明（見積もりであること） */
export const PAGE_ESTIMATE_DESCRIPTION =
  "文字数と設定から見積もった目安です。仕上がりはPDFプレビューで確認してください";

/**
 * キャンバスのカードの間に出す改ページの目安の文言
 *
 * @param page - ここから始まるページ（1 始まり）
 * @returns 「ここから2ページ目（目安）」形式の文言
 */
export function createPageBreakLabel(page: number): string {
  return `ここから${String(page)}ページ目（目安）`;
}

/** 選択中のカードのタイトル・用量に出すインライン編集の案内 */
export const INLINE_EDIT_HINT = "ダブルクリックで編集";

/** インライン編集の入力欄の説明（Enter で確定、Esc で取り消し） */
export const INLINE_EDIT_INPUT_HINT = "Enterで確定、Escで取り消し";

/** カード上で運動名を編集する入力欄のラベル（プロパティパネルの「運動名」と区別する） */
export const INLINE_EDIT_TITLE_LABEL = "運動名（カード上で編集）";

/**
 * カード上で用量を編集する入力欄のラベル
 *
 * @param dosageLabel - 用量のラベル（「回数」など）
 * @returns 「回数（カード上で編集）」形式の文言
 */
export function createInlineDosageInputLabel(dosageLabel: string): string {
  return `${dosageLabel}（カード上で編集）`;
}

/** デザイン設定ダイアログのテーマカラーセクションの見出し */
export const DESIGN_SETTINGS_THEME_COLOR_HEADING = "テーマカラー";

/** テーマカラーの説明（どこに反映されるか） */
export const THEME_COLOR_DESCRIPTION =
  "運動カードの枠線・用量の区切り線・カード番号の色に使われます";

/** 白黒モード選択中にテーマカラーが反映されないことの案内 */
export const THEME_COLOR_MONOCHROME_NOTE =
  "印刷の色が「白黒」のときは反映されません";

/** テーマカラーのカラーピッカーのラベル */
export const THEME_COLOR_PICKER_LABEL = "色を選ぶ";

/** テーマカラーのカラーコード入力欄のラベル */
export const THEME_COLOR_HEX_LABEL = "カラーコード";

/** テーマカラーのカラーコードが不正なときの案内 */
export const THEME_COLOR_HEX_INVALID_MESSAGE =
  "#RRGGBB の形式（例: #3b82f6）で入力してください";

/** ダイアログの「閉じる」ボタンのラベル */
export const BUTTON_CLOSE = "閉じる";

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
