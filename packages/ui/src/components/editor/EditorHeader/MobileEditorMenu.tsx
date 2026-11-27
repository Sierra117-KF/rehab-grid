"use client";

import {
  BACKUP_EXPORT_ALL_LABEL,
  BACKUP_MENU_ALL_SECTION,
  BACKUP_MENU_CURRENT_SECTION,
  BACKUP_RESTORE_LABEL,
  BUTTON_BACKUP,
  DESIGN_SETTINGS_LABEL,
  EXERCISE_CARD_ADD_BUTTON_LABEL,
  EXPORT_JSON_LABEL,
  EXPORT_ZIP_LABEL,
  getLayoutLabel,
  HOME_LINK_TOOLTIP,
  IMPORT_LOADING_LABEL,
  IMPORT_OPEN_LABEL,
  PROJECT_DELETE_TOOLTIP,
  PROJECT_LIST_LABEL,
  REDO_LABEL,
  TEMPLATE_BUTTON_LABEL,
  UNDO_LABEL,
} from "@rehab-grid/core/lib/constants";
import { cn } from "@rehab-grid/core/lib/utils";
import type { LayoutType } from "@rehab-grid/core/types";
import { Button } from "@rehab-grid/ui/components/wrapped/Button";
import {
  ArchiveRestore,
  Bookmark,
  ChevronDown,
  ChevronRight,
  Download,
  FileJson,
  Files,
  FolderArchive,
  FolderOpen,
  Home,
  LayoutTemplate,
  Loader2,
  Package,
  Palette,
  Redo2,
  Trash2,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

/**
 * MobileEditorMenu のプロパティ
 */
type MobileEditorMenuProps = {
  /** 元に戻せる操作があるかどうか */
  canUndo: boolean;
  /** やり直せる操作があるかどうか */
  canRedo: boolean;
  /** 直前の操作を取り消す */
  onUndo: () => void;
  /** 取り消した操作をやり直す */
  onRedo: () => void;
  /** 指導箋一覧（マイ指導箋）を開く */
  onProjectListClick: () => void;
  /** 現在のレイアウトタイプ */
  layoutType: LayoutType;
  /** デザイン設定ダイアログを開く */
  onDesignSettingsClick: () => void;
  /** テンプレートモーダルを開く */
  onTemplateClick: () => void;
  /** マイ運動モーダルを開く */
  onExerciseCardsClick: () => void;
  /** ファイルを開くダイアログを開く */
  onOpenClick: () => void;
  /** インポート中かどうか */
  isImporting: boolean;
  /** JSONエクスポート */
  onExportJSON: () => void;
  /** ZIPエクスポート */
  onExportZIP: () => void;
  /** 全データまとめてバックアップダイアログを開く */
  onExportBackup: () => void;
  /** バックアップから復元ファイル選択を開く */
  onRestoreBackup: () => void;
  /** プロジェクト削除ダイアログを開く */
  onDeleteProject: () => void;
  /** メニューを閉じる */
  onClose: () => void;
};

/**
 * メニュー項目コンポーネント
 */
type MenuItemProps = {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "destructive";
  rightContent?: React.ReactNode;
  /** アイコンのカラークラス（例: text-sky-500） */
  iconColor?: string;
};

/**
 * メニュー項目コンポーネント
 */
function MenuItem(props: MenuItemProps) {
  const {
    icon,
    label,
    onClick,
    disabled = false,
    variant = "default",
    rightContent,
    iconColor,
  } = props;

  // Reactコンポーネントとして使用するためPascalCaseで別名定義
  const Icon = icon;

  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-base font-medium",
        "transition-colors",
        variant === "destructive"
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground hover:bg-accent",
        disabled && "pointer-events-none opacity-50"
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon
        className={cn(
          "size-5 shrink-0",
          variant === "destructive"
            ? "text-destructive"
            : (iconColor ?? "text-muted-foreground")
        )}
      />
      <span className="flex-1">{label}</span>
      {rightContent}
    </button>
  );
}

/**
 * モバイルエディタメニューコンポーネント
 *
 * エディタ用のドロップダウンメニューコンテンツ。
 * デザイン設定、テンプレート、ファイル操作、エクスポート、削除の機能を提供。
 */
export function MobileEditorMenu({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onProjectListClick,
  layoutType,
  onDesignSettingsClick,
  onTemplateClick,
  onExerciseCardsClick,
  onOpenClick,
  isImporting,
  onExportJSON,
  onExportZIP,
  onExportBackup,
  onRestoreBackup,
  onDeleteProject,
  onClose,
}: MobileEditorMenuProps) {
  /** エクスポートサブメニューの展開状態 */
  const [isExportExpanded, setIsExportExpanded] = useState(false);

  /**
   * 元に戻すクリックハンドラ（結果が見えるようメニューを閉じる）
   */
  const handleUndo = useCallback(() => {
    onClose();
    onUndo();
  }, [onClose, onUndo]);

  /**
   * やり直すクリックハンドラ（結果が見えるようメニューを閉じる）
   */
  const handleRedo = useCallback(() => {
    onClose();
    onRedo();
  }, [onClose, onRedo]);

  /**
   * 指導箋一覧クリックハンドラ
   */
  const handleProjectListClick = useCallback(() => {
    onClose();
    onProjectListClick();
  }, [onClose, onProjectListClick]);

  /**
   * デザイン設定クリックハンドラ
   */
  const handleDesignSettingsClick = useCallback(() => {
    onClose();
    onDesignSettingsClick();
  }, [onClose, onDesignSettingsClick]);

  /**
   * テンプレートクリックハンドラ
   */
  const handleTemplateClick = useCallback(() => {
    onClose();
    onTemplateClick();
  }, [onClose, onTemplateClick]);

  /**
   * マイ運動クリックハンドラ
   */
  const handleExerciseCardsClick = useCallback(() => {
    onClose();
    onExerciseCardsClick();
  }, [onClose, onExerciseCardsClick]);

  /**
   * ファイルを開くクリックハンドラ
   */
  const handleOpenClick = useCallback(() => {
    onClose();
    onOpenClick();
  }, [onClose, onOpenClick]);

  /**
   * JSONエクスポートクリックハンドラ
   */
  const handleExportJSON = useCallback(() => {
    onClose();
    onExportJSON();
  }, [onClose, onExportJSON]);

  /**
   * ZIPエクスポートクリックハンドラ
   */
  const handleExportZIP = useCallback(() => {
    onClose();
    onExportZIP();
  }, [onClose, onExportZIP]);

  /**
   * まとめてバックアップクリックハンドラ
   */
  const handleExportBackup = useCallback(() => {
    onClose();
    onExportBackup();
  }, [onClose, onExportBackup]);

  /**
   * バックアップから復元クリックハンドラ
   */
  const handleRestoreBackup = useCallback(() => {
    onClose();
    onRestoreBackup();
  }, [onClose, onRestoreBackup]);

  /**
   * プロジェクト削除クリックハンドラ
   */
  const handleDeleteProject = useCallback(() => {
    onClose();
    onDeleteProject();
  }, [onClose, onDeleteProject]);

  /**
   * エクスポートサブメニュートグル
   */
  const toggleExportExpanded = useCallback(() => {
    setIsExportExpanded((prev) => !prev);
  }, []);

  return (
    <nav className="flex flex-col">
      {/* 元に戻す / やり直す */}
      <MenuItem
        icon={Undo2}
        label={UNDO_LABEL}
        onClick={handleUndo}
        disabled={!canUndo}
      />
      <MenuItem
        icon={Redo2}
        label={REDO_LABEL}
        onClick={handleRedo}
        disabled={!canRedo}
      />

      {/* 区切り線 */}
      <div className="my-2 h-px bg-border/40" aria-hidden="true" />

      {/* 指導箋一覧（マイ指導箋） */}
      <MenuItem
        icon={Files}
        label={PROJECT_LIST_LABEL}
        onClick={handleProjectListClick}
        iconColor="text-orange-500"
      />

      {/* デザイン設定（レイアウトのバッジ付き） */}
      <MenuItem
        icon={Palette}
        label={DESIGN_SETTINGS_LABEL}
        onClick={handleDesignSettingsClick}
        iconColor="text-sky-500"
        rightContent={
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary">
              {getLayoutLabel(layoutType)}
            </span>
            <ChevronRight className="size-4" />
          </span>
        }
      />

      {/* テンプレート */}
      <MenuItem
        icon={LayoutTemplate}
        label={TEMPLATE_BUTTON_LABEL}
        onClick={handleTemplateClick}
        iconColor="text-violet-500"
      />

      {/* マイ運動から追加 */}
      <MenuItem
        icon={Bookmark}
        label={EXERCISE_CARD_ADD_BUTTON_LABEL}
        onClick={handleExerciseCardsClick}
        iconColor="text-teal-600"
      />

      {/* ファイルを開く */}
      <MenuItem
        icon={isImporting ? Loader2 : FolderOpen}
        label={isImporting ? IMPORT_LOADING_LABEL : IMPORT_OPEN_LABEL}
        onClick={handleOpenClick}
        disabled={isImporting}
        iconColor="text-emerald-500"
      />

      {/* エクスポート（アコーディオン） */}
      <Button
        variant="ghost"
        className={cn(
          "flex h-auto w-full items-center justify-start gap-3 rounded-lg px-3 py-3 text-left text-base font-medium",
          "text-foreground hover:bg-accent"
        )}
        onClick={toggleExportExpanded}
      >
        <Download className="size-5 shrink-0 text-amber-500" />
        <span className="flex-1">{BUTTON_BACKUP}</span>
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform duration-200",
            isExportExpanded && "rotate-180"
          )}
        />
      </Button>

      {/* エクスポートサブメニュー */}
      {isExportExpanded ? (
        <div className="ml-8 flex flex-col border-l border-border/40 pl-2">
          <p className="px-3 pt-1 pb-0.5 text-xs font-medium text-muted-foreground">
            {BACKUP_MENU_CURRENT_SECTION}
          </p>
          <button
            type="button"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent"
            onClick={handleExportJSON}
          >
            <FileJson className="size-4 text-orange-500" />
            <span>{EXPORT_JSON_LABEL}</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent"
            onClick={handleExportZIP}
          >
            <FolderArchive className="size-4 text-teal-500" />
            <span>{EXPORT_ZIP_LABEL}</span>
          </button>
          <div className="my-1 h-px bg-border/40" aria-hidden="true" />
          <p className="px-3 pt-1 pb-0.5 text-xs font-medium text-muted-foreground">
            {BACKUP_MENU_ALL_SECTION}
          </p>
          <button
            type="button"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent"
            onClick={handleExportBackup}
          >
            <Package className="size-4 text-amber-600" />
            <span>{BACKUP_EXPORT_ALL_LABEL}</span>
          </button>
          <button
            type="button"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent",
              isImporting && "pointer-events-none opacity-50"
            )}
            onClick={handleRestoreBackup}
            disabled={isImporting}
          >
            <ArchiveRestore className="size-4 text-emerald-600" />
            <span>{BACKUP_RESTORE_LABEL}</span>
          </button>
        </div>
      ) : null}

      {/* 区切り線 */}
      <div className="my-2 h-px bg-border/40" aria-hidden="true" />

      {/* プロジェクト削除 */}
      <MenuItem
        icon={Trash2}
        label={PROJECT_DELETE_TOOLTIP}
        onClick={handleDeleteProject}
        variant="destructive"
      />

      {/* 区切り線 */}
      <div className="my-2 h-px bg-border/40" aria-hidden="true" />

      {/* トップページへ戻る */}
      <Link
        href="/"
        className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-base font-medium text-foreground transition-colors hover:bg-accent"
      >
        <Home className="size-5 shrink-0 text-muted-foreground" />
        <span className="flex-1">{HOME_LINK_TOOLTIP}</span>
      </Link>
    </nav>
  );
}
