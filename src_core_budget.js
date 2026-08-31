import { EXPENSE_CATEGORIES } from './src_core_schema.js';

export function allowedExpenseAllocations(category) {
  if (!EXPENSE_CATEGORIES.includes(category)) throw new Error('Invalid expense category');
  return category === 'miscellaneous' ? ['destination', 'annual'] : ['destination'];
}

export function sumAmounts(records, field = 'audAmount') {
  return records.reduce((total, record) => total + (Number(record[field]) || 0), 0);
}

export function remainingBudget(budget, spent) {
  return Number(budget || 0) - Number(spent || 0);
}

export function forecastAnnualSpend({ spent, elapsedDays, daysInYear = 365 }) {
  const elapsed = Number(elapsedDays);
  if (!Number.isFinite(elapsed) || elapsed <= 0) return 0;
  return (Number(spent || 0) / elapsed) * Number(daysInYear);
}
