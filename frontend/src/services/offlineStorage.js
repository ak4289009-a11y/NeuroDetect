/**
 * NeuroDetect IndexedDB Offline Storage Manager
 * Architectural Reference: Figure 4.3 & Figure 4.8
 * 
 * Provides persistent offline storage for:
 * - Patient MRI scan records & preliminary predictions
 * - Attending physician offline review drafts
 * - Offline action queue for automatic background synchronization
 */

const DB_NAME = 'neurodetect_pwa_db';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 1. Store for cached patient scans & AI outputs
      if (!db.objectStoreNames.contains('cached_scans')) {
        const scanStore = db.createObjectStore('cached_scans', { keyPath: 'id' });
        scanStore.createIndex('patient_id', 'patient_id', { unique: false });
        scanStore.createIndex('created_at', 'created_at', { unique: false });
      }

      // 2. Store for cached clinical reports
      if (!db.objectStoreNames.contains('cached_reports')) {
        db.createObjectStore('cached_reports', { keyPath: 'id' });
      }

      // 3. Store for offline triage review drafts
      if (!db.objectStoreNames.contains('review_drafts')) {
        db.createObjectStore('review_drafts', { keyPath: 'scan_id' });
      }

      // 4. Offline sync action queue
      if (!db.objectStoreNames.contains('sync_queue')) {
        const queueStore = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
        queueStore.createIndex('action_type', 'action_type', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Cache scans in local IndexedDB for offline retrieval
 */
export async function cacheScansOffline(scans) {
  if (!window.indexedDB) return;
  try {
    const db = await openDB();
    const tx = db.transaction('cached_scans', 'readwrite');
    const store = tx.objectStore('cached_scans');
    scans.forEach((scan) => store.put(scan));
    return new Promise((res, rej) => {
      tx.oncomplete = () => res(true);
      tx.onerror = () => rej(tx.error);
    });
  } catch (err) {
    console.warn('[OfflineStorage] Failed to cache scans:', err);
  }
}

/**
 * Retrieve cached scans when offline
 */
export async function getCachedScansOffline() {
  if (!window.indexedDB) return [];
  try {
    const db = await openDB();
    const tx = db.transaction('cached_scans', 'readonly');
    const store = tx.objectStore('cached_scans');
    const req = store.getAll();
    return new Promise((res, rej) => {
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => rej(req.error);
    });
  } catch (err) {
    console.warn('[OfflineStorage] Failed to read cached scans:', err);
    return [];
  }
}

/**
 * Save doctor clinical review draft locally when disconnected
 */
export async function saveReviewDraftOffline(scanId, draftData) {
  if (!window.indexedDB) return;
  try {
    const db = await openDB();
    const tx = db.transaction('review_drafts', 'readwrite');
    tx.objectStore('review_drafts').put({ scan_id: scanId, ...draftData, saved_at: Date.now() });
    return new Promise((res, rej) => {
      tx.oncomplete = () => res(true);
      tx.onerror = () => rej(tx.error);
    });
  } catch (err) {
    console.warn('[OfflineStorage] Failed to save draft:', err);
  }
}

/**
 * Retrieve saved review draft for a scan
 */
export async function getReviewDraftOffline(scanId) {
  if (!window.indexedDB) return null;
  try {
    const db = await openDB();
    const tx = db.transaction('review_drafts', 'readonly');
    const req = tx.objectStore('review_drafts').get(scanId);
    return new Promise((res, rej) => {
      req.onsuccess = () => res(req.result || null);
      req.onerror = () => rej(req.error);
    });
  } catch (err) {
    return null;
  }
}
