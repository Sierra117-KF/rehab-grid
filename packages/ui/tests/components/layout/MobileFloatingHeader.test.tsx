import { MobileFloatingHeader } from "@rehab-grid/ui/components/layout/MobileFloatingHeader";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("MobileFloatingHeader", () => {
  describe("基本レンダリング", () => {
    it("header (banner) 要素が表示される", () => {
      render(<MobileFloatingHeader />);

      const header = screen.getByRole("banner");
      expect(header).toBeInTheDocument();
    });
  });

  describe("スロットレンダリング", () => {
    it("leftSlot にコンテンツを渡すと正しく表示される", () => {
      render(
        <MobileFloatingHeader leftSlot={<button type="button">メニュー</button>} />
      );

      expect(
        screen.getByRole("button", { name: "メニュー" })
      ).toBeInTheDocument();
    });

    it("centerSlot にコンテンツを渡すと正しく表示される", () => {
      render(<MobileFloatingHeader centerSlot={<span>タイトル</span>} />);

      expect(screen.getByText("タイトル")).toBeInTheDocument();
    });

    it("rightSlot にコンテンツを渡すと正しく表示される", () => {
      render(
        <MobileFloatingHeader rightSlot={<button type="button">アクション</button>} />
      );

      expect(
        screen.getByRole("button", { name: "アクション" })
      ).toBeInTheDocument();
    });

    it("すべてのスロットにコンテンツを渡すと正しく表示される", () => {
      render(
        <MobileFloatingHeader
          leftSlot={<button type="button">左</button>}
          centerSlot={<span>中央</span>}
          rightSlot={<button type="button">右</button>}
        />
      );

      expect(screen.getByRole("button", { name: "左" })).toBeInTheDocument();
      expect(screen.getByText("中央")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "右" })).toBeInTheDocument();
    });
  });

  describe("空スロット", () => {
    it("すべてのスロットが未指定でもエラーなくレンダリングされる", () => {
      render(<MobileFloatingHeader />);

      // header要素が存在し、クラッシュしないことを確認
      const header = screen.getByRole("banner");
      expect(header).toBeInTheDocument();
    });
  });
});
