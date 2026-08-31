import { SCHEMA_VERSION, EXPENSE_CATEGORIES, BUDGET_ALLOCATIONS, TRAVEL_TYPES, RESERVATION_TYPES, RESERVATION_STATUSES } from './src_core_schema.js';
import { VAULT_CATEGORIES, VAULT_OWNERS, IMAGE_MIME_TYPES } from './src_core_vault-mutations.js';
import { assertUniqueIds } from './src_core_ids.js';
import { validateRelationships } from './src_core_relationships.js';
import { normalizeCoordinates } from './src_core_coordinates.js';
import { toISODate, validateDateTime } from './src_core_dates.js';

const COLLECTIONS = ['itinerary','routePoints','expenses','reservations','calendarEvents','journeyHistory','checklists','vault','attachments','accounts','alerts','streaming','protectedEmails'];

export function validateState(state) {
  if (!state || typeof state !== 'object') throw new Error('State must be an object');
  if (state.schemaVersion !== SCHEMA_VERSION) throw new Error(`Unsupported schema version ${state.schemaVersion}`);
  if (state.settings?.dateFormat !== 'DD/MM/YYYY') throw new Error('Date format must be DD/MM/YYYY');
  if (state.settings?.defaultTravellers !== 2) throw new Error('Default travellers must be 2');
  if (state.settings?.journeyStartDate) toISODate(state.settings.journeyStartDate);
  if (!/^[A-Z]{3}$/.test(String(state.settings?.defaultCurrency || ''))) throw new Error('Default currency must be a 3-letter code');
  if (!Number.isFinite(Number(state.settings?.annualBudgetAUD ?? 0)) || Number(state.settings?.annualBudgetAUD ?? 0) < 0) throw new Error('Annual budget must be zero or greater');
  if (typeof state.settings?.pinEnabled !== 'boolean') throw new Error('PIN enabled setting must be boolean');
  if (state.settings.pinEnabled && !String(state.settings.pinHash || '').trim()) throw new Error('PIN is enabled without a secure hash');
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
  for (const record of state.streaming) validateStreamingRecord(record);
  for (const record of state.protectedEmails) validateProtectedEmail(record);
  validatePersistentRecordMetadata(state);
  validateRelationships(state);
  return true;
}


export function validateItinerary(entry) {
  if (!entry?.name?.trim()) throw new Error('Itinerary name is required');
  if (!TRAVEL_TYPES.includes(entry.travelType)) throw new Error('Invalid travel type');
  const startDate = toISODate(entry.startDate);
  const endDate = toISODate(entry.endDate);
  if (endDate < startDate) throw new Error('End date precedes start date');
  if ((entry.travelType === 'motorhome' || entry.travelType === 'cruise') && !entry.startCity?.trim()) {
    throw new Error('Route trips require a starting city');
  }
  if (entry.fixedLocalPerAUD != null && (!Number.isFinite(Number(entry.fixedLocalPerAUD)) || Number(entry.fixedLocalPerAUD) <= 0)) {
    throw new Error('Exchange rate must be greater than zero');
  }
  if (!Number.isFinite(Number(entry.destinationBudgetAUD ?? 0)) || Number(entry.destinationBudgetAUD ?? 0) < 0) {
    throw new Error('Destination budget cannot be negative');
  }
  normalizeCoordinates(entry.lat, entry.long);
  return true;
}

export function validateRoutePoint(point) {
  if (!point?.itineraryId) throw new Error('Route point requires an itinerary');
  if (!point?.name?.trim()) throw new Error('Route point name is required');
  if (!Number.isFinite(Number(point.order))) throw new Error('Route point order must be numeric');
  normalizeCoordinates(point.lat, point.long, { allowEmpty:false });
  return true;
}

export function validateExpense(expense) {
  if (!EXPENSE_CATEGORIES.includes(expense.category)) throw new Error('Invalid expense category');
  if (!BUDGET_ALLOCATIONS.includes(expense.allocation)) throw new Error('Invalid expense allocation');
  if (expense.category !== 'miscellaneous' && expense.allocation !== 'destination') {
    throw new Error(`${expense.category} must allocate to destination budget`);
  }
  if (expense.allocation === 'destination' && !expense.itineraryId) throw new Error('Destination expense requires an itinerary');
  toISODate(expense.date);
  if (!Number.isFinite(Number(expense.originalAmount ?? 0)) || Number(expense.originalAmount ?? 0) < 0) throw new Error('Expense original amount must be zero or greater');
  if (!Number.isFinite(Number(expense.audAmount ?? 0)) || Number(expense.audAmount ?? 0) < 0) throw new Error('Expense AUD amount must be zero or greater');
  return true;
}

export function validateReservation(reservation) {
  if (!RESERVATION_TYPES.includes(reservation.type)) throw new Error('Invalid reservation type');
  if (!RESERVATION_STATUSES.includes(reservation.status)) throw new Error('Invalid reservation status');
  if (!reservation.title?.trim()) throw new Error('Reservation title is required');
  if (reservation.allocation != null && !BUDGET_ALLOCATIONS.includes(reservation.allocation)) throw new Error('Invalid reservation allocation');
  if (reservation.allocation === 'destination' && !reservation.itineraryId) throw new Error('Destination reservation requires an itinerary');
  if (reservation.dateTime) validateDateTime(reservation.dateTime);
  if (!Number.isFinite(Number(reservation.originalAmount ?? 0)) || Number(reservation.originalAmount ?? 0) < 0) throw new Error('Reservation original amount must be zero or greater');
  if (!Number.isFinite(Number(reservation.audAmount ?? 0)) || Number(reservation.audAmount ?? 0) < 0) throw new Error('Reservation AUD amount must be zero or greater');
  return true;
}




export function validateChecklistItem(item) {
  if (!['permanent','destination'].includes(item.listType)) throw new Error('Invalid checklist list type');
  if (!item?.title?.trim()) throw new Error('Checklist item title is required');
  if (item.listType === 'permanent' && item.itineraryId) throw new Error('Permanent checklist item cannot link to a destination');
  if (item.listType === 'destination' && !item.itineraryId) throw new Error('Destination checklist item requires a destination');
  if (item.dueDate) toISODate(item.dueDate);
  if (item.completedAt != null && typeof item.completedAt !== 'string') throw new Error('Checklist completed metadata is invalid');
  return true;
}

export function validateJourneyHistoryRecord(record) {
  if (record.kilometresTravelled != null && (!Number.isFinite(Number(record.kilometresTravelled)) || Number(record.kilometresTravelled) < 0)) throw new Error('Journey History kilometres must be zero or greater');
  if (record.distanceKm != null && (!Number.isFinite(Number(record.distanceKm)) || Number(record.distanceKm) < 0)) throw new Error('Journey History distance must be zero or greater');
  return true;
}

export function validateCalendarEvent(event) {
  if (!event?.title?.trim()) throw new Error('Calendar event title is required');
  const value = event.dateTime || event.date;
  if (!value) throw new Error('Calendar event date is required');
  if (event.dateTime) validateDateTime(event.dateTime); else toISODate(event.date);
  if (!event.reservationId && event.type != null && !['reminder','note','personal'].includes(event.type)) throw new Error('Invalid calendar event type');
  return true;
}


export function validateVaultRecord(record) {
  if (!VAULT_CATEGORIES.includes(record.category)) throw new Error('Invalid Vault category');
  if (!record?.title?.trim()) throw new Error('Vault record title is required');
  if (!VAULT_OWNERS.includes(record.owner)) throw new Error('Invalid Vault owner');
  if (record.issueDate) toISODate(record.issueDate);
  if (record.expiryDate) toISODate(record.expiryDate);
  if (record.issueDate && record.expiryDate && record.expiryDate < record.issueDate) throw new Error('Vault expiry date precedes issue date');
  return true;
}

export function validateVaultAttachment(attachment) {
  if (!attachment?.vaultRecordId) throw new Error('Vault attachment requires a record');
  if (!attachment?.name?.trim()) throw new Error('Vault attachment name is required');
  if (!IMAGE_MIME_TYPES.includes(attachment.mimeType)) throw new Error('Vault attachments must be screenshot images');
  const prefix = `data:${attachment.mimeType};base64,`;
  if (!String(attachment.dataUrl || '').startsWith(prefix)) throw new Error('Invalid screenshot attachment data');
  return true;
}

export function validateStreamingRecord(record) {
  if (!record?.service?.trim()) throw new Error('Streaming service is required');
  if (!VAULT_OWNERS.includes(record.owner)) throw new Error('Invalid Vault owner');
  if (record.password != null && typeof record.password !== 'string') throw new Error('Streaming password must be text');
  return true;
}

export function validateProtectedEmail(record) {
  if (!VAULT_OWNERS.includes(record.owner)) throw new Error('Invalid Vault owner');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(record.email || ''))) throw new Error('A valid email address is required');
  return true;
}

export function validatePersistentRecordMetadata(state) {
  for (const key of COLLECTIONS) {
    for (const record of state[key]) {
      if (record.schemaVersion !== SCHEMA_VERSION) throw new Error(`${key}: invalid record schemaVersion`);
      if (!record.createdAt || !record.modifiedAt) throw new Error(`${key}: missing record metadata`);
    }
  }
  return true;
}
