// pwa-share.js - Runs on the frontend to pull native shares from IndexedDB

document.addEventListener("DOMContentLoaded", async () => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('/sw.js');
            console.log('SW Registered');
        } catch (err) {
            console.error('SW Registration Failed:', err);
        }
    }

    // Check if we arrived here via a native share redirection
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('shared') === 'true') {
        await processSharedData();

        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});

async function processSharedData() {
    try {
        const sharedDataList = await getFromIndexedDB();
        if (!sharedDataList || sharedDataList.length === 0) return;

        // We process the most recent share payload
        const payload = sharedDataList[sharedDataList.length - 1];

        if (payload.files && payload.files.length > 0) {
            // It's a file share!
            // Switch UI to file mode if it exists on this page
            const fileBtn = document.getElementById("fileBtn");
            if (fileBtn) fileBtn.click();

            // Wait a tiny bit for GSAP UI to swap via click, then inject
            setTimeout(() => {
                if (typeof handleFiles === "function") {
                    handleFiles(payload.files);
                }
            }, 400);

        } else if (payload.text || payload.title || payload.url) {
            // It's a text/link share!
            const textBtn = document.getElementById("textBtn");
            if (textBtn) textBtn.click();

            setTimeout(() => {
                const textArea = document.getElementById("textArea");
                if (textArea) {
                    let combinedText = [];
                    if (payload.title) combinedText.push(payload.title);
                    if (payload.text) combinedText.push(payload.text);
                    if (payload.url) combinedText.push(payload.url);

                    textArea.value = combinedText.join('\n\n');
                }
            }, 400);
        }

        // Clear the DB to prevent re-processing on next load
        await clearIndexedDB();

    } catch (error) {
        console.error("Failed to process shared data from IndexedDB:", error);
    }
}

// --- IndexedDB Client Helpers ---
function getFromIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('MMW-NativeShare', 1);

        // In case the SW hasn't created it yet
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('sharedPayloads')) {
                db.createObjectStore('sharedPayloads', { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('sharedPayloads')) return resolve([]);

            const transaction = db.transaction('sharedPayloads', 'readonly');
            const store = transaction.objectStore('sharedPayloads');
            const getAllReq = store.getAll();

            getAllReq.onsuccess = () => resolve(getAllReq.result);
            getAllReq.onerror = () => reject(getAllReq.error);
        };

        request.onerror = () => reject(request.error);
    });
}

function clearIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('MMW-NativeShare', 1);
        request.onsuccess = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('sharedPayloads')) return resolve();

            const transaction = db.transaction('sharedPayloads', 'readwrite');
            const store = transaction.objectStore('sharedPayloads');
            const clearReq = store.clear();

            clearReq.onsuccess = () => resolve();
            clearReq.onerror = () => reject(clearReq.error);
        };
    });
}
