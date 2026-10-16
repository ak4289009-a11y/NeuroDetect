/**
 * NeuroDetect Service Worker (PWA)
 * Architectural Reference: Figure 4.3 - Progressive Web Application (PWA) Offline Architecture
 * 
 * Provides:
 * 1. App Shell Precaching (Cache-First)
 * 2. Navigation fallback (Network-First -> Cache -> offline.html)
 * 3. Dynamic runtime caching for read-only clinical data
 * 4. Background sync hook for offline diagnostic triage
 */

const CACHE_NAME = 'neurodetect-core-v1';
const DYNAMIC_CACHE_NAME = 'neurodetect-dynamic-v1';

const STATIC_PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png'
];

// 1. Service Worker Installation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[NeuroDetect SW] Precaching core application shell');
      return cache.addAll(STATIC_PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Service Worker Activation & Stale Cache Cleanup
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
            console.log('[NeuroDetect SW] Deleting obsolete cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Network Fetch Handler with Clinical Resilience Strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (file uploads, POST/PUT/DELETE must go to network or background sync)
  if (request.method !== 'GET') {
    return;
  }

  // Handle Chrome extension schemes or non-HTTP
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Strategy A: API Requests (Network-First with Dynamic Cache Fallback)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // If response is valid, clone to dynamic cache for offline inspection
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Network failed: Serve cached clinical data if available
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return new Response(
              JSON.stringify({
                status: 'offline',
                message: 'Operating in offline mode. Live server currently unreachable.'
              }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          });
        })
    );
    return;
  }

  // Strategy B: Navigation Requests (HTML Pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return caches.match('/index.html')
            .then((cachedIndex) => cachedIndex || caches.match('/offline.html'));
        })
    );
    return;
  }

  // Strategy C: Static Assets (JS, CSS, Images, Fonts) - Cache-First with Network Fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      });
    })
  );
});

// 4. Background Sync Listener (Section 4.3: Background Sync API)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-mri-study') {
    console.log('[NeuroDetect SW] Background sync event triggered for pending MRI scans');
    event.waitUntil(
      // Notify active client windows to synchronize offline queue
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SYNC_PENDING_SCANS',
            timestamp: Date.now()
          });
        });
      })
    );
  }
});
