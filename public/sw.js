// Service worker minimo: rende il gioco installabile e lo apre anche senza rete.
// Pagina: prima la rete (aggiornamenti subito), poi la copia salvata. File con hash (assets/): prima la copia salvata.
const CACHE = 'chridle-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const save = (res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  };
  if (req.url.includes('/assets/')) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then(save)));
  } else {
    e.respondWith(fetch(req).then(save).catch(() => caches.match(req).then((hit) => hit || caches.match('./'))));
  }
});
