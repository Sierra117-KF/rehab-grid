"use client";

import {
  BACKUP_EXPORT_ALL_LABEL,
  BACKUP_MENU_ALL_SECTION,
  BACKUP_MENU_CURRENT_SECTION,
  BACKUP_RESTORE_LABEL,
  BUTTON_BACKUP,
  EXPORT_JSON_LABEL,
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
import {
  ArchiveRestore,
  Download,
  FileJson,
  FolderArchive,
  Package,
} from "lucide-react";

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
  /** バックアップZIPから復元するファイル選択を開く */
  onRestoreBackup: () => void;
  /** インポート・復元読み込み中か */
  isImporting?: boolean;
};

/**
 * エクスポート・バックアップメニューコンポーネント
 *
 * 単一指導箋の JSON / ZIP 書き出しと、
 * 端末内の全データ一括バックアップ・復元のドロップダウンメニューを提供する。
 */
export function ExportMenu({
  onExportJSON: handleExportJSON,
  onExportZIP: handleExportZIP,
  onExportBackup: handleExportBackup,
  onRestoreBackup: handleRestoreBackup,
  isImporting = false,
}: ExportMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
          title={BUTTON_BACKUP}
          aria-label={BUTTON_BACKUP}
        >
          <Download className="size-4 text-amber-500" />
          {/* ヘッダーに余裕のない幅（xl 未満）ではアイコンのみ */}
          <span className="hidden xl:inline">{BUTTON_BACKUP}</span>
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
        <DropdownMenuItem
          onClick={handleRestoreBackup}
          disabled={isImporting}
        >
          <ArchiveRestore className="mr-2 size-4 text-emerald-600" />
          <span>{BACKUP_RESTORE_LABEL}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
