import { SCHEMA_VERSION } from './src_core_schema.js';
import { createId } from './src_core_ids.js';

function canonicalNow(now) {
  const value = now();
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) throw new Error('Record clock is invalid');
  return date.toISOString();
}

export function createRecord(type, fields = {}, { now = () => new Date().toISOString() } = {}) {
  const timestamp = canonicalNow(now);
  return {
    id: createId(type),
    schemaVersion: SCHEMA_VERSION,
    createdAt: timestamp,
    modifiedAt: timestamp,
    ...structuredClone(fields)
  };
}

export function touchRecord(record, fields = {}, { now = () => new Date().toISOString() } = {}) {
  let timestamp = canonicalNow(now);
  const floor = typeof record?.modifiedAt === 'string' ? record.modifiedAt : record?.createdAt;
  if (typeof floor === 'string' && timestamp < floor) timestamp = floor;
  return {
    ...structuredClone(record),
    ...structuredClone(fields),
    modifiedAt: timestamp
  };
}
