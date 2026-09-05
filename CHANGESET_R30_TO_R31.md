# CHANGESET V55 R30 → R31 — 05 Sep 2026

R31 is a source-level interaction/header/accessibility continuation.

- Enforced the locked **menu-only screen navigation** rule in screen source: Home alerts/events/timeline/search, Budget reservation rows, Calendar itinerary/reservation items, Checklist destination actions and Journey History no longer switch screens.
- Cross-screen rows now stay in context, using readable local detail where useful; the left sidebar remains the only screen-changing mechanism.
- Restored a shared destination orientation header to **Itinerary** above the planning map.
- Added large country flags to shared Current Stay / Next Destination headers used by Budget, Reservations, Calendar and Itinerary.
- Home Next Destination now carries a large flag and enlarges locally instead of navigating.
- Home Daily Budget, Destination Budget, Annual Position, Schengen Status and Trip Timeline are explicitly expandable for Kym's eyesight.
- Removed the small His/Hers and Permanent/Destination checklist Add controls from the dashboard cards; Add Item now lives in their large expanded views.
- Added a real per-build App Health invalidation marker: first open of R31 is dirty/red/pulsing until CHECK THE WHOLE APP succeeds; subsequent R31 reloads preserve the verified state until data changes.
- Shared photographic headers now leave more artwork visible by reducing overlay-card footprint while increasing destination/flag/date readability.
- No travel calculations, budget routing, storage schema or Vault security flow changed.
