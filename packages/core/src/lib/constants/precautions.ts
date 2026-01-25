/**
 * 注意点の定型文（スニペット）定数
 *
 * リハビリテーション指導でよく使われる注意点の定型文を管理。
 * カテゴリ別に分類され、PropertyPanelの定型文選択ダイアログで使用される。
 */

/**
 * 定型文カテゴリの識別子
 */
export type PrecautionSnippetCategoryId = "breathing" | "safety" | "technique";

/**
 * 定型文カテゴリの定義
 */
export type PrecautionSnippetCategory = {
  /** カテゴリID */
  id: PrecautionSnippetCategoryId;
  /** 表示ラベル */
  label: string;
};

/**
 * 定型文の定義
 */
export type PrecautionSnippet = {
  /** 所属カテゴリのID */
  category: PrecautionSnippetCategoryId;
  /** 定型文の内容 */
  value: string;
};

/**
 * 定型文カテゴリ一覧
 *
 * 表示順序はこの配列の順番に従う
 */
export const PRECAUTION_SNIPPET_CATEGORIES: readonly PrecautionSnippetCategory[] =
  [
    { id: "breathing", label: "呼吸・姿勢" },
    { id: "safety", label: "痛み・安全管理" },
    { id: "technique", label: "動作のコツ" },
  ] as const;

/**
 * 定型文一覧
 *
 * リハビリテーション指導でよく使われる注意点のプリセット
 */
export const PRECAUTION_SNIPPETS: readonly PrecautionSnippet[] = [
  // 呼吸・姿勢
  { category: "breathing", value: "ゆっくり呼吸する" },
  { category: "breathing", value: "お腹に力を入れる" },
  { category: "breathing", value: "背筋をまっすぐにする" },
  { category: "breathing", value: "腰を反らさない" },
  { category: "breathing", value: "腰を曲げない" },
  // 痛み・安全管理
  { category: "safety", value: "痛みが出たら中止" },
  { category: "safety", value: "違和感があれば中止" },
  { category: "safety", value: "痛くない範囲で動かす" },
  { category: "safety", value: "無理をしない" },
  { category: "safety", value: "めまいがしたら休む" },
  // 動作のコツ
  { category: "technique", value: "反動をつけずに、ゆっくり動かす" },
  { category: "technique", value: "最初は小さく、徐々に大きく" },
  { category: "technique", value: "左右交互に行う" },
  { category: "technique", value: "片方が終われば反対側も行う" },
  { category: "technique", value: "力を入れたまま〇秒キープ" },
] as const;

/** 定型文選択ダイアログのタイトル */
export const SNIPPET_DIALOG_TITLE = "定型文を選択";

/** 定型文選択ダイアログの説明 */
export const SNIPPET_DIALOG_DESCRIPTION = "追加したい注意点を選択してください";

/** 定型文追加ボタンのラベル */
export const SNIPPET_ADD_BUTTON_LABEL = "選択した項目を追加";

/** 定型文ボタンのラベル */
export const SNIPPET_BUTTON_LABEL = "定型文";

/** 最大件数超過時のメッセージ */
export const SNIPPET_MAX_EXCEEDED_MESSAGE = "注意点の最大登録数に達しています";
