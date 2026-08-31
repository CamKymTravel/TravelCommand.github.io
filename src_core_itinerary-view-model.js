import { formatAUDate, stayDurationDays, toISODate } from './src_core_dates.js';
import { detectForwardTimelineIssues, filterByTravelYears, sortItinerary, travelYearForDate } from './src_core_planning.js';
import { buildJourneyMapModel } from './src_core_journey-map-model.js';

const dayNumber = value => Math.floor(new Date(`${toISODate(value)}T00:00:00Z`).valueOf() / 86_400_000);

function isCompleted(entry, currentDate) {
  return dayNumber(entry.endDate) < dayNumber(currentDate);
}

function hasAccommodation(state, itineraryId) {
  return (state.reservations || []).some(record =>
    record.itineraryId === itineraryId &&
    record.type === 'accommodation' &&
    record.status !== 'to-book'
  );
}

function routePointCount(state, itineraryId) {
  return (state.routePoints || []).filter(point => point.itineraryId === itineraryId).length;
}

function effectiveJourneyStart(state) {
  return state.settings?.journeyStartDate || sortItinerary(state.itinerary || [])[0]?.startDate || null;
}

function normalizedSearch(query) {
  return String(query || '').trim().toLocaleLowerCase('en-AU');
}

function matchesSearch(entry, query) {
  if (!query) return true;
  const text = [entry.name, entry.country, entry.startCity, entry.travelType]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('en-AU');
  return query.split(/\s+/).filter(Boolean).every(token => text.includes(token));
}

function recordView(entry, state, journeyStartDate) {
  return {
    id: entry.id,
    name: entry.name,
    country: entry.country || '',
    travelType: entry.travelType,
    startCity: entry.startCity || '',
    startDate: entry.startDate,
    endDate: entry.endDate,
    displayDates: `${formatAUDate(entry.startDate)} – ${formatAUDate(entry.endDate)}`,
    days: stayDurationDays(entry.startDate, entry.endDate),
    travelYear: journeyStartDate ? travelYearForDate(entry.startDate, journeyStartDate) : null,
    destinationBudgetAUD: Number(entry.destinationBudgetAUD || 0),
    localCurrency: entry.localCurrency || null,
    fixedLocalPerAUD: entry.fixedLocalPerAUD ?? null,
    routePointCount: routePointCount(state, entry.id),
    hasAccommodation: entry.travelType !== 'standard' || hasAccommodation(state, entry.id)
  };
}

export function calculateForwardCoverage(entries, currentDate) {
  const current = dayNumber(currentDate);
  const relevant = sortItinerary(entries || []).filter(entry => dayNumber(entry.endDate) >= current);
  if (!relevant.length) return { startDate:toISODate(currentDate), endDate:null, horizonDays:0, plannedDays:0, gapDays:0, coveragePercent:0 };

  const lastDay = Math.max(...relevant.map(entry => dayNumber(entry.endDate)));
  const horizonDays = lastDay - current + 1;
  const covered = new Set();
  for (const entry of relevant) {
    const start = Math.max(current, dayNumber(entry.startDate));
    const end = dayNumber(entry.endDate);
    for (let day = start; day <= end; day += 1) covered.add(day);
  }
  const plannedDays = covered.size;
  const gapDays = Math.max(0, horizonDays - plannedDays);
  return {
    startDate: toISODate(currentDate),
    endDate: new Date(lastDay * 86_400_000).toISOString().slice(0, 10),
    horizonDays,
    plannedDays,
    gapDays,
    coveragePercent: horizonDays ? Math.round((plannedDays / horizonDays) * 100) : 0
  };
}

export function buildItineraryViewModel(state, currentDate, options = {}) {
  const all = sortItinerary(state.itinerary || []);
  const journeyStartDate = effectiveJourneyStart(state);
  const searchQuery = normalizedSearch(options.searchQuery);
  const selectedYears = options.mapYears ?? ['all'];
  const yearScoped = filterByTravelYears(all, selectedYears, journeyStartDate);
  const filtered = yearScoped.filter(entry => matchesSearch(entry, searchQuery));
  const currentAndFuture = all.filter(entry => !isCompleted(entry, currentDate));
  const issues = detectForwardTimelineIssues(currentAndFuture, currentDate);
  const upcoming = filtered.filter(entry => !isCompleted(entry, currentDate)).map(entry => recordView(entry, state, journeyStartDate));
  const completed = filtered.filter(entry => isCompleted(entry, currentDate)).sort((a, b) => dayNumber(b.endDate) - dayNumber(a.endDate)).map(entry => recordView(entry, state, journeyStartDate));
  const countries = new Set(all.map(entry => String(entry.country || '').trim()).filter(Boolean));
  const routeTrips = all.filter(entry => entry.travelType === 'motorhome' || entry.travelType === 'cruise');
  const routePoints = state.routePoints || [];
  const missingStays = currentAndFuture.filter(entry => entry.travelType === 'standard' && !hasAccommodation(state, entry.id));

  return {
    journeyStartDate,
    stats: {
      countriesPlanned: countries.size,
      routeTrips: routeTrips.length,
      plannedStops: all.length + routePoints.length,
      unplannedGaps: issues.gaps.length,
      missingStays: missingStays.length,
      dateOverlaps: issues.overlaps.length
    },
    issueDetails: {
      gaps: issues.gaps,
      overlaps: issues.overlaps,
      missingStays: missingStays.map(entry => ({ id:entry.id, name:entry.name }))
    },
    forwardCoverage: calculateForwardCoverage(all, currentDate),
    upcoming,
    completed,
    journeyMap: buildJourneyMapModel(state, options.mapYears ?? ['all'])
  };
}
