// Service Worker for offline support

const CACHE_NAME = 'idea-todo-v1';
const urlsToCache = [
    '/',
    '/app.js',
    '/style.css',
    '/manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames =>
            Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            )
        )
    );
});

self.addEventListener('fetch', event => {
    const {request} = event;

    if (request.method !== 'GET') {
        return;
    }

    if (request.url.includes('/api/')) {
        // API calls: always fetch fresh data, don't cache
        event.respondWith(
            fetch(request, {cache: 'no-store'})
                .then(response => response)
                .catch(() => new Response(JSON.stringify([]), {
                    headers: {'Content-Type': 'application/json'}
                }))
        );
    } else {
        // Static assets: cache first
        event.respondWith(
            caches.match(request).then(response => {
                return response || fetch(request).then(r => r).catch(() =>
                    caches.match('/')
                );
            })
        );
    }
});
