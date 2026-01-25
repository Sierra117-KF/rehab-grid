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
  IMAGE_DRAG_TYPE,
  LABELS,
  LAYOUT_COLUMNS,
} from "@rehab-grid/core/lib/constants";
import { cn } from "@rehab-grid/core/lib/utils";
import type { EditorItem, LayoutType } from "@rehab-grid/core/types";
import { reorderEditorItems } from "@rehab-grid/core/utils/editor";
import { Button } from "@rehab-grid/ui/components/wrapped/Button";
import { ImagePlus } from "lucide-react";
import { useCallback, useState } from "react";

import { EmptyState } from "./EmptyState";
import { SortableCard } from "./SortableCard";

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
  selectedItemId,
  onItemSelect,
  onAddCard,
  onImageDrop,
  imageUrls,
  onAddCardWithImage,
  canAddCard = true,
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

      {/* グリッドコンテナ */}
      <div
        className={cn(
          "relative flex-1 overflow-auto pb-20",
          isMobile ? "px-6 pt-20" : "p-6"
        )}
      >
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
                  <div
                    key={item.id}
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
                      onImageAreaClick={onImageAreaClick}
                      onSettingsClick={onSettingsClick}
                      isMobile={isMobile}
                      layoutType={layoutType}
                    />
                  </div>
                ))}
              </div>
            </SortableContext>

            {/* ドラッグオーバーレイ */}
            <DragOverlay>
              {activeItem ? (
                <div className="rounded-xl border border-primary bg-card shadow-2xl opacity-95">
                  <div className="flex flex-col gap-3 p-4">
                    <div className="aspect-4/3 rounded-lg bg-muted/30" />
                    <h3 className="font-semibold text-sm">
                      {activeItem.title || LABELS.untitledExercise}
                    </h3>
                  </div>
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
