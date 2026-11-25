"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CANVAS_DROP_HERE,
  CARD_NUMBER_BADGE_RATIO,
  createInlineDosageInputLabel,
  DUPLICATE_TOOLTIP,
  EDITOR_TEXT_STYLE,
  EDITOR_TEXT_STYLE_LARGE,
  EDITOR_TEXT_STYLE_SINGLE_COLUMN,
  IMAGE_DRAG_TYPE,
  IMAGE_FLIP_TOOLTIP,
  INLINE_EDIT_HINT,
  INLINE_EDIT_TITLE_LABEL,
  LABELS,
  LONG_PRESS_DURATION,
  MOBILE_TAP_TO_SELECT_IMAGE,
  TEXT_LIMITS,
} from "@rehab-grid/core/lib/constants";
import { cn } from "@rehab-grid/core/lib/utils";
import type {
  BadgeType,
  DosageLabels,
  EditorItem,
  LayoutType,
  TextScale,
} from "@rehab-grid/core/types";
import { getDosageBadgeLayout } from "@rehab-grid/core/utils/editor";
import {
  Copy,
  FlipHorizontal2,
  GripVertical,
  ImagePlus,
  Pencil,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";

import { InlineEditInput } from "./InlineEditInput";

/**
 * 用量の区切り線の色（Canvas がテーマカラーから上書きする CSS 変数を参照する）
 */
const DOSAGE_DIVIDER_STYLE: React.CSSProperties = {
  borderTopColor: "var(--dosage-accent-light)",
};

/**
 * 注意点ボックスの枠線の色（白黒モードのみ Canvas が濃い色に上書きする。既定は透明）
 */
const PRECAUTION_BORDER_STYLE: React.CSSProperties = {
  borderColor: "var(--precaution-border)",
};

/**
 * カード番号バッジの見た目（大きさはタイトルの文字サイズに対する比率。PDF と同じ比率）
 */
const CARD_NUMBER_BADGE_STYLE: React.CSSProperties = {
  width: `${String(CARD_NUMBER_BADGE_RATIO.size)}em`,
  height: `${String(CARD_NUMBER_BADGE_RATIO.size)}em`,
  fontSize: `${String(CARD_NUMBER_BADGE_RATIO.fontSize)}em`,
  backgroundColor: "var(--card-number-bg)",
};

/**
 * カード内の文字サイズを選ぶ
 *
 * @remarks
 * デスクトップの 1 列は常に拡大スタイル（文字サイズの設定に関わらず）。
 * モバイルは 1 列表示でも拡大スタイルを使わないため、「大きめ」なら 2〜4 列向けの大きめスタイルにする。
 *
 * @param layoutType - レイアウトタイプ
 * @param textScale - 文字サイズの設定
 * @param isMobile - モバイル表示かどうか
 * @returns Tailwind のクラス名の組
 */
function getCardTextStyle(
  layoutType: LayoutType | undefined,
  textScale: TextScale,
  isMobile: boolean
):
  | typeof EDITOR_TEXT_STYLE
  | typeof EDITOR_TEXT_STYLE_LARGE
  | typeof EDITOR_TEXT_STYLE_SINGLE_COLUMN {
  if (layoutType === "grid1" && !isMobile) {
    return EDITOR_TEXT_STYLE_SINGLE_COLUMN;
  }
  return textScale === "large" ? EDITOR_TEXT_STYLE_LARGE : EDITOR_TEXT_STYLE;
}

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
   * カード上でタイトル・用量を編集して確定したときのコールバック（デスクトップのみ）
   *
   * @remarks
   * 指定したときだけ、選択中のカードのタイトル・用量の数値をダブルクリックで編集できる
   */
  onInlineEdit?: (updates: InlineEditUpdates) => void;
};

/**
 * カード上のインライン編集で変更する項目
 */
export type InlineEditUpdates = Partial<Pick<EditorItem, "title" | "dosages">>;

/** インライン編集中の項目（タイトルまたは用量の種類） */
type InlineEditField = "title" | BadgeType;

/**
 * ソート可能なカードコンポーネント
 *
 * dnd-kit の useSortable フックを使用してドラッグ可能なカードを実装
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
  onInlineEdit,
}: SortableCardProps) {
  const [isImageDragOver, setIsImageDragOver] = useState(false);
  const textStyle = getCardTextStyle(layoutType, textScale, isMobile);

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

  /**
   * ダブルクリックで編集を始めるための props（編集できないときは何も付けない）
   */
  const inlineEditTriggerProps = (field: InlineEditField) =>
    canInlineEdit
      ? {
          title: INLINE_EDIT_HINT,
          onDoubleClick: () => setEditingField(field),
        }
      : {};

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
      {/* モバイル用: ドラッグハンドル（左上に常時表示） */}
      {isMobile ? (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className={cn(
            "absolute left-2 top-2 z-20",
            "flex size-9 items-center justify-center rounded-full border border-gray-400",
            "bg-gray-200/90 text-gray-700 shadow-md",
            "touch-none cursor-grab active:cursor-grabbing",
            "transition-colors active:bg-gray-400 active:text-gray-900"
          )}
          aria-label="ドラッグして並べ替え"
        >
          <GripVertical className="size-5" />
        </button>
      ) : null}

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

      {/* モバイル用: 設定アイコン（右上に常時表示） */}
      {isMobile && onSettingsClick ? (
        <button
          type="button"
          className={cn(
            "absolute right-2 top-2 z-20",
            "flex size-9 items-center justify-center rounded-full border border-gray-400",
            "bg-gray-200/90 text-gray-700 shadow-md",
            "transition-colors active:bg-gray-400 active:text-gray-900"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onSettingsClick(item.id);
          }}
          aria-label="カードを編集"
        >
          <Pencil className="size-5" />
        </button>
      ) : null}

      {/* カードコンテンツ */}
      <div className="flex flex-col gap-3 p-4">
        {/* 画像エリア */}
        <div
          className={cn(
            "relative aspect-5/3 rounded-lg overflow-hidden",
            "bg-muted/30 border border-border/30",
            "flex items-center justify-center",
            "transition-all duration-200",
            isImageDragOver &&
              "border-primary-active border-2 bg-primary-active/30"
          )}
        >
          {hasImage ? (
            <Image
              src={imageUrl}
              alt={item.title || LABELS.untitledExercise}
              fill
              sizes="(max-width: 768px) 50vw, 300px"
              className="object-contain"
              unoptimized
              draggable={false}
            />
          ) : isImageDragOver ? (
            <div className="flex flex-col items-center gap-2 text-primary-active">
              <ImagePlus className="size-8" />
              <span className="text-xs font-medium">{CANVAS_DROP_HERE}</span>
            </div>
          ) : (
            // モバイル版ではタップオーバーレイが表示されるため、デフォルトプレースホルダーは非表示
            !isMobile && (
              <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
                <ImagePlus className="size-8" />
                <span className="text-xs">{LABELS.noImage}</span>
              </div>
            )
          )}

          {/* モバイル用: 画像選択タップオーバーレイ */}
          {isMobile && onImageAreaClick ? (
            <button
              type="button"
              className={cn(
                "absolute inset-0 z-10",
                "flex flex-col items-center justify-center gap-2",
                "text-white transition-opacity",
                // 画像がない場合のみオーバーレイを表示
                item.imageSource === ""
                  ? "bg-black/20 opacity-100"
                  : "bg-transparent opacity-0"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onImageAreaClick(item.id);
              }}
              aria-label="画像を選択"
            >
              {/* 画像がない場合のみメッセージを表示 */}
              {item.imageSource === "" ? (
                <>
                  <ImagePlus className="size-6" />
                  <span className="text-xs font-medium">
                    {MOBILE_TAP_TO_SELECT_IMAGE}
                  </span>
                </>
              ) : null}
            </button>
          ) : null}
        </div>

        {/* タイトル */}
        <div
          className="space-y-2"
          onTouchStart={handleContentTouchStart}
          onTouchEnd={handleContentTouchEnd}
          onTouchMove={handleContentTouchEnd}
          onTouchCancel={handleContentTouchEnd}
        >
          <h3
            className={cn(
              "flex items-center justify-center gap-[0.3em] font-semibold",
              textStyle.titleSize
            )}
          >
            {/* カード番号バッジ（丸数字。サイズはタイトルの文字サイズに追従する） */}
            {cardNumber !== undefined ? (
              <span
                className="flex shrink-0 items-center justify-center rounded-full font-bold not-italic leading-none text-white"
                style={CARD_NUMBER_BADGE_STYLE}
              >
                {cardNumber}
              </span>
            ) : null}
            {canInlineEdit && editingField === "title" ? (
              <InlineEditInput
                value={item.title}
                maxLength={TEXT_LIMITS.title}
                label={INLINE_EDIT_TITLE_LABEL}
                className="font-semibold"
                onCommit={(value) => commitInlineEdit("title", value)}
                onCancel={() => setEditingField(null)}
              />
            ) : (
              <span
                className={cn(
                  "min-w-0 truncate",
                  !item.title && "text-muted-foreground/50 italic",
                  canInlineEdit && "cursor-text"
                )}
                {...inlineEditTriggerProps("title")}
              >
                {item.title
                  ? item.title.slice(0, TEXT_LIMITS.title)
                  : LABELS.untitledExercise}
              </span>
            )}
          </h3>

          {/* 説明（あれば） */}
          {item.description ? (
            <p
              className={cn(
                textStyle.descriptionSize,
                "text-muted-foreground line-clamp-4 whitespace-pre-line"
              )}
            >
              {item.description.slice(0, TEXT_LIMITS.description)}
            </p>
          ) : null}
        </div>

        {/* 回数・セット数・頻度（数値強調型デザイン） */}
        {(() => {
          const badgeLayout = getDosageBadgeLayout(
            item.dosages,
            layoutType ?? "grid2"
          );
          if (badgeLayout.length === 0) return null;
          return (
            <div
              className="flex flex-col gap-2 py-2"
              onTouchStart={handleContentTouchStart}
              onTouchEnd={handleContentTouchEnd}
              onTouchMove={handleContentTouchEnd}
              onTouchCancel={handleContentTouchEnd}
            >
              {badgeLayout.map((row) => {
                const rowKey = row.badges.map((b) => b.type).join("-");
                return (
                  <div
                    key={rowKey}
                    className={cn(
                      "grid gap-4",
                      row.isFullWidth
                        ? "grid-cols-1"
                        : row.badges.length === 2
                          ? "grid-cols-2"
                          : "grid-cols-3"
                    )}
                  >
                    {row.badges.map((badge) => (
                      <div
                        key={badge.type}
                        className={cn(
                          "flex flex-col items-center",
                          !badge.hasValue && "invisible"
                        )}
                      >
                        {/* 数値（大きく強調） */}
                        {canInlineEdit && editingField === badge.type ? (
                          <InlineEditInput
                            value={badge.value}
                            maxLength={TEXT_LIMITS[badge.type]}
                            label={createInlineDosageInputLabel(
                              dosageLabels[badge.type]
                            )}
                            className={cn(
                              textStyle.dosageValueSize,
                              "font-bold"
                            )}
                            onCommit={(value) =>
                              commitInlineEdit(badge.type, value)
                            }
                            onCancel={() => setEditingField(null)}
                          />
                        ) : (
                          <span
                            className={cn(
                              textStyle.dosageValueSize,
                              "font-bold text-dosage-value",
                              canInlineEdit && badge.hasValue && "cursor-text"
                            )}
                            {...(badge.hasValue
                              ? inlineEditTriggerProps(badge.type)
                              : {})}
                          >
                            {badge.hasValue
                              ? badge.value.slice(0, TEXT_LIMITS[badge.type])
                              : "-"}
                          </span>
                        )}
                        {/* ラベル（下線付き。線の色は Canvas がテーマカラーから上書きする CSS 変数を参照する） */}
                        <span
                          className={cn(
                            textStyle.dosageLabelSize,
                            "text-dosage-label border-t pt-1 mt-1"
                          )}
                          style={DOSAGE_DIVIDER_STYLE}
                        >
                          {dosageLabels[badge.type]}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* 注意点（あれば）。枠線は白黒モードでだけ見える（Canvas が上書きする CSS 変数を参照する） */}
        {item.precautions && item.precautions.length > 0 ? (
          <div
            className="rounded-lg border bg-precaution-bg p-2.5 space-y-1"
            style={PRECAUTION_BORDER_STYLE}
            onTouchStart={handleContentTouchStart}
            onTouchEnd={handleContentTouchEnd}
            onTouchMove={handleContentTouchEnd}
            onTouchCancel={handleContentTouchEnd}
          >
            <span
              className={cn(
                textStyle.precautionTitleSize,
                "font-semibold text-precaution-title"
              )}
            >
              {LABELS.precautionTitle}
            </span>
            {item.precautions.map((precaution) => (
              <p
                key={precaution.id}
                className={cn(
                  textStyle.precautionTextSize,
                  "text-precaution-text whitespace-pre-line wrap-break-words"
                )}
              >
                • {precaution.value.slice(0, TEXT_LIMITS.precaution)}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
