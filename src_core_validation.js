import { SCHEMA_VERSION, EXPENSE_CATEGORIES, TRAVEL_TYPES, RESERVATION_TYPES, RESERVATION_STATUSES, FLIGHT_SCOPES } from './src_core_schema.js';
import { VAULT_CATEGORIES, VAULT_OWNERS, MAX_VAULT_SCREENSHOTS_PER_RECORD, MAX_VAULT_SCREENSHOT_BYTES, validateVaultScreenshotPayload } from './src_core_vault-mutations.js';
import { assertUniqueIds } from './src_core_ids.js';
import { validateRelationships } from './src_core_relationships.js';
import { normalizeCoordinates } from './src_core_coordinates.js';
import { toISODate, validateDateOrDateTime } from './src_core_dates.js';

const COLLECTIONS = ['itinerary','routePoints','expenses','reservations','calendarEvents','journeyHistory','checklists','vault','attachments','accounts','alerts','streaming','protectedEmails'];
const VALID_SCREENS = new Set(['home','budget','reservations','itinerary','calendar','journey-history','checklist','vault','settings']);
const CHECKLIST_STAGES = new Set(['current-stay','before-leave','travel-day','arrival']);
const RESERVATION_UI_TYPES = new Set(RESERVATION_TYPES);
const UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function isObject(value) { return value != null && typeof value === 'object' && !Array.isArray(value); }
function requireText(value, label, { allowEmpty = false } = {}) {
  if (typeof value !== 'string') throw new Error(`${label} must be text`);
  if (!allowEmpty && !value.trim()) throw new Error(`${label} is required`);
  return value;
}
function optionalText(value, label) {
  if (value == null) return;
  if (typeof value !== 'string') throw new Error(`${label} must be text`);
}
function optionalId(value, label) {
  if (value == null) return;
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a valid text id or null`);
}
function validateCanonicalDateOnly(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} must be a canonical YYYY-MM-DD date`);
  if (toISODate(value) !== value) throw new Error(`${label} is invalid`);
  return value;
}
function validateCanonicalDateOrDateTime(value, label) {
  if (typeof value !== 'string' || value !== value.trim()) throw new Error(`${label} must be canonical date/time text`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return validateCanonicalDateOnly(value, label);
  const normalized = validateDateOrDateTime(value);
  if (normalized !== value) throw new Error(`${label} must be canonical date/time text`);
  return value;
}
function strictNumber(value, label, { min = null, max = null, integer = false, nullable = false } = {}) {
  if (value == null && nullable) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label} must be numeric`);
  if (Math.abs(value) > Number.MAX_SAFE_INTEGER) throw new Error(`${label} exceeds the safe numeric range`);
  if (integer && !Number.isSafeInteger(value)) throw new Error(`${label} must be a safe whole number`);
  if (min != null && value < min) throw new Error(`${label} must be ${min} or greater`);
  if (max != null && value > max) throw new Error(`${label} must be ${max} or less`);
  return value;
}
function validateCanonicalTimestamp(value, label) {
  if (typeof value !== 'string' || !UTC_TIMESTAMP.test(value)) throw new Error(`${label} must be a canonical UTC timestamp`);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString() !== value) throw new Error(`${label} is invalid`);
  return value;
}
function validateCurrency(value, label, { nullable = false } = {}) {
  if (value == null && nullable) return null;
  if (typeof value !== 'string' || !/^[A-Z]{3}$/.test(value)) throw new Error(`${label} must be a 3-letter currency code`);
  return value;
}
function validateStartingCountry(value) {
  requireText(value, 'Itinerary starting country');
  // Starting Country is identity-critical for Cruise/RV header and language
  // context. It must name one departure country, not reuse a multi-country
  // route label such as "Italy / United States" or "Spain → Morocco".
  if (/\s*(?:\/|→|->)\s*/.test(value)) throw new Error('Itinerary starting country must name one explicit country, not a composite route');
  return value;
}

export function validateState(state) {
  if (!isObject(state)) throw new Error('State must be an object');
  if (state.schemaVersion !== SCHEMA_VERSION) throw new Error(`Unsupported schema version ${state.schemaVersion}`);
  if (!isObject(state.meta)) throw new Error('Metadata must be an object');
  if (!isObject(state.settings)) throw new Error('Settings must be an object');
  if (!isObject(state.ui)) throw new Error('UI state must be an object');

  validateCanonicalTimestamp(state.meta.createdAt, 'State createdAt');
  validateCanonicalTimestamp(state.meta.modifiedAt, 'State modifiedAt');
  if (state.meta.modifiedAt < state.meta.createdAt) throw new Error('State modifiedAt cannot precede createdAt');
  strictNumber(state.meta.revision, 'State revision', { min:0, max:Number.MAX_SAFE_INTEGER - 1, integer:true });
  optionalText(state.meta.appVersion, 'App version');

  if (state.settings.dateFormat !== 'DD/MM/YYYY') throw new Error('Date format must be DD/MM/YYYY');
  if (state.settings.defaultTravellers !== 2) throw new Error('Default travellers must be 2');
  if (state.settings.journeyStartDate != null) validateCanonicalDateOnly(state.settings.journeyStartDate, 'Journey Start date');
  validateCurrency(state.settings.defaultCurrency, 'Default currency');
  strictNumber(state.settings.annualBudgetAUD, 'Annual budget', { min:0 });
  if (typeof state.settings.pinEnabled !== 'boolean') throw new Error('PIN enabled setting must be boolean');
  if (state.settings.pinEnabled && (typeof state.settings.pinHash !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(state.settings.pinHash))) throw new Error('PIN is enabled without a canonical secure hash');
  if (!state.settings.pinEnabled && state.settings.pinHash != null) throw new Error('PIN hash must be cleared when PIN is disabled');
  optionalText(state.settings.pinRecoveryNotice, 'PIN recovery notice');
  validateSchengen(state.settings.schengen);

  for (const key of COLLECTIONS) {
    if (!Array.isArray(state[key])) throw new Error(`${key} must be an array`);
    if (state[key].length) assertUniqueIds(state[key], key);
  }
  for (const entry of state.itinerary) validateItinerary(entry);
  for (const point of state.routePoints) validateRoutePoint(point);
  for (const expense of state.expenses) validateExpense(expense);
  for (const reservation of state.reservations) validateReservation(reservation);
  for (const event of state.calendarEvents) validateCalendarEvent(event);
  for (const record of state.journeyHistory) validateJourneyHistoryRecord(record);
  for (const item of state.checklists) validateChecklistItem(item);
  for (const record of state.vault) validateVaultRecord(record);
  for (const attachment of state.attachments) validateVaultAttachment(attachment);
  for (const account of state.accounts) validateAccount(account);
  for (const alert of state.alerts) validateAlert(alert);
  for (const record of state.streaming) validateStreamingRecord(record);
  validateProtectedEmails(state.protectedEmails);
  validateUI(state.ui);
  validatePersistentRecordMetadata(state);
  validateRelationships(state);

  const journeyStart = state.settings.journeyStartDate ? toISODate(state.settings.journeyStartDate) : null;
  if (journeyStart) {
    for (const stay of state.itinerary) if (toISODate(stay.startDate) < journeyStart) throw new Error(`Itinerary stay ${stay.name} starts before Journey Start`);
  }
  return true;
}

export function validateItinerary(entry) {
  if (!isObject(entry)) throw new Error('Itinerary record must be an object');
  requireText(entry.name, 'Itinerary name');
  if (!TRAVEL_TYPES.includes(entry.travelType)) throw new Error('Invalid travel type');
  if (entry.startDate == null || entry.endDate == null) throw new Error('Itinerary start and end dates are required');
  const startDate = validateCanonicalDateOnly(entry.startDate, 'Itinerary start date');
  const endDate = validateCanonicalDateOnly(entry.endDate, 'Itinerary end date');
  if (endDate < startDate) throw new Error('End date precedes start date');
  optionalText(entry.country, 'Itinerary country');
  optionalText(entry.startCity, 'Itinerary starting city');
  optionalText(entry.startCountry, 'Itinerary starting country');
  const routeTrip = entry.travelType === 'motorhome' || entry.travelType === 'cruise';
  if (routeTrip && !entry.startCity?.trim()) throw new Error('Route trips require a starting city');
  if (routeTrip && !entry.startCountry?.trim()) throw new Error('Route trips require a starting country');
  if (routeTrip) validateStartingCountry(entry.startCountry);
  if (!routeTrip && entry.startCountry != null && entry.startCountry !== '') throw new Error('Standard stays cannot carry a route Starting Country');
  strictNumber(entry.destinationBudgetAUD, 'Destination budget', { min:0 });
  if (entry.localCurrency != null) validateCurrency(entry.localCurrency, 'Destination currency');
  if (entry.fixedLocalPerAUD != null) strictNumber(entry.fixedLocalPerAUD, 'Exchange rate', { min:Number.EPSILON });
  if (entry.localCurrency === 'AUD' && entry.fixedLocalPerAUD !== 1) throw new Error('AUD Destination Budgets must use a 1:1 exchange rate');
  normalizeCoordinates(entry.lat, entry.long);
  return true;
}

export function validateRoutePoint(point) {
  if (!isObject(point)) throw new Error('Route point must be an object');
  optionalId(point.itineraryId, 'Route point itinerary');
  if (!point.itineraryId) throw new Error('Route point requires an itinerary');
  requireText(point.name, 'Route point name');
  strictNumber(point.order, 'Route point order', { min:1, integer:true });
  // Genuine V42 backups can still carry the retired sequence alias from an
  // older migration. Accept it only when it agrees with canonical order so a
  // checksum-valid backup cannot smuggle two conflicting route positions and
  // rely on migration to silently discard one. The migration then removes the
  // alias before the state is saved again.
  if (Object.prototype.hasOwnProperty.call(point, 'sequence')) {
    strictNumber(point.sequence, 'Legacy route point sequence', { min:1, integer:true });
    if (point.sequence !== point.order) throw new Error('Route point sequence conflicts with canonical order');
  }
  normalizeCoordinates(point.lat, point.long, { allowEmpty:false });
  return true;
}

export function validateExpense(expense) {
  if (!isObject(expense)) throw new Error('Expense record must be an object');
  if (Object.prototype.hasOwnProperty.call(expense, 'allocation')) throw new Error('Expense contains retired allocation data');
  if (!EXPENSE_CATEGORIES.includes(expense.category)) throw new Error('Invalid expense category');
  if (typeof expense.needsBudgetRepair !== 'boolean') throw new Error('Expense budget-repair flag must be boolean');
  optionalId(expense.itineraryId, 'Expense itinerary');
  if (!expense.needsBudgetRepair && !expense.itineraryId) throw new Error('Destination expense requires an itinerary');
  if (!expense.needsBudgetRepair && !expense.date) throw new Error('Expense date is required');
  if (expense.date != null) validateCanonicalDateOnly(expense.date, 'Expense date');
  optionalText(expense.description, 'Expense description');
  validateCurrency(expense.originalCurrency, 'Expense currency');
  strictNumber(expense.originalAmount, 'Expense original amount', { min:0 });
  strictNumber(expense.audAmount, 'Expense AUD amount', { min:0 });
  if (!expense.needsBudgetRepair && expense.originalAmount > 0 && expense.audAmount <= 0) throw new Error('Expense AUD equivalent is required');
  return true;
}

export function validateReservation(reservation) {
  if (!isObject(reservation)) throw new Error('Reservation record must be an object');
  if (Object.prototype.hasOwnProperty.call(reservation, 'allocation')) throw new Error('Reservation contains retired allocation data');
  if (Object.prototype.hasOwnProperty.call(reservation, 'date')) throw new Error('Reservation contains retired date alias data');
  if (!RESERVATION_TYPES.includes(reservation.type)) throw new Error('Invalid reservation type');
  if (reservation.type === 'flight' && reservation.flightScope != null && !FLIGHT_SCOPES.includes(reservation.flightScope)) throw new Error('Invalid flight classification');
  if (reservation.type !== 'flight' && reservation.flightScope != null) throw new Error('Only flights can have domestic/international classification');
  if (!RESERVATION_STATUSES.includes(reservation.status)) throw new Error('Invalid reservation status');
  requireText(reservation.title, 'Reservation title');
  optionalText(reservation.notes, 'Reservation notes');
  if (typeof reservation.needsBudgetRepair !== 'boolean') throw new Error('Reservation budget-repair flag must be boolean');
  optionalId(reservation.itineraryId, 'Reservation itinerary');
  if (!reservation.needsBudgetRepair && !reservation.itineraryId) throw new Error('Destination reservation requires an itinerary');
  if (!reservation.needsBudgetRepair && !reservation.dateTime) throw new Error('Reservation date is required');
  if (reservation.dateTime != null) validateCanonicalDateOrDateTime(reservation.dateTime, 'Reservation date/time');
  validateCurrency(reservation.originalCurrency, 'Reservation currency');
  strictNumber(reservation.originalAmount, 'Reservation original amount', { min:0 });
  strictNumber(reservation.audAmount, 'Reservation AUD amount', { min:0 });
  if (!reservation.needsBudgetRepair && reservation.originalAmount > 0 && reservation.audAmount <= 0) throw new Error('Reservation AUD equivalent is required');
  return true;
}

export function validateChecklistItem(item) {
  if (!isObject(item)) throw new Error('Checklist record must be an object');
  if (!['permanent','destination'].includes(item.listType)) throw new Error('Invalid checklist list type');
  requireText(item.title, 'Checklist item title');
  optionalText(item.notes, 'Checklist notes');
  optionalId(item.itineraryId, 'Checklist itinerary');
  if (item.listType === 'permanent' && item.itineraryId != null) throw new Error('Permanent checklist item cannot link to a destination');
  if (item.listType === 'destination' && !item.itineraryId) throw new Error('Destination checklist item requires a destination');
  if (item.stage != null && !CHECKLIST_STAGES.has(item.stage)) throw new Error('Invalid checklist stage');
  if (item.owner != null && (typeof item.owner !== 'string' || !['both','cameron','kym'].includes(item.owner))) throw new Error('Invalid checklist owner');
  if (typeof item.required !== 'boolean') throw new Error('Checklist required flag must be boolean');
  if (typeof item.completed !== 'boolean') throw new Error('Checklist completed flag must be boolean');
  if (item.dueDate != null) validateCanonicalDateOnly(item.dueDate, 'Checklist due date');
  if (item.completedAt != null) validateCanonicalTimestamp(item.completedAt, 'Checklist completedAt');
  if (!Array.isArray(item.completedForItineraryIds) || item.completedForItineraryIds.some(value => typeof value !== 'string' || !value.trim())) throw new Error('Permanent checklist completion scope is invalid');
  if (new Set(item.completedForItineraryIds).size !== item.completedForItineraryIds.length) throw new Error('Permanent checklist completion scope contains duplicates');
  if (item.listType === 'permanent' && (item.completed !== false || item.completedAt != null)) throw new Error('Permanent checklist global completion is not authoritative');
  if (item.listType === 'destination' && item.completedForItineraryIds.length) throw new Error('Destination checklist item cannot carry Permanent completion scopes');
  if (item.listType === 'destination' && item.completed && item.completedAt == null) throw new Error('Completed destination checklist item requires completedAt');
  if (item.listType === 'destination' && !item.completed && item.completedAt != null) throw new Error('Incomplete destination checklist item cannot carry completedAt');
  if (item.listType === 'destination' && item.completedAt != null && typeof item.createdAt === 'string' && typeof item.modifiedAt === 'string' && (item.completedAt < item.createdAt || item.completedAt > item.modifiedAt)) throw new Error('Checklist completedAt must fall between createdAt and modifiedAt');
  return true;
}

export function validateJourneyHistoryRecord(record) {
  if (!isObject(record)) throw new Error('Journey History record must be an object');
  optionalId(record.itineraryId, 'Journey History itinerary');
  optionalText(record.notes, 'Journey History notes');
  optionalText(record.note, 'Journey History note');
  if (record.kilometresTravelled != null) strictNumber(record.kilometresTravelled, 'Journey History kilometres', { min:0 });
  // V42 can legitimately contain distanceKm as a retained legacy alias. Allow
  // that compatibility form when canonical kilometres are absent or equal,
  // but reject conflicting dual values rather than letting migration silently
  // pick one. The alias is removed by migration on the next canonical save.
  if (record.distanceKm != null) {
    strictNumber(record.distanceKm, 'Journey History distance', { min:0 });
    if (record.kilometresTravelled != null && record.distanceKm !== record.kilometresTravelled) throw new Error('Journey History legacy distance conflicts with canonical kilometres');
  }
  return true;
}

export function validateCalendarEvent(event) {
  if (!isObject(event)) throw new Error('Calendar record must be an object');
  if (event.reservationId != null) throw new Error('Canonical Calendar records cannot mirror Reservations');
  requireText(event.title, 'Calendar event title');
  optionalText(event.notes, 'Calendar notes');
  optionalText(event.note, 'Legacy Calendar note');
  optionalId(event.itineraryId, 'Calendar itinerary');
  optionalId(event.reservationId, 'Calendar reservation');
  const hasDate = event.date != null;
  const hasDateTime = event.dateTime != null;
  if (hasDate === hasDateTime) throw new Error('Calendar event must have exactly one date source');
  if (hasDate) validateCanonicalDateOnly(event.date, 'Calendar date');
  if (hasDateTime) {
    const text = validateCanonicalDateOrDateTime(event.dateTime, 'Calendar date/time');
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error('Date-only Calendar events must use date, not dateTime');
  }
  if (!event.reservationId && event.type != null && !['reminder','note','personal'].includes(event.type)) throw new Error('Invalid calendar event type');
  return true;
}

export function validateVaultRecord(record) {
  if (!isObject(record)) throw new Error('Vault record must be an object');
  if (!VAULT_CATEGORIES.includes(record.category)) throw new Error('Invalid Vault category');
  requireText(record.title, 'Vault record title');
  if (!VAULT_OWNERS.includes(record.owner)) throw new Error('Invalid Vault owner');
  optionalText(record.reference, 'Vault reference');
  optionalText(record.details, 'Vault details');
  optionalText(record.notes, 'Vault notes');
  if (record.issueDate != null) validateCanonicalDateOnly(record.issueDate, 'Vault issue date');
  if (record.expiryDate != null) validateCanonicalDateOnly(record.expiryDate, 'Vault expiry date');
  if (record.issueDate && record.expiryDate && record.expiryDate < record.issueDate) throw new Error('Vault expiry date precedes issue date');
  return true;
}

export function validateVaultAttachment(attachment) {
  if (!isObject(attachment)) throw new Error('Vault attachment must be an object');
  optionalId(attachment.vaultRecordId, 'Vault attachment record');
  if (!attachment.vaultRecordId) throw new Error('Vault attachment requires a record');
  requireText(attachment.name, 'Vault attachment name');
  const hasEmbedded = typeof attachment.dataUrl === 'string' && attachment.dataUrl.length > 0;
  const hasAssetKey = typeof attachment.assetKey === 'string' && attachment.assetKey.trim().length > 0;
  if (hasEmbedded === hasAssetKey) throw new Error('Vault screenshot must have exactly one offline payload source');
  if (hasEmbedded) {
    try {
      const bytes = validateVaultScreenshotPayload(attachment.mimeType, attachment.dataUrl);
      if (attachment.byteLength != null && attachment.byteLength !== bytes) throw new Error('Vault screenshot byte length does not match its payload');
    }
    catch (error) {
      if (error?.message?.startsWith('Screenshot is too large')) throw new Error('Vault screenshot exceeds the offline storage size limit');
      throw error;
    }
  } else {
    requireText(attachment.assetKey, 'Vault screenshot storage key');
    strictNumber(attachment.byteLength, 'Vault screenshot byte length', { integer:true, min:1, max:MAX_VAULT_SCREENSHOT_BYTES });
    if (!['image/png','image/jpeg','image/webp'].includes(attachment.mimeType)) throw new Error('Vault attachments must be screenshot images');
  }
  return true;
}

export function validateAccount(record) {
  if (!isObject(record)) throw new Error('Account record must be an object');
  optionalText(record.name, 'Account name');
  optionalText(record.label, 'Legacy Account label');
  validateCurrency(record.currency, 'Account currency');
  strictNumber(record.balance, 'Account balance');
  return true;
}

export function validateAlert(record) {
  if (!isObject(record)) throw new Error('Alert record must be an object');
  optionalText(record.title, 'Alert title');
  optionalText(record.message, 'Alert message');
  optionalText(record.priority, 'Alert priority');
  optionalText(record.source, 'Alert source');
  optionalText(record.status, 'Alert status');
  if (record.dueDate != null) validateCanonicalDateOnly(record.dueDate, 'Alert due date');
  if (typeof record.active !== 'boolean') throw new Error('Alert active flag must be boolean');
  return true;
}

export function validateStreamingRecord(record) {
  if (!isObject(record)) throw new Error('Streaming record must be an object');
  requireText(record.service, 'Streaming service');
  if (!VAULT_OWNERS.includes(record.owner)) throw new Error('Invalid Vault owner');
  optionalText(record.username, 'Streaming username');
  if (record.password != null && typeof record.password !== 'string') throw new Error('Streaming password must be text');
  optionalText(record.notes, 'Streaming notes');
  return true;
}

export function validateProtectedEmails(records) {
  const seen = new Set();
  for (const record of records) {
    if (!isObject(record)) throw new Error('Protected email record must be an object');
    if (!VAULT_OWNERS.includes(record.owner)) throw new Error('Invalid Vault owner');
    if (typeof record.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) throw new Error('A valid email address is required');
    if (record.email !== record.email.toLowerCase()) throw new Error('Protected email address must be lowercase');
    optionalText(record.notes, 'Protected email notes');
    const key = record.email.toLowerCase();
    if (seen.has(key)) throw new Error('Duplicate protected email address');
    seen.add(key);
  }
  return true;
}

function validateSchengen(source) {
  if (!isObject(source)) throw new Error('Schengen settings must be an object');
  for (const alias of ['entry','plannedExit','mustLeaveBy','notes']) if (Object.prototype.hasOwnProperty.call(source, alias)) throw new Error(`Schengen settings contain retired ${alias} data`);
  if (!['allowed','not-allowed','not-checked'].includes(source.status)) throw new Error('Invalid Schengen status');
  const used = source.daysUsed;
  const remaining = source.daysRemaining;
  if (used != null) strictNumber(used, 'Schengen Days Used', { integer:true, min:0, max:90 });
  if (remaining != null) strictNumber(remaining, 'Schengen Days Remaining', { integer:true, min:0, max:90 });
  if (used != null && remaining != null && used + remaining !== 90) throw new Error('Schengen Days Used + Days Remaining must equal 90');
  for (const [key, label] of [['entryDate','Schengen entry date'],['plannedExitDate','Schengen planned exit date'],['mustLeaveByDate','Schengen must-leave-by date'],['lastCheckedDate','Schengen last-checked date']]) if (source[key] != null) validateCanonicalDateOnly(source[key], label);
  if (source.entryDate && source.plannedExitDate && source.plannedExitDate < source.entryDate) throw new Error('Schengen Planned Exit precedes Entry');
  if (source.entryDate && source.mustLeaveByDate && source.mustLeaveByDate < source.entryDate) throw new Error('Schengen Must Leave By precedes Entry');
  if (source.plannedExitDate && source.mustLeaveByDate && source.plannedExitDate > source.mustLeaveByDate) throw new Error('Schengen Planned Exit is after Must Leave By');
  optionalText(source.note, 'Schengen notes');
  return true;
}

function validateUI(ui) {
  if (!VALID_SCREENS.has(ui.activeScreen)) throw new Error('Invalid active screen');
  if (ui.vaultUnlocked !== false || ui.streamingOpenedSinceUnlock !== false) throw new Error('Vault session state must not persist unlocked');
  if (!['month','agenda'].includes(ui.calendarView)) throw new Error('Invalid Calendar view');
  if (ui.calendarMonth != null) { const match = typeof ui.calendarMonth === 'string' ? ui.calendarMonth.match(/^(\d{4})-(\d{2})$/) : null; const year = match ? Number(match[1]) : 0; const month = match ? Number(match[2]) : 0; if (!match || year < 1000 || year > 9998 || month < 1 || month > 12) throw new Error('Invalid Calendar month'); }
  if (!['permanent','destination'].includes(ui.checklistListType)) throw new Error('Invalid Checklist list type');
  if (ui.checklistStage != null && !CHECKLIST_STAGES.has(ui.checklistStage)) throw new Error('Invalid Checklist stage');
  if (!RESERVATION_UI_TYPES.has(ui.reservationType)) throw new Error('Invalid Reservation tab');
  if (typeof ui.reservationCompletedOpen !== 'boolean') throw new Error('Invalid Reservation completed state');
  if (typeof ui.itineraryCompletedOpen !== 'boolean') throw new Error('Invalid Itinerary completed state');
  if (!Number.isInteger(ui.journeyHistoryPage) || ui.journeyHistoryPage < 1) throw new Error('Invalid Journey History page');
  if (ui.pendingOpen != null) {
    if (!isObject(ui.pendingOpen) || typeof ui.pendingOpen.collection !== 'string' || typeof ui.pendingOpen.id !== 'string' || !ui.pendingOpen.id.trim()) throw new Error('Invalid pending-open pointer');
  }
}

export function validatePersistentRecordMetadata(state) {
  for (const key of COLLECTIONS) {
    for (const record of state[key]) {
      if (!isObject(record)) throw new Error(`${key}: record must be an object`);
      if (record.schemaVersion !== SCHEMA_VERSION) throw new Error(`${key}: invalid record schemaVersion`);
      validateCanonicalTimestamp(record.createdAt, `${key}: createdAt`);
      validateCanonicalTimestamp(record.modifiedAt, `${key}: modifiedAt`);
      if (record.modifiedAt < record.createdAt) throw new Error(`${key}: modifiedAt precedes createdAt`);
      if (record.modifiedAt > state.meta.modifiedAt) throw new Error(`${key}: modifiedAt is later than state modifiedAt`);
    }
  }
  const attachmentCounts = new Map();
  for (const attachment of state.attachments) attachmentCounts.set(attachment.vaultRecordId, (attachmentCounts.get(attachment.vaultRecordId) || 0) + 1);
  for (const [recordId, count] of attachmentCounts) if (count > MAX_VAULT_SCREENSHOTS_PER_RECORD) throw new Error(`Vault record ${recordId} exceeds the screenshot limit`);
  return true;
}
