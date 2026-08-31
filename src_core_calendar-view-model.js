import { formatAUDate, toISODate } from './src_core_dates.js';

const DAY_MS = 86_400_000;
const ITINERARY_PALETTE = Object.freeze([
  { color:'#46d9ca', rgb:'70,217,202' },
  { color:'#5d8dff', rgb:'93,141,255' },
  { color:'#806dff', rgb:'128,109,255' },
  { color:'#b86dff', rgb:'184,109,255' },
  { color:'#f165bd', rgb:'241,101,189' },
  { color:'#ff6f83', rgb:'255,111,131' },
  { color:'#ff9a5a', rgb:'255,154,90' },
  { color:'#ffd15b', rgb:'255,209,91' },
  { color:'#57d69b', rgb:'87,214,155' }
]);
const RESERVATION_COLOURS = Object.freeze({
  flight:{ color:'#5d8dff', rgb:'93,141,255' },
  train:{ color:'#46d9ca', rgb:'70,217,202' },
  cruise:{ color:'#806dff', rgb:'128,109,255' },
  rv:{ color:'#ff9a5a', rgb:'255,154,90' },
  accommodation:{ color:'#f165bd', rgb:'241,101,189' },
  ticket:{ color:'#ffd15b', rgb:'255,209,91' }
});
const PERSONAL_COLOURS = Object.freeze({
  reminder:{ color:'#ffd15b', rgb:'255,209,91' },
  note:{ color:'#b86dff', rgb:'184,109,255' },
  personal:{ color:'#b86dff', rgb:'184,109,255' }
});

function utcDate(iso) { return new Date(`${iso}T00:00:00Z`); }
function fromUTC(date) { return date.toISOString().slice(0, 10); }
function addDays(iso, count) { return fromUTC(new Date(utcDate(iso).valueOf() + Number(count) * DAY_MS)); }
function maxDate(a, b) { return a > b ? a : b; }
function minDate(a, b) { return a < b ? a : b; }
function overlaps(start, end, rangeStart, rangeEnd) { return start <= rangeEnd && end >= rangeStart; }

function hash(value) {
  let result = 2166136261;
  for (const character of String(value || '')) {
    result ^= character.codePointAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

export function itineraryCalendarColour(entry) {
  return ITINERARY_PALETTE[hash(entry?.id || `${entry?.name || ''}:${entry?.startDate || ''}`) % ITINERARY_PALETTE.length];
}

function normalizeMonthInput(value, currentDate) {
  const fallback = toISODate(currentDate).slice(0, 7);
  const candidate = String(value || fallback);
  if (!/^\d{4}-\d{2}$/.test(candidate)) return fallback;
  const [year, month] = candidate.split('-').map(Number);
  if (month < 1 || month > 12 || year < 1) return fallback;
  return candidate;
}

export function shiftCalendarMonth(month, delta) {
  const [year, monthNumber] = String(month).split('-').map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) throw new Error('Invalid calendar month');
  const date = new Date(Date.UTC(year, monthNumber - 1 + Number(delta), 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthBounds(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  const first = `${year}-${String(monthNumber).padStart(2, '0')}-01`;
  const nextMonth = new Date(Date.UTC(year, monthNumber, 1));
  const last = fromUTC(new Date(nextMonth.valueOf() - DAY_MS));
  return { first, last };
}

function monthLabel(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('en-AU', { month:'long', year:'numeric', timeZone:'UTC' }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function enteredTime(value) {
  const match = String(value || '').match(/T(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : '';
}

function itineraryEvent(entry) {
  const colour = itineraryCalendarColour(entry);
  return {
    id:`itinerary:${entry.id}`,
    sourceId:entry.id,
    sourceCollection:'itinerary',
    kind:entry.travelType === 'standard' ? 'destination-period' : 'travel-period',
    title:entry.name,
    subtitle:entry.travelType === 'standard' ? (entry.country || 'Destination') : `${entry.travelType === 'motorhome' ? 'Motorhome' : 'Cruise'} · ${entry.startCity || entry.country || ''}`.replace(/ · $/, ''),
    startDate:toISODate(entry.startDate),
    endDate:toISODate(entry.endDate),
    travelType:entry.travelType,
    itineraryId:entry.id,
    ...colour
  };
}

function reservationEvent(record, itineraryById) {
  const linked = record.itineraryId ? itineraryById.get(record.itineraryId) : null;
  const colour = linked ? itineraryCalendarColour(linked) : (RESERVATION_COLOURS[record.type] || RESERVATION_COLOURS.flight);
  const date = record.dateTime ? toISODate(record.dateTime) : null;
  return {
    id:`reservation:${record.id}`,
    sourceId:record.id,
    sourceCollection:'reservations',
    kind:'reservation',
    title:record.title,
    subtitle:[record.type ? record.type[0].toUpperCase() + record.type.slice(1) : 'Reservation', linked?.name, enteredTime(record.dateTime)].filter(Boolean).join(' · '),
    startDate:date,
    endDate:date,
    dateTime:record.dateTime || null,
    itineraryId:record.itineraryId || null,
    status:record.status,
    reservationType:record.type,
    ...colour
  };
}

function personalEvent(record, itineraryById) {
  const linked = record.itineraryId ? itineraryById.get(record.itineraryId) : null;
  const type = record.type || 'note';
  const colour = linked ? itineraryCalendarColour(linked) : (PERSONAL_COLOURS[type] || PERSONAL_COLOURS.note);
  const rawDate = record.dateTime || record.date;
  const date = rawDate ? toISODate(rawDate) : null;
  return {
    id:`calendar:${record.id}`,
    sourceId:record.id,
    sourceCollection:'calendarEvents',
    kind:'personal',
    personalType:type,
    title:record.title || 'Calendar event',
    subtitle:[type === 'reminder' ? 'Reminder' : 'Note', linked?.name, enteredTime(rawDate)].filter(Boolean).join(' · '),
    startDate:date,
    endDate:date,
    dateTime:rawDate || null,
    notes:record.notes || record.note || '',
    itineraryId:record.itineraryId || null,
    ...colour
  };
}

function allCalendarEvents(state) {
  const itineraryById = new Map((state.itinerary || []).map(item => [item.id, item]));
  const itinerary = (state.itinerary || []).map(itineraryEvent);
  const reservations = (state.reservations || []).filter(item => item.dateTime).map(item => reservationEvent(item, itineraryById));
  const personal = (state.calendarEvents || [])
    .filter(item => !item.reservationId && (item.dateTime || item.date))
    .map(item => personalEvent(item, itineraryById));
  return { itinerary, reservations, personal, all:[...itinerary, ...reservations, ...personal] };
}

function cellSegment(event, date) {
  if (event.startDate === event.endDate) return 'single';
  if (date === event.startDate) return 'start';
  if (date === event.endDate) return 'end';
  return 'middle';
}

function cellEvent(event, date) {
  return { ...event, segment:cellSegment(event, date), cellDate:date };
}

function eventOrder(a, b) {
  const rank = { 'destination-period':0, 'travel-period':0, reservation:1, personal:2 };
  return (rank[a.kind] ?? 9) - (rank[b.kind] ?? 9) || a.title.localeCompare(b.title);
}

export function buildCalendarViewModel(state, currentDate, options = {}) {
  const today = toISODate(currentDate);
  const selectedMonth = normalizeMonthInput(options.month || state.ui?.calendarMonth, today);
  const view = (options.view || state.ui?.calendarView) === 'agenda' ? 'agenda' : 'month';
  const { first:monthStart, last:monthEnd } = monthBounds(selectedMonth);
  const firstWeekdaySundayZero = utcDate(monthStart).getUTCDay();
  const mondayOffset = (firstWeekdaySundayZero + 6) % 7;
  const gridStart = addDays(monthStart, -mondayOffset);
  const gridEnd = addDays(gridStart, 41);
  const source = allCalendarEvents(state);

  const cells = Array.from({ length:42 }, (_, index) => {
    const date = addDays(gridStart, index);
    const events = source.all
      .filter(event => event.startDate && event.endDate && event.startDate <= date && event.endDate >= date)
      .map(event => cellEvent(event, date))
      .sort(eventOrder);
    return {
      date,
      displayDay:Number(date.slice(8, 10)),
      inMonth:date >= monthStart && date <= monthEnd,
      isToday:date === today,
      events
    };
  });

  const agenda = source.all
    .filter(event => event.startDate && event.endDate && overlaps(event.startDate, event.endDate, monthStart, monthEnd))
    .map(event => ({
      ...event,
      sortDate:maxDate(event.startDate, monthStart),
      displayDate:event.startDate === event.endDate ? formatAUDate(event.startDate) : `${formatAUDate(event.startDate)} – ${formatAUDate(event.endDate)}`,
      displayTime:event.dateTime ? enteredTime(event.dateTime) : ''
    }))
    .sort((a, b) => a.sortDate.localeCompare(b.sortDate) || (a.displayTime || '').localeCompare(b.displayTime || '') || eventOrder(a, b));

  return {
    view,
    selectedMonth,
    monthLabel:monthLabel(selectedMonth),
    monthStart,
    monthEnd,
    gridStart,
    gridEnd,
    weekdays:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    cells,
    agenda,
    counts:{
      itinerary:source.itinerary.filter(event => overlaps(event.startDate, event.endDate, monthStart, monthEnd)).length,
      reservations:source.reservations.filter(event => event.startDate >= monthStart && event.startDate <= monthEnd).length,
      personal:source.personal.filter(event => event.startDate >= monthStart && event.startDate <= monthEnd).length
    }
  };
}
