"use client";

import { useIsMobile } from "@rehab-grid/core/hooks/useMediaQuery";
import { usePdfWorker } from "@rehab-grid/core/hooks/usePdfWorker";
import {
  APP_NAME,
  BACKUP_EXPORT_FAILED_MESSAGE,
  BACKUP_EXPORT_SUCCESS_MESSAGE,
  BACKUP_RESTORE_FAILED_MESSAGE,
  BUTTON_CANCEL,
  BUTTON_DELETE,
  createBackupRestoreSuccessMessage,
  DESIGN_SETTINGS_LABEL,
  HOME_LINK_TOOLTIP,
  IMPORT_FAILED_MESSAGE,
  IMPORT_LOADING_LABEL,
  IMPORT_OPEN_LABEL,
  IMPORT_OPEN_TOOLTIP,
  IMPORT_SUCCESS_MESSAGE,
  LIBRARY_SAVE_FAILED_MESSAGE,
  PDF_DOWNLOAD_SUCCESS,
  PDF_GENERATE_FAILED,
  PDF_GENERATING_MESSAGE,
  PDF_NO_CARDS_ERROR,
  PDF_PREVIEW_GENERATING,
  PROJECT_DELETE_CONFIRM_DESCRIPTION,
  PROJECT_DELETE_CONFIRM_TITLE,
  PROJECT_DELETE_SUCCESS_MESSAGE,
  PROJECT_DELETE_TOOLTIP,
  PROJECT_LIST_LABEL,
  PROJECT_LIST_TOOLTIP,
  REDO_TOOLTIP,
  TEMPLATE_APPLY_SUCCESS,
  TEMPLATE_BUTTON_LABEL,
  TEMPLATE_LOAD_ERROR,
  UNDO_TOOLTIP,
  UNKNOWN_ERROR_MESSAGE,
  USER_TEMPLATE_SAVE_SUCCESS_MESSAGE,
} from "@rehab-grid/core/lib/constants";
import { saveUserTemplate } from "@rehab-grid/core/lib/db";
import {
  stateToProjectFile,
  useEditorStore,
} from "@rehab-grid/core/lib/store/useEditorStore";
import { useModalStore } from "@rehab-grid/core/lib/store/useModalStore";
import {
  type BackupCategorySelection,
  type BackupRestoreMode,
  type BackupSummaryCounts,
  type ImportOpenMode,
  type ImportResult,
  type ParsedBackup,
  type TemplateSource,
} from "@rehab-grid/core/types";
import {
  collectCurrentBackupCounts,
  exportBackupAsZIP,
  inspectImportFile,
} from "@rehab-grid/core/utils/backup";
import { downloadBlob } from "@rehab-grid/core/utils/download";
import {
  downloadProjectAsJSON,
  downloadProjectAsZIP,
} from "@rehab-grid/core/utils/export";
import {
  generatePdfFilename,
  preparePdfGenerationData,
} from "@rehab-grid/core/utils/pdf";
import {
  loadTemplate,
  loadUserTemplate,
} from "@rehab-grid/core/utils/template";
import { BackupExportDialog } from "@rehab-grid/ui/components/editor/BackupExportDialog";
import { BackupRestoreDialog } from "@rehab-grid/ui/components/editor/BackupRestoreDialog";
import { DesignSettingsDialog } from "@rehab-grid/ui/components/editor/DesignSettingsDialog";
import { PdfPreviewModal } from "@rehab-grid/ui/components/editor/PdfPreviewModal";
import { ProjectListModal } from "@rehab-grid/ui/components/editor/ProjectListModal";
import { TemplateSelectModal } from "@rehab-grid/ui/components/editor/TemplateSelectModal";
import { MobileDropdownMenu } from "@rehab-grid/ui/components/layout/MobileDropdownMenu";
import { MobileFloatingHeader } from "@rehab-grid/ui/components/layout/MobileFloatingHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@rehab-grid/ui/components/wrapped/AlertDialog";
import { Button } from "@rehab-grid/ui/components/wrapped/Button";
import {
  Files,
  LayoutTemplate,
  Loader2,
  Menu,
  Palette,
  Redo2,
  Trash2,
  Undo2,
  Upload,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { ExportMenu } from "./ExportMenu";
import { ImportConfirmDialog } from "./ImportConfirmDialog";
import { MobileEditorMenu } from "./MobileEditorMenu";
import { PdfMenu } from "./PdfMenu";
import { ProjectInfo } from "./ProjectInfo";

/**
 * EditorHeaderコンポーネントのプロパティ
 */
type EditorHeaderProps = {
  /**
   * アプリ名を非表示にするかどうか
   *
   * @remarks
   * Desktop版ではアイコンのみ表示するため、trueを設定する
   * @default false
   */
  hideAppName?: boolean;
};

/**
 * エディタ専用ヘッダーコンポーネント
 *
 * コンパクトな設計で作業領域を最大化。
 * インポート/エクスポート機能とPDF出力機能を提供します。
 *
 * @param props - コンポーネントのプロパティ
 */
export function EditorHeader({ hideAppName = false }: EditorHeaderProps) {
  // モバイル判定
  const isMobile = useIsMobile();

  // Zustand ストアから状態を取得
  const meta = useEditorStore((state) => state.meta);
  const items = useEditorStore((state) => state.items);
  const settings = useEditorStore((state) => state.settings);
  const openImportResult = useEditorStore((state) => state.openImportResult);
  const restoreBackup = useEditorStore((state) => state.restoreBackup);
  const deleteProject = useEditorStore((state) => state.deleteProject);
  const updateSettings = useEditorStore((state) => state.updateSettings);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  // 関数アクションではなくセレクタで購読し、履歴の増減でボタンを再描画する
  const canUndo = useEditorStore((state) => state.past.length > 0);
  const canRedo = useEditorStore((state) => state.future.length > 0);

  // インポート関連の状態
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingImportResult, setPendingImportResult] =
    useState<ImportResult | null>(null);

  // 一括バックアップ・復元関連の状態
  const [showBackupExportDialog, setShowBackupExportDialog] = useState(false);
  const [showBackupRestoreDialog, setShowBackupRestoreDialog] = useState(false);
  const [backupCounts, setBackupCounts] = useState<BackupSummaryCounts | null>(
    null
  );
  const [pendingBackup, setPendingBackup] = useState<ParsedBackup | null>(null);

  // PDFプレビュー関連の状態
  const [showPreview, setShowPreview] = useState(false);
  const [previewPdfBlob, setPreviewPdfBlob] = useState<Blob | null>(null);

  // テンプレート関連の状態
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // 指導箋一覧（マイ指導箋）の開閉
  const [showProjectList, setShowProjectList] = useState(false);

  // プロジェクト削除関連の状態
  const [showDeleteProjectDialog, setShowDeleteProjectDialog] = useState(false);

  // デザイン設定ダイアログの開閉（Canvas 等からも開けるようストアで管理）
  const isDesignSettingsOpen = useModalStore(
    (state) => state.isDesignSettingsOpen
  );
  const setDesignSettingsOpen = useModalStore(
    (state) => state.setDesignSettingsOpen
  );
  const designSettingsSection = useModalStore(
    (state) => state.designSettingsSection
  );
  const setExerciseCardLibraryOpen = useModalStore(
    (state) => state.setExerciseCardLibraryOpen
  );

  // モバイルメニュー関連の状態
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // PDF生成フック
  const { state: pdfState, generatePdf } = usePdfWorker();

  /**
   * 軽量JSONとしてエクスポート
   */
  const handleExportJSON = useCallback(() => {
    downloadProjectAsJSON(stateToProjectFile({ meta, settings, items }));
  }, [meta, settings, items]);

  /**
   * 完全バックアップ（ZIP）としてエクスポート
   */
  const handleExportZIP = useCallback(() => {
    void downloadProjectAsZIP(stateToProjectFile({ meta, settings, items }));
  }, [meta, settings, items]);

  /**
   * PDFプレビュー
   */
  const handlePreviewPDF = useCallback(async () => {
    if (items.length === 0) {
      toast.error(PDF_NO_CARDS_ERROR);
      return;
    }

    try {
      const pdfData = await preparePdfGenerationData(items, meta, settings);
      if (!pdfData) return;

      toast.info(PDF_PREVIEW_GENERATING);

      const blob = await generatePdf(pdfData);

      if (blob) {
        setPreviewPdfBlob(blob);
        setShowPreview(true);
      } else {
        toast.error(PDF_GENERATE_FAILED);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : PDF_GENERATE_FAILED;
      toast.error(message);
    }
  }, [items, meta, settings, generatePdf]);

  /**
   * PDFダウンロード
   */
  const handleDownloadPDF = useCallback(async () => {
    if (items.length === 0) {
      toast.error(PDF_NO_CARDS_ERROR);
      return;
    }

    try {
      const pdfData = await preparePdfGenerationData(items, meta, settings);
      if (!pdfData) return;

      toast.info(PDF_GENERATING_MESSAGE);

      const blob = await generatePdf(pdfData);

      if (blob) {
        downloadBlob(blob, generatePdfFilename(meta.title));
        toast.success(PDF_DOWNLOAD_SUCCESS);
      } else {
        toast.error(PDF_GENERATE_FAILED);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : PDF_GENERATE_FAILED;
      toast.error(message);
    }
  }, [items, meta, settings, generatePdf]);

  /**
   * プレビューモーダルからのダウンロード
   */
  const handleDownloadFromPreview = useCallback(() => {
    if (previewPdfBlob) {
      downloadBlob(previewPdfBlob, generatePdfFilename(meta.title));
      toast.success(PDF_DOWNLOAD_SUCCESS);
    }
  }, [previewPdfBlob, meta.title]);

  /**
   * プレビューモーダルを閉じる
   */
  const handleClosePreview = useCallback((open: boolean) => {
    setShowPreview(open);
    if (!open) {
      // モーダルが閉じられたらBlobをクリア
      setPreviewPdfBlob(null);
    }
  }, []);

  /**
   * まとめてバックアップダイアログを開く
   */
  const handleOpenBackupExport = useCallback(async () => {
    try {
      const counts = await collectCurrentBackupCounts();
      setBackupCounts(counts);
      setShowBackupExportDialog(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : BACKUP_EXPORT_FAILED_MESSAGE;
      toast.error(message);
    }
  }, []);

  /**
   * まとめてバックアップを実行してダウンロード
   */
  const handleExecuteBackupExport = useCallback(
    async (selection: BackupCategorySelection) => {
      try {
        await exportBackupAsZIP(selection);
        setShowBackupExportDialog(false);
        toast.success(BACKUP_EXPORT_SUCCESS_MESSAGE);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : BACKUP_EXPORT_FAILED_MESSAGE;
        toast.error(message);
      }
    },
    []
  );

  /**
   * バックアップ復元を実行
   */
  const handleExecuteBackupRestore = useCallback(
    async (
      backup: ParsedBackup,
      selection: BackupCategorySelection,
      mode: BackupRestoreMode
    ) => {
      try {
        const summary = await restoreBackup(backup, selection, mode);
        if (summary !== undefined) {
          setShowBackupRestoreDialog(false);
          setPendingBackup(null);
          toast.success(createBackupRestoreSuccessMessage(summary, mode));
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : BACKUP_RESTORE_FAILED_MESSAGE;
        toast.error(message);
      }
    },
    [restoreBackup]
  );

  /**
   * バックアップ復元ダイアログの開閉状態変更
   */
  const handleBackupRestoreDialogOpenChange = useCallback((open: boolean) => {
    setShowBackupRestoreDialog(open);
    if (!open) {
      setPendingBackup(null);
    }
  }, []);

  /**
   * ファイル選択ダイアログを開く
   */
  const handleOpenClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * 単一指導箋のインポート結果をストアへ反映する
   *
   * @param mode - new: 新しい指導箋として開く / overwrite: 現在の指導箋に上書き
   */
  const applySingleImportResult = useCallback(
    async (result: ImportResult, mode: ImportOpenMode) => {
      setIsImporting(true);
      try {
        await openImportResult(result, mode);
        toast.success(IMPORT_SUCCESS_MESSAGE);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : IMPORT_FAILED_MESSAGE;
        toast.error(message);
      } finally {
        setIsImporting(false);
        setPendingImportResult(null);
      }
    },
    [openImportResult]
  );

  /**
   * ファイル選択時の処理（単一指導箋と一括バックアップを中身で自動判別する）
   */
  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // input をリセット（同じファイルを再選択できるように）
      event.target.value = "";

      setIsImporting(true);
      try {
        const inspected = await inspectImportFile(file);

        if (inspected.kind === "backup") {
          const counts = await collectCurrentBackupCounts();
          setPendingBackup(inspected.backup);
          setBackupCounts(counts);
          setShowBackupRestoreDialog(true);
          return;
        }

        // 単一指導箋：編集中のカードがあれば開き方を選ばせる
        // （空の指導箋はそのまま上書きする。空の指導箋を一覧に残さないため）
        if (items.length > 0) {
          setPendingImportResult(inspected.result);
          setShowConfirmDialog(true);
        } else {
          await openImportResult(inspected.result, "overwrite");
          toast.success(IMPORT_SUCCESS_MESSAGE);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : IMPORT_FAILED_MESSAGE;
        toast.error(message);
      } finally {
        setIsImporting(false);
      }
    },
    [items.length, openImportResult]
  );

  /**
   * 確認ダイアログで開き方を選んだとき
   */
  const handleConfirmImport = useCallback(
    (mode: ImportOpenMode) => {
      setShowConfirmDialog(false);
      if (pendingImportResult) {
        void applySingleImportResult(pendingImportResult, mode);
      }
    },
    [pendingImportResult, applySingleImportResult]
  );

  /**
   * 確認ダイアログでのキャンセル
   */
  const handleCancelImport = useCallback(() => {
    setShowConfirmDialog(false);
    setPendingImportResult(null);
  }, []);

  /**
   * 確認ダイアログの開閉状態変更
   */
  const handleDialogOpenChange = useCallback((open: boolean) => {
    setShowConfirmDialog(open);
    if (!open) {
      setPendingImportResult(null);
    }
  }, []);

  /**
   * テンプレート選択モーダルの開閉
   */
  const handleTemplateModalOpenChange = useCallback((open: boolean) => {
    setShowTemplateModal(open);
  }, []);

  /**
   * テンプレートボタンクリック
   */
  const handleTemplateButtonClick = useCallback(() => {
    setShowTemplateModal(true);
  }, []);

  /**
   * テンプレート選択時の処理（公式テンプレート・マイテンプレート）
   */
  const handleTemplateSelect = useCallback(
    async (templateId: string, mode: ImportOpenMode, source: TemplateSource) => {
      try {
        const result =
          source === "user"
            ? await loadUserTemplate(templateId)
            : await loadTemplate(templateId);
        await openImportResult(result, mode);
        toast.success(TEMPLATE_APPLY_SUCCESS);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : TEMPLATE_LOAD_ERROR;
        toast.error(message);
      }
    },
    [openImportResult],
  );

  /**
   * 編集中の指導箋をマイテンプレートとして保存する
   */
  const handleSaveAsUserTemplate = useCallback(
    async (name: string) => {
      try {
        await saveUserTemplate(
          name,
          stateToProjectFile({ meta, settings, items }),
        );
        toast.success(USER_TEMPLATE_SAVE_SUCCESS_MESSAGE);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : LIBRARY_SAVE_FAILED_MESSAGE;
        toast.error(message);
      }
    },
    [meta, settings, items],
  );

  /**
   * マイ運動モーダルを開く（モバイルのメニューから）
   */
  const handleOpenExerciseCards = useCallback(() => {
    setExerciseCardLibraryOpen(true);
  }, [setExerciseCardLibraryOpen]);

  /**
   * 指導箋一覧を開く
   */
  const handleOpenProjectList = useCallback(() => {
    setShowProjectList(true);
  }, []);

  /**
   * プロジェクト削除ダイアログを開く
   */
  const handleOpenDeleteProjectDialog = useCallback(() => {
    setShowDeleteProjectDialog(true);
  }, []);

  /**
   * プロジェクト削除確認時の処理
   *
   * @remarks
   * ストアの deleteProject アクションで編集中のプロジェクトを IndexedDB から削除し、
   * 残りのうち最新の指導箋（なければ新しい空の指導箋）を開く。
   */
  const handleConfirmDeleteProject = useCallback(async () => {
    try {
      await deleteProject();
      setShowDeleteProjectDialog(false);
      toast.success(PROJECT_DELETE_SUCCESS_MESSAGE);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE;
      toast.error(message);
    }
  }, [deleteProject]);

  /**
   * プロジェクト削除キャンセル時の処理
   */
  const handleCancelDeleteProject = useCallback(() => {
    setShowDeleteProjectDialog(false);
  }, []);

  /**
   * プロジェクト削除ダイアログの開閉状態変更
   */
  const handleDeleteProjectDialogOpenChange = useCallback((open: boolean) => {
    setShowDeleteProjectDialog(open);
  }, []);

  /**
   * デザイン設定ダイアログを開く
   */
  const handleOpenDesignSettings = useCallback(() => {
    setDesignSettingsOpen(true);
  }, [setDesignSettingsOpen]);

  /**
   * モバイルメニューを開く
   */
  const handleOpenMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(true);
  }, []);

  /**
   * モバイルメニューを閉じる
   */
  const handleCloseMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  // SSR/ハイドレーション中はスケルトンを表示
  // isMobileが確定するまでコンポーネントツリーを固定し、ハイドレーションエラーを防止
  if (isMobile === undefined) {
    return (
      <header className="h-14 border-b border-border/40 bg-white">
        <div className="flex h-full items-center justify-between px-8">
          {/* 左側: ロゴプレースホルダー */}
          <div className="flex items-center gap-2">
            <div className="size-8 animate-pulse rounded-md bg-muted" />
            <div className="h-5 w-20 animate-pulse rounded bg-muted" />
          </div>
          {/* 右側: ボタンプレースホルダー */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 animate-pulse rounded bg-muted" />
            <div className="h-8 w-24 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      {/* 隠しファイル入力（指導箋ファイル・一括バックアップ ZIP 共通。中身で自動判別する） */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.zip"
        onChange={(event) => void handleFileSelect(event)}
        className="hidden"
        aria-label="読み込むファイルを選択"
      />

      {/* モバイル/デスクトップ版ヘッダーの条件分岐 */}
      {isMobile ? (
        <>
          {/* モバイル版ヘッダー */}
          <MobileFloatingHeader
            leftSlot={
              <Button
                variant="ghost"
                size="icon"
                className="size-10 text-muted-foreground hover:text-foreground"
                onClick={handleOpenMobileMenu}
                aria-label="メニューを開く"
              >
                <Menu className="size-5" />
              </Button>
            }
            centerSlot={<ProjectInfo variant="mobile" />}
            rightSlot={
              <PdfMenu
                onPreview={() => void handlePreviewPDF()}
                onDownload={() => void handleDownloadPDF()}
                isGenerating={pdfState.isGenerating}
                disabled={items.length === 0}
                isMobile
              />
            }
          />

          <MobileDropdownMenu
            open={isMobileMenuOpen}
            onClose={handleCloseMobileMenu}
            title="メニュー"
          >
            <MobileEditorMenu
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
              onProjectListClick={handleOpenProjectList}
              layoutType={settings.layoutType}
              onDesignSettingsClick={handleOpenDesignSettings}
              onTemplateClick={handleTemplateButtonClick}
              onExerciseCardsClick={handleOpenExerciseCards}
              onOpenClick={handleOpenClick}
              isImporting={isImporting}
              onExportJSON={handleExportJSON}
              onExportZIP={handleExportZIP}
              onExportBackup={() => void handleOpenBackupExport()}
              onDeleteProject={handleOpenDeleteProjectDialog}
              onClose={handleCloseMobileMenu}
            />
          </MobileDropdownMenu>
        </>
      ) : (
        /* デスクトップ版ヘッダー */
        <header className="h-14 border-b border-border/40 bg-white">
          <div className="relative flex h-full items-center gap-4 px-4 xl:px-8">
            {/* 左側: ロゴ + アプリ名（右側のボタンに押されて縦に折り返さないよう縮めない） */}
            <div className="relative z-10 flex shrink-0 items-center">
              <Link
                href="/"
                className="flex items-center gap-2 whitespace-nowrap text-lg font-bold tracking-tight transition-colors hover:text-primary"
                title={HOME_LINK_TOOLTIP}
              >
                <Image
                  src="/icons/logo.png"
                  alt=""
                  width={32}
                  height={32}
                  className="rounded-md"
                />
                {!hideAppName && <span>{APP_NAME}</span>}
              </Link>
            </div>

            {/* 右側: プロジェクト情報 + アクションボタン */}
            <div className="ml-auto flex items-center gap-2">
              {/* 元に戻す / やり直す */}
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground"
                onClick={undo}
                disabled={!canUndo}
                title={UNDO_TOOLTIP}
                aria-label={UNDO_TOOLTIP}
              >
                <Undo2 className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground"
                onClick={redo}
                disabled={!canRedo}
                title={REDO_TOOLTIP}
                aria-label={REDO_TOOLTIP}
              >
                <Redo2 className="size-4" />
              </Button>

              {/* 指導箋一覧 + プロジェクト名 + 削除ボタン */}
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={handleOpenProjectList}
                title={PROJECT_LIST_TOOLTIP}
                aria-label={PROJECT_LIST_LABEL}
              >
                <Files className="size-4 text-orange-500" />
                {/* ヘッダーに余裕のない幅（2xl 未満）ではアイコンのみ（ツールチップで補う）。
                    xl で出すと、長いタイトルのときに 1280px 前後で収まらない */}
                <span className="hidden 2xl:inline">
                  {PROJECT_LIST_LABEL}
                </span>
              </Button>
              <ProjectInfo />
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
                onClick={handleOpenDeleteProjectDialog}
                title={PROJECT_DELETE_TOOLTIP}
                aria-label={PROJECT_DELETE_TOOLTIP}
              >
                <Trash2 className="size-4 text-rose-500" />
              </Button>

              {/* セパレーター */}
              <div className="mx-1 h-6 w-px bg-border" />
              {/* ヘッダーに余裕のない幅（xl 未満）ではアイコンのみ（ツールチップで補う） */}
              {/* デザイン設定ボタン */}
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={handleOpenDesignSettings}
                title={DESIGN_SETTINGS_LABEL}
                aria-label={DESIGN_SETTINGS_LABEL}
              >
                <Palette className="size-4 text-sky-500" />
                <span className="hidden xl:inline">{DESIGN_SETTINGS_LABEL}</span>
              </Button>

              {/* テンプレートボタン */}
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={handleTemplateButtonClick}
                title={TEMPLATE_BUTTON_LABEL}
                aria-label={TEMPLATE_BUTTON_LABEL}
              >
                <LayoutTemplate className="size-4 text-violet-500" />
                <span className="hidden xl:inline">{TEMPLATE_BUTTON_LABEL}</span>
              </Button>

              {/* 読み込みボタン（指導箋ファイル・バックアップ ZIP を中身で自動判別） */}
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={handleOpenClick}
                disabled={isImporting}
                title={isImporting ? IMPORT_LOADING_LABEL : IMPORT_OPEN_TOOLTIP}
                aria-label={
                  isImporting ? IMPORT_LOADING_LABEL : IMPORT_OPEN_LABEL
                }
              >
                {isImporting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4 text-emerald-500" />
                )}
                <span className="hidden xl:inline">
                  {isImporting ? IMPORT_LOADING_LABEL : IMPORT_OPEN_LABEL}
                </span>
              </Button>

              {/* 書き出しドロップダウンメニュー */}
              <ExportMenu
                onExportJSON={handleExportJSON}
                onExportZIP={handleExportZIP}
                onExportBackup={() => void handleOpenBackupExport()}
              />

              {/* PDFドロップダウンメニュー */}
              <div className="ml-4">
                <PdfMenu
                  onPreview={() => void handlePreviewPDF()}
                  onDownload={() => void handleDownloadPDF()}
                  isGenerating={pdfState.isGenerating}
                  disabled={items.length === 0}
                  isMobile={isMobile}
                />
              </div>
            </div>
          </div>
        </header>
      )}

      {/* インポートの開き方（新規 / 上書き）の確認ダイアログ */}
      <ImportConfirmDialog
        open={showConfirmDialog}
        onOpenChange={handleDialogOpenChange}
        onConfirm={handleConfirmImport}
        onCancel={handleCancelImport}
      />

      {/* まとめてバックアップダイアログ */}
      <BackupExportDialog
        open={showBackupExportDialog}
        onOpenChange={setShowBackupExportDialog}
        counts={backupCounts}
        onExport={handleExecuteBackupExport}
      />

      {/* バックアップから復元ダイアログ */}
      <BackupRestoreDialog
        open={showBackupRestoreDialog}
        onOpenChange={handleBackupRestoreDialogOpenChange}
        backup={pendingBackup}
        currentCounts={backupCounts}
        onRestore={handleExecuteBackupRestore}
      />

      {/* 指導箋一覧（マイ指導箋） */}
      <ProjectListModal
        open={showProjectList}
        onOpenChange={setShowProjectList}
      />

      {/* PDFプレビューモーダル */}
      <PdfPreviewModal
        open={showPreview}
        onOpenChange={handleClosePreview}
        pdfBlob={previewPdfBlob}
        onDownload={handleDownloadFromPreview}
      />

      {/* テンプレート選択モーダル */}
      <TemplateSelectModal
        open={showTemplateModal}
        onOpenChange={handleTemplateModalOpenChange}
        onSelect={handleTemplateSelect}
        requireConfirmation={items.length > 0}
        currentTitle={meta.title}
        canSaveCurrent={items.length > 0}
        onSaveCurrent={handleSaveAsUserTemplate}
      />

      {/* デザイン設定ダイアログ */}
      <DesignSettingsDialog
        open={isDesignSettingsOpen}
        onOpenChange={setDesignSettingsOpen}
        settings={settings}
        onSettingsChange={updateSettings}
        initialSection={designSettingsSection}
      />

      {/* プロジェクト削除確認ダイアログ */}
      <AlertDialog
        open={showDeleteProjectDialog}
        onOpenChange={handleDeleteProjectDialogOpenChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{PROJECT_DELETE_CONFIRM_TITLE}</AlertDialogTitle>
            <AlertDialogDescription>
              {PROJECT_DELETE_CONFIRM_DESCRIPTION}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDeleteProject}>
              {BUTTON_CANCEL}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteProject}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {BUTTON_DELETE}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
