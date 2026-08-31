import { formatAUDate, toISODate } from './src_core_dates.js';

function instant(value) {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = new Date(value).valueOf();
  if (Number.isFinite(parsed)) return parsed;
  const iso = toISODate(value);
  return new Date(`${iso}T00:00:00Z`).valueOf();
}

function isOnOrAfter(value, currentDate) {
  if (!value) return false;
  return toISODate(value) >= toISODate(currentDate);
}

function displayDate(value) {
  if (!value) return '';
  return formatAUDate(value);
}

export function buildUpcomingEvents(state, currentDate, { limit = 8 } = {}) {
  const reservationEvents = state.reservations
    .filter(item => item.status !== 'completed' && item.dateTime && isOnOrAfter(item.dateTime, currentDate))
    .map(item => ({
      id: `reservation:${item.id}`,
      sourceId: item.id,
      kind: 'reservation',
      type: item.type,
      title: item.title,
      dateTime: item.dateTime,
      displayDate: displayDate(item.dateTime),
      itineraryId: item.itineraryId || null,
      status: item.status
    }));

  const personalEvents = state.calendarEvents
    .filter(item => !item.reservationId && (item.dateTime || item.date) && isOnOrAfter(item.dateTime || item.date, currentDate))
    .map(item => ({
      id: `calendar:${item.id}`,
      sourceId: item.id,
      kind: 'calendar',
      type: item.type || 'personal',
      title: item.title || 'Calendar event',
      dateTime: item.dateTime || item.date,
      displayDate: displayDate(item.dateTime || item.date),
      itineraryId: item.itineraryId || null,
      status: item.status || null
    }));

  return [...reservationEvents, ...personalEvents]
    .sort((a, b) => instant(a.dateTime) - instant(b.dateTime) || a.title.localeCompare(b.title))
    .slice(0, Math.max(0, Number(limit) || 0));
}
