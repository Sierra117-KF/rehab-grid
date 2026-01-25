import {
  SECURITY_DISCLAIMER_AGREE_BUTTON,
  SECURITY_DISCLAIMER_CHECKBOX_LABEL,
  SECURITY_DISCLAIMER_TITLE,
} from "@rehab-grid/core/lib/constants";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DesktopDisclaimerModalProvider } from "@/components/DesktopDisclaimerModalProvider";

/**
 * vi.hoisted でモック関数を事前定義
 *
 * @remarks
 * Vitest v4 では vi.mock 内でモック関数を参照する場合、
 * vi.hoisted で事前定義する必要がある（巻き上げタイミングの問題を解決）
 */
const {
  mockUsePathname,
  mockCloseSecurityDisclaimer,
  mockOpenSecurityDisclaimer,
  mockRecordDisclaimerConsent,
  mockCheckDisclaimerRequired,
  mockUseModalStore,
} = vi.hoisted(() => ({
  mockUsePathname: vi.fn(),
  mockCloseSecurityDisclaimer: vi.fn(),
  mockOpenSecurityDisclaimer: vi.fn(),
  mockRecordDisclaimerConsent: vi.fn(),
  mockCheckDisclaimerRequired: vi.fn(),
  mockUseModalStore: vi.fn(),
}));

/**
 * next/navigation のモック
 */
vi.mock("next/navigation", () => ({
  usePathname: mockUsePathname,
}));

/**
 * useModalStore のモック
 *
 * @remarks
 * テストケースごとに isSecurityDisclaimerOpen の値を変更できるように、
 * モック関数を使用して柔軟に制御する
 */
vi.mock("@rehab-grid/core/lib/store/useModalStore", () => ({
  useModalStore: mockUseModalStore,
}));

/**
 * モーダルストアの状態をセットアップするヘルパー
 */
function setupModalStore(isOpen: boolean) {
  mockUseModalStore.mockReturnValue({
    isSecurityDisclaimerOpen: isOpen,
    openSecurityDisclaimer: mockOpenSecurityDisclaimer,
    closeSecurityDisclaimer: mockCloseSecurityDisclaimer,
    checkDisclaimerRequired: mockCheckDisclaimerRequired,
    recordDisclaimerConsent: mockRecordDisclaimerConsent,
  });
}

/**
 * DesktopDisclaimerModalProvider をレンダリングするヘルパー
 *
 * @param isOpen モーダルの初期表示状態
 * @param pathname 現在のパス名（デフォルト: "/"）
 * @param checkRequired checkDisclaimerRequired の戻り値（デフォルト: false）
 */
function setupProvider(
  isOpen = false,
  pathname = "/",
  checkRequired = false,
) {
  mockUsePathname.mockReturnValue(pathname);
  mockCheckDisclaimerRequired.mockReturnValue(checkRequired);
  setupModalStore(isOpen);
  render(<DesktopDisclaimerModalProvider />);
}

describe("DesktopDisclaimerModalProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("初期状態", () => {
    it("isSecurityDisclaimerOpen=false のときモーダルは表示されない", () => {
      setupProvider(false);

      expect(
        screen.queryByText(SECURITY_DISCLAIMER_TITLE),
      ).not.toBeInTheDocument();
    });
  });

  describe("モーダル表示", () => {
    it("isSecurityDisclaimerOpen=true のときモーダルが表示される", () => {
      setupProvider(true);

      expect(screen.getByText(SECURITY_DISCLAIMER_TITLE)).toBeInTheDocument();
    });

    it("キャンセルボタンは表示されない（showCancelButton=false）", () => {
      setupProvider(true);

      // キャンセルボタンが存在しないことを確認
      expect(
        screen.queryByRole("button", { name: "キャンセル" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("useEffect による自動モーダル表示", () => {
    it("/ + checkDisclaimerRequired=true のとき openSecurityDisclaimer が呼ばれる", () => {
      mockUsePathname.mockReturnValue("/");
      mockCheckDisclaimerRequired.mockReturnValue(true);
      setupModalStore(false);

      render(<DesktopDisclaimerModalProvider />);

      expect(mockOpenSecurityDisclaimer).toHaveBeenCalledTimes(1);
    });

    it("/ + checkDisclaimerRequired=false のとき openSecurityDisclaimer は呼ばれない", () => {
      mockUsePathname.mockReturnValue("/");
      mockCheckDisclaimerRequired.mockReturnValue(false);
      setupModalStore(false);

      render(<DesktopDisclaimerModalProvider />);

      expect(mockOpenSecurityDisclaimer).not.toHaveBeenCalled();
    });

    it("/terms + checkDisclaimerRequired=true のとき openSecurityDisclaimer は呼ばれない", () => {
      mockUsePathname.mockReturnValue("/terms");
      mockCheckDisclaimerRequired.mockReturnValue(true);
      setupModalStore(false);

      render(<DesktopDisclaimerModalProvider />);

      expect(mockOpenSecurityDisclaimer).not.toHaveBeenCalled();
    });

    it("/privacy でも openSecurityDisclaimer は呼ばれない", () => {
      mockUsePathname.mockReturnValue("/privacy");
      mockCheckDisclaimerRequired.mockReturnValue(true);
      setupModalStore(false);

      render(<DesktopDisclaimerModalProvider />);

      expect(mockOpenSecurityDisclaimer).not.toHaveBeenCalled();
    });

    it("/changelog でも openSecurityDisclaimer は呼ばれない", () => {
      mockUsePathname.mockReturnValue("/changelog");
      mockCheckDisclaimerRequired.mockReturnValue(true);
      setupModalStore(false);

      render(<DesktopDisclaimerModalProvider />);

      expect(mockOpenSecurityDisclaimer).not.toHaveBeenCalled();
    });
  });

  describe("同意ボタンクリック", () => {
    it("recordDisclaimerConsent が呼ばれる", async () => {
      const user = userEvent.setup();
      setupProvider(true, "/");

      // チェックボックスをONにする
      const checkbox = screen.getByRole("checkbox", {
        name: SECURITY_DISCLAIMER_CHECKBOX_LABEL,
      });
      await user.click(checkbox);

      // 同意ボタンをクリック
      const agreeButton = screen.getByRole("button", {
        name: SECURITY_DISCLAIMER_AGREE_BUTTON,
      });
      await user.click(agreeButton);

      expect(mockRecordDisclaimerConsent).toHaveBeenCalledTimes(1);
    });

    it("closeSecurityDisclaimer が呼ばれる", async () => {
      const user = userEvent.setup();
      setupProvider(true, "/");

      // チェックボックスをONにする
      const checkbox = screen.getByRole("checkbox", {
        name: SECURITY_DISCLAIMER_CHECKBOX_LABEL,
      });
      await user.click(checkbox);

      // 同意ボタンをクリック
      const agreeButton = screen.getByRole("button", {
        name: SECURITY_DISCLAIMER_AGREE_BUTTON,
      });
      await user.click(agreeButton);

      expect(mockCloseSecurityDisclaimer).toHaveBeenCalledTimes(1);
    });

    it("チェックボックスがOFFの状態では同意ボタンが無効", () => {
      setupProvider(true, "/");

      const agreeButton = screen.getByRole("button", {
        name: SECURITY_DISCLAIMER_AGREE_BUTTON,
      });
      expect(agreeButton).toBeDisabled();
    });
  });
});
