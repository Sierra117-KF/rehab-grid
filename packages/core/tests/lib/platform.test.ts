import { Platform } from "@rehab-grid/core/lib/platform";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("Platform", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("Tauri が注入するグローバルが無いブラウザでは Web 版と判定する", () => {
    expect(Platform.isBrowser).toBeTruthy();
    expect(Platform.isWeb).toBeTruthy();
    expect(Platform.isTauri).toBeFalsy();
  });

  it("withGlobalTauri 無効（window.__TAURI__ 無し）の Tauri 2 でも Desktop 版と判定する", () => {
    // Tauri 2 は withGlobalTauri の設定に関わらず globalThis.isTauri を注入する
    vi.stubGlobal("isTauri", true);

    expect("__TAURI__" in window).toBeFalsy();
    expect(Platform.isTauri).toBeTruthy();
    expect(Platform.isWeb).toBeFalsy();
  });
});
