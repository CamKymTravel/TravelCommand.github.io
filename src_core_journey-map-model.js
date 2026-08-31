import { availableTravelYears, filterByTravelYears, sortItinerary } from './src_core_planning.js';
import { normalizeTravelYearSelection } from './src_core_year-filters.js';

function routeOrder(point) {
  return Number(point.order ?? point.sequence ?? 0);
}

function effectiveJourneyStartDate(state) {
  if (state.settings?.journeyStartDate) return state.settings.journeyStartDate;
  return sortItinerary(state.itinerary || [])[0]?.startDate || null;
}

export function buildJourneyMapModel(state, years = ['all']) {
  const journeyStartDate = effectiveJourneyStartDate(state);
  const selectedYears = normalizeTravelYearSelection(years);
  const itinerary = sortItinerary(filterByTravelYears(state.itinerary, selectedYears, journeyStartDate));
  const allowedIds = new Set(itinerary.map(entry => entry.id));
  const routePoints = (state.routePoints || [])
    .filter(point => allowedIds.has(point.itineraryId))
    .sort((a, b) => String(a.itineraryId).localeCompare(String(b.itineraryId)) || routeOrder(a) - routeOrder(b));

  return {
    years: selectedYears,
    availableYears: availableTravelYears(state.itinerary || [], journeyStartDate, { minimum: 4 }),
    journeyStartDate,
    stays: itinerary.map(entry => ({
      id: entry.id,
      name: entry.name,
      country: entry.country || '',
      travelType: entry.travelType,
      startDate: entry.startDate,
      endDate: entry.endDate,
      startCity: entry.startCity || '',
      lat: entry.lat ?? null,
      long: entry.long ?? null
    })),
    routePoints: routePoints.map(point => ({
      id: point.id,
      itineraryId: point.itineraryId,
      name: point.name || point.label || '',
      lat: point.lat ?? null,
      long: point.long ?? point.lng ?? null,
      order: routeOrder(point)
    }))
  };
}
