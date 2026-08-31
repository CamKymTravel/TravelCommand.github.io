const SEARCHABLE_COLLECTIONS = Object.freeze([
  ['itinerary', 'Itinerary'],
  ['reservations', 'Reservations'],
  ['calendarEvents', 'Calendar'],
  ['journeyHistory', 'Journey History'],
  ['checklists', 'Checklist'],
  ['expenses', 'Budget']
]);

const TEXT_FIELDS = Object.freeze(['name', 'title', 'description', 'notes', 'note', 'country', 'startCity', 'category', 'type', 'owner']);

function searchableText(record) {
  return TEXT_FIELDS.map(field => record?.[field]).filter(value => value != null).join(' ').toLocaleLowerCase('en-AU');
}

function resultTitle(record, fallback) {
  return record.name || record.title || record.description || record.category || fallback;
}

export function searchCanonicalState(state, query, { limit = 20 } = {}) {
  const normalized = String(query || '').trim().toLocaleLowerCase('en-AU');
  if (!normalized) return [];
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const results = [];

  for (const [collection, screenLabel] of SEARCHABLE_COLLECTIONS) {
    for (const record of state[collection] || []) {
      const haystack = searchableText(record);
      if (!tokens.every(token => haystack.includes(token))) continue;
      results.push({
        id: record.id,
        collection,
        screenLabel,
        title: resultTitle(record, screenLabel),
        subtitle: record.country || record.notes || record.note || record.description || '',
        modifiedAt: record.modifiedAt || record.createdAt || null
      });
    }
  }

  return results
    .sort((a, b) => String(b.modifiedAt || '').localeCompare(String(a.modifiedAt || '')) || a.title.localeCompare(b.title))
    .slice(0, Math.max(0, Number(limit) || 0));
}
