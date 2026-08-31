import { createEmptyState } from './src_core_schema.js';
import { validateState } from './src_core_validation.js';
import { migrateState } from './src_core_migrations.js';

export class StateService {
  constructor(adapter, { now = () => new Date().toISOString() } = {}) {
    this.adapter = adapter;
    this.now = now;
    this.state = createEmptyState(this.now());
    this.listeners = new Set();
  }

  hydrate() {
    const raw = this.adapter.read();
    if (!raw) return this.state;
    const parsed = migrateState(JSON.parse(raw));
    validateState(parsed);
    this.state = parsed;
    return this.state;
  }

  snapshot() { return structuredClone(this.state); }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  commit(mutator) {
    const before = this.snapshot();
    const draft = this.snapshot();
    mutator(draft);
    draft.meta.modifiedAt = this.now();
    draft.meta.revision = Number(draft.meta.revision || 0) + 1;
    validateState(draft);
    const serialized = JSON.stringify(draft);
    if (!this.adapter.write(serialized)) {
      this.state = before;
      throw new Error('Persistence verification failed; changes rolled back');
    }
    this.state = draft;
    this.listeners.forEach(listener => listener(this.snapshot()));
    return this.snapshot();
  }

  replaceValidated(nextState) {
    const migrated = migrateState(nextState);
    validateState(migrated);
    const before = this.snapshot();
    const serialized = JSON.stringify(migrated);
    if (!this.adapter.write(serialized)) {
      this.state = before;
      throw new Error('Restore write failed; existing state preserved');
    }
    this.state = migrated;
    this.listeners.forEach(listener => listener(this.snapshot()));
    return this.snapshot();
  }
}
