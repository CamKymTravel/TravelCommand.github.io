import { formatAUDate, stayDurationDays, toISODate } from './src_core_dates.js';
import { buildJourneyMapModel } from './src_core_journey-map-model.js';
import { filterByTravelYears, travelYearForDate } from './src_core_planning.js';
import { normalizeTravelYearSelection } from './src_core_year-filters.js';

const EARTH_RADIUS_KM = 6371.0088;

function hasCoordinate(item) {
  return Number.isFinite(Number(item?.lat)) && Number.isFinite(Number(item?.long));
}

function haversineKm(a, b) {
  if (!hasCoordinate(a) || !hasCoordinate(b)) return 0;
  const rad = value => Number(value) * Math.PI / 180;
  const lat1 = rad(a.lat);
  const lat2 = rad(b.lat);
  const deltaLat = lat2 - lat1;
  const deltaLong = rad(b.long) - rad(a.long);
  const sinLat = Math.sin(deltaLat / 2);
  const sinLong = Math.sin(deltaLong / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLong * sinLong;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function effectiveJourneyStart(state, currentDate) {
  if (state.settings?.journeyStartDate) return toISODate(state.settings.journeyStartDate);
  return [...(state.itinerary || [])]
    .map(item => toISODate(item.startDate))
    .filter(date => date <= currentDate)
    .sort()[0] || null;
}

function recordAmount(record) {
  const amount = Number(record?.audAmount ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function linkedSpend(state, itineraryId) {
  return [...(state.expenses || []), ...(state.reservations || [])]
    .filter(record => record.itineraryId === itineraryId)
    .reduce((sum, record) => sum + recordAmount(record), 0);
}

function lifetimeSpend(state, currentDate) {
  const datedExpenses = (state.expenses || []).filter(record => record.date && toISODate(record.date) <= currentDate);
  const datedReservations = (state.reservations || []).filter(record => record.dateTime && toISODate(record.dateTime) <= currentDate);
  return [...datedExpenses, ...datedReservations].reduce((sum, record) => sum + recordAmount(record), 0);
}

function routePath(entry, routePoints) {
  const points = [];
  if (hasCoordinate(entry)) points.push({ lat:Number(entry.lat), long:Number(entry.long), name:entry.name });
  for (const point of routePoints
    .filter(item => item.itineraryId === entry.id && hasCoordinate(item))
    .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))) {
    points.push({ lat:Number(point.lat), long:Number(point.long), name:point.name });
  }
  return points;
}

function explicitKilometres(state, itineraryId) {
  const record = (state.journeyHistory || []).find(item => item.itineraryId === itineraryId);
  const value = Number(record?.kilometresTravelled ?? record?.distanceKm);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function completedRows(state, currentDate, journeyStartDate) {
  const completed = [...(state.itinerary || [])]
    .filter(entry => toISODate(entry.endDate) < currentDate)
    .sort((a, b) => toISODate(a.startDate).localeCompare(toISODate(b.startDate)) || toISODate(a.endDate).localeCompare(toISODate(b.endDate)));

  let previousEndpoint = null;
  const rows = [];
  for (const entry of completed) {
    const path = routePath(entry, state.routePoints || []);
    let computedKm = 0;
    if (previousEndpoint && path[0]) computedKm += haversineKm(previousEndpoint, path[0]);
    for (let index = 1; index < path.length; index += 1) computedKm += haversineKm(path[index - 1], path[index]);
    if (path.length) previousEndpoint = path.at(-1);

    const days = stayDurationDays(entry.startDate, entry.endDate);
    const spendAUD = linkedSpend(state, entry.id);
    const kilometres = explicitKilometres(state, entry.id) ?? computedKm;
    rows.push({
      id:entry.id,
      sourceId:entry.id,
      sourceCollection:'itinerary',
      name:entry.name,
      country:entry.country || '',
      travelType:entry.travelType,
      startDate:entry.startDate,
      endDate:entry.endDate,
      displayDates:`${formatAUDate(entry.startDate)} – ${formatAUDate(entry.endDate)}`,
      travelYear:travelYearForDate(entry.startDate, journeyStartDate),
      days,
      spendAUD,
      averageCostPerDayAUD:days ? spendAUD / days : 0,
      kilometresTravelled:kilometres,
      routePointCount:(state.routePoints || []).filter(point => point.itineraryId === entry.id).length,
      mapped:path.length > 0
    });
  }
  return rows;
}

function uniqueCountries(entries, currentDate) {
  return new Set((entries || [])
    .filter(entry => toISODate(entry.startDate) <= currentDate)
    .map(entry => String(entry.country || '').trim().toLocaleLowerCase('en-AU'))
    .filter(Boolean)).size;
}

function travelledDays(journeyStartDate, currentDate) {
  if (!journeyStartDate || journeyStartDate > currentDate) return 0;
  return stayDurationDays(journeyStartDate, currentDate);
}

function aggregateDestinations(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = `${row.country.trim().toLocaleLowerCase('en-AU')}|${row.name.trim().toLocaleLowerCase('en-AU')}`;
    const current = groups.get(key) || {
      key,
      name:row.name,
      country:row.country,
      visits:0,
      days:0,
      spendAUD:0,
      kilometresTravelled:0
    };
    current.visits += 1;
    current.days += row.days;
    current.spendAUD += row.spendAUD;
    current.kilometresTravelled += row.kilometresTravelled;
    groups.set(key, current);
  }
  return [...groups.values()]
    .map(item => ({ ...item, averageCostPerDayAUD:item.days ? item.spendAUD / item.days : 0 }))
    .sort((a, b) => b.days - a.days || b.spendAUD - a.spendAUD || a.name.localeCompare(b.name));
}

function searchRows(rows, query) {
  const terms = String(query || '').trim().toLocaleLowerCase('en-AU').split(/\s+/).filter(Boolean);
  if (!terms.length) return rows;
  return rows.filter(row => {
    const haystack = `${row.name} ${row.country} ${row.travelType}`.toLocaleLowerCase('en-AU');
    return terms.every(term => haystack.includes(term));
  });
}

function buildHealth(state, rows) {
  const issues = [];
  const missingCountry = rows.filter(row => !row.country).length;
  const missingMap = rows.filter(row => !row.mapped).length;
  const orphanSupplements = (state.journeyHistory || []).filter(record => record.itineraryId && !state.itinerary.some(entry => entry.id === record.itineraryId)).length;
  if (missingCountry) issues.push(`${missingCountry} completed ${missingCountry === 1 ? 'journey is' : 'journeys are'} missing a country.`);
  if (missingMap) issues.push(`${missingMap} completed ${missingMap === 1 ? 'journey has' : 'journeys have'} no mapped coordinates.`);
  if (orphanSupplements) issues.push(`${orphanSupplements} Journey History ${orphanSupplements === 1 ? 'record references' : 'records reference'} a missing itinerary entry.`);
  return { status:issues.length ? 'needs-attention' : 'verified', issues };
}

export function buildJourneyHistoryViewModel(state, currentDate, options = {}) {
  const today = toISODate(currentDate);
  const journeyStartDate = effectiveJourneyStart(state, today);
  const allRows = completedRows(state, today, journeyStartDate);
  const selectedYears = normalizeTravelYearSelection(options.years || ['all']);
  const yearFilteredEntries = filterByTravelYears(
    allRows.map(row => ({ ...row, startDate:row.startDate, endDate:row.endDate })),
    selectedYears,
    journeyStartDate
  );
  const allowedIds = new Set(yearFilteredEntries.map(row => row.id));
  const filteredRows = searchRows(allRows.filter(row => allowedIds.has(row.id)), options.searchQuery).sort((a, b) => b.endDate.localeCompare(a.endDate));
  const completedState = {
    ...state,
    itinerary:(state.itinerary || []).filter(entry => allRows.some(row => row.id === entry.id)),
    routePoints:(state.routePoints || []).filter(point => allRows.some(row => row.id === point.itineraryId))
  };
  const journeyMap = buildJourneyMapModel(completedState, selectedYears);

  const days = travelledDays(journeyStartDate, today);
  return {
    today,
    journeyStartDate,
    selectedYears,
    summary:{
      countriesVisited:uniqueCountries(state.itinerary || [], today),
      destinationsCompleted:allRows.length,
      daysTravelled:days,
      yearsOnRoad:days ? Math.round((days / 365.2425) * 10) / 10 : 0,
      lifetimeTravelSpendAUD:lifetimeSpend(state, today)
    },
    rows:filteredRows,
    destinationTotals:aggregateDestinations(filteredRows),
    totalSpendAUD:filteredRows.reduce((sum, row) => sum + row.spendAUD, 0),
    totalKilometres:filteredRows.reduce((sum, row) => sum + row.kilometresTravelled, 0),
    journeyMap,
    health:buildHealth(state, allRows)
  };
}
