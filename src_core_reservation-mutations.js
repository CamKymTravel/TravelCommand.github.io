import { createReservation } from './src_core_entities.js';
import { resolveDestinationBudgetForDate, deriveAUDForStay } from './src_core_budget.js';
import { toISODate } from './src_core_dates.js';
import { touchRecord } from './src_core_records.js';

const RESERVATION_FIELDS = Object.freeze([
  'itineraryId','type','flightScope','title','dateTime','originalCurrency','originalAmount',
  'audAmount','status','needsBudgetRepair','notes'
]);

function pickReservationFields(record) {
  return Object.fromEntries(RESERVATION_FIELDS.map(key => [key, record[key]]));
}

function reservationDuplicateParts(record) {
  const dateTime = typeof record?.dateTime === 'string' ? record.dateTime.trim() : '';
  if (!dateTime) return null;
  const date = dateTime.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
  if (!date) return null;
  const time = dateTime.match(/T(\d{2}):(\d{2})/)?.slice(1,3).join(':') || '';
  const type = String(record?.type || '').normalize('NFC').trim().toLowerCase();
  const title = String(record?.title || '').normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-AU');
  if (!type || !title) return null;
  return { base:`${type}|${title}|${date}`, time };
}

export function reservationDuplicateKey(record) {
  const parts = reservationDuplicateParts(record);
  return parts ? `${parts.base}|${parts.time}` : null;
}

export function reservationsConflict(a, b) {
  const left = reservationDuplicateParts(a);
  const right = reservationDuplicateParts(b);
  if (!left || !right || left.base !== right.base) return false;
  // Reservation time is optional. If either copy has no entered time, the two
  // records are indistinguishable on the same type/title/date and should be
  // treated as a duplicate. Two explicit, different times remain legitimate.
  return !left.time || !right.time || left.time === right.time;
}

export function findDuplicateReservation(records, candidate, excludeId = null) {
  return (records || []).find(record => record.id !== excludeId && reservationsConflict(record, candidate)) || null;
}

export function saveReservationDraft(draft, { reservationId = null, fields }, options = {}) {
  if (!fields.dateTime) throw new Error('Reservation date is required');
  const stay = resolveDestinationBudgetForDate(draft.itinerary || [], toISODate(fields.dateTime));
  const normalized = {
    ...fields,
    itineraryId: stay.id,
    needsBudgetRepair: false,
    audAmount: deriveAUDForStay(fields, stay)
  };
  const validated = createReservation(normalized, options);
  const duplicate = findDuplicateReservation(draft.reservations, validated, reservationId);
  if (duplicate) throw new Error('Duplicate reservation already exists');

  if (!reservationId) {
    draft.reservations.push(validated);
    return validated;
  }
  const index = draft.reservations.findIndex(record => record.id === reservationId);
  if (index < 0) throw new Error('Reservation not found');
  const saved = touchRecord(draft.reservations[index], pickReservationFields(validated), options);
  draft.reservations[index] = saved;
  return saved;
}

export function deleteReservationDraft(draft, reservationId) {
  const before = draft.reservations.length;
  draft.reservations = draft.reservations.filter(record => record.id !== reservationId);
  draft.calendarEvents = draft.calendarEvents.filter(record => record.reservationId !== reservationId);
  if (draft.reservations.length === before) throw new Error('Reservation not found');
  return true;
}
