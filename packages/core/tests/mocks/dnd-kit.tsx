/**
 * dnd-kit ライブラリのモック
 *
 * Canvas や ImageLibraryPanel などの D&D 機能を持つコンポーネントのテストで使用。
 * ユニットテストでは D&D の挙動そのものは検証しないため、
 * dnd-kit を最小限のスタブに差し替える。
 *
 * @remarks
 * - DOMに不要な属性を流さないよう、createElement + Fragment を使用
 * - JSX を使用すると余分な <div> がDOMに追加され、アクセシビリティテストに影響する可能性がある
 */
import { createElement, Fragment, type ReactNode } from "react";
import { vi } from "vitest";

/**
 * dnd-kit/core のモック
 */
export const mockDndKitCore = {
  DndContext: ({ children }: { children: ReactNode }) =>
    createElement(Fragment, null, children),
  DragOverlay: () => null,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  TouchSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
};

/**
 * dnd-kit/sortable のモック
 */
export const mockDndKitSortable = {
  SortableContext: ({ children }: { children: ReactNode }) =>
    createElement(Fragment, null, children),
  arrayMove: (arr: unknown[], from: number, to: number) => {
    const result = [...arr];
    const [removed] = result.splice(from, 1);
    result.splice(to, 0, removed);
    return result;
  },
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: vi.fn(() => ({
    attributes: {
      role: "button",
      tabIndex: 0,
    },
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
  verticalListSortingStrategy: vi.fn(),
  rectSortingStrategy: vi.fn(),
};

/**
 * dnd-kit/utilities のモック
 */
export const mockDndKitUtilities = {
  CSS: {
    Transform: {
      toString: vi.fn(() => undefined),
    },
  },
};
