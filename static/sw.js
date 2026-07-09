// ============================================================
// SERVICE WORKER - PricePoint POS (Safe Version)
// ============================================================

const CACHE_NAME = 'pricepoint-v1';
const urlsToCache = [
    '/',
    '/admin',
    '/admin/pos',
    '/offline.html'
];

// Install event - cache assets safely
self.addEventListener('install', function(event) {
    console.log('[SW] Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('[SW] Caching assets...');
                // Cache each URL individually to avoid failures
                return Promise.allSettled(
                    urlsToCache.map(function(url) {
                        return cache.add(url).catch(function(err) {
                            console.log('[SW] Failed to cache:', url, err);
                            // Continue with other files
                        });
                    })
                );
            })
            .then(function() {
                console.log('[SW] Installation complete');
                return self.skipWaiting();
            })
            .catch(function(err) {
                console.log('[SW] Installation error:', err);
            })
    );
});

// Activate event - clean old caches
self.addEventListener('activate', function(event) {
    console.log('[SW] Activating...');
    
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .then(function() {
            console.log('[SW] Activation complete');
            return self.clients.claim();
        })
    );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                
                // Try network
                return fetch(event.request)
                    .then(function(networkResponse) {
                        // Check if valid response
                        if (!networkResponse || networkResponse.status !== 200) {
                            return networkResponse;
                        }
                        
                        // Cache the response for future
                        var responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME)
                            .then(function(cache) {
                                cache.put(event.request, responseToCache);
                            })
                            .catch(function(err) {
                                // Ignore cache errors
                            });
                        
                        return networkResponse;
                    })
                    .catch(function() {
                        // Offline fallback
                        if (event.request.mode === 'navigate') {
                            return caches.match('/offline.html');
                        }
                        // For images, CSS, etc. - return a simple response
                        return new Response('Offline', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

console.log('[SW] Service Worker loaded');
