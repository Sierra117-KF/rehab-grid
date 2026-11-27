/**
 * 運動カード（SortableCard）と中身の部品で共有する型
 */

import type {
  BadgeType,
  DosageLabels,
  EditorItem,
  LayoutType,
} from "@rehab-grid/core/types";

/**
 * カード上のインライン編集で変更する項目
 */
export type InlineEditUpdates = Partial<Pick<EditorItem, "title" | "dosages">>;

/** インライン編集中の項目（タイトルまたは用量の種類） */
export type InlineEditField = "title" | BadgeType;

/**
 * ダブルクリックで編集を始めるための props（編集できないときは空）
 */
export type InlineEditTriggerProps = {
  /** 編集の案内（ツールチップ） */
  title?: string;
  /** 編集を始めるハンドラ */
  onDoubleClick?: () => void;
};

/**
 * カードの中身の部品に渡す、インライン編集の状態と操作
 *
 * @remarks
 * 状態は SortableCard が持つ（選択が外れたら編集をやめるため）
 */
export type CardInlineEdit = {
  /** インライン編集できるか（選択中かつコールバックあり） */
  canEdit: boolean;
  /** 編集中の項目（編集できないときは常に null） */
  editingField: InlineEditField | null;
  /** ダブルクリックで編集を始めるための props */
  triggerProps: (field: InlineEditField) => InlineEditTriggerProps;
  /** 編集を確定する */
  commit: (field: InlineEditField, value: string) => void;
  /** 編集を取り消す */
  cancel: () => void;
};

/**
 * モバイルのロングプレス（長押しで編集を開く）を検知するタッチハンドラ
 */
export type ContentTouchHandlers = Pick<
  React.DOMAttributes<HTMLDivElement>,
  "onTouchStart" | "onTouchEnd" | "onTouchMove" | "onTouchCancel"
>;

/**
 * カードの中身（縦型・スライド）に共通の Props
 */
export type CardBodyProps = {
  /** アイテムデータ */
  item: EditorItem;
  /** 表示できる画像の URL（画像なし・参照切れのときは undefined） */
  imageUrl: string | undefined;
  /** 画像ライブラリからの画像がドラッグオーバーしているか */
  isImageDragOver: boolean;
  /** モバイルモードかどうか */
  isMobile: boolean;
  /** 画像領域がタップされたときのコールバック（モバイル用） */
  onImageAreaClick?: (itemId: string) => void;
  /** レイアウトタイプ */
  layoutType: LayoutType | undefined;
  /** タイトルの左に表示するカード番号（省略時はバッジを表示しない） */
  cardNumber?: number;
  /** 用量のラベル */
  dosageLabels: DosageLabels;
  /** インライン編集の状態と操作 */
  inlineEdit: CardInlineEdit;
  /** モバイルのロングプレスを検知するタッチハンドラ */
  touchHandlers: ContentTouchHandlers;
};
