import { validateState } from './src_core_validation.js';

export const BACKUP_FORMAT_VERSION = 1;

export function backupStateIntegrity(state) {
  const text = JSON.stringify(state);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    hash = Math.imul(hash ^ (code & 0xff), 0x01000193);
    hash = Math.imul(hash ^ (code >>> 8), 0x01000193);
  }
  return { algorithm:'fnv1a32-utf16le', length:text.length, checksum:(hash >>> 0).toString(16).padStart(8, '0') };
}

export function createBackupPayload(state, { exportedAt = new Date().toISOString() } = {}) {
  validateState(state);
  const integrity = backupStateIntegrity(state);
  return JSON.stringify({
    format: 'TravelCommandCentreBackup',
    backupVersion: BACKUP_FORMAT_VERSION,
    appVersion: state.meta.appVersion,
    exportedAt,
    integrity,
    state
  }, null, 2);
}
