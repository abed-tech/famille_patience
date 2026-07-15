const CACHE_NAME = 'famille-patience-v6';
const STATIC_ASSETS = [
    '/static/css/fp-system.css',
    '/static/css/fp-responsive.css',
    '/static/manifest.json',
    '/static/icons/icon.svg',
];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))),
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (url.pathname.startsWith('/api/')) return;

    // Ne jamais mettre en cache les shells SPA (conflits entre /membre, /gestion, etc.)
    if (
        event.request.mode === 'navigate'
        || event.request.destination === 'document'
        || /^\/(membre|gestion|conseiller|referent|pointage)(\/|$)/.test(url.pathname)
    ) {
        event.respondWith(fetch(event.request));
        return;
    }

    if (!url.pathname.startsWith('/static/')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // JS/CSS : réseau d'abord pour recevoir les mises à jour (évite cache stale en dev)
    const isCode = /\.(js|css|mjs)(\?|$)/.test(url.pathname);
    if (isCode) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(event.request)),
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cached) => cached || fetch(event.request)),
    );
});
