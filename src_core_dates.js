const DAY_MS = 86_400_000;

function validateISOCalendarDate(iso) {
  const match = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function toISODate(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const leadingDate = value.match(/^(\d{4}-\d{2}-\d{2})(?:$|T|\s)/)?.[1];
    if (leadingDate) {
      if (!validateISOCalendarDate(leadingDate)) throw new Error('Invalid date');
      return leadingDate;
    }
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) throw new Error('Invalid date');
  return date.toISOString().slice(0, 10);
}


export function validateDateTime(value) {
  const text = String(value || '');
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

export function formatAUDate(value) {
  const iso = toISODate(value);
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

export function stayDurationDays(start, end) {
  const a = new Date(`${toISODate(start)}T00:00:00Z`);
  const b = new Date(`${toISODate(end)}T00:00:00Z`);
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
