import type { ChangelogEntry } from "@rehab-grid/core/types";

/**
 * v1.3.3 Web 版 PWA キャッシュ更新の修正とアップデート通知 UI 追加
 */
export const entryV133: ChangelogEntry = {
  version: "v1.3.3",
  date: "2026-11-26",
  title: "Web 版のアップデート通知とキャッシュ更新の改善",
  categories: {
    features: [
      "Web 版で新しいバージョンが公開されたときに画面右下に通知を表示し、「更新する」ボタンから編集中の内容を保存したまま最新版へ切り替えられるようにしました",
    ],
    fixes: [
      "Web 版でアプリ更新後もブラウザのキャッシュに古いフォントやファイルが残り、再読み込みしても最新版の修正が反映されない問題を修正しました",
    ],
  },
};
