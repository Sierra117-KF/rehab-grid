"use client";

import {
  createMaxItemCountReachedMessage,
  MAX_ITEM_COUNT,
  useEditorStore,
} from "@rehab-grid/core";
import { useCanvasImages } from "@rehab-grid/core/hooks/useCanvasImages";
import { useIsMobile } from "@rehab-grid/core/hooks/useMediaQuery";
import { usePasteImage } from "@rehab-grid/core/hooks/usePasteImage";
import {
  Canvas,
  ImageLibraryPanel,
  MobileSidebar,
  PropertyPanel,
} from "@rehab-grid/ui";
import { useCallback } from "react";
import { toast } from "sonner";

/**
 * 自主トレーニング指導箋エディタページ
 *
 * 3カラム構成のエディタUI:
 * - 左: 画像ライブラリ + ツールパネル
 * - 中央: キャンバス（グリッド表示）
 * - 右: プロパティパネル（選択カードの編集）
 */
export function TrainingPage() {
  // モバイル判定
  const isMobile = useIsMobile();

  // Zustand ストアから状態とアクションを取得
  const items = useEditorStore((state) => state.items);
  const layoutType = useEditorStore((state) => state.layoutType);
  const selectedItemId = useEditorStore((state) => state.selectedItemId);
  const addNewItem = useEditorStore((state) => state.addNewItem);
  const updateItem = useEditorStore((state) => state.updateItem);
  const deleteItem = useEditorStore((state) => state.deleteItem);
  const reorderItems = useEditorStore((state) => state.reorderItems);
  const setSelectedItemId = useEditorStore((state) => state.setSelectedItemId);

  // モバイルUI用ステート
  const mobileImageLibraryOpen = useEditorStore(
    (state) => state.mobileImageLibraryOpen
  );
  const mobilePropertyPanelOpen = useEditorStore(
    (state) => state.mobilePropertyPanelOpen
  );
  const mobileImageLibraryTargetItemId = useEditorStore(
    (state) => state.mobileImageLibraryTargetItemId
  );
  const setMobileImageLibraryOpen = useEditorStore(
    (state) => state.setMobileImageLibraryOpen
  );
  const setMobilePropertyPanelOpen = useEditorStore(
    (state) => state.setMobilePropertyPanelOpen
  );

  // キャンバス表示用の画像URLを生成（IndexedDB + サンプル画像）
  const cardImageUrls = useCanvasImages(items);

  // 選択中のアイテムを取得
  const selectedItem =
    selectedItemId !== null
      ? (items.find((item) => item.id === selectedItemId) ?? null)
      : null;

  /**
   * 新しいカードを追加
   */
  const tryAddCard = useCallback(
    (imageId?: string) => {
      const newItemId = addNewItem();
      if (newItemId === null) {
        toast.info(createMaxItemCountReachedMessage(MAX_ITEM_COUNT));
        return;
      }

      if (imageId !== undefined && imageId !== "") {
        updateItem(newItemId, { imageSource: imageId });
      }
    },
    [addNewItem, updateItem]
  );

  /**
   * 新しいカードを追加（画像なし）
   */
  const handleAddCard = useCallback(() => {
    tryAddCard();
  }, [tryAddCard]);

  /**
   * クリップボードから画像を貼り付けたときの処理
   */
  const handlePasteImage = useCallback(
    (imageId: string) => {
      tryAddCard(imageId);
    },
    [tryAddCard]
  );

  // クリップボード画像貼り付けフック
  usePasteImage({ onPaste: handlePasteImage });

  /**
   * 画像がカードにドロップされたときの処理
   */
  const handleImageDrop = useCallback(
    (itemId: string, imageId: string) => {
      updateItem(itemId, { imageSource: imageId });
    },
    [updateItem]
  );

  /**
   * 画像付きで新規カードを追加（キャンバス空きエリアへのドロップ用）
   */
  const handleAddCardWithImage = useCallback(
    (imageId: string) => {
      tryAddCard(imageId);
    },
    [tryAddCard]
  );

  const handleItemsChange = reorderItems;
  const handleItemSelect = setSelectedItemId;
  const handleItemChange = updateItem;
  const handleItemDelete = deleteItem;

  // 最大数チェック（MAX_ITEM_COUNT に達したらカード追加を無効化）
  const canAddCard = items.length < MAX_ITEM_COUNT;

  /**
   * モバイル: 画像領域タップ時に画像ライブラリを開く
   */
  const handleMobileImageAreaClick = useCallback(
    (itemId: string) => {
      setMobileImageLibraryOpen(true, itemId);
    },
    [setMobileImageLibraryOpen]
  );

  /**
   * モバイル: 設定アイコンタップ時にプロパティパネルを開く
   */
  const handleMobileSettingsClick = useCallback(
    (itemId: string) => {
      setSelectedItemId(itemId);
      setMobilePropertyPanelOpen(true);
    },
    [setSelectedItemId, setMobilePropertyPanelOpen]
  );

  /**
   * モバイル: 画像ライブラリを閉じる
   */
  const handleCloseMobileImageLibrary = useCallback(() => {
    setMobileImageLibraryOpen(false);
  }, [setMobileImageLibraryOpen]);

  /**
   * モバイル: プロパティパネルを閉じる
   */
  const handleCloseMobilePropertyPanel = useCallback(() => {
    setMobilePropertyPanelOpen(false);
  }, [setMobilePropertyPanelOpen]);

  /**
   * モバイル: 画像選択時の処理（対象カードに画像を設定してサイドバーを閉じる）
   */
  const handleMobileImageSelect = useCallback(
    (imageId: string) => {
      if (mobileImageLibraryTargetItemId !== null) {
        updateItem(mobileImageLibraryTargetItemId, { imageSource: imageId });
      }
      setMobileImageLibraryOpen(false);
    },
    [mobileImageLibraryTargetItemId, updateItem, setMobileImageLibraryOpen]
  );

  return (
    <div className="flex h-full">
      {/* 左サイドバー（デスクトップのみ） */}
      <aside className="hidden desktop:flex w-60 flex-col border-r border-border/40 bg-background">
        {/* 画像ライブラリ */}
        <div className="flex-1 overflow-y-auto p-4">
          <ImageLibraryPanel
            onAddCard={handleAddCard}
            canAddCard={canAddCard}
          />
        </div>
      </aside>

      {/* 中央キャンバス */}
      <main className="flex-1 bg-background">
        <Canvas
          items={items}
          onItemsChange={handleItemsChange}
          layoutType={layoutType}
          selectedItemId={selectedItemId}
          onItemSelect={handleItemSelect}
          onAddCard={handleAddCard}
          onImageDrop={handleImageDrop}
          imageUrls={cardImageUrls}
          onAddCardWithImage={handleAddCardWithImage}
          canAddCard={canAddCard}
          onImageAreaClick={handleMobileImageAreaClick}
          onSettingsClick={handleMobileSettingsClick}
          isMobile={isMobile}
        />
      </main>

      {/* 右プロパティパネル（デスクトップのみ） */}
      <aside className="hidden desktop:block w-72 border-l border-border/40 bg-background">
        <PropertyPanel
          selectedItem={selectedItem}
          onItemChange={handleItemChange}
          onItemDelete={handleItemDelete}
        />
      </aside>

      {/* モバイル用: 画像ライブラリサイドバー */}
      <MobileSidebar
        open={mobileImageLibraryOpen}
        onClose={handleCloseMobileImageLibrary}
        side="left"
        title="画像ライブラリ"
      >
        <div className="flex-1 overflow-y-auto p-4">
          <ImageLibraryPanel
            onAddCard={handleAddCard}
            canAddCard={canAddCard}
            onImageSelect={handleMobileImageSelect}
            isMobile
          />
        </div>
      </MobileSidebar>

      {/* モバイル用: プロパティパネルサイドバー */}
      <MobileSidebar
        open={mobilePropertyPanelOpen}
        onClose={handleCloseMobilePropertyPanel}
        side="right"
        title="カード編集"
      >
        <PropertyPanel
          selectedItem={selectedItem}
          onItemChange={handleItemChange}
          onItemDelete={handleItemDelete}
        />
      </MobileSidebar>
    </div>
  );
}
