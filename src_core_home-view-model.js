import { findCurrentStay, findNextDestination } from './src_core_planning.js';
import { formatAUDate, stayDayMetrics } from './src_core_dates.js';
import { remainingBudget } from './src_core_budget.js';
import { annualLedger, destinationLedger } from './src_core_budget-ledger.js';
import { buildHomeAlerts } from './src_core_home-alerts.js';
import { buildUpcomingEvents } from './src_core_upcoming-events.js';
import { searchCanonicalState } from './src_core_global-search.js';
import { buildJourneyMapModel } from './src_core_journey-map-model.js';
import { buildSchengenStatus } from './src_core_schengen.js';


export function buildHomeViewModel(state, currentDate, options = {}) {
  const currentStay = findCurrentStay(state.itinerary, currentDate);
  const nextDestination = findNextDestination(state.itinerary, currentDate);
  const destination = currentStay ? destinationLedger(state, currentStay.id) : { spentAUD:0 };
  const annualYear = String(currentDate).slice(0, 4);
  const annual = annualLedger(state, annualYear);
  const destinationSpentAUD = destination.spentAUD;
  const annualSpentAUD = annual.spentAUD;
  const stayMetrics = currentStay ? stayDayMetrics(currentStay.startDate, currentStay.endDate, currentDate) : null;

  return {
    currentStay: currentStay ? {
      id: currentStay.id,
      title: currentStay.name,
      country: currentStay.country || '',
      travelType: currentStay.travelType,
      dates: `${formatAUDate(currentStay.startDate)} – ${formatAUDate(currentStay.endDate)}`,
      startDate: currentStay.startDate,
      endDate: currentStay.endDate,
      progress: stayMetrics.progress,
      currentDay: stayMetrics.currentDay,
      totalDays: stayMetrics.totalDays,
      remainingDays: stayMetrics.remainingDays,
      localCurrency: currentStay.localCurrency ?? null,
      fixedLocalPerAUD: currentStay.fixedLocalPerAUD ?? null,
      destinationBudgetAUD: Number(currentStay.destinationBudgetAUD || 0),
      destinationSpentAUD,
      destinationRemainingAUD: remainingBudget(currentStay.destinationBudgetAUD, destinationSpentAUD)
    } : null,
    nextDestination: nextDestination ? {
      id: nextDestination.id,
      title: nextDestination.name,
      country: nextDestination.country || '',
      startDate: formatAUDate(nextDestination.startDate),
      travelType: nextDestination.travelType
    } : null,
    annual: {
      year: Number(annualYear),
      budgetAUD: Number(state.settings.annualBudgetAUD || 0),
      spentAUD: annualSpentAUD,
      remainingAUD: remainingBudget(state.settings.annualBudgetAUD, annualSpentAUD)
    },
    schengen: buildSchengenStatus(state.settings),
    alerts: buildHomeAlerts(state.alerts, { limit: options.alertLimit ?? 6 }),
    upcomingEvents: buildUpcomingEvents(state, currentDate, { limit: options.eventLimit ?? 8 }),
    journeyMap: buildJourneyMapModel(state, options.mapYears ?? ['all']),
    searchResults: searchCanonicalState(state, options.searchQuery ?? '', { limit: options.searchLimit ?? 20 })
  };
}
