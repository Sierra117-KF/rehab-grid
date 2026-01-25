"use client";

import {
  DEFAULT_PROJECT_TITLE,
  LABEL_PROJECT_TITLE,
  TEXT_LIMITS,
} from "@rehab-grid/core/lib/constants";
import { useEditorStore } from "@rehab-grid/core/lib/store/useEditorStore";
import { cn } from "@rehab-grid/core/lib/utils";
import { Input } from "@rehab-grid/ui/components/wrapped/Input";
import { Label } from "@rehab-grid/ui/components/wrapped/Label";
import { Pencil } from "lucide-react";
import { type KeyboardEvent, useCallback, useRef, useState } from "react";

/**
 * ProjectInfo のプロパティ
 */
type ProjectInfoProps = {
  /** 表示バリアント（デスクトップ/モバイル） */
  variant?: "desktop" | "mobile";
};

/**
 * プロジェクト情報表示コンポーネント
 *
 * プロジェクト名を表示し、クリック/タップで編集可能にします。
 * variant によりデスクトップ/モバイル向けのスタイルを切り替えます。
 */
export function ProjectInfo({ variant = "desktop" }: ProjectInfoProps) {
  const isMobile = variant === "mobile";
  const title = useEditorStore((state) => state.meta.title);
  const setProjectTitle = useEditorStore((state) => state.setProjectTitle);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  /** 編集モードを開始 */
  const handleStartEdit = useCallback(() => {
    setEditValue(title);
    setIsEditing(true);
    // 次のレンダリング後にフォーカスを当てる
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, [title]);

  /** 編集を確定 */
  const handleConfirm = useCallback(() => {
    setProjectTitle(editValue);
    setIsEditing(false);
  }, [editValue, setProjectTitle]);

  /** 編集をキャンセル */
  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditValue(title);
  }, [title]);

  /** キーボードイベントのハンドリング */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleConfirm();
      } else if (event.key === "Escape") {
        event.preventDefault();
        handleCancel();
      }
    },
    [handleConfirm, handleCancel]
  );

  if (isEditing) {
    return (
      <div
        className={cn("flex items-center gap-2", isMobile && "justify-center")}
      >
        {!isMobile && (
          <Label
            htmlFor="project-title-input"
            className="hidden desktop:inline text-sm font-medium"
          >
            {LABEL_PROJECT_TITLE}
          </Label>
        )}
        <Input
          id="project-title-input"
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleConfirm}
          onKeyDown={handleKeyDown}
          placeholder={DEFAULT_PROJECT_TITLE}
          maxLength={TEXT_LIMITS.projectTitle}
          variant="orange"
          className={cn(
            "text-sm font-medium",
            isMobile ? "h-8 w-48 text-center" : "h-7 w-32 desktop:w-48"
          )}
        />
      </div>
    );
  }

  // モバイル版：シンプルなタップ可能テキスト + 編集可能を示すPencilアイコン
  if (isMobile) {
    return (
      <button
        type="button"
        onClick={handleStartEdit}
        className={cn(
          "inline-flex items-end gap-0.5",
          "text-base font-semibold text-foreground",
          "rounded px-2 py-1 transition-colors",
          "hover:bg-accent/50 active:bg-accent",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
        title={title.trim() || DEFAULT_PROJECT_TITLE}
      >
        <span className="max-w-[200px] truncate">
          {title.trim() || DEFAULT_PROJECT_TITLE}
        </span>
        <span className="flex size-4 shrink-0 items-center justify-center rounded-full border border-muted-foreground/50">
          <Pencil
            className="size-2.5 text-muted-foreground"
            aria-hidden="true"
          />
        </span>
      </button>
    );
  }

  // デスクトップ版：ラベル付きボタン
  return (
    <span className="flex items-center gap-2">
      <span className="hidden desktop:inline text-sm font-medium text-muted-foreground">
        {LABEL_PROJECT_TITLE}
      </span>
      <button
        type="button"
        onClick={handleStartEdit}
        className={cn(
          "text-left text-sm font-medium text-foreground",
          "rounded px-2 py-1 transition-colors",
          "project-title-button", // globals.cssで定義されたカスタムクラス
          "bg-white",
          // モバイル: 固定幅でテキスト切り詰め
          "w-32 truncate",
          // デスクトップ: 幅を広げ、CSSで切り詰め
          "desktop:w-auto desktop:min-w-[120px] desktop:max-w-[200px]",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
        title={title.trim() || DEFAULT_PROJECT_TITLE}
      >
        {title.trim() || DEFAULT_PROJECT_TITLE}
      </button>
    </span>
  );
}
