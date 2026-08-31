import { createItineraryEntry, createRoutePoint } from './src_core_entities.js';
import { touchRecord } from './src_core_records.js';

const ITINERARY_FIELDS = Object.freeze([
  'name','travelType','startDate','endDate','startCity','country','localCurrency',
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

export function saveItineraryDraft(draft, { entryId = null, fields, routePoints = [] }, options = {}) {
  const validated = createItineraryEntry(fields, options);
  let entry;

  if (entryId) {
    const index = draft.itinerary.findIndex(item => item.id === entryId);
    if (index < 0) throw new Error('Itinerary entry not found');
    entry = touchRecord(draft.itinerary[index], pickItineraryFields(validated), options);
    draft.itinerary[index] = entry;
  } else {
    entry = validated;
    draft.itinerary.push(entry);
  }

  if (entry.travelType === 'standard') {
    draft.routePoints = draft.routePoints.filter(point => point.itineraryId !== entry.id);
    return entry;
  }

  const existing = new Map(draft.routePoints.filter(point => point.itineraryId === entry.id).map(point => [point.id, point]));
  const validatedPoints = validateRoutePoints(entry.id, routePoints, options);
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
    ['journeyHistory', 'Journey History record'],
    ['checklists', 'checklist record']
  ];
  const blockers = [];
  for (const [collection, label] of checks) {
    const count = (state[collection] || []).filter(record => record.itineraryId === itineraryId).length;
    if (count) blockers.push({ collection, label, count });
  }
  return blockers;
}

export function deleteItineraryDraft(draft, itineraryId) {
  const blockers = itineraryDeleteBlockers(draft, itineraryId);
  if (blockers.length) {
    const summary = blockers.map(item => `${item.count} ${item.label}${item.count === 1 ? '' : 's'}`).join(', ');
    throw new Error(`Cannot delete this itinerary entry while it has linked ${summary}.`);
  }
  const before = draft.itinerary.length;
  draft.itinerary = draft.itinerary.filter(entry => entry.id !== itineraryId);
  if (draft.itinerary.length === before) throw new Error('Itinerary entry not found');
  draft.routePoints = draft.routePoints.filter(point => point.itineraryId !== itineraryId);
  draft.calendarEvents = draft.calendarEvents.filter(event => event.itineraryId !== itineraryId);
  return true;
}
