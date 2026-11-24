"use client";

/**
 * エディタのキーボードショートカットフック
 *
 * グローバル keydown イベントを監視し、Undo / Redo を実行する
 *
 * @remarks
 * useEffect の例外的使用（グローバルキー入力の購読というシステム制御）
 * CLAUDE.md の規約に従い、カスタムフックに隠蔽
 */

import { useEditorStore } from "@rehab-grid/core/lib/store/useEditorStore";
import { useEffect } from "react";

/**
 * ブラウザ標準のキー操作に任せる要素のセレクタ
 *
 * @remarks
 * 入力欄の中の Ctrl+Z はブラウザ標準の文字単位の取り消しにする。
 * ダイアログ内ではエディタ本体の状態を変えない。
 */
const NATIVE_KEY_HANDLING_SELECTOR = [
  "input",
  "textarea",
  "select",
  '[contenteditable]:not([contenteditable="false"])',
  '[role="dialog"]',
  '[role="alertdialog"]',
].join(",");

/**
 * キー入力からショートカットの種類を判定する
 *
 * @param event - キーボードイベント
 * @returns 実行する操作。ショートカットでなければ null
 */
function getShortcutAction(event: KeyboardEvent): "undo" | "redo" | null {
  if (event.altKey || !(event.ctrlKey || event.metaKey)) return null;

  // Shift 押下時は "Z" になるため小文字化する（event.code だと AZERTY 配列などでずれる）
  const key = event.key.toLowerCase();
  if (key === "z") return event.shiftKey ? "redo" : "undo";
  // Ctrl+Y は Windows の慣例（Mac の Cmd+Y は割り当てない）
  if (key === "y" && event.ctrlKey && !event.shiftKey) return "redo";
  return null;
}

/**
 * エディタのキーボードショートカットフック
 *
 * - `Ctrl/Cmd + Z`：元に戻す
 * - `Ctrl/Cmd + Shift + Z`、`Ctrl + Y`：やり直す
 *
 * IME 変換中、入力欄・ダイアログにフォーカスがあるときは何もしない。
 * 実行できる履歴があるときだけ `preventDefault()` する。
 *
 * @example
 * ```tsx
 * export function TrainingPage() {
 *   useEditorShortcuts();
 *   // ...
 * }
 * ```
 */
export function useEditorShortcuts(): void {
  /**
   * グローバル keydown イベントリスナーの登録
   *
   * @remarks
   * useEffect の例外使用理由:
   * - window へのイベントリスナーの登録/解除はライフサイクル管理が必要なシステム制御
   * - ストアの状態は発火時に getState() で読むため、依存配列は空でよい
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) return;

      const action = getShortcutAction(event);
      if (action === null) return;

      if (
        event.target instanceof Element &&
        event.target.closest(NATIVE_KEY_HANDLING_SELECTOR) !== null
      ) {
        return;
      }

      const state = useEditorStore.getState();
      const history = action === "undo" ? state.past : state.future;
      if (history.length === 0) return;

      event.preventDefault();
      state[action]();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
}
