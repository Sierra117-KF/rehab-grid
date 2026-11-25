"use client";

/**
 * 選択肢ボタングループコンポーネント
 *
 * 用紙の向き・印刷の色・文字サイズなど、少数の選択肢から 1 つを選ぶ設定に使う。
 * 選んだ値は即座に反映する（デザイン設定ダイアログ用）。
 */

import { cn } from "@rehab-grid/core/lib/utils";

/**
 * 選択肢 1 件
 */
type Option<T extends string> = {
  /** 値 */
  value: T;
  /** 表示ラベル */
  label: string;
  /** 選べないかどうか */
  disabled?: boolean;
};

/**
 * OptionButtonGroup コンポーネントの Props
 */
type OptionButtonGroupProps<T extends string> = {
  /** 選択肢 */
  options: readonly Option<T>[];
  /** 選択中の値 */
  value: T;
  /** 値が選ばれたときのハンドラ */
  onChange: (value: T) => void;
  /** グループの見出し要素の ID（aria-labelledby） */
  labelledBy: string;
};

/**
 * 選択中ボタンの枠線色
 *
 * globals.css のレイヤー外の `* { border-color }` が Tailwind の `border-*` 色クラスに
 * 勝つため、インライン style で orange-500 を指定する
 */
const SELECTED_BORDER_STYLE: React.CSSProperties = {
  borderColor: "#f97316",
};

/**
 * 選択肢ボタングループコンポーネント
 *
 * @remarks
 * 選択状態は aria-pressed で示す（グリッド列数・テーマカラーのボタンと同じ方式）
 */
export function OptionButtonGroup<T extends string>({
  options,
  value,
  onChange,
  labelledBy,
}: OptionButtonGroupProps<T>) {
  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      className="flex flex-wrap gap-2"
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isSelected}
            disabled={option.disabled}
            style={isSelected ? SELECTED_BORDER_STYLE : undefined}
            className={cn(
              "min-w-16 rounded-lg border-2 px-3 py-1.5 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-40",
              isSelected
                ? "border-orange-500 bg-orange-50 text-orange-700"
                : "border-border bg-card text-foreground hover:enabled:border-orange-400/50 hover:enabled:bg-orange-50/50"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
