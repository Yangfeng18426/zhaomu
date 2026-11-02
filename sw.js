/* Service Worker for 朝暮 v1.0 */
const CACHE_NAME = 'zhaomu-v6';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

/* 导航请求先用缓存立即启动，同时在后台更新；静态资源 cache-first。 */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const req = event.request;
  const isNav = req.mode === 'navigate';
  if (isNav) {
    const cachePromise = caches.open(CACHE_NAME).then(cache => cache.match('./index.html'));
    const networkPromise = fetch(req).then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
      }
      return response;
    }).catch(() => null);
    event.waitUntil(networkPromise.then(() => {}).catch(() => {}));
    event.respondWith(cachePromise.then(cached => cached || networkPromise).then(response => response || Response.error()));
    return;
  }
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return response;
      }).catch(() => cached || Response.error());
    })
  );
});

/* 前端发来 SKIP_WAITING → 立即接管，配合 controllerchange 自动刷新完成无感升级 */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
