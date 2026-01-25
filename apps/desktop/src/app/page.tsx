"use client";

import { TrainingPage } from "@rehab-grid/pages/training";

import { DesktopEditorHeader } from "@/components/DesktopEditorHeader";

/**
 * Desktop版エディタページ（ルートページ）
 *
 * @remarks
 * Desktop版ではアプリ起動時に直接エディタを表示する。
 * Web版とは異なり、ランディングページは存在せず、
 * `/` がエディタとして機能する。
 *
 * 初回起動時（またはセッション期限切れ時）には
 * セキュリティ免責モーダルを自動表示し、
 * ユーザーの同意を求める。
 */
export default function DesktopEditorPage() {
  return (
    <div className="flex h-full flex-col bg-background">
      <DesktopEditorHeader />
      <main className="relative flex-1 overflow-hidden">
        <TrainingPage />
      </main>
    </div>
  );
}
