"use client";

import {
  BUTTON_BACKUP,
  EXPORT_JSON_LABEL,
  EXPORT_ZIP_LABEL,
} from "@rehab-grid/core/lib/constants";
import { Button } from "@rehab-grid/ui/components/wrapped/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@rehab-grid/ui/components/wrapped/DropdownMenu";
import { Download, FileJson, FolderArchive } from "lucide-react";

/**
 * ExportMenuコンポーネントのProps
 */
export type ExportMenuProps = {
  onExportJSON: () => void;
  onExportZIP: () => void;
};

/**
 * エクスポートメニューコンポーネント
 *
 * JSON/ZIPエクスポートのドロップダウンメニューを提供します。
 */
export function ExportMenu({
  onExportJSON: handleExportJSON,
  onExportZIP: handleExportZIP,
}: ExportMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <Download className="size-4 text-amber-500" />
          <span className="hidden desktop:inline">{BUTTON_BACKUP}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportJSON}>
          <FileJson className="mr-2 size-4 text-orange-500" />
          <span>{EXPORT_JSON_LABEL}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportZIP}>
          <FolderArchive className="mr-2 size-4 text-teal-500" />
          <span>{EXPORT_ZIP_LABEL}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
