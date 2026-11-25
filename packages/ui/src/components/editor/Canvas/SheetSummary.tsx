"use client";

/**
 * PDF のヘッダー・実施チェック表の要約表示
 *
 * キャンバスにはヘッダー・チェック表を描かないため、キャンバス上部に PDF に出る内容の要約を出す。
 * 押すとデザイン設定ダイアログをヘッダー・チェック表のセクションで開く。
 */

import {
  CHECK_TABLE_OPTIONS,
  SHEET_FACILITY_NAME_LABEL,
  SHEET_SUMMARY_BUTTON_LABEL,
  SHEET_SUMMARY_CHECK_TABLE_LABEL,
  SHEET_SUMMARY_DATE_BLANK,
  SHEET_SUMMARY_DATE_PRINTED,
  SHEET_SUMMARY_HEADER_LABEL,
  SHEET_SUMMARY_LABEL,
  SHEET_SUMMARY_OVERALL_NOTE,
  SHEET_SUMMARY_PATIENT_NAME_BOX,
  SHEET_SUMMARY_TITLE_ONLY,
  SHEET_THERAPIST_NAME_LABEL,
} from "@rehab-grid/core/lib/constants";
import {
  type CheckTableType,
  type SheetHeaderSettings,
} from "@rehab-grid/core/types";
import { FileText, Settings2 } from "lucide-react";

/**
 * SheetSummary コンポーネントの Props
 */
type SheetSummaryProps = {
  /** ヘッダーの項目 */
  header: SheetHeaderSettings;
  /** 実施チェック表 */
  checkTable: CheckTableType;
  /** 押したときのハンドラ（設定を開く） */
  onClick: () => void;
};

/**
 * ヘッダーに出す項目の名前を並べる
 *
 * @param header - ヘッダーの項目
 * @returns 「氏名欄・日付欄・病院・施設名」形式の文字列（何も出さないときは「タイトルのみ」）
 */
function getHeaderSummary(header: SheetHeaderSettings): string {
  const parts: string[] = [];
  if (header.facilityName.trim() !== "") parts.push(SHEET_FACILITY_NAME_LABEL);
  if (header.therapistName.trim() !== "") {
    parts.push(SHEET_THERAPIST_NAME_LABEL);
  }
  if (header.dateMode === "blank") parts.push(SHEET_SUMMARY_DATE_BLANK);
  if (header.dateMode === "printed") parts.push(SHEET_SUMMARY_DATE_PRINTED);
  if (header.showPatientNameBox) parts.push(SHEET_SUMMARY_PATIENT_NAME_BOX);
  if (header.overallNote.trim() !== "") parts.push(SHEET_SUMMARY_OVERALL_NOTE);
  return parts.length > 0 ? parts.join("・") : SHEET_SUMMARY_TITLE_ONLY;
}

/**
 * PDF のヘッダー・実施チェック表の要約表示
 */
export function SheetSummary({ header, checkTable, onClick }: SheetSummaryProps) {
  const checkTableLabel =
    CHECK_TABLE_OPTIONS.find((option) => option.value === checkTable)?.label ??
    "";

  return (
    <button
      type="button"
      onClick={(event) => {
        // キャンバス背景のクリック（選択解除）として扱わない
        event.stopPropagation();
        onClick();
      }}
      title={SHEET_SUMMARY_BUTTON_LABEL}
      className="mb-4 flex w-full items-center gap-2 rounded-lg border border-dashed bg-card/60 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
    >
      <FileText className="size-4 shrink-0" aria-hidden="true" />
      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-medium text-foreground">
        {SHEET_SUMMARY_LABEL}
      </span>
      <span className="min-w-0 flex-1 truncate">
        {SHEET_SUMMARY_HEADER_LABEL}：{getHeaderSummary(header)}
        <span aria-hidden="true" className="mx-1.5">
          ／
        </span>
        {SHEET_SUMMARY_CHECK_TABLE_LABEL}：{checkTableLabel}
      </span>
      <Settings2 className="size-4 shrink-0" aria-hidden="true" />
    </button>
  );
}
