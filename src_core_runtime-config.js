import { toISODate } from './src_core_dates.js';

const DEFAULTS = Object.freeze({
  mode:'production',
  storageKey:'tcc:v1:state',
  currentDate:null,
  fixtureUrl:null,
  seedIfEmpty:false,
  serviceWorkerUrl:'./sw.js?v=55-athens-acceptance-r13'
});

export function readRuntimeConfig(source = globalThis.__TCC_RUNTIME_CONFIG__ ?? null) {
  const raw = source && typeof source === 'object' ? source : {};
  const mode = raw.mode === 'simulation' ? 'simulation' : 'production';
  const storageKey = String(raw.storageKey || DEFAULTS.storageKey).trim();
  if (!storageKey) throw new Error('Runtime storage key is required');
  const currentDate = raw.currentDate ? toISODate(raw.currentDate) : null;
  const fixtureUrl = raw.fixtureUrl == null ? null : String(raw.fixtureUrl).trim() || null;
  const serviceWorkerUrl = raw.serviceWorkerUrl === null ? null : String(raw.serviceWorkerUrl || DEFAULTS.serviceWorkerUrl).trim();
  return {
    mode,
    storageKey,
    currentDate,
    fixtureUrl,
    seedIfEmpty:mode === 'simulation' && Boolean(raw.seedIfEmpty),
    serviceWorkerUrl,
    testingFlags:raw.testingFlags && typeof raw.testingFlags === 'object' ? structuredClone(raw.testingFlags) : {}
  };
}


export function resolveInstalledFixtureRevision(state, externalRevision = null) {
  const embedded = typeof state?.meta?.simulationFixtureRevision === 'string'
    ? state.meta.simulationFixtureRevision.trim()
    : '';
  if (embedded) return embedded;
  const external = typeof externalRevision === 'string' ? externalRevision.trim() : '';
  return external || null;
}

export function shouldInstallRuntimeFixture({ hadStoredState = false, state = null, externalRevision = null, fixtureRevision = null } = {}) {
  const target = typeof fixtureRevision === 'string' ? fixtureRevision.trim() : '';
  if (!target) throw new Error('Simulation fixture revision is required');
  if (!hadStoredState) return true;
  const installed = resolveInstalledFixtureRevision(state, externalRevision);
  // A missing marker on an already-populated simulation is ambiguous: the
  // marker write may have failed even though the user's travel state saved.
  // Never overwrite existing screenshot-test changes merely because the
  // sidecar marker is absent. Newly seeded fixtures carry the revision inside
  // their persisted metadata, so future fixture revisions remain detectable
  // atomically even if the sidecar localStorage marker is unavailable.
  if (!installed) return false;
  return installed !== target;
}

export function stampRuntimeFixtureRevision(state, fixtureRevision) {
  const target = typeof fixtureRevision === 'string' ? fixtureRevision.trim() : '';
  if (!target) throw new Error('Simulation fixture revision is required');
  const next = structuredClone(state);
  if (!next?.meta || typeof next.meta !== 'object' || Array.isArray(next.meta)) throw new Error('Simulation fixture metadata is missing');
  next.meta.simulationFixtureRevision = target;
  return next;
}


export function runtimeNowISO(config, nowDate = new Date()) {
  const date = nowDate instanceof Date ? nowDate : new Date(nowDate);
  if (Number.isNaN(date.valueOf())) throw new Error('Runtime clock is invalid');
  const iso = date.toISOString();
  return config?.currentDate ? `${toISODate(config.currentDate)}T${iso.slice(11)}` : iso;
}

export async function fetchRuntimeFixture(config, fetchFn = globalThis.fetch) {
  if (config?.mode !== 'simulation' || !config?.fixtureUrl) return null;
  if (typeof fetchFn !== 'function') throw new Error('Simulation fixture loader is unavailable');
  const response = await fetchFn(config.fixtureUrl, { cache:'no-store' });
  if (!response?.ok) throw new Error(`Simulation fixture failed to load (${response?.status ?? 'unknown'})`);
  return response.json();
}
