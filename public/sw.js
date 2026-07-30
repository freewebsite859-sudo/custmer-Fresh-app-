const CACHE_NAME = 'nexora-v2';
const SYNC_APPOINTMENTS = 'sync-appointments';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.jpg'
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
  try {
    console.log('[SW] Background sync: Fetching updated bookings...');
    
    // In a real production app, this would be a real fetch call:
    // const response = await fetch('/api/bookings');
    // const bookings = await response.json();
    
    // Simulating fresh data from server for the demo
    const mockBookings = [
      {
        id: 'bk-102',
        salonId: 'glam-room',
        salonName: 'The Glam Room',
        services: [{ id: 's2', name: 'Beard Styling', price: 499, duration: 30 }],
        staff: { id: 'st2', name: 'Arjun K.', role: 'Expert' },
        date: '2026-07-29',
        timeSlot: '2:30 PM',
        status: 'confirmed',
        totalPrice: 499,
        timestamp: Date.now()
      }
    ];

    // Persist to IndexedDB
    const db = await openDB('nexora-db', 1);
    const tx = db.transaction('nexora_bookings', 'readwrite');
    const store = tx.objectStore('nexora_bookings');
    
    for (const booking of mockBookings) {
      store.put(booking);
    }
    
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // Notify UI via BroadcastChannel
    const broadcast = new BroadcastChannel('app-sync');
    broadcast.postMessage({ 
      type: 'SYNC_COMPLETE',
      data: mockBookings,
      timestamp: Date.now()
    });
    
    console.log('[SW] Sync complete: UI notified');
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

// Helper to open IndexedDB
function openDB(name, version) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('nexora_bookings')) {
        db.createObjectStore('nexora_bookings', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
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

