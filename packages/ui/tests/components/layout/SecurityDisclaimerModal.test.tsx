import {
  BUTTON_CANCEL,
  SECURITY_DISCLAIMER_AGREE_BUTTON,
  SECURITY_DISCLAIMER_CHECKBOX_LABEL,
  SECURITY_DISCLAIMER_DEVICE_DESCRIPTION,
  SECURITY_DISCLAIMER_DEVICE_TITLE,
  SECURITY_DISCLAIMER_INCOGNITO_DESCRIPTION,
  SECURITY_DISCLAIMER_INCOGNITO_TITLE,
  SECURITY_DISCLAIMER_PRIVACY_DESCRIPTION,
  SECURITY_DISCLAIMER_PRIVACY_TITLE,
  SECURITY_DISCLAIMER_SECURITY_DESCRIPTION,
  SECURITY_DISCLAIMER_SECURITY_TITLE,
  SECURITY_DISCLAIMER_TERMS_LINK,
  SECURITY_DISCLAIMER_TITLE,
} from "@rehab-grid/core/lib/constants";
import {
  SecurityDisclaimerModal,
  type SecurityDisclaimerModalProps,
} from "@rehab-grid/ui/components/layout/SecurityDisclaimerModal";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

/**
 * デフォルトのpropsを生成
 */
function createDefaultProps(): SecurityDisclaimerModalProps {
  return {
    open: true,
    onOpenChange: vi.fn(),
    onAgree: vi.fn(),
  };
}

/**
 * SecurityDisclaimerModal のセットアップヘルパー
 *
 * テストごとに props を組み立てる重複を減らし、Arrange/Act/Assert を明確にする。
 */
function setupSecurityDisclaimerModal(
  overrides: Partial<SecurityDisclaimerModalProps> = {}
): SecurityDisclaimerModalProps {
  const props = { ...createDefaultProps(), ...overrides };
  render(<SecurityDisclaimerModal {...props} />);
  return props;
}

describe("SecurityDisclaimerModal", () => {
  describe("表示/非表示", () => {
    it("open=false のとき何も表示されない", () => {
      setupSecurityDisclaimerModal({ open: false });

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("open=true のときダイアログが表示される", () => {
      setupSecurityDisclaimerModal({ open: true });

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("タイトル表示", () => {
    it("ダイアログタイトルが表示される", () => {
      setupSecurityDisclaimerModal();

      expect(
        screen.getByRole("heading", { name: SECURITY_DISCLAIMER_TITLE })
      ).toBeInTheDocument();
    });
  });

  describe("注意事項カードの表示", () => {
    it("セキュリティについての注意事項が表示される", () => {
      setupSecurityDisclaimerModal();

      expect(
        screen.getByText(SECURITY_DISCLAIMER_SECURITY_TITLE)
      ).toBeInTheDocument();
      expect(
        screen.getByText(SECURITY_DISCLAIMER_SECURITY_DESCRIPTION)
      ).toBeInTheDocument();
    });

    it("端末・ブラウザの安全性の注意事項が表示される", () => {
      setupSecurityDisclaimerModal();

      expect(
        screen.getByText(SECURITY_DISCLAIMER_DEVICE_TITLE)
      ).toBeInTheDocument();
      expect(
        screen.getByText(SECURITY_DISCLAIMER_DEVICE_DESCRIPTION)
      ).toBeInTheDocument();
    });

    it("個人情報の取り扱いの注意事項が表示される", () => {
      setupSecurityDisclaimerModal();

      expect(
        screen.getByText(SECURITY_DISCLAIMER_PRIVACY_TITLE)
      ).toBeInTheDocument();
      expect(
        screen.getByText(SECURITY_DISCLAIMER_PRIVACY_DESCRIPTION)
      ).toBeInTheDocument();
    });

    it("シークレットモード推奨の注意事項が表示される", () => {
      setupSecurityDisclaimerModal();

      expect(
        screen.getByText(SECURITY_DISCLAIMER_INCOGNITO_TITLE)
      ).toBeInTheDocument();
      expect(
        screen.getByText(SECURITY_DISCLAIMER_INCOGNITO_DESCRIPTION)
      ).toBeInTheDocument();
    });
  });

  describe("利用規約リンク", () => {
    it("利用規約リンクテキストが表示される", () => {
      setupSecurityDisclaimerModal();

      expect(
        screen.getByRole("link", { name: SECURITY_DISCLAIMER_TERMS_LINK })
      ).toBeInTheDocument();
    });

    it("利用規約リンクのhrefが正しい", () => {
      setupSecurityDisclaimerModal();

      const link = screen.getByRole("link", {
        name: SECURITY_DISCLAIMER_TERMS_LINK,
      });
      expect(link).toHaveAttribute("href", "/terms");
    });
  });

  describe("チェックボックス", () => {
    it("確認チェックボックスが表示される", () => {
      setupSecurityDisclaimerModal();

      expect(
        screen.getByRole("checkbox", { name: SECURITY_DISCLAIMER_CHECKBOX_LABEL })
      ).toBeInTheDocument();
    });

    it("初期状態でチェックボックスはOFF", () => {
      setupSecurityDisclaimerModal();

      const checkbox = screen.getByRole("checkbox", {
        name: SECURITY_DISCLAIMER_CHECKBOX_LABEL,
      });
      expect(checkbox).not.toBeChecked();
    });

    it("初期状態で同意ボタンは無効", () => {
      setupSecurityDisclaimerModal();

      const agreeButton = screen.getByRole("button", {
        name: SECURITY_DISCLAIMER_AGREE_BUTTON,
      });
      expect(agreeButton).toBeDisabled();
    });

    it("チェックボックスをONにすると同意ボタンが有効になる", async () => {
      const user = userEvent.setup();
      setupSecurityDisclaimerModal();

      const checkbox = screen.getByRole("checkbox", {
        name: SECURITY_DISCLAIMER_CHECKBOX_LABEL,
      });
      await user.click(checkbox);

      const agreeButton = screen.getByRole("button", {
        name: SECURITY_DISCLAIMER_AGREE_BUTTON,
      });
      expect(agreeButton).toBeEnabled();
    });
  });

  describe("ボタン操作", () => {
    it("キャンセルボタンクリックで onOpenChange(false) が呼ばれる", async () => {
      const user = userEvent.setup();
      const props = setupSecurityDisclaimerModal();

      const cancelButton = screen.getByRole("button", { name: BUTTON_CANCEL });
      await user.click(cancelButton);

      expect(props.onOpenChange).toHaveBeenCalledWith(false);
      expect(props.onOpenChange).toHaveBeenCalledTimes(1);
    });

    it("チェック後に同意ボタンクリックで onAgree が呼ばれる", async () => {
      const user = userEvent.setup();
      const props = setupSecurityDisclaimerModal();

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

      expect(props.onAgree).toHaveBeenCalledTimes(1);
    });
  });

  describe("アクセシビリティ", () => {
    it("role='dialog' が設定されている", () => {
      setupSecurityDisclaimerModal();

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });
});
