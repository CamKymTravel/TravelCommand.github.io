# Travel Command Centre V1 — V51 → V52 Absorbed Change Set

**Freeze date:** 4 September 2026 AEST  
**Purpose:** explicit no-loss ledger for every source/runtime file changed after the V51 frozen manifest and now absorbed into V52.  
**Pre-freeze proof:** V51 verifier passed with exactly **17 allow-listed changes** and zero unexpected files.  
**V52 rule:** these files are no longer "working changes". Their current hashes are the V52 baseline. Reverting any one of them to V51 is a regression.

## Exact 17 absorbed files

- `src_components_confirmation.js`
- `src_components_modal.js`
- `src_components_page-hero.js`
- `src_core_itinerary-mutations.js`
- `src_core_state.js`
- `src_core_vault-access.js`
- `src_design_reference-pass.css`
- `src_main.js`
- `src_screens_budget.js`
- `src_screens_calendar.js`
- `src_screens_checklist.js`
- `src_screens_home.js`
- `src_screens_journey-history.js`
- `src_screens_reservations.js`
- `src_screens_settings.js`
- `src_screens_vault.js`
- `sw.js`

## Absorbed implementation / integrity work

- Calendar Month/Agenda runtime defect removed and Calendar direct/open-overflow record hand-offs preserve the visible material family.
- Parent → expanded → exact-record/editor colour/material continuity repaired across Home Alerts, Upcoming Events, Global Search, Trip Timeline, Budget, Checklist, Journey History, Calendar and Vault entry paths.
- Destructive confirmations inherit their active editor/card tone; Protected Email delete remains magenta and Vault screenshot/category confirmations remain in-family.
- Async modal actions are centrally busy-locked: Unlock/PIN changes/screenshot saves cannot be double-triggered or cancelled mid-Promise. Country Quick Look ↔ Phrase Helper focus hand-off no longer steals VoiceOver focus behind the replacement modal.
- Expanded-card snapshots can hydrate late Vault screenshots and late packed header images instead of freezing blank cloned media.
- Legacy `needsBudgetRepair` costs are protected by date as well as link ID: stay deletion, Destination Budget removal and stay-date edits cannot strand a uniquely recoverable cost or make it ambiguous. Repair records remain editable so they can actually be repaired.
- Reservation `Total Booked · AUD` excludes unresolved repair values while keeping those records visible/countable and explicitly identifies the exclusion.
- Vault screenshot physical storage is hardened: audited cleanup, retryable App Health cleanup, failed verification-write cleanup, partial multi-asset rollback, pending Protected-Recovery asset protection, in-flight staged-key protection, stale-audit suppression and live health notification.
- Backup/export readers pin screenshot bytes until their point-in-time snapshot is complete, preventing concurrent Restore or Vault deletion from removing bytes under Export. Settings Export/Restore also share a UI busy lock.
- Background date/health/state renders defer while native Files/Photos pickers or ordinary dialogs are active, preventing detached pickers and lost unsaved typing. Protected Recovery remains an immediate safety override.
- Service-worker upgrade refresh is dialog/picker aware and retains predecessor caches while any live window is unsafe/unresponsive, preventing a forced reload from discarding unsaved work or breaking an old-controller window offline.
- iPad reachability/layout hardening includes Forward Coverage wrapping, Journey History 1024px table/spend-row geometry, 44px high-frequency touch targets, and helper secondary-action touch sizing without changing approved content.
- Phrase-helper audio result/status text is a polite live region for VoiceOver; offline speech still requires a genuinely installed `localService===true` voice and remains unproven on the physical target iPad.

## Latest verified regression evidence before V52 freeze

- V51 guard with explicit changed-file list: **PASSED — 17 allow-listed changes; zero unexpected drift**.
- JavaScript ES modules: **62/62 parse**.
- CSS bundles: **6/6 structurally clean**.
- Four-year simulation: **1,461 days / 10,227 core view-model builds / zero failures** (2028 correctly 366 days).
- Country helper pairing remains **78/78/78 exact paired**, with 4 sections × 4 useful items per Quick Look country.
- Runtime/offline shell remains self-contained; no external API dependency was introduced.

## Still not claimed complete

V52 is a continuity/anti-regression freeze, **not Master/Gold Lock**. Physical target-iPad visual/interaction proof, real offline voice proof or packaged-audio fallback decision, practical Vault IndexedDB/Backup/Restore/Protected-Recovery testing, final global colour-quality pass and Cameron’s explicit colour approval remain release gates.
