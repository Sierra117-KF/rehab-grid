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
  SHEET_DATE_MODE_LABEL,
  SHEET_DATE_MODE_OPTIONS,
} from "@rehab-grid/core/lib/constants";
import {
  type CheckTableType,
  type SheetHeaderSettings,
} from "@rehab-grid/core/types";
import { Checkbox } from "@rehab-grid/ui/components/ui/checkbox";
import { Label } from "@rehab-grid/ui/components/wrapped/Label";
import { useId } from "react";

import { OptionButtonGroup } from "./OptionButtonGroup";

/**
 * SheetSettings コンポーネントの Props
 */
type SheetSettingsProps = {
  /** 現在のヘッダーの項目 */
  header: SheetHeaderSettings;
  /** 現在の実施チェック表 */
  checkTable: CheckTableType;
  /** ヘッダーの項目の変更ハンドラ（全キーそろった値で呼ばれる） */
  onHeaderChange: (header: SheetHeaderSettings) => void;
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
  const checkTableLabelId = useId();

  return (
    <div className="flex flex-col gap-3">
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
