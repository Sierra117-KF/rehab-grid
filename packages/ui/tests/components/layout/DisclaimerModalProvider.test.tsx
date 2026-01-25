import {
  BUTTON_CANCEL,
  SECURITY_DISCLAIMER_AGREE_BUTTON,
  SECURITY_DISCLAIMER_CHECKBOX_LABEL,
  SECURITY_DISCLAIMER_TITLE,
} from "@rehab-grid/core/lib/constants";
import { DisclaimerModalProvider } from "@rehab-grid/ui/components/layout/DisclaimerModalProvider";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * vi.hoisted でモック関数を事前定義
 *
 * @remarks
 * Vitest v4 では vi.mock 内でモック関数を参照する場合、
 * vi.hoisted で事前定義する必要がある（巻き上げタイミングの問題を解決）
 */
const {
  mockPush,
  mockUsePathname,
  mockCloseSecurityDisclaimer,
  mockOpenSecurityDisclaimer,
  mockRecordDisclaimerConsent,
  mockCheckDisclaimerRequired,
  mockUseModalStore,
} = vi.hoisted(() => ({
  mockPush: vi.fn(),
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
  useRouter: () => ({ push: mockPush }),
  usePathname: mockUsePathname,
}));

/**
 * useModalStore のモック
 *
 * @remarks
 * テストケースごとに isSecurityDisclaimerOpen の値を変更できるように、
 * モック関数を使用して柔軟に制御する
 */
vi.mock("@/lib/store/useModalStore", () => ({
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
 * DisclaimerModalProvider をレンダリングするヘルパー
 *
 * @param isOpen モーダルの初期表示状態
 * @param pathname 現在のパス名（デフォルト: "/"）
 */
function setupProvider(isOpen = false, pathname = "/") {
  mockUsePathname.mockReturnValue(pathname);
  mockCheckDisclaimerRequired.mockReturnValue(false);
  setupModalStore(isOpen);
  render(<DisclaimerModalProvider />);
}

describe("DisclaimerModalProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("初期状態", () => {
    it("isSecurityDisclaimerOpen=false のときモーダルは表示されない", () => {
      setupProvider(false);

      expect(
        screen.queryByText(SECURITY_DISCLAIMER_TITLE)
      ).not.toBeInTheDocument();
    });
  });

  describe("モーダル表示", () => {
    it("isSecurityDisclaimerOpen=true のときモーダルが表示される", () => {
      setupProvider(true);

      expect(screen.getByText(SECURITY_DISCLAIMER_TITLE)).toBeInTheDocument();
    });

    it("同意ボタンとキャンセルボタンが表示される", () => {
      setupProvider(true);

      expect(
        screen.getByRole("button", { name: SECURITY_DISCLAIMER_AGREE_BUTTON })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: BUTTON_CANCEL })
      ).toBeInTheDocument();
    });
  });

  describe("トップページ（/）から開いた場合", () => {
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

      it('router.push("/training") が呼ばれる', async () => {
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

        expect(mockPush).toHaveBeenCalledWith("/training");
      });
    });

    describe("キャンセルボタンクリック", () => {
      it("closeSecurityDisclaimer が呼ばれる", async () => {
        const user = userEvent.setup();
        setupProvider(true, "/");

        const cancelButton = screen.getByRole("button", {
          name: BUTTON_CANCEL,
        });
        await user.click(cancelButton);

        expect(mockCloseSecurityDisclaimer).toHaveBeenCalledTimes(1);
      });

      it("router.push は呼ばれない（遷移なし）", async () => {
        const user = userEvent.setup();
        setupProvider(true, "/");

        const cancelButton = screen.getByRole("button", {
          name: BUTTON_CANCEL,
        });
        await user.click(cancelButton);

        expect(mockPush).not.toHaveBeenCalled();
      });
    });
  });

  describe("エディタページ（/training）に直接アクセスした場合", () => {
    describe("同意ボタンクリック", () => {
      it("recordDisclaimerConsent が呼ばれる", async () => {
        const user = userEvent.setup();
        setupProvider(true, "/training");

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
        setupProvider(true, "/training");

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

      it("router.push は呼ばれない（すでに /training にいるため）", async () => {
        const user = userEvent.setup();
        setupProvider(true, "/training");

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

        expect(mockPush).not.toHaveBeenCalled();
      });
    });

    describe("キャンセルボタンクリック", () => {
      it("closeSecurityDisclaimer が呼ばれる", async () => {
        const user = userEvent.setup();
        setupProvider(true, "/training");

        const cancelButton = screen.getByRole("button", {
          name: BUTTON_CANCEL,
        });
        await user.click(cancelButton);

        expect(mockCloseSecurityDisclaimer).toHaveBeenCalledTimes(1);
      });

      it('router.push("/") が呼ばれる（トップへ遷移）', async () => {
        const user = userEvent.setup();
        setupProvider(true, "/training");

        const cancelButton = screen.getByRole("button", {
          name: BUTTON_CANCEL,
        });
        await user.click(cancelButton);

        expect(mockPush).toHaveBeenCalledWith("/");
      });
    });
  });

  describe("useEffect による自動モーダル表示", () => {
    it("/training + checkDisclaimerRequired=true のとき openSecurityDisclaimer が呼ばれる", () => {
      mockUsePathname.mockReturnValue("/training");
      mockCheckDisclaimerRequired.mockReturnValue(true);
      setupModalStore(false);

      render(<DisclaimerModalProvider />);

      expect(mockOpenSecurityDisclaimer).toHaveBeenCalledTimes(1);
    });

    it("/training + checkDisclaimerRequired=false のとき openSecurityDisclaimer は呼ばれない", () => {
      mockUsePathname.mockReturnValue("/training");
      mockCheckDisclaimerRequired.mockReturnValue(false);
      setupModalStore(false);

      render(<DisclaimerModalProvider />);

      expect(mockOpenSecurityDisclaimer).not.toHaveBeenCalled();
    });

    it("/ + checkDisclaimerRequired=true のとき openSecurityDisclaimer は呼ばれない", () => {
      mockUsePathname.mockReturnValue("/");
      mockCheckDisclaimerRequired.mockReturnValue(true);
      setupModalStore(false);

      render(<DisclaimerModalProvider />);

      expect(mockOpenSecurityDisclaimer).not.toHaveBeenCalled();
    });
  });
});
