// ============================================================
// service-worker.js
// オフライン時でも画面が表示できるように、アプリの静的ファイルを
// キャッシュする。Firestore / Gemini APIへの通信はネットワークが
// 必要なため、オフライン時はキャッシュ済みのUIのみ表示される。
//
// v4: SPA化（ハッシュルーティング）に伴い、HTMLファイルはindex.html
// のみになった。画面ごとのファイルはjs/views/以下のJSファイルに統合。
//
// キャッシュのバージョンを上げると、古いキャッシュは自動的に破棄される。
// ============================================================

const CACHE_VERSION = "v4";
const CACHE_NAME = `study-coach-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/app.js",
  "./js/appState.js",
  "./js/main.js",
  "./js/certUi.js",
  "./js/unitUi.js",
  "./js/charts.js",
  "./js/firestore.js",
  "./js/gemini.js",
  "./js/views/home.js",
  "./js/views/record.js",
  "./js/views/units.js",
  "./js/views/unit-detail.js",
  "./js/views/report.js",
  "./js/views/ai-analysis.js",
  "./js/views/settings.js",
  "./js/views/help.js",
  "./firebase/config.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // 外部API（Firestore / Gemini など）はキャッシュせず、常にネットワークへ
  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  if (!isSameOrigin) return;

  // SPAなのでナビゲーションリクエスト（HTML取得）は常にindex.htmlを返す
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // 同一オリジンの静的ファイル: cache-first, ネットワークで更新
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
