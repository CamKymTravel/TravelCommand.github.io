export const DEFAULT_STORAGE_KEY = 'tcc:v1:state';

export class BrowserStorageAdapter {
  constructor(storage = globalThis.localStorage, key = DEFAULT_STORAGE_KEY) {
    this.storage = storage;
    this.key = key;
  }
  read() { return this.storage.getItem(this.key); }
  write(serialized) { this.storage.setItem(this.key, serialized); return this.storage.getItem(this.key) === serialized; }
  remove() { this.storage.removeItem(this.key); }
}

export class MemoryStorageAdapter {
  constructor() { this.value = null; this.failNextWrite = false; }
  read() { return this.value; }
  write(serialized) {
    if (this.failNextWrite) { this.failNextWrite = false; return false; }
    this.value = serialized;
    return true;
  }
  remove() { this.value = null; }
}
