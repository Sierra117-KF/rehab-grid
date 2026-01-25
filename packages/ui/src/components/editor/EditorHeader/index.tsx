"use client";

import { useIsMobile } from "@rehab-grid/core/hooks/useMediaQuery";
import { usePdfWorker } from "@rehab-grid/core/hooks/usePdfWorker";
import {
  APP_NAME,
  BUTTON_CANCEL,
  BUTTON_DELETE,
  GRID_SELECT_BUTTON_LABEL,
  HOME_LINK_TOOLTIP,
  IMPORT_FAILED_MESSAGE,
  IMPORT_LOADING_LABEL,
  IMPORT_OPEN_LABEL,
  IMPORT_SUCCESS_MESSAGE,
  PDF_DOWNLOAD_SUCCESS,
  PDF_GENERATE_FAILED,
  PDF_GENERATING_MESSAGE,
  PDF_NO_CARDS_ERROR,
  PDF_PREVIEW_GENERATING,
  PROJECT_DELETE_CONFIRM_DESCRIPTION,
  PROJECT_DELETE_CONFIRM_TITLE,
  PROJECT_DELETE_SUCCESS_MESSAGE,
  PROJECT_DELETE_TOOLTIP,
  TEMPLATE_APPLY_SUCCESS,
  TEMPLATE_BUTTON_LABEL,
  TEMPLATE_LOAD_ERROR,
  UNKNOWN_ERROR_MESSAGE,
} from "@rehab-grid/core/lib/constants";
import { useEditorStore } from "@rehab-grid/core/lib/store/useEditorStore";
import { downloadBlob } from "@rehab-grid/core/utils/download";
import {
  downloadProjectAsJSON,
  downloadProjectAsZIP,
  importProject,
} from "@rehab-grid/core/utils/export";
import {
  generatePdfFilename,
  preparePdfGenerationData,
} from "@rehab-grid/core/utils/pdf";
import {
  applyImportResult,
  createProjectFile,
  createProjectSettings,
} from "@rehab-grid/core/utils/project";
import { loadTemplate } from "@rehab-grid/core/utils/template";
import { GridSelectDialog } from "@rehab-grid/ui/components/editor/GridSelectDialog";
import { PdfPreviewModal } from "@rehab-grid/ui/components/editor/PdfPreviewModal";
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
  FolderOpen,
  Grid3x3,
  LayoutTemplate,
  Loader2,
  Menu,
  Trash2,
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
  const layoutType = useEditorStore((state) => state.layoutType);
  const themeColor = useEditorStore((state) => state.themeColor);
  const initializeFromDB = useEditorStore((state) => state.initializeFromDB);
  const deleteProject = useEditorStore((state) => state.deleteProject);
  const setLayoutType = useEditorStore((state) => state.setLayoutType);

  // インポート関連の状態
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // PDFプレビュー関連の状態
  const [showPreview, setShowPreview] = useState(false);
  const [previewPdfBlob, setPreviewPdfBlob] = useState<Blob | null>(null);

  // テンプレート関連の状態
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // プロジェクト削除関連の状態
  const [showDeleteProjectDialog, setShowDeleteProjectDialog] = useState(false);

  // グリッド選択関連の状態
  const [showGridSelectDialog, setShowGridSelectDialog] = useState(false);

  // モバイルメニュー関連の状態
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // PDF生成フック
  const { state: pdfState, generatePdf } = usePdfWorker();

  /**
   * 軽量JSONとしてエクスポート
   */
  const handleExportJSON = useCallback(() => {
    const settings = createProjectSettings(layoutType, themeColor);
    const project = createProjectFile(meta, settings, items);
    downloadProjectAsJSON(project);
  }, [meta, items, layoutType, themeColor]);

  /**
   * 完全バックアップ（ZIP）としてエクスポート
   */
  const handleExportZIP = useCallback(() => {
    const settings = createProjectSettings(layoutType, themeColor);
    const project = createProjectFile(meta, settings, items);
    void downloadProjectAsZIP(project);
  }, [meta, items, layoutType, themeColor]);

  /**
   * PDFプレビュー
   */
  const handlePreviewPDF = useCallback(async () => {
    if (items.length === 0) {
      toast.error(PDF_NO_CARDS_ERROR);
      return;
    }

    try {
      const pdfData = await preparePdfGenerationData(items, meta, layoutType);
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
  }, [items, meta, layoutType, generatePdf]);

  /**
   * PDFダウンロード
   */
  const handleDownloadPDF = useCallback(async () => {
    if (items.length === 0) {
      toast.error(PDF_NO_CARDS_ERROR);
      return;
    }

    try {
      const pdfData = await preparePdfGenerationData(items, meta, layoutType);
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
  }, [items, meta, layoutType, generatePdf]);

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
   * ファイル選択ダイアログを開く
   */
  const handleOpenClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * インポートを実行
   */
  const executeImport = useCallback(
    async (file: File) => {
      setIsImporting(true);
      try {
        const result = await importProject(file);
        await applyImportResult(result, initializeFromDB);
        toast.success(IMPORT_SUCCESS_MESSAGE);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : IMPORT_FAILED_MESSAGE;
        toast.error(message);
      } finally {
        setIsImporting(false);
        setPendingFile(null);
      }
    },
    [initializeFromDB],
  );

  /**
   * ファイル選択時の処理
   */
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // input をリセット（同じファイルを再選択できるように）
      event.target.value = "";

      // 既存データがあれば確認ダイアログを表示
      if (items.length > 0) {
        setPendingFile(file);
        setShowConfirmDialog(true);
      } else {
        void executeImport(file);
      }
    },
    [items.length, executeImport],
  );

  /**
   * 確認ダイアログでの続行
   */
  const handleConfirmImport = useCallback(() => {
    setShowConfirmDialog(false);
    if (pendingFile) {
      void executeImport(pendingFile);
    }
  }, [pendingFile, executeImport]);

  /**
   * 確認ダイアログでのキャンセル
   */
  const handleCancelImport = useCallback(() => {
    setShowConfirmDialog(false);
    setPendingFile(null);
  }, []);

  /**
   * 確認ダイアログの開閉状態変更
   */
  const handleDialogOpenChange = useCallback((open: boolean) => {
    setShowConfirmDialog(open);
    if (!open) {
      setPendingFile(null);
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
   * テンプレート選択時の処理
   */
  const handleTemplateSelect = useCallback(
    async (templateId: string) => {
      try {
        const result = await loadTemplate(templateId);
        await applyImportResult(result, initializeFromDB);
        toast.success(TEMPLATE_APPLY_SUCCESS);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : TEMPLATE_LOAD_ERROR;
        toast.error(message);
      }
    },
    [initializeFromDB],
  );

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
   * ストアの deleteProject アクションを使用して、IndexedDB削除と
   * ストア状態のリセットを一括で実行する。
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
   * グリッド選択ダイアログを開く
   */
  const handleOpenGridSelectDialog = useCallback(() => {
    setShowGridSelectDialog(true);
  }, []);

  /**
   * グリッド選択ダイアログの開閉状態変更
   */
  const handleGridSelectDialogOpenChange = useCallback((open: boolean) => {
    setShowGridSelectDialog(open);
  }, []);

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
      {/* 隠しファイル入力（共通） */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.zip"
        onChange={handleFileSelect}
        className="hidden"
        aria-label="プロジェクトファイルを選択"
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
              layoutType={layoutType}
              onGridSelectClick={handleOpenGridSelectDialog}
              onTemplateClick={handleTemplateButtonClick}
              onOpenClick={handleOpenClick}
              isImporting={isImporting}
              onExportJSON={handleExportJSON}
              onExportZIP={handleExportZIP}
              onDeleteProject={handleOpenDeleteProjectDialog}
              onClose={handleCloseMobileMenu}
            />
          </MobileDropdownMenu>
        </>
      ) : (
        /* デスクトップ版ヘッダー */
        <header className="h-14 border-b border-border/40 bg-white">
          <div className="relative flex h-full items-center px-8">
            {/* 左側: ロゴ + アプリ名 */}
            <div className="relative z-10 flex items-center">
              <Link
                href="/"
                className="flex items-center gap-2 text-lg font-bold tracking-tight transition-colors hover:text-primary"
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
              {/* プロジェクト名 + 削除ボタン */}
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
              {/* グリッド選択ボタン */}
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={handleOpenGridSelectDialog}
              >
                <Grid3x3 className="size-4 text-sky-500" />
                <span>{GRID_SELECT_BUTTON_LABEL}</span>
              </Button>

              {/* テンプレートボタン */}
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={handleTemplateButtonClick}
              >
                <LayoutTemplate className="size-4 text-violet-500" />
                <span>{TEMPLATE_BUTTON_LABEL}</span>
              </Button>

              {/* 開くボタン */}
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={handleOpenClick}
                disabled={isImporting}
              >
                {isImporting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <FolderOpen className="size-4 text-emerald-500" />
                )}
                <span>
                  {isImporting ? IMPORT_LOADING_LABEL : IMPORT_OPEN_LABEL}
                </span>
              </Button>

              {/* エクスポートドロップダウンメニュー */}
              <ExportMenu
                onExportJSON={handleExportJSON}
                onExportZIP={handleExportZIP}
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

      {/* 上書き確認ダイアログ */}
      <ImportConfirmDialog
        open={showConfirmDialog}
        onOpenChange={handleDialogOpenChange}
        onConfirm={handleConfirmImport}
        onCancel={handleCancelImport}
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
      />

      {/* グリッド選択ダイアログ */}
      <GridSelectDialog
        open={showGridSelectDialog}
        onOpenChange={handleGridSelectDialogOpenChange}
        layoutType={layoutType}
        onLayoutChange={setLayoutType}
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
