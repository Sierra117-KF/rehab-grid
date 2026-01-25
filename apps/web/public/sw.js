/**
 * Service Worker - リハぐり PWA
 *
 * オフライン動作を実現するためのService Worker。
 * Cache-first戦略で静的アセットをキャッシュします。
 *
 * キャッシュ戦略:
 * - 静的アセット（HTML, CSS, JS, フォント, アイコン）: キャッシュ優先
 * - 動的コンテンツ: ネットワーク優先、失敗時はキャッシュ
 *
 * 注意:
 * - IndexedDBのデータはService Workerとは独立して永続化されます
 * - PDF生成はクライアントサイドで完結するため、オフラインでも動作します
 */

const CACHE_NAME = "rehab-grid-v1";

/**
 * キャッシュする静的アセット
 * Next.js static exportで生成されるファイルを想定
 */
const STATIC_ASSETS = [
  "/",
  "/training",
  "/privacy",
  "/terms",
  "/changelog",
  "/manifest.webmanifest",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/apple-touch-icon.png",
  "/icons/logo.png",
];

/**
 * インストール時: 静的アセットをキャッシュ
 */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Caching static assets");
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // 新しいService Workerを即座にアクティブ化
  self.skipWaiting();
});

/**
 * アクティベーション時: 古いキャッシュを削除
 */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log("[SW] Deleting old cache:", name);
            return caches.delete(name);
          })
      );
    })
  );
  // 既存のクライアントを即座に制御
  self.clients.claim();
});

/**
 * フェッチ時: キャッシュ優先、ネットワークフォールバック
 */
self.addEventListener("fetch", (event) => {
  // Navigation requests (HTML)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // 成功したらキャッシュを更新
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // オフライン時はキャッシュから返す
          return caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || caches.match("/");
          });
        })
    );
    return;
  }

  // Other requests (JS, CSS, images, fonts)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // キャッシュがあればそれを返し、バックグラウンドで更新
      if (cachedResponse) {
        // Stale-while-revalidate: キャッシュを返しつつ、バックグラウンドで更新
        fetch(event.request)
          .then((response) => {
            if (response.ok) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, response);
              });
            }
          })
          .catch(() => {
            // ネットワークエラーは無視（キャッシュは既に返している）
          });
        return cachedResponse;
      }

      // キャッシュがなければネットワークから取得
      return fetch(event.request)
        .then((response) => {
          // 成功したらキャッシュに保存
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // フォントやアイコンの場合、404を返すとUIが崩れるのでキャッシュを再確認
          return caches.match(event.request);
        });
    })
  );
});
