"use client";

/**
 * 用量ラベル設定コンポーネント
 *
 * 用量（回数・セット・頻度）の欄の名前を、候補から選ぶか自由に入力して変える。
 * デザイン設定ダイアログの「用量のラベル」セクションとして使う。
 */

import {
  createDosageLabelInputLabel,
  DOSAGE_LABEL_SUGGESTIONS,
  LABELS,
  TEXT_LIMITS,
} from "@rehab-grid/core/lib/constants";
import { cn } from "@rehab-grid/core/lib/utils";
import { type BadgeType, type DosageLabels } from "@rehab-grid/core/types";
import { Input } from "@rehab-grid/ui/components/wrapped/Input";
import { Label } from "@rehab-grid/ui/components/wrapped/Label";
import { useId, useState } from "react";

/** 用量ラベルの欄（表示順） */
const DOSAGE_LABEL_TYPES: readonly BadgeType[] = ["reps", "sets", "frequency"];

/**
 * DosageLabelSettings コンポーネントの Props
 */
type DosageLabelSettingsProps = {
  /** 現在の用量ラベル */
  labels: DosageLabels;
  /**
   * 用量ラベル変更ハンドラ（3 キーそろった値で呼ばれる）
   *
   * @remarks
   * 入力欄の変更では options.mergeKey を渡す。同じキーの連続入力は 1 件の履歴にまとまる。
   */
  onChange: (labels: DosageLabels, options?: { mergeKey?: string }) => void;
};

/**
 * DosageLabelField コンポーネントの Props
 */
type DosageLabelFieldProps = {
  /** 用量の種類 */
  type: BadgeType;
  /** 現在のラベル */
  value: string;
  /** ラベル変更ハンドラ（空欄はデフォルトのラベルにして呼ばれる） */
  onChange: (value: string, options?: { mergeKey?: string }) => void;
};

/**
 * 用量ラベル 1 欄分の入力
 *
 * @remarks
 * 空欄にするとデフォルトのラベル（LABELS）を反映するが、入力中は空欄のまま表示し、
 * フォーカスが外れたら反映済みの値を表示する。
 */
function DosageLabelField({ type, value, onChange }: DosageLabelFieldProps) {
  const inputId = useId();
  const defaultLabel = LABELS[type];

  /**
   * 入力中の値から反映する値を求める（前後の空白を除き、空欄ならデフォルトのラベル）
   */
  const toLabel = (text: string) => text.trim() || defaultLabel;

  // 入力中の値（空欄も保持する）
  const [draft, setDraft] = useState(value);
  // 外部（候補ボタン・プリセット・Undo）でラベルが変わったら入力欄も追従させる。
  // useEffect ではなく、レンダー中に前回の値と比べて更新する。
  // 入力中の空欄（デフォルトのラベルとして反映済み）は上書きしない
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (toLabel(draft) !== value) setDraft(value);
  }

  /**
   * 入力欄の変更（入力のたびに反映する）
   */
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDraft(event.target.value);
    onChange(toLabel(event.target.value), {
      mergeKey: `settings:dosageLabels:${type}`,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Label
        htmlFor={inputId}
        className="w-22 shrink-0 whitespace-nowrap text-xs font-normal"
      >
        {createDosageLabelInputLabel(defaultLabel)}
      </Label>
      <Input
        id={inputId}
        value={draft}
        onChange={handleChange}
        onBlur={() => setDraft(value)}
        maxLength={TEXT_LIMITS.dosageLabel}
        placeholder={defaultLabel}
        autoComplete="off"
        className="h-8 w-24 text-sm"
      />
      <div className="flex flex-wrap gap-1">
        {DOSAGE_LABEL_SUGGESTIONS[type].map((suggestion) => {
          const isSelected = suggestion === value;
          return (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                setDraft(suggestion);
                onChange(suggestion);
              }}
              aria-pressed={isSelected}
              aria-label={`${createDosageLabelInputLabel(defaultLabel)}を「${suggestion}」にする`}
              className={cn(
                "rounded-full border px-2 py-0.5 text-xs transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500",
                isSelected
                  ? "border-orange-500 bg-orange-50 text-orange-700"
                  : "border-border bg-card text-muted-foreground hover:border-orange-400/50 hover:text-foreground"
              )}
            >
              {suggestion}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 用量ラベル設定コンポーネント
 */
export function DosageLabelSettings({
  labels,
  onChange,
}: DosageLabelSettingsProps) {
  return (
    <div className="flex flex-col gap-2">
      {DOSAGE_LABEL_TYPES.map((type) => (
        <DosageLabelField
          key={type}
          type={type}
          value={labels[type]}
          onChange={(value, options) =>
            onChange({ ...labels, [type]: value }, options)
          }
        />
      ))}
    </div>
  );
}
