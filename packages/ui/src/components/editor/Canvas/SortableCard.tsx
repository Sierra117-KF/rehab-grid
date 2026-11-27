"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  DUPLICATE_TOOLTIP,
  IMAGE_DRAG_TYPE,
  IMAGE_FLIP_TOOLTIP,
  INLINE_EDIT_HINT,
  LABELS,
  LONG_PRESS_DURATION,
} from "@rehab-grid/core/lib/constants";
import { resolveSheetHeader } from "@rehab-grid/core/lib/settings";
import { cn } from "@rehab-grid/core/lib/utils";
import type {
  DosageLabels,
  EditorItem,
  LayoutType,
  ResolvedProjectSettings,
  TextScale,
} from "@rehab-grid/core/types";
import { Copy, FlipHorizontal2, GripVertical, Pencil } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import {
  type CardBodyProps,
  type CardInlineEdit,
  type ContentTouchHandlers,
  type InlineEditField,
  type InlineEditUpdates,
} from "./cardTypes";
import { SlideCardBody } from "./SlideCardBody";
import { VerticalCardBody } from "./VerticalCardBody";

/** スライドの設定を省略したときの既定値（ヘッダーの既定値・カラー） */
const DEFAULT_SLIDE_SETTINGS: Pick<
  ResolvedProjectSettings,
  "header" | "printColorMode"
> = {
  header: resolveSheetHeader(undefined),
  printColorMode: "color",
};

/** モバイルの操作ボタン（ドラッグハンドル・編集）の見た目 */
const MOBILE_ACTION_BUTTON_CLASS = cn(
  "flex size-9 items-center justify-center rounded-full border border-gray-400",
  "bg-gray-200/90 text-gray-700 shadow-md",
  "transition-colors active:bg-gray-400 active:text-gray-900"
);

/**
 * カード右上のホバーアクションボタン（デスクトップ用）
 */
function HoverActionButton({
  label,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex size-8 items-center justify-center rounded-full border border-border",
        "bg-background/90 text-muted-foreground shadow-sm",
        "opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100",
        "hover:text-primary disabled:cursor-not-allowed disabled:hover:text-muted-foreground"
      )}
      // カードのルート要素には dnd-kit の listeners（ドラッグ開始）と選択用の onClick が付いている。
      // ボタン操作でドラッグや選択が起きないよう、ポインター・キー・クリックの伝播を止める。
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  );
}

/**
 * ソート可能なカードの Props
 */
export type SortableCardProps = {
  /** アイテムデータ */
  item: EditorItem;
  /** 選択状態 */
  isSelected: boolean;
  /** クリック時のコールバック */
  onClick: () => void;
  /** ドラッグ中かどうか */
  isDragging?: boolean;
  /** 画像がドロップされたときのコールバック */
  onImageDrop?: (imageId: string) => void;
  /** 画像のサムネイルURL */
  imageUrl?: string;
  /** キャンバスのドラッグオーバー状態をリセットするコールバック */
  onCanvasDragEnd?: () => void;
  /** 複製ボタン（デスクトップのホバーアクション）が押されたときのコールバック */
  onDuplicate?: () => void;
  /** 画像の左右反転ボタン（デスクトップのホバーアクション）が押されたときのコールバック */
  onFlipImage?: () => void;
  /** 画像の処理中かどうか（処理中は左右反転ボタンを押せない） */
  isImageProcessing?: boolean;

  // モバイル用プロパティ
  /** 画像領域がタップされたときのコールバック（モバイル用） */
  onImageAreaClick?: (itemId: string) => void;
  /** 設定アイコンがタップされたときのコールバック（モバイル用） */
  onSettingsClick?: (itemId: string) => void;
  /** モバイルモードかどうか */
  isMobile?: boolean;

  // レイアウト設定
  /** レイアウトタイプ（4列時のバッジレイアウト変更用） */
  layoutType?: LayoutType;
  /** 文字サイズの設定（省略時は標準） */
  textScale?: TextScale;
  /** タイトルの左に表示するカード番号（省略時はバッジを表示しない） */
  cardNumber?: number;
  /** 用量のラベル（省略時は LABELS の回数・セット・頻度） */
  dosageLabels?: DosageLabels;
  /**
   * スライドのカードの大きさと説明・注意点の行数を決める設定
   *
   * @remarks
   * layoutType が "slide" のときだけ使う（省略時はヘッダーの既定値・カラー）
   */
  slideSettings?: Pick<ResolvedProjectSettings, "header" | "printColorMode">;
  /**
   * カード上でタイトル・用量を編集して確定したときのコールバック（デスクトップのみ）
   *
   * @remarks
   * 指定したときだけ、選択中のカードのタイトル・用量の数値をダブルクリックで編集できる
   */
  onInlineEdit?: (updates: InlineEditUpdates) => void;
};

/**
 * ソート可能なカードコンポーネント
 *
 * dnd-kit の useSortable フックを使用してドラッグ可能なカードを実装。
 * ドラッグ・選択・画像のドロップ・操作ボタン・インライン編集の状態を受け持ち、中身の描画は
 * VerticalCardBody（スライドは SlideCardBody）に任せる
 */
export function SortableCard({
  item,
  isSelected,
  onClick,
  isDragging = false,
  onImageDrop,
  imageUrl,
  onCanvasDragEnd,
  onDuplicate,
  onFlipImage,
  isImageProcessing = false,
  onImageAreaClick,
  onSettingsClick,
  isMobile = false,
  layoutType,
  textScale = "standard",
  cardNumber,
  dosageLabels = LABELS,
  slideSettings = DEFAULT_SLIDE_SETTINGS,
  onInlineEdit,
}: SortableCardProps) {
  const [isImageDragOver, setIsImageDragOver] = useState(false);
  const isSlide = layoutType === "slide";

  // インライン編集は選択中のカードだけ。選択が外れたら編集をやめる（レンダー中に前回の選択状態と比べる）
  const canInlineEdit = isSelected && onInlineEdit !== undefined;
  const [editingField, setEditingField] = useState<InlineEditField | null>(
    null
  );
  const [wasSelected, setWasSelected] = useState(isSelected);
  if (wasSelected !== isSelected) {
    setWasSelected(isSelected);
    if (!isSelected) setEditingField(null);
  }

  /**
   * インライン編集を確定する（変化がなければストア側で履歴を積まない）
   */
  const commitInlineEdit = (field: InlineEditField, value: string) => {
    setEditingField(null);
    if (field === "title") {
      onInlineEdit?.({ title: value });
      return;
    }
    onInlineEdit?.({
      dosages: {
        reps: item.dosages?.reps ?? "",
        sets: item.dosages?.sets ?? "",
        frequency: item.dosages?.frequency ?? "",
        [field]: value,
      },
    });
  };

  const inlineEdit: CardInlineEdit = {
    canEdit: canInlineEdit,
    editingField: canInlineEdit ? editingField : null,
    // ダブルクリックで編集を始めるための props（編集できないときは何も付けない）
    triggerProps: (field) =>
      canInlineEdit
        ? {
            title: INLINE_EDIT_HINT,
            onDoubleClick: () => setEditingField(field),
          }
        : {},
    commit: commitInlineEdit,
    cancel: () => setEditingField(null),
  };

  // ロングプレス用タイマーRef
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    // 枠線の色はテーマカラー（Canvas が上書きする CSS 変数）。Tailwind を読み込まないテストでも実測できるようインライン style で参照する
    borderColor: "var(--card-border-color)",
  };

  const isCurrentlyDragging = isDragging || isSortableDragging;

  // 表示できている画像だけを反転の対象にする（参照切れ画像は対象外）
  const hasImage = item.imageSource !== "" && imageUrl !== undefined;
  const canFlipImage = hasImage && onFlipImage !== undefined;

  /**
   * ロングプレスタイマーをクリア
   */
  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  /**
   * コンテンツエリアのタッチ開始時の処理（モバイル用ロングプレス）
   */
  const handleContentTouchStart = useCallback(() => {
    if (!isMobile || onSettingsClick === undefined) return;

    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      onSettingsClick(item.id);
      longPressTimerRef.current = null;
    }, LONG_PRESS_DURATION);
  }, [isMobile, onSettingsClick, item.id, clearLongPressTimer]);

  /**
   * コンテンツエリアのタッチ終了/キャンセル時の処理
   */
  const handleContentTouchEnd = useCallback(() => {
    clearLongPressTimer();
  }, [clearLongPressTimer]);

  const touchHandlers: ContentTouchHandlers = {
    onTouchStart: handleContentTouchStart,
    onTouchEnd: handleContentTouchEnd,
    onTouchMove: handleContentTouchEnd,
    onTouchCancel: handleContentTouchEnd,
  };

  /**
   * 画像ドラッグオーバー時の処理
   */
  const handleImageDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      // 画像ライブラリからのドラッグのみ受け付ける
      if (e.dataTransfer.types.includes(IMAGE_DRAG_TYPE)) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "copy";
        setIsImageDragOver(true);
      }
    },
    []
  );

  /**
   * 画像ドラッグリーブ時の処理
   */
  const handleImageDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      // カード内の子要素間を移動しただけの場合は何もしない（ちらつき防止）
      if (e.currentTarget.contains(e.relatedTarget as Node)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      setIsImageDragOver(false);
    },
    []
  );

  /**
   * 画像ドロップ時の処理
   */
  const handleImageDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsImageDragOver(false);
      // キャンバスのドラッグオーバー状態もリセット
      onCanvasDragEnd?.();

      const imageId = e.dataTransfer.getData(IMAGE_DRAG_TYPE);
      if (imageId && onImageDrop) {
        onImageDrop(imageId);
      }
    },
    [onImageDrop, onCanvasDragEnd]
  );

  // モバイル用: ドラッグハンドル（縦型は左上に重ねて常時表示）
  const mobileDragHandle = isMobile ? (
    <button
      type="button"
      {...attributes}
      {...listeners}
      className={cn(
        !isSlide && "absolute left-2 top-2 z-20",
        MOBILE_ACTION_BUTTON_CLASS,
        "touch-none cursor-grab active:cursor-grabbing"
      )}
      aria-label="ドラッグして並べ替え"
    >
      <GripVertical className="size-5" />
    </button>
  ) : null;

  // モバイル用: 設定アイコン（縦型は右上に重ねて常時表示）
  const mobileSettingsButton =
    isMobile && onSettingsClick ? (
      <button
        type="button"
        className={cn(
          !isSlide && "absolute right-2 top-2 z-20",
          MOBILE_ACTION_BUTTON_CLASS
        )}
        onClick={(e) => {
          e.stopPropagation();
          onSettingsClick(item.id);
        }}
        aria-label="カードを編集"
      >
        <Pencil className="size-5" />
      </button>
    ) : null;

  const cardBodyProps: CardBodyProps = {
    item,
    imageUrl: hasImage ? imageUrl : undefined,
    isImageDragOver,
    isMobile,
    onImageAreaClick,
    layoutType,
    cardNumber,
    dosageLabels,
    inlineEdit,
    touchHandlers,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      // デスクトップ時のみカード全体をドラッグ可能に
      {...(!isMobile && { ...attributes, ...listeners })}
      data-testid={`card-${item.id}`}
      data-selected={isSelected ? "true" : "false"}
      className={cn(
        "group relative rounded-xl bg-card transition-all duration-200",
        isMobile ? "cursor-default" : "cursor-pointer",
        isCurrentlyDragging && "z-50 scale-[1.02] shadow-2xl opacity-90",
        // 枠線はテーマカラー。選択中は枠線から離したオレンジ（--primary）のリングで区別する
        isSelected
          ? "border-2 ring-2 ring-primary ring-offset-2 ring-offset-background"
          : "border hover:shadow-md",
        "animate-fade-in"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onDragOver={handleImageDragOver}
      onDragLeave={handleImageDragLeave}
      onDrop={handleImageDrop}
    >
      {/*
        モバイルのスライドは最上部に左寄せのタイトルが来るため、操作ボタンをタイトルに重ねず、
        スライドの上に独立した操作バーとして置く
      */}
      {isMobile && isSlide ? (
        <div
          data-testid="slide-mobile-actions"
          className="flex items-center justify-between px-2 pt-2"
        >
          {mobileDragHandle}
          {mobileSettingsButton}
        </div>
      ) : (
        <>
          {mobileDragHandle}
          {mobileSettingsButton}
        </>
      )}

      {/* デスクトップ用: ホバーアクション（ホバー・フォーカス時に右上へ表示） */}
      {!isMobile && (onDuplicate || canFlipImage) ? (
        <div className="absolute right-2 top-2 z-20 flex gap-1.5">
          {canFlipImage ? (
            <HoverActionButton
              label={IMAGE_FLIP_TOOLTIP}
              disabled={isImageProcessing}
              onClick={onFlipImage}
            >
              <FlipHorizontal2 className="size-4" />
            </HoverActionButton>
          ) : null}
          {onDuplicate ? (
            <HoverActionButton label={DUPLICATE_TOOLTIP} onClick={onDuplicate}>
              <Copy className="size-4" />
            </HoverActionButton>
          ) : null}
        </div>
      ) : null}

      {/* カードコンテンツ */}
      {isSlide ? (
        <SlideCardBody {...cardBodyProps} slideSettings={slideSettings} />
      ) : (
        <VerticalCardBody {...cardBodyProps} textScale={textScale} />
      )}
    </div>
  );
}
