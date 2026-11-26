import type { ChangelogEntry } from "@rehab-grid/core/types";

/**
 * v1.3.1 用量表示の自動縮小対応
 */
export const entryV131: ChangelogEntry = {
  version: "v1.3.1",
  date: "2026-11-26",
  title: "用量表示の自動縮小対応",
  categories: {
    fixes: [
      "運動カードの回数・セット数・頻度などの項目やラベルに全角で長めの文字を入力した際、3〜4列レイアウトなどで2行以上に折り返して見た目が崩れる問題を修正（編集画面・PDFともに自動で文字を縮小して1行に収め、区切り線とラベルの縦位置を揃えるようにしました）",
    ],
  },
};
