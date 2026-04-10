const CACHE_NAME = 'attendsync-v2';
const API_CACHE = 'attendsync-api-v2';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192-v2.svg',
  '/icon-512-v2.svg',
  '/icon-192-v2.png',
  '/icon-512-v2.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== API_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests - network only, never cache
  if (url.hostname !== self.location.hostname || url.pathname.includes('/api/')) {
    event.respondWith(fetch(request).catch(() => new Response('Offline', { status: 503 })));
    return;
  }

  // Always try network first for manifest and app icons so desktop installs pick up branding updates.
  if (url.pathname === '/manifest.json' || url.pathname.startsWith('/icon-')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (request.method === 'GET' && response.ok) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, response.clone());
            });
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Handle static assets - cache first, fallback to network
  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request).then((response) => {
        // Only cache GET requests for same-origin static assets
        if (request.method === 'GET' && response.ok) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, response.clone());
          });
        }
        return response;
      });
    })
  );
});

// Background sync for offline attendance
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-attendance') {
    event.waitUntil(syncOfflineAttendance());
  }
});

async function syncOfflineAttendance() {
  try {
    const db = await openDB();
    const tx = db.transaction('pendingAttendance', 'readonly');
    const store = tx.objectStore('pendingAttendance');
    const allRecords = await getAllRecords(store);

    // Filter only unsynced records
    const pending = allRecords.filter(r => r.synced === 0);
    if (pending.length === 0) return;

    // Group by token
    const byToken = {};
    for (const record of pending) {
      if (!byToken[record.token]) byToken[record.token] = [];
      byToken[record.token].push(record);
    }

    for (const [token, records] of Object.entries(byToken)) {
      try {
        const response = await fetch('http://localhost:5001/api/v1/attendance/bulk-sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            records: records.map(r => ({
              studentId: r.data.studentId,
              classId: r.data.classId,
              date: r.data.date,
              status: r.data.status,
            }))
          }),
        });

        if (response.ok) {
          const deleteTx = db.transaction('pendingAttendance', 'readwrite');
          const deleteStore = deleteTx.objectStore('pendingAttendance');
          for (const record of records) {
            await deleteRecord(deleteStore, record.id);
          }

          self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({ type: 'SYNC_SUCCESS' });
            });
          });
        }
      } catch (error) {
        console.error('Bulk sync failed in SW:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AttendSyncDB', 4);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function getAllRecords(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function deleteRecord(store, id) {
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
