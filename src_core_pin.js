function normalizeHash(value) { return String(value ?? '').trim().toLowerCase(); }

export async function hashPin(pin) {
  const text = String(pin ?? '');
  if (!/^\d{4,8}$/.test(text)) throw new Error('PIN must be 4–8 digits');
  if (!globalThis.crypto?.subtle) throw new Error('Secure PIN hashing is unavailable');
  const bytes = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return `sha256:${Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

export async function verifyPin(pin, storedHash) {
  const value = normalizeHash(storedHash);
  if (!value) return false;
  const entered = String(pin ?? '');
  if (/^\d{4,8}$/.test(value)) return entered === value;
  const hashed = await hashPin(entered);
  if (value.startsWith('sha256:')) return hashed === value;
  if (/^[a-f0-9]{64}$/.test(value)) return hashed.slice('sha256:'.length) === value;
  return false;
}
