import { isTauri } from "@tauri-apps/api/core";

/**
 * プラットフォーム検出ユーティリティ
 *
 * Web版（ブラウザ）とTauri版（Desktop）を判別するための定数を提供します。
 * SSR時（typeof window === "undefined"）は全てfalseを返します。
 *
 * Tauri の判定は `@tauri-apps/api/core` の `isTauri()` を使う。
 * `window.__TAURI__` は `app.withGlobalTauri` 有効時にしか定義されないため使わない。
 *
 * @example
 * ```ts
 * import { Platform } from "@rehab-grid/core/lib/platform";
 *
 * if (Platform.isTauri) {
 *   // Tauri環境: OSの既定ブラウザで開く
 *   const { openUrl } = await import("@tauri-apps/plugin-opener");
 *   await openUrl(url);
 * } else if (Platform.isWeb) {
 *   // Web環境: 新しいタブで開く
 *   window.open(url, "_blank", "noopener,noreferrer");
 * }
 * ```
 */
export const Platform = {
  /** ブラウザ環境かどうか（SSR時はfalse） */
  get isBrowser(): boolean {
    return typeof window !== "undefined";
  },

  /** Web版（Tauri以外のブラウザ）かどうか */
  get isWeb(): boolean {
    return typeof window !== "undefined" && !isTauri();
  },

  /** Tauri（Desktop）版かどうか */
  get isTauri(): boolean {
    return typeof window !== "undefined" && isTauri();
  },
} as const;
