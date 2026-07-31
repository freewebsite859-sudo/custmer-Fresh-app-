const CACHE_NAME = 'nexora-v4';
const SYNC_APPOINTMENTS = 'sync-appointments';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Background Sync Handler
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_APPOINTMENTS) {
    event.waitUntil(syncAppointments());
  }
});

async function syncAppointments() {
  // Customer bookings live server-side (Supabase) and the app reads them with the
  // user's session. No offline booking payload is fabricated here; when a real
  // customer bookings read endpoint exists, this can sync genuine data.
  console.log('[SW] Background sync: nothing to apply — server is the source of truth.');
}

// Message Event Handler for direct sync
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SYNC_NOW') {
    event.waitUntil(syncAppointments());
  }
});

// Fetch Handler
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Stale-While-Revalidate for API responses
  if (url.pathname.startsWith('/api/') || url.hostname.includes('api')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse);
          
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 2. Cache-First for static assets (JS, CSS, fonts, images)
  const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf', '.eot'];
  const isStaticAsset = staticExtensions.some(ext => url.pathname.endsWith(ext)) || 
                       url.hostname.includes('fonts.googleapis.com') || 
                       url.hostname.includes('fonts.gstatic.com') ||
                       url.pathname.includes('/assets/');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        
        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) return networkResponse;
          
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        });
      })
    );
    return;
  }

  // 3. Default Strategy: Network with Cache Fallback (for index.html)
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request) || caches.match('/');
    })
  );
});

