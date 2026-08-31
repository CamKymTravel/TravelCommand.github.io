const VALID_STATUSES = new Set(['allowed', 'not-allowed', 'not-checked']);

export function buildSchengenStatus(settings = {}) {
  const source = settings.schengen || {};
  const status = VALID_STATUSES.has(source.status) ? source.status : 'not-checked';
  const daysUsed = Number.isFinite(Number(source.daysUsed)) ? Math.max(0, Number(source.daysUsed)) : null;
  const daysRemaining = Number.isFinite(Number(source.daysRemaining)) ? Math.max(0, Number(source.daysRemaining)) : null;

  return {
    status,
    allowed: status === 'allowed' ? true : status === 'not-allowed' ? false : null,
    daysUsed,
    daysRemaining,
    lastCheckedDate: source.lastCheckedDate || null,
    note: source.note || ''
  };
}
