import { TermsPage } from "@rehab-grid/pages/terms";
import type { Metadata } from "next";

/**
 * 利用規約ページのメタデータ
 */
export const metadata: Metadata = {
  title: "利用規約 | リハぐり",
  description:
    "リハぐりの利用規約。サービスの利用条件、免責事項、禁止事項について説明します。",
};

/**
 * 利用規約ページ
 *
 * @rehab-grid/pages の TermsPage コンポーネントをラップして表示します。
 */
export default function Page() {
  return <TermsPage />;
}
