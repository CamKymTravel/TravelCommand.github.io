import { formatAUDate, toISODate } from './src_core_dates.js';
import { findDuplicateReservation } from './src_core_reservation-mutations.js';

export const RESERVATION_TABS = Object.freeze([
  ['flight','Flights'],
  ['train','Trains'],
  ['cruise','Cruises'],
  ['rv','RV'],
  ['accommodation','Accommodation'],
  ['ticket','Tickets & Attractions']
]);

const STATUS_LABELS = Object.freeze({
  paid:'Paid',
  unpaid:'Unpaid',
  booked:'Booked',
  'to-book':'To Book',
  completed:'Completed'
});

function displayDateTime(value) {
  if (!value) return 'Date not set';
  const date = formatAUDate(value);
  const match = String(value).match(/T(\d{2}):(\d{2})/);
  return match ? `${date} · ${match[1]}:${match[2]}` : date;
}

function sortUpcoming(a, b) {
  if (!a.dateTime && !b.dateTime) return a.title.localeCompare(b.title);
  if (!a.dateTime) return 1;
  if (!b.dateTime) return -1;
  return String(a.dateTime).localeCompare(String(b.dateTime)) || a.title.localeCompare(b.title);
}

function sortCompleted(a, b) {
  if (!a.dateTime && !b.dateTime) return b.title.localeCompare(a.title);
  if (!a.dateTime) return 1;
  if (!b.dateTime) return -1;
  return String(b.dateTime).localeCompare(String(a.dateTime)) || b.title.localeCompare(a.title);
}

function isPast(record, currentDate) {
  if (!record.dateTime) return false;
  return toISODate(record.dateTime) < toISODate(currentDate);
}

function presentRecord(record, itineraryById) {
  const itinerary = record.itineraryId ? itineraryById.get(record.itineraryId) : null;
  return {
    id:record.id,
    type:record.type,
    title:record.title,
    dateTime:record.dateTime,
    displayDateTime:displayDateTime(record.dateTime),
    originalCurrency:record.originalCurrency || 'AUD',
    originalAmount:Number(record.originalAmount || 0),
    audAmount:Number(record.audAmount || 0),
    status:record.status,
    statusLabel:STATUS_LABELS[record.status] || record.status,
    allocation:record.allocation || 'annual',
    notes:record.notes || '',
    itineraryId:record.itineraryId || null,
    itineraryName:itinerary?.name || null
  };
}

function duplicateGroups(records) {
  const groups = [];
  const seen = new Set();
  for (const record of records || []) {
    if (!record.dateTime || seen.has(record.id)) continue;
    const duplicate = findDuplicateReservation(records, record, record.id);
    if (!duplicate || seen.has(duplicate.id)) continue;
    seen.add(record.id);
    seen.add(duplicate.id);
    groups.push([record.id, duplicate.id]);
  }
  return groups;
}

export function buildReservationsViewModel(state, currentDate, options = {}) {
  const activeType = RESERVATION_TABS.some(([type]) => type === options.activeType) ? options.activeType : 'flight';
  const itineraryById = new Map((state.itinerary || []).map(record => [record.id, record]));
  const records = (state.reservations || []).map(record => presentRecord(record, itineraryById));
  const filtered = records.filter(record => record.type === activeType);
  const toBook = filtered.filter(record => record.status === 'to-book').sort(sortUpcoming);
  const completed = filtered
    .filter(record => record.status === 'completed' || (record.status !== 'to-book' && isPast(record, currentDate)))
    .map(record => record.status === 'completed' ? record : { ...record, status:'completed', statusLabel:'Completed', autoCompleted:true })
    .sort(sortCompleted);
  const completedIds = new Set(completed.map(record => record.id));
  const upcoming = filtered.filter(record => record.status !== 'to-book' && !completedIds.has(record.id)).sort(sortUpcoming);

  const duplicates = duplicateGroups(state.reservations || []);
  const overdueToBook = records.filter(record => record.status === 'to-book' && record.dateTime && isPast(record, currentDate));
  const missingAudEquivalent = records.filter(record => record.originalCurrency !== 'AUD' && record.originalAmount > 0 && record.audAmount <= 0);
  const issues = [];
  if (duplicates.length) issues.push(`${duplicates.length} duplicate reservation pair${duplicates.length === 1 ? '' : 's'}`);
  if (overdueToBook.length) issues.push(`${overdueToBook.length} overdue To Book item${overdueToBook.length === 1 ? '' : 's'}`);
  if (missingAudEquivalent.length) issues.push(`${missingAudEquivalent.length} missing AUD equivalent${missingAudEquivalent.length === 1 ? '' : 's'}`);

  return {
    activeType,
    tabs:RESERVATION_TABS.map(([type, label]) => ({ type, label, count:records.filter(record => record.type === type).length })),
    upcoming,
    toBook,
    completed,
    health: {
      status:issues.length ? 'needs-attention' : 'verified',
      issues,
      duplicateGroups:duplicates,
      overdueToBookCount:overdueToBook.length,
      missingAudEquivalentCount:missingAudEquivalent.length
    }
  };
}
