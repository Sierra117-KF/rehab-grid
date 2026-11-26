/**
 * Service Worker - リハぐり PWA
 *
 * オフライン動作を実現するためのService Worker。
 * このファイルはテンプレートで、generate-sw.mjs が CACHE_NAME のビルドIDを
 * 埋め込んで public/sw.js に出力します（public/sw.js は直接編集しないこと）。
 *
 * キャッシュ戦略（同一オリジンの GET のみ扱う）:
 * - /_next/static/ 配下（ファイル名にハッシュが付き中身が不変）: キャッシュ優先
 * - /images/samples/・/fonts/・/templates/ 配下（ビルド間でほぼ変わらない大きなアセット）: キャッシュ優先
 * - それ以外（HTML, アイコン等）: ネットワーク優先、失敗時はキャッシュ
 *
 * CACHE_NAME はビルドごとに変わるため、デプロイ後に新しい Service Worker が
 * activate された時点で旧ビルドのキャッシュはまとめて削除されます。
 * キャッシュ優先のアセットも、デプロイごとに 1 回だけ取り直す動きになります。
 *
 * 注意:
 * - IndexedDBのデータはService Workerとは独立して永続化されます
 * - PDF 用フォントと PDF Worker のチャンクはインストール時にプリキャッシュするため、
 *   デプロイ直後にオフラインになっても PDF を生成できます
 * - サンプル画像・テンプレートはプリキャッシュしません（使わない利用者にまで配らない）。
 *   オフラインで使えるのは一度表示したものだけです
 * - これらのファイル名にはハッシュが付かないため、_headers で長期の Cache-Control を付けないこと
 *   （付けると fetch が HTTP キャッシュの古い版を拾い、デプロイ後も更新されなくなる）
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
  // PDF 生成用フォント（packages/core の PDF_FONT_PATHS と揃える）
  "/fonts/NotoSansJP-Regular.woff",
  "/fonts/NotoSansJP-Bold.woff",
];

/**
 * PDF Worker の起動に必要なチャンク（/_next/static/ 配下のハッシュ付きファイル）
 *
 * ビルド後に generate-sw.mjs --out が out/ から探して埋め込む（開発サーバー用の public/sw.js では空）。
 * Worker は PDF を初めて作るときに読み込まれるため、プリキャッシュしないと
 * デプロイ直後のオフラインでは（フォントがあっても）PDF を生成できない
 */
const PDF_WORKER_ASSETS = __PDF_WORKER_ASSETS__;

/**
 * キャッシュ優先で返すパス接頭辞
 * - /_next/static/: ファイル名にハッシュが付き中身が不変
 * - それ以外: ビルド間でほぼ変わらない大きなアセット（CACHE_NAME の切り替えで取り直す）
 */
const CACHE_FIRST_PATH_PREFIXES = [
  "/_next/static/",
  "/images/samples/",
  "/fonts/",
  "/templates/",
];

/**
 * インストール時: 静的アセットをキャッシュ
 */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Caching static assets");
      return cache.addAll([...STATIC_ASSETS, ...PDF_WORKER_ASSETS]);
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
 * キャッシュから Worker のスクリプトを返すときに、要求の URL を引き継がせる
 *
 * Worker の location はレスポンスの URL になる。Turbopack の Worker は URL のハッシュ（#params=...）
 * から起動設定を読むため、ハッシュなしの URL で保存したキャッシュ（プリキャッシュなど）を
 * そのまま返すと "Missing worker bootstrap config" で起動できない。
 * URL を持たない新しいレスポンスにすると、ブラウザは要求の URL（ハッシュ付き）を使う
 */
function withRequestUrlForWorker(event, response) {
  if (event.request.destination !== "worker") return response;
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

/**
 * キャッシュ優先: キャッシュになければネットワークから取得して保存
 */
async function cacheFirst(event) {
  const cachedResponse = await caches.match(event.request);
  if (cachedResponse) return withRequestUrlForWorker(event, cachedResponse);

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

  if (CACHE_FIRST_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    event.respondWith(cacheFirst(event));
    return;
  }
  event.respondWith(networkFirst(event));
});
