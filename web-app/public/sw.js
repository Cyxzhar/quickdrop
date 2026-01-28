const CACHE_NAME = 'quickdrop-v2'
const urlsToCache = [
  '/',
  '/index.html'
]

// Install event - cache core shell
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...')
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell')
        // Don't fail if caching fails, rely on runtime caching
        return cache.addAll(urlsToCache).catch(err => {
          console.warn('[Service Worker] Cache addAll failed:', err)
        })
      })
      .then(() => self.skipWaiting())
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...')
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return
  }

  // Skip API requests (always go to network)
  if (event.request.url.includes('/api/')) {
    return event.respondWith(fetch(event.request))
  }

  // Skip large Tesseract worker files from cache
  if (event.request.url.includes('tesseract') ||
      event.request.url.includes('worker') ||
      event.request.url.includes('.traineddata')) {
    return event.respondWith(fetch(event.request))
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          console.log('[Service Worker] Serving from cache:', event.request.url)
          return response
        }

        // Cache miss - fetch from network
        console.log('[Service Worker] Fetching from network:', event.request.url)
        return fetch(event.request).then(response => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response
          }

          // Clone the response
          const responseToCache = response.clone()

          // Cache the fetched resource
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache)
          })

          return response
        })
      })
      .catch(error => {
        console.error('[Service Worker] Fetch failed:', error)
        // Could return a custom offline page here
        throw error
      })
  )
})
