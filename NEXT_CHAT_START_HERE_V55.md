# Travel Command Centre V1 — V55 Athens Simulation R13 Handoff

**Date:** 5 September 2026  
**Package role:** SCREENSHOT/INTERACTION SIMULATION derived from the protected V55 working master. Do not redesign, simplify, or reconstruct it.

## Start here
1. Run `python3 verify_working_checkpoint_v55.py --verify`. It verifies the exact Athens simulation derivative.
2. Read `SCREENSHOT_AUDIT_LOCK_V55.md` before making runtime/source changes.
3. The parent protected V55 working-checkpoint manifest SHA-256 is `dfb5c4f6b66f0c9dff03c15676d20e440d3fe945208a4e895c5aea487b8c799d`.
4. Immediate predecessor Athens R12 checkpoint manifest SHA-256 is `4377b43a580959e3cecae02ecb0950c0743492cafc992740c271b0cc3922c4be`.
5. `ACTIVE_BASELINE_MANIFEST_V55.json` is the older immutable 95-file starting snapshot and is expected to differ from this intentionally improved source. Never roll back current V55 files just to satisfy that baseline verifier.
6. Preserve the distinction between simulation fixture changes and production runtime changes.

## Simulation state
- Clock: **24/02/2029**.
- Current destination: **Athens, Greece**, 11/02/2029–15/03/2029.
- Next destination: **Budapest, Hungary**, 16/03/2029–15/04/2029.
- Storage key: `tcc:v1:simulation:athens-greece-v55`.
- PWA install shell: compass `app-icon.png` is declared in the Web App Manifest and as the Apple touch icon; runtime/cache generation is `tcc-v1-v55-athens-acceptance-r13-2026-09-05`. R13 preserves the R12 launch-country canonicalisation and R11 atomic fixture-revision protection, and now makes launch use the same canonical `findCurrentStay()` selector as Home so temporary overlaps cannot produce different current destinations.
- Fixture revision: `v55-athens-greece-2029-02-24-r1`.
- The fixture is deliberately rich for screenshots: current budget/expenses/reservations, Athens calendar items, long-term itinerary/history and Budapest preparation checklist with His/Hers optional items.

## Runtime protections carried into this simulation
- V55 runtime/cache identity and complete offline-shell inventory.
- Production/simulation storage-persistence parity: both request `navigator.storage.persist()` when WebKit exposes it; Athens keeps its separate simulation storage key.
- Atomic simulation fixture revision: newly seeded Athens state stores `meta.simulationFixtureRevision`; existing populated state with no marker is preserved, while a known older revision can still be superseded deliberately.
- State-driven launch: black compass/logo → current-destination flag + city/country → app; launch-country aliases cover Türkiye/Turkey, Czech Republic/Czechia, USA/US/U.S.A., UK/U.K. and UAE/U.A.E., and launch uses the same canonical `findCurrentStay()` selector as Home.
- Concealed three-tap Vault unlock and exact hidden-email sequence.
- Mutation-aware App Health dirty/red state; UI navigation and internal Vault byte migration do not dirty it; every Restore/replacement requires a fresh whole-app check, including a pending Restore committed later through Retry iPad Storage.
- Direct Annual Budget editing and richer Recent Expenses.
- Useful Reservations, Calendar and Journey expansions; clone-only expansion controls removed where they add no value.
- Future-only Itinerary planning headline semantics.
- Journey completed-stay inline travel/spend context.
- Checklist His/Hers quick-add and required-only Ready-to-Move logic.

## Review boundary
Cameron's next iPad screenshot pass is the authority for the remaining device-only visual/interaction acceptance. Do not claim physical iPad crop/spacing, real IndexedDB PWA lifecycle, or offline speech-voice behaviour from container-only tests.
