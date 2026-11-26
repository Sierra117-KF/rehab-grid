"use client";

/**
 * Service Worker の登録と、アプリ更新の通知
 *
 * デプロイ後の新しい Service Worker は waiting のまま待機する（scripts/sw.template.js）。
 * 待機を見つけたらトーストで知らせ、「更新する」を押したときだけ有効にして再読み込みする。
 */

import { flushRegisteredAutosave } from "@rehab-grid/core/lib/store/autosaveFlusher";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";

/** 更新通知トーストの ID（同じ通知を重ねて出さない） */
const UPDATE_TOAST_ID = "sw-update";

/** 更新通知専用の Toaster の ID（通常のトーストとは別の Toaster に出す） */
const UPDATE_TOASTER_ID = "sw-update";

/**
 * 更新通知専用の Toaster の重なり順
 *
 * 通常の Toaster（最前面）と違い、ダイアログ（z-80）やヘッダー（z-50）より下に置く。
 * 通知は閉じるまで残るため、ダイアログのボタンを覆わず、ダイアログを閉じてから押せるようにする
 */
const UPDATE_TOASTER_Z_INDEX = 40;

/** 更新通知の見出し */
const UPDATE_AVAILABLE_MESSAGE = "新しいバージョンがあります";

/** 更新通知の説明 */
const UPDATE_AVAILABLE_DESCRIPTION = "更新しても編集中の内容は保存されます。";

/** 更新前の保存に失敗したときのメッセージ */
const UPDATE_SAVE_FAILED_MESSAGE =
  "編集内容を保存できなかったため、更新を中止しました。もう一度お試しください。";

/** ページを再読み込みする既定の処理 */
const defaultReload = () => {
  window.location.reload();
};

/**
 * 更新通知トーストの中身
 *
 * @remarks
 * Sonner 既定の 1 行横並びレイアウトでは日本語の説明文が細長く折り返され、
 * ボタンも小さくなるため、上段に本文・下段に操作ボタンの 2 段構成で表示する
 */
function UpdateToastContent({
  onUpdate,
  onDismiss,
}: {
  /** 「更新する」を押したときの処理（失敗時は false を返し、再試行可能に戻す） */
  onUpdate: () => Promise<boolean>;
  /** 「あとで」を押したときの処理 */
  onDismiss: () => void;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasSaveError, setHasSaveError] = useState(false);

  const handleUpdateClick = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    setHasSaveError(false);
    const proceeded = await onUpdate();
    if (!proceeded) {
      setHasSaveError(true);
      setIsUpdating(false);
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-[356px] max-w-[calc(100vw-32px)] rounded-xl border border-border/80 bg-card p-4 text-card-foreground shadow-lg"
    >
      <div className="flex items-start gap-3">
        <div
          aria-hidden="true"
          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <RefreshCw
            className={isUpdating ? "size-4 animate-spin" : "size-4"}
          />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold leading-snug text-foreground">
            {UPDATE_AVAILABLE_MESSAGE}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {UPDATE_AVAILABLE_DESCRIPTION}
          </p>
          {hasSaveError ? (
            <p
              role="alert"
              className="pt-1 text-xs font-medium leading-relaxed text-destructive"
            >
              {UPDATE_SAVE_FAILED_MESSAGE}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          disabled={isUpdating}
          onClick={onDismiss}
          className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
        >
          あとで
        </button>
        <button
          type="button"
          disabled={isUpdating}
          onClick={() => {
            void handleUpdateClick();
          }}
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-70"
        >
          {isUpdating ? "更新中..." : "更新する"}
        </button>
      </div>
    </div>
  );
}

/**
 * 待機中の新しい Service Worker を有効にして、ページを再読み込みする
 *
 * @returns 更新処理へ進んだ場合は true、保存失敗で中止した場合は false
 */
async function applyUpdate(
  registration: ServiceWorkerRegistration,
  reload: () => void
): Promise<boolean> {
  try {
    await flushRegisteredAutosave();
  } catch {
    return false;
  }

  const { waiting } = registration;
  // 別のタブで更新済み（すでに有効になっている）なら再読み込みだけでよい
  if (!waiting) {
    reload();
    return true;
  }
  navigator.serviceWorker.addEventListener("controllerchange", reload, {
    once: true,
  });
  waiting.postMessage({ type: "SKIP_WAITING" });
  return true;
}

/**
 * 新しいバージョンが待機していれば更新通知を出す
 *
 * @remarks
 * controller がないのは初回インストール（更新ではない）なので通知しない
 */
function notifyIfWaiting(
  registration: ServiceWorkerRegistration,
  reload: () => void
) {
  if (!registration.waiting || !navigator.serviceWorker.controller) return;

  toast.custom(
    (toastId) => (
      <UpdateToastContent
        onUpdate={async () => applyUpdate(registration, reload)}
        onDismiss={() => {
          toast.dismiss(toastId);
        }}
      />
    ),
    {
      id: UPDATE_TOAST_ID,
      toasterId: UPDATE_TOASTER_ID,
      duration: Infinity,
    }
  );
}

/**
 * インストール中の Service Worker の状態変化を監視し、完了時に通知する
 */
function watchInstalling(
  registration: ServiceWorkerRegistration,
  installing: ServiceWorker | null,
  signal: AbortSignal,
  reload: () => void
) {
  if (!installing) return;
  installing.addEventListener(
    "statechange",
    () => {
      if (installing.state === "installed") {
        notifyIfWaiting(registration, reload);
      }
    },
    { signal }
  );
}

/**
 * Service Worker を登録し、更新を見張る
 *
 * @param signal - 中断するとイベントの購読をやめる
 * @param reload - 更新適用後の再読み込み処理
 */
async function registerServiceWorker(signal: AbortSignal, reload: () => void) {
  const registration = await navigator.serviceWorker.register("/sw.js", {
    // sw.js の更新確認で HTTP キャッシュを使わない（_headers の no-cache と二重の備え）
    updateViaCache: "none",
  });
  if (signal.aborted) return;

  // 読み込み時点ですでに待機している（前回の閲覧中にインストールされた）場合
  notifyIfWaiting(registration, reload);

  // 登録完了時点ですでに更新のインストールが始まっていた場合（updatefound は発火済みのため直接監視する）
  watchInstalling(registration, registration.installing, signal, reload);

  // 閲覧中に新しいバージョンが見つかった場合
  registration.addEventListener(
    "updatefound",
    () => {
      watchInstalling(registration, registration.installing, signal, reload);
    },
    { signal }
  );

  // タブを開いたままの利用者にも届くよう、タブに戻ったときに更新を確認する（オフラインなら何もしない）
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.visibilityState === "visible") {
        registration.update().catch(() => undefined);
      }
    },
    { signal }
  );
}

/**
 * Service Worker の登録と更新の見張りを行うフック
 *
 * @remarks
 * Service Worker のライフサイクルはブラウザ側のイベントでしか分からないため useEffect で購読する。
 * 登録はページの読み込み完了後に行う（プリキャッシュの取得が初回表示の通信と競合しないように）
 */
function useServiceWorkerUpdate(reload: () => void) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;

    const controller = new AbortController();
    const register = () => {
      // 登録の失敗（プライベートモードの制限など）はオフライン対応がなくなるだけなので、画面には出さない
      registerServiceWorker(controller.signal, reload).catch(() => undefined);
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, {
        once: true,
        signal: controller.signal,
      });
    }
    return () => {
      controller.abort();
    };
  }, [reload]);
}

/**
 * ServiceWorkerUpdater の Props
 */
export type ServiceWorkerUpdaterProps = {
  /** 更新適用後の再読み込み処理（既定は window.location.reload。実ブラウザテストでの差し替え用） */
  onReload?: () => void;
};

/**
 * Service Worker を登録し、アプリの更新を通知するコンポーネント（Web 版専用）
 *
 * @remarks
 * ルートレイアウトに 1 つだけ置く。通知は通常のトースト（下中央）と重ならないよう右下に出す
 */
export function ServiceWorkerUpdater({
  onReload = defaultReload,
}: ServiceWorkerUpdaterProps = {}) {
  useServiceWorkerUpdate(onReload);
  return (
    <Toaster
      id={UPDATE_TOASTER_ID}
      position="bottom-right"
      style={{ zIndex: UPDATE_TOASTER_Z_INDEX }}
      // エラー表示で通知の高さが増えたとき、Sonner の固定高さで下端がはみ出さないようにする
      toastOptions={{ style: { height: "auto" } }}
    />
  );
}
