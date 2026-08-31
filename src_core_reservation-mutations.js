import { createReservation } from './src_core_entities.js';
import { touchRecord } from './src_core_records.js';

const RESERVATION_FIELDS = Object.freeze([
  'itineraryId','type','title','dateTime','originalCurrency','originalAmount',
  'audAmount','status','allocation','notes'
]);

function pickReservationFields(record) {
  return Object.fromEntries(RESERVATION_FIELDS.map(key => [key, record[key]]));
}

function normalizedDuplicateKey(record) {
  const dateTime = String(record?.dateTime || '').trim();
  if (!dateTime) return null;
  const type = String(record?.type || '').trim().toLowerCase();
  const title = String(record?.title || '').trim().replace(/\s+/g, ' ').toLowerCase();
  return `${type}|${title}|${dateTime}`;
}

export function findDuplicateReservation(records, candidate, excludeId = null) {
  const candidateKey = normalizedDuplicateKey(candidate);
  if (!candidateKey) return null;
  return (records || []).find(record => record.id !== excludeId && normalizedDuplicateKey(record) === candidateKey) || null;
}

export function saveReservationDraft(draft, { reservationId = null, fields }, options = {}) {
  const validated = createReservation(fields, options);
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
