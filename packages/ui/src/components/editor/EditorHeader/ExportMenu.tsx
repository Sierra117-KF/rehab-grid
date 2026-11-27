"use client";

import {
  BACKUP_EXPORT_ALL_LABEL,
  BACKUP_MENU_ALL_SECTION,
  BACKUP_MENU_CURRENT_SECTION,
  EXPORT_JSON_LABEL,
  EXPORT_MENU_LABEL,
  EXPORT_ZIP_LABEL,
} from "@rehab-grid/core/lib/constants";
import { Button } from "@rehab-grid/ui/components/wrapped/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@rehab-grid/ui/components/wrapped/DropdownMenu";
import { Download, FileJson, FolderArchive, Package } from "lucide-react";

/**
 * ExportMenuコンポーネントのProps
 */
export type ExportMenuProps = {
  /** 現在の指導箋を軽量JSONで書き出す */
  onExportJSON: () => void;
  /** 現在の指導箋を画像付きZIPで書き出す */
  onExportZIP: () => void;
  /** 全データ・マイライブラリをまとめてバックアップするダイアログを開く */
  onExportBackup: () => void;
};

/**
 * 書き出しメニューコンポーネント
 *
 * 単一指導箋の JSON / ZIP 書き出しと、端末内の全データ一括バックアップの
 * ドロップダウンメニューを提供する。読み込み（復元を含む）はヘッダーの「読み込み」ボタンが担う。
 */
export function ExportMenu({
  onExportJSON: handleExportJSON,
  onExportZIP: handleExportZIP,
  onExportBackup: handleExportBackup,
}: ExportMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
          title={EXPORT_MENU_LABEL}
          aria-label={EXPORT_MENU_LABEL}
        >
          <Download className="size-4 text-amber-500" />
          {/* ヘッダーに余裕のない幅（xl 未満）ではアイコンのみ */}
          <span className="hidden xl:inline">{EXPORT_MENU_LABEL}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          {BACKUP_MENU_CURRENT_SECTION}
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={handleExportJSON}>
          <FileJson className="mr-2 size-4 text-orange-500" />
          <span>{EXPORT_JSON_LABEL}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportZIP}>
          <FolderArchive className="mr-2 size-4 text-teal-500" />
          <span>{EXPORT_ZIP_LABEL}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          {BACKUP_MENU_ALL_SECTION}
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={handleExportBackup}>
          <Package className="mr-2 size-4 text-amber-600" />
          <span>{BACKUP_EXPORT_ALL_LABEL}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
