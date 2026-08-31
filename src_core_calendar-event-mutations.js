import { createRecord, touchRecord } from './src_core_records.js';
import { validateDateTime } from './src_core_dates.js';

export const PERSONAL_CALENDAR_TYPES = Object.freeze(['reminder', 'note']);

function normalizeFields(fields = {}) {
  const type = String(fields.type || 'reminder');
  if (!PERSONAL_CALENDAR_TYPES.includes(type)) throw new Error('Invalid calendar event type');
  const title = String(fields.title || '').trim();
  if (!title) throw new Error('Calendar event title is required');
  const dateTime = String(fields.dateTime || '').trim();
  if (!dateTime) throw new Error('Calendar event date and time are required');
  validateDateTime(dateTime);
  if (fields.itineraryId != null && !String(fields.itineraryId).trim()) throw new Error('Invalid itinerary relationship');
  return {
    type,
    title,
    dateTime,
    notes:String(fields.notes || '').trim(),
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
