const VALID_STATUSES = new Set(['allowed', 'not-allowed', 'not-checked']);

function optionalDayCount(value) {
  if (value == null || (typeof value === 'string' && value.trim() === '')) return null;
  if (typeof value === 'boolean' || Array.isArray(value) || typeof value === 'object') return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(90, Math.round(number))) : null;
}

export function buildSchengenStatus(settings = {}) {
  const source = settings.schengen || {};
  const status = VALID_STATUSES.has(source.status) ? source.status : 'not-checked';
  let daysUsed = optionalDayCount(source.daysUsed);
  let daysRemaining = optionalDayCount(source.daysRemaining);
  if (daysUsed != null && daysRemaining == null) daysRemaining = 90 - daysUsed;
  else if (daysRemaining != null && daysUsed == null) daysUsed = 90 - daysRemaining;
  return {
    status,
    allowed: status === 'allowed' ? true : status === 'not-allowed' ? false : null,
    daysUsed,
    daysRemaining,
    entryDate:source.entryDate || null,
    plannedExitDate:source.plannedExitDate || null,
    mustLeaveByDate:source.mustLeaveByDate || null,
    lastCheckedDate:source.lastCheckedDate || null,
    note: source.note || ''
  };
}
