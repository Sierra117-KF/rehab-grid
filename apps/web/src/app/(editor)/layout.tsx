import { EditorHeader } from "@rehab-grid/ui/components/editor/EditorHeader";

/**
 * エディタ共通レイアウト
 *
 * エディタページ（/training等）で共通して使用されるレイアウト。
 * コンパクトヘッダーと3カラムレイアウト用のコンテナを提供します。
 *
 * @param children - エディタページのコンテンツ
 * @returns エディタレイアウト
 */
export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <EditorHeader />
      <main className="relative flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
