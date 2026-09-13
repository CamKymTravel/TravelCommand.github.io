import { createReservation } from './src_core_entities.js';
import { resolveDestinationBudgetForDate, deriveAUDForStay, staysCoveringDate, sameDayHandoffCandidates, isDestinationBudgetUsable } from './src_core_budget.js';
import { toISODate } from './src_core_dates.js';
import { touchRecord } from './src_core_records.js';

const RESERVATION_FIELDS = Object.freeze([
  'budgetScope','itineraryId','type','flightScope','title','dateTime','originalCurrency','originalAmount',
  'audAmount','audAmountManual','status','needsBudgetRepair','bookingReference','notes'
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
  const rawType = String(record?.type || '').normalize('NFC').trim().toLowerCase();
  const type = rawType === 'accommodation' ? 'hotel' : rawType;
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

function annualReservationAUD(fields, stay = null) {
  const currency = String(fields.originalCurrency || 'AUD').trim().toUpperCase();
  const originalAmount = Number(fields.originalAmount ?? 0);
  if (currency === 'AUD') return deriveAUDForStay({ ...fields, originalCurrency:'AUD' }, null);
  if (stay && isDestinationBudgetUsable(stay) && currency === String(stay.localCurrency || '').trim().toUpperCase()) {
    return deriveAUDForStay(fields, stay);
  }
  return deriveAUDForStay(fields, null);
}

function existingAnnualReservationUsesManualAUD(record, itinerary = []) {
  if (!record || (record.budgetScope || (record.type === 'ticket' ? 'destination' : 'annual')) !== 'annual') return false;
  if (record.audAmountManual === true) return true;
  if (record.audAmountManual === false) return false;
  const currency = String(record.originalCurrency || '').trim().toUpperCase();
  if (!currency || currency === 'AUD') return false;
  const stay = (itinerary || []).find(item => item.id === record.itineraryId) || null;
  if (!stay || !isDestinationBudgetUsable(stay)) return true;
  if (currency !== String(stay.localCurrency || '').trim().toUpperCase()) return true;
  const expected = deriveAUDForStay(record, stay);
  return Math.abs(Number(record.audAmount) - Number(expected)) > 0.005;
}

export function saveReservationDraft(draft, { reservationId = null, fields }, options = {}) {
  if (!fields.dateTime) throw new Error('Reservation date is required');
  const existing = reservationId ? (draft.reservations || []).find(record => record.id === reservationId) : null;
  if (reservationId && !existing) throw new Error('Reservation not found');
  const existingManualAnnualAUD = existingAnnualReservationUsesManualAUD(existing, draft.itinerary || []);
  const date = toISODate(fields.dateTime);
  const budgetScope = fields.budgetScope === 'destination' ? 'destination' : 'annual';
  let stay = null;
  if (budgetScope === 'destination') {
    stay = resolveDestinationBudgetForDate(draft.itinerary || [], date, { preferredItineraryId:fields.itineraryId || null });
  } else {
    // Annual reservations may legitimately sit on an uncovered transit day.
    // Link a stay when the date is unambiguous. On a legal same-day handoff,
    // preserve an already-established contextual stay link (or an explicit
    // preferred itineraryId) when it still points at one of the two handoff
    // stays. Editing only notes/title/time must never silently detach the
    // booking from its stay and make it disappear from that stay's Budget
    // reservations panel. A true overlap remains ambiguous and is not linked.
    const matches = staysCoveringDate(draft.itinerary || [], date);
    if (matches.length === 1) stay = matches[0];
    else if (matches.length > 1) {
      const handoff = sameDayHandoffCandidates(draft.itinerary || [], date);
      if (handoff.length === 2) {
        const preferredId = fields.itineraryId || existing?.itineraryId || null;
        stay = handoff.find(item => item.id === preferredId) || null;
      }
    }
  }
  const normalizedCurrency = String(fields.originalCurrency || 'AUD').trim().toUpperCase();
  const preserveManualAnnualAUD = budgetScope === 'annual' && existingManualAnnualAUD && normalizedCurrency !== 'AUD';
  const annualManualAUD = budgetScope === 'annual' && normalizedCurrency !== 'AUD' && (
    preserveManualAnnualAUD || !stay || !isDestinationBudgetUsable(stay) || normalizedCurrency !== String(stay.localCurrency || '').trim().toUpperCase()
  );
  const normalized = {
    ...fields,
    budgetScope,
    itineraryId: stay?.id || null,
    needsBudgetRepair: false,
    audAmountManual: budgetScope === 'annual' ? annualManualAUD : false,
    // Annual bookings own their saved canonical AUD value. If this existing
    // record was historically manual, a later itinerary country correction
    // must not turn a notes/date/status edit into an automatic stay-rate
    // conversion merely because the currencies now happen to match.
    audAmount: budgetScope === 'destination'
      ? deriveAUDForStay(fields, stay)
      : preserveManualAnnualAUD
        ? Number(fields.audAmount)
        : annualReservationAUD(fields, stay)
  };
  const validated = createReservation(normalized, options);
  const duplicate = findDuplicateReservation(draft.reservations, validated, reservationId);
  if (duplicate) throw new Error('Duplicate reservation already exists');

  if (!reservationId) {
    draft.reservations.push(validated);
    return validated;
  }
  const index = draft.reservations.findIndex(record => record.id === reservationId);
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
