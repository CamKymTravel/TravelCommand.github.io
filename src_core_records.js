import { SCHEMA_VERSION } from './src_core_schema.js';
import { createId } from './src_core_ids.js';

export function createRecord(type, fields = {}, { now = () => new Date().toISOString() } = {}) {
  const timestamp = now();
  return {
    id: createId(type),
    schemaVersion: SCHEMA_VERSION,
    createdAt: timestamp,
    modifiedAt: timestamp,
    ...structuredClone(fields)
  };
}

export function touchRecord(record, fields = {}, { now = () => new Date().toISOString() } = {}) {
  return {
    ...structuredClone(record),
    ...structuredClone(fields),
    modifiedAt: now()
  };
}
