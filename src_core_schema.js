export const SCHEMA_VERSION = 2;
export const APP_VERSION = '1.2.0-v60-r7.4-tiny-currency-ui-s53';

export const TRAVEL_TYPES = Object.freeze(['standard', 'motorhome', 'cruise']);
// `accommodation` is retained only as a legacy compatibility value. New/editable
// booking categories are Hotel and Airbnb as separate reservation types.
export const RESERVATION_TYPES = Object.freeze(['flight', 'train', 'cruise', 'rv', 'hotel', 'airbnb', 'accommodation', 'ticket']);
export const FLIGHT_SCOPES = Object.freeze(['domestic', 'international']);
export const RESERVATION_STATUSES = Object.freeze(['paid', 'unpaid', 'booked', 'to-book']);
export const EXPENSE_CATEGORIES = Object.freeze(['groceries', 'eating-out', 'transport', 'entertainment', 'shopping', 'miscellaneous']);

export function createEmptyState(now = new Date().toISOString()) {
  return {
    schemaVersion: SCHEMA_VERSION,
    meta: {
      createdAt: now,
      modifiedAt: now,
      revision: 0,
      appVersion: APP_VERSION
    },
    settings: {
      journeyStartDate: null,
      dateFormat: 'DD/MM/YYYY',
      defaultTravellers: 2,
      defaultCurrency: 'AUD',
      annualBudgetAUD: 0,
      annualBudgetsAUD: {},
      pinEnabled: false,
      pinHash: null,
      pinRecoveryNotice: '',
      schengen: {
        status: 'not-checked',
        daysUsed: null,
        daysRemaining: null,
        entryDate: null,
        plannedExitDate: null,
        mustLeaveByDate: null,
        lastCheckedDate: null,
        note: ''
      }
    },
    itinerary: [],
    routePoints: [],
    expenses: [],
    reservations: [],
    calendarEvents: [],
    journeyHistory: [],
    checklists: [],
    vault: [],
    attachments: [],
    accounts: [],
    alerts: [],
    streaming: [],
    protectedEmails: [],
    ui: {
      activeScreen: 'home',
      vaultUnlocked: false,
      streamingOpenedSinceUnlock: false,
      pendingOpen: null,
      calendarView: 'month',
      calendarMonth: null,
      checklistListType: 'permanent',
      checklistStage: null,
      reservationType: 'flight',
      reservationCompletedOpen: false,
      itineraryCompletedOpen: false,
      journeyHistoryPage: 1,
      dismissedHomeAlertIds: []
    }
  };
}
