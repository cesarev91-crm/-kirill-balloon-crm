/* Kirill Balloon CRM — offline navigation fix, v0.2.1 */
const CACHE = 'kirill-balloon-pwa-v021';
const ASSETS = ['./index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    for (const path of ASSETS) {
      try {
        const url = new URL(path, self.registration.scope);
        const response = await fetch(url, { cache: 'reload', redirect: 'follow' });
        if (response.ok && !response.redirected && response.type !== 'opaqueredirect') {
          await cache.put(url.href, response);
        }
      } catch (error) {
        console.warn('Unable to precache', path, error);
      }
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('kirill-balloon-pwa-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok && !response.redirected && response.type !== 'opaqueredirect') {
          const cache = await caches.open(CACHE);
          await cache.put(new URL('./index.html', self.registration.scope).href, response.clone());
        }
        return response;
      } catch (error) {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(new URL('./index.html', self.registration.scope).href);
        if (cached && !cached.redirected && cached.type !== 'opaqueredirect') return cached;
        return new Response('Нет подключения к интернету. Откройте приложение онлайн один раз, чтобы сохранить его для офлайн-работы.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    if (cached && !cached.redirected && cached.type !== 'opaqueredirect') return cached;
    const response = await fetch(request);
    if (response.ok && !response.redirected && response.type !== 'opaqueredirect') {
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
