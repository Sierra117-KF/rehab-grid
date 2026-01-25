/**
 * プラットフォーム検出ユーティリティ
 *
 * Web版（ブラウザ）とTauri版（Desktop）を判別するための定数を提供します。
 * SSR時（typeof window === "undefined"）は全てfalseを返します。
 *
 * @example
 * ```ts
 * import { Platform } from "@rehab-grid/core/lib/platform";
 *
 * if (Platform.isTauri) {
 *   // Tauri固有の処理
 *   const { open } = await import("@tauri-apps/plugin-dialog");
 *   await open({ directory: true });
 * } else if (Platform.isWeb) {
 *   // Web版の処理
 *   const handle = await window.showDirectoryPicker();
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
    return typeof window !== "undefined" && !("__TAURI__" in window);
  },

  /** Tauri（Desktop）版かどうか */
  get isTauri(): boolean {
    return typeof window !== "undefined" && "__TAURI__" in window;
  },
} as const;
