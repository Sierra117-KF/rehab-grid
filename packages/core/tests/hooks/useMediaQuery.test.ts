import { useIsMobile, useMediaQuery } from "@rehab-grid/core/hooks/useMediaQuery";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * MediaQueryList のモックを作成
 *
 * @remarks
 * window.matchMedia が返すオブジェクトをモックする。
 * イベントリスナーの登録・削除と、changeイベントの発火をサポート。
 */
function createMockMediaQueryList(initialMatches: boolean): {
  mediaQueryList: MediaQueryList;
  listeners: Set<(event: MediaQueryListEvent) => void>;
  setMatches: (matches: boolean) => void;
} {
  let matches = initialMatches;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  const mediaQueryList: MediaQueryList = {
    get matches() {
      return matches;
    },
    media: "",
    onchange: null,
    addEventListener: vi.fn(
      (
        _type: string,
        listener: EventListenerOrEventListenerObject | null
      ): void => {
        if (listener && typeof listener === "function") {
          listeners.add(listener as (event: MediaQueryListEvent) => void);
        }
      }
    ),
    removeEventListener: vi.fn(
      (
        _type: string,
        listener: EventListenerOrEventListenerObject | null
      ): void => {
        if (listener && typeof listener === "function") {
          listeners.delete(listener as (event: MediaQueryListEvent) => void);
        }
      }
    ),
    dispatchEvent: vi.fn(() => true),
    // 非推奨だが MediaQueryList インターフェースの一部
    addListener: vi.fn(),
    removeListener: vi.fn(),
  };

  /**
   * matches 値を更新し、登録されたリスナーに通知する
   */
  const setMatches = (newMatches: boolean): void => {
    matches = newMatches;
    const event: Pick<MediaQueryListEvent, "matches"> = { matches: newMatches };
    listeners.forEach((listener) =>
      listener(event as unknown as MediaQueryListEvent)
    );
  };

  return { mediaQueryList, listeners, setMatches };
}

describe("useMediaQuery", () => {
  /** matchMedia のモック */
  let mockMatchMedia: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockMatchMedia = vi.fn();
    vi.stubGlobal("matchMedia", mockMatchMedia);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("初期値の取得", () => {
    it("クエリがマッチする場合、true を返す", () => {
      const { mediaQueryList } = createMockMediaQueryList(true);
      mockMatchMedia.mockReturnValue(mediaQueryList);

      const { result } = renderHook(() => useMediaQuery("(max-width: 767px)"));

      expect(result.current).toBeTruthy();
    });

    it("クエリがマッチしない場合、false を返す", () => {
      const { mediaQueryList } = createMockMediaQueryList(false);
      mockMatchMedia.mockReturnValue(mediaQueryList);

      const { result } = renderHook(() => useMediaQuery("(max-width: 767px)"));

      expect(result.current).toBeFalsy();
    });

    it("指定したクエリ文字列で matchMedia が呼ばれる", () => {
      const { mediaQueryList } = createMockMediaQueryList(false);
      mockMatchMedia.mockReturnValue(mediaQueryList);
      const query = "(min-width: 1024px)";

      renderHook(() => useMediaQuery(query));

      expect(mockMatchMedia).toHaveBeenCalledWith(query);
    });
  });

  describe("変更の検知", () => {
    it("メディアクエリの状態が変わると、戻り値が更新される", () => {
      const { mediaQueryList, setMatches } = createMockMediaQueryList(false);
      mockMatchMedia.mockReturnValue(mediaQueryList);

      const { result } = renderHook(() => useMediaQuery("(max-width: 767px)"));

      // 初期状態は false
      expect(result.current).toBeFalsy();

      // メディアクエリがマッチするように変更
      act(() => {
        setMatches(true);
      });

      expect(result.current).toBeTruthy();
    });

    it("複数回の変更に対応できる", () => {
      const { mediaQueryList, setMatches } = createMockMediaQueryList(false);
      mockMatchMedia.mockReturnValue(mediaQueryList);

      const { result } = renderHook(() => useMediaQuery("(max-width: 767px)"));

      expect(result.current).toBeFalsy();

      act(() => {
        setMatches(true);
      });
      expect(result.current).toBeTruthy();

      act(() => {
        setMatches(false);
      });
      expect(result.current).toBeFalsy();
    });
  });

  describe("イベントリスナーの管理", () => {
    it("マウント時に change イベントリスナーが登録される", () => {
      const { mediaQueryList } = createMockMediaQueryList(false);
      mockMatchMedia.mockReturnValue(mediaQueryList);

      renderHook(() => useMediaQuery("(max-width: 767px)"));

      expect(mediaQueryList.addEventListener).toHaveBeenCalledWith(
        "change",
        expect.any(Function)
      );
    });

    it("アンマウント時にイベントリスナーが削除される", () => {
      const { mediaQueryList } = createMockMediaQueryList(false);
      mockMatchMedia.mockReturnValue(mediaQueryList);

      const { unmount } = renderHook(() => useMediaQuery("(max-width: 767px)"));

      unmount();

      expect(mediaQueryList.removeEventListener).toHaveBeenCalledWith(
        "change",
        expect.any(Function)
      );
    });
  });

  describe("クエリの変更", () => {
    it("クエリが変更されると新しいクエリで matchMedia が呼ばれる", () => {
      const { mediaQueryList } = createMockMediaQueryList(false);
      mockMatchMedia.mockReturnValue(mediaQueryList);

      const { rerender } = renderHook(({ query }) => useMediaQuery(query), {
        initialProps: { query: "(max-width: 767px)" },
      });

      rerender({ query: "(min-width: 1024px)" });

      expect(mockMatchMedia).toHaveBeenLastCalledWith("(min-width: 1024px)");
    });
  });
});

describe("useIsMobile", () => {
  /** matchMedia のモック */
  let mockMatchMedia: ReturnType<typeof vi.fn>;

  /** クエリごとのモック結果を管理するMap */
  let queryMocks: Map<string, ReturnType<typeof createMockMediaQueryList>>;

  /**
   * 複数のメディアクエリに対してモック結果を設定
   *
   * @param narrowScreen - 狭い画面判定 (max-width: 767px)
   * @param touchDevice - タッチデバイス判定 (pointer: coarse)
   */
  function setupMediaQueryMocks(
    narrowScreen: boolean,
    touchDevice: boolean
  ): void {
    queryMocks = new Map();

    // 狭い画面のモック
    const narrowMock = createMockMediaQueryList(narrowScreen);
    queryMocks.set("(max-width: 767px)", narrowMock);

    // タッチデバイスのモック（画面幅に関係なく）
    const touchMock = createMockMediaQueryList(touchDevice);
    queryMocks.set("(pointer: coarse)", touchMock);

    // matchMedia をクエリに応じて適切なモックを返すよう設定
    mockMatchMedia.mockImplementation((query: string) => {
      const mock = queryMocks.get(query);
      return (
        mock?.mediaQueryList ?? createMockMediaQueryList(false).mediaQueryList
      );
    });
  }

  beforeEach(() => {
    mockMatchMedia = vi.fn();
    vi.stubGlobal("matchMedia", mockMatchMedia);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("狭い画面の判定（従来のスマートフォン判定）", () => {
    it("767px 以下の場合、true を返す", () => {
      setupMediaQueryMocks(true, false);

      const { result } = renderHook(() => useIsMobile());

      expect(result.current).toBeTruthy();
    });

    it("768px 以上かつマウス操作の場合、false を返す", () => {
      setupMediaQueryMocks(false, false);

      const { result } = renderHook(() => useIsMobile());

      expect(result.current).toBeFalsy();
    });
  });

  describe("タッチデバイス判定（画面幅に依存しない）", () => {
    it("タッチデバイスの場合、画面幅に関係なく true を返す", () => {
      // 768px以上だがタッチデバイス（タブレット横向き含む）
      setupMediaQueryMocks(false, true);

      const { result } = renderHook(() => useIsMobile());

      expect(result.current).toBeTruthy();
    });

    it("マウス操作かつ768px以上の場合、false を返す（PC）", () => {
      // 768px以上、マウス操作（pointer: fine）
      setupMediaQueryMocks(false, false);

      const { result } = renderHook(() => useIsMobile());

      expect(result.current).toBeFalsy();
    });
  });

  describe("複合条件の判定", () => {
    it("狭い画面とタッチデバイスの両方がtrueの場合、true を返す", () => {
      setupMediaQueryMocks(true, true);

      const { result } = renderHook(() => useIsMobile());

      expect(result.current).toBeTruthy();
    });
  });

  describe("メディアクエリの発行", () => {
    it("2つのメディアクエリで matchMedia が呼ばれる", () => {
      setupMediaQueryMocks(false, false);

      renderHook(() => useIsMobile());

      expect(mockMatchMedia).toHaveBeenCalledWith("(max-width: 767px)");
      expect(mockMatchMedia).toHaveBeenCalledWith("(pointer: coarse)");
    });
  });

  describe("状態変更の検知", () => {
    it("狭い画面からワイド画面に変わると戻り値が更新される", () => {
      setupMediaQueryMocks(true, false);

      const { result } = renderHook(() => useIsMobile());
      expect(result.current).toBeTruthy();

      // 狭い画面のモックを取得して状態を変更
      const narrowMock = queryMocks.get("(max-width: 767px)");
      act(() => {
        narrowMock?.setMatches(false);
      });

      expect(result.current).toBeFalsy();
    });

    it("タッチデバイスからマウス操作に変わると戻り値が更新される", () => {
      setupMediaQueryMocks(false, true);

      const { result } = renderHook(() => useIsMobile());
      expect(result.current).toBeTruthy();

      // タッチデバイスのモックを取得して状態を変更
      const touchMock = queryMocks.get("(pointer: coarse)");
      act(() => {
        touchMock?.setMatches(false);
      });

      expect(result.current).toBeFalsy();
    });
  });
});
