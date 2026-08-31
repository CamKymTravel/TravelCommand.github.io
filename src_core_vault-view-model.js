import { VAULT_CATEGORIES } from './src_core_vault-mutations.js';
import { formatAUDate } from './src_core_dates.js';

export const VAULT_CATEGORY_LABELS = Object.freeze({
  passport:'Passports',
  visa:'Visas',
  insurance:'Insurance',
  accommodation:'Accommodation Details',
  emergency:'Emergency Contacts'
});

export const VAULT_CATEGORY_ICONS = Object.freeze({
  passport:'▣', visa:'◆', insurance:'✚', accommodation:'⌂', emergency:'☎'
});

function newestFirst(a, b) { return String(b.modifiedAt || '').localeCompare(String(a.modifiedAt || '')); }
function displayDate(value) { return value ? formatAUDate(value) : ''; }

function recordView(record, attachments) {
  return {
    ...record,
    displayIssueDate:displayDate(record.issueDate),
    displayExpiryDate:displayDate(record.expiryDate),
    attachments:attachments.filter(item => item.vaultRecordId === record.id).sort(newestFirst)
  };
}

export function buildVaultViewModel(state, { unlocked = false, activeSection = 'overview' } = {}) {
  const counts = Object.fromEntries(VAULT_CATEGORIES.map(category => [category, state.vault.filter(record => record.category === category).length]));
  const categoryCards = VAULT_CATEGORIES.map(category => ({
    id:category,
    label:VAULT_CATEGORY_LABELS[category],
    icon:VAULT_CATEGORY_ICONS[category],
    count:counts[category]
  }));
  if (!unlocked) {
    return { unlocked:false, activeSection:'locked', categoryCards, records:[], streaming:[], recentActivity:[], protectedEmailCount:0 };
  }
  const records = state.vault.filter(record => record.category === activeSection).sort(newestFirst).map(record => recordView(record, state.attachments));
  const activity = [
    ...state.vault.map(record => ({ id:record.id, kind:'record', title:record.title, subtitle:VAULT_CATEGORY_LABELS[record.category], modifiedAt:record.modifiedAt })),
    ...state.attachments.map(record => ({ id:record.id, kind:'attachment', title:record.name, subtitle:'Screenshot attachment', modifiedAt:record.modifiedAt })),
    ...state.streaming.map(record => ({ id:record.id, kind:'streaming', title:record.service, subtitle:'Streaming', modifiedAt:record.modifiedAt }))
  ].sort(newestFirst).slice(0, 6);
  return {
    unlocked:true,
    activeSection,
    categoryCards,
    records,
    streaming:[...state.streaming].sort(newestFirst),
    recentActivity:activity,
    protectedEmailCount:state.protectedEmails.length
  };
}
