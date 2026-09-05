import { findCurrentStay } from './src_core_planning.js';
import { formatAUDate, toISODate, stayDayMetrics } from './src_core_dates.js';
import { audToLocal } from './src_core_currency.js';
import { forecastAnnualSpend, remainingBudget, isDestinationBudgetUsable } from './src_core_budget.js';
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

function periodCategorySummary(expenses, prefix, today) {
  const records = (expenses || []).filter(record => !record.needsBudgetRepair && String(record.date || '').startsWith(prefix) && toISODate(record.date) <= today);
  const totals = categoryTotals(records);
  return {
    totals,
    totalAUD:Object.values(totals).reduce((sum, value) => sum + Number(value || 0), 0),
    count:records.length
  };
}

function destinationPace(stay, actualSpentAUD, currentDate) {
  if (!stay) return null;
  const days = stayDayMetrics(stay.startDate, stay.endDate, currentDate);
  const budgetAUD = Number(stay.destinationBudgetAUD || 0);
  const averageSpendPerDayAUD = days.currentDay > 0 ? Number(actualSpentAUD || 0) / days.currentDay : 0;
  const plannedDailyBudgetAUD = days.totalDays > 0 ? budgetAUD / days.totalDays : 0;
  const remainingActualAUD = budgetAUD - Number(actualSpentAUD || 0);
  const remainingDailyBudgetAUD = days.remainingDays > 0 ? remainingActualAUD / days.remainingDays : remainingActualAUD;
  const forecastSpendAUD = averageSpendPerDayAUD * days.totalDays;
  return {
    ...days,
    averageSpendPerDayAUD,
    plannedDailyBudgetAUD,
    remainingDailyBudgetAUD,
    forecastSpendAUD,
    forecastVarianceAUD:budgetAUD - forecastSpendAUD,
    forecastStatus:!isDestinationBudgetUsable(stay) ? 'needs-setup' : forecastSpendAUD > budgetAUD ? 'over' : 'under'
  };
}

function costDate(record) {
  return toISODate(record.dateTime || record.date);
}

function splitActualAndCommitted(records, today) {
  let actualAUD = 0;
  let committedAUD = 0;
  for (const record of records || []) {
    const amount = Number(record.audAmount || 0);
    if (costDate(record) <= today) actualAUD += amount;
    else committedAUD += amount;
  }
  return { actualAUD, committedAUD };
}

function annualMonthlyHistory(state, currentYear, annualBudgetAUD, currentDate) {
  const today = toISODate(currentDate);
  const records = [
    ...(state.expenses || []).filter(record => !record.needsBudgetRepair && record.date).map(record => ({ date:toISODate(record.date), audAmount:Number(record.audAmount || 0) })),
    ...(state.reservations || []).filter(record => !record.needsBudgetRepair && record.status !== 'to-book' && (record.dateTime || record.date)).map(record => ({ date:toISODate(record.dateTime || record.date), audAmount:Number(record.audAmount || 0) }))
  ].filter(record => record.date <= today);
  const years = new Set([Number(currentYear)]);
  for (const record of records) {
    const year = Number(record.date.slice(0, 4));
    if (Number.isFinite(year)) years.add(year);
  }
  const target = Number(annualBudgetAUD || 0) / 12;
  const sortedYears = [...years].sort((a, b) => b - a);
  const histories = sortedYears.map(year => {
    const months = Array.from({ length:12 }, (_, index) => ({ month:index + 1, amountAUD:0 }));
    for (const record of records) {
      if (Number(record.date.slice(0, 4)) !== year) continue;
      const month = Number(record.date.slice(5, 7));
      if (month >= 1 && month <= 12) months[month - 1].amountAUD += Number(record.audAmount || 0);
    }
    const spentAUD = months.reduce((sum, month) => sum + month.amountAUD, 0);
    const recordedMonths = months.filter(month => month.amountAUD > 0).length;
    const peak = spentAUD > 0 ? ([...months].sort((a, b) => b.amountAUD - a.amountAUD)[0] || null) : null;
    return {
      year,
      months,
      spentAUD,
      recordedMonths,
      averageRecordedMonthAUD:recordedMonths ? spentAUD / recordedMonths : 0,
      peakMonth:peak?.month ?? null,
      peakMonthAUD:peak?.amountAUD ?? 0,
      monthlyTargetAUD:target,
      budgetPositionAUD:Number(annualBudgetAUD || 0) - spentAUD
    };
  });
  return { years:sortedYears, histories };
}

function recentExpenses(expenses, today, limit = 8) {
  // This is the editable recent-entry list, not an actual-spend ledger. Repair
  // records are operationally higher priority than ordinary recency: include
  // every repair record before filling the normal compact limit with trusted
  // entries. That prevents an old/undated legacy repair from disappearing merely
  // because several newer expenses were saved afterwards.
  const sorted = [...(expenses || [])].sort((a, b) => String(b.modifiedAt || '').localeCompare(String(a.modifiedAt || '')) || String(b.date || '').localeCompare(String(a.date || '')));
  const repairs = sorted.filter(record => record.needsBudgetRepair === true);
  const trusted = sorted.filter(record => record.needsBudgetRepair !== true);
  const records = [...repairs, ...trusted.slice(0, Math.max(0, limit - repairs.length))];
  return records
    .map(record => {
      const hasDate = typeof record.date === 'string' && Boolean(record.date);
      return {
        id:record.id,
        itineraryId:record.needsBudgetRepair === true ? null : (record.itineraryId || null),
        date:record.date || null,
        displayDate:hasDate ? formatAUDate(record.date) : 'DATE REQUIRED',
        isFuture:hasDate ? toISODate(record.date) > today : false,
        needsBudgetRepair:record.needsBudgetRepair === true,
        category:record.category,
        description:record.description || '',
        originalCurrency:record.originalCurrency || 'AUD',
        originalAmount:Number(record.originalAmount || 0),
        audAmount:Number(record.audAmount || 0)
      };
    });
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
  const today = toISODate(currentDate);
  const annualDatedRecords = [
    ...annual.expenses.map(record => ({ ...record, budgetDate:toISODate(record.date) })),
    ...annual.reservations.map(record => ({ ...record, budgetDate:toISODate(record.dateTime || record.date) }))
  ];
  const annualSpentAUD = annualDatedRecords.filter(record => record.budgetDate <= today).reduce((sum, record) => sum + Number(record.audAmount || 0), 0);
  const annualCommittedAUD = annualDatedRecords.filter(record => record.budgetDate > today).reduce((sum, record) => sum + Number(record.audAmount || 0), 0);
  const annualRemainingAUD = remainingBudget(annualBudgetAUD, annualSpentAUD);
  const annualAfterCommitmentsAUD = annualRemainingAUD - annualCommittedAUD;
  const forecastAUD = forecastAnnualSpend({ spent:annualSpentAUD, elapsedDays:annualTime.elapsedDays, daysInYear:annualTime.daysInYear });

  const destination = stay ? destinationLedger(state, stay.id) : { expenses:[], reservations:[], spentAUD:0 };
  const destinationRecords = [...destination.expenses, ...destination.reservations];
  const destinationSplit = splitActualAndCommitted(destinationRecords, today);
  const actualDestinationExpenses = destination.expenses.filter(record => toISODate(record.date) <= today);
  const destinationBudgetAUD = Number(stay?.destinationBudgetAUD || 0);
  const destinationRemainingAUD = remainingBudget(destinationBudgetAUD, destinationSplit.actualAUD + destinationSplit.committedAUD);
  const localCurrency = stay?.localCurrency || null;
  const rate = stay?.fixedLocalPerAUD ?? null;
  const toLocal = value => localCurrency && rate ? Math.sign(Number(value) || 0) * audToLocal(Math.abs(Number(value) || 0), rate) : null;
  const pace = destinationPace(stay, destinationSplit.actualAUD, currentDate);
  const destinationCategoriesAUD = categoryTotals(actualDestinationExpenses);
  const destinationCategoriesLocal = Object.fromEntries(Object.entries(destinationCategoriesAUD).map(([category, amount]) => [category, toLocal(amount)]));
  const monthPrefix = today.slice(0, 7);
  const yearPrefix = String(annualTime.year);
  const monthCategories = periodCategorySummary(state.expenses, monthPrefix, today);
  const yearCategories = periodCategorySummary(state.expenses, yearPrefix, today);
  const linkedReservations = destination.reservations;
  const linkedReservationTotalAUD = linkedReservations.reduce((sum, record) => sum + Number(record.audAmount || 0), 0);
  const actualAnnualExpenses = annual.expenses.filter(record => toISODate(record.date) <= today);

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
      spentAUD:destinationSplit.actualAUD,
      committedAUD:destinationSplit.committedAUD,
      remainingAUD:destinationRemainingAUD,
      budgetLocal:toLocal(destinationBudgetAUD),
      spentLocal:toLocal(destinationSplit.actualAUD),
      committedLocal:toLocal(destinationSplit.committedAUD),
      remainingLocal:toLocal(destinationRemainingAUD),
      linkedReservationTotalAUD,
      linkedReservationTotalLocal:toLocal(linkedReservationTotalAUD),
      pace
    } : null,
    annual: {
      year:annualTime.year,
      budgetAUD:annualBudgetAUD,
      spentAUD:annualSpentAUD,
      committedAUD:annualCommittedAUD,
      remainingAUD:annualRemainingAUD,
      afterCommitmentsAUD:annualAfterCommitmentsAUD,
      elapsedDays:annualTime.elapsedDays,
      daysInYear:annualTime.daysInYear,
      progress:annualTime.progress,
      forecastAUD,
      forecastVarianceAUD:annualBudgetAUD - forecastAUD,
      forecastStatus:annualBudgetAUD > 0 ? (forecastAUD > annualBudgetAUD ? 'over' : 'under') : 'needs-setup'
    },
    reservations: linkedReservations.map(record => ({
      id:record.id,
      type:record.type,
      title:record.title,
      dateTime:record.dateTime,
      status:record.status,
      originalCurrency:record.originalCurrency || 'AUD',
      originalAmount:Number(record.originalAmount || 0),
      audAmount:Number(record.audAmount || 0)
    })),
    categories: {
      destination:destinationCategoriesAUD,
      destinationLocal:destinationCategoriesLocal,
      annual:categoryTotals(actualAnnualExpenses),
      month:{ ...monthCategories, label:monthPrefix },
      year:{ ...yearCategories, label:yearPrefix }
    },
    recentExpenses:recentExpenses(state.expenses, today, options.recentLimit ?? 8),
    monthlyHistory:annualMonthlyHistory(state, annualTime.year, annualBudgetAUD, currentDate),
    accounts:accountSummary(state.accounts)
  };
}
