import { SCHEMA_VERSION } from './src_core_schema.js';

export function migrateState(input) {
  const clone = structuredClone(input);
  const version = Number(clone?.schemaVersion ?? 0);
  if (version === SCHEMA_VERSION) return clone;
  if (version > SCHEMA_VERSION) throw new Error('Backup was created by a newer schema');
  if (version === 0) {
    clone.schemaVersion = 1;
    clone.meta ??= {};
    clone.ui ??= { activeScreen: 'home', vaultUnlocked: false, streamingOpenedSinceUnlock: false, pendingOpen: null };
    clone.ui.pendingOpen ??= null;
    clone.protectedEmails ??= [];
    return clone;
  }
  throw new Error(`No migration path from schema ${version}`);
}
