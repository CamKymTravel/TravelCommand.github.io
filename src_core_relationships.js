import { isDestinationBudgetUsable, staysCoveringDate } from './src_core_budget.js';
import { formatAUDate, toISODate } from './src_core_dates.js';

function indexById(records) { return new Map(records.map(record => [record.id, record])); }

function expectedAutomaticAUD(record, stay) {
  const currency = String(record?.originalCurrency || '').trim().toUpperCase();
  const stayCurrency = String(stay?.localCurrency || '').trim().toUpperCase();
  const amount = Number(record?.originalAmount);
  if (!Number.isFinite(amount) || amount < 0) return null;
  if (currency === 'AUD') return Math.round((amount + Number.EPSILON) * 100) / 100;
  if (currency === stayCurrency) {
    const rate = Number(stay?.fixedLocalPerAUD);
    if (!Number.isFinite(rate) || rate <= 0) return null;
    return Math.round((amount / rate + Number.EPSILON) * 100) / 100;
  }
  return null;
}

function validateDatedCostRelationship(state, record, kind, itinerary) {
  if (record.needsBudgetRepair === true) return;
  if (!record.itineraryId || !itinerary.has(record.itineraryId)) throw new Error(`${kind}: missing itinerary ${record.itineraryId || ''}`);
  const raw = kind === 'expenses' ? record.date : record.dateTime;
  const date = toISODate(raw);
  const matches = staysCoveringDate(state.itinerary || [], date);
  if (matches.length !== 1) throw new Error(`${kind}: date ${formatAUDate(date)} does not resolve to exactly one itinerary stay`);
  if (matches[0].id !== record.itineraryId) throw new Error(`${kind}: itinerary link does not match transaction date ${formatAUDate(date)}`);
  if (!isDestinationBudgetUsable(matches[0])) throw new Error(`${kind}: Destination Budget is incomplete for itinerary ${record.itineraryId}`);
  const expectedAUD = expectedAutomaticAUD(record, matches[0]);
  if (expectedAUD != null && Math.abs(Number(record.audAmount) - expectedAUD) > 0.005) throw new Error(`${kind}: stored AUD equivalent does not match the automatic currency conversion`);
}

export function validateRelationships(state) {
  const itinerary = indexById(state.itinerary);
  const reservations = indexById(state.reservations);
  const vault = indexById(state.vault);
  const routeOrders = new Map();

  for (const point of state.routePoints) {
    if (!point.itineraryId || !itinerary.has(point.itineraryId)) throw new Error(`routePoints: missing itinerary ${point.itineraryId || ''}`);
    const stay = itinerary.get(point.itineraryId);
    if (!['motorhome','cruise'].includes(stay.travelType)) throw new Error('routePoints: Standard stays cannot contain route points');
    const key = `${point.itineraryId}|${point.order}`;
    if (routeOrders.has(key)) throw new Error(`routePoints: duplicate order ${point.order} for itinerary ${point.itineraryId}`);
    routeOrders.set(key, point.id);
  }
  for (const expense of state.expenses) validateDatedCostRelationship(state, expense, 'expenses', itinerary);
  for (const reservation of state.reservations) validateDatedCostRelationship(state, reservation, 'reservations', itinerary);
  for (const item of state.checklists || []) {
    if (item.itineraryId && !itinerary.has(item.itineraryId)) throw new Error(`checklists: missing itinerary ${item.itineraryId}`);
    if (item.listType === 'permanent') {
      for (const scope of item.completedForItineraryIds || []) if (!itinerary.has(scope)) throw new Error(`checklists: Permanent completion references missing itinerary ${scope}`);
    }
  }
  const journeyHistoryByItinerary = new Set();
  for (const record of state.journeyHistory || []) {
    if (!record.itineraryId) throw new Error('journeyHistory: supplement record requires an itinerary');
    if (!itinerary.has(record.itineraryId)) throw new Error(`journeyHistory: missing itinerary ${record.itineraryId}`);
    if (journeyHistoryByItinerary.has(record.itineraryId)) throw new Error(`journeyHistory: multiple supplement records for itinerary ${record.itineraryId}`);
    journeyHistoryByItinerary.add(record.itineraryId);
  }
  for (const event of state.calendarEvents) {
    if (event.reservationId && !reservations.has(event.reservationId)) throw new Error(`calendarEvents: missing reservation ${event.reservationId}`);
    if (event.itineraryId && !itinerary.has(event.itineraryId)) throw new Error(`calendarEvents: missing itinerary ${event.itineraryId}`);
  }
  for (const attachment of state.attachments) {
    if (!attachment.vaultRecordId || !vault.has(attachment.vaultRecordId)) throw new Error(`attachments: missing vault record ${attachment.vaultRecordId || ''}`);
  }
  return true;
}
