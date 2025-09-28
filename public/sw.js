/**
 * Celora V2 Service Worker
 * Enhanced version with advanced caching strategies and offline support
 */

// Cache names for different types of content
const CACHE_NAMES = {
  STATIC: 'celora-static-v1',
  DYNAMIC: 'celora-dynamic-v1',
  API: 'celora-api-v1',
  IMAGES: 'celora-images-v1',
  OFFLINE: 'celora-offline-v1'
};

// Static resources to cache during installation
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  // Add other static assets like CSS, fonts, and icons
];

// Offline fallback pages
const OFFLINE_FALLBACKS = {
  document: '/offline',
  image: '/images/offline-image.svg',
  font: null
};

// API endpoints to cache with different strategies
const API_CACHE_CONFIG = [
  // Cache and update
  { url: '/api/static-content', strategy: 'cache-first', maxAge: 7 * 24 * 60 * 60 * 1000 }, // 1 week
  // Network first but fallback to cache
  { url: '/api/user-data', strategy: 'network-first', maxAge: 60 * 60 * 1000 }, // 1 hour
  // Always network (never cache)
  { url: '/api/transactions', strategy: 'network-only' },
];

// Version of the service worker (increment this when updating cache strategies)
const VERSION = '1.0.0';

/**
 * Helper function to check if a request is for an API endpoint
 */
function isApiRequest(request) {
  return request.url.includes('/api/');
}

/**
 * Helper function to check if a request is for a static asset
 */
function isStaticAsset(request) {
  return (
    request.url.match(/\.(css|js|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|ico|json)$/i) ||
    STATIC_ASSETS.some(asset => request.url.endsWith(asset))
  );
}

/**
 * Helper to determine cache strategy based on the request
 */
function getCacheStrategy(request) {
  // Check if it matches any of our API configs
  if (isApiRequest(request)) {
    const apiConfig = API_CACHE_CONFIG.find(config => request.url.includes(config.url));
    return apiConfig ? apiConfig.strategy : 'network-only';
  }
  
  // For HTML pages (navigation requests)
  if (request.mode === 'navigate') {
    return 'network-first';
  }
  
  // For static assets
  if (isStaticAsset(request)) {
    return 'cache-first';
  }
  
  // Default strategy
  return 'network-first';
}

/**
 * Get appropriate cache based on request type
 */
function getCacheForRequest(request) {
  if (request.url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) {
    return CACHE_NAMES.IMAGES;
  } else if (isApiRequest(request)) {
    return CACHE_NAMES.API;
  } else if (isStaticAsset(request)) {
    return CACHE_NAMES.STATIC;
  } else {
    return CACHE_NAMES.DYNAMIC;
  }
}

/**
 * Cache-first strategy: Try the cache first, then the network
 */
async function cacheFirstStrategy(request) {
  const cacheName = getCacheForRequest(request);
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(cacheName);
    
    // Clone the response before putting it in the cache
    // because the response body can only be consumed once
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    // If both cache and network fail
    return getOfflineFallback(request);
  }
}

/**
 * Network-first strategy: Try the network first, then the cache
 */
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(getCacheForRequest(request));
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // If network fails, try the cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If both network and cache fail
    return getOfflineFallback(request);
  }
}

/**
 * Network-only strategy: Only try the network
 */
async function networkOnlyStrategy(request) {
  try {
    return await fetch(request);
  } catch (error) {
    // If network fails, return offline fallback
    return getOfflineFallback(request);
  }
}

/**
 * Returns appropriate offline fallback based on request type
 */
async function getOfflineFallback(request) {
  if (request.mode === 'navigate') {
    return caches.match(OFFLINE_FALLBACKS.document);
  } else if (request.url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) {
    return OFFLINE_FALLBACKS.image ? caches.match(OFFLINE_FALLBACKS.image) : new Response('Image not available offline', { status: 503 });
  } else if (request.url.match(/\.(woff2?|ttf|eot)$/i)) {
    return OFFLINE_FALLBACKS.font ? caches.match(OFFLINE_FALLBACKS.font) : new Response('Font not available offline', { status: 503 });
  }
  
  // Default fallback response
  return new Response('Network request failed and no offline version available', { 
    status: 503,
    headers: { 'Content-Type': 'text/plain' }
  });
}

// =======================================================================
// Service Worker Event Handlers
// =======================================================================

/**
 * Install event: Cache static assets and offline fallbacks
 */
self.addEventListener('install', (event) => {
  console.log(`[Service Worker] Installing version ${VERSION}`);
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(CACHE_NAMES.STATIC).then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Cache offline fallbacks
      caches.open(CACHE_NAMES.OFFLINE).then((cache) => {
        console.log('[Service Worker] Caching offline fallbacks');
        
        const offlineCaches = [];
        
        if (OFFLINE_FALLBACKS.document) {
          offlineCaches.push(cache.add(OFFLINE_FALLBACKS.document));
        }
        
        if (OFFLINE_FALLBACKS.image) {
          offlineCaches.push(cache.add(OFFLINE_FALLBACKS.image));
        }
        
        if (OFFLINE_FALLBACKS.font) {
          offlineCaches.push(cache.add(OFFLINE_FALLBACKS.font));
        }
        
        return Promise.all(offlineCaches);
      })
    ])
    .then(() => {
      // Skip waiting to activate the service worker immediately
      self.skipWaiting();
      console.log('[Service Worker] Installation complete');
      
      // Notify clients that offline mode is ready
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'OFFLINE_READY' });
        });
      });
    })
  );
});

/**
 * Activate event: Clean up old caches and take control of clients
 */
self.addEventListener('activate', (event) => {
  console.log(`[Service Worker] Activating version ${VERSION}`);
  
  // Get all cache names
  const expectedCacheNames = Object.values(CACHE_NAMES);
  
  event.waitUntil(
    // Clean up old caches
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!expectedCacheNames.includes(cacheName)) {
            console.log(`[Service Worker] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      // Take control of all clients
      return self.clients.claim();
    })
    .then(() => {
      console.log('[Service Worker] Activation complete');
      
      // Notify clients of the update
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'CACHE_UPDATED' });
        });
      });
    })
  );
});

/**
 * Fetch event: Handle requests with appropriate caching strategies
 */
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Skip socket requests (for WebSocket connections)
  if (event.request.url.includes('/socket/')) {
    return;
  }
  
  // Skip requests that aren't GET
  if (event.request.method !== 'GET') {
    return;
  }
  
  const strategy = getCacheStrategy(event.request);
  
  switch (strategy) {
    case 'cache-first':
      event.respondWith(cacheFirstStrategy(event.request));
      break;
    case 'network-first':
      event.respondWith(networkFirstStrategy(event.request));
      break;
    case 'network-only':
      event.respondWith(networkOnlyStrategy(event.request));
      break;
    default:
      event.respondWith(networkFirstStrategy(event.request));
  }
});

/**
 * Message event: Handle messages from clients
 */
self.addEventListener('message', (event) => {
  // Handle skip waiting message
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] Skip waiting message received');
    self.skipWaiting();
  }
});