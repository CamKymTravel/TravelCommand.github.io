function normalizeYear(value) {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
  const match = String(value ?? '').trim().match(/^(?:year\s*)?(\d+)$/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function normalizeTravelYearSelection(selection = ['all']) {
  if (!Array.isArray(selection) || selection.length === 0 || selection.some(value => String(value).toLowerCase() === 'all')) return ['all'];
  const years = [...new Set(selection.map(normalizeYear).filter(Boolean))].sort((a, b) => a - b);
  return years.length ? years : ['all'];
}

export function toggleTravelYear(selection, year) {
  if (String(year).toLowerCase() === 'all') return ['all'];
  const normalizedYear = normalizeYear(year);
  if (!normalizedYear) return normalizeTravelYearSelection(selection);

  const current = normalizeTravelYearSelection(selection);
  if (current.includes('all')) return [normalizedYear];

  const next = new Set(current);
  if (next.has(normalizedYear)) next.delete(normalizedYear);
  else next.add(normalizedYear);

  return next.size ? [...next].sort((a, b) => a - b) : ['all'];
}

export function isTravelYearSelected(selection, year) {
  const current = normalizeTravelYearSelection(selection);
  if (String(year).toLowerCase() === 'all') return current.includes('all');
  const normalizedYear = normalizeYear(year);
  return normalizedYear != null && !current.includes('all') && current.includes(normalizedYear);
}
