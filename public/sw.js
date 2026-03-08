const CACHE_NAME = 'mmw-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// Intercept fetch requests
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Intercept the native share target POST request
    if (url.pathname === '/share-target' && event.request.method === 'POST') {
        event.respondWith(handleShareTarget(event.request));
        return;
    }
});

async function handleShareTarget(request) {
    try {
        const formData = await request.formData();
        const sharedData = {
            title: formData.get('title') || '',
            text: formData.get('text') || '',
            url: formData.get('url') || '',
            files: formData.getAll('files').filter(file => file.name && file.size > 0),
            timestamp: Date.now()
        };

        // Save data to IndexedDB
        await saveToIndexedDB(sharedData);

        // Redirect the user seamlessly to the home page so they can review/send what they just shared.
        return Response.redirect('/?shared=true', 303);
    } catch (error) {
        console.error('Error handling share target:', error);
        return Response.redirect('/?share_error=true', 303);
    }
}

// Simple IndexedDB wrapper for Service Worker
function saveToIndexedDB(data) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('MMW-NativeShare', 1);

        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('sharedPayloads')) {
                db.createObjectStore('sharedPayloads', { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = (e) => {
            const db = e.target.result;
            const transaction = db.transaction('sharedPayloads', 'readwrite');
            const store = transaction.objectStore('sharedPayloads');

            const addReq = store.add(data);
            addReq.onsuccess = () => resolve();
            addReq.onerror = () => reject(addReq.error);
        };

        request.onerror = () => reject(request.error);
    });
}
