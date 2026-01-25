import { downloadBlob } from "@rehab-grid/core/utils/download";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("downloadBlob", () => {
  const mockObjectUrl = "blob:http://localhost:3000/mock-object-url";

  let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // URL APIのモック
    createObjectURLSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue(mockObjectUrl);
    revokeObjectURLSpy = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});

    // HTMLAnchorElement.prototype.click のモック
    clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("正常系", () => {
    it("Blobからダウンロードリンクが作成されクリックされる", () => {
      const blob = new Blob(["test content"], { type: "text/plain" });
      const filename = "test-file.txt";

      downloadBlob(blob, filename);

      expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
      expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it("指定したファイル名がdownload属性に設定される", () => {
      const blob = new Blob(["test"], { type: "text/plain" });
      const filename = "my-document.pdf";
      let capturedLink: HTMLAnchorElement | null = null;

      // appendChildをspyしてリンク要素をキャプチャ（元の実装は呼び出す）
      const originalAppendChild = document.body.appendChild.bind(document.body);
      const appendChildSpy = vi
        .spyOn(document.body, "appendChild")
        .mockImplementation((node) => {
          capturedLink = node as HTMLAnchorElement;
          return originalAppendChild(node);
        });

      downloadBlob(blob, filename);

      expect(capturedLink).not.toBeNull();
      expect(capturedLink!.download).toBe(filename);
      expect(capturedLink!.href).toBe(mockObjectUrl);

      appendChildSpy.mockRestore();
    });

    it("処理後にURL.revokeObjectURLでリソースをクリーンアップする", () => {
      const blob = new Blob(["cleanup test"], { type: "text/plain" });

      downloadBlob(blob, "cleanup.txt");

      expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectURLSpy).toHaveBeenCalledWith(mockObjectUrl);
    });
  });

  describe("DOM操作", () => {
    it("リンク要素が一時的にDOMに追加され削除される", () => {
      const blob = new Blob(["dom test"], { type: "text/plain" });
      const appendChildSpy = vi.spyOn(document.body, "appendChild");
      const removeChildSpy = vi.spyOn(document.body, "removeChild");

      downloadBlob(blob, "dom-test.txt");

      expect(appendChildSpy).toHaveBeenCalledTimes(1);
      expect(removeChildSpy).toHaveBeenCalledTimes(1);

      // 追加されたノードと削除されたノードが同じであること
      const appendedNode = appendChildSpy.mock.calls[0]![0];
      const removedNode = removeChildSpy.mock.calls[0]![0];
      expect(appendedNode).toBe(removedNode);
      expect(appendedNode).toBeInstanceOf(HTMLAnchorElement);
    });

    it("作成されるリンク要素はa要素である", () => {
      const blob = new Blob(["anchor test"], { type: "text/plain" });
      let capturedLink: Node | null = null;

      const originalAppendChild = document.body.appendChild.bind(document.body);
      const appendChildSpy = vi
        .spyOn(document.body, "appendChild")
        .mockImplementation((node) => {
          capturedLink = node;
          return originalAppendChild(node);
        });

      downloadBlob(blob, "anchor.txt");

      expect(capturedLink).not.toBeNull();
      expect(capturedLink!.nodeName).toBe("A");

      appendChildSpy.mockRestore();
    });
  });

  describe("エッジケース", () => {
    it("空のBlobでも正常に動作する", () => {
      const emptyBlob = new Blob([], { type: "text/plain" });

      expect(() => downloadBlob(emptyBlob, "empty.txt")).not.toThrow();
      expect(createObjectURLSpy).toHaveBeenCalledWith(emptyBlob);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1);
    });

    it("ファイル名に日本語が含まれていても動作する", () => {
      const blob = new Blob(["日本語テスト"], { type: "text/plain" });
      const filename = "テストファイル.txt";
      let capturedLink: HTMLAnchorElement | null = null;

      const originalAppendChild = document.body.appendChild.bind(document.body);
      const appendChildSpy = vi
        .spyOn(document.body, "appendChild")
        .mockImplementation((node) => {
          capturedLink = node as HTMLAnchorElement;
          return originalAppendChild(node);
        });

      downloadBlob(blob, filename);

      expect(capturedLink!.download).toBe(filename);

      appendChildSpy.mockRestore();
    });

    it("ファイル名に特殊文字が含まれていても動作する", () => {
      const blob = new Blob(["special chars"], { type: "text/plain" });
      const filename = "file (1) [copy].txt";
      let capturedLink: HTMLAnchorElement | null = null;

      const originalAppendChild = document.body.appendChild.bind(document.body);
      const appendChildSpy = vi
        .spyOn(document.body, "appendChild")
        .mockImplementation((node) => {
          capturedLink = node as HTMLAnchorElement;
          return originalAppendChild(node);
        });

      downloadBlob(blob, filename);

      expect(capturedLink!.download).toBe(filename);

      appendChildSpy.mockRestore();
    });

    it("異なるMIMEタイプのBlobでも動作する", () => {
      const pdfBlob = new Blob(["PDF content"], { type: "application/pdf" });
      const zipBlob = new Blob(["ZIP content"], { type: "application/zip" });

      downloadBlob(pdfBlob, "document.pdf");
      downloadBlob(zipBlob, "archive.zip");

      expect(createObjectURLSpy).toHaveBeenCalledTimes(2);
      expect(clickSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("処理順序", () => {
    it("createObjectURL → appendChild → click → removeChild → revokeObjectURL の順序で実行される", () => {
      const blob = new Blob(["order test"], { type: "text/plain" });
      const callOrder: string[] = [];

      createObjectURLSpy.mockImplementation(() => {
        callOrder.push("createObjectURL");
        return mockObjectUrl;
      });

      const appendChildSpy = vi
        .spyOn(document.body, "appendChild")
        .mockImplementation((node) => {
          callOrder.push("appendChild");
          return node;
        });

      clickSpy.mockImplementation(() => {
        callOrder.push("click");
      });

      const removeChildSpy = vi
        .spyOn(document.body, "removeChild")
        .mockImplementation((node) => {
          callOrder.push("removeChild");
          return node;
        });

      revokeObjectURLSpy.mockImplementation(() => {
        callOrder.push("revokeObjectURL");
      });

      downloadBlob(blob, "order.txt");

      expect(callOrder).toEqual([
        "createObjectURL",
        "appendChild",
        "click",
        "removeChild",
        "revokeObjectURL",
      ]);

      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });
});
