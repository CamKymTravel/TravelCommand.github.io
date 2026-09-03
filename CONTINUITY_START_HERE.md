# Travel Command Centre V1 — V44 iPad Visual Candidate Start Here

**Continuity package:** V44 IPAD VISUAL CANDIDATE — 3 September 2026 AEST  
**Role:** exact active-working-state continuity baseline prepared for Cameron's real iPad acceptance pass  
**Master status:** NOT release/master locked — real iPad acceptance remains outstanding  
**Visual status:** NOT Gold Locked — Cameron's 1024×768 iPad approval is still mandatory  
**Runtime identity:** `1.2.0-v44-ipad-visual-candidate`  
**Offline cache generation:** `tcc-v1-v44-ipad-visual-candidate-2026-09-03`  
**Package size:** 99 extracted files  
**Predecessor:** verified V43 active continuity baseline

## Mandatory first action in a new chat

Extract this ZIP and run from its folder **before changing any app file**:

```bash
python3 verify_regression_guard.py --verify
```

It must finish with:

```text
PASSED — BASELINE VERIFIED
```

If it does not pass, stop. Do not reconstruct, simplify, cherry-pick from an older ZIP, or continue from screenshots alone.

## This V44 package is now the authority

V44 is the exact successor to the verified V43 working tree. It absorbs only the two evidence-backed Safari export compatibility changes made after V43:

- Settings Backup Export keeps the `.json` filename/content but creates the downloadable Blob as `application/octet-stream` for improved iPad/WebKit download reliability.
- Protected Recovery Raw Export uses the same `application/octet-stream` treatment while preserving the existing delayed object-URL cleanup.

V44 also bumps the runtime/cache identity so an installed iPad cannot silently continue serving V43 JavaScript.

Authority order:

1. `LOCKED_REQUIREMENTS.md` — protected behaviour, workflow, layout and interaction contract.
2. Current V44 runtime/data-model files — exact implementation authority.
3. `OUTSTANDING_WORK.md` — 100-item no-loss ledger plus target-device carry-forward.
4. `REF_*.jpeg` — approved/near-approved visual layout, density and flow references.
5. `header-assets.bin` + `header-index.json` — supplied header-image authority.

## Latest verified V44 checkpoint

Immediately before this freeze:

- V43 anti-regression guard: **PASSED — exactly 2 allow-listed changes**.
- JavaScript ES modules: **62/62 parse**.
- App Health on migrated multi-year simulation: **9/9 verified**.
- Full itinerary routing: **1,461/1,461 days**, exactly one stay per day.
- Cross-screen model-build continuation probe: **2,310 model builds completed without error**.
- Final functional continuation probe: **3,283/3,283 checks passed**.
- Dated Expense and Reservation allocation: exact matching itinerary occurrence/ID retained.
- Expense/Reservation/Calendar/Checklist/Vault mutation save/delete probes: passed.
- Reservation duplicate protection and protected-email case-insensitive duplicate protection: passed.
- Vault split storage: screenshot bytes externalise to offline asset storage, materialise into one-file Backup, and restore back into split storage successfully.
- Failed Save rollback: last-good state preserved, Protected Recovery entered, Retry Storage restored the known-good state.
- Offline service-worker shell coverage: complete for runtime JS/CSS, header archive/index, manifest and simulation fixture.
- Static dead-control sweep: rendered screen buttons remain wired or intentionally disabled by unavailable state; no new decorative action was introduced.
- Chromium/Playwright local visual rendering remains environment-blocked with `ERR_BLOCKED_BY_ADMINISTRATOR`; no source-only check is being misrepresented as an iPad visual pass.

## Active work that MUST continue

The source/runtime audit is now complete enough to move to the target device. Remaining acceptance work is deliberately limited to real iPad behaviour:

1. Complete the real **1024×768 iPad Safari/Home-Screen visual and interaction pass** across every screen, modal, expanded widget, keyboard/form state, header crop, scroll state and exact-record navigation.
2. Specifically validate the Vault IndexedDB path on the target iPad: add multiple screenshots, close/reopen the Home Screen app, Backup, Restore, Recovery retry, screenshot deletion and storage-pressure messaging.
3. Confirm first-install/Home-Screen workflow and that the V44 cache identity is active. Safari and the installed Home-Screen app can have separate practical storage contexts, so move any real data with Backup/Restore rather than assuming browser storage is shared.
4. Record only evidence-backed iPad defects. Do not redesign, simplify, remove features, recolour approved widgets or weaken locked date-driven budgeting.
5. Do not declare release/master or Gold Lock until the real iPad pass is completed and Cameron explicitly approves it.

## Regression protocol for every next-chat batch

Before the first edit:

```bash
python3 verify_regression_guard.py --verify
```

During a focused batch, allow only the exact files intentionally being edited:

```bash
python3 verify_regression_guard.py --verify --allow-changes path/to/file1 path/to/file2
```

After each batch, run relevant targeted probes plus JavaScript ES-module parsing and offline-cache/dependency checks. Before another continuity freeze, absorb only verified intentional changes, bump runtime/cache identity if runtime assets changed, regenerate `BASELINE_SHA256.txt` **last**, and require the new verifier to pass with **no allow-list** on a fresh extraction.

## Critical no-loss instruction

**Do not recreate, simplify, remove, recolour, restyle away or silently substitute protected behaviour. Continue from this exact V44 iPad visual candidate and change only what real evidence shows is defective.**
