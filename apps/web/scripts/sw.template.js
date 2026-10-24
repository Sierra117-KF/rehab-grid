/**
 * Service Worker - リハぐり PWA
 *
 * オフライン動作を実現するためのService Worker。
 * このファイルはテンプレートで、generate-sw.mjs が CACHE_NAME のビルドIDを
 * 埋め込んで public/sw.js に出力します（public/sw.js は直接編集しないこと）。
 *
 * キャッシュ戦略（同一オリジンの GET のみ扱う）:
 * - /_next/static/ 配下（ファイル名にハッシュが付き中身が不変）: キャッシュ優先
 * - それ以外（HTML, フォント, アイコン等）: ネットワーク優先、失敗時はキャッシュ
 *
 * CACHE_NAME はビルドごとに変わるため、デプロイ後に新しい Service Worker が
 * activate された時点で旧ビルドのキャッシュはまとめて削除されます。
 *
 * 注意:
 * - IndexedDBのデータはService Workerとは独立して永続化されます
 * - PDF生成はクライアントサイドで完結するため、オフラインでも動作します
 */

const CACHE_NAME = "rehab-grid-__BUILD_ID__";

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

/** 中身が変わらないハッシュ付きアセットのパス接頭辞 */
const IMMUTABLE_PATH_PREFIX = "/_next/static/";

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
 * 成功したレスポンスを現在のビルドのキャッシュに保存する
 */
function putInCache(event, response) {
  if (!response.ok) return;
  const responseClone = response.clone();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone))
  );
}

/**
 * キャッシュ優先: キャッシュになければネットワークから取得して保存
 */
async function cacheFirst(event) {
  const cachedResponse = await caches.match(event.request);
  if (cachedResponse) return cachedResponse;

  const response = await fetch(event.request);
  putInCache(event, response);
  return response;
}

/**
 * ネットワーク優先: オフライン時はキャッシュから返す
 */
async function networkFirst(event) {
  try {
    const response = await fetch(event.request);
    putInCache(event, response);
    return response;
  } catch (error) {
    const cachedResponse = await caches.match(event.request);
    if (cachedResponse) return cachedResponse;
    // 未訪問ページへの遷移はトップページで代替する
    if (event.request.mode === "navigate") {
      const fallback = await caches.match("/");
      if (fallback) return fallback;
    }
    throw error;
  }
}

/**
 * フェッチ時: 同一オリジンの GET だけを扱い、それ以外はブラウザに任せる
 */
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith(IMMUTABLE_PATH_PREFIX)) {
    event.respondWith(cacheFirst(event));
    return;
  }
  event.respondWith(networkFirst(event));
});
