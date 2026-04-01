const CACHE_NAME = 'pingus-liste-v5';
const STATIC_ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install: cache static assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Fetch: cache-first for images, network-first for API calls
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  
  // Images (covers): cache first, then network
  if (e.request.destination === 'image' || 
      url.hostname === 'image.tmdb.org' || 
      url.hostname.includes('rawg') ||
      url.hostname.includes('deezer') ||
      url.hostname === 'coverartarchive.org' ||
      e.request.url.match(/\.(png|jpg|jpeg|webp|gif)$/i)) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          }
          return response;
        }).catch(() => cached);
      })
    );
    return;
  }
  
  // API calls: network first, fallback to cache
  if (url.hostname === 'api.themoviedb.org' || 
      url.hostname === 'api.rawg.io' || 
      url.hostname === 'api.deezer.com' ||
      url.hostname === 'musicbrainz.org' ||
      url.hostname.includes('wikipedia.org')) {
    e.respondWith(
      fetch(e.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  
  // Static assets: cache first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
