import { createRecord, touchRecord } from './src_core_records.js';
import { toISODate } from './src_core_dates.js';

export const CHECKLIST_LIST_TYPES = Object.freeze(['permanent','destination']);
export const CHECKLIST_STAGES = Object.freeze(['current-stay','before-leave','travel-day','arrival']);
export const CHECKLIST_OWNERS = Object.freeze(['both','cameron','kym']);

function normalizeFields(fields = {}, existing = null) {
  const listTypeInput = fields.listType == null || fields.listType === '' ? (existing?.listType || 'permanent') : fields.listType;
  if (typeof listTypeInput !== 'string' || !CHECKLIST_LIST_TYPES.includes(listTypeInput)) throw new Error('Invalid checklist list type');
  const listType = listTypeInput;
  if (typeof fields.title !== 'string') throw new Error('Checklist item title must be text');
  const title = fields.title.trim();
  if (!title) throw new Error('Checklist item title is required');
  const itineraryId = listType === 'destination' ? (fields.itineraryId || existing?.itineraryId || null) : null;
  if (listType === 'destination' && !itineraryId) throw new Error('Destination checklist item requires a destination');
  const stageInput = fields.stage == null || fields.stage === '' ? (existing?.stage || 'before-leave') : fields.stage;
  if (typeof stageInput !== 'string' || !CHECKLIST_STAGES.includes(stageInput)) throw new Error('Invalid checklist stage');
  const stage = stageInput;
  const ownerInput = fields.owner == null || fields.owner === '' ? (existing?.owner || 'both') : fields.owner;
  if (typeof ownerInput !== 'string') throw new Error('Invalid checklist owner');
  const owner = ownerInput.toLowerCase();
  if (!CHECKLIST_OWNERS.includes(owner)) throw new Error('Invalid checklist owner');
  const dueDate = fields.dueDate ? toISODate(fields.dueDate) : null;
  if (fields.required != null && typeof fields.required !== 'boolean') throw new Error('Checklist required flag must be boolean');
  const required = fields.required == null ? Boolean(existing?.required ?? true) : fields.required;
  return {
    listType,
    itineraryId,
    title,
    stage,
    owner,
    required,
    dueDate,
    notes:fields.notes == null ? '' : (typeof fields.notes === 'string' ? fields.notes.trim() : (() => { throw new Error('Checklist notes must be text'); })()),
    completed:listType === 'permanent' ? false : Boolean(existing?.completed),
    completedAt:listType === 'permanent' ? null : (existing?.completedAt || null),
    completedForItineraryIds:listType === 'permanent' ? [...new Set(existing?.completedForItineraryIds || [])] : []
  };
}

export function checklistTypeChangeDropsCompletion(existing, nextListType) {
  if (!existing || existing.listType === nextListType) return false;
  if (existing.listType === 'permanent') return Array.isArray(existing.completedForItineraryIds) && existing.completedForItineraryIds.length > 0;
  return existing.completed === true || existing.completedAt != null;
}

export function saveChecklistItemDraft(draft, { itemId = null, fields }, options = {}) {
  const existing = itemId ? draft.checklists.find(item => item.id === itemId) : null;
  if (itemId && !existing) throw new Error('Checklist item not found');
  const normalized = normalizeFields(fields, existing);
  if (normalized.itineraryId && !draft.itinerary.some(item => item.id === normalized.itineraryId)) throw new Error('Selected destination no longer exists');
  if (existing && checklistTypeChangeDropsCompletion(existing, normalized.listType) && options.allowCompletionHistoryReset !== true) {
    throw new Error('Changing this checklist type would remove saved completion history and requires confirmation.');
  }
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
  const record = draft.checklists[index];
  if (typeof completed !== 'boolean') throw new Error('Checklist completed flag must be boolean');
  const nextCompleted = completed;
  if (record.listType === 'permanent') {
    const scope = String(options.scopeItineraryId || '').trim();
    if (!scope) throw new Error('Permanent checklist completion requires an active move destination');
    if (!draft.itinerary.some(item => item.id === scope)) throw new Error('Active move destination no longer exists');
    const scopes = new Set(record.completedForItineraryIds || []);
    if (nextCompleted) scopes.add(scope);
    else scopes.delete(scope);
    draft.checklists[index] = touchRecord(record, { completed:false, completedAt:null, completedForItineraryIds:[...scopes] }, options);
  } else {
    // Use one canonical record timestamp for both modifiedAt and completedAt.
    // Reading the device clock twice in one tap can race a backwards clock
    // correction and otherwise create completedAt > modifiedAt.
    const saved = touchRecord(record, { completed:nextCompleted }, options);
    saved.completedAt = nextCompleted ? saved.modifiedAt : null;
    draft.checklists[index] = saved;
  }
  return draft.checklists[index];
}

export function deleteChecklistItemDraft(draft, itemId) {
  const before = draft.checklists.length;
  draft.checklists = draft.checklists.filter(item => item.id !== itemId);
  if (draft.checklists.length === before) throw new Error('Checklist item not found');
  return true;
}
