"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import {
  ANIMATION_STAGGER_DELAY,
  BUTTON_ADD_CARD,
  createPageBreakLabel,
  DOSAGE_DIVIDER_OPACITY,
  IMAGE_DRAG_TYPE,
  LABELS,
  LAYOUT_COLUMNS,
  MONOCHROME_COLORS,
} from "@rehab-grid/core/lib/constants";
import { type PdfLayoutEstimate } from "@rehab-grid/core/lib/pdf/layout";
import { getPdfSlideCardSize } from "@rehab-grid/core/lib/pdf/metrics";
import { resolveSheetHeader } from "@rehab-grid/core/lib/settings";
import { cn } from "@rehab-grid/core/lib/utils";
import type {
  CheckTableType,
  DosageLabels,
  EditorItem,
  LayoutType,
  PrintColorMode,
  SheetHeaderSettings,
  TextScale,
} from "@rehab-grid/core/types";
import { mixWithWhite } from "@rehab-grid/core/utils/color";
import { reorderEditorItems } from "@rehab-grid/core/utils/editor";
import { Button } from "@rehab-grid/ui/components/wrapped/Button";
import { ImagePlus } from "lucide-react";
import { Fragment, useCallback, useState } from "react";

import { type InlineEditUpdates } from "./cardTypes";
import { EmptyState } from "./EmptyState";
import { PageEstimateBadge } from "./PageEstimateBadge";
import { SheetSummary } from "./SheetSummary";
import { SortableCard } from "./SortableCard";

/**
 * カードの間に出す改ページの目安（グリッドの行の切れ目に、横幅いっぱいで置く）
 *
 * @remarks
 * 一覧（role="list"）の子は listitem だけにするため、支援技術からは隠す
 * （ページ数と改ページの位置はキャンバス上部の目安で伝わる）
 */
function PageBreakDivider({ page }: { page: number }) {
  return (
    <div
      aria-hidden="true"
      data-testid="page-break"
      className="col-span-full flex items-center gap-2 text-xs font-medium text-amber-700"
    >
      <span className="h-px flex-1 bg-amber-400" />
      {createPageBreakLabel(page)}
      <span className="h-px flex-1 bg-amber-400" />
    </div>
  );
}

/**
 * CSS 変数（--xxx）を含められる style の型
 */
type CssVariableStyle = React.CSSProperties & Record<`--${string}`, string>;

/**
 * カードの色を持つ CSS 変数の名前（既定値は globals.css。SortableCard がユーティリティやインライン style で参照する）
 */
const CARD_CSS_VARIABLES = {
  /** 運動カードの枠線 */
  cardBorder: "--card-border-color",
  /** 用量の区切り線 */
  dosageDivider: "--dosage-accent-light",
  /** 用量のラベル */
  dosageLabel: "--dosage-label",
  /** カード番号バッジの背景 */
  cardNumberBackground: "--card-number-bg",
  /** 注意点の背景 */
  precautionBackground: "--precaution-bg",
  /** 注意点の枠線 */
  precautionBorder: "--precaution-border",
  /** 注意点の見出し */
  precautionTitle: "--precaution-title",
  /** 注意点の本文 */
  precautionText: "--precaution-text",
} as const;

/**
 * テーマカラーと印刷の色づかいから、カードの色を持つ CSS 変数を求める
 *
 * @remarks
 * 変数はスクロールコンテナに設定し、子孫のカードに効かせる。
 * 白黒モードは PDF と同じ MONOCHROME_COLORS を使う。
 *
 * @param themeColor - テーマカラー（省略時は globals.css の既定色のまま）
 * @param printColorMode - 印刷の色づかい
 * @returns style に渡す CSS 変数（上書きしない場合は undefined）
 */
function getCardColorVariables(
  themeColor: string | undefined,
  printColorMode: PrintColorMode
): CssVariableStyle | undefined {
  if (printColorMode === "monochrome") {
    return {
      [CARD_CSS_VARIABLES.cardBorder]: MONOCHROME_COLORS.cardBorder,
      [CARD_CSS_VARIABLES.dosageDivider]: MONOCHROME_COLORS.dosageDivider,
      [CARD_CSS_VARIABLES.dosageLabel]: MONOCHROME_COLORS.dosageLabel,
      [CARD_CSS_VARIABLES.cardNumberBackground]:
        MONOCHROME_COLORS.cardNumberBackground,
      [CARD_CSS_VARIABLES.precautionBackground]:
        MONOCHROME_COLORS.precautionBackground,
      [CARD_CSS_VARIABLES.precautionBorder]: MONOCHROME_COLORS.precautionBorder,
      [CARD_CSS_VARIABLES.precautionTitle]: MONOCHROME_COLORS.precautionTitle,
      [CARD_CSS_VARIABLES.precautionText]: MONOCHROME_COLORS.precautionText,
    };
  }
  if (themeColor === undefined) return undefined;
  return {
    [CARD_CSS_VARIABLES.cardBorder]: themeColor,
    // 用量の区切り線は PDF と同じく白地と合成した不透明色
    [CARD_CSS_VARIABLES.dosageDivider]: mixWithWhite(
      themeColor,
      DOSAGE_DIVIDER_OPACITY
    ),
    [CARD_CSS_VARIABLES.cardNumberBackground]: themeColor,
  };
}

/**
 * Canvas コンポーネントの Props
 */
export type CanvasProps = {
  /** 表示するアイテムのリスト */
  items: EditorItem[];
  /** アイテムの順序が変更されたときのコールバック */
  onItemsChange: (items: EditorItem[]) => void;
  /** 現在のレイアウトタイプ */
  layoutType: LayoutType;
  /** テーマカラー（#RRGGBB。カードの枠線・用量の区切り線・カード番号の色に使う。省略時は globals.css の既定色） */
  themeColor?: string;
  /** 印刷の色づかい（白黒ではテーマカラーの代わりに slate 系の色を使い、注意点の塗りつぶしをなくす。省略時はカラー） */
  printColorMode?: PrintColorMode;
  /** カード内の文字サイズ（省略時は標準） */
  textScale?: TextScale;
  /** カード番号を表示するか（省略時は表示しない） */
  showCardNumbers?: boolean;
  /** 用量のラベル（省略時は LABELS の回数・セット・頻度） */
  dosageLabels?: DosageLabels;
  /** PDF ヘッダーの項目（キャンバス上部の要約表示に使う） */
  sheetHeader?: SheetHeaderSettings;
  /** 実施チェック表（キャンバス上部の要約表示に使う） */
  checkTable?: CheckTableType;
  /**
   * キャンバス上部の要約が押されたときのコールバック（ヘッダー・チェック表の設定を開く）
   *
   * @remarks
   * sheetHeader・checkTable と一緒に渡したときだけ、カードがあれば要約を表示する
   */
  onSheetSettingsClick?: () => void;
  /**
   * PDF のページ収容の見積もり（キャンバス上部の A4 ページ数の目安と、カードの間の改ページの目安に使う）
   *
   * @remarks
   * items と同じ並び順で見積もったもの。省略時は目安を出さない
   */
  pageEstimate?: PdfLayoutEstimate;
  /**
   * カード上でタイトル・用量を編集して確定したときのコールバック（デスクトップのみ）
   *
   * @remarks
   * 省略時はカード上で編集できない
   */
  onItemInlineEdit?: (itemId: string, updates: InlineEditUpdates) => void;
  /** 選択中のアイテムID */
  selectedItemId?: string | null;
  /** アイテムが選択されたときのコールバック */
  onItemSelect?: (itemId: string | null) => void;
  /** カード追加ボタンが押されたときのコールバック */
  onAddCard?: () => void;
  /** 画像がカードにドロップされたときのコールバック */
  onImageDrop?: (itemId: string, imageId: string) => void;
  /** 画像IDからサムネイルURLへのマッピング */
  imageUrls?: Map<string, string>;
  /** 画像付きで新規カードを追加するコールバック（キャンバス空きエリアへのドロップ用） */
  onAddCardWithImage?: (imageId: string) => void;
  /** カード追加が可能かどうか（最大数チェック用） */
  canAddCard?: boolean;
  /** カードの複製ボタン（デスクトップのホバーアクション）が押されたときのコールバック */
  onItemDuplicate?: (itemId: string) => void;
  /** カードの画像の左右反転ボタン（デスクトップのホバーアクション）が押されたときのコールバック */
  onItemImageFlip?: (itemId: string) => void;
  /** 画像の処理中かどうか（処理中は左右反転ボタンを押せない） */
  isImageProcessing?: boolean;

  // モバイル用プロパティ
  /** 画像領域がタップされたときのコールバック（モバイル用） */
  onImageAreaClick?: (itemId: string) => void;
  /** 設定アイコンがタップされたときのコールバック（モバイル用） */
  onSettingsClick?: (itemId: string) => void;
  /** モバイルモードかどうか */
  isMobile?: boolean;
};

/**
 * グリッドキャンバスコンポーネント
 *
 * 自主トレーニング指導箋のカードをグリッド表示し、
 * ドラッグ＆ドロップで順序を入れ替えられる編集領域
 *
 * @example
 * ```tsx
 * <Canvas
 *   items={items}
 *   onItemsChange={setItems}
 *   layoutType="grid2"
 *   selectedItemId={selectedId}
 *   onItemSelect={setSelectedId}
 * />
 * ```
 */
export function Canvas({
  items,
  onItemsChange,
  layoutType,
  themeColor,
  printColorMode = "color",
  textScale = "standard",
  showCardNumbers = false,
  dosageLabels,
  sheetHeader,
  checkTable,
  onSheetSettingsClick,
  pageEstimate,
  onItemInlineEdit,
  selectedItemId,
  onItemSelect,
  onAddCard,
  onImageDrop,
  imageUrls,
  onAddCardWithImage,
  canAddCard = true,
  onItemDuplicate,
  onItemImageFlip,
  isImageProcessing = false,
  onImageAreaClick,
  onSettingsClick,
  isMobile = false,
}: CanvasProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isCanvasDragOver, setIsCanvasDragOver] = useState(false);

  // ドラッグセンサーの設定
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 移動後にドラッグ開始（クリックとの区別）
      },
    }),
    // モバイル用: 長押しでドラッグ開始
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms 長押しでドラッグ開始
        tolerance: 5, // 長押し中の許容移動量
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // グリッドの列数を取得（モバイルでは常に1列表示）
  // 注意: layoutType はストアに保持され、PDF出力時には設定値が使用される
  const columns = isMobile ? 1 : LAYOUT_COLUMNS[layoutType];

  /**
   * ドラッグ開始時の処理
   */
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  /**
   * ドラッグ終了時の処理
   */
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      const newItems = reorderEditorItems(
        items,
        String(active.id),
        over ? String(over.id) : null
      );

      if (newItems !== null) {
        onItemsChange(newItems);
      }

      setActiveId(null);
    },
    [items, onItemsChange]
  );

  /**
   * キャンバス背景クリックで選択解除
   */
  const handleCanvasClick = useCallback(() => {
    onItemSelect?.(null);
  }, [onItemSelect]);

  /**
   * カード追加クリック時の処理
   */
  const handleAddCardClick = useCallback(() => {
    onAddCard?.();
  }, [onAddCard]);

  /**
   * アイテム選択時の処理
   */
  const handleItemSelect = useCallback(
    (itemId: string) => {
      onItemSelect?.(itemId);
    },
    [onItemSelect]
  );

  // テーマカラー・白黒モードをカードの色（CSS 変数）に反映する
  const themeStyle = getCardColorVariables(themeColor, printColorMode);

  const sheetSummary =
    sheetHeader !== undefined &&
    checkTable !== undefined &&
    onSheetSettingsClick !== undefined ? (
      <SheetSummary
        header={sheetHeader}
        checkTable={checkTable}
        onClick={onSheetSettingsClick}
      />
    ) : null;

  const isSlide = layoutType === "slide";
  // スライドのカードの大きさと行数を決める設定（ヘッダーを省略したときは既定値）
  const slideSettings = {
    header: sheetHeader ?? resolveSheetHeader(undefined),
    printColorMode,
  };
  const slideCardSize = isSlide ? getPdfSlideCardSize(slideSettings) : null;

  // 改ページの目安（各ページの先頭のカードの位置 → ページ番号）。モバイルは常に 1 列表示で
  // グリッドの行の切れ目と PDF の改ページが一致しないため、区切り線を出さない
  // （スライドは PDF も 1 ページ 1 枚で一致するため出す）
  const pageStartByIndex = new Map(
    (isMobile && !isSlide) || pageEstimate === undefined
      ? []
      : pageEstimate.firstCardIndexByPage
          .map((index, page) => [index, page + 1] as const)
          .filter(([index]) => index > 0)
  );

  // アクティブなアイテム（ドラッグ中のオーバーレイ用）
  const activeItem =
    activeId !== null ? items.find((item) => item.id === activeId) : null;

  /**
   * アイテムIDに対応する画像ドロップハンドラを生成
   */
  const handleImageDropFor = useCallback(
    (itemId: string) => {
      if (onImageDrop === undefined) return undefined;
      return (imageId: string) => {
        onImageDrop(itemId, imageId);
      };
    },
    [onImageDrop]
  );

  /**
   * キャンバスへのドラッグオーバー時の処理
   */
  const handleCanvasDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (e.dataTransfer.types.includes(IMAGE_DRAG_TYPE)) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setIsCanvasDragOver(true);
      }
    },
    []
  );

  /**
   * キャンバスからのドラッグリーブ時の処理
   */
  const handleCanvasDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      // キャンバス内の子要素間を移動しただけの場合は何もしない
      if (e.currentTarget.contains(e.relatedTarget as Node)) {
        return;
      }
      setIsCanvasDragOver(false);
    },
    []
  );

  /**
   * キャンバスへのドロップ時の処理（新規カード作成）
   */
  const handleCanvasDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsCanvasDragOver(false);

      // 最大数に達している場合はカード追加をスキップ
      if (!canAddCard) return;

      const imageId = e.dataTransfer.getData(IMAGE_DRAG_TYPE);
      if (imageId && onAddCardWithImage) {
        onAddCardWithImage(imageId);
      }
    },
    [onAddCardWithImage, canAddCard]
  );

  /**
   * キャンバスのドラッグオーバー状態をリセット（カード内ドロップ時用）
   */
  const handleCanvasDragEnd = useCallback(() => {
    setIsCanvasDragOver(false);
  }, []);

  return (
    <div
      data-testid="canvas"
      role="region"
      aria-label="キャンバス"
      className="relative flex h-full flex-col"
      onClick={handleCanvasClick}
      onDragOver={handleCanvasDragOver}
      onDragLeave={handleCanvasDragLeave}
      onDrop={handleCanvasDrop}
    >
      {/* 背景装飾 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-20 -top-20 size-80 rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute -bottom-20 -left-20 size-60 rounded-full bg-accent-secondary/5 blur-[80px]" />
      </div>

      {/* ドラッグオーバー時の視覚効果 */}
      {isCanvasDragOver ? (
        <div className="pointer-events-none absolute inset-2 z-50 rounded-xl border-2 border-dashed border-primary-active bg-primary-active/20 transition-all" />
      ) : null}

      {/* グリッドコンテナ（テーマカラーは CSS 変数の上書きで子孫のカードに効かせる） */}
      <div
        data-testid="canvas-scroll"
        className={cn(
          "relative flex-1 overflow-auto pb-20",
          isMobile ? "px-6 pt-20" : "p-6"
        )}
        style={themeStyle}
      >
        {/* ヘッダー・チェック表はキャンバスに描かないため、PDF に出る内容の要約と A4 ページ数の目安を出す */}
        {items.length > 0 && (sheetSummary !== null || pageEstimate !== undefined) ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {sheetSummary}
            {pageEstimate !== undefined ? (
              <PageEstimateBadge estimate={pageEstimate} />
            ) : null}
          </div>
        ) : null}

        {items.length === 0 ? (
          <EmptyState onAddCard={handleAddCardClick} canAddCard={canAddCard} />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((item) => item.id)}
              strategy={rectSortingStrategy}
            >
              <div
                data-testid="canvas-grid"
                role="list"
                className="grid gap-4"
                style={{
                  gridTemplateColumns: `repeat(${String(columns)}, minmax(0, 1fr))`,
                }}
              >
                {items.map((item, index) => (
                  <Fragment key={item.id}>
                    {pageStartByIndex.has(index) ? (
                      <PageBreakDivider page={pageStartByIndex.get(index) ?? 0} />
                    ) : null}
                  <div
                    role="listitem"
                    style={{
                      animationDelay: `${String(index * ANIMATION_STAGGER_DELAY)}s`,
                    }}
                  >
                    <SortableCard
                      item={item}
                      isSelected={selectedItemId === item.id}
                      onClick={() => handleItemSelect(item.id)}
                      isDragging={activeId === item.id}
                      onImageDrop={handleImageDropFor(item.id)}
                      imageUrl={
                        item.imageSource
                          ? imageUrls?.get(item.imageSource)
                          : undefined
                      }
                      onCanvasDragEnd={handleCanvasDragEnd}
                      onDuplicate={
                        onItemDuplicate
                          ? () => onItemDuplicate(item.id)
                          : undefined
                      }
                      onFlipImage={
                        onItemImageFlip
                          ? () => onItemImageFlip(item.id)
                          : undefined
                      }
                      isImageProcessing={isImageProcessing}
                      onImageAreaClick={onImageAreaClick}
                      onSettingsClick={onSettingsClick}
                      isMobile={isMobile}
                      layoutType={layoutType}
                      textScale={textScale}
                      cardNumber={showCardNumbers ? index + 1 : undefined}
                      dosageLabels={dosageLabels}
                      slideSettings={slideSettings}
                      onInlineEdit={
                        !isMobile && onItemInlineEdit
                          ? (updates) => onItemInlineEdit(item.id, updates)
                          : undefined
                      }
                    />
                  </div>
                  </Fragment>
                ))}
              </div>
            </SortableContext>

            {/* ドラッグオーバーレイ */}
            <DragOverlay>
              {activeItem ? (
                <div className="rounded-xl border border-primary bg-card shadow-2xl opacity-95">
                  {slideCardSize !== null ? (
                    // スライドは横長のカードと同じ比率の箱にする
                    <div
                      data-testid="drag-overlay-slide"
                      className="flex flex-col gap-3 p-4"
                      style={{
                        aspectRatio: slideCardSize.width / slideCardSize.height,
                      }}
                    >
                      <h3 className="font-semibold text-sm">
                        {activeItem.title || LABELS.untitledExercise}
                      </h3>
                      <div className="w-1/2 flex-1 rounded-lg bg-muted/30" />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 p-4">
                      <div className="aspect-4/3 rounded-lg bg-muted/30" />
                      <h3 className="font-semibold text-sm">
                        {activeItem.title || LABELS.untitledExercise}
                      </h3>
                    </div>
                  )}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* デスクトップ用: キャンバス下部の余白（D&Dで新規カード追加しやすくする） */}
        {!isMobile && items.length > 0 ? (
          <div className="min-h-25" aria-hidden="true" />
        ) : null}

        {/* モバイル用: グリッド下部のカード追加ボタン（スクロール末尾に表示） */}
        {isMobile && items.length > 0 ? (
          <div className="mt-4 px-4 pb-4">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 bg-white"
              onClick={handleAddCardClick}
              disabled={!canAddCard}
            >
              <ImagePlus className="size-4" />
              {BUTTON_ADD_CARD}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
