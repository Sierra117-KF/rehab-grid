import { ChangelogPage } from "@rehab-grid/pages/changelog";
import type { Metadata } from "next";

/**
 * 更新履歴ページのメタデータ
 */
export const metadata: Metadata = {
  title: "更新履歴 | リハぐり",
  description:
    "リハぐりの更新履歴。新機能、改善点、バグ修正などの変更内容を確認できます。",
};

/**
 * 更新履歴ページ
 *
 * @rehab-grid/pages の ChangelogPage コンポーネントをラップして表示します。
 */
export default function Page() {
  return <ChangelogPage />;
}
