import { toISODate } from './src_core_dates.js';
import { sortItinerary } from './src_core_planning.js';

function currency(value) {
  const code = String(value ?? '').trim().toUpperCase();
  if (code === 'XXX' || !/^[A-Z]{3}$/.test(code)) throw new Error('Default currency must be a real 3-letter code');
  return code;
}

export function saveGeneralSettingsDraft(state, fields = {}) {
  const annualBudgetInput = fields.annualBudgetAUD ?? 0;
  if (typeof annualBudgetInput === 'boolean' || (annualBudgetInput != null && typeof annualBudgetInput === 'object')) throw new Error('Annual budget must be numeric');
  const annualBudgetAUD = Number(annualBudgetInput);
  if (!Number.isFinite(annualBudgetAUD) || annualBudgetAUD < 0) throw new Error('Annual budget must be zero or greater');
  if (annualBudgetAUD > Number.MAX_SAFE_INTEGER) throw new Error('Annual budget exceeds the safe numeric range');
  const journeyStartDate = fields.journeyStartDate ? toISODate(fields.journeyStartDate) : null;
  const earliest = sortItinerary(state.itinerary || [])[0]?.startDate || null;
  if (journeyStartDate && earliest && toISODate(earliest) < journeyStartDate) throw new Error('Journey Start cannot be later than the earliest itinerary stay. Edit the itinerary first.');
  // Validate every field before writing any Settings value. StateService.commit
  // already works on an isolated draft, but mutation helpers should remain
  // atomic on their own so a rejected field can never leave a partially
  // changed draft for another caller to reuse.
  const defaultCurrency = currency(fields.defaultCurrency == null || fields.defaultCurrency === '' ? 'AUD' : fields.defaultCurrency);
  state.settings.journeyStartDate = journeyStartDate;
  state.settings.defaultCurrency = defaultCurrency;
  state.settings.annualBudgetAUD = annualBudgetAUD;
  state.settings.dateFormat = 'DD/MM/YYYY';
  return state.settings;
}

function optionalDays(value, label) {
  if (value == null || value === '') return null;
  if (typeof value === 'boolean' || (value != null && typeof value === 'object')) throw new Error(`${label} must be numeric`);
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 90) throw new Error(`${label} must be a whole number between 0 and 90`);
  return number;
}

function optionalDate(value) { return value ? toISODate(value) : null; }

export function saveSchengenSettingsDraft(state, fields = {}) {
  let daysUsed = optionalDays(fields.daysUsed, 'Days Used');
  let daysRemaining = optionalDays(fields.daysRemaining, 'Days Remaining');
  if (daysUsed != null && daysRemaining == null) daysRemaining = 90 - daysUsed;
  else if (daysRemaining != null && daysUsed == null) daysUsed = 90 - daysRemaining;
  else if (daysUsed != null && daysRemaining != null && daysUsed + daysRemaining !== 90) throw new Error('Days Used + Days Remaining must equal 90');

  const entryDate = optionalDate(fields.entryDate);
  const plannedExitDate = optionalDate(fields.plannedExitDate);
  const mustLeaveByDate = optionalDate(fields.mustLeaveByDate);
  const lastCheckedDate = optionalDate(fields.lastCheckedDate);
  if (entryDate && plannedExitDate && plannedExitDate < entryDate) throw new Error('Planned Exit cannot be before Entry');
  if (entryDate && mustLeaveByDate && mustLeaveByDate < entryDate) throw new Error('Must Leave By cannot be before Entry');
  if (plannedExitDate && mustLeaveByDate && plannedExitDate > mustLeaveByDate) throw new Error('Planned Exit cannot be after Must Leave By');

  if (!['allowed','not-allowed','not-checked'].includes(fields.status)) throw new Error('Invalid Schengen status');
  state.settings.schengen = {
    status:fields.status,
    daysUsed,daysRemaining,entryDate,plannedExitDate,mustLeaveByDate,lastCheckedDate,
    note:fields.note == null ? '' : (typeof fields.note === 'string' ? fields.note.trim() : (() => { throw new Error('Schengen note must be text'); })())
  };
  return state.settings.schengen;
}

export function enablePinDraft(state, pinHash) {
  if (typeof pinHash !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(pinHash)) throw new Error('Secure PIN hash must use canonical SHA-256 format');
  state.settings.pinEnabled = true;
  state.settings.pinHash = pinHash;
  state.settings.pinRecoveryNotice = '';
  return state.settings;
}

export function disablePinDraft(state) {
  state.settings.pinEnabled = false;
  state.settings.pinHash = null;
  state.settings.pinRecoveryNotice = '';
  return state.settings;
}
