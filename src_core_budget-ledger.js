import { sumAmounts } from './src_core_budget.js';

export function reservationAllocation(record) {
  return record?.allocation === 'destination' ? 'destination' : 'annual';
}

export function destinationLedger(state, itineraryId) {
  if (!itineraryId) return { expenses:[], reservations:[], spentAUD:0 };
  const expenses = (state.expenses || []).filter(record => record.itineraryId === itineraryId && record.allocation === 'destination');
  const reservations = (state.reservations || []).filter(record => record.itineraryId === itineraryId && reservationAllocation(record) === 'destination');
  return { expenses, reservations, spentAUD:sumAmounts([...expenses, ...reservations]) };
}

export function annualLedger(state, year) {
  const prefix = String(year);
  const expenses = (state.expenses || []).filter(record => record.allocation === 'annual' && String(record.date || '').startsWith(prefix));
  const reservations = (state.reservations || []).filter(record => reservationAllocation(record) === 'annual' && String(record.dateTime || record.date || '').startsWith(prefix));
  return { expenses, reservations, spentAUD:sumAmounts([...expenses, ...reservations]) };
}
