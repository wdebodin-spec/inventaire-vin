const CACHE_NAME = 'cave-william-v2';
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

// Network-first for the app shell (html/css/js/json) so updates show up as soon as
// there's a connection; falls back to cache when offline. Cache-first only for
// heavy static assets (icons/fonts/images) that rarely change.
self.addEventListener('fetch', e=>{
  const url = new URL(e.request.url);
  const isStaticAsset = url.pathname.includes('/icons/') || url.pathname.includes('/assets/');

  if(isStaticAsset){
    e.respondWith(caches.match(e.request).then(cached=>cached || fetch(e.request)));
    return;
  }

  e.respondWith(
    fetch(e.request).then(res=>{
      const clone = res.clone();
      caches.open(CACHE_NAME).then(cache=>cache.put(e.request, clone));
      return res;
    }).catch(()=>caches.match(e.request))
  );
});
