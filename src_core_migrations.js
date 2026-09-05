import { APP_VERSION, SCHEMA_VERSION, createEmptyState } from './src_core_schema.js';
import { isDestinationBudgetUsable, staysCoveringDate } from './src_core_budget.js';
import { legacyAUDateToISO, toISODate, validateDateTime } from './src_core_dates.js';
import { validateState } from './src_core_validation.js';

const VALID_SCREENS = new Set(['home','budget','reservations','itinerary','calendar','journey-history','checklist','vault','settings']);
const POINTER_COLLECTIONS = new Set(['itinerary','expenses','reservations','calendarEvents','journeyHistory','checklists','vault']);
const POINTER_SCREENS = Object.freeze({
  itinerary:new Set(['itinerary','budget','checklist']),
  expenses:new Set(['budget']),
  reservations:new Set(['reservations']),
  calendarEvents:new Set(['calendar']),
  journeyHistory:new Set(['journey-history']),
  checklists:new Set(['checklist']),
  vault:new Set(['vault'])
});
const POINTER_DEFAULT_SCREEN = Object.freeze({ itinerary:'itinerary', expenses:'budget', reservations:'reservations', calendarEvents:'calendar', journeyHistory:'journey-history', checklists:'checklist', vault:'vault' });
const COLLECTIONS = ['itinerary','routePoints','expenses','reservations','calendarEvents','journeyHistory','checklists','vault','attachments','accounts','alerts','streaming','protectedEmails'];
const LEGACY_CORE_COLLECTIONS = Object.freeze(['itinerary','expenses','reservations','calendarEvents','checklists','vault']);
const CHECKLIST_STAGES = new Set(['current-stay','before-leave','travel-day','arrival']);
const RESERVATION_TYPES = new Set(['flight','train','cruise','rv','accommodation','ticket']);
const RESERVATION_STATUSES = new Set(['paid','unpaid','booked','to-book']);
const FLIGHT_SCOPES = new Set(['domestic','international']);
const VAULT_OWNERS = new Map([['cameron','Cameron'],['kym','Kym'],['both','Both']]);
const V2_META_FIELDS = Object.freeze(['createdAt','modifiedAt','revision','appVersion']);
const V2_SETTINGS_FIELDS = Object.freeze(['journeyStartDate','dateFormat','defaultTravellers','defaultCurrency','annualBudgetAUD','pinEnabled','schengen']);
const V2_SCHENGEN_FIELDS = Object.freeze(['status','daysUsed','daysRemaining','entryDate','plannedExitDate','mustLeaveByDate','lastCheckedDate','note']);
const STRICT_SETTINGS_FIELDS = Object.freeze([...V2_SETTINGS_FIELDS,'pinHash','pinRecoveryNotice']);
// Schema V2 entered the supported continuity line by V35. A parseable but
// implausibly older V-number on a V2 object is corruption, not a legitimate
// migration identity; accepting it would let damaged V41/V42 data bypass the
// strict current-generation completeness checks.
const MIN_SUPPORTED_V2_GENERATION = 35;
const STRICT_PERSISTED_GENERATION_MIN = 41;

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function appGeneration(value) {
  // Persisted runtime identities use a numeric app version followed by the
  // continuity generation (for example 1.2.0-v36-recovery or
  // 1.2.0-v42-active-continuity). Do not salvage a generation number from an
  // arbitrary/corrupted string merely because it happens to contain "v40".
  const text = typeof value === 'string' ? value.trim() : '';
  const match = text.match(/^\d+(?:\.\d+){1,3}-v(\d+)(?:-[a-z0-9][a-z0-9._-]*)?$/i);
  return match ? Number(match[1]) : null;
}

function isCurrentAppGeneration(value) {
  const source = appGeneration(value);
  const current = appGeneration(APP_VERSION);
  return Number.isInteger(source) && Number.isInteger(current) && source === current;
}

function isStrictPersistedGeneration(value) {
  const source = appGeneration(value);
  const current = appGeneration(APP_VERSION);
  return Number.isInteger(source) && Number.isInteger(current) && source >= STRICT_PERSISTED_GENERATION_MIN && source <= current;
}


function assertNotNewerAppGeneration(input) {
  const raw = input?.meta?.appVersion;
  const source = appGeneration(raw);
  const current = appGeneration(APP_VERSION);
  if (typeof raw !== 'string' || !raw.trim() || !Number.isInteger(source)) {
    throw new Error('Stored data app version is missing or not compatible with this app');
  }
  if (source < MIN_SUPPORTED_V2_GENERATION) {
    throw new Error(`Stored schema V2 data claims unsupported app generation V${source}; Protected Recovery is required`);
  }
  if (Number.isInteger(current) && source > current) {
    throw new Error(`Stored data was created by a newer app generation (V${source}); this app supports up to V${current}`);
  }
}

function requireObjectShape(value, label, { allowMissing = true } = {}) {
  if (value == null && allowMissing) return;
  if (!isPlainObject(value)) throw new Error(`${label} must be an object`);
}

function assertOwnFields(object, fields, label) {
  const missing = fields.filter(key => !Object.prototype.hasOwnProperty.call(object, key));
  if (missing.length) throw new Error(`${label} is incomplete: missing ${missing.join(', ')}`);
}

function assertRecognisableLegacyShape(input, rawVersion) {
  if (!isPlainObject(input)) throw new Error('Stored data must be an object');
  if ((rawVersion == null || rawVersion === '') && !isPlainObject(input.meta) && !isPlainObject(input.settings)) {
    throw new Error('Stored data is not recognisable as Travel Command Centre data; Protected Recovery is required');
  }
  const coreCount = LEGACY_CORE_COLLECTIONS.filter(key => Array.isArray(input[key])).length;
  if (coreCount < 4) throw new Error('Stored data is incomplete: too much core travel data is missing; Protected Recovery is required');
}

function assertCompatibleV2Shape(input) {
  requireObjectShape(input.meta, 'Metadata', { allowMissing:false });
  requireObjectShape(input.settings, 'Settings', { allowMissing:false });
  requireObjectShape(input.ui, 'UI state', { allowMissing:false });
  const missingCollections = COLLECTIONS.filter(key => !Array.isArray(input[key]));
  if (missingCollections.length) throw new Error(`Current-schema state is incomplete: missing ${missingCollections.join(', ')}`);
  assertOwnFields(input.meta, V2_META_FIELDS, 'Metadata');
  assertOwnFields(input.settings, V2_SETTINGS_FIELDS, 'Settings');
  requireObjectShape(input.settings.schengen, 'Schengen settings', { allowMissing:false });
  assertOwnFields(input.settings.schengen, V2_SCHENGEN_FIELDS, 'Schengen settings');
  // Persisted UI/navigation is non-authoritative and fully reconstructable.
  // Require the UI object itself so the state remains recognisable, but allow
  // missing navigation fields to be defaulted by normalizeNavigation rather
  // than holding otherwise-valid travel data in Protected Recovery.
}

function looksLikeCurrentRuntimeStateWithoutSchema(input) {
  if (!isPlainObject(input)) return false;
  if (isCurrentAppGeneration(input?.meta?.appVersion)) return true;
  // Later V39/V40 runtime state carries these UI fields in addition to the older
  // V36/V38-compatible V2 minimum. If the schema marker disappears while the
  // rest of that newer shape remains, treat it as damaged current data rather
  // than letting it masquerade as a genuinely old versionless state.
  const laterUiMarkers = ['reservationCompletedOpen','itineraryCompletedOpen','journeyHistoryPage'];
  const markerCount = isPlainObject(input.ui)
    ? laterUiMarkers.filter(key => Object.prototype.hasOwnProperty.call(input.ui, key)).length
    : 0;
  const collectionCount = COLLECTIONS.filter(key => Array.isArray(input[key])).length;
  return markerCount > 0 && collectionCount >= COLLECTIONS.length - 3;
}

function supportedPinHash(value) {
  if (typeof value !== 'string') return false;
  const text = value.trim().toLowerCase();
  return /^\d{4,8}$/.test(text) || /^sha256:[a-f0-9]{64}$/.test(text) || /^[a-f0-9]{64}$/.test(text);
}

function sha256HexSync(value) {
  const bytes = new TextEncoder().encode(String(value));
  const bitLength = bytes.length * 8;
  const paddedLength = Math.ceil((bytes.length + 1 + 8) / 64) * 64;
  const data = new Uint8Array(paddedLength);
  data.set(bytes);
  data[bytes.length] = 0x80;
  const view = new DataView(data.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);
  const constants = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ];
  const rotateRight = (word, count) => (word >>> count) | (word << (32 - count));
  let h0=0x6a09e667,h1=0xbb67ae85,h2=0x3c6ef372,h3=0xa54ff53a,h4=0x510e527f,h5=0x9b05688c,h6=0x1f83d9ab,h7=0x5be0cd19;
  const words = new Uint32Array(64);
  for (let offset = 0; offset < data.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) words[index] = view.getUint32(offset + index * 4, false);
    for (let index = 16; index < 64; index += 1) {
      const a = words[index - 15], b = words[index - 2];
      const s0 = rotateRight(a, 7) ^ rotateRight(a, 18) ^ (a >>> 3);
      const s1 = rotateRight(b, 17) ^ rotateRight(b, 19) ^ (b >>> 10);
      words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
    }
    let a=h0,b=h1,c=h2,d=h3,e=h4,f=h5,g=h6,h=h7;
    for (let index = 0; index < 64; index += 1) {
      const s1 = rotateRight(e,6) ^ rotateRight(e,11) ^ rotateRight(e,25);
      const choice = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + choice + constants[index] + words[index]) >>> 0;
      const s0 = rotateRight(a,2) ^ rotateRight(a,13) ^ rotateRight(a,22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + majority) >>> 0;
      h=g;g=f;f=e;e=(d+temp1)>>>0;d=c;c=b;b=a;a=(temp1+temp2)>>>0;
    }
    h0=(h0+a)>>>0;h1=(h1+b)>>>0;h2=(h2+c)>>>0;h3=(h3+d)>>>0;h4=(h4+e)>>>0;h5=(h5+f)>>>0;h6=(h6+g)>>>0;h7=(h7+h)>>>0;
  }
  return [h0,h1,h2,h3,h4,h5,h6,h7].map(word => word.toString(16).padStart(8,'0')).join('');
}

function normalizeReservationStatus(value) {
  if (value == null || value === '') return 'booked';
  if (typeof value !== 'string') return value;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'completed') return 'booked';
  return RESERVATION_STATUSES.has(normalized) ? normalized : value;
}

function normalizeBoolean(value, fallback = null) {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || (typeof value === 'string' && value.trim().toLowerCase() === 'true')) return true;
  if (value === 0 || value === '0' || (typeof value === 'string' && value.trim().toLowerCase() === 'false')) return false;
  return fallback;
}

function numericString(value) {
  return typeof value === 'string' && value.trim() !== '' && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim());
}

function normalizeNumber(value, { integer = false, min = null, max = null, missing = null } = {}) {
  if (value == null || value === '') return missing;
  if (typeof value === 'boolean' || Array.isArray(value) || typeof value === 'object') return value;
  if (typeof value !== 'number' && !numericString(value)) return value;
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  if (integer && !Number.isInteger(number)) return number;
  if (min != null && number < min) return number;
  if (max != null && number > max) return number;
  return number;
}

function textOr(value, fallback = '', { lower = false } = {}) {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  const text = value.trim();
  return lower ? text.toLocaleLowerCase('en-AU') : text;
}

function normalizeOwner(value, fallback = 'Both') {
  if (value == null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  return VAULT_OWNERS.get(value.trim().toLowerCase()) || value.trim();
}

function validCurrency(value) {
  return typeof value === 'string' && value.trim().toUpperCase() !== 'XXX' && /^[A-Z]{3}$/.test(value.trim().toUpperCase());
}
function normalizeCurrencyText(value, fallback = null) {
  if (value == null || value === '') return fallback;
  return validCurrency(value) ? value.trim().toUpperCase() : value;
}

function canonicalLegacyDate(value, { optional = true } = {}) {
  if (value === false && optional) return null;
  if (value == null || value === '') return optional ? null : value;
  if (typeof value !== 'string') return value;
  const text = value.trim();
  const au = legacyAUDateToISO(text);
  if (au) return au;
  try { return toISODate(text); }
  catch { return value; }
}

function canonicalDateOrDateTime(value, { optional = true } = {}) {
  if (value === false && optional) return null;
  if (value == null || value === '') return optional ? null : value;
  if (typeof value !== 'string') return value;
  const text = value.trim();
  const au = legacyAUDateToISO(text);
  if (au) return au;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    try { return toISODate(text); } catch { return value; }
  }
  try { validateDateTime(text); return text; } catch { return value; }
}

function normalizeRelationshipId(value) {
  if (value === false || value == null || value === '') return null;
  return value;
}

function canonicalTimestamp(value, fallback, nowISO) {
  let date = null;
  if (value instanceof Date && !Number.isNaN(value.valueOf())) date = value;
  else if (typeof value === 'string' && value.trim()) {
    let text = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) text += 'T00:00:00.000Z';
    else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(text)) text += 'Z';
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.valueOf())) date = parsed;
  }
  if (!date) date = new Date(fallback);
  if (Number.isNaN(date.valueOf())) date = new Date(nowISO);
  const now = new Date(nowISO);
  if (!Number.isNaN(now.valueOf()) && date > now) date = now;
  return date.toISOString();
}

function inferRouteStartCountry(record) {
  const type = String(record?.travelType || '').toLowerCase();
  if (type !== 'cruise' && type !== 'motorhome' && type !== 'rv') return '';
  if (typeof record?.startCountry === 'string' && record.startCountry.trim()) return record.startCountry.trim();
  if (record?.startCountry != null && record.startCountry !== '') return record.startCountry;

  // Starting Country controls the dedicated Cruise/RV header and the departure-
  // language context. Do not manufacture that security/identity-critical field
  // from a route label or from arbitrary world-city knowledge during restore.
  // The only approved compatibility inference is the established, unambiguous
  // US motorhome/cruise start-city set carried forward from earlier builds.
  const city = typeof record?.startCity === 'string' ? record.startCity.trim().toLocaleLowerCase('en-AU') : '';
  const approvedUSStartCities = new Set(['miami','nashville','dallas','los angeles','new york']);
  return approvedUSStartCities.has(city) ? 'United States' : '';
}

function normalizeSchengenStatus(value) {
  if (value == null || value === '') return 'not-checked';
  if (typeof value !== 'string') return value;
  const normalized = value.trim().toLowerCase();
  return ['allowed','not-allowed','not-checked'].includes(normalized) ? normalized : value;
}

function normalizeSchengen(settings) {
  const raw = settings.schengen == null ? {} : settings.schengen;
  requireObjectShape(raw, 'Schengen settings', { allowMissing:false });
  let used = normalizeNumber(raw.daysUsed, { integer:true, min:0, max:90, missing:null });
  let remaining = normalizeNumber(raw.daysRemaining, { integer:true, min:0, max:90, missing:null });
  if (typeof used === 'number' && Number.isInteger(used) && used >= 0 && used <= 90 && remaining == null) remaining = 90 - used;
  else if (typeof remaining === 'number' && Number.isInteger(remaining) && remaining >= 0 && remaining <= 90 && used == null) used = 90 - remaining;
  else if (typeof used === 'number' && typeof remaining === 'number' && Number.isInteger(used) && Number.isInteger(remaining) && used >= 0 && used <= 90 && remaining >= 0 && remaining <= 90 && used + remaining !== 90) remaining = 90 - used;
  settings.schengen = {
    status: normalizeSchengenStatus(raw.status),
    daysUsed: used,
    daysRemaining: remaining,
    entryDate: canonicalLegacyDate(raw.entryDate ?? raw.entry, { optional:true }),
    plannedExitDate: canonicalLegacyDate(raw.plannedExitDate ?? raw.plannedExit, { optional:true }),
    mustLeaveByDate: canonicalLegacyDate(raw.mustLeaveByDate ?? raw.mustLeaveBy, { optional:true }),
    lastCheckedDate: canonicalLegacyDate(raw.lastCheckedDate, { optional:true }),
    note: textOr(raw.note ?? raw.notes, '')
  };
}

function validCalendarMonth(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}$/.test(value)) return false;
  const [year, month] = value.split('-').map(Number);
  return Number.isInteger(year) && year >= 1000 && year <= 9998 && Number.isInteger(month) && month >= 1 && month <= 12;
}

function normalizeNavigation(state, now) {
  requireObjectShape(state.ui, 'UI state');
  const emptyUI = createEmptyState(now).ui;
  state.ui = { ...emptyUI, ...(state.ui || {}) };
  const active = typeof state.ui.activeScreen === 'string' ? state.ui.activeScreen.toLowerCase() : 'home';
  state.ui.activeScreen = active === 'dashboard' ? 'home' : VALID_SCREENS.has(active) ? active : 'home';
  state.ui.vaultUnlocked = false;
  state.ui.streamingOpenedSinceUnlock = false;
  state.ui.calendarView = state.ui.calendarView === 'agenda' ? 'agenda' : 'month';
  if (state.ui.calendarMonth != null && !validCalendarMonth(state.ui.calendarMonth)) state.ui.calendarMonth = null;
  state.ui.checklistListType = state.ui.checklistListType === 'destination' ? 'destination' : 'permanent';
  if (state.ui.checklistStage != null && !CHECKLIST_STAGES.has(state.ui.checklistStage)) state.ui.checklistStage = null;
  if (!RESERVATION_TYPES.has(state.ui.reservationType)) state.ui.reservationType = 'flight';
  state.ui.reservationCompletedOpen = state.ui.reservationCompletedOpen === true;
  state.ui.itineraryCompletedOpen = state.ui.itineraryCompletedOpen === true;
  const journeyHistoryPage = Number(state.ui.journeyHistoryPage);
  state.ui.journeyHistoryPage = Number.isInteger(journeyHistoryPage) && journeyHistoryPage >= 1 ? journeyHistoryPage : 1;
  const pointer = state.ui.pendingOpen;
  if (!isPlainObject(pointer) || !POINTER_COLLECTIONS.has(pointer.collection) || typeof pointer.id !== 'string' || !pointer.id.trim()) {
    state.ui.pendingOpen = null;
    return;
  }
  const target = (state[pointer.collection] || []).some(record => record.id === pointer.id);
  if (!target) { state.ui.pendingOpen = null; return; }
  const compatibleScreens = POINTER_SCREENS[pointer.collection];
  if (compatibleScreens && !compatibleScreens.has(state.ui.activeScreen)) state.ui.activeScreen = POINTER_DEFAULT_SCREEN[pointer.collection];
}

export function validateCurrentStateAllowingNavigationRepair(input, { now = new Date().toISOString() } = {}) {
  // Current-generation travel/settings data remains strict, but persisted UI
  // navigation is explicitly recoverable. A stale screen/tab/month/page or
  // record pointer must never hold otherwise-valid travel data in Protected
  // Recovery. Normalise only the UI/navigation shell on a clone, then validate
  // the untouched canonical data against the full state validator.
  const candidate = structuredClone(input);
  normalizeNavigation(candidate, now);
  validateState(candidate);
  return true;
}

function routeDate(record, kind) {
  try { return kind === 'expense' ? toISODate(record.date) : toISODate(record.dateTime || record.date); }
  catch { return null; }
}

function normalizeLegacyCost(state, record, kind) {
  if (!isPlainObject(record)) return record;
  const next = { ...record };
  const hadLegacyAllocation = Object.prototype.hasOwnProperty.call(record, 'allocation');
  const wasDestination = !hadLegacyAllocation || record.allocation === 'destination';
  delete next.allocation;

  next.itineraryId = normalizeRelationshipId(next.itineraryId);
  next.needsBudgetRepair = normalizeBoolean(next.needsBudgetRepair, next.needsBudgetRepair == null ? false : next.needsBudgetRepair);
  if (kind === 'expense') {
    next.date = canonicalLegacyDate(next.date, { optional:true });
    // An unusable legacy text date cannot be trusted for automatic routing, but
    // it also should not destroy an otherwise recoverable cost record. Clear
    // only malformed text into the explicit repair state; non-text corruption
    // remains intact so strict validation still rejects it.
    if (typeof next.date === 'string' && !routeDate(next, 'expense')) next.date = null;
  } else {
    if ((next.dateTime == null || next.dateTime === '') && next.date != null && next.date !== '') next.dateTime = canonicalDateOrDateTime(next.date, { optional:true });
    else next.dateTime = canonicalDateOrDateTime(next.dateTime, { optional:true });
    delete next.date;
    if (typeof next.dateTime === 'string' && !routeDate(next, 'reservation')) next.dateTime = null;
  }

  next.originalAmount = normalizeNumber(next.originalAmount, { min:0, missing:0 });
  next.audAmount = normalizeNumber(next.audAmount, { min:0, missing:0 });
  if (validCurrency(next.originalCurrency)) next.originalCurrency = String(next.originalCurrency).trim().toUpperCase();
  else if (next.originalCurrency == null || typeof next.originalCurrency === 'string') {
    // Genuine legacy cost records already enter explicit Destination Budget
    // repair when their currency cannot be trusted. Preserve recoverability by
    // canonicalising unusable text (including old labels such as "US dollars")
    // to the repair-only XXX sentinel. Non-text corruption (objects/arrays/
    // booleans) remains untouched so strict validation rejects it.
    next.originalCurrency = 'XXX';
  }
  if (kind === 'expense') next.description = textOr(next.description, '');
  if (kind === 'reservation') {
    next.title = textOr(next.title, '');
    next.notes = textOr(next.notes, '');
    next.status = normalizeReservationStatus(next.status);
    const normalizedScope = typeof next.flightScope === 'string' ? next.flightScope.trim().toLowerCase() : null;
    next.flightScope = next.type === 'flight' && FLIGHT_SCOPES.has(normalizedScope) ? normalizedScope : null;
  }

  const date = routeDate(next, kind);
  const matches = date ? staysCoveringDate(state.itinerary || [], date) : [];
  const exact = matches.length === 1 ? matches[0] : null;
  const existingTarget = (state.itinerary || []).find(item => item.id === next.itineraryId) || null;
  const correctLink = Boolean(exact && existingTarget && exact.id === existingTarget.id);
  const amountsValid = typeof next.originalAmount === 'number' && Number.isFinite(next.originalAmount) && next.originalAmount >= 0 && typeof next.audAmount === 'number' && Number.isFinite(next.audAmount) && next.audAmount >= 0 && !(next.originalAmount > 0 && next.audAmount <= 0);
  let automaticAUDValid = true;
  if (amountsValid && exact && isDestinationBudgetUsable(exact)) {
    const currency = String(next.originalCurrency || '').trim().toUpperCase();
    const stayCurrency = String(exact.localCurrency || '').trim().toUpperCase();
    let expected = null;
    if (currency === 'AUD') expected = Math.round((next.originalAmount + Number.EPSILON) * 100) / 100;
    else if (currency === stayCurrency) expected = Math.round((next.originalAmount / Number(exact.fixedLocalPerAUD) + Number.EPSILON) * 100) / 100;
    if (expected != null) automaticAUDValid = Math.abs(next.audAmount - expected) <= 0.005;
  }
  let repair = next.needsBudgetRepair === true || !wasDestination || !date || matches.length !== 1 || !correctLink || !isDestinationBudgetUsable(exact) || !validCurrency(next.originalCurrency) || !amountsValid || !automaticAUDValid;
  next.needsBudgetRepair = Boolean(repair);
  return next;
}

function normalizeRecordMetadata(record, fallbackCreated, nowISO) {
  if (!isPlainObject(record)) return record;
  let createdAt = canonicalTimestamp(record.createdAt || record.modifiedAt, fallbackCreated, nowISO);
  let modifiedAt = canonicalTimestamp(record.modifiedAt || record.createdAt, createdAt, nowISO);
  if (modifiedAt < createdAt) modifiedAt = createdAt;
  return { ...record, createdAt, modifiedAt, schemaVersion:SCHEMA_VERSION };
}

function normalizeCompatibleState(input, now) {
  if (!isPlainObject(input)) throw new Error('Backup state must be an object');
  const clone = structuredClone(input);
  let nowISO = canonicalTimestamp(now, new Date().toISOString(), new Date().toISOString());
  // A canonical state from this same app generation can legitimately contain
  // timestamps later than the current device clock if the iPad clock was moved
  // backwards after a Save. Keep the saved state timestamp as the migration
  // ceiling/floor so hydrate, Restore and Retry Storage do not rewrite every
  // Recent Activity timestamp. Older generations use legacy clamping.
  if (Number(clone.schemaVersion) === SCHEMA_VERSION && isCurrentAppGeneration(clone.meta?.appVersion) && typeof clone.meta?.modifiedAt === 'string') {
    const savedModified = new Date(clone.meta.modifiedAt);
    if (!Number.isNaN(savedModified.valueOf())) {
      const savedISO = savedModified.toISOString();
      if (savedISO === clone.meta.modifiedAt && savedISO > nowISO) nowISO = savedISO;
    }
  }
  requireObjectShape(clone.settings, 'Settings');
  requireObjectShape(clone.meta, 'Metadata');
  requireObjectShape(clone.ui, 'UI state');
  for (const key of COLLECTIONS) {
    if (clone[key] == null) clone[key] = [];
    else if (!Array.isArray(clone[key])) throw new Error(`${key} must be an array`);
  }

  const rawCreated = clone.meta?.createdAt;
  const createdAt = canonicalTimestamp(rawCreated, nowISO, nowISO);
  const empty = createEmptyState(createdAt);
  clone.settings = { ...empty.settings, ...(clone.settings || {}) };
  clone.settings.dateFormat = 'DD/MM/YYYY';
  clone.settings.defaultTravellers = 2;
  clone.settings.journeyStartDate = canonicalLegacyDate(clone.settings.journeyStartDate, { optional:true });
  clone.settings.defaultCurrency = normalizeCurrencyText(clone.settings.defaultCurrency, 'AUD');
  clone.settings.annualBudgetAUD = normalizeNumber(clone.settings.annualBudgetAUD, { min:0, missing:0 });
  clone.settings.pinEnabled = normalizeBoolean(clone.settings.pinEnabled, clone.settings.pinEnabled == null ? false : clone.settings.pinEnabled);
  clone.settings.pinRecoveryNotice = textOr(clone.settings.pinRecoveryNotice, '');
  normalizeSchengen(clone.settings);

  clone.itinerary = clone.itinerary.map(record => {
    if (!isPlainObject(record)) return record;
    const normalizedTravelType=String(record.travelType || '').trim().toLowerCase();
    const travelType=normalizedTravelType==='rv'?'motorhome':['standard','motorhome','cruise'].includes(normalizedTravelType)?normalizedTravelType:record.travelType;
    const localCurrency = normalizeCurrencyText(record.localCurrency, null);
    let fixedLocalPerAUD = normalizeNumber(record.fixedLocalPerAUD, { min:0, missing:null });
    if (localCurrency === 'AUD') fixedLocalPerAUD = 1;
    return {
      ...record,
      travelType,
      name:textOr(record.name, ''),
      country:textOr(record.country, ''),
      startCity:textOr(record.startCity, ''),
      startCountry:inferRouteStartCountry({ ...record, travelType }),
      startDate:canonicalLegacyDate(record.startDate, { optional:true }),
      endDate:canonicalLegacyDate(record.endDate, { optional:true }),
      localCurrency,
      fixedLocalPerAUD,
      destinationBudgetAUD:normalizeNumber(record.destinationBudgetAUD, { min:0, missing:0 }),
      lat:normalizeNumber(record.lat, { min:-90, max:90, missing:null }),
      long:normalizeNumber(record.long, { min:-180, max:180, missing:null })
    };
  });

  clone.routePoints = clone.routePoints.map(record => {
    if (!isPlainObject(record)) return record;
    const next={
      ...record,
      itineraryId:normalizeRelationshipId(record.itineraryId),
      name:textOr(record.name, ''),
      order:normalizeNumber(record.order ?? record.sequence, { integer:true, min:1, missing:null }),
      lat:normalizeNumber(record.lat, { min:-90, max:90, missing:null }),
      long:normalizeNumber(record.long, { min:-180, max:180, missing:null })
    };
    delete next.sequence;
    return next;
  });

  clone.expenses = clone.expenses.map(record => normalizeLegacyCost(clone, record, 'expense'));
  clone.reservations = clone.reservations.map(record => normalizeLegacyCost(clone, record, 'reservation'));

  clone.calendarEvents = clone.calendarEvents
    .filter(event => !isPlainObject(event) || !event.reservationId)
    .map(record => {
      if (!isPlainObject(record)) return record;
      let date = canonicalLegacyDate(record.date, { optional:true });
      let dateTime = canonicalDateOrDateTime(record.dateTime, { optional:true });
      if (typeof dateTime === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateTime)) { date = dateTime; dateTime = null; }
      else if (dateTime) date = null;
      const next = {
        ...record,
        type:record.type || 'reminder',
        title:textOr(record.title, ''),
        notes:textOr(typeof record.notes === 'string' && record.notes.trim() ? record.notes : record.note, ''),
        itineraryId:normalizeRelationshipId(record.itineraryId),
        reservationId:null,
        date,
        dateTime
      };
      delete next.note;
      return next;
    });

  clone.journeyHistory = clone.journeyHistory.map(record => {
    if (!isPlainObject(record)) return record;
    const next={
      ...record,
      itineraryId:normalizeRelationshipId(record.itineraryId),
      kilometresTravelled:normalizeNumber(record.kilometresTravelled ?? record.distanceKm, { min:0, missing:null })
    };
    delete next.distanceKm;
    return next;
  });

  clone.checklists = clone.checklists.map(record => {
    if (!isPlainObject(record)) return record;
    const listType = record.listType;
    const required = normalizeBoolean(record.required, record.required == null ? true : record.required);
    const completed = normalizeBoolean(record.completed, record.completed == null ? false : record.completed);
    const scopes = Array.isArray(record.completedForItineraryIds) ? [...new Set(record.completedForItineraryIds)] : [];
    return {
      ...record,
      itineraryId:listType === 'permanent' ? null : normalizeRelationshipId(record.itineraryId),
      title:textOr(record.title, ''),
      notes:textOr(record.notes, ''),
      owner:typeof record.owner === 'string' ? record.owner.trim().toLowerCase() : record.owner,
      required,
      dueDate:canonicalLegacyDate(record.dueDate, { optional:true }),
      completed:listType === 'permanent' ? false : completed,
      completedAt:listType === 'permanent' ? null : (completed ? canonicalTimestamp(record.completedAt, record.modifiedAt || record.createdAt || nowISO, nowISO) : null),
      completedForItineraryIds:listType === 'permanent' ? scopes : []
    };
  });

  clone.vault = clone.vault.map(record => !isPlainObject(record) ? record : ({
    ...record,
    title:textOr(record.title, ''), reference:textOr(record.reference, ''), details:textOr(record.details, ''), notes:textOr(record.notes, ''),
    owner:normalizeOwner(record.owner),
    issueDate:canonicalLegacyDate(record.issueDate, { optional:true }),
    expiryDate:canonicalLegacyDate(record.expiryDate, { optional:true })
  }));
  clone.attachments = clone.attachments.map(record => {
    if (!isPlainObject(record)) return record;
    const next = {
      ...record,
      vaultRecordId:normalizeRelationshipId(record.vaultRecordId),
      name:textOr(record.name, 'Screenshot'),
      mimeType:textOr(record.mimeType, '')
    };
    const assetKey = typeof record.assetKey === 'string' ? record.assetKey.trim() : '';
    const embedded = typeof record.dataUrl === 'string' ? record.dataUrl : '';
    if (assetKey) {
      next.assetKey = assetKey;
      next.byteLength = normalizeNumber(record.byteLength, { missing:record.byteLength });
      delete next.dataUrl;
    } else {
      next.dataUrl = embedded;
      delete next.assetKey;
      if (record.byteLength == null) delete next.byteLength;
    }
    return next;
  });
  clone.accounts = clone.accounts.map(record => {
    if (!isPlainObject(record)) return record;
    const next = {
      ...record,
      name:textOr(typeof record.name === 'string' && record.name.trim() ? record.name : record.label, ''),
      currency:normalizeCurrencyText(record.currency, 'AUD'),
      balance:normalizeNumber(record.balance, { missing:0 })
    };
    delete next.label;
    return next;
  });
  clone.alerts = clone.alerts.map(record => !isPlainObject(record) ? record : ({
    ...record,
    title:textOr(record.title, ''), message:textOr(record.message, ''), source:textOr(record.source, ''), status:textOr(record.status, ''),
    priority:textOr(record.priority, ''), dueDate:canonicalLegacyDate(record.dueDate, { optional:true }),
    active:normalizeBoolean(record.active, record.active == null ? true : record.active)
  }));
  clone.streaming = clone.streaming.map(record => !isPlainObject(record) ? record : ({
    ...record,
    service:textOr(record.service, ''), owner:normalizeOwner(record.owner), username:textOr(record.username, ''),
    password:typeof record.password === 'string' ? record.password : record.password, notes:textOr(record.notes, '')
  }));
  clone.protectedEmails = clone.protectedEmails.map(record => !isPlainObject(record) ? record : ({
    ...record,
    owner:normalizeOwner(record.owner), email:typeof record.email === 'string' ? record.email.trim().toLowerCase() : record.email,
    notes:textOr(record.notes, '')
  }));

  if (clone.settings.pinEnabled && !supportedPinHash(clone.settings.pinHash)) {
    clone.settings.pinEnabled = false;
    clone.settings.pinHash = null;
    clone.settings.pinRecoveryNotice = 'The restored Vault PIN format was not supported. Travel data was preserved and the PIN was disabled; set a new PIN.';
  } else if (clone.settings.pinEnabled && typeof clone.settings.pinHash === 'string') {
    const legacyPin = clone.settings.pinHash.trim();
    if (/^\d{4,8}$/.test(legacyPin)) clone.settings.pinHash = `sha256:${sha256HexSync(legacyPin)}`;
    else if (/^[a-f0-9]{64}$/i.test(legacyPin)) clone.settings.pinHash = `sha256:${legacyPin.toLowerCase()}`;
    else clone.settings.pinHash = `sha256:${legacyPin.slice('sha256:'.length).toLowerCase()}`;
  } else if (!clone.settings.pinEnabled) {
    clone.settings.pinHash = null;
  }

  const revision = normalizeNumber(clone.meta?.revision, { integer:true, min:0, missing:0 });
  const modifiedAt = canonicalTimestamp(clone.meta?.modifiedAt, createdAt, nowISO);
  clone.schemaVersion = SCHEMA_VERSION;
  clone.meta = {
    ...empty.meta,
    ...(clone.meta || {}),
    createdAt,
    modifiedAt: modifiedAt < createdAt ? createdAt : modifiedAt,
    revision,
    appVersion:APP_VERSION
  };
  for (const key of COLLECTIONS) clone[key] = clone[key].map(record => normalizeRecordMetadata(record, clone.meta.createdAt, nowISO));
  // Journey History is one read-only supplement per itinerary stay. Older
  // generations could retain duplicate supplements; the view model already
  // resolved those by newest modified/created timestamp then id. Collapse the
  // hidden duplicates with that exact deterministic rule during migration so
  // a current backup cannot contain unrepairable competing supplements.
  const journeyHistoryByItinerary = new Map();
  const journeyHistoryWithoutStay = [];
  for (const record of clone.journeyHistory) {
    if (!isPlainObject(record) || !record.itineraryId) { journeyHistoryWithoutStay.push(record); continue; }
    const existing = journeyHistoryByItinerary.get(record.itineraryId);
    if (!existing) { journeyHistoryByItinerary.set(record.itineraryId, record); continue; }
    const recordKey = `${record.modifiedAt || record.createdAt || ''}|${record.id || ''}`;
    const existingKey = `${existing.modifiedAt || existing.createdAt || ''}|${existing.id || ''}`;
    if (recordKey > existingKey) journeyHistoryByItinerary.set(record.itineraryId, record);
  }
  clone.journeyHistory = [...journeyHistoryWithoutStay, ...journeyHistoryByItinerary.values()];
  clone.checklists = clone.checklists.map(item => {
    if (!isPlainObject(item) || item.listType !== 'destination' || item.completed !== true || typeof item.completedAt !== 'string') return item;
    let completedAt = item.completedAt;
    if (completedAt < item.createdAt) completedAt = item.createdAt;
    if (completedAt > item.modifiedAt) completedAt = item.modifiedAt;
    return completedAt === item.completedAt ? item : { ...item, completedAt };
  });
  for (const key of COLLECTIONS) {
    for (const record of clone[key]) {
      if (typeof record?.modifiedAt === 'string' && record.modifiedAt > clone.meta.modifiedAt) clone.meta.modifiedAt = record.modifiedAt;
    }
  }
  normalizeNavigation(clone, nowISO);
  return clone;
}

export function migrateState(input, { now = new Date().toISOString() } = {}) {
  const rawVersion = input?.schemaVersion;
  if ((rawVersion == null || rawVersion === '') && looksLikeCurrentRuntimeStateWithoutSchema(input)) {
    throw new Error('Current app state is missing its schema version; Protected Recovery is required');
  }
  let version = 0;
  if (rawVersion != null && rawVersion !== '') {
    if (typeof rawVersion === 'number') version = rawVersion;
    else if (numericString(rawVersion)) version = Number(rawVersion);
    else throw new Error('Invalid schema version');
  }
  if (!Number.isFinite(version) || !Number.isInteger(version) || version < 0) throw new Error('Invalid schema version');
  if (version > SCHEMA_VERSION) throw new Error('Backup was created by a newer schema');
  if (version < SCHEMA_VERSION && looksLikeCurrentRuntimeStateWithoutSchema(input)) {
    throw new Error('Current app state cannot masquerade as a legacy schema; Protected Recovery is required');
  }
  // Migration is intentionally permissive about missing fields in genuinely
  // old Travel Command Centre data, but it must never turn arbitrary/truncated
  // JSON into a plausible empty app. Require the same minimum legacy identity
  // used by backup Restore before compatibility defaults are allowed.
  if (version < SCHEMA_VERSION) assertRecognisableLegacyShape(input, rawVersion);
  if (version === SCHEMA_VERSION) assertNotNewerAppGeneration(input);
  // Schema V2 has a known minimum persisted shape all supported V36+ states
  // carry. Require that shape before compatibility defaults are applied so a
  // damaged current state cannot strip its appVersion (or a whole collection)
  // and masquerade as an older migratable state during startup.
  if (version === SCHEMA_VERSION) assertCompatibleV2Shape(input);
  // A state stamped by the strict V41+ continuity generations is not a legacy
  // migration shape. Validate it before applying compatibility defaults so parseable but
  // truncated/corrupted current local-storage data cannot be silently turned
  // into a plausible empty/defaulted app on startup. Genuine older generations
  // remain eligible for the compatibility normalisation below.
  if (version === SCHEMA_VERSION && isStrictPersistedGeneration(input?.meta?.appVersion)) {
    assertOwnFields(input.settings, STRICT_SETTINGS_FIELDS, 'Settings');
    // Current-generation travel/settings data remains strict. The UI shell is
    // deliberately repairable (including missing fields) and is normalized on
    // a clone before full validation. Vault session flags are always reset.
    validateCurrentStateAllowingNavigationRepair(input, { now });
  }
  if (version === 0 || version === 1 || version === SCHEMA_VERSION) return normalizeCompatibleState(input, now);
  throw new Error(`No migration path from schema ${version}`);
}
