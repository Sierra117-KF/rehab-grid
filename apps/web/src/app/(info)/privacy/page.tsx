import { PrivacyPage } from "@rehab-grid/pages/privacy";
import type { Metadata } from "next";

/**
 * プライバシーポリシーページのメタデータ
 */
export const metadata: Metadata = {
  title: "プライバシーポリシー | リハぐり",
  description:
    "リハぐりのプライバシーポリシー。完全ローカル動作により、データはサーバーに送信されません。",
};

/**
 * プライバシーポリシーページ
 *
 * @rehab-grid/pages の PrivacyPage コンポーネントをラップして表示します。
 */
export default function Page() {
  return <PrivacyPage />;
}
