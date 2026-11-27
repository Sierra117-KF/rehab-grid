"use client";

/**
 * デザイン設定ダイアログコンポーネント
 *
 * 指導箋の見た目と印刷に関する設定（レイアウト・用紙の向き・用途別プリセット・テーマカラー・
 * 印刷の色・文字サイズ・カード番号・用量のラベル・PDF のヘッダーと実施チェック表）をまとめて変更するダイアログ。
 * 設定は選んだ時点で反映し、ダイアログは「閉じる」で閉じる。
 */

import {
  BUTTON_CLOSE,
  CARD_NUMBER_TOGGLE_LABEL,
  DESIGN_PRESETS,
  DESIGN_SETTINGS_CARD_NUMBER_HEADING,
  DESIGN_SETTINGS_DESCRIPTION,
  DESIGN_SETTINGS_DOSAGE_LABEL_HEADING,
  DESIGN_SETTINGS_LABEL,
  DESIGN_SETTINGS_LAYOUT_HEADING,
  DESIGN_SETTINGS_ORIENTATION_HEADING,
  DESIGN_SETTINGS_PRESET_DESCRIPTION,
  DESIGN_SETTINGS_PRESET_HEADING,
  DESIGN_SETTINGS_PRINT_COLOR_HEADING,
  DESIGN_SETTINGS_SHEET_DESCRIPTION,
  DESIGN_SETTINGS_SHEET_HEADING,
  DESIGN_SETTINGS_TEXT_SCALE_HEADING,
  DESIGN_SETTINGS_THEME_COLOR_HEADING,
  DOSAGE_LABEL_DESCRIPTION,
  PAGE_ORIENTATION_AUTO_HINT,
  PAGE_ORIENTATION_NARROW_NOTE,
  PAGE_ORIENTATION_OPTIONS,
  PAGE_ORIENTATION_SINGLE_COLUMN_NOTE,
  PAGE_ORIENTATION_SLIDE_NOTE,
  PRINT_COLOR_MODE_OPTIONS,
  PRINT_COLOR_MONOCHROME_HINT,
  SHEET_HEADER_SLIDE_NOTE,
  TEXT_SCALE_OPTIONS,
  TEXT_SCALE_SINGLE_COLUMN_NOTE,
  TEXT_SCALE_SLIDE_NOTE,
  THEME_COLOR_DESCRIPTION,
  THEME_COLOR_MONOCHROME_NOTE,
} from "@rehab-grid/core/lib/constants";
import { cn } from "@rehab-grid/core/lib/utils";
import {
  type DesignSettingsSection,
  type ResolvedProjectSettings,
} from "@rehab-grid/core/types";
import { Checkbox } from "@rehab-grid/ui/components/ui/checkbox";
import { Button } from "@rehab-grid/ui/components/wrapped/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@rehab-grid/ui/components/wrapped/Dialog";
import { Label } from "@rehab-grid/ui/components/wrapped/Label";
import { useId, useRef } from "react";

import { DosageLabelSettings } from "./DosageLabelSettings";
import { GridLayoutSelector } from "./GridLayoutSelector";
import { OptionButtonGroup } from "./OptionButtonGroup";
import { SheetSettings } from "./SheetSettings";
import { ThemeColorSelector } from "./ThemeColorSelector";

/**
 * テーマカラー変更の履歴をまとめるキー
 *
 * カラーピッカーのドラッグ中は値が連続して変わるため、1 件の履歴にまとめる
 */
const THEME_COLOR_MERGE_KEY = "settings:themeColor";

/**
 * 設定変更のオプション
 */
type SettingsChangeOptions = {
  /** 連続入力を 1 件の履歴にまとめるためのキー */
  mergeKey?: string;
};

/**
 * DesignSettingsDialog コンポーネントの Props
 */
type DesignSettingsDialogProps = {
  /** ダイアログの開閉状態 */
  open: boolean;
  /** 開閉状態変更ハンドラ */
  onOpenChange: (open: boolean) => void;
  /** 現在のプロジェクト設定 */
  settings: ResolvedProjectSettings;
  /** 設定の変更ハンドラ */
  onSettingsChange: (
    updates: Partial<ResolvedProjectSettings>,
    options?: SettingsChangeOptions
  ) => void;
  /** 開いたときに表示するセクション（省略時・null は先頭） */
  initialSection?: DesignSettingsSection | null;
};

/**
 * ダイアログ内の 1 セクション（見出し＋説明＋中身）
 */
function SettingsSection({
  headingId,
  heading,
  description,
  children,
}: {
  headingId: string;
  heading: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <div>
        <h3 id={headingId} className="text-sm font-semibold">
          {heading}
        </h3>
        {description !== undefined ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/**
 * 設定の補足（選んだ組み合わせに応じた注意など）
 */
function SettingsNote({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-amber-700">{children}</p>;
}

/**
 * プリセットの設定がすべて現在の設定と一致しているか
 *
 * @param preset - プリセットの設定
 * @param settings - 現在の設定
 * @returns 一致していれば true
 */
function isPresetActive(
  preset: Partial<ResolvedProjectSettings>,
  settings: ResolvedProjectSettings
): boolean {
  return (
    Object.keys(preset) as (keyof ResolvedProjectSettings)[]
  ).every((key) => Object.is(preset[key], settings[key]));
}

/**
 * デザイン設定ダイアログコンポーネント
 */
export function DesignSettingsDialog({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
  initialSection = null,
}: DesignSettingsDialogProps) {
  const sheetFirstControlRef = useRef<HTMLButtonElement>(null);
  const layoutHeadingId = useId();
  const orientationHeadingId = useId();
  const presetHeadingId = useId();
  const themeColorHeadingId = useId();
  const printColorHeadingId = useId();
  const textScaleHeadingId = useId();
  const cardNumberHeadingId = useId();
  const cardNumberToggleId = useId();
  const dosageLabelHeadingId = useId();
  const sheetHeadingId = useId();

  /**
   * ダイアログを開いたときのフォーカス先
   *
   * @remarks
   * セクション指定で開いたときは、そのセクションの最初の入力にフォーカスする
   * （フォーカスに合わせてブラウザがスクロールするため、セクションが見える位置まで移動する）
   */
  const handleOpenAutoFocus = (event: Event) => {
    if (initialSection !== "sheet") return;
    event.preventDefault();
    sheetFirstControlRef.current?.focus();
  };

  const isSingleColumn = settings.layoutType === "grid1";
  const isSlide = settings.layoutType === "slide";
  // 1列は横向きにするとカードが 1 ページに収まらないため、横向きを選べなくする。
  // スライドは常に横向きのため、「自動」「縦」を選べなくする
  const orientationOptions = PAGE_ORIENTATION_OPTIONS.map((option) => ({
    ...option,
    disabled: isSlide
      ? option.value !== "landscape"
      : isSingleColumn && option.value === "landscape",
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        項目が多いため、本文だけを縦スクロールにする（見出しと「閉じる」は常に見える）。
        grid だと max-height だけでは 1fr の行が縮まないため、flex の縦並びにする
      */}
      <DialogContent
        className="flex max-h-[90dvh] flex-col sm:max-w-lg"
        onOpenAutoFocus={handleOpenAutoFocus}
      >
        <DialogHeader>
          <DialogTitle>{DESIGN_SETTINGS_LABEL}</DialogTitle>
          <DialogDescription>{DESIGN_SETTINGS_DESCRIPTION}</DialogDescription>
        </DialogHeader>

        <div className="-mx-6 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 pb-1">
          {/* レイアウト */}
          <SettingsSection
            headingId={layoutHeadingId}
            heading={DESIGN_SETTINGS_LAYOUT_HEADING}
          >
            <GridLayoutSelector
              layoutType={settings.layoutType}
              onLayoutChange={(layoutType) => onSettingsChange({ layoutType })}
            />
          </SettingsSection>

          {/* 用紙の向き */}
          <SettingsSection
            headingId={orientationHeadingId}
            heading={DESIGN_SETTINGS_ORIENTATION_HEADING}
            description={PAGE_ORIENTATION_AUTO_HINT}
          >
            <OptionButtonGroup
              options={orientationOptions}
              // スライドは常に横で表示する。保存値は書き換えない（ほかのレイアウトに戻したとき元の向きに戻す）
              value={isSlide ? "landscape" : settings.pageOrientation}
              onChange={(pageOrientation) => {
                if (isSlide) return;
                onSettingsChange({ pageOrientation });
              }}
              labelledBy={orientationHeadingId}
            />
            {isSingleColumn ? (
              <SettingsNote>{PAGE_ORIENTATION_SINGLE_COLUMN_NOTE}</SettingsNote>
            ) : null}
            {isSlide ? (
              <SettingsNote>{PAGE_ORIENTATION_SLIDE_NOTE}</SettingsNote>
            ) : null}
            {settings.layoutType === "grid4" &&
            settings.pageOrientation === "portrait" ? (
              <SettingsNote>{PAGE_ORIENTATION_NARROW_NOTE}</SettingsNote>
            ) : null}
          </SettingsSection>

          {/* 用途別プリセット */}
          <SettingsSection
            headingId={presetHeadingId}
            heading={DESIGN_SETTINGS_PRESET_HEADING}
            description={DESIGN_SETTINGS_PRESET_DESCRIPTION}
          >
            <div
              role="group"
              aria-labelledby={presetHeadingId}
              className="grid grid-cols-1 gap-2 sm:grid-cols-3"
            >
              {DESIGN_PRESETS.map((preset) => {
                const isActive = isPresetActive(preset.settings, settings);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onSettingsChange(preset.settings)}
                    aria-pressed={isActive}
                    className={cn(
                      "flex flex-col items-start gap-0.5 rounded-lg border-2 px-3 py-2 text-left transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2",
                      isActive
                        ? "border-orange-500 bg-orange-50"
                        : "border-border bg-card hover:border-orange-400/50 hover:bg-orange-50/50"
                    )}
                  >
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        isActive ? "text-orange-700" : "text-foreground"
                      )}
                    >
                      {preset.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {preset.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </SettingsSection>

          {/* テーマカラー */}
          <SettingsSection
            headingId={themeColorHeadingId}
            heading={DESIGN_SETTINGS_THEME_COLOR_HEADING}
            description={THEME_COLOR_DESCRIPTION}
          >
            <ThemeColorSelector
              value={settings.themeColor}
              onChange={(themeColor) =>
                onSettingsChange(
                  { themeColor },
                  { mergeKey: THEME_COLOR_MERGE_KEY }
                )
              }
            />
            {settings.printColorMode === "monochrome" ? (
              <SettingsNote>{THEME_COLOR_MONOCHROME_NOTE}</SettingsNote>
            ) : null}
          </SettingsSection>

          {/* 印刷の色 */}
          <SettingsSection
            headingId={printColorHeadingId}
            heading={DESIGN_SETTINGS_PRINT_COLOR_HEADING}
            description={PRINT_COLOR_MONOCHROME_HINT}
          >
            <OptionButtonGroup
              options={PRINT_COLOR_MODE_OPTIONS}
              value={settings.printColorMode}
              onChange={(printColorMode) =>
                onSettingsChange({ printColorMode })
              }
              labelledBy={printColorHeadingId}
            />
          </SettingsSection>

          {/* 文字サイズ */}
          <SettingsSection
            headingId={textScaleHeadingId}
            heading={DESIGN_SETTINGS_TEXT_SCALE_HEADING}
          >
            <OptionButtonGroup
              options={TEXT_SCALE_OPTIONS}
              value={settings.textScale}
              onChange={(textScale) => onSettingsChange({ textScale })}
              labelledBy={textScaleHeadingId}
            />
            {isSingleColumn ? (
              <SettingsNote>{TEXT_SCALE_SINGLE_COLUMN_NOTE}</SettingsNote>
            ) : null}
            {isSlide ? (
              <SettingsNote>{TEXT_SCALE_SLIDE_NOTE}</SettingsNote>
            ) : null}
          </SettingsSection>

          {/* カード番号 */}
          <SettingsSection
            headingId={cardNumberHeadingId}
            heading={DESIGN_SETTINGS_CARD_NUMBER_HEADING}
          >
            <div className="flex items-center gap-2">
              <Checkbox
                id={cardNumberToggleId}
                checked={settings.showCardNumbers}
                onCheckedChange={(checked) =>
                  onSettingsChange({ showCardNumbers: checked === true })
                }
              />
              <Label
                htmlFor={cardNumberToggleId}
                className="text-sm font-normal"
              >
                {CARD_NUMBER_TOGGLE_LABEL}
              </Label>
            </div>
          </SettingsSection>

          {/* 用量のラベル */}
          <SettingsSection
            headingId={dosageLabelHeadingId}
            heading={DESIGN_SETTINGS_DOSAGE_LABEL_HEADING}
            description={DOSAGE_LABEL_DESCRIPTION}
          >
            <DosageLabelSettings
              labels={settings.dosageLabels}
              onChange={(dosageLabels, options) =>
                onSettingsChange({ dosageLabels }, options)
              }
            />
          </SettingsSection>

          {/* ヘッダー・チェック表（PDF） */}
          <SettingsSection
            headingId={sheetHeadingId}
            heading={DESIGN_SETTINGS_SHEET_HEADING}
            description={DESIGN_SETTINGS_SHEET_DESCRIPTION}
          >
            <SheetSettings
              header={settings.header}
              checkTable={settings.checkTable}
              onHeaderChange={(header, options) =>
                onSettingsChange({ header }, options)
              }
              onCheckTableChange={(checkTable) =>
                onSettingsChange({ checkTable })
              }
              firstControlRef={sheetFirstControlRef}
            />
            {isSlide ? (
              <SettingsNote>{SHEET_HEADER_SLIDE_NOTE}</SettingsNote>
            ) : null}
          </SettingsSection>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{BUTTON_CLOSE}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
