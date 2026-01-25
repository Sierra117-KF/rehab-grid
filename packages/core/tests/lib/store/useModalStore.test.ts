import {
  SECURITY_DISCLAIMER_EXPIRY_MS,
  SECURITY_DISCLAIMER_SESSION_KEY,
  SECURITY_DISCLAIMER_TIMESTAMP_KEY,
} from "@rehab-grid/core/lib/constants";
import { useModalStore } from "@rehab-grid/core/lib/store/useModalStore";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * ストアの初期状態
 *
 * @remarks
 * beforeEachでストアをリセットする際に使用する。
 * テスト間の独立性を確保するため、各テスト開始時にこの状態に戻す。
 */
const INITIAL_STATE = {
  isSecurityDisclaimerOpen: false,
};

describe("useModalStore", () => {
  beforeEach(() => {
    // テスト間の独立性を確保するため、ストアを初期状態にリセット
    useModalStore.setState(INITIAL_STATE);
    // ストレージをクリア
    sessionStorage.clear();
    localStorage.clear();
  });

  describe("初期状態", () => {
    it("isSecurityDisclaimerOpen が初期値 false である", () => {
      const state = useModalStore.getState();

      expect(state.isSecurityDisclaimerOpen).toBeFalsy();
    });
  });

  describe("openSecurityDisclaimer", () => {
    it("呼び出し後に isSecurityDisclaimerOpen が true になる", () => {
      const { openSecurityDisclaimer } = useModalStore.getState();

      openSecurityDisclaimer();

      expect(useModalStore.getState().isSecurityDisclaimerOpen).toBeTruthy();
    });

    it("既に true の状態で呼び出しても true のままである", () => {
      // Arrange: 既にモーダルが開いている状態
      useModalStore.setState({ isSecurityDisclaimerOpen: true });
      const { openSecurityDisclaimer } = useModalStore.getState();

      // Act
      openSecurityDisclaimer();

      // Assert
      expect(useModalStore.getState().isSecurityDisclaimerOpen).toBeTruthy();
    });
  });

  describe("closeSecurityDisclaimer", () => {
    it("呼び出し後に isSecurityDisclaimerOpen が false になる", () => {
      // Arrange: モーダルが開いている状態
      useModalStore.setState({ isSecurityDisclaimerOpen: true });
      const { closeSecurityDisclaimer } = useModalStore.getState();

      // Act
      closeSecurityDisclaimer();

      // Assert
      expect(useModalStore.getState().isSecurityDisclaimerOpen).toBeFalsy();
    });

    it("既に false の状態で呼び出しても false のままである", () => {
      const { closeSecurityDisclaimer } = useModalStore.getState();

      closeSecurityDisclaimer();

      expect(useModalStore.getState().isSecurityDisclaimerOpen).toBeFalsy();
    });
  });

  describe("状態遷移", () => {
    it("open → close → open の連続操作が正しく動作する", () => {
      const { openSecurityDisclaimer, closeSecurityDisclaimer } =
        useModalStore.getState();

      // 初期状態: false
      expect(useModalStore.getState().isSecurityDisclaimerOpen).toBeFalsy();

      // open → true
      openSecurityDisclaimer();
      expect(useModalStore.getState().isSecurityDisclaimerOpen).toBeTruthy();

      // close → false
      closeSecurityDisclaimer();
      expect(useModalStore.getState().isSecurityDisclaimerOpen).toBeFalsy();

      // open → true
      openSecurityDisclaimer();
      expect(useModalStore.getState().isSecurityDisclaimerOpen).toBeTruthy();
    });
  });

  describe("checkDisclaimerRequired", () => {
    it("sessionStorage にフラグがあれば false を返す", () => {
      sessionStorage.setItem(SECURITY_DISCLAIMER_SESSION_KEY, "true");
      const { checkDisclaimerRequired } = useModalStore.getState();

      expect(checkDisclaimerRequired()).toBeFalsy();
    });

    it("localStorage のタイムスタンプが有効期限内であれば false を返す", () => {
      // 現在時刻から10分前のタイムスタンプ（有効期限30分以内）
      const recentTimestamp = Date.now() - 10 * 60 * 1000;
      localStorage.setItem(
        SECURITY_DISCLAIMER_TIMESTAMP_KEY,
        recentTimestamp.toString()
      );
      const { checkDisclaimerRequired } = useModalStore.getState();

      expect(checkDisclaimerRequired()).toBeFalsy();
    });

    it("sessionStorage も localStorage もなければ true を返す", () => {
      const { checkDisclaimerRequired } = useModalStore.getState();

      expect(checkDisclaimerRequired()).toBeTruthy();
    });

    it("localStorage のタイムスタンプが有効期限切れであれば true を返す", () => {
      // 有効期限を過ぎたタイムスタンプ
      const expiredTimestamp = Date.now() - SECURITY_DISCLAIMER_EXPIRY_MS - 1000;
      localStorage.setItem(
        SECURITY_DISCLAIMER_TIMESTAMP_KEY,
        expiredTimestamp.toString()
      );
      const { checkDisclaimerRequired } = useModalStore.getState();

      expect(checkDisclaimerRequired()).toBeTruthy();
    });

    it("sessionStorage があれば localStorage のタイムスタンプが切れていても false を返す", () => {
      // sessionStorage にフラグあり
      sessionStorage.setItem(SECURITY_DISCLAIMER_SESSION_KEY, "true");
      // localStorage は期限切れ
      const expiredTimestamp = Date.now() - SECURITY_DISCLAIMER_EXPIRY_MS - 1000;
      localStorage.setItem(
        SECURITY_DISCLAIMER_TIMESTAMP_KEY,
        expiredTimestamp.toString()
      );
      const { checkDisclaimerRequired } = useModalStore.getState();

      expect(checkDisclaimerRequired()).toBeFalsy();
    });
  });

  describe("recordDisclaimerConsent", () => {
    it("sessionStorage にフラグを設定する", () => {
      const { recordDisclaimerConsent } = useModalStore.getState();

      recordDisclaimerConsent();

      expect(sessionStorage.getItem(SECURITY_DISCLAIMER_SESSION_KEY)).toBe(
        "true"
      );
    });

    it("localStorage にタイムスタンプを設定する", () => {
      const now = Date.now();
      vi.setSystemTime(now);
      const { recordDisclaimerConsent } = useModalStore.getState();

      recordDisclaimerConsent();

      expect(localStorage.getItem(SECURITY_DISCLAIMER_TIMESTAMP_KEY)).toBe(
        now.toString()
      );
      vi.useRealTimers();
    });
  });

  describe("tryNavigateToEditor", () => {
    it("モーダル表示が必要な場合は openSecurityDisclaimer を呼ぶ", () => {
      const mockRouter = { push: vi.fn() };
      const { tryNavigateToEditor } = useModalStore.getState();

      tryNavigateToEditor(mockRouter);

      expect(useModalStore.getState().isSecurityDisclaimerOpen).toBeTruthy();
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    it("モーダル表示が不要な場合は router.push を呼ぶ", () => {
      // sessionStorage にフラグを設定してモーダルをスキップ
      sessionStorage.setItem(SECURITY_DISCLAIMER_SESSION_KEY, "true");
      const mockRouter = { push: vi.fn() };
      const { tryNavigateToEditor } = useModalStore.getState();

      tryNavigateToEditor(mockRouter);

      expect(useModalStore.getState().isSecurityDisclaimerOpen).toBeFalsy();
      expect(mockRouter.push).toHaveBeenCalledWith("/training");
    });
  });
});
