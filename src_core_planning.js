import { toISODate } from './src_core_dates.js';

const dayNumber = value => Math.floor(new Date(`${toISODate(value)}T00:00:00Z`).valueOf() / 86400000);

export function sortItinerary(entries) {
  return [...entries].sort((a, b) => dayNumber(a.startDate) - dayNumber(b.startDate) || dayNumber(a.endDate) - dayNumber(b.endDate));
}

export function findCurrentStay(entries, currentDate) {
  const day = dayNumber(currentDate);
  return sortItinerary(entries).find(entry => day >= dayNumber(entry.startDate) && day <= dayNumber(entry.endDate)) ?? null;
}

export function findNextDestination(entries, currentDate) {
  const day = dayNumber(currentDate);
  return sortItinerary(entries).find(entry => dayNumber(entry.startDate) > day) ?? null;
}

export function detectTimelineIssues(entries) {
  const sorted = sortItinerary(entries);
  const gaps = [];
  const overlaps = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const previous = sorted[i - 1];
    const current = sorted[i];
    const delta = dayNumber(current.startDate) - dayNumber(previous.endDate);
    if (delta > 1) gaps.push({ afterId: previous.id, beforeId: current.id, days: delta - 1 });
    if (delta <= 0) overlaps.push({ firstId: previous.id, secondId: current.id, days: 1 - delta });
  }
  return { gaps, overlaps };
}

export function filterByCalendarYears(entries, years) {
  if (!years || years.length === 0 || years.includes('all')) return [...entries];
  const allowed = new Set(years.map(Number));
  return entries.filter(entry => allowed.has(Number(toISODate(entry.startDate).slice(0, 4))));
}

export function travelYearForDate(value, journeyStartDate) {
  if (!journeyStartDate) return null;
  const date = toISODate(value);
  const start = toISODate(journeyStartDate);
  if (date < start) return 0;
  const [dateYear, dateMonth, dateDay] = date.split('-').map(Number);
  const [startYear, startMonth, startDay] = start.split('-').map(Number);
  let completedAnniversaries = dateYear - startYear;
  if (dateMonth < startMonth || (dateMonth === startMonth && dateDay < startDay)) completedAnniversaries -= 1;
  return completedAnniversaries + 1;
}

export function filterByTravelYears(entries, years, journeyStartDate) {
  if (!years || years.length === 0 || years.some(value => String(value).toLowerCase() === 'all')) return [...entries];
  if (!journeyStartDate) return [...entries];
  const allowed = new Set(years.map(value => Number(String(value).replace(/[^0-9]/g, ''))).filter(value => Number.isInteger(value) && value > 0));
  if (!allowed.size) return [...entries];
  return entries.filter(entry => allowed.has(travelYearForDate(entry.startDate, journeyStartDate)));
}

export function availableTravelYears(entries, journeyStartDate, { minimum = 4 } = {}) {
  const years = new Set();
  if (journeyStartDate) {
    for (const entry of entries || []) {
      const year = travelYearForDate(entry.startDate, journeyStartDate);
      if (year && year > 0) years.add(year);
    }
  }
  const maxKnown = years.size ? Math.max(...years) : 0;
  const maxYear = Math.max(Number(minimum) || 0, maxKnown);
  for (let year = 1; year <= maxYear; year += 1) years.add(year);
  return [...years].sort((a, b) => a - b);
}

export function detectForwardTimelineIssues(entries, currentDate) {
  const relevant = sortItinerary(entries).filter(entry => dayNumber(entry.endDate) >= dayNumber(currentDate));
  const issues = detectTimelineIssues(relevant);
  if (!relevant.length) return issues;
  const current = dayNumber(currentDate);
  const firstStart = dayNumber(relevant[0].startDate);
  if (firstStart > current) {
    issues.gaps.unshift({ afterId:null, beforeId:relevant[0].id, days:firstStart - current });
  }
  return issues;
}
