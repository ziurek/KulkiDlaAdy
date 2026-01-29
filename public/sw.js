// Service Worker for PWA
// Change this version number when you deploy new changes!
const CACHE_VERSION = 'v2';
const CACHE_NAME = `color-lines-${CACHE_VERSION}`;

// Resources to cache for offline use (only static assets)
const STATIC_ASSETS = [
  '/manifest.json',
  '/icon.svg'
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache opened');
        return cache.addAll(STATIC_ASSETS).catch((err) => {
          console.log('Service Worker: Cache addAll failed', err);
        });
      })
  );
  // Force the waiting service worker to become the active service worker immediately
  self.skipWaiting();
});

// Fetch event - Network First strategy for HTML/JS, Cache First for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // For HTML and JS files: Network First (always get fresh content)
  if (event.request.mode === 'navigate' || 
      url.pathname.endsWith('.html') || 
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname === '/') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the fresh response for offline use
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // For other assets (images, fonts): Cache First
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        });
      })
  );
});

// Activate event - clean up old caches and take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

