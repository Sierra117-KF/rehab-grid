"use client";

import {
  BUTTON_CANCEL,
  BUTTON_DELETE,
  createProjectDeleteConfirmDescription,
  DEFAULT_PROJECT_TITLE,
  getLayoutLabel,
  PROJECT_CREATE_SUCCESS_MESSAGE,
  PROJECT_DELETE_CONFIRM_TITLE,
  PROJECT_DELETE_SUCCESS_MESSAGE,
  PROJECT_DUPLICATE_SUCCESS_MESSAGE,
  PROJECT_LIST_BACKUP_NOTICE,
  PROJECT_LIST_CURRENT_BADGE,
  PROJECT_LIST_DELETE_LABEL,
  PROJECT_LIST_DESCRIPTION,
  PROJECT_LIST_DUPLICATE_LABEL,
  PROJECT_LIST_LABEL,
  PROJECT_LIST_NEW_LABEL,
  PROJECT_LIST_NO_MATCHES,
  PROJECT_LIST_SEARCH_LABEL,
  PROJECT_LIST_SEARCH_PLACEHOLDER,
  PROJECT_SWITCH_FAILED_MESSAGE,
  TEMPLATE_CARD_COUNT_LABEL,
  UNKNOWN_ERROR_MESSAGE,
} from "@rehab-grid/core/lib/constants";
import { listProjects } from "@rehab-grid/core/lib/db";
import { useEditorStore } from "@rehab-grid/core/lib/store/useEditorStore";
import { cn } from "@rehab-grid/core/lib/utils";
import { type ProjectSummary } from "@rehab-grid/core/types";
import { formatJapaneseDate } from "@rehab-grid/core/utils/date";
import { matchesSearchQuery } from "@rehab-grid/core/utils/search";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@rehab-grid/ui/components/wrapped/Dialog";
import { Input } from "@rehab-grid/ui/components/wrapped/Input";
import { useLiveQuery } from "dexie-react-hooks";
import { Copy, FileText, Info, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

/**
 * ProjectListModal の Props
 */
export type ProjectListModalProps = {
  /** モーダルの開閉状態 */
  open: boolean;
  /** 開閉状態変更ハンドラ */
  onOpenChange: (open: boolean) => void;
};

/**
 * 更新日時を「2026年11月26日 14:05」形式で表す
 */
function formatUpdatedAt(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${formatJapaneseDate(date)} ${hours}:${minutes}`;
}

/**
 * 表示用のタイトル（空なら既定のタイトル）
 */
function getDisplayTitle(title: string): string {
  return title.trim() || DEFAULT_PROJECT_TITLE;
}

/**
 * 例外からトーストに出すメッセージを取り出す
 */
function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE;
}

/**
 * ProjectRow の Props
 */
type ProjectRowProps = {
  /** プロジェクトの概要 */
  project: ProjectSummary;
  /** 編集中のプロジェクトか */
  isCurrent: boolean;
  /** 操作を無効にするか（切り替え等の処理中） */
  disabled: boolean;
  /** 開く */
  onOpen: () => void;
  /** 複製する */
  onDuplicate: () => void;
  /** 削除する（確認ダイアログを開く） */
  onDelete: () => void;
};

/**
 * 指導箋一覧の 1 行
 */
function ProjectRow({
  project,
  isCurrent,
  disabled,
  onOpen,
  onDuplicate,
  onDelete,
}: ProjectRowProps) {
  const title = getDisplayTitle(project.title);

  return (
    <li
      className={cn(
        "flex items-center gap-2 rounded-lg border p-2 transition-colors",
        isCurrent
          ? "border-orange-500 bg-orange-50"
          : "border-border bg-card hover:border-orange-400/50 hover:bg-orange-50/50"
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        disabled={disabled}
        aria-current={isCurrent ? "true" : undefined}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-3 rounded-md px-1 py-1 text-left",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500",
          "disabled:cursor-not-allowed disabled:opacity-60"
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-linear-to-br from-orange-100 to-amber-100">
          <FileText className="size-4 text-orange-600" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-semibold text-foreground">
              {title}
            </span>
            {isCurrent ? (
              <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary">
                {PROJECT_LIST_CURRENT_BADGE}
              </span>
            ) : null}
          </span>
          {/* 狭い画面でもカード枚数・レイアウトが見えるよう、切り詰めずに折り返す */}
          <span className="mt-0.5 block text-xs text-muted-foreground">
            <span className="whitespace-nowrap">
              {formatUpdatedAt(project.updatedAt)}
            </span>{" "}
            <span className="whitespace-nowrap">
              ・ {project.cardCount}
              {TEMPLATE_CARD_COUNT_LABEL} ・ {getLayoutLabel(project.layoutType)}
            </span>
          </span>
        </span>
      </button>

      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={onDuplicate}
        disabled={disabled}
        title={PROJECT_LIST_DUPLICATE_LABEL}
        aria-label={`${title}を${PROJECT_LIST_DUPLICATE_LABEL}`}
      >
        <Copy className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
        disabled={disabled}
        title={PROJECT_LIST_DELETE_LABEL}
        aria-label={`${title}を${PROJECT_LIST_DELETE_LABEL}`}
      >
        <Trash2 className="size-4 text-rose-500" />
      </Button>
    </li>
  );
}

/**
 * 指導箋一覧モーダル（マイ指導箋ライブラリ）
 *
 * IndexedDB に保存した指導箋の一覧（タイトル・更新日時・カード枚数・レイアウト）を表示し、
 * タイトル検索・切り替え・新規作成・複製・削除を行う。
 */
export function ProjectListModal({
  open,
  onOpenChange: handleOpenChange,
}: ProjectListModalProps) {
  const projectId = useEditorStore((state) => state.projectId);
  const meta = useEditorStore((state) => state.meta);
  const cardCount = useEditorStore((state) => state.items.length);
  const layoutType = useEditorStore((state) => state.settings.layoutType);
  const isSwitchingProject = useEditorStore(
    (state) => state.isSwitchingProject
  );
  const switchProject = useEditorStore((state) => state.switchProject);
  const createProject = useEditorStore((state) => state.createProject);
  const duplicateProject = useEditorStore((state) => state.duplicateProject);
  const deleteProject = useEditorStore((state) => state.deleteProject);

  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ProjectSummary | null>(
    null
  );

  // 保存済みの指導箋（オートセーブのたびに更新される）
  const savedProjects = useLiveQuery(listProjects, []);

  // 編集中の指導箋は保存前の変更がストアにしかないため、ストアの値で上書きする
  // （新規作成直後でまだ保存されていない場合は先頭に加える）
  const projects = useMemo((): ProjectSummary[] => {
    const current: ProjectSummary = {
      id: projectId,
      title: meta.title,
      updatedAt: new Date(meta.updatedAt),
      cardCount,
      layoutType,
    };
    const saved = savedProjects ?? [];
    const savedCurrent = saved.find((project) => project.id === projectId);
    if (savedCurrent === undefined) return [current, ...saved];
    return saved.map((project) =>
      project.id === projectId
        ? { ...current, updatedAt: savedCurrent.updatedAt }
        : project
    );
  }, [savedProjects, projectId, meta, cardCount, layoutType]);

  const filteredProjects = projects.filter((project) =>
    matchesSearchQuery(getDisplayTitle(project.title), searchQuery)
  );

  /** モーダルを閉じたら検索語を戻す */
  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setSearchQuery("");
    handleOpenChange(nextOpen);
  };

  /** 指導箋を開く（編集中の指導箋なら閉じるだけ） */
  const handleOpen = async (id: string) => {
    try {
      await switchProject(id);
      handleDialogOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : PROJECT_SWITCH_FAILED_MESSAGE
      );
    }
  };

  /** 新しい指導箋を作って開く */
  const handleCreate = async () => {
    try {
      await createProject();
      handleDialogOpenChange(false);
      toast.success(PROJECT_CREATE_SUCCESS_MESSAGE);
    } catch (error) {
      toast.error(toErrorMessage(error));
    }
  };

  /** 指導箋を複製する（一覧は開いたまま） */
  const handleDuplicate = async (id: string) => {
    try {
      const newId = await duplicateProject(id);
      if (newId !== undefined) toast.success(PROJECT_DUPLICATE_SUCCESS_MESSAGE);
    } catch (error) {
      toast.error(toErrorMessage(error));
    }
  };

  /** 削除を確定する */
  const handleConfirmDelete = async () => {
    if (deleteTarget === null) return;
    try {
      await deleteProject(deleteTarget.id);
      toast.success(PROJECT_DELETE_SUCCESS_MESSAGE);
    } catch (error) {
      toast.error(toErrorMessage(error));
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col">
          <DialogHeader>
            <DialogTitle>{PROJECT_LIST_LABEL}</DialogTitle>
            <DialogDescription>{PROJECT_LIST_DESCRIPTION}</DialogDescription>
          </DialogHeader>

          {/* 検索 + 新規作成 */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-48 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                aria-label={PROJECT_LIST_SEARCH_LABEL}
                placeholder={PROJECT_LIST_SEARCH_PLACEHOLDER}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
                className="pl-9"
              />
            </div>
            <Button
              onClick={() => void handleCreate()}
              disabled={isSwitchingProject}
              className="gap-2"
            >
              <Plus className="size-4" />
              {PROJECT_LIST_NEW_LABEL}
            </Button>
          </div>

          {/* 一覧 */}
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {filteredProjects.length > 0 ? (
              <ul className="space-y-2">
                {filteredProjects.map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    isCurrent={project.id === projectId}
                    disabled={isSwitchingProject}
                    onOpen={() => void handleOpen(project.id)}
                    onDuplicate={() => void handleDuplicate(project.id)}
                    onDelete={() => {
                      setDeleteTarget(project);
                    }}
                  />
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {PROJECT_LIST_NO_MATCHES}
              </p>
            )}
          </div>

          {/* バックアップの案内（ブラウザにデータを消されたときの備え） */}
          <p className="flex items-start gap-2 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            <span>{PROJECT_LIST_BACKUP_NOTICE}</span>
          </p>

          {/* 削除確認ダイアログ（React ツリー上で一覧のモーダルの中に置き、
              確認ダイアログ内のクリックを一覧の「外側のクリック」とみなして閉じないようにする） */}
          <AlertDialog
            open={deleteTarget !== null}
            onOpenChange={(nextOpen) => {
              if (!nextOpen) setDeleteTarget(null);
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{PROJECT_DELETE_CONFIRM_TITLE}</AlertDialogTitle>
                <AlertDialogDescription>
                  {createProjectDeleteConfirmDescription(
                    getDisplayTitle(deleteTarget?.title ?? "")
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{BUTTON_CANCEL}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => void handleConfirmDelete()}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  {BUTTON_DELETE}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DialogContent>
      </Dialog>
  );
}
