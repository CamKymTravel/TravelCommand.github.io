import { findCurrentStay } from './src_core_planning.js';
import { formatAUDate, toISODate, stayDayMetrics } from './src_core_dates.js';
import { audToLocal } from './src_core_currency.js';
import { forecastAnnualSpend, remainingBudget } from './src_core_budget.js';
import { annualLedger, destinationLedger } from './src_core_budget-ledger.js';
import { EXPENSE_CATEGORIES } from './src_core_schema.js';

const dayNumber = value => Math.floor(new Date(`${toISODate(value)}T00:00:00Z`).valueOf() / 86_400_000);

function yearMetrics(currentDate) {
  const date = toISODate(currentDate);
  const year = Number(date.slice(0, 4));
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  const elapsedDays = dayNumber(date) - dayNumber(start) + 1;
  const daysInYear = dayNumber(end) - dayNumber(start) + 1;
  return { year, elapsedDays, daysInYear, progress:Math.round((elapsedDays / daysInYear) * 100) };
}

function categoryTotals(expenses) {
  const totals = Object.fromEntries(EXPENSE_CATEGORIES.map(category => [category, 0]));
  for (const expense of expenses || []) {
    if (Object.hasOwn(totals, expense.category)) totals[expense.category] += Number(expense.audAmount || 0);
  }
  return totals;
}

function periodCategorySummary(expenses, prefix) {
  const records = (expenses || []).filter(record => String(record.date || '').startsWith(prefix));
  const totals = categoryTotals(records);
  return {
    totals,
    totalAUD:Object.values(totals).reduce((sum, value) => sum + Number(value || 0), 0),
    count:records.length
  };
}

function destinationPace(stay, spentAUD, currentDate) {
  if (!stay) return null;
  const days = stayDayMetrics(stay.startDate, stay.endDate, currentDate);
  const budgetAUD = Number(stay.destinationBudgetAUD || 0);
  const averageSpendPerDayAUD = days.currentDay > 0 ? Number(spentAUD || 0) / days.currentDay : 0;
  const plannedDailyBudgetAUD = days.totalDays > 0 ? budgetAUD / days.totalDays : 0;
  const remainingAUD = budgetAUD - Number(spentAUD || 0);
  const remainingDailyBudgetAUD = days.remainingDays > 0 ? remainingAUD / days.remainingDays : remainingAUD;
  const forecastSpendAUD = averageSpendPerDayAUD * days.totalDays;
  return {
    ...days,
    averageSpendPerDayAUD,
    plannedDailyBudgetAUD,
    remainingDailyBudgetAUD,
    forecastSpendAUD,
    forecastVarianceAUD:budgetAUD - forecastSpendAUD,
    forecastStatus:forecastSpendAUD > budgetAUD ? 'over' : 'under'
  };
}

function recentExpenses(expenses, limit = 8) {
  return [...(expenses || [])]
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.modifiedAt || '').localeCompare(String(a.modifiedAt || '')))
    .slice(0, limit)
    .map(record => ({
      id:record.id,
      itineraryId:record.itineraryId || null,
      date:record.date,
      displayDate:formatAUDate(record.date),
      category:record.category,
      allocation:record.allocation,
      description:record.description || '',
      originalCurrency:record.originalCurrency || 'AUD',
      originalAmount:Number(record.originalAmount || 0),
      audAmount:Number(record.audAmount || 0)
    }));
}

function accountSummary(accounts) {
  const records = (accounts || []).map(account => ({
    id:account.id,
    name:account.name || account.label || 'Account',
    currency:account.currency || 'AUD',
    balance:Number(account.balance ?? account.amount ?? 0)
  }));
  const audTotal = records.filter(account => account.currency === 'AUD').reduce((sum, account) => sum + account.balance, 0);
  return { records, audTotal };
}

export function buildBudgetViewModel(state, currentDate, options = {}) {
  const stay = findCurrentStay(state.itinerary || [], currentDate);
  const annualTime = yearMetrics(currentDate);
  const annual = annualLedger(state, annualTime.year);
  const annualBudgetAUD = Number(state.settings?.annualBudgetAUD || 0);
  const annualRemainingAUD = remainingBudget(annualBudgetAUD, annual.spentAUD);
  const forecastAUD = forecastAnnualSpend({ spent:annual.spentAUD, elapsedDays:annualTime.elapsedDays, daysInYear:annualTime.daysInYear });

  const destination = stay ? destinationLedger(state, stay.id) : { expenses:[], reservations:[], spentAUD:0 };
  const destinationBudgetAUD = Number(stay?.destinationBudgetAUD || 0);
  const destinationRemainingAUD = remainingBudget(destinationBudgetAUD, destination.spentAUD);
  const localCurrency = stay?.localCurrency || null;
  const rate = stay?.fixedLocalPerAUD ?? null;
  const toLocal = value => localCurrency && rate ? Math.sign(Number(value) || 0) * audToLocal(Math.abs(Number(value) || 0), rate) : null;
  const pace = destinationPace(stay, destination.spentAUD, currentDate);
  const destinationCategoriesAUD = categoryTotals(destination.expenses);
  const destinationCategoriesLocal = Object.fromEntries(Object.entries(destinationCategoriesAUD).map(([category, amount]) => [category, toLocal(amount)]));
  const monthPrefix = toISODate(currentDate).slice(0, 7);
  const yearPrefix = String(annualTime.year);
  const monthCategories = periodCategorySummary(state.expenses, monthPrefix);
  const yearCategories = periodCategorySummary(state.expenses, yearPrefix);
  const reservationTotalAUD = destination.reservations.reduce((sum, record) => sum + Number(record.audAmount || 0), 0);
  const linkedReservations = stay ? (state.reservations || []).filter(record => record.itineraryId === stay.id) : [];
  const linkedReservationTotalAUD = linkedReservations.reduce((sum, record) => sum + Number(record.audAmount || 0), 0);

  return {
    currentDestination: stay ? {
      id:stay.id,
      name:stay.name,
      country:stay.country || '',
      travelType:stay.travelType,
      dates:`${formatAUDate(stay.startDate)} – ${formatAUDate(stay.endDate)}`,
      startDate:stay.startDate,
      endDate:stay.endDate,
      localCurrency,
      fixedLocalPerAUD:rate,
      budgetAUD:destinationBudgetAUD,
      spentAUD:destination.spentAUD,
      remainingAUD:destinationRemainingAUD,
      budgetLocal:toLocal(destinationBudgetAUD),
      spentLocal:toLocal(destination.spentAUD),
      remainingLocal:toLocal(destinationRemainingAUD),
      reservationTotalAUD,
      reservationTotalLocal:toLocal(reservationTotalAUD),
      linkedReservationTotalAUD,
      linkedReservationTotalLocal:toLocal(linkedReservationTotalAUD),
      pace
    } : null,
    annual: {
      year:annualTime.year,
      budgetAUD:annualBudgetAUD,
      spentAUD:annual.spentAUD,
      remainingAUD:annualRemainingAUD,
      elapsedDays:annualTime.elapsedDays,
      daysInYear:annualTime.daysInYear,
      progress:annualTime.progress,
      forecastAUD,
      forecastVarianceAUD:annualBudgetAUD - forecastAUD,
      forecastStatus:forecastAUD > annualBudgetAUD ? 'over' : 'under'
    },
    reservations: linkedReservations.map(record => ({
      id:record.id,
      type:record.type,
      title:record.title,
      dateTime:record.dateTime,
      status:record.status,
      allocation:record.allocation || 'annual',
      originalCurrency:record.originalCurrency || 'AUD',
      originalAmount:Number(record.originalAmount || 0),
      audAmount:Number(record.audAmount || 0)
    })),
    categories: {
      destination:destinationCategoriesAUD,
      destinationLocal:destinationCategoriesLocal,
      annual:categoryTotals(annual.expenses),
      month:{ ...monthCategories, label:toISODate(currentDate).slice(0, 7) },
      year:{ ...yearCategories, label:String(annualTime.year) }
    },
    recentExpenses:recentExpenses(state.expenses, options.recentLimit ?? 8),
    accounts:accountSummary(state.accounts)
  };
}
