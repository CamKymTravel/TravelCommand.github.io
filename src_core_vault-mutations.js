import { createRecord, touchRecord } from './src_core_records.js';

export const VAULT_CATEGORIES = Object.freeze(['passport','visa','insurance','accommodation','emergency']);
export const VAULT_OWNERS = Object.freeze(['Cameron','Kym','Both']);
export const IMAGE_MIME_TYPES = Object.freeze(['image/png','image/jpeg','image/webp']);

function clean(value) { return String(value ?? '').trim(); }
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
  const text = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(new Date(`${text}T00:00:00`).getTime())) throw new Error('Invalid Vault date');
  return text;
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
  if (index < 0) return false;
  state.vault.splice(index, 1);
  state.attachments = state.attachments.filter(item => item.vaultRecordId !== recordId);
  return true;
}

export function saveVaultAttachmentDraft(state, { vaultRecordId, name, mimeType, dataUrl }, options) {
  if (!state.vault.some(record => record.id === vaultRecordId)) throw new Error('Vault record no longer exists');
  const safeName = clean(name) || 'Screenshot';
  if (!IMAGE_MIME_TYPES.includes(mimeType)) throw new Error('Vault attachments must be screenshot images');
  const payload = String(dataUrl || '');
  const expectedPrefix = `data:${mimeType};base64,`;
  if (!payload.startsWith(expectedPrefix) || payload.length <= expectedPrefix.length) throw new Error('Invalid screenshot attachment data');
  const attachment = createRecord('vault-attachment', { vaultRecordId, name:safeName, mimeType, dataUrl:payload }, options);
  state.attachments.push(attachment);
  return attachment;
}

export function deleteVaultAttachmentDraft(state, attachmentId) {
  const index = findIndex(state.attachments, attachmentId);
  if (index < 0) return false;
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
    password: String(fields.password ?? ''),
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
  if (index < 0) return false;
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
  if (index < 0) return false;
  state.protectedEmails.splice(index, 1);
  return true;
}
