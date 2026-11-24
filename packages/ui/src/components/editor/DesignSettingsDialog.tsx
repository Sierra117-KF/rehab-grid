"use client";

/**
 * デザイン設定ダイアログコンポーネント
 *
 * 指導箋の見た目に関する設定（列数・テーマカラー）をまとめて変更するダイアログ。
 * 設定は選んだ時点で反映し、ダイアログは「閉じる」で閉じる。
 */

import {
  BUTTON_CLOSE,
  DESIGN_SETTINGS_DESCRIPTION,
  DESIGN_SETTINGS_LABEL,
  DESIGN_SETTINGS_LAYOUT_HEADING,
  DESIGN_SETTINGS_THEME_COLOR_HEADING,
  THEME_COLOR_DESCRIPTION,
} from "@rehab-grid/core/lib/constants";
import {
  type LayoutType,
  type ResolvedProjectSettings,
} from "@rehab-grid/core/types";
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
import { useId } from "react";

import { GridLayoutSelector } from "./GridLayoutSelector";
import { ThemeColorSelector } from "./ThemeColorSelector";

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
  /** レイアウト変更ハンドラ */
  onLayoutChange: (layout: LayoutType) => void;
  /** テーマカラー変更ハンドラ */
  onThemeColorChange: (color: string) => void;
};

/**
 * デザイン設定ダイアログコンポーネント
 */
export function DesignSettingsDialog({
  open,
  onOpenChange,
  settings,
  onLayoutChange,
  onThemeColorChange,
}: DesignSettingsDialogProps) {
  const layoutHeadingId = useId();
  const themeColorHeadingId = useId();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{DESIGN_SETTINGS_LABEL}</DialogTitle>
          <DialogDescription>{DESIGN_SETTINGS_DESCRIPTION}</DialogDescription>
        </DialogHeader>

        {/* 列数 */}
        <section aria-labelledby={layoutHeadingId} className="flex flex-col gap-2">
          <h3 id={layoutHeadingId} className="text-sm font-semibold">
            {DESIGN_SETTINGS_LAYOUT_HEADING}
          </h3>
          <GridLayoutSelector
            layoutType={settings.layoutType}
            onLayoutChange={onLayoutChange}
          />
        </section>

        {/* テーマカラー */}
        <section
          aria-labelledby={themeColorHeadingId}
          className="flex flex-col gap-2"
        >
          <div>
            <h3 id={themeColorHeadingId} className="text-sm font-semibold">
              {DESIGN_SETTINGS_THEME_COLOR_HEADING}
            </h3>
            <p className="text-xs text-muted-foreground">
              {THEME_COLOR_DESCRIPTION}
            </p>
          </div>
          <ThemeColorSelector
            value={settings.themeColor}
            onChange={onThemeColorChange}
          />
        </section>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{BUTTON_CLOSE}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
