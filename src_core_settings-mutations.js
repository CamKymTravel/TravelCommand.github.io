import { toISODate } from './src_core_dates.js';

function currency(value) {
  const code = String(value ?? '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) throw new Error('Default currency must be a 3-letter code');
  return code;
}

export function saveGeneralSettingsDraft(state, fields = {}) {
  const annualBudgetAUD = Number(fields.annualBudgetAUD ?? 0);
  if (!Number.isFinite(annualBudgetAUD) || annualBudgetAUD < 0) throw new Error('Annual budget must be zero or greater');
  state.settings.journeyStartDate = fields.journeyStartDate ? toISODate(fields.journeyStartDate) : null;
  state.settings.defaultCurrency = currency(fields.defaultCurrency || 'AUD');
  state.settings.annualBudgetAUD = annualBudgetAUD;
  state.settings.dateFormat = 'DD/MM/YYYY';
  return state.settings;
}

export function enablePinDraft(state, pinHash) {
  if (!String(pinHash || '').trim()) throw new Error('Secure PIN hash is required');
  state.settings.pinEnabled = true;
  state.settings.pinHash = String(pinHash);
  return state.settings;
}

export function disablePinDraft(state) {
  state.settings.pinEnabled = false;
  state.settings.pinHash = null;
  return state.settings;
}
