import { sumAmounts } from './src_core_budget.js';


export function destinationLedger(state, itineraryId) {
  if (!itineraryId) return { expenses:[], reservations:[], spentAUD:0 };
  const expenses = (state.expenses || []).filter(record => record.itineraryId === itineraryId && !record.needsBudgetRepair);
  const reservations = (state.reservations || []).filter(record => record.itineraryId === itineraryId && record.status !== 'to-book' && !record.needsBudgetRepair);
  return { expenses, reservations, spentAUD:sumAmounts([...expenses, ...reservations]) };
}

export function annualLedger(state, year) {
  const prefix = String(year);
  const expenses = (state.expenses || []).filter(record => !record.needsBudgetRepair && String(record.date || '').startsWith(prefix));
  const reservations = (state.reservations || []).filter(record => !record.needsBudgetRepair && record.status !== 'to-book' && String(record.dateTime || record.date || '').startsWith(prefix));
  return { expenses, reservations, spentAUD:sumAmounts([...expenses, ...reservations]) };
}
