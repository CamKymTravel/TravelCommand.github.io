import { validateState } from './src_core_validation.js';

export function createBackupPayload(state) {
  validateState(state);
  return JSON.stringify({
    format: 'TravelCommandCentreBackup',
    exportedAt: new Date().toISOString(),
    state
  }, null, 2);
}
