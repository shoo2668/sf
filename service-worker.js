const CACHE_NAME = 'delivery-sheet-cache-v1.6.20-update'; // 버전을 명확하게 올립니다.
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
// ▼▼▼ [이 블록을 새로 추가합니다] ▼▼▼
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const data = event.data.payload;
    const title = `[${data.no}번] ${data.location} 배송 완료`;
    const options = {
      body: `이름: ${data.receiverName} (${data.companyName})\n` +
            `주소: ${data.address}\n` +
            `시간: ${data.time}`,
      icon: 'https://raw.githubusercontent.com/shoo2668/sf/main/icon-192-maskable.png', // 알림 아이콘
      badge: 'https://raw.githubusercontent.com/shoo2668/sf/main/noti_icon.png', // 단색 아이콘 (상단 바용)
      vibrate: [200, 100, 200] // 진동 패턴
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});
// ▲▲▲ [추가 끝] ▲▲▲