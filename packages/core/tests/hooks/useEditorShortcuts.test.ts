import { useEditorShortcuts } from "@rehab-grid/core/hooks/useEditorShortcuts";
import { useEditorStore } from "@rehab-grid/core/lib/store/useEditorStore";
import { type EditorItem } from "@rehab-grid/core/types";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  loadProject: vi.fn().mockResolvedValue(undefined),
  saveProject: vi.fn(),
  createNewProject: () => ({
    meta: {
      version: "1.0.0",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      title: "無題のプロジェクト",
      projectType: "training",
    },
    settings: { layoutType: "grid2", themeColor: "#3b82f6" },
    items: [],
  }),
}));

/**
 * テスト用のEditorItemを生成
 */
const createTestItem = (title: string): EditorItem => ({
  id: "item-1",
  order: 0,
  title,
  imageSource: "",
  description: "",
});

/** 現在のカードタイトル */
const currentTitle = () => useEditorStore.getState().items[0]?.title;

/**
 * keydown イベントを発火し、イベントを返す
 */
function pressKey(
  init: KeyboardEventInit,
  target: EventTarget = document.body
): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

/**
 * キー入力の発生元になる要素を body に追加して返す
 *
 * @param tagName - 要素のタグ名
 * @param attributes - 要素に付ける属性
 * @param parentRole - 親要素の role（ダイアログ内を再現する場合）
 */
function appendElement(
  tagName: string,
  attributes: Record<string, string> = {},
  parentRole?: string
): HTMLElement {
  const element = document.createElement(tagName);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }

  if (parentRole === undefined) {
    document.body.append(element);
  } else {
    const parent = document.createElement("div");
    parent.setAttribute("role", parentRole);
    parent.append(element);
    document.body.append(parent);
  }
  return element;
}

describe("useEditorShortcuts", () => {
  beforeEach(() => {
    // 「変更前」→「変更後」の 1 操作を行った状態にする
    useEditorStore.setState({
      items: [createTestItem("変更前")],
      past: [],
      future: [],
      lastHistoryCommit: null,
    });
    useEditorStore.getState().updateItem("item-1", { title: "変更後" });
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("Undo", () => {
    it("Ctrl+Z で元に戻し、ブラウザ標準動作を止める", () => {
      renderHook(() => useEditorShortcuts());

      const event = pressKey({ key: "z", ctrlKey: true });

      expect(currentTitle()).toBe("変更前");
      expect(event.defaultPrevented).toBeTruthy();
    });

    it("Cmd+Z（Mac）で元に戻す", () => {
      renderHook(() => useEditorShortcuts());

      pressKey({ key: "z", metaKey: true });

      expect(currentTitle()).toBe("変更前");
    });

    it("履歴がないときは preventDefault しない", () => {
      renderHook(() => useEditorShortcuts());
      pressKey({ key: "z", ctrlKey: true });

      const event = pressKey({ key: "z", ctrlKey: true });

      expect(event.defaultPrevented).toBeFalsy();
    });
  });

  describe("Redo", () => {
    beforeEach(() => {
      useEditorStore.getState().undo();
    });

    it("Ctrl+Shift+Z でやり直す（Shift 押下時の大文字 Z も判定する）", () => {
      renderHook(() => useEditorShortcuts());

      const event = pressKey({ key: "Z", ctrlKey: true, shiftKey: true });

      expect(currentTitle()).toBe("変更後");
      expect(event.defaultPrevented).toBeTruthy();
    });

    it("Cmd+Shift+Z（Mac）でやり直す", () => {
      renderHook(() => useEditorShortcuts());

      pressKey({ key: "Z", metaKey: true, shiftKey: true });

      expect(currentTitle()).toBe("変更後");
    });

    it("Ctrl+Y でやり直す", () => {
      renderHook(() => useEditorShortcuts());

      pressKey({ key: "y", ctrlKey: true });

      expect(currentTitle()).toBe("変更後");
    });
  });

  describe("何もしないケース", () => {
    it("修飾キーなしの Z は無視する", () => {
      renderHook(() => useEditorShortcuts());

      const event = pressKey({ key: "z" });

      expect(currentTitle()).toBe("変更後");
      expect(event.defaultPrevented).toBeFalsy();
    });

    it("IME 変換中は無視する", () => {
      renderHook(() => useEditorShortcuts());

      pressKey({ key: "z", ctrlKey: true, isComposing: true });

      expect(currentTitle()).toBe("変更後");
    });

    it.each([
      ["input", () => appendElement("input")],
      ["textarea", () => appendElement("textarea")],
      ["select", () => appendElement("select")],
      [
        "contenteditable",
        () => appendElement("div", { contenteditable: "true" }),
      ],
      ["dialog 内", () => appendElement("button", {}, "dialog")],
      ["alertdialog 内", () => appendElement("button", {}, "alertdialog")],
    ])("フォーカスが %s のときはブラウザ標準に任せる", (_, createTarget) => {
      renderHook(() => useEditorShortcuts());

      const event = pressKey({ key: "z", ctrlKey: true }, createTarget());

      expect(currentTitle()).toBe("変更後");
      expect(event.defaultPrevented).toBeFalsy();
    });

    it("入力欄以外のボタンにフォーカスがあるときは実行する", () => {
      renderHook(() => useEditorShortcuts());

      pressKey({ key: "z", ctrlKey: true }, appendElement("button"));

      expect(currentTitle()).toBe("変更前");
    });

    it("アンマウント後は反応しない", () => {
      const { unmount } = renderHook(() => useEditorShortcuts());
      unmount();

      pressKey({ key: "z", ctrlKey: true });

      expect(currentTitle()).toBe("変更後");
    });
  });
});
