"use client";

/**
 * ヘッダー・チェック表設定コンポーネント
 *
 * PDF の 1 ページ目の先頭（ヘッダー）に出す項目と、自主トレ実施チェック表を設定する。
 * デザイン設定ダイアログの「ヘッダー・チェック表（PDF）」セクションとして使う。
 */

import {
  CHECK_TABLE_DESCRIPTION,
  CHECK_TABLE_LABEL,
  CHECK_TABLE_OPTIONS,
  PATIENT_NAME_BOX_TOGGLE_LABEL,
  PROPERTY_PANEL_WARNING,
  SHEET_DATE_MODE_LABEL,
  SHEET_DATE_MODE_OPTIONS,
  SHEET_FACILITY_NAME_LABEL,
  SHEET_OVERALL_NOTE_LABEL,
  SHEET_OVERALL_NOTE_PLACEHOLDER,
  SHEET_THERAPIST_NAME_LABEL,
  TEXT_LIMITS,
} from "@rehab-grid/core/lib/constants";
import {
  type CheckTableType,
  type SheetHeaderSettings,
} from "@rehab-grid/core/types";
import { Checkbox } from "@rehab-grid/ui/components/ui/checkbox";
import { Input } from "@rehab-grid/ui/components/wrapped/Input";
import { Label } from "@rehab-grid/ui/components/wrapped/Label";
import { Textarea } from "@rehab-grid/ui/components/wrapped/Textarea";
import { AlertTriangle } from "lucide-react";
import { useId } from "react";

import { OptionButtonGroup } from "./OptionButtonGroup";

/** 自由入力するヘッダーの項目 */
type SheetTextField = "facilityName" | "therapistName" | "overallNote";

/**
 * SheetSettings コンポーネントの Props
 */
type SheetSettingsProps = {
  /** 現在のヘッダーの項目 */
  header: SheetHeaderSettings;
  /** 現在の実施チェック表 */
  checkTable: CheckTableType;
  /**
   * ヘッダーの項目の変更ハンドラ（全キーそろった値で呼ばれる）
   *
   * @remarks
   * 入力欄の変更では options.mergeKey を渡す。同じキーの連続入力は 1 件の履歴にまとまる。
   */
  onHeaderChange: (
    header: SheetHeaderSettings,
    options?: { mergeKey?: string }
  ) => void;
  /** 実施チェック表の変更ハンドラ */
  onCheckTableChange: (checkTable: CheckTableType) => void;
  /** 氏名欄のチェックボックスの ref（ダイアログをこのセクションから開くときにフォーカスする） */
  firstControlRef?: React.Ref<HTMLButtonElement>;
};

/**
 * ヘッダー・チェック表設定コンポーネント
 */
export function SheetSettings({
  header,
  checkTable,
  onHeaderChange,
  onCheckTableChange,
  firstControlRef,
}: SheetSettingsProps) {
  const patientNameToggleId = useId();
  const dateModeLabelId = useId();
  const facilityNameId = useId();
  const therapistNameId = useId();
  const overallNoteId = useId();
  const checkTableLabelId = useId();

  /**
   * 自由入力の項目の変更（入力のたびに反映する）
   */
  const handleTextChange = (field: SheetTextField, value: string) => {
    onHeaderChange(
      { ...header, [field]: value },
      { mergeKey: `settings:header:${field}` }
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {/* 施設名・担当者名・全体メモに個人情報を書かないよう、入力欄の前に注意書きを出す */}
      <p className="flex items-center gap-1 text-xs font-medium text-amber-600">
        <AlertTriangle className="size-3.5" aria-hidden="true" />
        {PROPERTY_PANEL_WARNING}
      </p>

      <div className="flex items-center gap-2">
        <Checkbox
          ref={firstControlRef}
          id={patientNameToggleId}
          checked={header.showPatientNameBox}
          onCheckedChange={(checked) =>
            onHeaderChange({ ...header, showPatientNameBox: checked === true })
          }
        />
        <Label
          htmlFor={patientNameToggleId}
          className="text-sm font-normal"
        >
          {PATIENT_NAME_BOX_TOGGLE_LABEL}
        </Label>
      </div>

      <div className="flex flex-col gap-1.5">
        <span id={dateModeLabelId} className="text-xs font-medium">
          {SHEET_DATE_MODE_LABEL}
        </span>
        <OptionButtonGroup
          options={SHEET_DATE_MODE_OPTIONS}
          value={header.dateMode}
          onChange={(dateMode) => onHeaderChange({ ...header, dateMode })}
          labelledBy={dateModeLabelId}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={facilityNameId} className="text-xs">
            {SHEET_FACILITY_NAME_LABEL}
          </Label>
          <Input
            id={facilityNameId}
            value={header.facilityName}
            onChange={(event) =>
              handleTextChange("facilityName", event.target.value)
            }
            maxLength={TEXT_LIMITS.facilityName}
            autoComplete="off"
            className="h-8 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={therapistNameId} className="text-xs">
            {SHEET_THERAPIST_NAME_LABEL}
          </Label>
          <Input
            id={therapistNameId}
            value={header.therapistName}
            onChange={(event) =>
              handleTextChange("therapistName", event.target.value)
            }
            maxLength={TEXT_LIMITS.therapistName}
            autoComplete="off"
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={overallNoteId} className="text-xs">
          {SHEET_OVERALL_NOTE_LABEL}
        </Label>
        <Textarea
          id={overallNoteId}
          value={header.overallNote}
          onChange={(event) =>
            handleTextChange("overallNote", event.target.value)
          }
          maxLength={TEXT_LIMITS.overallNote}
          placeholder={SHEET_OVERALL_NOTE_PLACEHOLDER}
          rows={3}
          className="resize-none text-sm"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div>
          <span id={checkTableLabelId} className="text-xs font-medium">
            {CHECK_TABLE_LABEL}
          </span>
          <p className="text-xs text-muted-foreground">
            {CHECK_TABLE_DESCRIPTION}
          </p>
        </div>
        <OptionButtonGroup
          options={CHECK_TABLE_OPTIONS}
          value={checkTable}
          onChange={onCheckTableChange}
          labelledBy={checkTableLabelId}
        />
      </div>
    </div>
  );
}
