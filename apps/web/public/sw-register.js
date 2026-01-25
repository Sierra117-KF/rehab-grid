/**
 * Service Worker 登録スクリプト
 *
 * PWAのオフライン機能を有効にするため、Service Workerを登録します。
 * layout.tsxから外部スクリプトとして読み込まれます。
 */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js").then(
      function (registration) {
        console.log("[SW] Registration successful:", registration.scope);
      },
      function (error) {
        console.log("[SW] Registration failed:", error);
      }
    );
  });
}
