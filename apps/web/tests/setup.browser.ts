/**
 * Vitest ブラウザ環境用グローバルセットアップ
 *
 * ブラウザ環境では実際のDOM APIとライブラリ動作を検証するため、
 * dnd-kit などの外部ライブラリはモックしない。
 *
 * @see tests/setup.jsdom.ts - jsdom 環境用セットアップ
 */
import { afterEach, vi } from "vitest";

afterEach(() => {
  vi.clearAllMocks();
});
