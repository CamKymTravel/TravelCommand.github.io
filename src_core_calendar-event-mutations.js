import { createRecord, touchRecord } from './src_core_records.js';
import { toISODate, validateDateTime } from './src_core_dates.js';

export const PERSONAL_CALENDAR_TYPES = Object.freeze(['reminder', 'note']);

function normalizeFields(fields = {}) {
  const typeInput = fields.type == null || fields.type === '' ? 'reminder' : fields.type;
  if (typeof typeInput !== 'string' || !PERSONAL_CALENDAR_TYPES.includes(typeInput)) throw new Error('Invalid calendar event type');
  const type = typeInput;
  const title = typeof fields.title === 'string' ? fields.title.trim() : '';
  if (!title) throw new Error('Calendar event title is required');
  const date = fields.date ? toISODate(fields.date) : null;
  const time = typeof fields.time === 'string' ? fields.time.trim() : '';
  let dateTime = null;
  if (!date) throw new Error('Calendar event date is required');
  if (time) {
    if (!/^\d{2}:\d{2}$/.test(time)) throw new Error('Invalid calendar event time');
    dateTime = `${date}T${time}`;
    validateDateTime(dateTime);
  }
  if (fields.itineraryId != null && (typeof fields.itineraryId !== 'string' || !fields.itineraryId.trim())) throw new Error('Invalid itinerary relationship');
  return {
    type,
    title,
    date: dateTime ? null : date,
    dateTime,
    notes:typeof fields.notes === 'string' ? fields.notes.trim() : '',
    itineraryId:fields.itineraryId || null,
    reservationId:null
  };
}

export function saveCalendarEventDraft(draft, { eventId = null, fields }, options = {}) {
  const normalized = normalizeFields(fields);
  if (normalized.itineraryId && !draft.itinerary.some(item => item.id === normalized.itineraryId)) {
    throw new Error('Selected Destination / Trip no longer exists');
  }

  if (eventId) {
    const index = draft.calendarEvents.findIndex(item => item.id === eventId);
    if (index < 0) throw new Error('Calendar event not found');
    if (draft.calendarEvents[index].reservationId) throw new Error('Reservation calendar entries are edited from Reservations');
    draft.calendarEvents[index] = touchRecord(draft.calendarEvents[index], normalized, options);
    return draft.calendarEvents[index];
  }

  const record = createRecord('calendar', normalized, options);
  draft.calendarEvents.push(record);
  return record;
}

export function deleteCalendarEventDraft(draft, eventId) {
  const record = draft.calendarEvents.find(item => item.id === eventId);
  if (!record) throw new Error('Calendar event not found');
  if (record.reservationId) throw new Error('Reservation calendar entries are managed from Reservations');
  draft.calendarEvents = draft.calendarEvents.filter(item => item.id !== eventId);
  return true;
}
