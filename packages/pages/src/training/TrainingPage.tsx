"use client";

import {
  APPLY_TO_ALL_NO_TARGET_MESSAGE,
  createApplyToAllSuccessMessage,
  createMaxItemCountReachedMessage,
  DELETE_SUCCESS_MESSAGE,
  type Dosages,
  MAX_ITEM_COUNT,
  UNDO_LABEL,
  UNDO_STALE_MESSAGE,
  useEditorStore,
  useModalStore,
} from "@rehab-grid/core";
import { useCanvasImages } from "@rehab-grid/core/hooks/useCanvasImages";
import { useEditorShortcuts } from "@rehab-grid/core/hooks/useEditorShortcuts";
import { useIsMobile } from "@rehab-grid/core/hooks/useMediaQuery";
import { usePasteImage } from "@rehab-grid/core/hooks/usePasteImage";
import {
  IMAGE_EDIT_FAILED_MESSAGE,
  IMAGE_EDIT_LOAD_FAILED_MESSAGE,
  IMAGE_EDIT_STALE_MESSAGE,
} from "@rehab-grid/core/lib/constants";
import {
  createEditedImageBlob,
  flipAndSaveImage,
  type ImageEditSource,
  loadImageEditSource,
  saveEditedImage,
} from "@rehab-grid/core/utils/imageEdit";
import {
  Canvas,
  ImageEditModal,
  type ImageEditResult,
  ImageLibraryPanel,
  MobileSidebar,
  PropertyPanel,
} from "@rehab-grid/ui";
import { useCallback, useState } from "react";
import { toast } from "sonner";

/**
 * 画像編集モーダルで編集中の対象
 */
type ImageEditTarget = {
  /** 編集するカードのID */
  itemId: string;
  /** 編集を始めたときのカードの画像ID（保存時に差し替わっていないか確認する） */
  imageId: string;
  /** 読み込んだ元画像 */
  source: ImageEditSource;
};

/**
 * 編集した画像をカードに反映する
 *
 * @remarks
 * 画像の処理は非同期のため、その間にカードの画像が差し替えられていたら反映しない
 * （編集した画像はライブラリに残る）。反映は 1 件の履歴になり、元に戻せる
 *
 * @param itemId - カードのID
 * @param originalImageId - 編集を始めたときの画像ID
 * @param editedImageId - 編集した画像のID
 */
function applyEditedImage(
  itemId: string,
  originalImageId: string,
  editedImageId: string
) {
  const { items, updateItem } = useEditorStore.getState();
  const item = items.find((i) => i.id === itemId);
  if (item?.imageSource !== originalImageId) {
    toast.info(IMAGE_EDIT_STALE_MESSAGE);
    return;
  }
  updateItem(itemId, { imageSource: editedImageId });
}

/**
 * 「元に戻す」付きの完了トーストを表示する
 *
 * @remarks
 * 直前の操作を履歴に記録した直後に呼ぶ。
 * トーストは数秒残るため、その間に別の操作をすると「元に戻す」が別の操作を取り消してしまう。
 * 表示時点の past 末尾（スナップショットの参照）を控えておき、
 * クリック時に末尾が同じときだけ undo する。
 *
 * @param message - トーストに表示するメッセージ
 */
function showUndoableToast(message: string) {
  const recordedSnapshot = useEditorStore.getState().past.at(-1);

  toast.success(message, {
    action: {
      label: UNDO_LABEL,
      onClick: () => {
        const { past, undo } = useEditorStore.getState();
        if (recordedSnapshot !== undefined && past.at(-1) === recordedSnapshot) {
          undo();
        } else {
          toast.info(UNDO_STALE_MESSAGE);
        }
      },
    },
  });
}

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
  const settings = useEditorStore((state) => state.settings);
  const selectedItemId = useEditorStore((state) => state.selectedItemId);
  const addNewItem = useEditorStore((state) => state.addNewItem);
  const updateItem = useEditorStore((state) => state.updateItem);
  const deleteItem = useEditorStore((state) => state.deleteItem);
  const duplicateItem = useEditorStore((state) => state.duplicateItem);
  const applyDosagesToAll = useEditorStore((state) => state.applyDosagesToAll);
  const appendPrecautionsToAll = useEditorStore(
    (state) => state.appendPrecautionsToAll
  );
  const reorderItems = useEditorStore((state) => state.reorderItems);
  const setSelectedItemId = useEditorStore((state) => state.setSelectedItemId);
  const setDesignSettingsOpen = useModalStore(
    (state) => state.setDesignSettingsOpen
  );

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

  // 画像の反転・編集用ステート
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const [imageEditTarget, setImageEditTarget] =
    useState<ImageEditTarget | null>(null);

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
      // 画像付きの追加も 1 件の履歴になるよう、画像IDごと 1 回で追加する
      const newItemId = addNewItem({ imageSource: imageId });
      if (newItemId === null) {
        toast.info(createMaxItemCountReachedMessage(MAX_ITEM_COUNT));
      }
    },
    [addNewItem]
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

  // Undo / Redo のキーボードショートカット
  useEditorShortcuts();

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

  /**
   * キャンバス上部の要約から、デザイン設定ダイアログをヘッダー・チェック表のセクションで開く
   */
  const handleSheetSettingsClick = useCallback(() => {
    setDesignSettingsOpen(true, "sheet");
  }, [setDesignSettingsOpen]);

  const handleItemsChange = reorderItems;
  const handleItemSelect = setSelectedItemId;
  const handleItemChange = updateItem;

  /**
   * カードを削除し、「元に戻す」付きのトーストを表示
   */
  const handleItemDelete = useCallback(
    (id: string) => {
      deleteItem(id);
      showUndoableToast(DELETE_SUCCESS_MESSAGE);
    },
    [deleteItem]
  );

  /**
   * カードを複製（上限に達していれば案内を表示）
   */
  const handleItemDuplicate = useCallback(
    (id: string) => {
      if (duplicateItem(id) === null) {
        toast.info(createMaxItemCountReachedMessage(MAX_ITEM_COUNT));
      }
    },
    [duplicateItem]
  );

  /**
   * 選択中カードの用量を全カードに反映し、「元に戻す」付きのトーストを表示
   */
  const handleApplyDosagesToAll = useCallback(
    (dosages: Dosages) => {
      const updatedCount = applyDosagesToAll(dosages);
      if (updatedCount === 0) {
        toast.info(APPLY_TO_ALL_NO_TARGET_MESSAGE);
        return;
      }
      showUndoableToast(createApplyToAllSuccessMessage(updatedCount));
    },
    [applyDosagesToAll]
  );

  /**
   * 選択中カードの注意点を全カードに追加し、「元に戻す」付きのトーストを表示
   */
  const handleApplyPrecautionsToAll = useCallback(
    (values: string[]) => {
      const { updatedCount, skippedCount } = appendPrecautionsToAll(values);
      if (updatedCount === 0) {
        toast.info(APPLY_TO_ALL_NO_TARGET_MESSAGE);
        return;
      }
      showUndoableToast(
        createApplyToAllSuccessMessage(updatedCount, skippedCount)
      );
    },
    [appendPrecautionsToAll]
  );

  /**
   * カードの画像を左右反転して新しい画像として保存し、カードに反映する
   *
   * @remarks
   * サンプル画像（2 コマ構成）はコマの順番を保ったまま 2 コマずつ反転する
   */
  const handleImageFlip = useCallback(
    async (itemId: string) => {
      const imageId = items.find((item) => item.id === itemId)?.imageSource;
      if (imageId === undefined || imageId === "") return;

      setIsImageProcessing(true);
      try {
        const flippedImageId = await flipAndSaveImage(imageId);
        applyEditedImage(itemId, imageId, flippedImageId);
      } catch {
        toast.error(IMAGE_EDIT_FAILED_MESSAGE);
      } finally {
        setIsImageProcessing(false);
      }
    },
    [items]
  );

  /**
   * カードの画像を読み込んで画像編集モーダルを開く
   */
  const handleImageEditOpen = useCallback(
    async (itemId: string) => {
      const imageId = items.find((item) => item.id === itemId)?.imageSource;
      if (imageId === undefined || imageId === "") return;

      setIsImageProcessing(true);
      try {
        const source = await loadImageEditSource(imageId);
        setImageEditTarget({ itemId, imageId, source });
      } catch {
        toast.error(IMAGE_EDIT_LOAD_FAILED_MESSAGE);
      } finally {
        setIsImageProcessing(false);
      }
    },
    [items]
  );

  /**
   * 画像編集モーダルの編集結果を新しい画像として保存し、カードに反映する
   */
  const handleImageEditSave = useCallback(
    async ({ image, crop, annotations }: ImageEditResult) => {
      if (imageEditTarget === null) return;

      try {
        const blob = await createEditedImageBlob(image, crop, annotations);
        const editedImageId = await saveEditedImage(
          blob,
          imageEditTarget.source.displayName
        );
        applyEditedImage(
          imageEditTarget.itemId,
          imageEditTarget.imageId,
          editedImageId
        );
        setImageEditTarget(null);
      } catch {
        // モーダルは開いたままにして、もう一度保存できるようにする
        toast.error(IMAGE_EDIT_FAILED_MESSAGE);
      }
    },
    [imageEditTarget]
  );

  /**
   * 画像編集モーダルを閉じる（編集内容は破棄）
   */
  const handleImageEditClose = useCallback(() => {
    setImageEditTarget(null);
  }, []);

  // イベントハンドラとして渡すため、Promise を返さない関数にする
  const handleImageFlipClick = (itemId: string) => {
    void handleImageFlip(itemId);
  };
  const handleImageEditClick = (itemId: string) => {
    void handleImageEditOpen(itemId);
  };

  // 反映先となる他のカードがあるときだけ「全カードに反映」を出す
  const canApplyToAll = items.length > 1;

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
          layoutType={settings.layoutType}
          themeColor={settings.themeColor}
          printColorMode={settings.printColorMode}
          textScale={settings.textScale}
          showCardNumbers={settings.showCardNumbers}
          dosageLabels={settings.dosageLabels}
          sheetHeader={settings.header}
          checkTable={settings.checkTable}
          onSheetSettingsClick={handleSheetSettingsClick}
          selectedItemId={selectedItemId}
          onItemSelect={handleItemSelect}
          onAddCard={handleAddCard}
          onImageDrop={handleImageDrop}
          imageUrls={cardImageUrls}
          onAddCardWithImage={handleAddCardWithImage}
          canAddCard={canAddCard}
          onItemDuplicate={handleItemDuplicate}
          onItemImageFlip={handleImageFlipClick}
          isImageProcessing={isImageProcessing}
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
          onItemDuplicate={handleItemDuplicate}
          onApplyDosagesToAll={
            canApplyToAll ? handleApplyDosagesToAll : undefined
          }
          onApplyPrecautionsToAll={
            canApplyToAll ? handleApplyPrecautionsToAll : undefined
          }
          onImageFlip={handleImageFlipClick}
          onImageEdit={handleImageEditClick}
          isImageProcessing={isImageProcessing}
          dosageLabels={settings.dosageLabels}
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
          onItemDuplicate={handleItemDuplicate}
          onApplyDosagesToAll={
            canApplyToAll ? handleApplyDosagesToAll : undefined
          }
          onApplyPrecautionsToAll={
            canApplyToAll ? handleApplyPrecautionsToAll : undefined
          }
          onImageFlip={handleImageFlipClick}
          onImageEdit={handleImageEditClick}
          isImageProcessing={isImageProcessing}
          dosageLabels={settings.dosageLabels}
        />
      </MobileSidebar>

      {/* 画像編集モーダル（開いている間だけ描画し、閉じると編集状態を破棄する） */}
      {imageEditTarget !== null ? (
        <ImageEditModal
          key={imageEditTarget.itemId}
          image={imageEditTarget.source.image}
          onClose={handleImageEditClose}
          onSave={handleImageEditSave}
        />
      ) : null}
    </div>
  );
}
