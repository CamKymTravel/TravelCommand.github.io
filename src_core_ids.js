export function createId(prefix = 'rec') {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${random}`;
}

export function assertUniqueIds(records, label = 'records') {
  const seen = new Set();
  for (const record of records) {
    if (typeof record?.id !== 'string' || !record.id.trim()) throw new Error(`${label}: record missing valid text id`);
    if (seen.has(record.id)) throw new Error(`${label}: duplicate id ${record.id}`);
    seen.add(record.id);
  }
  return true;
}
