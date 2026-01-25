/**
 * next/image のモック
 *
 * Next.js の Image コンポーネントは最適化機能を持つため、
 * テスト環境では標準の img 要素としてレンダリングする。
 *
 * DOMに不要な属性（fill, unoptimized 等）を流さないことで、React の警告を回避する。
 */
import { createElement } from "react";

/**
 * next/image モックのprops型
 */
type MockImageProps = {
  src: string;
  alt: string;
  className?: string;
  draggable?: boolean;
};

/**
 * next/image モック定義
 *
 * @remarks vi.mock() と組み合わせて使用
 * @example
 * ```ts
 * import { mockNextImage } from "@/tests/mocks/next-image";
 * vi.mock("next/image", () => mockNextImage);
 * ```
 */
export const mockNextImage = {
  default: ({ src, alt, className, draggable }: MockImageProps) =>
    createElement("img", {
      src,
      alt,
      className,
      draggable,
    }),
};
