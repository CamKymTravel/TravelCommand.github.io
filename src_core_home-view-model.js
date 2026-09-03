import { findCurrentStay, findNextDestination } from './src_core_planning.js';
import { formatAUDate, stayDayMetrics, stayDurationDays, toISODate } from './src_core_dates.js';
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
  const today = toISODate(currentDate);
  const annualYear = today.slice(0, 4);
  const annual = annualLedger(state, annualYear);
  const destinationRecords = [...(destination.expenses || []), ...(destination.reservations || [])].map(record => ({ ...record, budgetDate:toISODate(record.dateTime || record.date) }));
  const destinationSpentAUD = destinationRecords.filter(record => record.budgetDate <= today).reduce((sum, record) => sum + Number(record.audAmount || 0), 0);
  const destinationCommittedAUD = destinationRecords.filter(record => record.budgetDate > today).reduce((sum, record) => sum + Number(record.audAmount || 0), 0);
  const annualRecords = [
    ...annual.expenses.map(record => ({ ...record, budgetDate:toISODate(record.date) })),
    ...annual.reservations.map(record => ({ ...record, budgetDate:toISODate(record.dateTime || record.date) }))
  ];
  const annualSpentAUD = annualRecords.filter(record => record.budgetDate <= today).reduce((sum, record) => sum + Number(record.audAmount || 0), 0);
  const annualCommittedAUD = annualRecords.filter(record => record.budgetDate > today).reduce((sum, record) => sum + Number(record.audAmount || 0), 0);
  const stayMetrics = currentStay ? stayDayMetrics(currentStay.startDate, currentStay.endDate, currentDate) : null;

  return {
    currentStay: currentStay ? {
      id: currentStay.id,
      title: currentStay.name,
      country: currentStay.country || '',
      startCity: currentStay.startCity || '',
      startCountry: currentStay.startCountry || '',
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
      destinationCommittedAUD,
      destinationRemainingAUD: remainingBudget(currentStay.destinationBudgetAUD, destinationSpentAUD + destinationCommittedAUD)
    } : null,
    nextDestination: nextDestination ? {
      id: nextDestination.id,
      title: nextDestination.name,
      country: nextDestination.country || '',
      startCity: nextDestination.startCity || '',
      startCountry: nextDestination.startCountry || '',
      startDate: nextDestination.startDate,
      endDate: nextDestination.endDate,
      durationDays: stayDurationDays(nextDestination.startDate, nextDestination.endDate),
      travelType: nextDestination.travelType
    } : null,
    annual: {
      year: Number(annualYear),
      budgetAUD: Number(state.settings.annualBudgetAUD || 0),
      spentAUD: annualSpentAUD,
      committedAUD:annualCommittedAUD,
      remainingAUD: remainingBudget(state.settings.annualBudgetAUD, annualSpentAUD),
      afterCommitmentsAUD:remainingBudget(state.settings.annualBudgetAUD, annualSpentAUD + annualCommittedAUD)
    },
    schengen: buildSchengenStatus(state.settings),
    alerts: buildHomeAlerts(state, currentDate),
    upcomingEvents: buildUpcomingEvents(state, currentDate, { limit: options.eventLimit ?? Number.MAX_SAFE_INTEGER }),
    journeyMap: buildJourneyMapModel(state, options.mapYears ?? ['all']),
    searchResults: searchCanonicalState(state, options.searchQuery ?? '', { limit: options.searchLimit ?? 20, currentDate:today })
  };
}
