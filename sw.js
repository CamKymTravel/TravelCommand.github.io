const CACHE_NAME = 'tcc-v1-year4-simulation-flat-v12';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './simulation-clock.js',
  './simulation-data.json',
  './src_components_confirmation.js',
  './src_components_form-session.js',
  './src_components_modal.js',
  './src_components_offline-map.js',
  './src_components_sidebar.js',
  './src_core_app-health.js',
  './src_core_backup.js',
  './src_core_budget.js',
  './src_core_budget-ledger.js',
  './src_core_budget-view-model.js',
  './src_core_calendar-event-mutations.js',
  './src_core_calendar-view-model.js',
  './src_core_checklist-mutations.js',
  './src_core_checklist-view-model.js',
  './src_core_coordinates.js',
  './src_core_currency.js',
  './src_core_dates.js',
  './src_core_device-time.js',
  './src_core_entities.js',
  './src_core_expense-mutations.js',
  './src_core_reservation-mutations.js',
  './src_core_reservations-view-model.js',
  './src_core_global-search.js',
  './src_core_home-alerts.js',
  './src_core_home-view-model.js',
  './src_core_itinerary-mutations.js',
  './src_core_itinerary-view-model.js',
  './src_core_ids.js',
  './src_core_journey-map-model.js',
  './src_core_journey-history-view-model.js',
  './src_core_migrations.js',
  './src_core_planning.js',
  './src_core_records.js',
  './src_core_runtime-config.js',
  './src_core_relationships.js',
  './src_core_restore.js',
  './src_core_schema.js',
  './src_core_schengen.js',
  './src_core_settings-mutations.js',
  './src_core_state.js',
  './src_core_storage.js',
  './src_core_upcoming-events.js',
  './src_core_validation.js',
  './src_core_pin.js',
  './src_core_vault-access.js',
  './src_core_vault-mutations.js',
  './src_core_vault-view-model.js',
  './src_core_year-filters.js',
  './src_design_app.css',
  './src_design_components.css',
  './src_design_reset.css',
  './src_design_screens.css',
  './src_design_tokens.css',
  './src_main.js',
  './src_screens_home.js',
  './src_screens_budget.js',
  './src_screens_calendar.js',
  './src_screens_checklist.js',
  './src_screens_itinerary.js',
  './src_screens_journey-history.js',
  './src_screens_reservations.js',
  './src_screens_settings.js',
  './src_screens_vault.js',
  './src_screens_registry.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match('./index.html'))));
});
