# R72 REGRESSION PROTOCOL — ACTIVE ENTRY POINT

**Authority:** exact V55 R72 screenshot simulation + `BASELINE_MANIFEST_R72.sha256`.

First gate: `python3 verify_continuity_r72.py`. It must PASS. Read `CURRENT_R72_STATUS.md` before changing source. Historical R71 protocol sections below remain inherited regression evidence.

---

# R71 REGRESSION PROTOCOL — ACTIVE ENTRY POINT

**Authority:** exact V55 R71 package + `BASELINE_MANIFEST_R71.sha256`.

Before editing, run:

`python3 verify_continuity_r71.py`

It must PASS. A failure means **STOP**: do not repair from an older ZIP or screenshots. Read `CURRENT_R71_STATUS.md` before deciding what remains. R69/R70 are explicitly rejected and must not be restored.

For every derivative: preserve all current functional/model gates; keep package under 100 files; advance App Health marker + service-worker query + cache identity together when live source changes; re-run the complete guard; and never declare physical iPad behaviour proven from source/container tests.

---

# V55 R36 — FULL DEEP REGRESSION PROTOCOL

**Continuity date:** 5 September 2026 AEST  
**Active checkpoint:** V55 R36  
**Purpose:** prevent visual, functional, data, navigation, storage, accessibility and packaging regression while Cameron continues the screen-by-screen refinement.  
**Hard rule:** do not redesign, simplify, delete, merge, rename, reconstruct from an older build, or copy historical colours. Fix only from this exact checkpoint forward.

## 0. Mandatory continuity gate — before editing anything

1. Extract the continuity ZIP to a NEW folder. Do not merge it into an older tree.
2. Run `python3 verify_continuity_r71.py`. It must finish **PASS**.
3. Confirm the outer package contains exactly **99 files recursively** and no `__pycache__`, `.pyc`, temp, duplicate-package or editor-backup artifacts.
4. Read in order: `CONTINUITY_START_HERE.md`, `NEXT_CHAT_START_HERE_V55.md`, `LOCKED_REQUIREMENTS.md`, `SCREENSHOT_AUDIT_LOCK_V55.md`, `OUTSTANDING_WORK.md`, this file, then `VISUAL_REFERENCE_INDEX.md`.
5. Open `VISUAL_REFERENCES.zip` only for visual comparison. It contains the complete 5 Sep screenshot audit plus historical first-build structure references. **Historical screenshots are never colour authority.**
6. If any integrity check fails, STOP. Do not repair by copying V54/V53/R33/R35 files. Re-extract the exact package.

## 1. Exact runtime/checkpoint facts

- Platform/scope: iPad landscape PWA, fully offline, manual/local data, no subscription/API dependency.
- Simulation clock: **24/02/2029** (`2029-02-24`).
- Simulation storage key: `tcc:v1:simulation:athens-greece-v55`.
- Simulation fixture revision: `v55-athens-greece-2029-02-24-r1`.
- Current destination in fixture: **Athens, Greece — 11/02/2029 to 15/03/2029**.
- Next destination: **Budapest, Hungary — 16/03/2029 to 15/04/2029**.
- R36 App Health build marker: `v55-r36-2026-09-05`.
- R36 service worker: `./sw.js?v=55-compact-widget-expansion-r36-2026-09-05`.
- R36 cache: `tcc-v1-v55-compact-widget-expansion-r36-2026-09-05`.
- Screen registry: exactly 9 screens — Home, Budget, Reservations, Itinerary, Calendar, Journey History, Checklist, The Vault, Settings.
- Sidebar/menu is the only authorised cross-screen navigation mechanism.

## 2. Authority hierarchy

1. **This exact R36 package + `BASELINE_MANIFEST_R71.sha256`** = active code/data continuity authority.
2. `LOCKED_REQUIREMENTS.md` = behaviour/interaction/accessibility authority.
3. `SCREENSHOT_AUDIT_LOCK_V55.md` + complete current screenshot audit = defect evidence and visual acceptance context.
4. Named `REF_*` images = approved structural/directional references where indexed.
5. First-build `IMG_1325`–`IMG_1333` = layout/readability/recognition reference only. **Never import their colours.**
6. Older acceptance matrices/changsets = regression archaeology only; useful for history, never allowed to overwrite R36.

## 3. Global no-loss contract

Every edit must preserve all of the following unless Cameron explicitly changes a rule:

- Current premium Home-style material/colour system is the colour authority. Use a broad differentiated semantic palette; do not make every screen the same blue/navy and do not copy old-build colours.
- Large text, large dates, strong country flags, country silhouette/outline where approved, and peripheral destination recognition are accessibility requirements for Kym.
- Important operational data must not be hidden in 6–9px micro-text.
- No horizontal scrolling on iPad landscape. Vertical scrolling is acceptable only where genuinely needed.
- Compact widgets may expand simply because enlargement helps Kym read them. Expansion must be true full-screen or near-full-screen, not token enlargement.
- Widget/card tap = stay local and enlarge/read; explicit Edit/Add button = mutate; sidebar/menu = change screen.
- No card/row/item may unexpectedly navigate to another primary screen.
- Add controls belong inside expanded small dashboard widgets where that reduces clutter (notably Checklist His/Hers and Permanent/Destination).
- Add Expense/Add Reservation/Add Destination must remain deliberate, large, clear, date-first, and hard to misroute.
- Date-driven Destination Budget allocation remains one source of truth. No silent rerouting when no dated budget exists.
- First-build screenshots are structure/readability authority only, not colour authority.
- Headers use supplied photography with minimal sensible crop; recognise the country/scene. Do not zoom so far that the image becomes meaningless.
- Home hero may be larger than shared headers. Current/Next cards must not bury the photograph.
- Current/Next destination identification uses strong flags and large destination/country/date text.
- App launch remains black compass → large current-country flag/city/country → app.
- App Health is an operational confidence control: update/mutation = red attention state and heartbeat behaviour; successful whole-app check = green/still. **Known R36 visual follow-up:** current source definitely pulses the red CHECK THE WHOLE APP button; verify on iPad whether the whole red App Health panel itself visibly pulses to Cameron's requested standard. If not, fix without changing validation logic.
- App Health becomes dirty after substantive mutations and Restore; internal Vault asset maintenance must not falsely dirty it.
- Vault locked state uses the strong vault-door / VAULT LOCKED / PROTECTED ACCESS presentation while preserving concealed three-tap unlock.
- Hidden email access remains exact: unlock Vault → open Streaming → tap compass/logo. Never expose it from locked Vault or merely unlocked Vault main screen.
- Streaming remains the large recognition-first service tile wall with local-only credentials and explicit Show/Edit.
- Backup is one complete JSON; Restore validates then replaces current data after confirmation and requires fresh App Health verification.
- Delete requires confirmation. Saved records open read-only/enlarged first where applicable; editing is explicit.
- Offline/PWA shell, local storage, IndexedDB Vault screenshots, service-worker safe update and runtime fixture protections must remain intact.

## 4. Complete source-code inventory — every code file is protected

### Runtime/boot files (3)
- `simulation-clock.js`
- `src_main.js`
- `sw.js`

### Shared components (8)
- `src_components_confirmation.js`
- `src_components_country.js`
- `src_components_form-session.js`
- `src_components_icons.js`
- `src_components_modal.js`
- `src_components_offline-map.js`
- `src_components_page-hero.js`
- `src_components_sidebar.js`

### Core/data/domain modules (44)
- `src_core_account-mutations.js`
- `src_core_app-health.js`
- `src_core_backup.js`
- `src_core_budget-ledger.js`
- `src_core_budget-view-model.js`
- `src_core_budget.js`
- `src_core_calendar-event-mutations.js`
- `src_core_calendar-view-model.js`
- `src_core_checklist-mutations.js`
- `src_core_checklist-view-model.js`
- `src_core_coordinates.js`
- `src_core_currency.js`
- `src_core_dates.js`
- `src_core_device-time.js`
- `src_core_entities.js`
- `src_core_expense-mutations.js`
- `src_core_global-search.js`
- `src_core_home-alerts.js`
- `src_core_home-view-model.js`
- `src_core_ids.js`
- `src_core_itinerary-mutations.js`
- `src_core_itinerary-view-model.js`
- `src_core_journey-history-view-model.js`
- `src_core_journey-map-model.js`
- `src_core_migrations.js`
- `src_core_pin.js`
- `src_core_planning.js`
- `src_core_records.js`
- `src_core_relationships.js`
- `src_core_reservation-mutations.js`
- `src_core_reservations-view-model.js`
- `src_core_restore.js`
- `src_core_runtime-config.js`
- `src_core_schema.js`
- `src_core_schengen.js`
- `src_core_settings-mutations.js`
- `src_core_state.js`
- `src_core_storage.js`
- `src_core_upcoming-events.js`
- `src_core_validation.js`
- `src_core_vault-access.js`
- `src_core_vault-mutations.js`
- `src_core_vault-view-model.js`
- `src_core_year-filters.js`

### Screen modules (10)
- `src_screens_budget.js`
- `src_screens_calendar.js`
- `src_screens_checklist.js`
- `src_screens_home.js`
- `src_screens_itinerary.js`
- `src_screens_journey-history.js`
- `src_screens_registry.js`
- `src_screens_reservations.js`
- `src_screens_settings.js`
- `src_screens_vault.js`

### Stylesheets (6)
- `src_design_app.css`
- `src_design_components.css`
- `src_design_reference-pass.css`
- `src_design_reset.css`
- `src_design_screens.css`
- `src_design_tokens.css`

No file in these lists may be silently dropped, replaced from an older checkpoint, or bypassed with duplicate logic. The hash manifest protects the exact bytes at handoff.

## 5. Automated/static gate after EVERY source batch

Run `python3 verify_continuity_r71.py` first against an untouched extraction. For an edited derivative, regenerate a new versioned manifest/verifier only after these checks pass:

1. JavaScript syntax: `node --check` for every `.js` file.
2. CSS structural balance for all 6 CSS files.
3. JSON/webmanifest parse for `simulation-data.json`, `header-index.json`, `manifest.webmanifest`.
4. Exact 9-screen registry and renderer registration.
5. No direct primary-screen navigation call from `src_screens_*.js`; sidebar owns cross-screen changes.
6. PWA shell references resolve to real packaged files.
7. Runtime/App Health/service-worker R36 markers align.
8. Visual reference nested ZIP contains the complete current screenshot audit and historical structure set.
9. No forbidden build debris.
10. Exact file hashes match when validating the frozen checkpoint.

## 6. Screen-by-screen deep regression matrix

### HOME
- Large recognisable current-destination photographic hero; more picture visible than overlay.
- Current destination is the dominant orientation cue: large flag + country outline/silhouette + large city/country + large dates/progress.
- Next Destination is clear but subordinate; large flag/name/date.
- Daily Budget, Destination Budget and Annual Position remain more visually important than Schengen/Alerts/Upcoming/Timeline.
- Schengen, Alerts, Upcoming Events and Trip Timeline are readable and coloured, but not oversized relative to primary budget cards.
- Compass opens **Where's the toilet?** helper only; Current Destination header/banner opens **Country Quick Look** only. Do not merge.
- Quick Look remains concise/local/offline with plants/flowers given extra prominence, wildlife, food and cultural/practical context.
- Toilet helper keeps appealing offline phrase layout and Play/Slow/Repeat ×3/Louder controls where feasible.
- Home cards/items never jump to another screen. Information tap enlarges/stays local.
- Journey Map full-screen expansion must materially enlarge the actual map.
- Current/next flags and text are visible peripherally at iPad distance.

### BUDGET
- Shared current/next photographic header is recognisable and not over-covered.
- Destination Budget is local-currency first with AUD beneath, large stay dates, locked exchange-rate logic.
- `Destination Budgets` top-level identification uses prominent unambiguous date tickets, especially repeated city/country stays.
- Add Expense is an explicit large action; categories/selected state/date/amount are clear.
- Groceries, Eating Out, Transport, Entertainment and Shopping route to Destination Budget; Misc follows the currently locked allocation rule in source/requirements. Do not silently change.
- Transaction date automatically selects the covering Destination Budget; if none covers the date, show a large unmistakable warning and do not silently choose another budget.
- Accounts are read-only totals/collapsible on Budget; account editing remains explicit.
- Annual Budget remains AUD and one-time reservation rollups remain correct.
- Budget graphs/history/category mix remain meaningful, readable and subtly animated only on entry/refresh.
- Recent Expense/Account rows enlarge/read first; explicit edit controls mutate.

### RESERVATIONS
- Header and flags/dates retain orientation.
- Tabs/types: Flights, Trains, Cruises, RV, Accommodation, Tickets & Attractions.
- Strong selected state; large form text/date/time/cost/status.
- Future Bookings / To Book remains prominent yellow/gold operational panel.
- To Book does not improperly count financially before it should.
- Dated Destination Budget preview is large, flag-assisted and unambiguous before Save.
- Upcoming earliest first; Completed by date/newest as locked.
- Rows enlarge read-only first; Edit explicit. No reservation row navigates to another primary screen.
- Reservation Health Check derives actual counts/issues; no misleading status.

### ITINERARY
- Itinerary has the shared destination header above Forward Planning Map.
- Map is visually useful and true-full-screen when expanded.
- Six compact planning statistics retain strong differentiated colours and can enlarge for readability.
- Rows have large flags, destination names, large dates/duration and clear travel-type identity.
- Tapping row/Forward Coverage opens near-full-screen read-only detail; Edit is explicit inside.
- Standard/Motorhome/Cruise rules preserved; Motorhome/Cruise use dedicated mode headers and route focus.
- No `Intentional Gap` concept/button/day type. Ordinary gaps remain ordinary itinerary/coverage issues. Australia/home periods are normal stays when applicable.
- Add/Edit Destination keeps large destination, country, travel type, start/end dates and orientation preview; advanced currency/map details remain secondary.
- No horizontal scroll.

### CALENDAR
- Month view default plus Agenda.
- Destination/travel colour periods flow clearly across consecutive days like the stronger first-build structural reference, while using current palette.
- Destination/reservation/journey colour coding remains coherent and readable.
- Agenda entries show country flags and large dates/times.
- Personal reminder/note tap opens large read-only detail; Edit explicit inside.
- No calendar event tap changes primary screen.
- Sync/health status remains simple/local; no dead decorative controls.

### JOURNEY HISTORY
- Strong hero, headline summary widgets, readable Journey Map, spend/snapshot/milestones/totals/mix analytics, then searchable completed-stays history.
- Large summary widgets retain differentiated premium semantic colours.
- Map uses year/type filters and true-full-screen map expansion.
- Completed stays open near-full-screen read-only detail with flag, large dates, duration, cost/day, total cost, kilometres and linked-spend breakdown.
- Milestones, Journey Snapshot and Journey Check genuinely enlarge for Kym; enlarged values must be materially larger.
- Countries/destinations use flags for recognition.
- No favourite destination feature.
- Completed/history sorting remains newest first as locked.

### CHECKLIST
- Two checklist domains: Permanent and Destination; His/Hers ownership remains clear.
- Main dashboard His/Hers and Permanent/Destination widgets do **not** show cluttering little Add boxes.
- Tap widget → full-screen/near-full-screen enlarged view → large ADD ITEM inside.
- Current rows/details enlarge/read first; editing explicit.
- Due dates, notes, owner, stage and progress are readable.
- Ready-to-Move and Next Destination indicators remain clear.
- No checklist tap navigates to another primary screen.

### THE VAULT
- Locked state visually resembles a real protected vault: supplied vault-door artwork, VAULT LOCKED / PROTECTED ACCESS, concealed three-tap target.
- Unlock behaviour/security sequence unchanged.
- Unlocked category cards: Passports, Visas, Insurance, Accommodation Details, Emergency Contacts; strong individual premium colours flow through full card surfaces.
- Local-only screenshot attachments; multiple attachments; Owner field retained.
- Recent activity/details enlarge/read first; explicit edit where applicable.
- Streaming uses large 4×4 recognition-first service grid; saved services open large read-only detail with explicit Show/Edit.
- Hidden email manager only after exact unlock → Streaming → compass sequence.
- No external integrations or cloud storage introduced.

### SETTINGS
- App Health is first-class and visually unmistakable. Build update/mutation/Restore requires fresh check; successful check green/still.
- Verify on physical iPad that Cameron's requested **whole App Health panel** has a visible restrained heartbeat when dirty, not merely the button. This is a known visual acceptance item at R36.
- All 9 App Health sub-checks enlarge individually.
- Travel & Budget Defaults, Schengen, Security, Backup & Restore and Application info enlarge locally without navigation.
- Settings App Health count/status must derive from actual checks.
- PIN remains optional/off by default.
- Backup/Restore stays local full JSON with confirmation and validation.
- No Accounts page; no Offline Mode toggle.

## 7. Cross-screen workflow regression tests

### A. Menu-only navigation
- From every screen, tap cards, summary widgets, rows, events, timeline entries and analytics. They may enlarge/open local detail/edit only where explicit; they must not change the primary screen.
- Verify only sidebar menu buttons change primary screen.

### B. Read → Edit separation
- Itinerary row, Journey History row, Reservation row, Calendar note/reminder, Checklist item, Budget recent/account row: first tap must not unexpectedly mutate or navigate.
- Explicit Edit/Add/Delete controls remain visually obvious and large.

### C. Destination Budget routing
- Expense/reservation date inside a stay → exact dated Destination Budget.
- Same city appearing multiple times → correct occurrence identified by prominent dates.
- Date with no Destination Budget → large blocking warning, no silent fallback.
- Save commits; merely opening/changing controls without Save does not commit.

### D. Annual Budget isolation
- Reservation category accounting remains per locked rules.
- To Book/uncommitted entries do not silently become real spend.
- No duplicate annual rollup.

### E. Vault/hidden-email security
- Locked compass does not reveal email manager.
- Unlocked Vault main compass alone does not reveal it.
- Unlock → Streaming → compass reveals it.
- Re-lock resets protected access as designed.

### F. Backup/Restore
- Export is one self-contained JSON.
- Restore validates before replacement and requires confirmation.
- Restore marks App Health dirty.
- Vault screenshot asset paths/bytes survive the intended lifecycle.

### G. App Health
- Fresh R36 install/update → dirty/red attention state.
- `CHECK THE WHOLE APP` successful → green/still and persists across ordinary reloads of same build.
- Substantive mutation → dirty/red again.
- Physical iPad visual: whole panel heartbeat must be obvious but restrained; if only button pulses, record/fix as visual defect.

### H. Offline/PWA
- Install Add to Home Screen.
- Launch fully offline after initial install.
- Black compass launch stage then current destination stage then app.
- Service worker/cache versions align.
- Update does not create hybrid old/new screen assets.
- No required network/API call for normal operation.

## 8. Header/image regression test

For Home, Budget, Reservations, Itinerary, Calendar and all specialist heroes:
- supplied scene is recognisable; minimal edge crop; no stretching; no over-zoom; focal point sensible.
- Cruise uses dedicated Princess cruise-ship header where shared active-stay header applies.
- RV/Motorhome uses dedicated motorhome header (USA asset for US trip; Europe/other asset otherwise).
- Journey History/Checklist/Settings specialist artwork is framed cleanly without ugly gutters, accidental crop or old-image replacement.

## 9. Colour/material regression test

- Do not use first-build screenshot colours.
- Home is the material quality benchmark, not a command to make every card blue.
- Use multiple authorised semantic colours with premium dark material, border/glow/depth and good contrast.
- Feature colour flows through the whole widget and expanded view; avoid a coloured shell with a giant generic navy inset.
- Preserve the strong Journey History headline-widget and Itinerary compact-stat quality benchmarks. For Vault, preserve category differentiation and parent→child continuity only; legacy Vault hue/saturation/brightness is not a benchmark. Home remains material authority.

## 10. Accessibility / iPad acceptance

- Test at 1024×768 landscape and actual target iPad.
- Kym should identify country/destination/date/status from normal viewing distance without reading tiny helper text.
- Large dates and flags are mandatory in high-risk allocation/planning contexts.
- Touch targets should generally be at least 44px; primary editor actions larger.
- Focus/keyboard/modal close behaviour must be usable.
- Expanded views use most of viewport and do not create horizontal scroll.
- Reduced motion respected where feasible; App Health warning is the deliberate pulse exception and must stop when green.

## 11. Packaging gate for every future continuity handoff

Before packaging:
1. Start from the immediately previous verified checkpoint only.
2. Run syntax/structure/PWA/static regression checks.
3. Perform targeted workflow tests for every file changed.
4. Review every primary screen affected by shared CSS/components.
5. Update changset, locked requirements, outstanding work and screenshot audit lock.
6. Include all current code and assets — never a partial source subset.
7. Include the full visual evidence bundle.
8. Generate a fresh exact SHA-256 manifest and verifier.
9. Keep outer extracted package **strictly under 100 files**.
10. Fresh-extract the ZIP into a new folder and run its verifier. Only then hand it off.

## 12. Stop conditions

STOP rather than improvising if any of these occur:
- baseline hash mismatch;
- missing source/asset;
- older file appears newer only because of timestamp;
- screen/function disappears after a visual fix;
- widget starts cross-screen navigation;
- Destination Budget routing changes unexpectedly;
- Vault/hidden-email access sequence changes;
- PWA shell requires network;
- package exceeds 99 extracted files;
- a screenshot seems to contradict a locked functional rule. In that case screenshots are evidence, not permission to delete working behaviour.

---

# PREVIOUS REGRESSION PROTOCOL (preserved for archaeology)
# ACTIVE FULL REGRESSION PROTOCOL — V55 R13 CONTINUITY ANTI-REGRESSION

**Authority package:** `Travel_Command_Centre_V1_CONTINUITY_ANTI_REGRESSION_V55_R13_ACTIVE_NO_LOSS_2026-09-05.zip`  
**Runtime parent checkpoint SHA-256:** `19e2ce27abd3c1a66b5815912c16c174ea3065d7a105d8115c340b38f5a0152f`

This protocol is mandatory for every continuation. It is additive to all historical tests preserved below. Do not weaken a gate to make a changed build pass.

## Phase 0 — exact-source gate
1. Work from a fresh extraction of the exact continuity ZIP.
2. Run `python3 verify_continuity_r71.py`.
3. Require PASS, the expected exact hash set, recursive file count below 100, and no unexpected/nested/generated files.
4. If it fails, stop and diagnose. Never recover by copying older runtime files into the tree.

## Phase 1 — authority/no-loss review
Read `CONTINUITY_START_HERE.md`, `NEXT_CHAT_START_HERE_V55.md`, `LOCKED_REQUIREMENTS.md`, `SCREENSHOT_AUDIT_LOCK_V55.md`, `OUTSTANDING_WORK.md`, historical regression-contract reference (not part of the active R71 package), current 99-file set verified by `BASELINE_MANIFEST_R71.sha256`, and `VISUAL_REFERENCE_INDEX.md`. Confirm:
- active continuation points to this exact R13 continuity checkpoint;
- R12/V54/V53 and earlier are historical only;
- runtime identity/cache/fixture/storage key remain the approved R13 values unless a deliberate runtime promotion is being made;
- all nine screens and both helper entry points remain present;
- all visual references and packed header assets remain present.

## Phase 2 — static/runtime integrity
- Parse every application JavaScript module as an ES module.
- Check all six CSS bundles for structural balance.
- Verify `manifest.webmanifest`, `index.html`, `src_core_runtime-config.js` and `sw.js` generation/start-url/install-icon consistency.
- Verify every runtime module is represented in the offline shell.
- Verify recursive extracted-file count remains <100 and reject `__pycache__`, `.pyc`, temp files, duplicate ZIPs or nested build artifacts.

## Phase 3 — retained deep acceptance
Run:
- `node v53_deep_acceptance.mjs`
- `node v54_deep_acceptance.mjs`

Retain all negative guards already encoded there, including: date-driven Destination Budget routing, To Book isolation, App Health/Restore/Recovery behaviour, simulation fixture revision atomicity, persistent-storage parity, launch-country canonicalisation, every retained-stay launch flag coverage, and launch/Home `findCurrentStay()` parity.

## Phase 4 — deterministic model sweep
Run the complete four-year retained simulation sweep: **1,461/1,461 days** and **10,227/10,227 view-model builds** across the seven core modelled screens. Any exception, invalid model or date-routing failure is a release blocker.

## Phase 5 — core domain regression probes
At minimum verify:
- Expense and Reservation dates resolve to exactly one usable Destination Budget; uncovered/overlap cases block save.
- Same committed cost enters Annual totals once only; To Book never enters actual/committed financial ledgers.
- Destination Budget dates remain tied to itinerary stay dates; repeated-city stays are date-disambiguated.
- Standard/Cruise/RV travel rules, Starting Country, route points and dedicated headers persist.
- No Intentional Gap concept returns. Home/Australia is a normal standard stay with a dated Destination Budget.
- Checklist required-only Ready-to-Move logic and per-move permanent completion remain intact; His/Hers optional items persist and do not block readiness.
- Calendar span colours remain deterministic; reminder/note opens exact item.
- Journey completed rows open history detail, not the destination editor.
- Global search excludes Vault private data and exact-record routing remains correct.

## Phase 6 — Vault/backup/recovery trust boundary
Verify source/model tests for:
- concealed three-tap Vault unlock; protected categories hidden while locked;
- hidden email panel only after unlock → Streaming → compass and it self-disarms on leaving/relocking/recovery;
- screenshot bytes stored outside ordinary localStorage state;
- self-contained JSON Backup rehydrates Vault screenshot bytes;
- Restore replaces canonical state only after validation and forces App Health dirty/recheck even for identical data;
- failed Restore persistence enters Protected Recovery without destroying prior valid state; Retry committing a pending Restore also forces App Health recheck;
- internal screenshot `dataUrl`→IndexedDB migration does not falsely dirty verified App Health;
- stale asset audits cannot publish over newer attachment state.

## Phase 7 — launch/PWA/offline safety
Verify:
- black compass → current destination flag/city/country → app;
- launch uses canonical `findCurrentStay()` exactly like Home;
- country aliases resolve before flag lookup; all retained itinerary stays resolve to supported flag/helper/header context;
- Athens simulation forces simulation mode even from plain `index.html`; production must not inherit that derivative-only force flag;
- simulation requests persistent storage when available and retains separate storage key;
- fixture revision is embedded in canonical state; missing sidecar marker cannot destructively reseed existing populated simulation;
- service worker does not mix old/new runtime modules and preserves predecessor cache while live windows are busy/unresponsive.

## Phase 8 — visual/interaction source contract
Source inspection must confirm:
- iPad landscape 1024×768 target; no horizontal-scroll fallback; Home does not require vertical scroll;
- header artwork uses minimal crop and dedicated Princess/RV assets where required;
- all visible buttons have real handlers; delete actions confirm; Save is the commit action; tap-to-edit works;
- expanded cards exist only where larger space adds decision-useful detail; parent→child colour family remains continuous;
- graph/motion rules remain restrained and Reduced Motion is respected; App Health heartbeat is the intentional continuous-animation exception while dirty.

## Phase 9 — physical iPad acceptance before Master/Gold Lock
This cannot be substituted by container tests. On the actual target iPad verify:
- all nine screens, Add/Edit flows and both helpers at 1024×768;
- header crops, touch targets, focus, modal/native-picker behaviour, vertical reachability and zero horizontal scrolling;
- Add to Home Screen/update behaviour and real IndexedDB persistence;
- Vault screenshot lifecycle + Backup/Restore/Recovery;
- offline local speech voices, or packaged-audio fallback decision;
- final colour quality with Cameron explicit approval.

## Phase 10 — freeze/package after any change
1. Do not modify the immutable original V55 baseline manifest.
2. Record the immediate predecessor checkpoint SHA-256.
3. Regenerate `BASELINE_MANIFEST_R71.sha256` from the exact final tree.
4. Update active continuity/contract/package metadata without deleting historical ledgers.
5. Run the exact verifier again.
6. Fresh ZIP the tree; fresh-extract it elsewhere.
7. Run exact verifier + both deep suites from the extracted ZIP.
8. Byte-compare/hash-compare extracted files against the source tree.
9. Only hand over the archive after every gate is green.

## Automatic stop conditions
Stop and do not package if any of these occur: unexpected/missing/hash-changed file; >=100 extracted files; generated nested artifacts; JS/CSS/deep/model failure; offline-shell omission; runtime/cache generation mismatch; stale active carry-forward to an older baseline; financial routing/double-counting error; To Book contaminating actual spend; App Health trust-boundary failure; Vault backup/recovery loss; launch/Home disagreement; missing destination helper/header/flag coverage; dead/decorative control; horizontal scroll; or any regression against `LOCKED_REQUIREMENTS.md` / `SCREENSHOT_AUDIT_LOCK_V55.md`.

---

## Historical regression protocol preserved below

# V55 Athens Simulation — Active Regression Protocol (5 Sep 2026)

This section supersedes older V54/V53 first-step wording for the Athens derivative. Historical sections remain below for regression archaeology only.

1. **First gate:** run `python3 verify_continuity_r71.py`. Any mismatch is a stop condition unless the current batch intentionally changed that exact file.
2. Never roll current V55 runtime/source back merely to satisfy the immutable V55 starting baseline or the historical V54 guard.
3. Preserve the Athens derivative bootstrap: manifest start URL `./index.html?simulation=1` **and** `const forceAthensSimulation = true;` in this simulation-only `index.html`. Production must not inherit that force flag.
4. Preserve the distinct V55 Athens acceptance service-worker generation and complete offline-shell inventory, including `app-icon.png`. The Athens simulation must request the same `navigator.storage.persist()` safeguard as production when WebKit exposes it; do not reintroduce a simulation-mode skip.
5. Preserve canonical launch-country normalisation before flag lookup. At minimum, `Türkiye`/`Turkiye` must resolve to `turkey`/🇹🇷, and the existing Czech Republic, USA/US/U.S.A., UK/U.K. and UAE/U.A.E. aliases must remain covered by the executable acceptance probe.
6. Preserve the R7 App Health trust boundary: internal Vault screenshot representation migration must not dirty a verified state, while every Restore/replacement must invalidate the prior whole-app verification even when restored travel data is identical; the same applies when a validated pending Restore is finally committed through Retry iPad Storage.
7. After runtime changes: parse all JS, validate CSS structure, run `node v53_deep_acceptance.mjs`, `node v54_deep_acceptance.mjs`, and rerun the 1,461-day / 10,227-model sweep when model/state/routing code is touched.
8. Keep the entire extracted package below 100 files using a recursive file count; generated nested files such as `__pycache__` are forbidden. The exact checkpoint manifest is regenerated **last** after all intentional edits and documentation updates are complete.
9. Physical target-iPad acceptance is still required for 1024×768 appearance, real offline voices, IndexedDB/Vault lifecycle and final PWA launch behaviour.

---

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
`CONTINUITY_START_HERE.md` → `CHANGESET_V51_TO_V52.md` → `LOCKED_REQUIREMENTS.md` → `OUTSTANDING_WORK.md` → `REGRESSION_PROTOCOL.md` → `VISUAL_REFERENCE_INDEX.md` → historical regression-contract reference (not part of the active R71 package).

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
4. Read `CONTINUITY_START_HERE.md`, `LOCKED_REQUIREMENTS.md`, `OUTSTANDING_WORK.md`, this protocol, `VISUAL_REFERENCE_INDEX.md`, then historical regression-contract reference (not part of the active R71 package).

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


## R33 recognition / row-safety regression checks
1. `src_screens_itinerary.js` must not wire `.itinerary-entry` or Forward Coverage destination segments directly to `openItineraryEditor` / `openEditor`; they open `openItineraryEntryDetail` first.
2. Journey History completed rows must use a large read-only modal detail and must not navigate or edit itinerary data.
3. `openCalendarItem()` must not immediately call the personal-event editor; personal records show read-only detail first and expose Edit explicitly.
4. Home Current Destination must render `.home-destination-country-outline`.
5. `src_components_country.js` must remain in the service-worker `APP_SHELL`.
6. Country flag/outline recognition must not introduce horizontal scrolling at the target iPad width.


## R50 visual-system regression gate — colour comfort and consistency
Fail the build if any of these return:
1. A screen introduces a separate legacy visual theme instead of Home-derived material.
2. Large information panels become highly saturated coloured slabs.
3. Semantic colour variety is removed so materially different widgets become indistinguishable.
4. Ordinary selected states depend on `filter: brightness(...)` or harsh glow instead of border/material/shape emphasis.
5. A historical screenshot is used as colour authority without Cameron explicitly approving that colour.
6. Vault restores its legacy saturation/brightness treatment.
7. Ordinary operational text loses strong contrast against the dark material.
8. Continuous visual pulsing appears anywhere except the dirty/unverified Settings App Health warning.
9. Calendar legend/support cards revert to solid legacy colour slabs instead of restrained Home material.
10. Itinerary Forward Coverage selection returns to the high-luminance blue gradient.

## R50 Add/Edit shell parity gate
- New Add Expense, Add Reservation, Add Destination and Calendar Reminder/Note must open in the stable command-blue shell.
- Their selected category/type tiles remain strongly differentiated by semantic colour.
- Existing Edit/detail flows may inherit their originating saved colour.
- Vault category record editors remain the explicit category-colour continuity exception.
- Home no-current-destination guidance must never introduce cross-screen widget navigation; direct Kym to the Itinerary item in the left sidebar.

## R51 legacy-cascade / horizontal-scroll gate
- `index.html` must not regain a separate legacy/global widget colour theme above the layered design system. Critical inline CSS is limited to App Health warning motion, hard readability floors and viewport/overflow guards.
- Expanded modal bodies use `overflow-y:auto` and `overflow-x:hidden`; no generic `overflow:auto` may re-enable sideways scrolling.
- The app shell must remain horizontally clipped/contained at the target iPad landscape width.

## R52 whole-app material / readability gate
- Home remains the material authority; historical screenshots may not supply widget hue/saturation/brightness.
- Itinerary Map / Forward Coverage / Upcoming / Completed, Calendar controls / Month / Agenda, and Journey Map / filter surfaces must use the same restrained large-surface material envelope as the rest of the app while retaining distinct semantic accents.
- Operational destination/date/routing/status text must not fall below 11px; key orientation/routing confirmation should be 12px where practical.
- Selected compact controls must remain unmistakable without relying on brightness amplification.
- R52 cache name, service-worker query and App Health build marker must advance together.

## R53 modal-material regression gate
- Expanded near-full-screen views and existing-record Edit modals must preserve semantic colour identity without becoming saturated full-screen colour slabs.
- Home-derived dark material, comfortable brightness and restrained glow remain authoritative in every modal tone.
- Parent/source tone continuity is carried by border/title/focus/accent tint; new Add forms remain command-blue and Vault keeps its explicit category-colour editor exception.
- R53 is historical and fully absorbed by R54; it must not be presented as the current checkpoint.


## R54 universal modal-material regression gate
- R54 is historical and fully absorbed by R55; it must not be presented as the current checkpoint.
- Every `tone-*` modal family must use the Home-derived dark comfort material envelope, not just `.tcc-editor-modal` and `.tcc-expanded-modal`.
- Utility/detail/security/overflow dialogs preserve semantic hue through border/title/focus/accent tint without becoming saturated full-dialog slabs.
- A useful mixture of semantic colours is mandatory across the app, but large/full-screen surfaces remain restrained for light-sensitive eyes.
- R54 cache name, service-worker query and App Health build marker must advance together.


## R55 single visual-authority regression gate
- R55 is historical and fully absorbed by R56; it must not be presented as the current checkpoint.
- `index.html` must not contain `applyR30WidgetTones`, `r30AppRoot`, `tcc-widget-tone-*` injection, or a MutationObserver whose purpose is post-render recolouring.
- Semantic widget colour belongs in the layered screen CSS/classes only; no second runtime theme engine is allowed.
- Colour variety remains required across the app, while large-surface brightness/saturation/glow stay within the Home-derived comfort envelope.
- R55 cache name, service-worker query and App Health build marker must advance together.


## R56 residual operational readability gate
- R56 is historical and fully absorbed by R57; it must not be presented as the current checkpoint.
- Live decision/status/date/routing/analysis copy must not regress to legacy 7–10px sizes. General operational floor is 11px; high-risk Destination Budget / reservation routing / itinerary date cues are 12px where space permits.
- Small neutral operational text uses the comfortable `--text-operational` tone rather than bright white; this must not override semantic warning/success colours.
- Calendar overflow, Journey paging/type and Checklist stage actions remain at least 44px high.
- R56 must not change widget hue authority: Home material remains primary; old/original screenshots are never automatic colour authority; large surfaces stay restrained for light-sensitive eyes; compact status/stat cards may remain lively.
- R56 cache name, service-worker query and App Health build marker must advance together.


## R57 selected-state comfort gate
- R57 is historical and fully absorbed by R58; it must not be presented as the current checkpoint.
- Reservation category tabs must not use `filter:brightness(...)` for the active state. Selection remains unmistakable through border/inset/semantic glow structure and `aria-pressed`.
- Do not weaken R56 readability/touch targets while changing selection styling.
- Compact selected tiles may retain their semantic hue; large surfaces must not become brighter merely because they are selected.
- R57 cache name, service-worker query and App Health build marker must advance together.


## R58 single App Health heartbeat authority gate
- R58 is historical and fully absorbed by R59; R57 and earlier checkpoints are historical.
- `index.html` critical guard is the only continuous App Health heartbeat authority. `src_design_reference-pass.css` must not contain the obsolete `appHealthPulse` or `appHealthPanelHeartbeat` keyframes/animations.
- Dirty / needs-attention App Health still pulses as a whole restrained red panel plus action button; verified is green and still; reduced-motion disables the pulse.
- One-shot graph/ring/bar easing remains allowed; no new continuous decorative animation is authorised.
- R58 cache name, service-worker query and App Health build marker must advance together.


## R59 Vault depth-material continuity gate
- Historical R59 gate; its protections remain absorbed by R65.
- Vault category drill-down heroes and record cards must retain category hue recognition while using Home-derived deep material; reject restoration of old/original saturated Vault slab backgrounds.
- Vault Add/Edit/detail continuity and concealed security access remain unchanged.
- Home year filters and Checklist history rows must retain at least 44px tap height.
- R59 cache name, service-worker query and App Health build marker must advance together.

## R60 form-control parity gate
- Historical R60 gate; superseded by the current R61 gate.
- Checklist selects and Settings Schengen select/textarea must inherit the same dark editor material, >=54px control height and readable 17px control text used by the other deliberate editors.
- Settings date controls remain >=58px with prominent date typography.
- R60 cache name, service-worker query and App Health build marker must advance together.



## R61 route-colour / interaction-visibility gate
- Historical R61 gate; superseded by the current R62 gate.
- Grep/source check: Vault document routes must assign `selectedRecordTone` from `VAULT_TONES[record.category]` (or the equivalent target category), never literal `blue`, `gold` or `indigo` context tones. Pending-open Vault documents must likewise resolve their category tone.
- Checklist Required/Optional checkbox must remain visibly enlarged and its containing row must remain >=44px (R61 uses 30px / 56px).
- Reservation selected state must not use `filter:brightness(...)`.
- R61 cache name, service-worker query and App Health build marker must advance together.


## R62 native-control dark-scheme gate
- R62 is historical and fully absorbed by R63; R61 and earlier checkpoints are historical.
- All deliberate modal editor controls must inherit `color-scheme: dark`; key Home/Itinerary/Journey search/filter native controls must do the same.
- Do not remove native date/time/select behavior or replace it with custom simulated pickers.
- R62 cache name, service-worker query and App Health marker must advance together.


### R62 source-level backup/recovery evidence
The R62 working tree has passed all three in-memory lifecycle branches with `MemoryStorageAdapter` + `MemoryVaultAssetStore`: normal screenshot-bearing backup/restore round-trip; healthy-state forced Restore write failure preserving original data and cleaning staged bytes; and already-in-Recovery forced Restore write failure retaining the validated candidate/assets for successful Retry. Keep the physical iPad storage/update gate open.


## R63 expanded-view continuity / unique-id gate
- R63 is historical and fully absorbed by R64; R62 and earlier checkpoints are historical.
- `src_screens_itinerary.js` must derive the Forward Journey Map expanded tone from the live parent map through `materialToneFromContext`; a hard-coded `itinerary-map-expanded-modal tone-blue` regression fails.
- `snapshotExpandedCard()` must remap cloned ids and internal relationship attributes; removing only the root id is insufficient.
- Expanded snapshots must not leave duplicate source ids in the open DOM. Preserve `for`, `list`, hash href and ARIA token-reference relationships through the remap.
- No active/hover interaction path may reintroduce `filter:brightness(...)` on Reservation category cards or Itinerary rows; structural emphasis is the low-glare authority.
- R63 cache name, service-worker query and App Health marker must advance together.
- Preserve every R13–R62 behaviour, especially Home visual authority, varied low-glare semantic colour, Safari native dark chrome and Vault category continuity.


## R64 App Health reduced-motion exception gate
- Historical R64 gate; its protections remain absorbed by R65.
- Dirty/unverified App Health must pulse at the panel level in normal motion mode.
- Under `prefers-reduced-motion: reduce`, the dirty panel must still use a slower restrained heartbeat; the button must not scale/animate.
- Verified App Health panel/button must remain `animation:none` and green/still.
- No other continuous animation is authorised.
- R64 cache name, service-worker query and App Health marker must advance together.


## V55 R65 — Calendar month interaction accessibility lock
- R65 is historical and fully absorbed by R71; preserve all R13–R64 protections.
- Calendar month destination/travel strips and event chips are real controls and must retain a true 44px painted iPad target with readable 12px text.
- Show at most two month-cell entries directly; a third or later item must use the existing working `+ more on this day` full-size overflow/detail path.
- Do not restore cramped 24–27px month controls in order to increase density. Vertical page scrolling is acceptable; horizontal scrolling is not.
- Preserve Home material authority, varied low-glare semantic colours, read-only-first Calendar detail flow and sidebar-only screen navigation. Runtime/cache/App Health identity is R65.


## V55 R66 — Specialist motorhome/cruise header routing lock
- R66 is historical and fully absorbed by R67; preserve all R13–R65 protections.
- Cruise trips always use the dedicated packaged Princess cruise header.
- Motorhome/RV header selection must use `startCountry` or the trip `country` before any city fallback: United States -> dedicated USA motorhome artwork; all other countries -> Europe/other motorhome artwork.
- Do not infer a Europe motorhome header merely because a US start city is not in a short allow-list.
- Header artwork colours are not widget-colour authority; Home remains the app-wide material authority. Runtime/cache/App Health identity is R66.

## V55 R67 — Calendar 44px density integrity lock
- R67 is historical and fully absorbed by R68; preserve all R13–R66 protections.
- Calendar Month view keeps the R65 44px interaction floor without allowing controls to spill into adjacent week rows. Days with one or two items show them directly; days with more than two show one full-size item plus a full-size `+N more on this day` control that opens the complete dated list.
- Calendar day cells retain enough height for two 44px controls and no nested month-cell scrolling. Vertical page scrolling remains acceptable; horizontal scrolling remains forbidden.
- Calendar data, semantic colours, read-only-first detail flow and Home-derived material authority are unchanged. Runtime/cache/App Health identity is R67.

## V55 R68 — Calendar overflow colour-continuity lock
- R68 is historical and fully absorbed by R71; preserve all R13–R67 protections.
- The mixed `+N more on this day` list may use calm command-blue material, but selecting a specific Calendar item from that list must derive that item's own Calendar material colour for the read-only detail and any subsequent Edit path.
- Do not force destination periods, travel periods, reservations, reminders or notes to generic blue merely because they were opened from a busy-day overflow list.
- R67 Calendar 44px density geometry remains unchanged. Runtime/cache/App Health identity is R68.

## V55 R71 — Drill-down colour-continuity correction lock
- R71 is the current working checkpoint; preserve all R13–R68 protections. R69/R70 semantic-record hand-off experiments were rejected during the same audit because they contradicted the already-locked parent-widget → deeper-view continuity rule; they are not valid baselines.
- Parent widget → expanded view → deeper detail/editor keeps the originating material family where an explicit context tone is provided. Blue → blue → blue; gold/yellow → gold → gold; red → red → red.
- The V51 deep-editor contexts remain authoritative: To Book gold; Upcoming Reservations blue; Next Upcoming red; Budget Reservations indigo; Recent Expenses blue; Living Expenses violet; Forward Coverage indigo; Upcoming Itinerary blue; Permanent Checklist green; Destination Checklist sky.
- Category/type tiles remain strongly differentiated inside editors, but they do not silently repaint an explicitly inherited drill-down context. New Add Expense / Add Reservation / Add Destination shells remain calm command-blue/sky.
- Old/original screenshot colours remain non-authoritative; this rule concerns colour continuity through an interaction path, not legacy hue matching.
- Runtime/cache/App Health identity is R71.

