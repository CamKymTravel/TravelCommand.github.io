import { toISODate } from './src_core_dates.js';

const dayNumber = value => Math.floor(new Date(`${toISODate(value)}T00:00:00Z`).valueOf() / 86400000);

export function sortItinerary(entries) {
  return [...entries].sort((a, b) => dayNumber(a.startDate) - dayNumber(b.startDate) || dayNumber(a.endDate) - dayNumber(b.endDate));
}

export function findCurrentStay(entries, currentDate) {
  const handoff = sameDayHandoffEntries(entries, currentDate);
  // Stay dates are inclusive, so a legal move day is covered by both the stay
  // being left and the stay being entered. Treat the arriving stay as current
  // on that shared day. This matches Checklist's travel-day context and stops
  // Home/Budget/Itinerary from showing the departing stay while skipping the
  // arrival destination in the current/next sequence.
  if (handoff.length === 2) return handoff[1];
  const day = dayNumber(currentDate);
  return sortItinerary(entries).find(entry => day >= dayNumber(entry.startDate) && day <= dayNumber(entry.endDate)) ?? null;
}

export function findNextDestination(entries, currentDate) {
  const day = dayNumber(currentDate);
  return sortItinerary(entries).find(entry => dayNumber(entry.startDate) > day) ?? null;
}

export function sameDayHandoffEntries(entries, value) {
  const date = toISODate(value);
  const matches = sortItinerary(entries || []).filter(entry => {
    try { return toISODate(entry.startDate) <= date && toISODate(entry.endDate) >= date; }
    catch { return false; }
  });
  if (matches.length !== 2) return [];
  // A legal handoff must have one unique leaving -> arriving assignment.
  // Two one-day stays on the same date have two possible assignments and are
  // therefore ambiguous rather than an arbitrary valid handoff.
  const pairs = [];
  for (const leaving of matches) {
    if (toISODate(leaving.endDate) !== date) continue;
    for (const arriving of matches) {
      if (arriving === leaving || toISODate(arriving.startDate) !== date) continue;
      pairs.push([leaving, arriving]);
    }
  }
  return pairs.length === 1 ? pairs[0] : [];
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
    // A shared boundary is overlap-free only when the two active stays form
    // one unique leaving -> arriving handoff. Ambiguous same-day occupancy
    // (including duplicate one-day stays or 3+ stays) is a real overlap.
    if (delta === 0) {
      const handoff = sameDayHandoffEntries(sorted, current.startDate);
      if (handoff.length !== 2 || handoff[0]?.id !== coverageEntry.id || handoff[1]?.id !== current.id) {
        overlaps.push({ firstId:coverageEntry.id, secondId:current.id, days:1 });
      }
    } else if (delta < 0) {
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

export function travelYearsForRange(startValue, endValue, journeyStartDate) {
  if (!journeyStartDate) return [];
  const journeyStart=toISODate(journeyStartDate);
  const start=toISODate(startValue);
  const end=toISODate(endValue || startValue);
  if (end < journeyStart) return [];
  const effectiveStart=start < journeyStart ? journeyStart : start;
  const first=travelYearForDate(effectiveStart, journeyStart);
  const last=travelYearForDate(end, journeyStart);
  if (!Number.isInteger(first) || !Number.isInteger(last) || first <= 0 || last <= 0 || last < first) return [];
  return Array.from({length:last-first+1},(_,index)=>first+index);
}

export function filterByTravelYears(entries, years, journeyStartDate) {
  if (!years || years.length === 0 || years.some(value => String(value).toLowerCase() === 'all')) return [...entries];
  if (!journeyStartDate) return [...entries];
  const allowed = new Set(years.map(value => Number(String(value).replace(/[^0-9]/g, ''))).filter(value => Number.isInteger(value) && value > 0));
  if (!allowed.size) return [...entries];
  return entries.filter(entry => travelYearsForRange(entry.startDate, entry.endDate, journeyStartDate).some(year => allowed.has(year)));
}

export function availableTravelYears(entries, journeyStartDate, { minimum = 30 } = {}) {
  const years = new Set();
  if (journeyStartDate) {
    for (const entry of entries || []) {
      for (const year of travelYearsForRange(entry.startDate, entry.endDate, journeyStartDate)) years.add(year);
    }
  }
  // Keep the practical baseline horizon directly selectable without pretending
  // that later empty travel years contain data. Years beyond the baseline are
  // added only when itinerary records actually occupy them, which lets the
  // previous/next browser jump across sparse multi-decade gaps instead of
  // forcing Kym through empty six-year blocks.
  const minimumHorizon = Math.max(0, Number(minimum) || 0);
  for (let year = 1; year <= minimumHorizon; year += 1) years.add(year);
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
