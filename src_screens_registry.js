import { renderHomeScreen } from './src_screens_home.js';
import { renderItineraryScreen } from './src_screens_itinerary.js';
import { renderBudgetScreen } from './src_screens_budget.js';
import { renderReservationsScreen } from './src_screens_reservations.js';
import { renderCalendarScreen } from './src_screens_calendar.js';
import { renderJourneyHistoryScreen } from './src_screens_journey-history.js';
import { renderChecklistScreen } from './src_screens_checklist.js';
import { renderVaultScreen } from './src_screens_vault.js';
import { renderSettingsScreen } from './src_screens_settings.js';

const SCREEN_NAMES = Object.freeze({
  home: 'Home',
  budget: 'Budget',
  reservations: 'Reservations',
  itinerary: 'Itinerary',
  calendar: 'Calendar',
  'journey-history': 'Journey History',
  checklist: 'Checklist',
  vault: 'The Vault',
  settings: 'Settings'
});

export function renderScreen(screenId, context = {}) {
  if (!SCREEN_NAMES[screenId]) throw new Error(`Unknown screen ${screenId}`);
  if (screenId === 'home') return renderHomeScreen(context);
  if (screenId === 'budget') return renderBudgetScreen(context);
  if (screenId === 'reservations') return renderReservationsScreen(context);
  if (screenId === 'itinerary') return renderItineraryScreen(context);
  if (screenId === 'calendar') return renderCalendarScreen(context);
  if (screenId === 'journey-history') return renderJourneyHistoryScreen(context);
  if (screenId === 'checklist') return renderChecklistScreen(context);
  if (screenId === 'vault') return renderVaultScreen(context);
  if (screenId === 'settings') return renderSettingsScreen(context);
  throw new Error(`No renderer registered for screen ${screenId}`);
}

export function isValidScreen(screenId) { return Boolean(SCREEN_NAMES[screenId]); }
