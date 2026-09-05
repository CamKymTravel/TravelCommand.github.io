import { formatAUDate, toISODate } from './src_core_dates.js';
import { localToAUD } from './src_core_currency.js';

const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export function isDestinationBudgetUsable(stay) {
  return Boolean(
    stay &&
    Number(stay.destinationBudgetAUD) > 0 &&
    String(stay.localCurrency || '').trim().toUpperCase() !== 'XXX' &&
    /^[A-Z]{3}$/.test(String(stay.localCurrency || '').trim().toUpperCase()) &&
    Number.isFinite(Number(stay.fixedLocalPerAUD)) &&
    Number(stay.fixedLocalPerAUD) > 0 &&
    (String(stay.localCurrency || '').trim().toUpperCase() !== 'AUD' || Number(stay.fixedLocalPerAUD) === 1)
  );
}

export function staysCoveringDate(itinerary, value) {
  const date = toISODate(value);
  return (itinerary || []).filter(stay => {
    try { return toISODate(stay.startDate) <= date && toISODate(stay.endDate) >= date; }
    catch { return false; }
  });
}

export function resolveDestinationBudgetForDate(itinerary, value) {
  const date = toISODate(value);
  const matches = staysCoveringDate(itinerary, date);
  if (!matches.length) throw new Error(`No itinerary stay covers ${formatAUDate(date)}. Add the stay and its Destination Budget before saving.`);
  if (matches.length > 1) throw new Error(`More than one itinerary stay covers ${formatAUDate(date)}. Fix the overlap before saving.`);
  const stay = matches[0];
  if (!isDestinationBudgetUsable(stay)) throw new Error(`Destination Budget for ${stay.name || 'this stay'} · ${formatAUDate(stay.startDate)} – ${formatAUDate(stay.endDate)} is not fully configured.`);
  return stay;
}

export function deriveAUDForStay({ originalCurrency = 'AUD', originalAmount = 0, audAmount = 0 }, stay) {
  const currency = String(originalCurrency || '').trim().toUpperCase();
  if (currency === 'XXX' || !/^[A-Z]{3}$/.test(currency)) throw new Error('Choose a real 3-letter currency code');
  const original = Number(originalAmount ?? 0);
  if (!Number.isFinite(original) || original < 0) throw new Error('Original amount must be zero or greater');
  if (currency === 'AUD') return roundMoney(original);
  if (currency === String(stay?.localCurrency || '').trim().toUpperCase()) {
    return roundMoney(localToAUD(original, Number(stay.fixedLocalPerAUD)));
  }
  const manual = Number(audAmount ?? 0);
  if (!Number.isFinite(manual) || manual < 0) throw new Error('AUD equivalent must be zero or greater');
  if (original > 0 && manual <= 0) throw new Error('Enter the AUD equivalent for this currency');
  return roundMoney(manual);
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
