import { createEmptyState } from './src_core_schema.js';
import { validateState } from './src_core_validation.js';
import { migrateState } from './src_core_migrations.js';
import { createVaultAssetKey, validateVaultScreenshotPayload } from './src_core_vault-mutations.js';

function canonicalClock(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) throw new Error('App clock is invalid');
  return date.toISOString();
}

function latestRecordModifiedAt(state) {
  let latest = state?.meta?.modifiedAt || '';
  for (const value of Object.values(state || {})) {
    if (!Array.isArray(value)) continue;
    for (const record of value) {
      if (typeof record?.modifiedAt === 'string' && record.modifiedAt > latest) latest = record.modifiedAt;
    }
  }
  return latest;
}

export class StateService {
  constructor(adapter, { now = () => new Date().toISOString(), vaultAssetStore = null } = {}) {
    this.adapter = adapter;
    this.vaultAssetStore = vaultAssetStore;
    this.vaultAssetIssues = [];
    this._clock = now;
    this.state = createEmptyState(canonicalClock(this._clock()));
    this.listeners = new Set();
    this.recovery = null;
    this.hadStoredState = false;
    this.lastGoodSerialized = null;
    this.now = () => {
      let timestamp = canonicalClock(this._clock());
      const floor = this.state?.meta?.modifiedAt;
      if (typeof floor === 'string' && timestamp < floor) timestamp = floor;
      return timestamp;
    };
  }

  hydrate() {
    const raw = this.adapter.read();
    if (this.adapter.lastReadError) {
      this.hadStoredState = true;
      this.state = createEmptyState(this.now());
      this.lastGoodSerialized = null;
      this.recovery = {
        active:true,
        storageUnavailable:true,
        reason:'Local iPad storage could not be read. Normal Save actions are locked so existing travel data cannot be overwritten.',
        raw:null,
        lastGoodSerialized:null
      };
      return this.state;
    }
    // localStorage.getItem() returns null only when the key is genuinely
    // absent. An empty string is still a present stored value and can be the
    // result of truncation/corruption; never treat it as a fresh install or a
    // later Save could overwrite the only recovery evidence.
    this.hadStoredState = raw != null;
    if (raw == null) {
      this.lastGoodSerialized = JSON.stringify(this.state);
      return this.state;
    }
    try {
      const parsed = migrateState(JSON.parse(raw), { now:this.now() });
      validateState(parsed);
      this.state = parsed;
      this.lastGoodSerialized = JSON.stringify(parsed);
      this.recovery = null;
      return this.state;
    } catch (error) {
      this.state = createEmptyState(this.now());
      this.lastGoodSerialized = null;
      this.recovery = { active:true, reason:error?.message || 'Stored data could not be validated', raw, lastGoodSerialized:null };
      return this.state;
    }
  }

  snapshot() { return structuredClone(this.state); }
  isRecoveryMode() { return this.recovery?.active === true; }
  rawRecoveryData() { return this.recovery?.raw ?? null; }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners() {
    for (const listener of this.listeners) {
      try { listener(this.snapshot()); }
      catch (error) { console.error('Travel Command Centre render subscriber failed after state transition', error); }
    }
  }

  commit(mutator) {
    if (this.isRecoveryMode()) throw new Error('Protected recovery mode is active. Restore a valid backup before making normal changes.');
    const before = this.snapshot();
    const beforeSerialized = this.lastGoodSerialized || JSON.stringify(before);
    const draft = this.snapshot();
    mutator(draft);
    const timestamp = this.now();
    draft.meta.modifiedAt = [before.meta.modifiedAt, timestamp, latestRecordModifiedAt(draft)].sort().at(-1);
    const previousRevision = Number(before.meta.revision || 0);
    // Revision is internal bookkeeping, not travel data. A checksum-valid or
    // locally persisted state can theoretically arrive at numeric saturation;
    // never let that make an otherwise-valid app state impossible to Save.
    // Normal real-world revisions remain monotonic; only the impossible
    // MAX_SAFE boundary wraps safely back to zero.
    draft.meta.revision = previousRevision >= Number.MAX_SAFE_INTEGER - 1 ? 0 : previousRevision + 1;
    validateState(draft);
    const serialized = JSON.stringify(draft);
    if (!this.adapter.write(serialized)) {
      this.state = before;
      this.lastGoodSerialized = beforeSerialized;
      this.recovery = {
        active:true,
        storageUnavailable:true,
        persistenceFailure:true,
        reason:'iPad storage could not verify this Save. The last good state was preserved and normal Save actions are locked until storage is safely retried.',
        raw:beforeSerialized,
        lastGoodSerialized:beforeSerialized
      };
      // A persistence failure changes the app's safety mode even though the
      // canonical data rolls back. Notify render subscribers immediately so
      // the stale editor/screen cannot remain visible while recovery is active.
      this.notifyListeners();
      throw new Error('Persistence verification failed; changes rolled back and Protected Recovery is active');
    }
    this.state = draft;
    this.lastGoodSerialized = serialized;
    this.recovery = null;
    this.notifyListeners();
    return this.snapshot();
  }

  replaceValidated(nextState) {
    const migrated = migrateState(nextState, { now:this.now() });
    validateState(migrated);
    const before = this.snapshot();
    const beforeSerialized = this.lastGoodSerialized || JSON.stringify(before);
    const recoveryBefore = this.recovery;
    const serialized = JSON.stringify(migrated);
    if (!this.adapter.write(serialized)) {
      this.state = before;
      this.lastGoodSerialized = beforeSerialized;
      this.recovery = recoveryBefore?.active ? {
        ...recoveryBefore,
        storageUnavailable:true,
        persistenceFailure:true,
        reason:'Restore backup was valid, but iPad storage could not verify the write. The validated backup is retained for Retry iPad Storage; original recovery data remains protected.',
        pendingRestoreSerialized:serialized
      } : {
        active:true,
        storageUnavailable:true,
        persistenceFailure:true,
        reason:'Restore could not be verified in iPad storage. Existing travel data was preserved.',
        raw:beforeSerialized,
        lastGoodSerialized:beforeSerialized
      };
      this.notifyListeners();
      throw new Error('Restore write failed; existing state preserved');
    }
    this.state = migrated;
    this.lastGoodSerialized = serialized;
    this.recovery = null;
    this.notifyListeners();
    return this.snapshot();
  }


  async attachmentDataUrl(attachment) {
    if (typeof attachment?.dataUrl === 'string' && attachment.dataUrl) return attachment.dataUrl;
    if (!this.vaultAssetStore || typeof attachment?.assetKey !== 'string' || !attachment.assetKey) return null;
    const payload = await this.vaultAssetStore.get(attachment.assetKey);
    if (typeof payload !== 'string' || !payload) return null;
    const bytes = validateVaultScreenshotPayload(attachment.mimeType, payload);
    if (attachment.byteLength != null && attachment.byteLength !== bytes) throw new Error('Stored Vault screenshot byte length does not match its metadata');
    return payload;
  }

  async snapshotWithVaultAssets() {
    const next = this.snapshot();
    for (const attachment of next.attachments || []) {
      if (typeof attachment.dataUrl === 'string' && attachment.dataUrl) {
        validateVaultScreenshotPayload(attachment.mimeType, attachment.dataUrl);
        continue;
      }
      const payload = await this.attachmentDataUrl(attachment);
      if (!payload) throw new Error(`Vault screenshot ${attachment.name || attachment.id} is missing from offline storage`);
      attachment.dataUrl = payload;
      delete attachment.assetKey;
    }
    validateState(next);
    return next;
  }

  async migrateEmbeddedVaultAssets() {
    if (!this.vaultAssetStore || this.isRecoveryMode()) return { migrated:0 };
    // Probe the browser's large offline store even on an empty first run so
    // Settings/App Health can report capability failure before the first
    // screenshot is selected rather than only after a Save attempt.
    if (typeof this.vaultAssetStore.open === 'function') await this.vaultAssetStore.open();
    const embedded = (this.state.attachments || []).filter(item => typeof item.dataUrl === 'string' && item.dataUrl);
    if (!embedded.length) {
      await this.cleanupOrphanVaultAssets();
      await this.auditVaultAssets();
      return { migrated:0 };
    }
    const next = this.snapshot();
    const stagedKeys = [];
    try {
      for (const attachment of next.attachments) {
        if (typeof attachment.dataUrl !== 'string' || !attachment.dataUrl) continue;
        const bytes = validateVaultScreenshotPayload(attachment.mimeType, attachment.dataUrl);
        const assetKey = createVaultAssetKey(attachment.id);
        await this.vaultAssetStore.put(assetKey, attachment.dataUrl);
        stagedKeys.push(assetKey);
        attachment.assetKey = assetKey;
        attachment.byteLength = bytes;
        delete attachment.dataUrl;
      }
      this.replaceValidated(next);
    } catch (error) {
      try { await this.vaultAssetStore.deleteMany(stagedKeys); } catch {}
      throw error;
    }
    await this.cleanupOrphanVaultAssets();
    await this.auditVaultAssets();
    return { migrated:embedded.length };
  }

  async replaceValidatedWithVaultAssets(nextState) {
    if (!this.vaultAssetStore) return this.replaceValidated(nextState);
    const next = structuredClone(nextState);
    const previousKeys = (this.state.attachments || []).map(item => item.assetKey).filter(Boolean);
    const stagedKeys = [];
    try {
      for (const attachment of next.attachments || []) {
        if (typeof attachment.dataUrl === 'string' && attachment.dataUrl) {
          const bytes = validateVaultScreenshotPayload(attachment.mimeType, attachment.dataUrl);
          const assetKey = createVaultAssetKey(attachment.id);
          await this.vaultAssetStore.put(assetKey, attachment.dataUrl);
          stagedKeys.push(assetKey);
          attachment.assetKey = assetKey;
          attachment.byteLength = bytes;
          delete attachment.dataUrl;
        } else if (typeof attachment.assetKey === 'string' && attachment.assetKey) {
          const payload = await this.vaultAssetStore.get(attachment.assetKey);
          if (typeof payload !== 'string' || !payload) throw new Error(`Vault screenshot ${attachment.name || attachment.id} is missing from offline storage`);
        }
      }
      const result = this.replaceValidated(next);
      const activeKeys = new Set((this.state.attachments || []).map(item => item.assetKey).filter(Boolean));
      const staleKeys = previousKeys.filter(key => !activeKeys.has(key));
      try { await this.vaultAssetStore.deleteMany(staleKeys); } catch {}
      await this.cleanupOrphanVaultAssets();
      await this.auditVaultAssets();
      return result;
    } catch (error) {
      // When Restore is already operating inside Protected Recovery and the
      // localStorage write fails, replaceValidated() intentionally retains a
      // pendingRestoreSerialized candidate for Retry iPad Storage. That
      // candidate references the staged asset keys, so keep those bytes until
      // retry succeeds or a later orphan sweep proves they are unused.
      if (!this.recovery?.pendingRestoreSerialized) {
        try { await this.vaultAssetStore.deleteMany(stagedKeys); } catch {}
      }
      throw error;
    }
  }

  async auditVaultAssets() {
    const issues = [];
    const external = (this.state.attachments || []).filter(item => typeof item.assetKey === 'string' && item.assetKey);
    if (this.vaultAssetStore && typeof this.vaultAssetStore.open === 'function') {
      try { await this.vaultAssetStore.open(); }
      catch {
        issues.push('Large offline Vault screenshot storage is unavailable on this device.');
        this.vaultAssetIssues = issues;
        return [...issues];
      }
    }
    if (external.length && !this.vaultAssetStore) {
      issues.push('Offline Vault screenshot storage is unavailable.');
      this.vaultAssetIssues = issues;
      return [...issues];
    }
    for (const attachment of external) {
      try {
        const payload = await this.vaultAssetStore.get(attachment.assetKey);
        if (typeof payload !== 'string' || !payload) {
          issues.push(`${attachment.name || 'Vault screenshot'} is missing from offline storage.`);
          continue;
        }
        const bytes = validateVaultScreenshotPayload(attachment.mimeType, payload);
        if (attachment.byteLength != null && bytes !== attachment.byteLength) issues.push(`${attachment.name || 'Vault screenshot'} does not match its stored size metadata.`);
      } catch {
        issues.push(`${attachment.name || 'Vault screenshot'} could not be verified in offline storage.`);
      }
      if (issues.length >= 8) break;
    }
    this.vaultAssetIssues = issues;
    return [...issues];
  }

  async cleanupOrphanVaultAssets() {
    if (!this.vaultAssetStore) return 0;
    try {
      const active = new Set((this.state.attachments || []).map(item => item.assetKey).filter(Boolean));
      const keys = await this.vaultAssetStore.keys();
      const orphaned = keys.filter(key => typeof key === 'string' && !active.has(key));
      if (orphaned.length) await this.vaultAssetStore.deleteMany(orphaned);
      return orphaned.length;
    } catch {
      // Orphan cleanup is housekeeping only. Never make valid travel data or a
      // successful Save fail because unused screenshot bytes could not be swept.
      return 0;
    }
  }

  retryStorage() {
    if (!this.isRecoveryMode() || !this.recovery?.storageUnavailable) return false;
    this.adapter.retryAccess?.();

    // A valid backup selected while already in Protected Recovery is the only
    // validated replacement candidate available after a failed restore write.
    // Otherwise the known last-good state remains authoritative.
    const known = this.recovery.pendingRestoreSerialized || this.recovery.lastGoodSerialized || this.lastGoodSerialized;
    if (known) {
      if (!this.adapter.write(known)) return false;
      const readBack = this.adapter.read();
      if (this.adapter.lastReadError || readBack !== known) return false;
      try {
        const parsed = migrateState(JSON.parse(known), { now:this.now() });
        validateState(parsed);
        this.state = parsed;
        this.lastGoodSerialized = JSON.stringify(parsed);
        // Verify the canonical form too; migration may have repaired metadata.
        if (!this.adapter.write(this.lastGoodSerialized) || this.adapter.read() !== this.lastGoodSerialized) return false;
      } catch { return false; }
      this.recovery = null;
      this.hadStoredState = true;
      this.notifyListeners();
      return true;
    }

    // Startup read denial: re-read before assuming storage is empty, validate it,
    // then verify that reads and writes both work before leaving recovery.
    const raw = this.adapter.read();
    if (this.adapter.lastReadError) return false;
    try {
      const next = raw != null ? migrateState(JSON.parse(raw), { now:this.now() }) : createEmptyState(this.now());
      validateState(next);
      const serialized = JSON.stringify(next);
      if (!this.adapter.write(serialized)) return false;
      if (this.adapter.read() !== serialized || this.adapter.lastReadError) return false;
      this.state = next;
      this.lastGoodSerialized = serialized;
      this.recovery = null;
      this.hadStoredState = raw != null;
      this.notifyListeners();
      return true;
    } catch { return false; }
  }
}
