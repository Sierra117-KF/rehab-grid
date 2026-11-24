"use client";

/**
 * テーマカラー選択コンポーネント
 *
 * プリセットの色見本、カラーピッカー、カラーコード（#RRGGBB）入力欄でテーマカラーを選ぶ。
 * デザイン設定ダイアログの「テーマカラー」セクションとして使う。
 */

import {
  THEME_COLOR_HEX_INVALID_MESSAGE,
  THEME_COLOR_HEX_LABEL,
  THEME_COLOR_PATTERN,
  THEME_COLOR_PICKER_LABEL,
  THEME_COLOR_PRESETS,
} from "@rehab-grid/core/lib/constants";
import { cn } from "@rehab-grid/core/lib/utils";
import { Input } from "@rehab-grid/ui/components/wrapped/Input";
import { Check } from "lucide-react";
import { useId, useState } from "react";

/**
 * ThemeColorSelector コンポーネントの Props
 */
type ThemeColorSelectorProps = {
  /** 現在のテーマカラー（#RRGGBB） */
  value: string;
  /** テーマカラー変更ハンドラ（常に小文字の #rrggbb で呼ばれる） */
  onChange: (color: string) => void;
};

/**
 * テーマカラー選択コンポーネント
 *
 * @remarks
 * `<input type="color">` の値は常に小文字のため、カラーコード入力欄の値も小文字に揃えて渡す。
 * 入力途中の不正な値は反映せず、フォーカスが外れたら現在の色に戻す。
 */
export function ThemeColorSelector({ value, onChange }: ThemeColorSelectorProps) {
  const hexInputId = useId();
  const errorId = useId();
  const normalizedValue = value.toLowerCase();

  // 入力途中の値（不正な値も保持する）
  const [draft, setDraft] = useState(normalizedValue);
  // 外部（プリセット・ピッカー・Undo）で色が変わったら入力欄も追従させる。
  // useEffect ではなく、レンダー中に前回の値と比べて更新する
  const [prevValue, setPrevValue] = useState(normalizedValue);
  if (normalizedValue !== prevValue) {
    setPrevValue(normalizedValue);
    setDraft(normalizedValue);
  }

  const isDraftValid = THEME_COLOR_PATTERN.test(draft);

  /**
   * カラーコード入力欄の変更（正しい形式になった時点で反映する）
   */
  const handleHexChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value.trim();
    setDraft(next);
    if (THEME_COLOR_PATTERN.test(next)) {
      onChange(next.toLowerCase());
    }
  };

  /**
   * カラーコード入力欄からフォーカスが外れたとき、不正な値なら現在の色に戻す
   */
  const handleHexBlur = () => {
    if (!isDraftValid) setDraft(normalizedValue);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* プリセット */}
      <div className="flex flex-wrap gap-2">
        {THEME_COLOR_PRESETS.map((preset) => {
          const isSelected = preset.value === normalizedValue;
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => onChange(preset.value)}
              aria-pressed={isSelected}
              aria-label={preset.label}
              title={preset.label}
              className={cn(
                "flex size-9 items-center justify-center rounded-full border-2 transition-transform",
                "hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2",
                isSelected ? "border-foreground" : "border-transparent"
              )}
              style={{ backgroundColor: preset.value }}
            >
              {isSelected ? <Check className="size-4 text-white" /> : null}
            </button>
          );
        })}
      </div>

      {/* カスタム色（ピッカー + カラーコード） */}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={normalizedValue}
          onChange={(event) => onChange(event.target.value)}
          aria-label={THEME_COLOR_PICKER_LABEL}
          title={THEME_COLOR_PICKER_LABEL}
          className="h-9 w-12 cursor-pointer rounded-md border border-input bg-white p-1"
        />
        <label htmlFor={hexInputId} className="sr-only">
          {THEME_COLOR_HEX_LABEL}
        </label>
        <Input
          id={hexInputId}
          value={draft}
          onChange={handleHexChange}
          onBlur={handleHexBlur}
          maxLength={7}
          spellCheck={false}
          autoComplete="off"
          placeholder="#3b82f6"
          aria-invalid={!isDraftValid}
          aria-describedby={isDraftValid ? undefined : errorId}
          className="h-9 w-32 font-mono"
        />
      </div>
      {isDraftValid ? null : (
        <p id={errorId} className="text-xs text-destructive">
          {THEME_COLOR_HEX_INVALID_MESSAGE}
        </p>
      )}
    </div>
  );
}
