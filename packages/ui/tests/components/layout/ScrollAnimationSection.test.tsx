import { ScrollAnimationSection } from "@rehab-grid/ui/components/layout/ScrollAnimationSection";
import { act, render, screen } from "@testing-library/react";
import type { Mock } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** テスト用のdata-testid */
const SECTION_TESTID = "scroll-animation-section";

/**
 * IntersectionObserver のモック用変数
 */
let observerCallback: IntersectionObserverCallback;
let mockObserve: Mock<(target: Element) => void>;
let mockUnobserve: Mock<(target: Element) => void>;
let mockDisconnect: Mock<() => void>;

/**
 * IntersectionObserverEntry のモックを生成
 */
function createMockEntry(
  isIntersecting: boolean,
  target?: Element
): IntersectionObserverEntry {
  const emptyRect: DOMRectReadOnly = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    toJSON: () => ({}),
  };

  return {
    isIntersecting,
    target: target ?? document.createElement("div"),
    boundingClientRect: emptyRect,
    intersectionRatio: isIntersecting ? 1 : 0,
    intersectionRect: emptyRect,
    rootBounds: null,
    time: Date.now(),
  };
}

/**
 * observer callback を呼び出して可視性変化をシミュレート
 */
function simulateIntersection(isIntersecting: boolean, target?: Element): void {
  act(() => {
    const mockObserver: IntersectionObserver = {
      root: null,
      rootMargin: "",
      thresholds: [],
      observe: mockObserve,
      unobserve: mockUnobserve,
      disconnect: mockDisconnect,
      takeRecords: () => [],
    };
    observerCallback([createMockEntry(isIntersecting, target)], mockObserver);
  });
}

beforeEach(() => {
  mockObserve = vi.fn<(target: Element) => void>();
  mockUnobserve = vi.fn<(target: Element) => void>();
  mockDisconnect = vi.fn<() => void>();

  /**
   * IntersectionObserver モッククラス
   *
   * @remarks Vitest v4 ではコンストラクタのモックに class 構文が必須
   */
  class MockIntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin: string = "";
    readonly thresholds: readonly number[] = [];

    constructor(callback: IntersectionObserverCallback) {
      observerCallback = callback;
    }

    observe(target: Element): void {
      mockObserve(target);
    }

    unobserve(target: Element): void {
      mockUnobserve(target);
    }

    disconnect(): void {
      mockDisconnect();
    }

    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }

  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ScrollAnimationSection", () => {
  describe("初期レンダリング", () => {
    it("section要素がレンダリングされる", () => {
      render(
        <ScrollAnimationSection>
          <p>コンテンツ</p>
        </ScrollAnimationSection>
      );

      expect(screen.getByTestId(SECTION_TESTID)).toBeInTheDocument();
    });

    it("子要素が正しく表示される", () => {
      render(
        <ScrollAnimationSection>
          <p>テストコンテンツ</p>
        </ScrollAnimationSection>
      );

      expect(screen.getByText("テストコンテンツ")).toBeInTheDocument();
    });

    it("className propが適用される", () => {
      render(
        <ScrollAnimationSection className="custom-class">
          <p>コンテンツ</p>
        </ScrollAnimationSection>
      );

      const section = screen.getByTestId(SECTION_TESTID);
      expect(section).toHaveClass("custom-class");
    });

    it("scroll-animateクラスが付与される", () => {
      render(
        <ScrollAnimationSection>
          <p>コンテンツ</p>
        </ScrollAnimationSection>
      );

      const section = screen.getByTestId(SECTION_TESTID);
      expect(section).toHaveClass("scroll-animate");
    });
  });

  describe("可視性の変化", () => {
    it("初期状態ではis-visibleクラスが付与されない", () => {
      render(
        <ScrollAnimationSection>
          <p>コンテンツ</p>
        </ScrollAnimationSection>
      );

      const section = screen.getByTestId(SECTION_TESTID);
      expect(section).not.toHaveClass("is-visible");
    });

    it("ビューポートに入るとis-visibleクラスが追加される", () => {
      render(
        <ScrollAnimationSection>
          <p>コンテンツ</p>
        </ScrollAnimationSection>
      );

      const section = screen.getByTestId(SECTION_TESTID);
      simulateIntersection(true, section);

      expect(section).toHaveClass("is-visible");
    });

    it("triggerOnceにより一度表示後も維持される", () => {
      render(
        <ScrollAnimationSection>
          <p>コンテンツ</p>
        </ScrollAnimationSection>
      );

      const section = screen.getByTestId(SECTION_TESTID);

      // ビューポートに入る
      simulateIntersection(true, section);
      expect(section).toHaveClass("is-visible");

      // ビューポートから離れる（triggerOnce=trueなのでunobserve済み）
      // is-visibleは維持される
      simulateIntersection(false, section);
      expect(section).toHaveClass("is-visible");
    });
  });

  describe("Observer動作", () => {
    it("マウント時にobserveが呼ばれる", () => {
      render(
        <ScrollAnimationSection>
          <p>コンテンツ</p>
        </ScrollAnimationSection>
      );

      expect(mockObserve).toHaveBeenCalledTimes(1);
    });

    it("ビューポートに入るとunobserveが呼ばれる（triggerOnce）", () => {
      render(
        <ScrollAnimationSection>
          <p>コンテンツ</p>
        </ScrollAnimationSection>
      );

      const section = screen.getByTestId(SECTION_TESTID);
      simulateIntersection(true, section);

      expect(mockUnobserve).toHaveBeenCalledTimes(1);
    });

    it("アンマウント時にdisconnectが呼ばれる", () => {
      const { unmount } = render(
        <ScrollAnimationSection>
          <p>コンテンツ</p>
        </ScrollAnimationSection>
      );

      unmount();

      // rerender時にrefがnullになりdisconnectが呼ばれる
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });

  describe("複数の子要素", () => {
    it("複数の子要素を含むセクションが正しくレンダリングされる", () => {
      render(
        <ScrollAnimationSection>
          <h2>タイトル</h2>
          <p>段落1</p>
          <p>段落2</p>
        </ScrollAnimationSection>
      );

      expect(
        screen.getByRole("heading", { name: "タイトル" })
      ).toBeInTheDocument();
      expect(screen.getByText("段落1")).toBeInTheDocument();
      expect(screen.getByText("段落2")).toBeInTheDocument();
    });
  });
});
