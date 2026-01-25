import { FAQ, FAQ_ITEMS } from "@rehab-grid/ui/components/layout/FAQ";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

/** FAQ項目の総数 */
const FAQ_ITEM_COUNT = FAQ_ITEMS.length;

/** テスト用の質問と回答（ソースから導出） */
const FAQ_QUESTIONS = {
  first: FAQ_ITEMS[0]!.question,
  second: FAQ_ITEMS[1]!.question,
} as const;

const FAQ_ANSWERS = {
  first: FAQ_ITEMS[0]!.answer,
  second: FAQ_ITEMS[1]!.answer,
} as const;

/**
 * FAQの回答（string | ReactNode）をテスト用に文字列へ正規化する
 *
 * @remarks
 * 本テストは「文字列の回答」を前提としているため、ReactNode の場合は例外とする。
 */
function normalizeAnswerToText(answer: string | React.ReactNode): string {
  if (typeof answer === "string") return answer;
  throw new Error("このテストは文字列の回答のみを対象としています。");
}

describe("FAQ", () => {
  describe("初期表示", () => {
    it("「よくある質問」見出しが表示される", () => {
      render(<FAQ />);

      expect(
        screen.getByRole("heading", { name: "よくある質問" })
      ).toBeInTheDocument();
    });

    it("すべてのFAQ質問ボタンが表示される", () => {
      render(<FAQ />);

      const questionButtons = screen.getAllByRole("button");
      expect(questionButtons).toHaveLength(FAQ_ITEM_COUNT);
    });

    it("初期状態ですべてのアコーディオンが閉じている", () => {
      render(<FAQ />);

      const questionButtons = screen.getAllByRole("button");
      questionButtons.forEach((button) => {
        expect(button).toHaveAttribute("aria-expanded", "false");
      });
    });

    it("最初の質問が正しく表示される", () => {
      render(<FAQ />);

      expect(
        screen.getByRole("button", { name: FAQ_QUESTIONS.first })
      ).toBeInTheDocument();
    });
  });

  describe("アコーディオン動作", () => {
    it("質問クリックで回答が表示される", async () => {
      const user = userEvent.setup();
      render(<FAQ />);

      const firstQuestion = screen.getByRole("button", {
        name: FAQ_QUESTIONS.first,
      });

      await user.click(firstQuestion);

      expect(firstQuestion).toHaveAttribute("aria-expanded", "true");
      expect(
        screen.getByText(normalizeAnswerToText(FAQ_ANSWERS.first))
      ).toBeVisible();
    });

    it("開いている項目を再度クリックすると閉じる", async () => {
      const user = userEvent.setup();
      render(<FAQ />);

      const firstQuestion = screen.getByRole("button", {
        name: FAQ_QUESTIONS.first,
      });

      // 開く
      await user.click(firstQuestion);
      expect(firstQuestion).toHaveAttribute("aria-expanded", "true");

      // 閉じる
      await user.click(firstQuestion);
      expect(firstQuestion).toHaveAttribute("aria-expanded", "false");
    });

    it("別の項目をクリックすると前の項目が閉じる", async () => {
      const user = userEvent.setup();
      render(<FAQ />);

      const firstQuestion = screen.getByRole("button", {
        name: FAQ_QUESTIONS.first,
      });
      const secondQuestion = screen.getByRole("button", {
        name: FAQ_QUESTIONS.second,
      });

      // 最初の項目を開く
      await user.click(firstQuestion);
      expect(firstQuestion).toHaveAttribute("aria-expanded", "true");
      expect(secondQuestion).toHaveAttribute("aria-expanded", "false");

      // 2番目の項目を開く
      await user.click(secondQuestion);
      expect(firstQuestion).toHaveAttribute("aria-expanded", "false");
      expect(secondQuestion).toHaveAttribute("aria-expanded", "true");
    });

    it("開いた項目の回答が表示される", async () => {
      const user = userEvent.setup();
      render(<FAQ />);

      const secondQuestion = screen.getByRole("button", {
        name: FAQ_QUESTIONS.second,
      });

      await user.click(secondQuestion);

      expect(
        screen.getByText(normalizeAnswerToText(FAQ_ANSWERS.second))
      ).toBeVisible();
    });
  });

  describe("アクセシビリティ", () => {
    it("aria-controls が対応するコンテンツIDを参照する", () => {
      render(<FAQ />);

      const firstQuestion = screen.getByRole("button", {
        name: FAQ_QUESTIONS.first,
      });

      const controlsId = firstQuestion.getAttribute("aria-controls");
      expect(controlsId).toBe("faq-content-0");

      // 対応するregionが存在することを確認
      const regions = screen.getAllByRole("region");
      const contentRegion = regions.find((region) => region.id === controlsId);
      expect(contentRegion).toBeDefined();
    });

    it("各質問ボタンが対応するコンテンツIDを参照する", () => {
      render(<FAQ />);

      const questionButtons = screen.getAllByRole("button");
      questionButtons.forEach((button, index) => {
        expect(button).toHaveAttribute("aria-controls", `faq-content-${index}`);
      });
    });

    it("開いたときregion内に回答テキストが含まれる", async () => {
      const user = userEvent.setup();
      render(<FAQ />);

      const firstQuestion = screen.getByRole("button", {
        name: FAQ_QUESTIONS.first,
      });
      await user.click(firstQuestion);

      const controlsId = firstQuestion.getAttribute("aria-controls")!;
      const regions = screen.getAllByRole("region");
      const contentRegion = regions.find((region) => region.id === controlsId)!;

      expect(
        within(contentRegion).getByText(
          normalizeAnswerToText(FAQ_ANSWERS.first)
        )
      ).toBeVisible();
    });
  });
});
