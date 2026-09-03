const CACHE_NAME = 'tcc-v1-v44-ipad-visual-candidate-2026-09-03';
const CACHE_PREFIX = 'tcc-v1-';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './header-index.json',
  './header-assets.bin',
  './simulation-clock.js',
  './simulation-data.json',
  './src_components_confirmation.js',
  './src_components_form-session.js',
  './src_components_modal.js',
  './src_components_offline-map.js',
  './src_components_page-hero.js',
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
  './src_design_reference-pass.css',
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
  // A new continuity/release cache must be populated from the current package,
  // not from Safari's ordinary HTTP cache. Without cache:'reload', unchanged
  // asset URLs can leave a freshly named service-worker cache holding stale
  // JavaScript/CSS from the previous installed build.
  const freshRequests = APP_SHELL.map(url => new Request(url, { cache:'reload' }));
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(freshRequests)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME && key.startsWith(CACHE_PREFIX)).map(key => caches.delete(key)))),
    self.clients.claim()
  ]));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  event.respondWith(caches.open(CACHE_NAME).then(async cache => {
    const hit = await cache.match(event.request);
    if (hit) return hit;
    try {
      const response = await fetch(event.request);
      await cache.put(event.request, response.clone());
      return response;
    } catch {
      if (event.request.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
      return new Response('Offline asset unavailable', { status:503, statusText:'Offline asset unavailable' });
    }
  }));
});
