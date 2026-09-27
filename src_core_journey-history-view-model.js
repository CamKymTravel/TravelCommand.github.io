import { formatAUDate, stayDurationDays, toISODate } from './src_core_dates.js';
import { buildJourneyMapModel } from './src_core_journey-map-model.js';
import { availableTravelYears, filterByTravelYears, travelYearForDate, travelYearsForRange } from './src_core_planning.js';
import { normalizeTravelYearSelection } from './src_core_year-filters.js';
import { canonicalCountrySlug } from './src_core_entities.js';
import { countryForOfflinePlace } from './src_core_coordinates.js';
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

function reservationBudgetScope(record) {
  return record?.budgetScope || (record?.type === 'ticket' ? 'destination' : 'annual');
}

function dayNumber(value) {
  return Math.floor(Date.parse(`${toISODate(value)}T00:00:00Z`) / 86_400_000);
}

function transitArrivalStayId(state, record) {
  if (!record?.dateTime || !['flight','train','cruise','rv'].includes(record.type)) return null;
  const date = toISODate(record.dateTime);
  const dateDay = dayNumber(date);
  const candidates = (state.itinerary || [])
    .map(entry => ({ entry, delta:dayNumber(entry.startDate) - dateDay }))
    .filter(item => item.delta >= 0 && item.delta <= 1)
    .sort((a,b) => a.delta - b.delta || toISODate(a.entry.startDate).localeCompare(toISODate(b.entry.startDate)));
  if (!candidates.length) return null;
  const bestDelta = candidates[0].delta;
  const best = candidates.filter(item => item.delta === bestDelta);
  return best.length === 1 ? best[0].entry.id : null;
}

function costsForStay(state, entry) {
  const livingExpenses = (state.expenses || []).filter(record => record.itineraryId === entry.id && record.budgetScope !== 'annual' && !record.needsBudgetRepair);
  const destinationReservations = (state.reservations || []).filter(record => record.itineraryId === entry.id && reservationBudgetScope(record) === 'destination' && record.status !== 'to-book' && !record.needsBudgetRepair);
  const annualReservations = (state.reservations || []).filter(record => {
    if (reservationBudgetScope(record) !== 'annual' || record.status === 'to-book' || record.needsBudgetRepair) return false;
    if (record.itineraryId === entry.id) return true;
    if (record.itineraryId) return false;
    return transitArrivalStayId(state, record) === entry.id;
  });
  const livingCostAUD = [...livingExpenses, ...destinationReservations].reduce((sum, record) => sum + recordAmount(record), 0);
  const travelAndStayCostAUD = annualReservations.reduce((sum, record) => sum + recordAmount(record), 0);
  return {
    livingCostAUD,
    travelAndStayCostAUD,
    totalCostAUD:livingCostAUD + travelAndStayCostAUD,
    attributedReservationIds:annualReservations.map(record => record.id)
  };
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
    const routeTrip = entry.travelType === 'cruise' || entry.travelType === 'motorhome' || entry.travelType === 'rv';
    if (!routeTrip && previousEndpoint && path[0]) computedKm += haversineKm(previousEndpoint, path[0]);
    for (let index = 1; index < path.length; index += 1) computedKm += haversineKm(path[index - 1], path[index]);
    // A missing mapped stay breaks route continuity. Do not carry an older
    // endpoint across it and fabricate a direct leg to a later mapped stay.
    previousEndpoint = path.length ? path.at(-1) : null;

    const days = stayDurationDays(entry.startDate, entry.endDate);
    const costs = costsForStay(state, entry);
    const kilometres = explicitKilometres(state, entry.id) ?? computedKm;
    const travelYears=travelYearsForRange(entry.startDate,entry.endDate,journeyStartDate);
    const firstTravelYear=travelYears[0]??null, lastTravelYear=travelYears.at(-1)??firstTravelYear;
    const routeCountries=routeTrip ? routeCountriesForEntry(entry,state.routePoints||[]) : [];
    const routeCountrySummary=routeCountries.join(' → ');
    rows.push({
      id:entry.id,
      sourceId:entry.id,
      sourceCollection:'itinerary',
      name:entry.name,
      country:routeTrip ? (routeCountrySummary || departureCountry(entry) || entry.country || '') : (entry.country || ''),
      flagCountry:routeTrip ? (departureCountry(entry) || entry.country || '') : (entry.country || entry.startCountry || ''),
      routeCountries,
      routeCountrySummary,
      travelType:entry.travelType,
      startDate:entry.startDate,
      endDate:entry.endDate,
      displayDates:`${formatAUDate(entry.startDate)} – ${formatAUDate(entry.endDate)}`,
      travelYear:firstTravelYear,
      travelYearEnd:lastTravelYear,
      travelYearLabel:firstTravelYear?(lastTravelYear>firstTravelYear?`Years ${firstTravelYear}–${lastTravelYear}`:`Year ${firstTravelYear}`):null,
      days,
      livingCostAUD:costs.livingCostAUD,
      travelAndStayCostAUD:costs.travelAndStayCostAUD,
      totalCostAUD:costs.totalCostAUD,
      livingCostPerDayAUD:days ? costs.livingCostAUD / days : 0,
      allInCostPerDayAUD:days ? costs.totalCostAUD / days : 0,
      attributedReservationIds:costs.attributedReservationIds,
      // Compatibility aliases retained for older render/test surfaces.
      spendAUD:costs.totalCostAUD,
      averageCostPerDayAUD:days ? costs.livingCostAUD / days : 0,
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
function countryKey(value) {
  const raw=comparisonText(value);
  if(!raw || REGION_LABELS.has(raw)) return '';
  return canonicalCountrySlug(value);
}
function routeCountryParts(value) {
  return String(value || '').split(/\s*(?:\/|→|->|,)\s*/).map(countryKey).filter(Boolean);
}

function routeCountriesForEntry(entry, routePoints = []) {
  const seen=new Set();
  const countries=[];
  const add=value=>{
    const key=countryKey(value);
    if(!key || seen.has(key)) return;
    seen.add(key);
    countries.push(countryDisplayName(key));
  };
  add(departureCountry(entry));
  for(const point of routePoints.filter(item=>item.itineraryId===entry.id).sort((a,b)=>Number(a.order??0)-Number(b.order??0))) {
    add(countryForOfflinePlace(point.name));
  }
  if(countries.length<=1) for(const key of routeCountryParts(entry.country)) add(key);
  return countries;
}

function visitedCountryKeys(entries, routePoints, currentDate) {
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
        : routeCountriesForEntry(entry,routePoints))
      : [countryKey(entry.country)].filter(Boolean);
    for(const country of credited){ const key=countryKey(country); if(key) visited.add(key); }
  }
  return visited;
}

function countryDisplayName(key) {
  // canonicalCountrySlug() deliberately returns machine-safe hyphenated keys
  // (for example united-kingdom). Expanded Journey History must show a human
  // country label, never the internal slug.
  return String(key || '').replace(/[-_]+/g, ' ').split(/\s+/).filter(Boolean).map((part,index)=>{ const lower=part.toLocaleLowerCase('en-AU'); if(index>0&&['and','of','the'].includes(lower)) return lower; return lower.charAt(0).toLocaleUpperCase('en-AU')+lower.slice(1); }).join(' ');
}

function uniqueCountries(entries, routePoints, currentDate) {
  return visitedCountryKeys(entries,routePoints,currentDate).size;
}


function mergedTravelSpans(state, journeyStartDate, currentDate) {
  if (!journeyStartDate || journeyStartDate > currentDate) return [];
  const DAY=86400000;
  const ms=value=>Date.parse(`${toISODate(value)}T00:00:00Z`);
  const floor=ms(journeyStartDate), ceiling=ms(currentDate);
  const spans=(state.itinerary || []).map(entry=>[Math.max(floor,ms(entry.startDate)),Math.min(ceiling,ms(entry.endDate))]).filter(([a,b])=>a<=b).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  if(!spans.length) return [];
  const merged=[];
  let [start,end]=spans[0];
  for(const [a,b] of spans.slice(1)){
    if(a<=end+DAY){ end=Math.max(end,b); continue; }
    merged.push([start,end]); [start,end]=[a,b];
  }
  merged.push([start,end]);
  return merged;
}

function travelledDays(state, journeyStartDate, currentDate) {
  if (!journeyStartDate || journeyStartDate > currentDate) return 0;
  const DAY=86400000;
  const start=Date.parse(`${toISODate(journeyStartDate)}T00:00:00Z`);
  const end=Date.parse(`${toISODate(currentDate)}T00:00:00Z`);
  // Journey age is a continuous clock from Journey Start. It must not shrink
  // because an itinerary has a gap or a Home Visit between travelling stays.
  return Math.floor((end-start)/DAY)+1;
}

function travelledDaysByYear(state, journeyStartDate, currentDate) {
  if (!journeyStartDate || journeyStartDate > currentDate) return [];
  const DAY=86400000;
  const start=Date.parse(`${toISODate(journeyStartDate)}T00:00:00Z`);
  const end=Date.parse(`${toISODate(currentDate)}T00:00:00Z`);
  const counts=new Map();
  for(let cursor=start;cursor<=end;cursor+=DAY){
    const date=new Date(cursor).toISOString().slice(0,10);
    const year=travelYearForDate(date,journeyStartDate);
    if(year&&year>0)counts.set(year,(counts.get(year)||0)+1);
  }
  return [...counts.entries()].sort((a,b)=>a[0]-b[0]).map(([year,days])=>({year,days}));
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
      flagCountry:row.flagCountry || row.country,
      visits:0,
      days:0,
      livingCostAUD:0,
      totalCostAUD:0,
      spendAUD:0,
      kilometresTravelled:0
    };
    current.visits += 1;
    current.days += row.days;
    current.livingCostAUD += Number(row.livingCostAUD||0);
    current.totalCostAUD += Number(row.totalCostAUD||0);
    current.spendAUD = current.totalCostAUD;
    current.kilometresTravelled += row.kilometresTravelled;
    groups.set(key, current);
  }
  return [...groups.values()]
    .map(item => ({ ...item, livingCostPerDayAUD:item.days ? item.livingCostAUD / item.days : 0, allInCostPerDayAUD:item.days ? item.totalCostAUD / item.days : 0, averageCostPerDayAUD:item.days ? item.livingCostAUD / item.days : 0 }))
    // Destination Totals is the compact retrospective "top destinations by spend"
    // widget from the approved Journey History reference. Keep spend authoritative,
    // then use days/name only as deterministic tie-breakers.
    .sort((a, b) => b.livingCostAUD - a.livingCostAUD || b.totalCostAUD - a.totalCostAUD || b.days - a.days || a.name.localeCompare(b.name));
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
  const completedIds = new Set(allRows.map(row => row.id));
  const journeyMap = buildJourneyMapModel(completedState, selectedYears, {
    continuityItinerary:(state.itinerary || []).filter(entry => completedIds.has(entry.id))
  });
  journeyMap.availableYears = availableTravelYears(allRows, journeyStartDate, { minimum:30 });

  const days = travelledDays(state, journeyStartDate, today);
  return {
    today,
    journeyStartDate,
    selectedYears,
    selectedType,
    summary:{
      countriesVisited:uniqueCountries(state.itinerary || [], state.routePoints || [], today),
      destinationsCompleted:allRows.length,
      daysTravelled:days,
      yearsOnRoad:days ? Math.round((days / 365.2425) * 10) / 10 : 0,
      lifetimeTravelSpendAUD:lifetimeSpend(state, today)
    },
    visitedCountries:[...visitedCountryKeys(state.itinerary || [], state.routePoints || [], today)].map(key=>({key,name:countryDisplayName(key)})).sort((a,b)=>a.name.localeCompare(b.name,'en-AU')),
    travelledDaysByYear:travelledDaysByYear(state,journeyStartDate,today),
    rows:filteredRows,
    destinationTotals:aggregateDestinations(filteredRows),
    totalLivingCostAUD:filteredRows.reduce((sum, row) => sum + Number(row.livingCostAUD||0), 0),
    totalCostAUD:filteredRows.reduce((sum, row) => sum + Number(row.totalCostAUD||0), 0),
    totalSpendAUD:filteredRows.reduce((sum, row) => sum + Number(row.totalCostAUD||0), 0),
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
