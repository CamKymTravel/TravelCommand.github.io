export const DEFAULT_STORAGE_KEY = 'tcc:v1:state';

const STORED_STATE_PREFIX = 'TCCZ1:';
const STORAGE_COMPRESSION_THRESHOLD = 8192;
const LZW_CLEAR = 256;
const LZW_FIRST = 257;
const LZW_MAX = 65535;
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function checksumBytes(bytes) {
  let hash=0x811c9dc5;
  for(let index=0; index<bytes.length; index+=1){ hash^=bytes[index]; hash=Math.imul(hash,0x01000193)>>>0; }
  return hash.toString(16).padStart(8,'0');
}

function encodeBase64Bytes(bytes) {
  const chunks=[]; let chunk='';
  for(let index=0; index<bytes.length; index+=3){
    const a=bytes[index], b=index+1<bytes.length?bytes[index+1]:0, c=index+2<bytes.length?bytes[index+2]:0;
    const packed=(a<<16)|(b<<8)|c;
    chunk+=BASE64_CHARS[(packed>>>18)&63]+BASE64_CHARS[(packed>>>12)&63]+(index+1<bytes.length?BASE64_CHARS[(packed>>>6)&63]:'=')+(index+2<bytes.length?BASE64_CHARS[packed&63]:'=');
    if(chunk.length>=65536){ chunks.push(chunk); chunk=''; }
  }
  if(chunk) chunks.push(chunk);
  return chunks.join('');
}

function decodeBase64Bytes(text) {
  const value=String(text||'');
  if(value.length%4!==0) throw new Error('Stored state compression is truncated');
  const map=new Int16Array(128); map.fill(-1);
  for(let index=0; index<BASE64_CHARS.length; index+=1) map[BASE64_CHARS.charCodeAt(index)]=index;
  const padding=value.endsWith('==')?2:value.endsWith('=')?1:0;
  const output=new Uint8Array((value.length/4)*3-padding); let offset=0;
  for(let index=0; index<value.length; index+=4){
    const chars=[value[index],value[index+1],value[index+2],value[index+3]];
    const nums=chars.map((char,pos)=>char==='='&&pos>=2?0:(char&&char.charCodeAt(0)<128?map[char.charCodeAt(0)]:-1));
    if(nums.some((number,pos)=>number<0 || (chars[pos]==='=' && pos<2))) throw new Error('Stored state compression contains invalid Base64 data');
    const packed=(nums[0]<<18)|(nums[1]<<12)|(nums[2]<<6)|nums[3];
    if(offset<output.length) output[offset++]=(packed>>>16)&255;
    if(offset<output.length) output[offset++]=(packed>>>8)&255;
    if(offset<output.length) output[offset++]=packed&255;
  }
  return output;
}

function lzwCompressBytes(bytes) {
  if(!bytes.length) return new Uint8Array();
  let dictionary=new Map(), nextCode=LZW_FIRST, prefix=bytes[0];
  const codes=[];
  for(let index=1; index<bytes.length; index+=1){
    const byte=bytes[index], key=prefix*256+byte, found=dictionary.get(key);
    if(found!==undefined){ prefix=found; continue; }
    codes.push(prefix);
    if(nextCode<=LZW_MAX) dictionary.set(key,nextCode++);
    else { codes.push(LZW_CLEAR); dictionary=new Map(); nextCode=LZW_FIRST; }
    prefix=byte;
  }
  codes.push(prefix);
  const output=new Uint8Array(codes.length*2);
  for(let index=0; index<codes.length; index+=1){ output[index*2]=codes[index]>>>8; output[index*2+1]=codes[index]&255; }
  return output;
}

function lzwExpandBytes(bytes) {
  if(bytes.length%2!==0) throw new Error('Stored state compression has an incomplete code');
  if(!bytes.length) return new Uint8Array();
  const prefix=new Uint16Array(LZW_MAX+1), suffix=new Uint8Array(LZW_MAX+1), stack=new Uint8Array(LZW_MAX+1);
  let nextCode=LZW_FIRST, previous=-1, firstByte=0;
  const chunks=[]; let chunk=[];
  const emit=byte=>{ chunk.push(byte); if(chunk.length>=65536){ chunks.push(Uint8Array.from(chunk)); chunk=[]; } };
  const decodeCode=code=>{
    let top=0, cursor=code;
    if(cursor<256){ stack[top++]=cursor; return top; }
    while(cursor>=LZW_FIRST){
      if(cursor>=nextCode) throw new Error('Stored state compression references an unknown code');
      stack[top++]=suffix[cursor]; cursor=prefix[cursor];
      if(top>=LZW_MAX) throw new Error('Stored state compression dictionary loop detected');
    }
    if(cursor===LZW_CLEAR) throw new Error('Stored state compression contains an invalid clear sequence');
    stack[top++]=cursor;
    return top;
  };
  for(let index=0; index<bytes.length; index+=2){
    const code=(bytes[index]<<8)|bytes[index+1];
    if(code===LZW_CLEAR){ nextCode=LZW_FIRST; previous=-1; continue; }
    if(code>nextCode) throw new Error('Stored state compression contains an invalid code');
    if(code===nextCode){
      if(previous<0) throw new Error('Stored state compression starts with an invalid dictionary code');
      const top=decodeCode(previous); firstByte=stack[top-1];
      for(let offset=top-1; offset>=0; offset-=1) emit(stack[offset]);
      emit(firstByte);
      if(nextCode<=LZW_MAX){ prefix[nextCode]=previous; suffix[nextCode]=firstByte; nextCode+=1; }
      previous=code;
      continue;
    }
    const top=decodeCode(code); firstByte=stack[top-1];
    for(let offset=top-1; offset>=0; offset-=1) emit(stack[offset]);
    if(previous>=0 && nextCode<=LZW_MAX){ prefix[nextCode]=previous; suffix[nextCode]=firstByte; nextCode+=1; }
    previous=code;
  }
  if(chunk.length) chunks.push(Uint8Array.from(chunk));
  const total=chunks.reduce((sum,item)=>sum+item.length,0), output=new Uint8Array(total); let offset=0;
  for(const item of chunks){ output.set(item,offset); offset+=item.length; }
  return output;
}

export function encodeStoredState(serialized) {
  const text=String(serialized??'');
  if(text.length<STORAGE_COMPRESSION_THRESHOLD) return text;
  const rawBytes=new TextEncoder().encode(text);
  const compressed=lzwCompressBytes(rawBytes);
  const packed=`${STORED_STATE_PREFIX}${rawBytes.length}:${checksumBytes(rawBytes)}:${encodeBase64Bytes(compressed)}`;
  return packed.length<text.length ? packed : text;
}

export function decodeStoredState(stored) {
  const text=String(stored??'');
  if(!text.startsWith(STORED_STATE_PREFIX)) return text;
  const match=text.match(/^TCCZ1:(\d+):([0-9a-f]{8}):([A-Za-z0-9+/=]*)$/s);
  if(!match) throw new Error('Stored state compression header is invalid');
  const expectedLength=Number(match[1]);
  if(!Number.isSafeInteger(expectedLength) || expectedLength<0) throw new Error('Stored state compression length is invalid');
  const bytes=lzwExpandBytes(decodeBase64Bytes(match[3]));
  if(bytes.length!==expectedLength) throw new Error('Stored state compression length check failed');
  if(checksumBytes(bytes)!==match[2]) throw new Error('Stored state compression checksum failed');
  return new TextDecoder().decode(bytes);
}

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
      const decoded = value == null ? null : decodeStoredState(value);
      this.lastReadError = null;
      return decoded;
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

    const storedValue=encodeStoredState(serialized);
    try {
      this.storage.setItem(this.key, storedValue);
      const verified = this.storage.getItem(this.key) === storedValue;
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
