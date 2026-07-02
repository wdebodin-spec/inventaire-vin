const CACHE_NAME = 'cave-william-v1';
const PRECACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './assets/logo-terra.png',
  './assets/Rakkas-Regular.ttf',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(names=>Promise.all(
      names.filter(n=>n!==CACHE_NAME).map(n=>caches.delete(n))
    ))
  );
  self.clients.claim();
});

// Network-first for wines.json so new entries show up as soon as there's a connection;
// falls back to cache when offline. Cache-first for everything else (static assets).
self.addEventListener('fetch', e=>{
  const url = new URL(e.request.url);

  if(url.pathname.endsWith('wines.json')){
    e.respondWith(
      fetch(e.request).then(res=>{
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache=>cache.put(e.request, clone));
        return res;
      }).catch(()=>caches.match(e.request))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached=>cached || fetch(e.request))
  );
});
