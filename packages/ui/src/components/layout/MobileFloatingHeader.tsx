"use client";

/**
 * MobileFloatingHeader のプロパティ
 */
type MobileFloatingHeaderProps = {
  /** 左側のスロット（例: ハンバーガーメニューボタン） */
  leftSlot?: React.ReactNode;
  /** 中央のスロット（例: ロゴ、タイトル） */
  centerSlot?: React.ReactNode;
  /** 右側のスロット（例: アクションボタン） */
  rightSlot?: React.ReactNode;
};

/**
 * モバイル用フローティングヘッダーコンポーネント
 *
 * 画面上部に固定表示される角丸のフローティングヘッダー。
 * 左・中央・右の3つのスロットにコンテンツを配置可能。
 *
 * @example
 * ```tsx
 * <MobileFloatingHeader
 *   leftSlot={<MenuButton />}
 *   centerSlot={<Logo />}
 *   rightSlot={<ActionButton />}
 * />
 * ```
 */
export function MobileFloatingHeader({
  leftSlot,
  centerSlot,
  rightSlot,
}: MobileFloatingHeaderProps) {
  return (
    <header className="fixed z-60 top-3 left-3 right-3 h-14 rounded-xl bg-white/80 shadow-lg backdrop-blur-md desktop:hidden">
      <div className="flex h-full items-center justify-between px-3">
        {/* 左側スロット */}
        <div className="flex shrink-0 items-center">{leftSlot}</div>

        {/* 中央スロット */}
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center">
          {centerSlot}
        </div>

        {/* 右側スロット */}
        <div className="flex shrink-0 items-center">{rightSlot}</div>
      </div>
    </header>
  );
}
