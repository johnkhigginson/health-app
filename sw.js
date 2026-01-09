const CACHE_NAME = 'take-care-v8';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg',
  '/favicon.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Pre-cache critical files, but don't fail if one is missing (e.g. external CDNs offline)
      return Promise.all(
        PRECACHE_ASSETS.map(url => 
          cache.add(url).catch(err => console.warn('Precache failed for:', url, err))
        )
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;

  // Don't cache API calls to GenAI (usually POST, but just in case)
  const url = new URL(event.request.url);
  if (url.hostname.includes('googleapis')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached response if found
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise fetch from network
      return fetch(event.request).then((response) => {
        // Check if we received a valid response
        if (!response || response.status !== 200) {
          return response;
        }

        // Clone the response because it's a stream and can only be consumed once
        const responseToCache = response.clone();

        // Cache the new resource for future offline use
        caches.open(CACHE_NAME).then((cache) => {
          try {
            cache.put(event.request, responseToCache);
          } catch (err) {
            console.warn('Failed to cache runtime request', err);
          }
        });

        return response;
      }).catch(() => {
        // Fallback for navigation requests if offline and not in cache
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        );
      })
    ])
  );
});