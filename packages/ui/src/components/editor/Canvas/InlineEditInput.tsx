"use client";

/**
 * カード上のインライン編集の入力欄
 *
 * 確定までの値は入力欄のローカル state に持ち、Enter・フォーカスが外れたときに 1 回だけ確定する
 * （プロジェクト名の ProjectInfo と同じ方式。履歴は確定 1 回で 1 件になる）。
 */

import { INLINE_EDIT_INPUT_HINT } from "@rehab-grid/core/lib/constants";
import { cn } from "@rehab-grid/core/lib/utils";
import { useCallback, useRef, useState } from "react";

/**
 * InlineEditInput コンポーネントの Props
 */
type InlineEditInputProps = {
  /** 編集前の値 */
  value: string;
  /** 最大文字数 */
  maxLength: number;
  /** 入力欄のラベル（支援技術向け） */
  label: string;
  /** 入力欄の文字の見た目（カード上の表示と同じ文字サイズにする） */
  className?: string;
  /** 確定したとき（Enter・フォーカスが外れたとき）のハンドラ */
  onCommit: (value: string) => void;
  /** 取り消したとき（Esc）のハンドラ */
  onCancel: () => void;
};

/**
 * 伝播を止めるハンドラ
 *
 * カードのルート要素には dnd-kit の listeners（ポインター・キーでドラッグ開始）と選択用の onClick が付いている。
 * 入力欄内のドラッグ選択や Space / Enter の入力でカードが動いたり、選択が変わったりしないようにする。
 */
function stopPropagation(event: React.SyntheticEvent): void {
  event.stopPropagation();
}

/**
 * カード上のインライン編集の入力欄
 */
export function InlineEditInput({
  value,
  maxLength,
  label,
  className,
  onCommit,
  onCancel,
}: InlineEditInputProps) {
  const [draft, setDraft] = useState(value);
  // Enter で確定した直後に入力欄が消えて blur が起きても、二重に確定しないようにする
  const isFinishedRef = useRef(false);

  // 表示されたらすぐに入力できるよう、フォーカスして全選択する
  const focusOnMount = useCallback((element: HTMLInputElement | null) => {
    element?.focus();
    element?.select();
  }, []);

  const finish = (commit: boolean) => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    if (commit) {
      onCommit(draft);
    } else {
      onCancel();
    }
  };

  return (
    <input
      ref={focusOnMount}
      type="text"
      value={draft}
      maxLength={maxLength}
      aria-label={label}
      title={INLINE_EDIT_INPUT_HINT}
      className={cn(
        "w-full min-w-0 rounded-md border bg-background px-1 text-center text-foreground",
        "outline-none focus-visible:ring-2 focus-visible:ring-primary",
        className
      )}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        event.stopPropagation();
        // IME の変換中の Enter / Esc は変換の確定・取り消しに使う
        if (event.nativeEvent.isComposing) return;
        if (event.key === "Enter") {
          event.preventDefault();
          finish(true);
        } else if (event.key === "Escape") {
          event.preventDefault();
          finish(false);
        }
      }}
      onBlur={() => finish(true)}
      onPointerDown={stopPropagation}
      onClick={stopPropagation}
      onDoubleClick={stopPropagation}
    />
  );
}
