# Travel Command Centre V1 — Changeset V53 → V54 Touch-Target Completion

**Date:** 4 September 2026 AEST  
**Role:** focused acceptance successor built directly from the frozen V53 acceptance-repair ZIP after continued offline deep audit.  
**Critical rule:** V54 absorbs V53 in full. It does not reopen or redesign any approved screen.

## Why V54 was necessary
The continued post-freeze audit proved a weakness that the new V53 screen-structure matrix still did not catch: an earlier protected 44px iPad touch-target rule could remain in the stylesheet while a later rule of equal specificity silently overrode it to 38px. Hashes and marker checks therefore remained green even though the effective final cascade regressed.

Two real late-cascade defects were reproduced:
1. `Reservations` flight-scope selection tiles (`reservation-flight-scope-tile`) were hardened to 44px, then later shrunk to 38px.
2. `Itinerary` Forward Coverage switches (`itinerary-coverage-switch`) were hardened to 44px, then later shrunk to 38px.

## Application/runtime changes from frozen V53
1. `src_design_reference-pass.css` — restores both protected controls to a final 44px minimum and adds an end-of-file V54 cascade guard.
2. `src_core_schema.js` — advances runtime identity to `1.2.0-v54-touch-target-completion`.
3. `src_core_runtime-config.js` — uses the V54 worker URL.
4. `index.html` — uses the V54 worker URL for production/simulation boot consistency.
5. `sw.js` — advances cache identity to `tcc-v1-v54-touch-target-completion-2026-09-04`.

## Protocol/continuity changes
- `ACCEPTANCE_MATRIX_V54.md` adds effective-final-cascade touch-target protection.
- `v54_deep_acceptance.mjs` carries the deep V53 suite forward and advances the future-generation rejection probe to V55.
- `verify_regression_guard.py` now verifies V54 identity and the final cascade for both affected controls, so the old “44px exists somewhere” false positive cannot recur.
- Continuity/contract/package documentation is promoted to V54 while preserving all V53/V52 ancestry.

## Scope boundary
No canonical schema migration, colour, card hierarchy, route logic, budget calculation, helper content, Vault behaviour or destination-header design is changed. V54 adds validation for future Standard-stay edits and an App Health repair warning for legacy blank-country records, while remaining backward-compatible. Physical target-iPad acceptance remains required before Gold/Master Lock. Athens simulation remains blocked until the accepted real build is confirmed.

## V54 validation evidence before freeze
- Frozen V53 predecessor verified with `--verify --deep` before edit.
- JavaScript ES-module parse: **63/63**.
- CSS structure: **PASS**.
- Continuous model sweep: **1,461/1,461 days; 10,227/10,227 builds**.
- V49 persisted-state migration / V49 backup compatibility: **PASS**.
- Future V55 generation rejection: **PASS**.
- Date-driven Expense/Reservation Destination Budget routing and To Book exclusion: **PASS**.
- V54 final-cascade negative test: deliberately shrinking the final protected rule to 38px makes the verifier fail for **both** controls.
- Dead-button heuristic: all 96 constructed button sites resolved to a click/submit/disabled path; the one long function was manually confirmed to bind its click listener.
- Runtime V53 worker/cache references: **none** remain in active runtime sources.
- Final package target: **91 flat files / 90 protected manifest entries**, under the 100-file cap.


## Late deep-audit repairs absorbed before V54 freeze
6. `src_core_reservations-view-model.js` — replaces the O(n²) all-pairs duplicate-health scan with an indexed grouping algorithm while preserving the existing date-only wildcard semantics exactly. Equivalence was proven across 1,200 randomized datasets / 54,378 records.
7. `src_core_entities.js` — new/edited Standard stays now require a non-blank Country.
8. `src_screens_itinerary.js` — the Standard-stay Country input mirrors that requirement in the editor while Cruise/RV retains Starting Country behaviour.
9. `src_core_app-health.js` — legacy Standard stays with blank Country remain loadable but are surfaced as a repair issue instead of silently losing header/helper context.

The final V53→V54 application/source-runtime change set is **9 files**: the original five V54 identity/touch-target files plus these four late deep-audit repairs. No data migration is required for legacy blank-country records; compatibility is intentionally preserved.

## Additional proof before freeze
- 1,200 randomized duplicate datasets / 54,378 reservation records: old and indexed duplicate grouping **100% equivalent**.
- Synthetic long-retirement scale (6,000 expenses / 600 reservations): Reservations model approximately **8–10 ms** in this environment after the indexed repair, versus multi-second all-pairs behaviour. Timing is evidence, not a device performance guarantee.
- 900 randomized Expense/Reservation/Calendar Save/Edit/Delete operations: pass with canonical validation and backup/restore round-trip.
- 135 dependency-heavy Itinerary/Checklist mutation operations: pass with cleanup and backup/restore round-trip.
- 57 focused Settings/PIN/Schengen/Calendar/Cruise/RV/Add-Edit cross-screen assertions: pass.
- Full 1,461-day / 10,227-view-model migrated-state sweep: pass on the combined V54 candidate.
