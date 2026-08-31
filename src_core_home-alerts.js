import { formatAUDate } from './src_core_dates.js';

const PRIORITY_ORDER = Object.freeze({ critical: 0, high: 1, medium: 2, low: 3, info: 4 });

function dateKey(alert) {
  const value = alert.dueDate || alert.dateTime || alert.createdAt || '9999-12-31T23:59:59.999Z';
  const time = new Date(value).valueOf();
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}

export function sortActiveAlerts(alerts = []) {
  return [...alerts]
    .filter(alert => alert?.status !== 'dismissed' && alert?.active !== false)
    .sort((a, b) => {
      const aPriority = PRIORITY_ORDER[a.priority] ?? PRIORITY_ORDER.info;
      const bPriority = PRIORITY_ORDER[b.priority] ?? PRIORITY_ORDER.info;
      return aPriority - bPriority || dateKey(a) - dateKey(b) || String(a.title || '').localeCompare(String(b.title || ''));
    });
}

export function buildHomeAlerts(alerts = [], { limit = 6 } = {}) {
  return sortActiveAlerts(alerts).slice(0, Math.max(0, Number(limit) || 0)).map(alert => ({
    id: alert.id,
    title: alert.title || 'Alert',
    message: alert.message || '',
    priority: alert.priority || 'info',
    dueDate: alert.dueDate || null,
    displayDueDate: alert.dueDate ? formatAUDate(alert.dueDate) : '',
    source: alert.source || null
  }));
}
