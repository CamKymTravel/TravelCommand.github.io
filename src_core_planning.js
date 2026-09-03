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
  if (!sorted.length) return { gaps, overlaps };

  // Compare each next stay with the furthest date already covered, not merely
  // the immediately previous row. With nested overlaps, the previous row can
  // end earlier than an older stay; comparing only adjacent rows can therefore
  // invent a gap that is actually covered and can miss a later overlap.
  let coverageEntry = sorted[0];
  let coverageEnd = dayNumber(coverageEntry.endDate);
  for (let i = 1; i < sorted.length; i += 1) {
    const current = sorted[i];
    const currentStart = dayNumber(current.startDate);
    const currentEnd = dayNumber(current.endDate);
    const delta = currentStart - coverageEnd;

    if (delta > 1) {
      gaps.push({ afterId:coverageEntry.id, beforeId:current.id, days:delta - 1 });
      coverageEntry = current;
      coverageEnd = currentEnd;
      continue;
    }
    if (delta <= 0) {
      const overlapEnd = Math.min(coverageEnd, currentEnd);
      overlaps.push({ firstId:coverageEntry.id, secondId:current.id, days:overlapEnd - currentStart + 1 });
    }
    if (currentEnd > coverageEnd) {
      coverageEntry = current;
      coverageEnd = currentEnd;
    }
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
