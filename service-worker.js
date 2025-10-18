// service-worker.js

// 버전을 명확하게 올려서 서비스 워커가 확실히 업데이트되도록 합니다.
const CACHE_NAME = 'delivery-sheet-cache-v1.9.1-share-feature'; 
const urlsToCache = [
  '/sf/',
  '/sf/index.html',
  '/sf/manifest.json',
  'https://raw.githubusercontent.com/shoo2668/sf/main/icon-192-maskable.png',
  'https://raw.githubusercontent.com/shoo2668/sf/main/icon-512-maskable.png',
  'https://raw.githubusercontent.com/shoo2668/sf/main/noti_icon.png'
];

// 1. 서비스 워커 설치 및 핵심 파일 캐싱
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching essential files...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] Installation complete.');
        return self.skipWaiting(); // 설치 즉시 활성화
      })
  );
});

// 2. 서비스 워커 활성화 및 이전 버전 캐시 정리
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log(`[Service Worker] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Activation complete. Claiming clients...');
      return self.clients.claim(); // 클라이언트 제어권 즉시 확보
    })
  );
});

// 3. Fetch 이벤트 처리 (공유 기능 및 네트워크 전략)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // [핵심 추가] 공유 타겟 POST 요청을 최우선으로 가로채서 처리
  if (event.request.method === 'POST' && url.pathname.endsWith('/sf/index.html')) {
    console.log('[Service Worker] Intercepting shared file POST request.');
    
    event.respondWith((async () => {
      try {
        const formData = await event.request.formData();
        const files = formData.getAll('images'); // manifest.json의 "name"과 일치
        const clientId = event.resultingClientId || event.clientId;

        if (!clientId) {
          console.error('[Service Worker] Could not find a client to send files to.');
          return Response.redirect('/sf/index.html?share=failed', 303);
        }

        const client = await self.clients.get(clientId);
        
        if (!client) {
          console.error(`[Service Worker] Client ${clientId} not found.`);
          return Response.redirect('/sf/index.html?share=failed', 303);
        }

        console.log(`[Service Worker] Sending ${files.length} files to client ${client.id}`);
        client.postMessage({ type: 'SHARED_FILES', files: files });
        
        // 성공적으로 처리 후 앱의 메인 페이지로 리디렉션
        return Response.redirect('/sf/index.html?share=success', 303);

      } catch (error) {
        console.error('[Service Worker] Error processing shared files:', error);
        return Response.redirect('/sf/index.html?share=error', 303);
      }
    })());
    return; // POST 요청 처리를 여기서 반드시 종료
  }

  // 기존의 네트워크 우선 전략 (POST 요청 외의 모든 경우에 적용)
  event.respondWith(
    fetch(event.request).catch(() => {
      // 네트워크 요청이 실패하면 (오프라인) 캐시에서 응답을 찾음
      console.log(`[Service Worker] Network failed for ${event.request.url}. Trying cache.`);
      return caches.match(event.request);
    })
  );
});

// 4. 푸시 알림 등 메시지 처리
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const data = event.data.payload;
    const title = `[${data.no}번] ${data.location} 배송 완료`;
    const options = {
      body: `이름: ${data.receiverName} (${data.companyName})\n` +
            `주소: ${data.address}\n` +
            `시간: ${data.time}`,
      icon: 'https://raw.githubusercontent.com/shoo2668/sf/main/icon-192-maskable.png',
      badge: 'https://raw.githubusercontent.com/shoo2668/sf/main/noti_icon.png',
      vibrate: [200, 100, 200]
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});