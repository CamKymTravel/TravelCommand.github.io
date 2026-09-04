import { createRecord, touchRecord } from './src_core_records.js';

function normaliseAccountFields(fields = {}) {
  const name = String(fields.name || '').trim();
  if (!name) throw new Error('Account name is required');
  const currency = String(fields.currency || 'AUD').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Account currency must be a 3-letter code');
  if (typeof fields.balance === 'boolean' || fields.balance == null || fields.balance === '' || Array.isArray(fields.balance)) throw new Error('Account balance is required');
  const balance = Number(fields.balance);
  if (!Number.isFinite(balance) || Math.abs(balance) > Number.MAX_SAFE_INTEGER) throw new Error('Account balance must be a valid number');
  return { name, currency, balance };
}

export function saveAccountDraft(state, { accountId = null, fields = {} } = {}, { now = () => new Date().toISOString() } = {}) {
  const next = normaliseAccountFields(fields);
  if (accountId) {
    const index = (state.accounts || []).findIndex(record => record.id === accountId);
    if (index < 0) throw new Error('Account could not be found');
    state.accounts[index] = touchRecord(state.accounts[index], next, { now });
    return state.accounts[index];
  }
  const record = createRecord('account', next, { now });
  state.accounts.push(record);
  return record;
}

export function deleteAccountDraft(state, accountId) {
  const index = (state.accounts || []).findIndex(record => record.id === accountId);
  if (index < 0) throw new Error('Account could not be found');
  state.accounts.splice(index, 1);
  return true;
}
