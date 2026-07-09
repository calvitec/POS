// ============================================================
// SERVICE WORKER - PricePoint POS (Vercel Compatible)
// ============================================================

const CACHE_NAME = 'pricepoint-v3';
const OFFLINE_URL = '/offline.html';

// ===== PAGES TO CACHE - ONLY FILES THAT EXIST =====
const urlsToCache = [
    // Main Pages
    '/',
    '/admin/pos',
    '/admin',
    '/login',
    '/offline.html',
    '/manifest.json',
];

// ============================================================
// INSTALL - Cache all essential assets safely
// ============================================================

self.addEventListener('install', event => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching assets...');
                // Cache each URL individually to avoid failures
                return Promise.allSettled(
                    urlsToCache.map(url => {
                        return cache.add(url).catch(err => {
                            console.log('[SW] Failed to cache:', url, err);
                            // Continue with other files
                        });
                    })
                );
            })
            .then(() => {
                console.log('[SW] Installation complete');
                return self.skipWaiting();
            })
    );
});

// ============================================================
// ACTIVATE - Clean old caches
// ============================================================

self.addEventListener('activate', event => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// ============================================================
// FETCH - Smart caching for all routes
// ============================================================

self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') return;
    
    // Skip API requests (always fetch fresh)
    if (url.pathname.startsWith('/admin/api/')) return;
    if (url.pathname.startsWith('/api/')) return;
    
    // Skip Supabase requests
    if (url.hostname.includes('supabase.co')) return;
    
    // Skip analytics/tracking
    if (url.hostname.includes('google-analytics')) return;
    
    // Skip static files that might not exist
    if (url.pathname.includes('/static/js/') && !url.pathname.includes('admin.js')) return;
    if (url.pathname.includes('/static/css/')) return;
    
    // Strategy: Cache First for HTML pages, Network First for everything else
    const isHTML = request.headers.get('Accept')?.includes('text/html');
    
    if (isHTML) {
        // HTML - Network First, fallback to cache
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Cache successful responses
                    if (response && response.status === 200) {
                        const cloned = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => cache.put(request, cloned));
                    }
                    return response;
                })
                .catch(() => {
                    // Network failed - serve cached version
                    return caches.match(request)
                        .then(cached => {
                            if (cached) {
                                console.log('[SW] Serving cached HTML:', url.pathname);
                                return cached;
                            }
                            // No cache - serve offline page
                            return caches.match(OFFLINE_URL);
                        });
                })
        );
    } else {
        // Assets (CSS, JS, Images) - Cache First
        event.respondWith(
            caches.match(request)
                .then(response => {
                    if (response) {
                        console.log('[SW] Cache hit:', url.pathname);
                        return response;
                    }
                    
                    console.log('[SW] Cache miss:', url.pathname);
                    return fetch(request)
                        .then(networkResponse => {
                            if (!networkResponse || networkResponse.status !== 200) {
                                return networkResponse;
                            }
                            
                            // Only cache valid responses
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => cache.put(request, responseToCache))
                                .catch(() => {});
                            return networkResponse;
                        });
                })
        );
    }
});

// ============================================================
// BACKGROUND SYNC - Sync offline orders when online
// ============================================================

self.addEventListener('sync', event => {
    console.log('[SW] Background sync:', event.tag);
    if (event.tag === 'sync-orders') {
        event.waitUntil(syncOrders());
    }
});

async function syncOrders() {
    console.log('[SW] Syncing offline orders...');
    try {
        const clients = await self.clients.matchAll({ type: 'window' });
        for (const client of clients) {
            client.postMessage({
                type: 'SYNC_ORDERS',
                message: 'Background sync triggered'
            });
        }
    } catch (err) {
        console.error('[SW] Sync error:', err);
    }
}

// ============================================================
// PUSH NOTIFICATIONS (Optional)
// ============================================================

self.addEventListener('push', event => {
    const data = event.data?.json() || {};
    
    const options = {
        body: data.body || 'New order received!',
        icon: '/static/icons/icon-192.png',
        badge: '/static/icons/icon-72.png',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/admin/pos'
        }
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'PricePoint POS', options)
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    const url = event.notification.data?.url || '/admin/pos';
    
    event.waitUntil(
        clients.matchAll({ type: 'window' })
            .then(windowClients => {
                for (const client of windowClients) {
                    if (client.url === url && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});

// ============================================================
// MESSAGE HANDLING
// ============================================================

self.addEventListener('message', event => {
    console.log('[SW] Message received:', event.data);
    
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

console.log('[SW] Service Worker loaded');
