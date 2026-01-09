const CACHE_NAME = 'take-care-v6';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg',
  '/favicon.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Try to cache external resources (Tailwind) separately
      // Using catch prevents the entire install from failing if offline
      try {
        await cache.add('https://cdn.tailwindcss.com');
      } catch (e) {
        console.warn('Tailwind CDN caching failed (offline?)', e);
      }

      // Cache local assets individually.
      // This ensures that if one file is missing (e.g. / vs /index.html issues),
      // the Service Worker STILL installs successfully.
      const cachePromises = ASSETS.map(url => {
        return cache.add(url).catch(err => {
           console.warn(`Failed to cache ${url}:`, err);
        });
      });
      
      await Promise.all(cachePromises);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
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