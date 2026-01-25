import { debounce } from "@rehab-grid/core/utils/debounce";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("基本動作", () => {
    it("delay後に関数が1回呼ばれる", () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 1000);

      debouncedFn();
      expect(mockFn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it("delay前は関数が呼ばれない", () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 1000);

      debouncedFn();
      vi.advanceTimersByTime(999);

      expect(mockFn).not.toHaveBeenCalled();
    });

    it("delay経過後に再度呼び出すと再び実行される", () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 1000);

      debouncedFn();
      vi.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalledTimes(1);

      debouncedFn();
      vi.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe("連続呼び出し", () => {
    it("連続呼び出しで最後の呼び出しのみ実行される", () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 1000);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      vi.advanceTimersByTime(1000);

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it("連続呼び出しで最後の引数のみ渡される", () => {
      const mockFn = vi.fn<(value: string) => void>();
      const debouncedFn = debounce(mockFn, 1000);

      debouncedFn("first");
      debouncedFn("second");
      debouncedFn("third");

      vi.advanceTimersByTime(1000);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith("third");
    });

    it("呼び出しごとにタイマーがリセットされる", () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 1000);

      debouncedFn();
      vi.advanceTimersByTime(500);
      expect(mockFn).not.toHaveBeenCalled();

      debouncedFn();
      vi.advanceTimersByTime(500);
      expect(mockFn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(500);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("引数の受け渡し", () => {
    it("単一の引数が正しく渡される", () => {
      const mockFn = vi.fn<(value: number) => void>();
      const debouncedFn = debounce(mockFn, 1000);

      debouncedFn(42);
      vi.advanceTimersByTime(1000);

      expect(mockFn).toHaveBeenCalledWith(42);
    });

    it("複数の引数が正しく渡される", () => {
      const mockFn = vi.fn<(a: string, b: number, c: boolean) => void>();
      const debouncedFn = debounce(mockFn, 1000);

      debouncedFn("hello", 123, true);
      vi.advanceTimersByTime(1000);

      expect(mockFn).toHaveBeenCalledWith("hello", 123, true);
    });

    it("オブジェクト引数が正しく渡される", () => {
      const mockFn = vi.fn<(data: { id: number; name: string }) => void>();
      const debouncedFn = debounce(mockFn, 1000);

      const data = { id: 1, name: "テスト" };
      debouncedFn(data);
      vi.advanceTimersByTime(1000);

      expect(mockFn).toHaveBeenCalledWith(data);
    });
  });

  describe("独立性", () => {
    it("複数のdebounced関数が互いに干渉しない", () => {
      const mockFn1 = vi.fn();
      const mockFn2 = vi.fn();
      const debouncedFn1 = debounce(mockFn1, 1000);
      const debouncedFn2 = debounce(mockFn2, 500);

      debouncedFn1();
      debouncedFn2();

      vi.advanceTimersByTime(500);
      expect(mockFn1).not.toHaveBeenCalled();
      expect(mockFn2).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(500);
      expect(mockFn1).toHaveBeenCalledTimes(1);
      expect(mockFn2).toHaveBeenCalledTimes(1);
    });

    it("同じ関数から複数のdebounced関数を作成しても独立して動作する", () => {
      const originalFn = vi.fn();
      const debouncedFn1 = debounce(originalFn, 1000);
      const debouncedFn2 = debounce(originalFn, 2000);

      debouncedFn1();
      debouncedFn2();

      vi.advanceTimersByTime(1000);
      expect(originalFn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1000);
      expect(originalFn).toHaveBeenCalledTimes(2);
    });
  });

  describe("エッジケース", () => {
    it("delay=0 の場合も正しく動作する", () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 0);

      debouncedFn();
      expect(mockFn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(0);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it("delay=0 でも連続呼び出しで最後の呼び出しのみ実行される", () => {
      const mockFn = vi.fn<(value: string) => void>();
      const debouncedFn = debounce(mockFn, 0);

      debouncedFn("first");
      debouncedFn("second");
      debouncedFn("third");

      vi.advanceTimersByTime(0);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith("third");
    });

    it("引数なしの関数も正しく動作する", () => {
      const mockFn = vi.fn<() => void>();
      const debouncedFn = debounce(mockFn, 1000);

      debouncedFn();
      vi.advanceTimersByTime(1000);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith();
    });

    it("非常に長いdelayでも正しく動作する", () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 60000);

      debouncedFn();
      vi.advanceTimersByTime(59999);
      expect(mockFn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });
});
