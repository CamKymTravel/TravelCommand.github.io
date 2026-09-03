import { formatAUDate, toISODate } from './src_core_dates.js';
import { reservationsConflict } from './src_core_reservation-mutations.js';

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
  const itinerary = record.itineraryId ? itineraryById.get(record.itineraryId) : null;
  return {
    id:record.id,
    type:record.type,
    flightScope:record.type === 'flight' ? (record.flightScope || null) : null,
    title:record.title,
    dateTime:record.dateTime,
    displayDateTime:displayDateTime(record.dateTime),
    originalCurrency:record.originalCurrency || 'AUD',
    originalAmount:Number(record.originalAmount || 0),
    audAmount:Number(record.audAmount || 0),
    status:record.status,
    statusLabel:STATUS_LABELS[record.status] || record.status,
    notes:record.notes || '',
    itineraryId:record.itineraryId || null,
    itineraryName:itinerary?.name || null,
    needsBudgetRepair:record.needsBudgetRepair === true
  };
}

function duplicateGroups(records) {
  const source = records || [];
  // Duplicate matching has an intentional wildcard when one copy has no time,
  // so a simple string-key group is not sufficient. Build connected groups:
  // date-only A can connect 09:00 and 10:00 copies even though those two timed
  // records would be legitimate if A did not exist.
  const parent = source.map((_, index) => index);
  const find = index => parent[index] === index ? index : (parent[index] = find(parent[index]));
  const join = (a, b) => { const ra=find(a), rb=find(b); if (ra!==rb) parent[rb]=ra; };
  for (let a=0; a<source.length; a+=1) for (let b=a+1; b<source.length; b+=1) {
    if (reservationsConflict(source[a], source[b])) join(a,b);
  }
  const groups = new Map();
  source.forEach((record,index)=>{const root=find(index);const ids=groups.get(root)||[];ids.push(record.id);groups.set(root,ids);});
  return [...groups.values()].filter(ids => ids.length > 1);
}

export function buildReservationsViewModel(state, currentDate, options = {}) {
  const activeType = RESERVATION_TABS.some(([type]) => type === options.activeType) ? options.activeType : 'flight';
  const itineraryById = new Map((state.itinerary || []).map(record => [record.id, record]));
  const records = (state.reservations || []).map(record => presentRecord(record, itineraryById));
  const filtered = records.filter(record => record.type === activeType);
  const toBook = filtered.filter(record => record.status === 'to-book').sort(sortUpcoming);
  const completed = filtered
    .filter(record => record.status !== 'to-book' && isPast(record, currentDate))
    // Completion is a lifecycle/section state, not a payment state. Preserve the
    // saved Paid / Unpaid / Booked status so a past unpaid booking remains visible.
    .map(record => ({ ...record, completed:true, autoCompleted:true }))
    .sort(sortCompleted);
  const completedIds = new Set(completed.map(record => record.id));
  const upcoming = filtered.filter(record => record.status !== 'to-book' && !completedIds.has(record.id)).sort(sortUpcoming);

  const duplicates = duplicateGroups(state.reservations || []);
  const overdueToBook = records.filter(record => record.status === 'to-book' && record.dateTime && isPast(record, currentDate));
  const needsBudgetRepair = records.filter(record => record.needsBudgetRepair);
  const missingAudEquivalent = records.filter(record => !record.needsBudgetRepair && record.originalCurrency !== 'AUD' && record.originalAmount > 0 && record.audAmount <= 0);
  const issues = [];
  if (duplicates.length) { const records=duplicates.reduce((sum,group)=>sum+group.length,0); issues.push(`${records} reservations appear in ${duplicates.length} duplicate group${duplicates.length === 1 ? '' : 's'}`); }
  if (overdueToBook.length) issues.push(`${overdueToBook.length} overdue To Book item${overdueToBook.length === 1 ? '' : 's'}`);
  if (needsBudgetRepair.length) issues.push(`${needsBudgetRepair.length} reservation${needsBudgetRepair.length === 1 ? ' needs' : 's need'} Destination Budget repair`);
  if (missingAudEquivalent.length) issues.push(`${missingAudEquivalent.length} missing AUD equivalent${missingAudEquivalent.length === 1 ? '' : 's'}`);

  return {
    activeType,
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
