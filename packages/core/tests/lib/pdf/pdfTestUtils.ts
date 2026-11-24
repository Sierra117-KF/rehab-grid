/**
 * lib/pdf テスト用の共通モック・ヘルパー
 *
 * jsdom 環境では @react-pdf/renderer が動作しないため、コンポーネントを名前付き関数に置き換え、
 * 生成された要素ツリーの構造だけを検証する。
 */

import { type EditorItem, type ProjectMeta } from "@rehab-grid/core/types";

/**
 * @react-pdf/renderer のモック実装
 *
 * createElement で生成される要素の type は関数への参照になるため、
 * 名前付き関数にして function.name でコンポーネントを識別できるようにする
 */
export const reactPdfMock = {
  Document: function Document() {
    return null;
  },
  Page: function Page() {
    return null;
  },
  View: function View() {
    return null;
  },
  Text: function Text() {
    return null;
  },
  Image: function Image() {
    return null;
  },
  StyleSheet: {
    create: <T extends object>(styles: T): T => styles,
  },
};

type MockElement = {
  type?: string | ((...args: unknown[]) => unknown);
  props?: { children?: unknown } & Record<string, unknown>;
};

/**
 * 要素ツリーから指定したコンポーネント名の要素を再帰的に集める
 */
export function findElementsByType(
  element: unknown,
  targetType: string
): MockElement[] {
  if (Array.isArray(element)) {
    return element.flatMap((child) => findElementsByType(child, targetType));
  }
  if (!element || typeof element !== "object") return [];

  const el = element as MockElement;
  const typeName = typeof el.type === "function" ? el.type.name : el.type;
  const results = typeName === targetType ? [el] : [];
  return [...results, ...findElementsByType(el.props?.children, targetType)];
}

/**
 * 要素ツリー内の Text 要素のテキストを出現順に取り出す
 */
export function extractTextContent(element: unknown): string[] {
  return findElementsByType(element, "Text").map((el) => {
    const children = el.props?.children;
    return typeof children === "string" ? children : "";
  });
}

/**
 * テスト用の EditorItem を生成
 */
export function createTestItem(overrides: Partial<EditorItem> = {}): EditorItem {
  return {
    id: "test-item-1",
    order: 0,
    title: "テスト運動",
    imageSource: "",
    description: "",
    ...overrides,
  };
}

/**
 * テスト用の ProjectMeta を生成
 */
export function createTestMeta(
  overrides: Partial<ProjectMeta> = {}
): ProjectMeta {
  return {
    version: "1.0.0",
    createdAt: "2025-01-15T00:00:00.000Z",
    updatedAt: "2025-01-15T00:00:00.000Z",
    title: "テストプロジェクト",
    projectType: "training",
    ...overrides,
  };
}
