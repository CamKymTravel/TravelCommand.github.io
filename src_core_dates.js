const DAY_MS = 86_400_000;

function validateISOCalendarDate(iso) {
  const match = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function legacyAUDateToISO(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  return validateISOCalendarDate(iso) ? iso : null;
}

export function toISODate(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.valueOf())) throw new Error('Invalid date');
    return value.toISOString().slice(0, 10);
  }
  if (typeof value !== 'string') throw new Error('Invalid date');
  const text = value.trim();
  const leadingDate = text.match(/^(\d{4}-\d{2}-\d{2})(?:$|T)/)?.[1];
  if (!leadingDate || !validateISOCalendarDate(leadingDate)) throw new Error('Invalid date');
  return leadingDate;
}

export function validateDateTime(value) {
  if (typeof value !== 'string') throw new Error('Invalid date and time');
  const text = value.trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(?:Z|[+-](\d{2}):(\d{2}))?$/);
  if (!match) throw new Error('Invalid date and time');
  toISODate(text);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = match[6] == null ? 0 : Number(match[6]);
  const offsetHour = match[7] == null ? 0 : Number(match[7]);
  const offsetMinute = match[8] == null ? 0 : Number(match[8]);
  if (hour > 23 || minute > 59 || second > 59 || offsetHour > 23 || offsetMinute > 59) throw new Error('Invalid date and time');
  return text;
}

export function validateDateOrDateTime(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Invalid date');
  const text = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return toISODate(text);
  validateDateTime(text);
  return text;
}

export function formatAUDate(value) {
  const iso = toISODate(value);
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

export function stayDurationDays(start, end) {
  const startISO = toISODate(start);
  const endISO = toISODate(end);
  if (!startISO || !endISO) throw new Error('Stay dates are required');
  const a = new Date(`${startISO}T00:00:00Z`);
  const b = new Date(`${endISO}T00:00:00Z`);
  if (b < a) throw new Error('End date precedes start date');
  return Math.floor((b - a) / DAY_MS) + 1;
}

export function progressPercent(start, end, current) {
  const total = stayDurationDays(start, end);
  const startDate = new Date(`${toISODate(start)}T00:00:00Z`);
  const currentDate = new Date(`${toISODate(current)}T00:00:00Z`);
  const elapsed = Math.floor((currentDate - startDate) / DAY_MS) + 1;
  return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
}

export function stayDayMetrics(start, end, current) {
  const totalDays = stayDurationDays(start, end);
  const startDate = new Date(`${toISODate(start)}T00:00:00Z`);
  const currentDate = new Date(`${toISODate(current)}T00:00:00Z`);
  const rawDay = Math.floor((currentDate - startDate) / DAY_MS) + 1;
  const currentDay = Math.max(0, Math.min(totalDays, rawDay));
  return {
    currentDay,
    totalDays,
    remainingDays: currentDay <= 0 ? totalDays : Math.max(0, totalDays - currentDay),
    progress: Math.max(0, Math.min(100, Math.round((currentDay / totalDays) * 100)))
  };
}
