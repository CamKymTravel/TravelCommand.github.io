import { formatAUDate, toISODate } from './src_core_dates.js';
import { reservationDuplicateKey } from './src_core_reservation-mutations.js';

// Live editable booking categories. `accommodation` remains a persisted legacy
// value only and is presented through Hotels until that record is edited.
export const RESERVATION_TABS = Object.freeze([
  ['flight','Flights'],
  ['train','Trains'],
  ['cruise','Cruises'],
  ['rv','RV / Motorhome'],
  ['hotel','Hotels'],
  ['airbnb','Airbnb'],
  ['ticket','Tickets & Attractions']
]);

export const reservationLiveType = type => type === 'accommodation' ? 'hotel' : type;

const STATUS_LABELS = Object.freeze({
  paid:'Paid',
  unpaid:'Unpaid',
  booked:'Booked',
  'to-book':'To Book'
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
  const itinerary = !record.needsBudgetRepair && record.itineraryId ? itineraryById.get(record.itineraryId) : null;
  const liveType = reservationLiveType(record.type);
  return {
    id:record.id,
    type:liveType,
    sourceType:record.type,
    legacyAccommodation:record.type === 'accommodation',
    flightScope:liveType === 'flight' ? (record.flightScope || null) : null,
    title:record.title,
    dateTime:record.dateTime,
    displayDateTime:displayDateTime(record.dateTime),
    originalCurrency:record.originalCurrency || 'AUD',
    originalAmount:Number(record.originalAmount || 0),
    audAmount:Number(record.audAmount || 0),
    budgetScope:record.budgetScope || (liveType === 'ticket' ? 'destination' : 'annual'),
    status:record.status,
    statusLabel:STATUS_LABELS[record.status] || record.status,
    notes:record.notes || '',
    itineraryId:record.needsBudgetRepair ? null : (record.itineraryId || null),
    itineraryName:itinerary?.name || null,
    needsBudgetRepair:record.needsBudgetRepair === true
  };
}

function duplicateGroups(records) {
  // Duplicate semantics are grouped by normalized type + title + date. An
  // entered time narrows the match, while one date-only copy is intentionally
  // a wildcard that connects every reservation in that same base group.
  const bases = new Map();
  for (const record of records || []) {
    const key = reservationDuplicateKey(record);
    if (!key) continue;
    const split = key.lastIndexOf('|');
    const base = key.slice(0, split);
    const time = key.slice(split + 1);
    const list = bases.get(base) || [];
    list.push({ id:record.id, time });
    bases.set(base, list);
  }
  const groups = [];
  for (const list of bases.values()) {
    if (list.length < 2) continue;
    if (list.some(item => !item.time)) {
      groups.push(list.map(item => item.id));
      continue;
    }
    const times = new Map();
    for (const item of list) {
      const ids = times.get(item.time) || [];
      ids.push(item.id);
      times.set(item.time, ids);
    }
    for (const ids of times.values()) if (ids.length > 1) groups.push(ids);
  }
  return groups;
}

export function buildReservationsViewModel(state, currentDate, options = {}) {
  const activeType = RESERVATION_TABS.some(([type]) => type === reservationLiveType(options.activeType)) ? reservationLiveType(options.activeType) : 'flight';
  const itineraryById = new Map((state.itinerary || []).map(record => [record.id, record]));
  const records = (state.reservations || []).map(record => presentRecord(record, itineraryById));
  const filtered = records.filter(record => record.type === activeType);

  const completedAll = records
    .filter(record => record.status !== 'to-book' && isPast(record, currentDate))
    .map(record => ({ ...record, completed:true, autoCompleted:true }))
    .sort(sortCompleted);
  const completedIds = new Set(completedAll.map(record => record.id));
  const upcomingAll = records.filter(record => record.status !== 'to-book' && !completedIds.has(record.id)).sort(sortUpcoming);
  const toBookAll = records.filter(record => record.status === 'to-book').sort(sortUpcoming);

  const completed = completedAll.filter(record => record.type === activeType);
  const upcoming = upcomingAll.filter(record => record.type === activeType);
  const toBook = toBookAll.filter(record => record.type === activeType);

  const duplicates = duplicateGroups(state.reservations || []);
  const overdueToBook = records.filter(record => record.status === 'to-book' && record.dateTime && isPast(record, currentDate));
  const needsBudgetRepair = records.filter(record => record.needsBudgetRepair);
  const missingAudEquivalent = records.filter(record => !record.needsBudgetRepair && record.originalCurrency !== 'AUD' && record.originalAmount > 0 && record.audAmount <= 0);
  const issues = [];
  if (duplicates.length) { const duplicateRecords=duplicates.reduce((sum,group)=>sum+group.length,0); issues.push(`${duplicateRecords} reservations appear in ${duplicates.length} duplicate group${duplicates.length === 1 ? '' : 's'}`); }
  if (overdueToBook.length) issues.push(`${overdueToBook.length} overdue To Book item${overdueToBook.length === 1 ? '' : 's'}`);
  if (needsBudgetRepair.length) issues.push(`${needsBudgetRepair.length} reservation${needsBudgetRepair.length === 1 ? ' needs' : 's need'} Destination Budget repair`);
  if (missingAudEquivalent.length) issues.push(`${missingAudEquivalent.length} missing AUD equivalent${missingAudEquivalent.length === 1 ? '' : 's'}`);

  return {
    activeType,
    records,
    tabs:RESERVATION_TABS.map(([type, label]) => {
      const typeRecords = records.filter(record => record.type === type);
      const bookedUpcoming = typeRecords.filter(record => record.status !== 'to-book' && !isPast(record, currentDate));
      return {
        type,
        label,
        count:bookedUpcoming.length,
        flightBreakdown:type === 'flight' ? {
          domestic:bookedUpcoming.filter(record => record.flightScope === 'domestic').length,
          international:bookedUpcoming.filter(record => record.flightScope === 'international').length,
          unclassified:bookedUpcoming.filter(record => !record.flightScope).length
        } : null
      };
    }),
    upcoming,
    toBook,
    completed,
    allUpcoming:upcomingAll,
    allToBook:toBookAll,
    allCompleted:completedAll,
    completedCount:completedAll.length,
    health: {
      status:issues.length ? 'needs-attention' : 'verified',
      issues,
      duplicateGroups:duplicates,
      overdueToBookCount:overdueToBook.length,
      needsBudgetRepairCount:needsBudgetRepair.length,
      missingAudEquivalentCount:missingAudEquivalent.length
    }
  };
}
