const CACHE_NAME = 'delivery-sheet-cache-v1.6.4-update'; // 버전을 명확하게 올립니다.
const urlsToCache = [
  '/sf/',
  '/sf/index.html',
  '/sf/manifest.json',
  'https://raw.githubusercontent.com/shoo2668/sf/main/icon-192-maskable.png',
  'https://raw.githubusercontent.com/shoo2668/sf/main/icon-512-maskable.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// [수정된 부분] 네트워크 우선 전략
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => {
      // 네트워크 요청이 실패하면 (오프라인) 캐시에서 반환
      return caches.match(event.request);
    })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});