# V54 Regression Protocol — Effective Cascade + Visual/Interaction + No-Loss

Before editing: `python3 verify_regression_guard.py --verify`.

For a deliberate focused batch, allow only the exact touched files. An allow-list pass is never a new baseline.

Before any continuity/package freeze: `python3 verify_regression_guard.py --verify --deep`. The deep pass must include the V54 migration/routing/backup probes and the full **1,461-day / 10,227-model** sweep.

The guard must pass `ACCEPTANCE_MATRIX_V54.md`. **Hash equality alone is insufficient.** An earlier correct declaration is also insufficient when the **effective final CSS cascade** is wrong. The verifier must fail if the protected Reservations flight-scope tiles or Itinerary Forward Coverage switches finish below 44px. It must also protect the indexed duplicate semantics and the Standard-stay Country requirement/legacy App Health warning.

Regenerate `BASELINE_SHA256.txt` **last**, verify without an allow-list in the source tree, package, extract the final ZIP fresh and verify the extracted copy again without an allow-list.

Never package V53/V52 over V54. Do not call V54 Gold/Master while target-iPad visual, offline voice and practical Vault acceptance remain outstanding.

---

# V53 Regression Protocol — Visual/Interaction + No-Loss

Before editing: `python3 verify_regression_guard.py --verify`.

For a deliberate focused batch, explicitly allow only the touched files. Do not treat an allow-list pass as a new baseline.

Before a continuity/package freeze: `python3 verify_regression_guard.py --verify --deep`. The deep pass must include the V53 migration/routing/backup probes and the full **1,461-day / 10,227-model** continuous sweep.

The guard must also pass `ACCEPTANCE_MATRIX_V53.md`: locked screen hierarchy, deterministic icon treatment, helper entry points and retired-feature checks are now executable acceptance rules. **Hash equality alone is insufficient.**

When freezing a new baseline, regenerate `BASELINE_SHA256.txt` **last**, then run the guard with no allow-list from the source tree and again from a fresh extraction of the final ZIP.

Never package an older/pristine V52 tree over the V53 working source. Do not call a build Gold/Master while target-iPad visual, offline voice and practical Vault acceptance remain outstanding.

---

# V52 Regression Protocol — Stop Backtracking

This is the mandatory protocol for every continuation from V52.

## 1. Verify before reading screenshots or editing code
```bash
python3 verify_regression_guard.py --verify
```
Required result: **`PASSED — BASELINE VERIFIED`** with no allow-list. Any failure means stop. Never repair a failed V52 extraction by copying V51/V50 files.

## 2. Read order
`CONTINUITY_START_HERE.md` → `CHANGESET_V51_TO_V52.md` → `LOCKED_REQUIREMENTS.md` → `OUTSTANDING_WORK.md` → `REGRESSION_PROTOCOL.md` → `VISUAL_REFERENCE_INDEX.md` → `REGRESSION_CONTRACT.json`.

## 3. During any new focused batch
- Use `python3 verify_regression_guard.py --verify --allow-changes <exact paths...>`.
- Every allowed path must correspond to a deliberate current-session change. An allow-list is not permission to drift.
- Preserve the exact V52 source first; never reconstruct from screenshots or older packages.
- Keep the package flat and ≤100 files.
- If state/storage/restore/routing/model code changes, run targeted transactional probes plus the full split 1,461-day / 10,227-build model sweep before freezing.
- If CSS/layout changes, run CSS structure checks and source-level 1024px no-horizontal-overflow checks; physical iPad remains final visual authority.

## 4. V52 high-risk regression failures
- Any of the 17 absorbed source/runtime files reverting to V51 content.
- Helper datasets dropping below exact 78/78/78 pairing, watered-down helper UI, reintroduced Current Destination Status/Quick Tips, swapped Home helper entry points, or online speech fallback.
- Legacy repair costs being stranded by stay delete, Destination Budget removal or stay-date edits.
- Repair-valued bookings entering trusted Reservation AUD totals.
- Async Unlock/PIN/screenshot actions being cancellable/double-triggerable while unresolved.
- Background renders replacing open editors, confirmations or native file/photo pickers.
- Orphan cleanup deleting in-flight staged assets, pending Protected-Recovery assets or bytes being read by Export.
- Late Vault audits overwriting newer health results.
- Export/Restore/Delete races breaking the one-file self-contained backup contract.
- Service worker navigating busy/unresponsive live windows or deleting predecessor caches before old-controller windows are safe offline.
- Generic deep-editor/confirmation colours replacing the originating material family on the already-audited paths.
- Horizontal clipping/scrolling returning to Forward Coverage or Journey History at 1024px; important touch targets dropping below the effective iPad hardening.
- Any historical 100-item no-loss ledger regression.

## 5. Before the next continuity freeze
1. Make source stable.
2. Truthfully update implemented-vs-outstanding docs and contract.
3. Update verifier markers for newly protected behaviour.
4. Regenerate `BASELINE_SHA256.txt` **last**.
5. Run no-allow-list `python3 verify_regression_guard.py --verify`.
6. Zip the exact verified tree.
7. Extract the produced ZIP to a fresh folder and run the verifier again with no allow-list.
8. Only then hand off the package.

## 6. Master / Gold Lock gate
V52 is not Master. Physical target-iPad all-screen/helper/offline-voice/Vault/update acceptance plus Cameron’s explicit final colour approval are still required.

---

# Historical V51 protocol preserved below

# V51 Regression Protocol — Stop Backtracking

## Before touching source
1. Extract the package as-is. Do not substitute an older source tree.
2. Run `python3 verify_regression_guard.py --verify`.
3. Require `PASSED — BASELINE VERIFIED`. Any failure is a STOP condition.
4. Read `CONTINUITY_START_HERE.md`, `LOCKED_REQUIREMENTS.md`, `OUTSTANDING_WORK.md`, this protocol, `VISUAL_REFERENCE_INDEX.md`, then `REGRESSION_CONTRACT.json`.

## During every implementation batch
- Use `python3 verify_regression_guard.py --verify --allow-changes <exact paths...>` while work is in progress.
- The allow-list is not permission to change files casually; it only distinguishes deliberate work from unexpected drift.
- Never solve a defect by copying an older file or by recreating a screen from memory/screenshots.
- Preserve the current source first; screenshots guide presentation but do not replace protected behaviour.
- Keep package <=100 extracted top-level files.

## Protected high-risk regressions
- Home Current Destination → Country Quick Look; Home compass → toilet helper; never merge them.
- 78/78/78 paired helper datasets; full 4×4 Quick Look density.
- Rich helper screens; never restore compact/watered-down utility panels.
- No Current Destination Status/live weather panel. No Quick Tips panel.
- Local installed voice only; no internet speech fallback and no false 100%-available claim.
- Cruise/Motorhome/RV helper context uses Starting Country.
- Parent → expanded → deeper editor/detail stays in one material family.
- Destination Budgets, reservation lifecycle, date-driven routing, no Intentional Gap, Vault hidden-email sequence, manual Schengen, backup/restore safety and all 100 historical ledger items remain protected.

## After each batch
The verifier automatically checks hashes/allow-list, ES-module syntax, CSS brace structure, service-worker shell coverage, helper pairing/density/retired panels, key material-depth markers, visual-reference pack, package count and contract markers. Run additional domain/model/restore probes whenever those areas are touched.

## Before a new continuity freeze
1. Make the source stable.
2. Update continuity/locked/outstanding/visual/contract documentation so implemented vs outstanding is truthful.
3. Update verifier rules if a newly approved behaviour needs explicit protection.
4. Regenerate `BASELINE_SHA256.txt` **last**.
5. Run `python3 verify_regression_guard.py --verify` with no allow-list.
6. Zip only after that exact no-allow-list pass.
7. Extract the produced ZIP to a fresh folder and run the verifier again before handing it off.

## Master / Gold Lock gate
Do not declare master/Gold Lock until Cameron approves the final global colour pass and the physical target-iPad tests (including helper visual fidelity, offline voice reality, zero horizontal scroll, service-worker refresh and Vault IndexedDB/Backup/Restore/Recovery) are complete.
