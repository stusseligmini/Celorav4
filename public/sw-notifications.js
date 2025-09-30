// Push Notification Service Worker
// This handles background push notifications when the app is closed

const CACHE_NAME = 'celora-v2-cache-v1';

// Files to cache for offline functionality
const urlsToCache = [
  '/',
  '/offline',
  '/manifest.json',
  '/logo.png',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache if available, fall back to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest)
          .then((response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Cache the new response
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // If fetch fails, show offline page
            if (event.request.mode === 'navigate') {
              return caches.match('/offline');
            }
          });
      })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received');
  console.log(`[Service Worker] Push had this data: "${event.data.text()}"`);

  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'No message content',
      icon: data.icon || '/icon-192x192.png',
      badge: data.badge || '/icon-192x192.png',
      tag: data.tag || 'celora-notification',
      data: data.data || {},
      actions: data.actions || [],
      vibrate: data.vibrate || [100, 50, 100],
      timestamp: data.timestamp || Date.now(),
      renotify: data.renotify || false,
      requireInteraction: data.requireInteraction || false
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Celora Notification', options)
    );
  } catch (error) {
    // Fallback for non-JSON payloads
    console.error('Error parsing push notification payload', error);
    
    event.waitUntil(
      self.registration.showNotification('Celora Notification', {
        body: event.data ? event.data.text() : 'New notification',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png'
      })
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click received', event.notification.tag);

  // Close the notification
  event.notification.close();

  // Handle notification click
  // This code will navigate to the appropriate page when the notification is clicked
  let targetUrl = '/';
  
  if (event.notification.data && event.notification.data.url) {
    targetUrl = event.notification.data.url;
  }

  // If the action button was clicked, use that URL instead if available
  if (event.action) {
    const action = event.notification.data?.actions?.find(a => a.action === event.action);
    if (action && action.url) {
      targetUrl = action.url;
    }
  }

  event.waitUntil(
    clients.matchAll({
      type: 'window'
    }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notification closed', event.notification.tag);
  // You can add analytics tracking here if needed
});

      // Handle subscription change
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[Service Worker] Push subscription changed');
  
  // Re-subscribe the user with the new subscription
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: self.applicationServerKey
    }).then((newSubscription) => {
      // Store the new subscription on your server
      console.log('[Service Worker] New subscription:', newSubscription);
      
      // Send the new subscription to your server
      return fetch('/api/notifications/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription: newSubscription
        })
      });
    })
  );
});// Set the application server key for VAPID
// This will be set by the main thread when registering the service worker
self.applicationServerKey = null;
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_VAPID_PUBLIC_KEY') {
    self.applicationServerKey = event.data.key;
    console.log('[Service Worker] VAPID public key set');
  }
});