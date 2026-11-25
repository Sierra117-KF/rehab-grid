import {
  readLocalStorage,
  requestPersistentStorage,
  writeLocalStorage,
} from "@rehab-grid/core/utils/storage";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("utils/storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("readLocalStorage / writeLocalStorage", () => {
    it("書いた値を読める", () => {
      writeLocalStorage("key", "value");

      expect(readLocalStorage("key")).toBe("value");
    });

    it("値がなければ undefined を返す", () => {
      expect(readLocalStorage("missing")).toBeUndefined();
    });

    it("localStorage が例外を投げても読み書きで例外にならない", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("SecurityError");
      });
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

      expect(() => {
        writeLocalStorage("key", "value");
      }).not.toThrow();
      expect(readLocalStorage("key")).toBeUndefined();
    });
  });

  describe("requestPersistentStorage", () => {
    it("未対応の環境では false を返す", async () => {
      vi.stubGlobal("navigator", {});

      expect(await requestPersistentStorage()).toBeFalsy();
    });

    it("すでに永続化されていれば persist を呼ばない", async () => {
      const persist = vi.fn();
      vi.stubGlobal("navigator", {
        storage: { persisted: vi.fn().mockResolvedValue(true), persist },
      });

      expect(await requestPersistentStorage()).toBeTruthy();
      expect(persist).not.toHaveBeenCalled();
    });

    it("永続化されていなければ要求し、その結果を返す", async () => {
      vi.stubGlobal("navigator", {
        storage: {
          persisted: vi.fn().mockResolvedValue(false),
          persist: vi.fn().mockResolvedValue(true),
        },
      });

      expect(await requestPersistentStorage()).toBeTruthy();
    });

    it("要求が失敗しても例外にせず false を返す", async () => {
      vi.stubGlobal("navigator", {
        storage: {
          persisted: vi.fn().mockRejectedValue(new Error("失敗")),
          persist: vi.fn(),
        },
      });

      expect(await requestPersistentStorage()).toBeFalsy();
    });
  });
});
