import { createRecord, touchRecord } from './src_core_records.js';
import { toISODate } from './src_core_dates.js';

export const CHECKLIST_LIST_TYPES = Object.freeze(['permanent', 'destination']);

function normalizeFields(fields = {}, existing = null) {
  const listType = String(fields.listType || existing?.listType || 'permanent');
  if (!CHECKLIST_LIST_TYPES.includes(listType)) throw new Error('Invalid checklist list type');
  const title = String(fields.title || '').trim();
  if (!title) throw new Error('Checklist item title is required');
  const itineraryId = listType === 'destination' ? (fields.itineraryId || existing?.itineraryId || null) : null;
  if (listType === 'destination' && !itineraryId) throw new Error('Destination checklist item requires a destination');
  const dueDate = fields.dueDate ? toISODate(fields.dueDate) : null;
  return {
    listType,
    itineraryId,
    title,
    dueDate,
    notes:String(fields.notes || '').trim(),
    completed:Boolean(existing?.completed),
    completedAt:existing?.completedAt || null
  };
}

export function saveChecklistItemDraft(draft, { itemId = null, fields }, options = {}) {
  const existing = itemId ? draft.checklists.find(item => item.id === itemId) : null;
  if (itemId && !existing) throw new Error('Checklist item not found');
  const normalized = normalizeFields(fields, existing);
  if (normalized.itineraryId && !draft.itinerary.some(item => item.id === normalized.itineraryId)) throw new Error('Selected destination no longer exists');

  if (existing) {
    const index = draft.checklists.findIndex(item => item.id === itemId);
    draft.checklists[index] = touchRecord(existing, normalized, options);
    return draft.checklists[index];
  }

  const record = createRecord('checklist', normalized, options);
  draft.checklists.push(record);
  return record;
}

export function toggleChecklistItemDraft(draft, itemId, completed, options = {}) {
  const index = draft.checklists.findIndex(item => item.id === itemId);
  if (index < 0) throw new Error('Checklist item not found');
  const nextCompleted = Boolean(completed);
  const completedAt = nextCompleted ? options.now?.() || new Date().toISOString() : null;
  draft.checklists[index] = touchRecord(draft.checklists[index], { completed:nextCompleted, completedAt }, options);
  return draft.checklists[index];
}

export function deleteChecklistItemDraft(draft, itemId) {
  const before = draft.checklists.length;
  draft.checklists = draft.checklists.filter(item => item.id !== itemId);
  if (draft.checklists.length === before) throw new Error('Checklist item not found');
  return true;
}
