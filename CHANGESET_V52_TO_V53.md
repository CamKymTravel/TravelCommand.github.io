# Travel Command Centre V1 — Changeset V52 → V53 Acceptance Repair

**Date:** 4 September 2026 AEST  
**Role:** acceptance-repair candidate built directly from the V52 active no-loss tree.  
**Critical rule:** V53 does not discard V52. It absorbs the existing V52 tree plus the post-V52 no-loss/runtime fixes and the screenshot-evidenced acceptance repairs below.

## Why V53 was necessary
The V52 regression guard correctly protected file hashes against accidental drift, but it could still certify an already-regressed visual state because the approved screen hierarchy and icon treatment were not executable acceptance criteria. The failed Athens simulation exposed that gap: a package could match V52 yet still show missing glyph icons, an outdated Itinerary hierarchy and incomplete Home/editor structure.

V53 therefore changes the definition of regression protection: **baseline identity + locked visual/interaction structure + deep migrated-state behaviour** must all pass.

## App source/runtime files changed from frozen V52
Twenty application source/runtime files differ from the frozen V52 tree:

1. `index.html` — mixed-version service-worker bootstrap barrier; V53 worker identity.
2. `src_components_icons.js` — new deterministic inline SVG icon component.
3. `src_components_modal.js` — post-V52 protected recovery/material confirmation behaviour retained.
4. `src_components_page-hero.js` — transient header-load retry; no false Indonesia fallback when no stay exists.
5. `src_components_sidebar.js` — deterministic SVG navigation icons; authoritative Save wording.
6. `src_core_runtime-config.js` — V53 service-worker identity.
7. `src_core_schema.js` — app identity promoted to `1.2.0-v53-acceptance-repair`.
8. `src_core_vault-view-model.js` — semantic category icon keys; no platform emoji fallback.
9. `src_design_components.css` — shared protected recovery/material/touch treatment retained.
10. `src_design_reference-pass.css` — repaired iPad hierarchy/material/icon/editor acceptance styling.
11. `src_screens_budget.js` — reference hierarchy plus numbered Add Expense flow; date-driven Destination Budget allocation.
12. `src_screens_calendar.js` — deterministic SVG month/add-note/legend controls and acceptance shell.
13. `src_screens_checklist.js` — deterministic controls/info icon and protected hierarchy.
14. `src_screens_home.js` — current/next/progress restored; deterministic card markers; rich 78-country helpers retained.
15. `src_screens_itinerary.js` — Forward Coverage → six planning stats → Add/Search → Upcoming → forward map → Completed ordering.
16. `src_screens_journey-history.js` — approved summary/map/analytics/table continuity retained.
17. `src_screens_reservations.js` — approved dashboard/rail hierarchy plus richer Add Reservation editor.
18. `src_screens_settings.js` — protected backup/recovery and App Health behaviour retained.
19. `src_screens_vault.js` — deterministic Vault icon/lock treatment and post-V52 asset/recovery behaviour retained.
20. `sw.js` — V53 cache identity and busy-window-safe update behaviour.

## Verification/protocol additions
- `ACCEPTANCE_MATRIX_V53.md` — executable-screen acceptance contract in human-readable form.
- `v53_deep_acceptance.mjs` — migration, backup, routing and continuous view-model probe.
- `verify_regression_guard.py` — now checks locked screen hierarchy, deterministic icons, retired controls and optional `--deep` behavioural sweep in addition to hashes.

## Confirmed behavioural repairs absorbed from the post-V52 audit
- failed delete/type-change/Restore confirmations propagate storage failures into central Protected Recovery;
- Safari speech voices may arrive after initial page load; local-only voice list now refreshes on `voiceschanged`;
- service-worker identity no longer reuses the V50/V52 cache path;
- failed packed-header reads can retry during the same app session;
- no-current-stay banners no longer imply Indonesia;
- sidebar no longer claims unsaved typing is already saved;
- Home next destination and Days in current stay progress are restored;
- the first visit after an update cannot intentionally run a new `index.html` with an old controlled JavaScript shell;
- interactive glyphs used for navigation/card controls are deterministic SVG rather than Safari font symbols;
- Add Expense and Add Reservation match the approved hierarchy without restoring the obsolete Annual/Destination picker;
- Itinerary no longer places the large map ahead of Forward Coverage and the six approved planning statistics.

## V53 validation evidence before freeze
- JavaScript ES-module parse: **63/63**.
- CSS structure: **PASS**.
- Migrated historical simulation fixture: **canonical under V53**.
- Continuous fixture sweep: **1,461/1,461 days; 10,227/10,227 core view-model builds**.
- V49 persisted state → V53 migration: **PASS**.
- V49 backup compatibility under V53: **PASS**.
- Future V54 state rejection under V53: **PASS**.
- Expense date → exact Destination Budget: **PASS**.
- Reservation date → exact Destination Budget: **PASS**.
- To Book reservation excluded from budget ledger: **PASS**.
- Expense outside all itinerary stays rejected: **PASS**.
- Service-worker app-shell inventory: protected by verifier.
- Package cap: remains below 100 files.

## What V53 does NOT claim
V53 is the repaired **iPad acceptance candidate**, not Gold/Master Lock. The physical target iPad remains authoritative for final screenshot review, offline voice availability and practical Vault screenshot/storage validation. The Athens simulation must be rebuilt only after this V53 master candidate has been accepted on the iPad.
