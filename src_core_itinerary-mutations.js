import { createItineraryEntry, createRoutePoint } from './src_core_entities.js';
import { touchRecord } from './src_core_records.js';
import { formatAUDate, toISODate } from './src_core_dates.js';
import { staysCoveringDate } from './src_core_budget.js';

const ITINERARY_FIELDS = Object.freeze([
  'name','travelType','startDate','endDate','startCity','startCountry','country','localCurrency',
  'fixedLocalPerAUD','destinationBudgetAUD','lat','long'
]);

function pickItineraryFields(record) {
  return Object.fromEntries(ITINERARY_FIELDS.map(key => [key, record[key]]));
}

function validateRoutePoints(itineraryId, routePoints, options) {
  return (routePoints || []).map((point, index) => createRoutePoint({
    itineraryId,
    name: point.name || '',
    order: index + 1,
    lat: point.lat,
    long: point.long
  }, options));
}

function recordDate(record, kind) {
  return kind === 'Expense' ? toISODate(record.date) : toISODate(record.dateTime || record.date);
}

function recordName(record, kind) {
  if (kind === 'Expense') return record.description?.trim() || record.category || 'Expense';
  return record.title?.trim() || record.type || 'Reservation';
}

function normalDatedCosts(state) {
  return [
    ...(state.expenses || []).filter(record => !record.needsBudgetRepair).map(record => ({ record, kind:'Expense' })),
    ...(state.reservations || []).filter(record => !record.needsBudgetRepair).map(record => ({ record, kind:'Reservation' }))
  ];
}

function normalCostsLinkedTo(state, itineraryId) {
  return normalDatedCosts(state).filter(({ record }) => record.itineraryId === itineraryId);
}

function costProtectsItinerary(state, record, itineraryId, kind) {
  if (!record.needsBudgetRepair) return record.itineraryId === itineraryId;
  // A repair record's persisted itineraryId is explicitly untrusted legacy
  // data. Destructive protection follows the dated stay that can actually be
  // resolved uniquely, never the stale relationship pointer.
  const raw = kind === 'Expense' ? record.date : (record.dateTime || record.date);
  if (!raw) return false;
  try {
    const matches = staysCoveringDate(state.itinerary || [], recordDate(record, kind));
    return matches.length === 1 && matches[0].id === itineraryId;
  } catch {
    return false;
  }
}

function datedCostsLinkedTo(state, itineraryId) {
  return [
    ...(state.expenses || []).filter(record => costProtectsItinerary(state, record, itineraryId, 'Expense')),
    ...(state.reservations || []).filter(record => costProtectsItinerary(state, record, itineraryId, 'Reservation'))
  ];
}

function assertDatedCostsRemainRoutable(state, proposedItinerary) {
  for (const { record, kind } of normalDatedCosts(state)) {
    const date = recordDate(record, kind);
    const matches = staysCoveringDate(proposedItinerary, date);
    if (matches.length !== 1) {
      const reason = matches.length ? 'more than one stay' : 'no stay';
      throw new Error(`Cannot change stay dates: ${kind} “${recordName(record, kind)}” on ${formatAUDate(date)} would match ${reason}.`);
    }
    if (matches[0].id !== record.itineraryId) {
      throw new Error(`Cannot change stay dates: ${kind} “${recordName(record, kind)}” on ${formatAUDate(date)} would move to ${matches[0].name || 'another stay'}.`);
    }
  }

  // A repair-marked legacy cost may have a missing/stale itineraryId, but its
  // entered date can still make it safely recoverable when exactly one stay
  // covers that date. Do not let a stay-date edit/addition turn that uniquely
  // recoverable record into an uncovered or ambiguous one. Unlike a normal
  // cost, the repair record is allowed to end up under a different unique stay
  // because its canonical itinerary link has not been repaired yet.
  const repairs = [
    ...(state.expenses || []).filter(record => record.needsBudgetRepair).map(record => ({ record, kind:'Expense' })),
    ...(state.reservations || []).filter(record => record.needsBudgetRepair).map(record => ({ record, kind:'Reservation' }))
  ];
  for (const { record, kind } of repairs) {
    const raw = kind === 'Expense' ? record.date : (record.dateTime || record.date);
    if (!raw) continue;
    let date;
    try { date = recordDate(record, kind); } catch { continue; }
    const beforeMatches = staysCoveringDate(state.itinerary || [], date);
    if (beforeMatches.length !== 1) continue;
    const afterMatches = staysCoveringDate(proposedItinerary, date);
    if (afterMatches.length === 1) continue;
    const reason = afterMatches.length ? 'more than one stay' : 'no stay';
    throw new Error(`Cannot change stay dates: repair ${kind.toLowerCase()} “${recordName(record, kind)}” on ${formatAUDate(date)} would match ${reason}. Repair that cost first or keep exactly one covering stay.`);
  }
}

function normalizedCurrency(value) {
  return value == null || value === '' ? null : String(value).trim().toUpperCase();
}

function normalizedRate(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'boolean' || (value != null && typeof value === 'object')) throw new Error('Exchange rate must be numeric');
  return Number(value);
}


function savedRoutePointsRemoved(state, itineraryId, proposedTravelType, routePoints = []) {
  const existing = (state.routePoints || []).filter(point => point.itineraryId === itineraryId);
  if (!existing.length) return [];
  if (proposedTravelType === 'standard') return existing;
  const retainedIds = new Set((routePoints || []).map(point => point?.id).filter(Boolean));
  return existing.filter(point => !retainedIds.has(point.id));
}

function assertRoutePointRemovalConfirmed(state, itineraryId, proposedTravelType, routePoints, options) {
  const removed = savedRoutePointsRemoved(state, itineraryId, proposedTravelType, routePoints);
  if (!removed.length || options.allowRoutePointRemoval === true) return;
  const noun = removed.length === 1 ? 'route point' : 'route points';
  throw new Error(`Removing ${removed.length} saved ${noun} requires confirmation.`);
}

function assertNotBeforeJourneyStart(state, startDate) {
  const journeyStart=state.settings?.journeyStartDate ? toISODate(state.settings.journeyStartDate) : null;
  if(journeyStart && toISODate(startDate) < journeyStart) throw new Error(`Stay start ${formatAUDate(startDate)} is before Journey Start ${formatAUDate(journeyStart)}. Change Journey Start in Settings first.`);
}

function assertCurrencyRateUnlocked(state, current, next) {
  if (!normalCostsLinkedTo(state, current.id).length) return;
  const currencyChanged = normalizedCurrency(current.localCurrency) !== normalizedCurrency(next.localCurrency);
  const currentRate = normalizedRate(current.fixedLocalPerAUD);
  const nextRate = normalizedRate(next.fixedLocalPerAUD);
  const rateChanged = currentRate !== nextRate;
  if (currencyChanged || rateChanged) {
    throw new Error('Local currency and fixed exchange rate are locked because this stay already has dated costs. Edit or remove those costs first.');
  }
}

export function saveItineraryDraft(draft, { entryId = null, fields, routePoints = [] }, options = {}) {
  const validated = createItineraryEntry(fields, options);
  assertNotBeforeJourneyStart(draft, validated.startDate);
  // Validate every proposed route point before changing the itinerary draft.
  // Otherwise an RV/Cruise edit can update the parent stay and only then throw
  // on an invalid stop, leaving callers that inspect the rejected draft with a
  // partially applied Save. Standard stays deliberately discard route points.
  const targetItineraryId = entryId || validated.id;
  const validatedPoints = validated.travelType === 'standard' ? [] : validateRoutePoints(targetItineraryId, routePoints, options);
  let entry;

  if (entryId) {
    const index = draft.itinerary.findIndex(item => item.id === entryId);
    if (index < 0) throw new Error('Itinerary entry not found');
    const current = draft.itinerary[index];
    const proposed = { ...current, ...pickItineraryFields(validated), id:current.id };
    assertRoutePointRemovalConfirmed(draft, current.id, proposed.travelType, routePoints, options);
    assertCurrencyRateUnlocked(draft, current, proposed);
    const proposedItinerary = draft.itinerary.map(item => item.id === current.id ? proposed : item);
    assertDatedCostsRemainRoutable(draft, proposedItinerary);
    entry = touchRecord(current, pickItineraryFields(validated), options);
    draft.itinerary[index] = entry;
  } else {
    entry = validated;
    assertDatedCostsRemainRoutable(draft, [...draft.itinerary, entry]);
    draft.itinerary.push(entry);
  }

  if (entry.travelType === 'standard') {
    draft.routePoints = draft.routePoints.filter(point => point.itineraryId !== entry.id);
    return entry;
  }

  const existing = new Map(draft.routePoints.filter(point => point.itineraryId === entry.id).map(point => [point.id, point]));
  const replacements = validatedPoints.map((point, index) => {
    const requestedId = routePoints[index]?.id;
    const saved = requestedId ? existing.get(requestedId) : null;
    if (!saved) return point;
    return touchRecord(saved, { name:point.name, order:point.order, lat:point.lat, long:point.long, itineraryId:entry.id }, options);
  });
  draft.routePoints = draft.routePoints.filter(point => point.itineraryId !== entry.id).concat(replacements);
  return entry;
}

export function itineraryDeleteBlockers(state, itineraryId) {
  const checks = [
    ['expenses', 'expense'],
    ['reservations', 'reservation'],
    ['checklists', 'checklist record'],
    ['calendarEvents', 'Calendar reminder/note']
  ];
  const blockers = [];
  for (const [collection, label] of checks) {
    const records = state[collection] || [];
    const count = collection === 'expenses'
      ? records.filter(record => costProtectsItinerary(state, record, itineraryId, 'Expense')).length
      : collection === 'reservations'
        ? records.filter(record => costProtectsItinerary(state, record, itineraryId, 'Reservation')).length
        : records.filter(record => record.itineraryId === itineraryId).length;
    if (count) blockers.push({ collection, label, count });
  }
  return blockers;
}

export function deleteItineraryDraft(draft, itineraryId, options = {}) {
  const blockers = itineraryDeleteBlockers(draft, itineraryId);
  if (blockers.length) {
    const summary = blockers.map(item => `${item.count} ${item.label}${item.count === 1 ? '' : 's'}`).join(', ');
    throw new Error(`Cannot delete this itinerary entry while it has linked ${summary}.`);
  }
  const before = draft.itinerary.length;
  draft.itinerary = draft.itinerary.filter(entry => entry.id !== itineraryId);
  if (draft.itinerary.length === before) throw new Error('Itinerary entry not found');
  draft.routePoints = draft.routePoints.filter(point => point.itineraryId !== itineraryId);
  // Journey History supplements are dependent metadata for the itinerary stay and
  // have no independent edit/delete surface. Removing the parent stay must remove
  // those supplements automatically; otherwise a completed stay can become
  // undeletable after every user-editable dependency has already been cleared.
  draft.journeyHistory = (draft.journeyHistory || []).filter(record => record.itineraryId !== itineraryId);
  draft.checklists = (draft.checklists || []).map(item => {
    if (item.listType !== 'permanent' || !Array.isArray(item.completedForItineraryIds) || !item.completedForItineraryIds.includes(itineraryId)) return item;
    return touchRecord(item, { completedForItineraryIds:item.completedForItineraryIds.filter(id => id !== itineraryId) }, options);
  });
  return true;
}

export function setDestinationBudgetDraft(draft, itineraryId, budgetAUD, options = {}) {
  if (typeof budgetAUD === 'boolean' || (budgetAUD != null && typeof budgetAUD === 'object')) throw new Error('Destination budget must be numeric');
  const amount = Number(budgetAUD);
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Destination budget cannot be negative');
  if (amount > Number.MAX_SAFE_INTEGER) throw new Error('Destination budget exceeds the safe numeric range');
  const index = draft.itinerary.findIndex(item => item.id === itineraryId);
  if (index < 0) throw new Error('Itinerary entry not found');
  const current = draft.itinerary[index];
  const linkedCosts = datedCostsLinkedTo(draft, itineraryId);
  if (amount <= 0 && linkedCosts.length) {
    throw new Error('This destination already has dated costs. Remove or move those costs before removing the Destination Budget.');
  }

  const startDate = options.startDate != null ? toISODate(options.startDate) : current.startDate;
  const endDate = options.endDate != null ? toISODate(options.endDate) : current.endDate;
  if (endDate < startDate) throw new Error('End date precedes start date');
  const localCurrency = options.localCurrency !== undefined ? normalizedCurrency(options.localCurrency) : normalizedCurrency(current.localCurrency);
  let fixedLocalPerAUD = options.fixedLocalPerAUD !== undefined ? normalizedRate(options.fixedLocalPerAUD) : normalizedRate(current.fixedLocalPerAUD);
  if(localCurrency === 'AUD') fixedLocalPerAUD = 1;
  assertNotBeforeJourneyStart(draft, startDate);
  if (amount > 0 && (String(localCurrency || '') === 'XXX' || !/^[A-Z]{3}$/.test(String(localCurrency || '')))) throw new Error('A real 3-letter local currency is required before this Destination Budget can be Locked In.');
  if (amount > 0 && (!Number.isFinite(fixedLocalPerAUD) || fixedLocalPerAUD <= 0)) throw new Error('A fixed local-per-AUD exchange rate greater than zero is required before this Destination Budget can be Locked In.');
  if (fixedLocalPerAUD != null && Math.abs(fixedLocalPerAUD) > Number.MAX_SAFE_INTEGER) throw new Error('Exchange rate exceeds the safe numeric range');

  const proposed = { ...current, destinationBudgetAUD:amount, startDate, endDate, localCurrency, fixedLocalPerAUD };
  assertCurrencyRateUnlocked(draft, current, proposed);
  const proposedItinerary = draft.itinerary.map(item => item.id === itineraryId ? proposed : item);
  assertDatedCostsRemainRoutable(draft, proposedItinerary);

  const saved = touchRecord(current, { destinationBudgetAUD:amount, startDate, endDate, localCurrency, fixedLocalPerAUD }, { now:options.now });
  draft.itinerary[index] = saved;
  return saved;
}
