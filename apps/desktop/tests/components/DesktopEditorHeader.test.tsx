import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DesktopEditorHeader } from "@/components/DesktopEditorHeader";

/**
 * EditorHeader のモック
 *
 * @remarks
 * DesktopEditorHeader は EditorHeader の単純なラッパーであるため、
 * 子コンポーネントをモックして、正しくレンダリングされることを検証する
 */
vi.mock("@rehab-grid/ui/components/editor/EditorHeader", () => ({
  EditorHeader: () => <div data-testid="editor-header">EditorHeader Mock</div>,
}));

describe("DesktopEditorHeader", () => {
  describe("レンダリング", () => {
    it("EditorHeader コンポーネントがレンダリングされる", () => {
      render(<DesktopEditorHeader />);

      expect(screen.getByTestId("editor-header")).toBeInTheDocument();
    });

    it("EditorHeader のコンテンツが表示される", () => {
      render(<DesktopEditorHeader />);

      expect(screen.getByText("EditorHeader Mock")).toBeInTheDocument();
    });
  });
});
