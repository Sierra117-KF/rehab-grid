"use client";

import { useModalStore } from "@rehab-grid/core/lib/store/useModalStore";
import { SecurityDisclaimerModal } from "@rehab-grid/ui/components/layout/SecurityDisclaimerModal";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";

/**
 * セキュリティ免責モーダルのプロバイダーコンポーネント
 *
 * @remarks
 * アプリケーション全体で一つのモーダルインスタンスを共有するためのプロバイダー。
 * `layout.tsx`に配置することで、どのページからでもモーダルを開閉できる。
 *
 * エディタページ（/training）に直接アクセスした場合でも、
 * 初回または期限切れ後はモーダルを自動表示し、利用規約への同意を求める。
 *
 * @returns セキュリティ免責モーダルコンポーネント
 */
export function DisclaimerModalProvider() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    isSecurityDisclaimerOpen,
    openSecurityDisclaimer,
    closeSecurityDisclaimer,
    checkDisclaimerRequired,
    recordDisclaimerConsent,
  } = useModalStore();

  // エディタページでマウント時にモーダル表示が必要かチェック
  useEffect(() => {
    if (pathname === "/training" && checkDisclaimerRequired()) {
      openSecurityDisclaimer();
    }
  }, [pathname, checkDisclaimerRequired, openSecurityDisclaimer]);

  /**
   * 同意後の処理ハンドラ
   *
   * @remarks
   * 同意を記録し、モーダルを閉じる。
   * すでにエディタページにいる場合は遷移をスキップする。
   */
  const handleAgree = useCallback(() => {
    recordDisclaimerConsent();
    closeSecurityDisclaimer();
    // すでに /training にいる場合は遷移不要
    if (pathname !== "/training") {
      router.push("/training");
    }
  }, [closeSecurityDisclaimer, recordDisclaimerConsent, router, pathname]);
  /**
   * キャンセル時の処理ハンドラ
   *
   * @remarks
   * エディタページで直接アクセスした場合、キャンセル時はトップページへ遷移する。
   * トップページから開いた場合は遷移なし（モーダルが閉じるのみ）。
   */
  const handleCancel = useCallback(() => {
    if (pathname === "/training") {
      router.push("/");
    }
  }, [pathname, router]);

  // エディタページで直接アクセスした場合は外側クリックで閉じない
  const isDirectAccess = pathname === "/training";

  return (
    <SecurityDisclaimerModal
      open={isSecurityDisclaimerOpen}
      onOpenChange={(open) => {
        if (!open) closeSecurityDisclaimer();
      }}
      onAgree={handleAgree}
      onCancel={handleCancel}
      preventDismiss={isDirectAccess}
    />
  );
}
