const CACHE_NAME = 'claudozzo-v1';
const ASSETS = [
  '/index.html',
  '/manifest.json',
  '/claudozzo_mascot_v1.png',
  '/sfondo.jpg',
  '/sfondo-roblox.svg',
  '/sfondo-mochinut.svg',
  '/sfondo-brainrot.svg',
  '/sfondo-minecraft.svg',
  '/sfondo-anime.svg',
  'https://fonts.googleapis.com/css2?family=Boogaloo&family=Baloo+2:wght@400;600;700;800&display=swap'
];

// Install: cache core assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache first, fallback to network
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetched = fetch(e.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Network failed, return cached index for navigation
        if (e.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return null;
      });
      return cached || fetched;
    })
  );
});
