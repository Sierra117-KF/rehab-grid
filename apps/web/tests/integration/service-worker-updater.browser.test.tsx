/**
 * ServiceWorkerUpdater 結合テスト（Browser Mode）
 *
 * @remarks
 * Service Worker の更新検知から通知表示・オートセーブ確定・SKIP_WAITING 送信・
 * controllerchange による再読み込みまでの一連のフローを実ブラウザ環境で検証する。
 */
import { registerAutosaveFlusher } from "@rehab-grid/core/lib/store/autosaveFlusher";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { ServiceWorkerUpdater } from "../../src/components/ServiceWorkerUpdater";

/** テスト用の ServiceWorker モック */
class MockServiceWorker extends EventTarget {
  state: ServiceWorkerState;
  postMessage = vi.fn();

  constructor(initialState: ServiceWorkerState) {
    super();
    this.state = initialState;
  }

  setState(nextState: ServiceWorkerState) {
    this.state = nextState;
    this.dispatchEvent(new Event("statechange"));
  }
}

/** テスト用の ServiceWorkerRegistration モック */
class MockRegistration extends EventTarget {
  installing: MockServiceWorker | null = null;
  waiting: MockServiceWorker | null = null;
  active: MockServiceWorker | null = null;
  update = vi.fn().mockResolvedValue(undefined);
}

/** テスト用の ServiceWorkerContainer モック */
class MockServiceWorkerContainer extends EventTarget {
  controller: MockServiceWorker | null = null;
  register = vi.fn();
}

/** テスト対象を描画するラッパー */
function TestApp({ onReload }: { onReload: () => void }) {
  return <ServiceWorkerUpdater onReload={onReload} />;
}

describe("ServiceWorkerUpdater", () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(
    Navigator.prototype,
    "serviceWorker"
  );
  const originalVisibilityDescriptor = Object.getOwnPropertyDescriptor(
    Document.prototype,
    "visibilityState"
  );

  let container: MockServiceWorkerContainer;
  let registration: MockRegistration;

  beforeEach(() => {
    container = new MockServiceWorkerContainer();
    registration = new MockRegistration();
    container.register.mockResolvedValue(registration);

    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: container,
    });

    registerAutosaveFlusher(undefined);
    toast.dismiss();
  });

  afterEach(() => {
    toast.dismiss();
    registerAutosaveFlusher(undefined);

    if (originalDescriptor) {
      Object.defineProperty(navigator, "serviceWorker", originalDescriptor);
    }
    if (originalVisibilityDescriptor) {
      Object.defineProperty(
        document,
        "visibilityState",
        originalVisibilityDescriptor
      );
    }
    vi.clearAllMocks();
  });

  it("読み込み時に waiting と controller がある場合は更新通知を表示する", async () => {
    container.controller = new MockServiceWorker("activated");
    registration.waiting = new MockServiceWorker("installed");

    await render(<TestApp onReload={vi.fn()} />);

    expect(container.register).toHaveBeenCalledWith("/sw.js", {
      updateViaCache: "none",
    });
    await expect
      .element(page.getByText("新しいバージョンがあります"))
      .toBeInTheDocument();
  });

  it("初回インストール（controller なし）では更新通知を表示しない", async () => {
    container.controller = null;
    registration.waiting = new MockServiceWorker("installed");

    await render(<TestApp onReload={vi.fn()} />);
    await vi.waitFor(() => {
      expect(container.register).toHaveBeenCalledTimes(1);
    });

    await expect
      .element(page.getByText("新しいバージョンがあります"))
      .not.toBeInTheDocument();
  });

  it("登録完了時点で installing だった場合でも、installed になったら通知を表示する", async () => {
    const installing = new MockServiceWorker("installing");
    container.controller = new MockServiceWorker("activated");
    registration.installing = installing;

    await render(<TestApp onReload={vi.fn()} />);
    await vi.waitFor(() => {
      expect(container.register).toHaveBeenCalledTimes(1);
    });

    await expect
      .element(page.getByText("新しいバージョンがあります"))
      .not.toBeInTheDocument();

    // インストール完了で waiting に遷移
    registration.installing = null;
    registration.waiting = installing;
    installing.setState("installed");

    await expect
      .element(page.getByText("新しいバージョンがあります"))
      .toBeInTheDocument();
  });

  it("閲覧中に updatefound → installed となったら通知を表示する", async () => {
    container.controller = new MockServiceWorker("activated");

    await render(<TestApp onReload={vi.fn()} />);
    await vi.waitFor(() => {
      expect(container.register).toHaveBeenCalledTimes(1);
    });

    const installing = new MockServiceWorker("installing");
    registration.installing = installing;
    registration.dispatchEvent(new Event("updatefound"));

    registration.installing = null;
    registration.waiting = installing;
    installing.setState("installed");

    await expect
      .element(page.getByText("新しいバージョンがあります"))
      .toBeInTheDocument();
  });

  it("タブに戻ったとき（visibilitychange: visible）に registration.update() を呼ぶ", async () => {
    container.controller = new MockServiceWorker("activated");

    await render(<TestApp onReload={vi.fn()} />);
    await vi.waitFor(() => {
      expect(container.register).toHaveBeenCalledTimes(1);
    });

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));

    await vi.waitFor(() => {
      expect(registration.update).toHaveBeenCalledTimes(1);
    });
  });

  it("「あとで」ボタンで更新通知が閉じる", async () => {
    container.controller = new MockServiceWorker("activated");
    registration.waiting = new MockServiceWorker("installed");

    await render(<TestApp onReload={vi.fn()} />);

    const laterButton = page.getByRole("button", { name: "あとで" });
    await expect.element(laterButton).toBeInTheDocument();

    await userEvent.click(laterButton);

    await expect
      .element(page.getByText("新しいバージョンがあります"))
      .not.toBeInTheDocument();
  });

  it("「更新する」でオートセーブ確定後に SKIP_WAITING を送り、controllerchange で再読み込みする", async () => {
    const waiting = new MockServiceWorker("installed");
    container.controller = new MockServiceWorker("activated");
    registration.waiting = waiting;

    const order: string[] = [];
    let resolveFlush: (() => void) | undefined;
    const flusher = vi.fn(
      async () =>
        new Promise<void>((resolve) => {
          order.push("flush-start");
          resolveFlush = () => {
            order.push("flush-end");
            resolve();
          };
        })
    );
    registerAutosaveFlusher(flusher);

    waiting.postMessage.mockImplementation(() => {
      order.push("skip-waiting");
    });

    const onReload = vi.fn(() => {
      order.push("reload");
    });

    await render(<TestApp onReload={onReload} />);

    const updateButton = page.getByRole("button", { name: "更新する" });
    await userEvent.click(updateButton);

    // 保存中はボタンが無効化され「更新中...」になる（二重送信されない）
    await expect
      .element(page.getByRole("button", { name: "更新中..." }))
      .toBeDisabled();
    expect(flusher).toHaveBeenCalledTimes(1);
    expect(waiting.postMessage).not.toHaveBeenCalled();

    // オートセーブ完了 → SKIP_WAITING が送られる
    resolveFlush?.();
    await vi.waitFor(() => {
      expect(waiting.postMessage).toHaveBeenCalledWith({
        type: "SKIP_WAITING",
      });
    });
    expect(onReload).not.toHaveBeenCalled();

    // controllerchange で 1 回だけ再読み込み
    container.dispatchEvent(new Event("controllerchange"));
    expect(onReload).toHaveBeenCalledTimes(1);
    expect(order).toEqual([
      "flush-start",
      "flush-end",
      "skip-waiting",
      "reload",
    ]);
  });

  it("保存に失敗した場合はエラーを表示して更新を中止し、再クリックで再試行できる", async () => {
    const waiting = new MockServiceWorker("installed");
    container.controller = new MockServiceWorker("activated");
    registration.waiting = waiting;

    const flusher = vi
      .fn()
      .mockRejectedValueOnce(new Error("save failed"))
      .mockResolvedValueOnce(undefined);
    registerAutosaveFlusher(flusher);

    const onReload = vi.fn();
    await render(<TestApp onReload={onReload} />);

    // 1 回目: 保存失敗でエラー表示、通知は残り再試行可能
    await userEvent.click(page.getByRole("button", { name: "更新する" }));

    await expect
      .element(
        page.getByText(
          "編集内容を保存できなかったため、更新を中止しました。もう一度お試しください。"
        )
      )
      .toBeInTheDocument();
    expect(waiting.postMessage).not.toHaveBeenCalled();
    expect(onReload).not.toHaveBeenCalled();

    // 2 回目: 再試行が成功し SKIP_WAITING が送られる
    const retryButton = page.getByRole("button", { name: "更新する" });
    await expect.element(retryButton).toBeEnabled();
    await userEvent.click(retryButton);

    await vi.waitFor(() => {
      expect(waiting.postMessage).toHaveBeenCalledWith({
        type: "SKIP_WAITING",
      });
    });
    expect(flusher).toHaveBeenCalledTimes(2);
  });

  it("別タブで既に更新済み（waiting がない）場合はそのまま再読み込みする", async () => {
    const waiting = new MockServiceWorker("installed");
    container.controller = new MockServiceWorker("activated");
    registration.waiting = waiting;

    const onReload = vi.fn();
    await render(<TestApp onReload={onReload} />);

    await expect
      .element(page.getByText("新しいバージョンがあります"))
      .toBeInTheDocument();

    // クリック前に別タブで更新が終わって waiting が消えたケース
    registration.waiting = null;

    await userEvent.click(page.getByRole("button", { name: "更新する" }));

    await vi.waitFor(() => {
      expect(onReload).toHaveBeenCalledTimes(1);
    });
    expect(waiting.postMessage).not.toHaveBeenCalled();
  });
});
