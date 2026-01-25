import {
  SECURITY_DISCLAIMER_EXPIRY_MS,
  SECURITY_DISCLAIMER_SESSION_KEY,
  SECURITY_DISCLAIMER_TIMESTAMP_KEY,
} from "@rehab-grid/core/lib/constants";
import type { ModalState } from "@rehab-grid/core/types";
import { create } from "zustand";

/**
 * アプリケーション全体のモーダル状態を管理するZustandストア
 *
 * @remarks
 * セキュリティ免責モーダルなど、複数のコンポーネントから参照されるモーダルの
 * 状態を一元管理することで、DRY原則を遵守し、コードの重複を防ぐ。
 *
 * モーダル表示の判定には2層のキャッシュ戦略を採用：
 * - sessionStorage: 同一タブ内の往復をスキップ
 * - localStorage: 時間ベースの有効期限管理
 */
export const useModalStore = create<ModalState>((set, get) => ({
  isSecurityDisclaimerOpen: false,
  openSecurityDisclaimer: () => set({ isSecurityDisclaimerOpen: true }),
  closeSecurityDisclaimer: () => set({ isSecurityDisclaimerOpen: false }),

  checkDisclaimerRequired: () => {
    // 1. sessionStorage チェック（同一タブ内）
    const sessionFlag = sessionStorage.getItem(SECURITY_DISCLAIMER_SESSION_KEY);
    if (sessionFlag !== null) {
      return false;
    }

    // 2. localStorage チェック（時間ベース）
    const timestamp = localStorage.getItem(SECURITY_DISCLAIMER_TIMESTAMP_KEY);
    if (timestamp !== null) {
      const elapsed = Date.now() - parseInt(timestamp, 10);
      if (elapsed < SECURITY_DISCLAIMER_EXPIRY_MS) {
        return false;
      }
    }

    return true; // モーダル表示が必要
  },

  recordDisclaimerConsent: () => {
    sessionStorage.setItem(SECURITY_DISCLAIMER_SESSION_KEY, "true");
    localStorage.setItem(
      SECURITY_DISCLAIMER_TIMESTAMP_KEY,
      Date.now().toString()
    );
  },

  tryNavigateToEditor: (router) => {
    if (get().checkDisclaimerRequired()) {
      get().openSecurityDisclaimer();
    } else {
      router.push("/training");
    }
  },
}));
