// GraphFlow Service Worker
const CACHE_NAME = 'graphflow-v1'
const OFFLINE_URL = '/offline'

// Resources to cache immediately on install
const PRECACHE_RESOURCES = [
  '/',
  '/panel',
  '/offline',
  '/manifest.json',
]

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching resources')
        return cache.addAll(PRECACHE_RESOURCES)
      })
      .then(() => {
        console.log('[SW] Install complete')
        return self.skipWaiting()
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            })
        )
      })
      .then(() => {
        console.log('[SW] Activate complete')
        return self.clients.claim()
      })
  )
})

// Fetch event - network first, then cache, then offline page
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return

  // Skip browser extensions and non-http requests
  if (!event.request.url.startsWith('http')) return

  // Skip API requests (we want fresh data)
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return new Response(
            JSON.stringify({ error: 'Offline', message: 'Brak połączenia z internetem' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          )
        })
    )
    return
  }

  // For navigation requests (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the new version
          const responseClone = response.clone()
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(event.request, responseClone))
          return response
        })
        .catch(async () => {
          // Try cache first
          const cachedResponse = await caches.match(event.request)
          if (cachedResponse) return cachedResponse

          // Otherwise show offline page
          const offlinePage = await caches.match(OFFLINE_URL)
          if (offlinePage) return offlinePage

          // Last resort
          return new Response('Offline', { status: 503 })
        })
    )
    return
  }

  // For other resources (images, CSS, JS) - cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version and update in background
          fetch(event.request)
            .then((response) => {
              caches.open(CACHE_NAME)
                .then((cache) => cache.put(event.request, response))
            })
            .catch(() => {}) // Ignore network errors for background updates
          return cachedResponse
        }

        // Not in cache, fetch from network
        return fetch(event.request)
          .then((response) => {
            // Cache successful responses
            if (response.ok) {
              const responseClone = response.clone()
              caches.open(CACHE_NAME)
                .then((cache) => cache.put(event.request, responseClone))
            }
            return response
          })
          .catch(() => {
            // For images, return a placeholder
            if (event.request.destination === 'image') {
              return new Response(
                '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect fill="#f3f4f6" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dominant-baseline="middle" fill="#9ca3af" font-size="12">Offline</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
              )
            }
            throw new Error('Network error')
          })
      })
  )
})

// Push notification event
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()

  const options = {
    body: data.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
    actions: data.actions || [],
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'GraphFlow', options)
  )
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus()
          }
        }
        // Open new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(url)
        }
      })
  )
})

// Background sync event (for queued actions when offline)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag)

  if (event.tag === 'sync-pending-actions') {
    event.waitUntil(syncPendingActions())
  }
})

// Sync pending actions when back online
async function syncPendingActions() {
  try {
    // Get pending actions from IndexedDB
    // This would be implemented with actual storage
    console.log('[SW] Syncing pending actions...')

    // Notify clients that sync is complete
    const clients = await self.clients.matchAll()
    clients.forEach((client) => {
      client.postMessage({ type: 'SYNC_COMPLETE' })
    })
  } catch (error) {
    console.error('[SW] Sync failed:', error)
  }
}

// Message event - communication with main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data)

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME)
      .then(() => {
        event.ports[0].postMessage({ success: true })
      })
  }
})
