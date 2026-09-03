import { formatAUDate, stayDurationDays, toISODate } from './src_core_dates.js';
import { buildJourneyMapModel } from './src_core_journey-map-model.js';
import { availableTravelYears, filterByTravelYears, travelYearForDate } from './src_core_planning.js';
import { normalizeTravelYearSelection } from './src_core_year-filters.js';
const comparisonText=value=>String(value??'').normalize('NFC').trim().toLocaleLowerCase('en-AU');

const EARTH_RADIUS_KM = 6371.0088;

function coordinateNumber(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return NaN;
}

function hasCoordinate(item) {
  const lat = coordinateNumber(item?.lat);
  const long = coordinateNumber(item?.long);
  return Number.isFinite(lat) && lat >= -90 && lat <= 90 && Number.isFinite(long) && long >= -180 && long <= 180;
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
  const expenses=(state.expenses || []).filter(record => record.itineraryId === itineraryId && !record.needsBudgetRepair);
  const reservations=(state.reservations || []).filter(record => record.itineraryId === itineraryId && record.status !== 'to-book' && !record.needsBudgetRepair);
  return [...expenses, ...reservations].reduce((sum, record) => sum + recordAmount(record), 0);
}

function lifetimeSpend(state, currentDate) {
  const datedExpenses = (state.expenses || []).filter(record => !record.needsBudgetRepair && record.date && toISODate(record.date) <= currentDate);
  const datedReservations = (state.reservations || []).filter(record => !record.needsBudgetRepair && record.status !== 'to-book' && record.dateTime && toISODate(record.dateTime) <= currentDate);
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
  const records = (state.journeyHistory || [])
    .filter(item => item.itineraryId === itineraryId)
    .sort((a, b) => String(b.modifiedAt || b.createdAt || '').localeCompare(String(a.modifiedAt || a.createdAt || '')) || String(b.id || '').localeCompare(String(a.id || '')));
  const record = records[0];
  const raw = record?.kilometresTravelled ?? record?.distanceKm;
  if (raw == null || raw === '') return null;
  const value = Number(raw);
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
    // A missing mapped stay breaks route continuity. Do not carry an older
    // endpoint across it and fabricate a direct leg to a later mapped stay.
    previousEndpoint = path.length ? path.at(-1) : null;

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

function departureCountry(entry) {
  const explicit=String(entry?.startCountry || '').trim();
  if(explicit) return explicit;
  const city=comparisonText(entry?.startCity);
  const cityCountries={london:'United Kingdom',munich:'Germany',rome:'Italy',miami:'United States',nashville:'United States',dallas:'United States','los angeles':'United States','new york':'United States',amsterdam:'Netherlands'};
  const inferred=String(entry?.country || '').split(/\s*(?:\/|→|->|,)\s*/)[0].trim();
  return cityCountries[city] || (REGION_LABELS.has(comparisonText(inferred)) ? '' : inferred);
}

const REGION_LABELS=new Set(['caribbean','europe','asia','africa','north america','south america','central america','middle east','mediterranean','baltic','scandinavia','united kingdom / europe','world']);
const COUNTRY_ALIASES=new Map([
  ['uk','united kingdom'],['u.k.','united kingdom'],['united kingdom','united kingdom'],
  ['usa','united states'],['u.s.a.','united states'],['us','united states'],['u.s.','united states'],['united states of america','united states'],['united states','united states'],
  ['türkiye','turkey'],['turkiye','turkey'],['turkey','turkey'],
  ['czechia','czech republic'],['czech republic','czech republic'],
  ['uae','united arab emirates'],['u.a.e.','united arab emirates'],['united arab emirates','united arab emirates']
]);
function countryKey(value) {
  const raw=comparisonText(value);
  if(!raw || REGION_LABELS.has(raw)) return '';
  return COUNTRY_ALIASES.get(raw) || raw;
}
function routeCountryParts(value) {
  return String(value || '').split(/\s*(?:\/|→|->|,)\s*/).map(countryKey).filter(Boolean);
}

function uniqueCountries(entries, currentDate) {
  const visited=new Set();
  for(const entry of entries || []){
    const start=toISODate(entry.startDate), end=toISODate(entry.endDate);
    if(start>currentDate) continue;
    const route=entry.travelType==='cruise'||entry.travelType==='motorhome'||entry.travelType==='rv';
    // Standard stays represent exactly one country, even when an official name
    // contains a comma. Completed route trips may legitimately credit multiple
    // countries from their composite route label; active route trips credit only
    // the explicit departure country until the route is completed.
    const credited=route
      ? (end>=currentDate
        ? [departureCountry(entry)]
        : [departureCountry(entry), ...routeCountryParts(entry.country)])
      : [countryKey(entry.country)].filter(Boolean);
    for(const country of credited){ const key=countryKey(country); if(key) visited.add(key); }
  }
  return visited.size;
}

function travelledDays(state, journeyStartDate, currentDate) {
  if (!journeyStartDate || journeyStartDate > currentDate) return 0;
  const DAY=86400000;
  const ms=value=>Date.parse(`${toISODate(value)}T00:00:00Z`);
  const floor=ms(journeyStartDate), ceiling=ms(currentDate);
  const spans=(state.itinerary || []).map(entry=>[Math.max(floor,ms(entry.startDate)),Math.min(ceiling,ms(entry.endDate))]).filter(([a,b])=>a<=b).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  if(!spans.length) return 0;
  let total=0,[start,end]=spans[0];
  for(const [a,b] of spans.slice(1)){
    if(a<=end+DAY){ end=Math.max(end,b); continue; }
    total+=Math.floor((end-start)/DAY)+1; [start,end]=[a,b];
  }
  return total+Math.floor((end-start)/DAY)+1;
}

function aggregateDestinations(rows) {
  const groups = new Map();
  for (const row of rows) {
    const rawCountry=comparisonText(row.country);
    const key = `${countryKey(row.country) || rawCountry}|${comparisonText(row.name)}`;
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
    // Destination Totals is the compact retrospective "top destinations by spend"
    // widget from the approved Journey History reference. Keep spend authoritative,
    // then use days/name only as deterministic tie-breakers.
    .sort((a, b) => b.spendAUD - a.spendAUD || b.days - a.days || a.name.localeCompare(b.name));
}

function searchRows(rows, query) {
  const terms = comparisonText(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return rows;
  return rows.filter(row => {
    const haystack = comparisonText(`${row.name} ${row.country} ${row.travelType}`);
    return terms.every(term => haystack.includes(term));
  });
}

function buildHealth(state, rows) {
  const issues = [];
  const missingCountry = rows.filter(row => !row.country).length;
  const missingMap = rows.filter(row => !row.mapped).length;
  const orphanSupplements = (state.journeyHistory || []).filter(record => record.itineraryId && !state.itinerary.some(entry => entry.id === record.itineraryId)).length;
  const supplementCounts = new Map();
  for (const record of state.journeyHistory || []) {
    if (!record.itineraryId) continue;
    supplementCounts.set(record.itineraryId, (supplementCounts.get(record.itineraryId) || 0) + 1);
  }
  const duplicateSupplements = [...supplementCounts.values()].filter(count => count > 1).length;
  if (missingCountry) issues.push(`${missingCountry} completed ${missingCountry === 1 ? 'journey is' : 'journeys are'} missing a country.`);
  if (missingMap) issues.push(`${missingMap} completed ${missingMap === 1 ? 'journey has' : 'journeys have'} no mapped coordinates.`);
  if (orphanSupplements) issues.push(`${orphanSupplements} Journey History ${orphanSupplements === 1 ? 'record references' : 'records reference'} a missing itinerary entry.`);
  if (duplicateSupplements) issues.push(`${duplicateSupplements} ${duplicateSupplements === 1 ? 'stay has' : 'stays have'} multiple Journey History supplement records.`);
  return { status:issues.length ? 'needs-attention' : 'verified', issues };
}

export function buildJourneyHistoryViewModel(state, currentDate, options = {}) {
  const today = toISODate(currentDate);
  const journeyStartDate = effectiveJourneyStart(state, today);
  const allRows = completedRows(state, today, journeyStartDate);
  const selectedYears = normalizeTravelYearSelection(options.years || ['all']);
  const selectedType = ['standard', 'motorhome', 'cruise'].includes(options.travelType) ? options.travelType : 'all';
  const yearFilteredEntries = filterByTravelYears(
    allRows.map(row => ({ ...row, startDate:row.startDate, endDate:row.endDate })),
    selectedYears,
    journeyStartDate
  );
  const allowedIds = new Set(yearFilteredEntries.map(row => row.id));
  const typeFilteredRows = allRows.filter(row => allowedIds.has(row.id) && (selectedType === 'all' || row.travelType === selectedType));
  const filteredRows = searchRows(typeFilteredRows, options.searchQuery).sort((a, b) => b.endDate.localeCompare(a.endDate));
  const mapAllowedIds = new Set(typeFilteredRows.map(row => row.id));
  const completedState = {
    ...state,
    itinerary:(state.itinerary || []).filter(entry => mapAllowedIds.has(entry.id)),
    routePoints:(state.routePoints || []).filter(point => mapAllowedIds.has(point.itineraryId))
  };
  const journeyMap = buildJourneyMapModel(completedState, selectedYears);
  journeyMap.availableYears = availableTravelYears(allRows, journeyStartDate, { minimum:4 });

  const days = travelledDays(state, journeyStartDate, today);
  return {
    today,
    journeyStartDate,
    selectedYears,
    selectedType,
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
    mapStats:{
      journeys:typeFilteredRows.length,
      stays:typeFilteredRows.filter(row => row.travelType === 'standard').length,
      motorhome:typeFilteredRows.filter(row => row.travelType === 'motorhome').length,
      cruise:typeFilteredRows.filter(row => row.travelType === 'cruise').length,
      detailedRoutePoints:journeyMap.routePoints.length,
      recordedKilometres:typeFilteredRows.reduce((sum, row) => sum + row.kilometresTravelled, 0)
    },
    health:buildHealth(state, allRows)
  };
}
