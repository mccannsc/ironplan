/**
 * IronPlan – IndexedDB wrapper.
 * Local-first storage layer for offline support.
 *
 * Stores:
 *   workouts        keyPath: id
 *   workout_logs    keyPath: id
 *   exercise_notes  keyPath: exercise_id
 *   bodyweight_logs keyPath: date
 *   sync_queue      keyPath: id (autoIncrement), index: by_status
 */

const DB_NAME = 'ironplan';
const DB_VERSION = 1;

let _db = null;

function _open() {
  if (_db) return Promise.resolve(_db);
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('workouts'))
        db.createObjectStore('workouts', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('workout_logs'))
        db.createObjectStore('workout_logs', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('exercise_notes'))
        db.createObjectStore('exercise_notes', { keyPath: 'exercise_id' });
      if (!db.objectStoreNames.contains('bodyweight_logs'))
        db.createObjectStore('bodyweight_logs', { keyPath: 'date' });
      if (!db.objectStoreNames.contains('sync_queue')) {
        const sq = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
        sq.createIndex('by_status', 'status');
      }
    };

    req.onsuccess = e => { _db = e.target.result; res(_db); };
    req.onerror  = e => rej(e.target.error);
  });
}

// ─── Core CRUD ───────────────────────────────────────────────────────────────

export async function idbGetAll(store) {
  const db = await _open();
  return new Promise((res, rej) => {
    const req = db.transaction(store, 'readonly').objectStore(store).getAll();
    req.onsuccess = () => res(req.result || []);
    req.onerror  = () => rej(req.error);
  });
}

export async function idbPut(store, item) {
  const db = await _open();
  return new Promise((res, rej) => {
    const req = db.transaction(store, 'readwrite').objectStore(store).put(item);
    req.onsuccess = () => res();
    req.onerror  = () => rej(req.error);
  });
}

export async function idbPutMany(store, items) {
  if (!items || !items.length) return;
  const db = await _open();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite');
    const s  = tx.objectStore(store);
    items.forEach(item => s.put(item));
    tx.oncomplete = () => res();
    tx.onerror    = () => rej(tx.error);
  });
}

export async function idbDelete(store, key) {
  const db = await _open();
  return new Promise((res, rej) => {
    const req = db.transaction(store, 'readwrite').objectStore(store).delete(key);
    req.onsuccess = () => res();
    req.onerror  = () => rej(req.error);
  });
}

// ─── Sync queue ───────────────────────────────────────────────────────────────

export async function idbEnqueue(item) {
  const db = await _open();
  return new Promise((res, rej) => {
    const req = db.transaction('sync_queue', 'readwrite')
      .objectStore('sync_queue')
      .add({ ...item, status: 'pending', created_at: new Date().toISOString() });
    req.onsuccess = () => res(req.result);
    req.onerror  = () => rej(req.error);
  });
}

export async function idbGetByStatus(status) {
  const db = await _open();
  return new Promise((res, rej) => {
    const req = db.transaction('sync_queue', 'readonly')
      .objectStore('sync_queue')
      .index('by_status')
      .getAll(status);
    req.onsuccess = () => res(req.result || []);
    req.onerror  = () => rej(req.error);
  });
}

export async function idbCountByStatus(status) {
  const db = await _open();
  return new Promise((res, rej) => {
    const req = db.transaction('sync_queue', 'readonly')
      .objectStore('sync_queue')
      .index('by_status')
      .count(status);
    req.onsuccess = () => res(req.result);
    req.onerror  = () => rej(req.error);
  });
}

export async function idbUpdateQueueItem(id, updates) {
  const db = await _open();
  return new Promise((res, rej) => {
    const store  = db.transaction('sync_queue', 'readwrite').objectStore('sync_queue');
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      if (getReq.result) store.put({ ...getReq.result, ...updates });
      res();
    };
    getReq.onerror = () => rej(getReq.error);
  });
}
