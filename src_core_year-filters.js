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


export function formatTravelYearSelectionSummary(selection = ['all']) {
  const current=normalizeTravelYearSelection(selection);
  if (current.includes('all')) return 'All Years';
  if (current.length <= 4) return current.map(year=>`Year ${year}`).join(' + ');
  return `${current.length} years selected · Year ${current[0]}–Year ${current.at(-1)}`;
}

export function buildTravelYearBrowser(availableYears = [], selection = ['all'], { windowSize = 6, windowStart = null } = {}) {
  const years=[...new Set((availableYears||[]).map(normalizeYear).filter(Boolean))].sort((a,b)=>a-b);
  const size=Math.max(1,Math.min(12,Number(windowSize)||6));
  const maxYear=years.at(-1) || 1;
  const selected=normalizeTravelYearSelection(selection);
  const selectedYears=selected.includes('all') ? [] : selected;
  const anchor=Number.isInteger(Number(windowStart)) && Number(windowStart)>0
    ? Number(windowStart)
    : (selectedYears.at(-1) || years[0] || 1);
  const blockStart=Math.floor((Math.max(1,anchor)-1)/size)*size+1;
  const maxStart=Math.max(1,Math.floor((Math.max(1,maxYear)-1)/size)*size+1);
  const start=Math.min(Math.max(1,blockStart),maxStart);
  const visibleYears=years.filter(year=>year>=start && year<start+size);
  // Travel years can be sparse across a multi-decade retirement horizon.
  // Previous/Next must jump to the nearest block that actually contains an
  // available year instead of forcing Kym through empty six-year pages.
  const previousYear=[...years].reverse().find(year=>year<start) ?? null;
  const nextYear=years.find(year=>year>=start+size) ?? null;
  const blockFor=year=>year==null ? null : Math.floor((year-1)/size)*size+1;
  return {
    visibleYears,
    windowStart:start,
    previousStart:blockFor(previousYear),
    nextStart:blockFor(nextYear),
    summary:formatTravelYearSelectionSummary(selected)
  };
}
