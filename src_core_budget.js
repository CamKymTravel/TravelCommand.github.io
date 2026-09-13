import { formatAUDate, toISODate } from './src_core_dates.js';
import { sameDayHandoffEntries } from './src_core_planning.js';
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

export function sameDayHandoffCandidates(itinerary, value) {
  // Budget routing deliberately reuses the planning boundary rule so the same
  // date can never be a legal handoff in Itinerary but a false overlap here.
  return sameDayHandoffEntries(itinerary, value);
}

export function resolveDestinationBudgetForDate(itinerary, value, { preferredItineraryId = null } = {}) {
  const date = toISODate(value);
  const matches = staysCoveringDate(itinerary, date);
  if (!matches.length) throw new Error(`No itinerary stay covers ${formatAUDate(date)}. Add the stay and its Destination Budget before saving.`);
  let stay = null;
  if (matches.length > 1) {
    const handoff = sameDayHandoffCandidates(itinerary, date);
    if (handoff.length === 2) {
      stay = handoff.find(item => item.id === preferredItineraryId) || null;
      if (!stay) throw new Error(`Two itinerary stays meet on ${formatAUDate(date)}. Choose which Destination Budget should receive this handoff-day cost.`);
    } else {
      throw new Error(`More than one itinerary stay covers ${formatAUDate(date)}. Fix the overlap before saving.`);
    }
  } else {
    stay = matches[0];
  }
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

export function annualBudgetForYear(settings = {}, year) {
  const numericYear = Number(year);
  const key = Number.isInteger(numericYear) ? String(numericYear) : String(year ?? '');
  const map = settings?.annualBudgetsAUD && typeof settings.annualBudgetsAUD === 'object' && !Array.isArray(settings.annualBudgetsAUD) ? settings.annualBudgetsAUD : {};
  if (Object.prototype.hasOwnProperty.call(map, key)) {
    const value = Number(map[key]);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }
  const legacy = Number(settings?.annualBudgetAUD || 0);
  const keys = Object.keys(map);
  if (!keys.length && Number.isFinite(legacy) && legacy >= 0) return legacy;
  if (settings?.journeyStartDate) {
    try {
      const startYear = Number(toISODate(settings.journeyStartDate).slice(0, 4));
      if (startYear === numericYear && Number.isFinite(legacy) && legacy >= 0) return legacy;
    } catch {}
  }
  return 0;
}

export function setAnnualBudgetForYear(settings, year, amount) {
  const numericYear = Number(year);
  const value = Number(amount);
  if (!Number.isInteger(numericYear) || numericYear < 1900 || numericYear > 9999) throw new Error('Annual Budget year is invalid');
  if (!Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) throw new Error('Annual budget must be zero or greater');
  const existing = settings.annualBudgetsAUD && typeof settings.annualBudgetsAUD === 'object' && !Array.isArray(settings.annualBudgetsAUD) ? settings.annualBudgetsAUD : {};
  settings.annualBudgetsAUD = { ...existing, [String(numericYear)]:value };
  // Retain the legacy scalar as a compatibility alias for older code/backups.
  settings.annualBudgetAUD = value;
  return value;
}

export function budgetPeriodForYear(settings = {}, year) {
  const numericYear = Number(year);
  if (!Number.isInteger(numericYear)) throw new Error('Budget year is invalid');
  let start = `${numericYear}-01-01`;
  const end = `${numericYear}-12-31`;
  if (settings?.journeyStartDate) {
    try {
      const journeyStart = toISODate(settings.journeyStartDate);
      if (Number(journeyStart.slice(0, 4)) === numericYear && journeyStart > start) start = journeyStart;
    } catch {}
  }
  const startMonth = Number(start.slice(5, 7));
  return { year:numericYear, start, end, activeMonths:Math.max(1, 13 - startMonth) };
}

export function budgetPeriodMetrics(settings = {}, currentDate) {
  const date = toISODate(currentDate);
  const year = Number(date.slice(0, 4));
  const period = budgetPeriodForYear(settings, year);
  const day = value => Math.floor(new Date(`${value}T00:00:00Z`).valueOf() / 86_400_000);
  const daysInYear = day(period.end) - day(period.start) + 1;
  const elapsedDays = date < period.start ? 0 : Math.min(daysInYear, day(date) - day(period.start) + 1);
  const progress = daysInYear > 0 ? Math.round((elapsedDays / daysInYear) * 100) : 0;
  return { ...period, elapsedDays, daysInYear, progress };
}
