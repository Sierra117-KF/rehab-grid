"use client";

import { useModalStore } from "@rehab-grid/core/lib/store/useModalStore";
import { SecurityDisclaimerModal } from "@rehab-grid/ui/components/layout/SecurityDisclaimerModal";
import { usePathname } from "next/navigation";
import { useCallback, useEffect } from "react";

/**
 * Desktop版専用のセキュリティ免責モーダルプロバイダー
 *
 * @remarks
 * Web版のDisclaimerModalProviderをDesktop環境向けにカスタマイズ。
 * - エディタページ（/）にいる時のみモーダルを表示
 * - 常にpreventDismiss=true（外側クリック・Escape無効）
 * - キャンセルボタン非表示（showCancelButton=false）
 * - 他ページから戻った時もモーダルを再表示（pathname監視）
 *
 * useEffectの例外的使用: アプリ起動時のシステム初期化処理。
 * ユーザー操作やイベントハンドラでは代替できない初回マウント時の処理であるため、
 * useEffectの使用が妥当。
 */
export function DesktopDisclaimerModalProvider() {
  const pathname = usePathname();
  const {
    isSecurityDisclaimerOpen,
    openSecurityDisclaimer,
    closeSecurityDisclaimer,
    checkDisclaimerRequired,
    recordDisclaimerConsent,
  } = useModalStore();

  /**
   * エディタページ（/）にいる時、同意が必要であればモーダルを表示
   *
   * pathnameが変わるたびにチェックするため、他ページから戻った時も再表示される
   */
  useEffect(() => {
    if (pathname === "/" && checkDisclaimerRequired()) {
      openSecurityDisclaimer();
    }
  }, [pathname, checkDisclaimerRequired, openSecurityDisclaimer]);

  /**
   * 同意ボタンクリック時のハンドラ
   *
   * 同意を記録してモーダルを閉じる。Desktop版ではページ遷移なし。
   */
  const handleAgree = useCallback(() => {
    recordDisclaimerConsent();
    closeSecurityDisclaimer();
  }, [closeSecurityDisclaimer, recordDisclaimerConsent]);

  /**
   * モーダル開閉状態変更ハンドラ
   */
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        closeSecurityDisclaimer();
      }
    },
    [closeSecurityDisclaimer],
  );

  return (
    <SecurityDisclaimerModal
      open={isSecurityDisclaimerOpen}
      onOpenChange={handleOpenChange}
      onAgree={handleAgree}
      preventDismiss
      showCancelButton={false}
    />
  );
}
