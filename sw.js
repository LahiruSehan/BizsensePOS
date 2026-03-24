// BizSensePOS Service Worker
const CACHE = 'bizsensepos-v2';
const APP_SHELL = ['./index.html', './app.png', './Manifest.json'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(APP_SHELL)).catch(() => {})
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // For API/Supabase calls: network only, no caching
  if (url.hostname.includes('supabase') || url.pathname.includes('/rest/') || url.pathname.includes('/auth/')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // App shell: cache first, then network
  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
      return cached || networkFetch;
    }).catch(() => caches.match('./index.html'))
  );
});
