import { availableTravelYears, filterByTravelYears, sortItinerary } from './src_core_planning.js';
import { normalizeTravelYearSelection } from './src_core_year-filters.js';

function routeOrder(point) {
  return Number(point.order ?? point.sequence ?? 0);
}

function effectiveJourneyStartDate(state) {
  if (state.settings?.journeyStartDate) return state.settings.journeyStartDate;
  return sortItinerary(state.itinerary || [])[0]?.startDate || null;
}

export function buildJourneyMapModel(state, years = ['all'], options = {}) {
  const journeyStartDate = effectiveJourneyStartDate(state);
  const selectedYears = normalizeTravelYearSelection(years);
  const itinerary = sortItinerary(filterByTravelYears(state.itinerary, selectedYears, journeyStartDate));
  // Keep route continuity tied to the canonical itinerary, not merely to the
  // currently visible filter. Without this, selecting non-contiguous years (or
  // a single travel type in Journey History) can fabricate a direct line across
  // hidden stays. Callers that pre-filter state.itinerary may provide the wider
  // continuity itinerary explicitly.
  const continuityItinerary = sortItinerary(options.continuityItinerary || state.itinerary || []);
  const continuityIndex = new Map(continuityItinerary.map((entry, index) => [entry.id, index]));
  const allowedIds = new Set(itinerary.map(entry => entry.id));
  const routePoints = (state.routePoints || [])
    .filter(point => allowedIds.has(point.itineraryId))
    .sort((a, b) => String(a.itineraryId).localeCompare(String(b.itineraryId)) || routeOrder(a) - routeOrder(b));

  return {
    years: selectedYears,
    availableYears: availableTravelYears(state.itinerary || [], journeyStartDate, { minimum: 4 }),
    journeyStartDate,
    stays: itinerary.map((entry, index) => {
      const previous = index > 0 ? itinerary[index - 1] : null;
      const previousIndex = previous ? continuityIndex.get(previous.id) : null;
      const currentIndex = continuityIndex.get(entry.id);
      const breakBefore = previous != null && (previousIndex == null || currentIndex == null || currentIndex !== previousIndex + 1);
      return {
      id: entry.id,
      name: entry.name,
      country: entry.country || '',
      travelType: entry.travelType,
      startDate: entry.startDate,
      endDate: entry.endDate,
      startCity: entry.startCity || '',
      lat: entry.lat ?? null,
      long: entry.long ?? null,
      breakBefore
    };
    }),
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
