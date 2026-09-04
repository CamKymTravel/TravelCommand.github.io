import { createEmptyState } from './src_core_schema.js';
import { validateState } from './src_core_validation.js';
import { migrateState } from './src_core_migrations.js';
import { createVaultAssetKey, validateVaultScreenshotPayload } from './src_core_vault-mutations.js';

function canonicalClock(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) throw new Error('App clock is invalid');
  return date.toISOString();
}


function appHealthFingerprint(state) {
  const stable = structuredClone(state || {});
  delete stable.meta;
  delete stable.ui;
  // Vault screenshot bytes can move between the JSON fixture/backup wrapper and
  // IndexedDB without changing the user's saved travel information. Keep App
  // Health keyed to the attachment record itself, not its internal storage
  // representation, so that one-time asset migration cannot create a false
  // dirty/red state. Add/delete/edit still changes attachment identity/metadata.
  if (Array.isArray(stable.attachments)) {
    stable.attachments = stable.attachments.map(attachment => {
      const next = { ...attachment };
      delete next.dataUrl;
      delete next.assetKey;
      delete next.byteLength;
      return next;
    });
  }
  const text = JSON.stringify(stable);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    hash ^= code & 0xff;
    hash = Math.imul(hash, 0x01000193) >>> 0;
    hash ^= code >>> 8;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
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
    this.appHealthMarkerKey = `${adapter?.key || 'memory'}:app-health-fingerprint`;
    this.appHealthCheckedFingerprint = this.readAppHealthFingerprint();
    this.vaultAssetIssues = [];
    // Vault audits are async and can overlap a Restore or screenshot Save.
    // Only the newest audit for the same canonical attachment set may publish
    // health issues; a late audit of an older state must not overwrite the
    // newer App Health result.
    this.vaultAssetAuditGeneration = 0;
    // Backup export can spend noticeable time rehydrating screenshot bytes.
    // Keep physical Vault files alive while any export snapshot is reading
    // them so navigation/deletion cannot invalidate a backup mid-build.
    this.vaultAssetReaders = 0;
    this.vaultAssetReaderWaiters = [];
    // Keys written to IndexedDB are provisional until their matching canonical
    // attachment metadata is committed. Orphan sweeps must protect these
    // in-flight keys or an overlapping App Health/cleanup pass can delete a
    // legitimate screenshot between its byte write and JSON Save.
    this.vaultAssetStagingKeys = new Set();
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

  readAppHealthFingerprint() {
    try {
      if (this.adapter?.storage?.getItem) return this.adapter.storage.getItem(this.appHealthMarkerKey);
      return this.adapter?._appHealthCheckedFingerprint || null;
    } catch { return null; }
  }

  persistAppHealthFingerprint(value) {
    const fingerprint = String(value || '');
    try {
      if (this.adapter?.storage?.setItem) this.adapter.storage.setItem(this.appHealthMarkerKey, fingerprint);
      else if (this.adapter) this.adapter._appHealthCheckedFingerprint = fingerprint;
      this.appHealthCheckedFingerprint = fingerprint;
      return true;
    } catch { return false; }
  }

  isAppHealthDirty() {
    return appHealthFingerprint(this.state) !== String(this.appHealthCheckedFingerprint || '');
  }

  markAppHealthChecked() {
    const fingerprint = appHealthFingerprint(this.state);
    this.persistAppHealthFingerprint(fingerprint);
    return fingerprint;
  }

  invalidateAppHealthCheck() {
    try {
      if (this.adapter?.storage?.removeItem) this.adapter.storage.removeItem(this.appHealthMarkerKey);
      else if (this.adapter) this.adapter._appHealthCheckedFingerprint = null;
    } catch {}
    this.appHealthCheckedFingerprint = null;
  }
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

  replaceValidated(nextState, { invalidateHealth = true } = {}) {
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
    // Restore/replacement is a trust boundary: even an identical backup must
    // require CHECK THE WHOLE APP again. Internal representation migrations can
    // opt out explicitly because they do not change user travel data.
    if (invalidateHealth) this.invalidateAppHealthCheck();
    this.notifyListeners();
    return this.snapshot();
  }


  async stageVaultAsset(assetKey, payload) {
    if (!this.vaultAssetStore) throw new Error('Large offline screenshot storage is unavailable on this device');
    this.vaultAssetStagingKeys.add(assetKey);
    try {
      await this.vaultAssetStore.put(assetKey, payload);
      return true;
    } catch (error) {
      // IndexedDB can commit a transaction and then fail its immediate
      // verification read. Stop treating the failed write as legitimate
      // staging before cleanup so a failed physical delete is visible to the
      // Vault audit as an orphan rather than being masked as protected.
      this.vaultAssetStagingKeys.delete(assetKey);
      await this.removeVaultAssets([assetKey]);
      throw error;
    }
  }

  releaseStagedVaultAssets(assetKeys = []) {
    for (const key of assetKeys || []) this.vaultAssetStagingKeys.delete(key);
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

  beginVaultAssetRead() { this.vaultAssetReaders += 1; }

  endVaultAssetRead() {
    this.vaultAssetReaders = Math.max(0, this.vaultAssetReaders - 1);
    if (this.vaultAssetReaders !== 0) return;
    const waiters = this.vaultAssetReaderWaiters.splice(0);
    for (const resolve of waiters) resolve();
  }

  async waitForVaultAssetReaders() {
    if (this.vaultAssetReaders === 0) return;
    await new Promise(resolve => this.vaultAssetReaderWaiters.push(resolve));
  }

  async snapshotWithVaultAssets() {
    const next = this.snapshot();
    this.beginVaultAssetRead();
    try {
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
    } finally {
      this.endVaultAssetRead();
    }
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
        await this.stageVaultAsset(assetKey, attachment.dataUrl);
        stagedKeys.push(assetKey);
        attachment.assetKey = assetKey;
        attachment.byteLength = bytes;
        delete attachment.dataUrl;
      }
      this.replaceValidated(next, { invalidateHealth:false });
      this.releaseStagedVaultAssets(stagedKeys);
    } catch (error) {
      await this.removeVaultAssets(stagedKeys);
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
    let replaceAttempted = false;
    let replaceSucceeded = false;
    try {
      for (const attachment of next.attachments || []) {
        if (typeof attachment.dataUrl === 'string' && attachment.dataUrl) {
          const bytes = validateVaultScreenshotPayload(attachment.mimeType, attachment.dataUrl);
          const assetKey = createVaultAssetKey(attachment.id);
          await this.stageVaultAsset(assetKey, attachment.dataUrl);
          stagedKeys.push(assetKey);
          attachment.assetKey = assetKey;
          attachment.byteLength = bytes;
          delete attachment.dataUrl;
        } else if (typeof attachment.assetKey === 'string' && attachment.assetKey) {
          const payload = await this.vaultAssetStore.get(attachment.assetKey);
          if (typeof payload !== 'string' || !payload) throw new Error(`Vault screenshot ${attachment.name || attachment.id} is missing from offline storage`);
        }
      }
      replaceAttempted = true;
      const result = this.replaceValidated(next);
      replaceSucceeded = true;
      this.releaseStagedVaultAssets(stagedKeys);
      const activeKeys = new Set((this.state.attachments || []).map(item => item.assetKey).filter(Boolean));
      const staleKeys = previousKeys.filter(key => !activeKeys.has(key));
      await this.waitForVaultAssetReaders();
      try { await this.vaultAssetStore.deleteMany(staleKeys); } catch {}
      await this.cleanupOrphanVaultAssets();
      await this.auditVaultAssets();
      return result;
    } catch (error) {
      // When this Restore attempt reaches replaceValidated() inside Protected
      // Recovery and the localStorage write fails, that call retains a
      // pendingRestoreSerialized candidate for Retry iPad Storage. Keep this
      // attempt's staged bytes only in that case. A pending candidate left by
      // an earlier restore must never cause a later staging failure to leak new
      // bytes, and a post-replace housekeeping error must never delete assets
      // that are already canonical.
      const pendingForThisAttempt = replaceAttempted && !replaceSucceeded && Boolean(this.recovery?.pendingRestoreSerialized);
      if (pendingForThisAttempt) this.releaseStagedVaultAssets(stagedKeys);
      else if (!replaceSucceeded) await this.removeVaultAssets(stagedKeys);
      throw error;
    }
  }

  vaultAttachmentAuditSignature() {
    return JSON.stringify((this.state.attachments || []).map(item => [item.id, item.vaultRecordId, item.assetKey || '', item.byteLength ?? null]));
  }

  setVaultAssetIssues(nextIssues = [], { generation = null, attachmentSignature = null } = {}) {
    if (generation != null && generation !== this.vaultAssetAuditGeneration) return [...this.vaultAssetIssues];
    if (attachmentSignature != null && attachmentSignature !== this.vaultAttachmentAuditSignature()) return [...this.vaultAssetIssues];
    const next = [...nextIssues];
    const changed = next.length !== this.vaultAssetIssues.length || next.some((value, index) => value !== this.vaultAssetIssues[index]);
    this.vaultAssetIssues = next;
    if (changed) this.notifyListeners();
    return [...next];
  }

  protectedVaultAssetKeys() {
    const keys = new Set((this.state.attachments || []).map(item => item.assetKey).filter(Boolean));
    for (const key of this.vaultAssetStagingKeys) keys.add(key);
    const pending = this.recovery?.pendingRestoreSerialized;
    if (typeof pending === 'string' && pending) {
      try {
        const parsed = JSON.parse(pending);
        for (const attachment of parsed?.attachments || []) {
          if (typeof attachment?.assetKey === 'string' && attachment.assetKey) keys.add(attachment.assetKey);
        }
      } catch {
        // pendingRestoreSerialized is created only from a validated canonical
        // state. If it is unexpectedly unreadable, do not weaken current-state
        // protection; Retry iPad Storage will remain safely blocked by parsing.
      }
    }
    return keys;
  }

  async auditVaultAssets() {
    const generation = ++this.vaultAssetAuditGeneration;
    const attachmentSignature = this.vaultAttachmentAuditSignature();
    const publish = issues => this.setVaultAssetIssues(issues, { generation, attachmentSignature });
    const issues = [];
    const external = (this.state.attachments || []).filter(item => typeof item.assetKey === 'string' && item.assetKey);
    if (this.vaultAssetStore && typeof this.vaultAssetStore.open === 'function') {
      try { await this.vaultAssetStore.open(); }
      catch {
        issues.push('Large offline Vault screenshot storage is unavailable on this device.');
        return publish(issues);
      }
    }
    if (external.length && !this.vaultAssetStore) {
      issues.push('Offline Vault screenshot storage is unavailable.');
      return publish(issues);
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
    if (this.vaultAssetStore && issues.length < 8) {
      try {
        const keys = await this.vaultAssetStore.keys();
        const active = this.protectedVaultAssetKeys();
        const orphaned = keys.filter(key => typeof key === 'string' && !active.has(key));
        if (orphaned.length) issues.push(`${orphaned.length} unused Vault screenshot file${orphaned.length === 1 ? '' : 's'} remain in offline storage and need cleanup.`);
      } catch {
        issues.push('Offline Vault screenshot storage could not be enumerated.');
      }
    }
    return publish(issues.slice(0, 8));
  }

  async cleanupOrphanVaultAssets() {
    if (!this.vaultAssetStore) return 0;
    try {
      const keys = await this.vaultAssetStore.keys();
      const active = this.protectedVaultAssetKeys();
      const orphaned = keys.filter(key => typeof key === 'string' && !active.has(key));
      if (orphaned.length) {
        await this.waitForVaultAssetReaders();
        await this.vaultAssetStore.deleteMany(orphaned);
      }
      return orphaned.length;
    } catch {
      // Orphan cleanup is housekeeping only. Never make valid travel data or a
      // successful Save fail because unused screenshot bytes could not be swept.
      return 0;
    }
  }

  async removeVaultAssets(assetKeys = []) {
    const keys = [...new Set((assetKeys || []).filter(key => typeof key === 'string' && key))];
    this.releaseStagedVaultAssets(keys);
    if (!keys.length || !this.vaultAssetStore) return true;
    try {
      await this.waitForVaultAssetReaders();
      await this.vaultAssetStore.deleteMany(keys);
      await this.cleanupOrphanVaultAssets();
      await this.auditVaultAssets();
      return true;
    } catch {
      await this.auditVaultAssets();
      return false;
    }
  }

  async retryStorage() {
    if (!this.isRecoveryMode() || !this.recovery?.storageUnavailable) return false;
    this.adapter.retryAccess?.();

    // A valid backup selected while already in Protected Recovery is the only
    // validated replacement candidate available after a failed restore write.
    // Otherwise the known last-good state remains authoritative. A pending
    // screenshot-bearing Restore is atomic: its staged IndexedDB bytes must be
    // re-verified immediately before Retry can make that candidate canonical.
    // Storage pressure/eviction between the failed write and the later Retry
    // must not produce a 'successful' Restore whose Vault attachments are
    // already missing.
    const pendingRestore = this.recovery.pendingRestoreSerialized || null;
    if (pendingRestore) {
      try {
        const pendingState = JSON.parse(pendingRestore);
        for (const attachment of pendingState.attachments || []) {
          if (typeof attachment?.assetKey !== 'string' || !attachment.assetKey) continue;
          const payload = await this.attachmentDataUrl(attachment);
          if (!payload) throw new Error(`${attachment.name || 'Vault screenshot'} is missing from offline storage`);
        }
        delete this.recovery.retryError;
      } catch (error) {
        this.recovery.retryError = `Retry is blocked because the validated backup's Vault screenshots could not be re-verified. Re-select the backup file to stage its screenshots again. ${error?.message || ''}`.trim();
        return false;
      }
    }
    const known = pendingRestore || this.recovery.lastGoodSerialized || this.lastGoodSerialized;
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
      // Completing a backup Restore through Retry iPad Storage is still a
      // Restore trust boundary. Even when the restored state is byte-for-byte
      // identical to the previously verified state, require CHECK THE WHOLE
      // APP again. Plain storage-recovery retries without a pending Restore do
      // not invalidate App Health.
      if (pendingRestore) this.invalidateAppHealthCheck();
      this.recovery = null;
      this.hadStoredState = true;
      this.notifyListeners();
      void this.cleanupOrphanVaultAssets().then(() => this.auditVaultAssets()).catch(() => this.auditVaultAssets());
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
      void this.cleanupOrphanVaultAssets().then(() => this.auditVaultAssets()).catch(() => this.auditVaultAssets());
      return true;
    } catch { return false; }
  }
}
