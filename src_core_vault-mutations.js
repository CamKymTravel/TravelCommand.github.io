import { createRecord, touchRecord } from './src_core_records.js';
import { toISODate } from './src_core_dates.js';
import { createId } from './src_core_ids.js';

export const VAULT_CATEGORIES = Object.freeze(['passport','visa','insurance','accommodation','emergency']);
export const VAULT_OWNERS = Object.freeze(['Cameron','Kym','Both']);
export const IMAGE_MIME_TYPES = Object.freeze(['image/png','image/jpeg','image/webp']);
export const MAX_VAULT_SCREENSHOT_BYTES = 1_500_000;
export const MAX_VAULT_SCREENSHOTS_PER_RECORD = 12;

export function createVaultAssetKey(attachmentId = '') {
  const base = typeof attachmentId === 'string' && attachmentId ? attachmentId : createId('vault-attachment');
  return `${base}:asset:${createId('blob')}`;
}

function base64Bytes(encoded) {
  let binary;
  try { binary = globalThis.atob(encoded); }
  catch { throw new Error('Invalid screenshot attachment data'); }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function readUint32BE(bytes, offset) {
  return ((bytes[offset] * 0x1000000) + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3]) >>> 0;
}

function readUint32LE(bytes, offset) {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

function ascii(bytes, offset, length) {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}

function validPNG(bytes) {
  const signature = [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a];
  if (bytes.length < 45 || signature.some((value, index) => bytes[index] !== value)) return false;
  let offset = 8;
  let sawIHDR = false;
  let sawIDAT = false;
  while (offset + 12 <= bytes.length) {
    const length = readUint32BE(bytes, offset);
    const type = ascii(bytes, offset + 4, 4);
    const end = offset + 12 + length;
    if (end > bytes.length) return false;
    if (!sawIHDR) {
      if (type !== 'IHDR' || length !== 13) return false;
      const width = readUint32BE(bytes, offset + 8);
      const height = readUint32BE(bytes, offset + 12);
      if (!width || !height) return false;
      sawIHDR = true;
    } else if (type === 'IHDR') return false;
    if (type === 'IDAT') sawIDAT = true;
    if (type === 'IEND') return length === 0 && sawIHDR && sawIDAT && end === bytes.length;
    offset = end;
  }
  return false;
}

function validJPEG(bytes) {
  if (bytes.length < 16 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) return false;
  let offset = 2;
  let sawSOF = false;
  while (offset < bytes.length - 2) {
    while (offset < bytes.length - 2 && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length - 2) break;
    const marker = bytes[offset++];
    if (marker === 0xd9) return sawSOF && offset === bytes.length;
    if (marker === 0x00 || marker === 0xff) return false;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 1 >= bytes.length) return false;
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) return false;
    const sof = (marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf);
    if (sof) sawSOF = true;
    if (marker === 0xda) {
      const scanStart = offset + length;
      return sawSOF && scanStart < bytes.length - 2 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9;
    }
    offset += length;
  }
  return false;
}

function validWebP(bytes) {
  if (bytes.length < 20 || ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WEBP') return false;
  const declaredSize = readUint32LE(bytes, 4);
  if (declaredSize + 8 !== bytes.length) return false;
  let offset = 12;
  let sawImageChunk = false;
  while (offset + 8 <= bytes.length) {
    const type = ascii(bytes, offset, 4);
    const length = readUint32LE(bytes, offset + 4);
    const padded = length + (length % 2);
    const end = offset + 8 + padded;
    if (end > bytes.length) return false;
    if (type === 'VP8 ' || type === 'VP8L' || type === 'VP8X') sawImageChunk = true;
    offset = end;
  }
  return sawImageChunk && offset === bytes.length;
}

function validateImageStructure(mimeType, encoded) {
  const bytes = base64Bytes(encoded);
  const valid = mimeType === 'image/png' ? validPNG(bytes) : mimeType === 'image/jpeg' ? validJPEG(bytes) : mimeType === 'image/webp' ? validWebP(bytes) : false;
  if (!valid) throw new Error('Screenshot data does not contain a valid PNG, JPEG or WebP image structure');
}

export function validateVaultScreenshotPayload(mimeType, dataUrl) {
  if (!IMAGE_MIME_TYPES.includes(mimeType)) throw new Error('Vault attachments must be screenshot images');
  const payload = String(dataUrl || '');
  const expectedPrefix = `data:${mimeType};base64,`;
  if (!payload.startsWith(expectedPrefix) || payload.length <= expectedPrefix.length) throw new Error('Invalid screenshot attachment data');
  const encoded = payload.slice(expectedPrefix.length);
  if (encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || /=/.test(encoded.slice(0, -2))) throw new Error('Invalid screenshot attachment data');
  const padding = encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0;
  const bytes = (encoded.length / 4) * 3 - padding;
  if (!Number.isInteger(bytes) || bytes <= 0) throw new Error('Invalid screenshot attachment data');
  if (bytes > MAX_VAULT_SCREENSHOT_BYTES) throw new Error('Screenshot is too large for reliable offline storage. Use a screenshot under 1.5 MB.');
  validateImageStructure(mimeType, encoded);
  return bytes;
}

function clean(value) {
  if (value == null) return '';
  if (typeof value !== 'string') throw new Error('Vault text fields must be text');
  return value.trim();
}
function requireCategory(category) {
  if (!VAULT_CATEGORIES.includes(category)) throw new Error('Invalid Vault category');
  return category;
}
function requireOwner(owner) {
  if (!VAULT_OWNERS.includes(owner)) throw new Error('Invalid Vault owner');
  return owner;
}
function validOptionalDate(value) {
  if (!value) return null;
  try { return toISODate(value); }
  catch { throw new Error('Invalid Vault date'); }
}
function findIndex(records, id) { return records.findIndex(record => record.id === id); }

export function saveVaultRecordDraft(state, { recordId = null, fields = {} }, options) {
  const title = clean(fields.title);
  if (!title) throw new Error('Vault record title is required');
  const next = {
    category: requireCategory(fields.category),
    title,
    owner: requireOwner(fields.owner),
    reference: clean(fields.reference),
    issueDate: validOptionalDate(fields.issueDate),
    expiryDate: validOptionalDate(fields.expiryDate),
    details: clean(fields.details),
    notes: clean(fields.notes)
  };
  if (next.issueDate && next.expiryDate && next.expiryDate < next.issueDate) throw new Error('Vault expiry date precedes issue date');
  if (!recordId) {
    const record = createRecord('vault', next, options);
    state.vault.push(record);
    return record;
  }
  const index = findIndex(state.vault, recordId);
  if (index < 0) throw new Error('Vault record no longer exists');
  state.vault[index] = touchRecord(state.vault[index], next, options);
  return state.vault[index];
}

export function deleteVaultRecordDraft(state, recordId) {
  const index = findIndex(state.vault, recordId);
  if (index < 0) throw new Error('Vault record no longer exists');
  state.vault.splice(index, 1);
  state.attachments = state.attachments.filter(item => item.vaultRecordId !== recordId);
  return true;
}

export function saveVaultAttachmentDraft(state, { vaultRecordId, name, mimeType, dataUrl = null, assetKey = null, byteLength = null, attachmentId = null }, options) {
  if (!state.vault.some(record => record.id === vaultRecordId)) throw new Error('Vault record no longer exists');
  const safeName = clean(name) || 'Screenshot';
  let bytes = byteLength;
  let payload = null;
  if (typeof dataUrl === 'string' && dataUrl) {
    payload = dataUrl;
    bytes = validateVaultScreenshotPayload(mimeType, payload);
  } else {
    if (typeof assetKey !== 'string' || !assetKey.trim()) throw new Error('Vault screenshot storage key is required');
    if (!Number.isSafeInteger(bytes) || bytes <= 0 || bytes > MAX_VAULT_SCREENSHOT_BYTES) throw new Error('Invalid Vault screenshot byte length');
    if (!IMAGE_MIME_TYPES.includes(mimeType)) throw new Error('Vault attachments must be screenshot images');
  }
  const existingCount = state.attachments.filter(item => item.vaultRecordId === vaultRecordId).length;
  if (existingCount >= MAX_VAULT_SCREENSHOTS_PER_RECORD) throw new Error(`A Vault record can store up to ${MAX_VAULT_SCREENSHOTS_PER_RECORD} screenshots`);
  const fields = { vaultRecordId, name:safeName, mimeType, byteLength:bytes };
  if (payload) fields.dataUrl = payload;
  else fields.assetKey = assetKey.trim();
  if (attachmentId) fields.id = attachmentId;
  const attachment = createRecord('vault-attachment', fields, options);
  state.attachments.push(attachment);
  return attachment;
}

export function deleteVaultAttachmentDraft(state, attachmentId) {
  const index = findIndex(state.attachments, attachmentId);
  if (index < 0) throw new Error('Vault screenshot no longer exists');
  state.attachments.splice(index, 1);
  return true;
}

export function saveStreamingDraft(state, { recordId = null, fields = {} }, options) {
  const service = clean(fields.service);
  if (!service) throw new Error('Streaming service is required');
  const next = {
    service,
    owner: requireOwner(fields.owner),
    username: clean(fields.username),
    password: fields.password == null ? '' : (typeof fields.password === 'string' ? fields.password : (() => { throw new Error('Streaming password must be text'); })()),
    notes: clean(fields.notes)
  };
  if (!recordId) {
    const record = createRecord('streaming', next, options);
    state.streaming.push(record);
    return record;
  }
  const index = findIndex(state.streaming, recordId);
  if (index < 0) throw new Error('Streaming record no longer exists');
  state.streaming[index] = touchRecord(state.streaming[index], next, options);
  return state.streaming[index];
}

export function deleteStreamingDraft(state, recordId) {
  const index = findIndex(state.streaming, recordId);
  if (index < 0) throw new Error('Streaming record no longer exists');
  state.streaming.splice(index, 1);
  return true;
}

export function saveProtectedEmailDraft(state, { recordId = null, fields = {} }, options) {
  const owner = requireOwner(fields.owner);
  const email = clean(fields.email).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('A valid email address is required');
  const duplicate = state.protectedEmails.find(record => record.email.toLowerCase() === email && record.id !== recordId);
  if (duplicate) throw new Error('That protected email is already stored');
  const next = { owner, email, notes:clean(fields.notes) };
  if (!recordId) {
    const record = createRecord('protected-email', next, options);
    state.protectedEmails.push(record);
    return record;
  }
  const index = findIndex(state.protectedEmails, recordId);
  if (index < 0) throw new Error('Protected email no longer exists');
  state.protectedEmails[index] = touchRecord(state.protectedEmails[index], next, options);
  return state.protectedEmails[index];
}

export function deleteProtectedEmailDraft(state, recordId) {
  const index = findIndex(state.protectedEmails, recordId);
  if (index < 0) throw new Error('Protected email no longer exists');
  state.protectedEmails.splice(index, 1);
  return true;
}
