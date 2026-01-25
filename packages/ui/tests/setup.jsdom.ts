/**
 * Vitest jsdom 環境用グローバルセットアップ
 *
 * jsdom 環境では dnd-kit などの外部ライブラリをモックする必要がある。
 * ブラウザ環境では実際の動作を検証するため、モックは適用しない。
 *
 * @see tests/setup.browser.ts - ブラウザ環境用セットアップ
 */
import "@testing-library/jest-dom";

import { afterEach, vi } from "vitest";

import {
  mockDndKitCore,
  mockDndKitSortable,
  mockDndKitUtilities,
} from "@/tests/mocks/dnd-kit";

// dnd-kit のグローバルモック（jsdom 環境専用）
vi.mock("@dnd-kit/core", () => mockDndKitCore);
vi.mock("@dnd-kit/sortable", () => mockDndKitSortable);
vi.mock("@dnd-kit/utilities", () => mockDndKitUtilities);

// jsdom環境でBlob.slice().arrayBuffer()をサポートするPolyfill
// isValidImageBlob関数のテストに必要
const originalSlice = Blob.prototype.slice;
Blob.prototype.slice = function (
  start?: number,
  end?: number,
  contentType?: string
): Blob {
  const slicedBlob = originalSlice.call(this, start, end, contentType);

  // arrayBufferメソッドを追加
  // jsdomのslice()実装ではarrayBufferメソッドが存在しない場合がある
  // TypeScript型定義との不一致を型アサーションで解決
  if (!(slicedBlob as Partial<Blob>).arrayBuffer) {
    slicedBlob.arrayBuffer = async function (): Promise<ArrayBuffer> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve(reader.result as ArrayBuffer);
        };
        reader.onerror = () => {
          reject(new Error("FileReader error"));
        };
        reader.readAsArrayBuffer(this);
      });
    };
  }

  return slicedBlob;
};

afterEach(() => {
  vi.clearAllMocks();
});
