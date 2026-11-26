import type { ChangelogEntry } from "@rehab-grid/core/types";

/**
 * v1.3.2 PDF 出力時の記号・漢字の文字化け修正
 */
export const entryV132: ChangelogEntry = {
  version: "v1.3.2",
  date: "2026-11-26",
  title: "PDF の文字化け修正（○・記号・医療漢字の拡充）",
  categories: {
    fixes: [
      "自主トレ実施チェック表を付けた PDF で「実施した日に○をつけましょう」の「○」が「Ë」と文字化けして隣の文字と重なる問題を修正しました",
      "PDF 用フォントに収録する記号・漢字を拡充し、公式テンプレートや定型文・指導箋本文で使われる「〇」「々」「×」「°」「〜」「嚥」「箋」などの記号・医療関連漢字も正しく出力されるようにしました",
    ],
  },
};
