"use client";

import { EditorHeader } from "@rehab-grid/ui/components/editor/EditorHeader";

/**
 * Desktop版専用エディタヘッダーコンポーネント
 *
 * @remarks
 * Web版のEditorHeaderをラップするDesktop専用コンポーネント。
 * Desktop版ではアプリ名を非表示にし、ロゴアイコンのみを表示する。
 *
 * ナビゲーションリンク（利用規約、プライバシー、更新履歴）は
 * DesktopNavFooterに移動し、全ページで統一されたナビゲーションを提供。
 */
export function DesktopEditorHeader() {
  return <EditorHeader hideAppName />;
}
