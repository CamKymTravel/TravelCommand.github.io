export const DEFAULT_STORAGE_KEY = 'tcc:v1:state';

export class BrowserStorageAdapter {
  constructor(storage = null, key = DEFAULT_STORAGE_KEY) {
    this.key = key;
    this.lastReadError = null;
    this.lastWriteError = null;
    this.storageAccessError = null;
    this.explicitStorage = storage || null;
    this.storage = storage || null;
    if (!storage) this.retryAccess();
  }

  retryAccess() {
    if (this.explicitStorage) { this.storage = this.explicitStorage; this.storageAccessError = null; return true; }
    try {
      this.storage = globalThis.localStorage;
      this.storageAccessError = null;
      return Boolean(this.storage);
    } catch (error) {
      this.storage = null;
      this.storageAccessError = error instanceof Error ? error : new Error('Local storage access failed');
      return false;
    }
  }

  read() {
    if (!this.storage && !this.retryAccess()) {
      this.lastReadError = this.storageAccessError || new Error('Local storage is unavailable');
      return null;
    }
    try {
      const value = this.storage.getItem(this.key);
      this.lastReadError = null;
      return value;
    } catch (error) {
      this.lastReadError = error instanceof Error ? error : new Error('Local storage read failed');
      return null;
    }
  }

  write(serialized) {
    if (!this.storage && !this.retryAccess()) {
      this.lastWriteError = this.storageAccessError || new Error('Local storage is unavailable');
      return false;
    }
    let previous;
    let previousKnown = false;
    try {
      previous = this.storage.getItem(this.key);
      previousKnown = true;
    } catch (error) {
      this.lastWriteError = error instanceof Error ? error : new Error('Local storage could not establish the previous value');
      return false;
    }

    const rollback = () => {
      if (!previousKnown) return false;
      try {
        if (previous == null) this.storage.removeItem(this.key);
        else this.storage.setItem(this.key, previous);
        return this.storage.getItem(this.key) === previous;
      } catch { return false; }
    };

    try {
      this.storage.setItem(this.key, serialized);
      const verified = this.storage.getItem(this.key) === serialized;
      if (verified) { this.lastWriteError = null; return true; }
      rollback();
      this.lastWriteError = new Error('Local storage write verification failed');
      return false;
    } catch (error) {
      // A Safari/storage implementation may mutate and then throw. The previous
      // value is already known, so restore it immediately before returning.
      rollback();
      this.lastWriteError = error instanceof Error ? error : new Error('Local storage write failed');
      return false;
    }
  }

  remove() {
    if (!this.storage && !this.retryAccess()) return false;
    try { this.storage.removeItem(this.key); return true; } catch { return false; }
  }
}

export class MemoryStorageAdapter {
  constructor() { this.value = null; this.failNextWrite = false; this.lastReadError = null; this.lastWriteError = null; }
  read() { this.lastReadError = null; return this.value; }
  write(serialized) {
    if (this.failNextWrite) { this.failNextWrite = false; this.lastWriteError = new Error('Memory write failed'); return false; }
    this.value = serialized;
    this.lastWriteError = null;
    return true;
  }
  retryAccess() { return true; }
  remove() { this.value = null; return true; }
}


export const DEFAULT_VAULT_ASSET_DB = 'tcc:v1:vault-assets';
export const DEFAULT_VAULT_ASSET_STORE = 'screenshots';

function requestPromise(request, message) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error instanceof Error ? request.error : new Error(message));
  });
}

export class BrowserVaultAssetStore {
  constructor({ indexedDB = globalThis.indexedDB, dbName = DEFAULT_VAULT_ASSET_DB, storeName = DEFAULT_VAULT_ASSET_STORE } = {}) {
    this.indexedDB = indexedDB || null;
    this.dbName = dbName;
    this.storeName = storeName;
    this.dbPromise = null;
  }

  async open() {
    if (!this.indexedDB) throw new Error('Large offline screenshot storage is unavailable on this device');
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = this.indexedDB.open(this.dbName, 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(this.storeName)) db.createObjectStore(this.storeName);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error instanceof Error ? request.error : new Error('Could not open offline screenshot storage'));
        request.onblocked = () => reject(new Error('Offline screenshot storage is blocked by another app session'));
      }).catch(error => { this.dbPromise = null; throw error; });
    }
    return this.dbPromise;
  }

  async get(key) {
    const db = await this.open();
    const tx = db.transaction(this.storeName, 'readonly');
    return requestPromise(tx.objectStore(this.storeName).get(key), 'Could not read offline screenshot');
  }

  async put(key, value) {
    if (typeof key !== 'string' || !key) throw new Error('Invalid screenshot storage key');
    if (typeof value !== 'string' || !value) throw new Error('Invalid screenshot storage payload');
    const db = await this.open();
    const tx = db.transaction(this.storeName, 'readwrite');
    const completed = new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error instanceof Error ? tx.error : new Error('Offline screenshot write failed'));
      tx.onabort = () => reject(tx.error instanceof Error ? tx.error : new Error('Offline screenshot write was aborted'));
    });
    await requestPromise(tx.objectStore(this.storeName).put(value, key), 'Could not write offline screenshot');
    await completed;
    const verified = await this.get(key);
    if (verified !== value) throw new Error('Offline screenshot write verification failed');
    return true;
  }

  async delete(key) {
    if (typeof key !== 'string' || !key) return true;
    const db = await this.open();
    const tx = db.transaction(this.storeName, 'readwrite');
    const completed = new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error instanceof Error ? tx.error : new Error('Offline screenshot delete failed'));
      tx.onabort = () => reject(tx.error instanceof Error ? tx.error : new Error('Offline screenshot delete was aborted'));
    });
    await requestPromise(tx.objectStore(this.storeName).delete(key), 'Could not delete offline screenshot');
    await completed;
    return true;
  }

  async keys() {
    const db = await this.open();
    const tx = db.transaction(this.storeName, 'readonly');
    return requestPromise(tx.objectStore(this.storeName).getAllKeys(), 'Could not list offline screenshots');
  }

  async deleteMany(keys) {
    const unique = [...new Set((keys || []).filter(key => typeof key === 'string' && key))];
    if (!unique.length) return true;
    const db = await this.open();
    const tx = db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    for (const key of unique) store.delete(key);
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error instanceof Error ? tx.error : new Error('Offline screenshot cleanup failed'));
      tx.onabort = () => reject(tx.error instanceof Error ? tx.error : new Error('Offline screenshot cleanup was aborted'));
    });
    return true;
  }
}

export class MemoryVaultAssetStore {
  constructor() { this.values = new Map(); this.failNextWrite = false; }
  async get(key) { return this.values.get(key); }
  async put(key, value) {
    if (this.failNextWrite) { this.failNextWrite = false; throw new Error('Memory screenshot write failed'); }
    this.values.set(key, value); return true;
  }
  async delete(key) { this.values.delete(key); return true; }
  async keys() { return [...this.values.keys()]; }
  async deleteMany(keys) { for (const key of keys || []) this.values.delete(key); return true; }
}
