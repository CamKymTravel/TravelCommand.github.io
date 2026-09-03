# Travel Command Centre V1 — V44 iPad Visual Candidate / No-Loss Ledger

**Continuity package:** V44 IPAD VISUAL CANDIDATE — 3 September 2026 AEST  
**Purpose:** carry the exact V44 iPad visual candidate source, all protected decisions, all completed forensic fixes and the target-device acceptance state into the next chat without regression.

## Critical recovery note

Unlike the earlier safety handoffs, this package contains the **actual current V44 iPad visual candidate source**. After `verify_regression_guard.py --verify` passes, V44 is the starting authority.

- **Do not treat V43/V42/V41/V40/V39/V38/V37/V36/V35/V34, an older ZIP, or a screenshot-only reconstruction as the current baseline.**
- All 100 numbered items below remain protected requirements.
- Many items that were open in V35 are now implemented in source; the status summary below records the current checkpoint.
- Do not simplify, redesign, remove, or reinterpret a protected item to make implementation easier.
- This is a continuity baseline and iPad visual candidate, **not a declaration that V44 is release/master complete**.

## V44 implementation status carried forward

Verified/current behaviours include:

- Automatic date-only Destination Budget routing; runtime allocation property removed.
- Hard block for no stay/overlap/incomplete budget; repeated stays use exact dated occurrence/ID.
- Repair-safe legacy cost migration; incomplete budgets remain Needs Setup rather than corrupting restore.
- Actual-vs-future spend separation across Budget/Home/Journey; To Book remains planning-only.
- Future-dated Expenses remain visible in Recent Expense Entries after Save, are marked Future, and still count only as commitments until their transaction date.
- Shared modal forms suppress implicit Return/Enter submission so editors cannot close without an explicit Save/Cancel/Delete action.
- iPad Safari form-focus stability is protected: editable/search/select text is never rendered below 16px, preventing focus zoom/viewport shifts while preserving compact non-interactive labels.
- Persisted Motorhome/Cruise route points are destructive child data: removing saved stops or converting the trip to Standard requires an explicit destructive confirmation before Save; the mutation layer rejects unconfirmed route-point removal.
- Itinerary exact-record opens and successful Saves clear only stale year/search row filters needed to keep the targeted stay visible; the coverage horizon and unrelated screen state are retained.
- Itinerary Travel Year controls derive from the full itinerary rather than only the forward map, so completed Year 5+ stays remain selectable after those years have no future entries.
- Automatic reservation completion by date only; today remains Upcoming.
- Forward Coverage uses real 3/6/12 calendar-month horizons and counts trailing missing coverage.
- No Intentional Gap model/button/budget; Australia/home is a normal stay.
- Protected Cruise/RV artwork, start-country persistence and route-language context.
- Exact-record pending-open/search/alert navigation across supported collections.
- Canonical Home Alerts/Upcoming, full expanded list, overdue To Book alerting and no blank search/timeline states.
- Permanent Checklist per-move completion, correct travel-day/arrival lifecycle and orphan-scope cleanup.
- Calendar To Book exclusion, mirror cleanup, DD/MM/YYYY display rules and deterministic unique stay colours.
- Journey History actual-spend/day/completion consistency, route continuity/date-line handling and duplicate supplement health warning.
- Exact Vault concealment sequence, staged screenshot Save, exact record targeting and PIN/storage recovery safety.
- Full manual/offline Schengen panel and validation.
- Production-first boot, isolated explicit simulation mode, active service-worker cache generation (`tcc-v1-v44-ipad-visual-candidate-2026-09-03`) and hardened offline fallback behaviour.
- Protected Recovery for invalid state **and** Safari storage access denial; transactional restore/write rollback.
- App Health simulation checkpoint remains 9/9 verified.
- Global Search uses readable Expense category labels instead of raw schema slugs when descriptions are blank.
- Canonical restore validation rejects malformed itinerary-country/expense-description text that could crash Journey History or Global Search.
- Personal Calendar records have one canonical date source only: date-only or date/time, never conflicting stored values.
- AUD Destination Budgets are canonical 1:1; migration and live saves cannot retain a contradictory AUD exchange rate.
- Checklist completion and Expense/Reservation budget-repair markers are canonical booleans; known legacy boolean-like values migrate explicitly so truthy strings cannot alter readiness or routing.
- Canonical numeric restore no longer lets booleans/arrays/objects silently coerce to zero for budgets, costs, accounts, coordinates, route order, Journey History distance or Schengen day counts; valid legacy numeric strings migrate to real numbers.
- Bookkeeping timestamps remain monotonic across backwards device-clock corrections and future legacy timestamps are safely capped during migration.
- Restored user-facing text is type-checked so malformed arrays/objects cannot surface as coercion artefacts; Checklist owner casing and completion timestamps are canonicalised safely.
- Optional restored dates and relationship IDs use canonical `null`/valid values; legacy `false` placeholders migrate safely to `null`, while canonical boolean IDs/dates are rejected.
- Missing Account currency may still default to AUD and valid lowercase codes canonicalise, but malformed currency values are rejected; Schengen notes and PIN-recovery notice cannot object-string coerce into `[object Object]`.
- Reservation lifecycle restore preserves `To Book` as planning-only and rejects malformed/unknown status values instead of silently rewriting them to Booked; recognised legacy case variants and the old derived `completed` value still migrate safely.
- Restore rejects malformed schema-version and Schengen-status values instead of coercing them to legacy schema 0 / Not Checked; missing genuine legacy values remain recoverable and recognised Schengen status casing canonicalises safely.
- Destination Checklist `completed`/`completedAt` parity is canonical on restore; stale timestamps are cleared from incomplete items and recoverable completed legacy items receive a canonical timestamp. Disabled Vault PIN state also clears any stale stored PIN hash.

### Latest checkpoint metrics frozen into this handoff

- Audit checkpoint: **V44 iPad visual candidate freeze — post-V43 final source/runtime continuation**.
- Post-V43 intentional source files absorbed: **2** (`src_main.js`, `src_screens_settings.js`).
- JavaScript ES modules: **62/62 parse**.
- App Health: **9/9 verified**.
- Full itinerary date-routing sweep: **1,461/1,461 days**, routing faults: **0**.
- Normal confirmed dated costs checked: **266/266**, routing faults: **0**.
- Calendar month models: **60/60**.
- Extended 2020–2040 model builds: **2,016/2,016**.
- Derived-state invariants: **7,217/7,217**.
- Startup-vs-Restore representative corruption parity: **1,225/1,225**.
- Exact-record pointer matrix: **63/63**.
- Home alert targets: **3,777 checked, 0 stale/invalid**.
- Upcoming Event links: **46,052 checked, 0 stale**, To Book leakage: **0**.
- Deletion integrity: **293/293 records** plus **46/46 itinerary cleanup scenarios**.
- Header assets: **86/86 valid**; simulation stay header resolution: **46/46**.
- Runtime allocation fields: **0**.
- Backup/restore generation: **V44 iPad visual candidate**, with V41+ strict persisted-state protection.
- Runtime identity: `1.2.0-v44-ipad-visual-candidate`.
- Offline cache: `tcc-v1-v44-ipad-visual-candidate-2026-09-03`.
- Extracted package: **99 files**.

- Vault screenshot payload bytes now use IndexedDB rather than the single localStorage JSON; ordinary app state remains transactional in localStorage.
- Backup/Restore remains one self-contained JSON file and stages/materialises Vault screenshot bytes transactionally.
- Current targeted 12-screenshot capacity fixture exceeds the old 5 MiB localStorage boundary while local metadata remains ~147 KiB.

## Still-active audit state — MUST continue on the target iPad

1. Complete the real 1024×768 iPad Safari/Home-Screen visual/interaction pass against all supplied `REF_*.jpeg` authorities and Home's premium material benchmark.
2. Validate the Vault IndexedDB path on the target iPad: add multiple screenshots, close/reopen, Backup, Restore, Recovery retry, screenshot deletion and storage-pressure/error messaging.
3. Check keyboard/form focus, modal depth, exact-record navigation, header crop, vertical-scroll behaviour and zero horizontal scrolling on the actual device.
4. Chromium/Playwright in the audit environment returns `ERR_BLOCKED_BY_ADMINISTRATOR`; do not falsely record a source-only check as a browser visual pass.
5. **Do not declare a master/release successor until Cameron completes and explicitly approves the iPad pass.**

## Post‑V34 mandatory implementation ledger

### Budget / Destination Budget routing

1. **Expenses are date-driven only.** Kym enters a date; the Expense routes automatically to the one Destination Budget covering that date.
2. **Reservations are date-driven only.** Kym enters a required Date and may optionally enter a Time; the Reservation routes automatically to the one Destination Budget covering that calendar date.
3. Remove all user-facing and schema-level Annual-vs-Destination allocation choices. Annual Budget is a year-wide roll-up, not an allocation target.
4. Miscellaneous has no special Annual exception. Every Expense category follows the same automatic dated Destination Budget rule.
5. If a date has no itinerary stay, more than one overlapping stay, or a matching stay without a fully configured Destination Budget, saving is hard-blocked with a large unmistakable warning.
6. Repeated cities must resolve by exact itinerary occurrence/date/ID, never by city name alone.
7. Backdated and future-dated Expense/Reservation edits must remap to the stay covering the edited date.
8. Legacy/restored costs from the old allocation model must be preserved with a repair marker rather than discarded or causing full restore failure. App Health/Home Alerts must surface them until repaired.
9. Repair-marked legacy records must not prevent editing the stay dates/currency/rate needed to repair them.
10. Stay date edits must pre-block if they would strand normal linked Expenses/Reservations or make routing ambiguous.
11. Destination Budget setup is one-stop: amount + itinerary-tied dates + local currency + fixed exchange rate.
12. A Destination Budget is only **Locked In** when amount, local currency and fixed exchange rate are all usable. Incomplete positive budgets stay under **Need Budget / Needs Setup**.
13. Destination Budgets filters **All / Need Budget / Locked In** must use the same usability rule as the cards and App Health.
14. Destination Budget dates remain prominent with Australian date handling and repeated-stay cues; dates share the itinerary as the single source of truth.
15. Once dated costs exist, the stay’s local currency and fixed exchange rate are locked against casual changes. Legacy repair records do not incorrectly lock the repair path.
16. For AUD transactions, AUD equivalent is automatic 1:1. For the stay’s local currency, AUD equivalent is automatically derived from the fixed stay rate. Only other currencies require manual AUD equivalent entry.
17. Automatic AUD conversions are stored/used consistently to two decimal places.
18. Non-AUD records cannot save with a positive original amount but AUD equivalent of zero/missing.
19. Currency codes must be valid 3-letter codes; malformed legacy display text must never crash rendering.
20. Budget read-only Reservations panel excludes **To Book** planning items so rows/count/total represent committed costs consistently.
21. **To Book is planning-only everywhere:** it must not reduce Destination Budget remaining, Annual spent/commitments, Home spend comparisons, Journey History spend, or Travel Mix until converted to a real booking status.
22. Future-dated costs may reserve/commit budget but must not distort “actual spend to date,” Daily & Stay Pace, spend-history charts, or historical spend until their date arrives.
23. Zero-spend category panels must say **No spend yet**, not invent a $0 “Top Category.”

### Reservations lifecycle

24. Reservation manual status options are Paid / Unpaid / Booked / To Book. **Completed is automatic by date**, not user-maintained. Reservation date is required; time is optional, and a date-only reservation must remain date-only rather than displaying a fake `00:00`.
25. Legacy `Completed` status migrates safely to an active status (e.g. Booked) while completed/upcoming placement is determined by date.
26. Today’s reservation remains upcoming; completed begins only after the reservation date has passed.
27. To Book does not appear as a confirmed Home Upcoming Event or Calendar booking.
28. Reservation UI must not show stale Annual/Destination allocation labels or pickers.

### Itinerary / coverage / Home in Australia

29. **Intentional Gap is retired completely.** No Intentional Gap button, day type, travel type, special budget, or Kym-facing wording.
30. Returning to Australia is a normal dated **Home / Australia** Standard stay with its own Destination Budget.
31. Airport/transit/uncovered days are handled by real stay dates and normal costs; uncovered dates are warnings, not a selectable trip type.
32. General coverage/detail wording uses **Missing Coverage / Uncovered Dates**. The approved compact Itinerary statistic may retain the label **Unplanned Gaps** as a warning count. This does **not** revive Intentional Gap as a type, button, record or budget.
33. Forward Coverage 3/6/12-month controls must change the actual calendar horizon, not merely the number of rows shown.
34. Forward Coverage totals reconcile exact planned/uncovered/overlap days inside the selected horizon and display missing coverage in chronological position.
35. Missing Coverage count includes coverage that simply ends before the selected horizon ends.
36. Itinerary **Current** means the actual current stay regardless of year/filter selection; **Next** means the actual next stay, not the first filtered row.
37. Itinerary stays require valid start and end dates; undated stays are blocked at create/edit and invalid on restore.
38. Itinerary deletion must block when linked Calendar reminders/notes (as well as other protected linked records) would be lost.
39. Journey Start cannot be moved after existing early itinerary stays in a way that creates hidden “Year 0” travel; App Health flags invalid legacy cases.

### Headers / images / navigation

40. Cruise active-stay headers always use the supplied **Princess cruise ship** header, never a country banner.
41. RV/Motorhome active-stay headers always use the dedicated motorhome header: the USA asset only when the trip’s explicit Starting Country is the United States; Canada, Mexico, Europe and all other Starting Countries use the Europe/other motorhome asset. Composite route-country text must never override an explicit Starting Country. Cruise/RV Starting Country is required after migration/restore; a route trip that still has no safely inferred Starting Country must fail validation rather than silently guess.
42. Shared active-stay cards retain the small Cruise/RV marker in addition to the dedicated artwork.
43. Supplied banner images use restrained/minimal cropping so the scene remains recognisable; no aggressive `cover` zoom regression.
44. Shared Next Destination dates use raw ISO in the model and format once at render time to DD/MM/YYYY; never double-format an already formatted date.
45. Calendar and Checklist/Itinerary Next Destination controls must be real navigation controls that open the exact stay.
46. All `pendingOpen` routes/search results must open the exact record where supported, not just the correct screen/category.

### Home / Alerts / Search / Quick Look

47. Home Alerts are generated from live canonical data, not stale simulation-only alert records.
48. Expanded Home Alerts must show the full alert set, with real count; compact cards may display a subset but badge count is the true total.
49. Expanded Upcoming Events must show the full live upcoming list, not clone the compact three-row snapshot.
50. Automatic alert categories include To Book, next destination, checklist readiness, missing itinerary coverage, Vault expiries, incomplete Destination Budgets, Schengen warnings, and legacy Destination Budget repair records.
51. Actionable Home alerts should open the exact affected record/stay where possible.
52. Home missing-coverage alerts must also warn when there are no stays at all in the horizon or coverage simply ends after the last planned stay.
53. Global search accepts the same Australian DD/MM/YYYY dates shown in the UI, including direct Expense/Reservation/Calendar/Checklist dates and linked destination dates.
54. Vault/protected credentials remain excluded from global search.
55. Country totals/search/history must normalise composite route labels so strings such as `Italy / United States` do not become fake countries; regions such as Caribbean are not counted as countries.
56. Country Quick Look has real offline content for planned countries; no production placeholder such as “add destination-specific content here.” Plants/gardens/native flora should remain prominent.
57. Cruise/RV Quick Look and toilet-language shortcut use the **departure/start country**, not a composite route label.
58. Toilet-language shortcut covers the planned countries/languages and must not silently fall back to English where a native phrase is expected.

### Checklist

59. Checklist automatic lifecycle must actually reach **Before You Leave -> Travel Day -> Arrival -> next destination**. The start date must not prematurely advance to the following trip.
60. Ready to Move is about pre-travel readiness. Required **Arrival & Settle In** tasks must not block departure readiness.
61. Home checklist alerts use the same destination/stage lifecycle as Checklist and must not jump ahead to the following trip early.
62. Permanent Checklist completion is scoped per move/destination via destination completion IDs. A Permanent task completed for one move must not remain completed for every future move; legacy global `completed/completedAt` state is not authoritative and is removed/normalised.

### Calendar

63. Calendar user-facing dates, including destination dropdowns and accessibility labels, use DD/MM/YYYY rather than raw ISO. Personal reminders/notes require a date but time is optional. Legacy personal Calendar records that stored a date-only value in `dateTime` are migrated to canonical `date` + null `dateTime` and the editor preserves that date-only state without inventing 00:00/09:00.
64. Legacy duplicated Reservation->Calendar mirror records are removed during migration because Calendar reads Reservations directly.
65. To Book records are not rendered as confirmed Calendar reservations.

### Journey History / analytics / map

66. Journey map route trips connect from the preceding stay and carry the final Cruise/RV route point forward to the next journey segment.
67. Lifetime Travel Spend headline and breakdown use the same “all actual spend up to today” definition.
68. Journey History excludes To Book planning records from lifetime/completed spend and Travel Mix.
69. Zero-spend Journey History category bars render at 0%, not fake minimum bars.
70. Active multi-country Cruise/RV trips must not count every future route country as already visited; full route-country credit is appropriate only once completed/actually covered.
71. Days Travelled counts only days covered by real itinerary stays, including Home/Australia; uncovered calendar days must not inflate the metric.
72. Journey History completion logic treats today consistently with Reservations (today not completed yet).
73. Journey History completed-stay table must retain the later fit-to-iPad override and never reintroduce a hard 980px minimum causing horizontal scrolling.

### Vault / privacy / PIN

74. Concealed email-management sequence remains exact: **unlock Vault -> currently open Streaming -> tap Travel Command Centre compass/logo**.
75. Leaving Streaming hides/disarms the concealed email path; opening Streaming once must not make compass access work from another Vault category.
76. Remove any visible hints/instructions that advertise the concealed email feature.
77. Vault expiry reminders and Emergency Travel Card actions open the exact referenced record/contact, not just the category.
78. Restored malformed/unsupported PIN hashes must fail safe: preserve travel data, disable only the unusable PIN, show a prominent recovery notice, and allow a new PIN to be set. Valid legacy hashes migrate safely.

### Schengen

79. Schengen remains fully manual/offline—no API/live calculation.
80. Manual fields: Status, Days Used, Days Remaining, Entry, Planned Exit, Must Leave By, Last Checked and Notes.
81. Days Used + Days Remaining always represent the 90-day allowance. Entering one can derive the other; inconsistent pairs are blocked/normalised safely for legacy data.
82. Entry/Exit/Must Leave By ordering is validated and displayed in Australian dates.
83. Approaching/passed Must Leave By can generate Home alerts while remaining manual.

### Restore / storage / PWA safety

84. Invalid saved UI navigation state must never make restore/hydration crash; legacy Dashboard maps to Home and bad record-open pointers are cleared safely. Recoverable malformed metadata (revision and created/modified timestamps) is normalised during migration. Persisted bookkeeping timestamps are canonical UTC ISO instants and `modifiedAt` must not precede `createdAt`; timezone-less or inverted legacy metadata is repaired without discarding travel records, while canonical live state rejects invalid/inverted metadata so Recent Activity/history ordering cannot be corrupted.
85. Restore should preserve valid record pointers and clear only invalid ones.
86. If startup state fails validation, enter a **protected recovery mode**. Do not let the next normal Save overwrite the stored data.
87. Recovery mode offers **Restore Valid Backup** and **Export Raw Recovery Data**.
88. Emergency Raw Recovery export uses delayed object-URL cleanup compatible with iPad Safari; do not revoke immediately on click.
89. Backup/restore validation remains transactional: failed restore/write preserves the existing good data. If the storage read needed to establish the previous value itself fails, rollback must not remove or overwrite that unknown prior value. Once the previous value is known, any failed write attempt—including a storage layer that changes the value and then throws—must restore that previous value immediately so a reload cannot resurrect the attempted Save. After a failed Save, the known last-good in-memory state remains authoritative; Retry iPad Storage must verify reads/writes and restore that known last-good state before Protected Recovery is cleared.
90. `index.html` links `manifest.webmanifest`; standalone iPad/PWA metadata remains present.
91. Service-worker cache generation must change for successor builds so installed iPads do not keep serving stale V34 files.
92. Offline cache covers all runtime JS/CSS/simulation/header assets needed after install.

### App Health / regression testing

93. App Health flags overlapping itinerary stays because automatic date routing becomes ambiguous.
94. App Health distinguishes missing/incomplete Destination Budget setup from broken routing relationships.
95. App Health detects missing AUD equivalents, invalid Journey Start relationships, legacy repair records, and other relationship faults without destroying recoverable data. Normal Itinerary and Destination Budget date saves must also block creation of hidden pre-Year-1 travel before Journey Start. Canonical restore validation rejects malformed Account currencies/balances, normalises valid legacy Account currency casing, rejects invalid/duplicate Cruise/RV route-point ordering and ambiguous composite-route Starting Country guesses, while permitting only already-approved unambiguous legacy US start-city evidence to restore Starting Country. It also enforces Vault screenshot limits (12 per record / 1.5 MB each), keeps canonical persisted dates strictly ISO while explicitly migrating genuine legacy Australian DD/MM/YYYY date-only values, and canonicalises Protected Email casing while rejecting case-insensitive duplicates so corrupted Budget totals, route context, map paths, dates, concealed email data or unsafe attachment sets cannot silently enter the live state. Canonical numeric fields reject boolean/array/object coercion and migrate recoverable legacy numeric strings to real numbers so corrupt money, map coordinates, route order, Journey History distance or Schengen counts cannot silently become plausible zero values.
96. Full simulation should remain 9/9 verified after migration/normalisation when data is valid.
97. Regression verifier must parse/check JavaScript as **ES modules**, not rely on a syntax mode that can miss browser/PWA module failures.
98. Remove dormant production placeholder copy such as “Production screen rebuild has not started.”
99. Preserve the 1024×768 iPad-landscape rule, **zero horizontal scrolling**, Home one-screen composition, no decorative/dead controls, all working buttons, Save-only commit and delete confirmation.
100. Preserve the under-100-file extracted package constraint. This V44 iPad visual candidate remains **99 actual files**.

## V44 freeze checkpoint — iPad visual candidate

This V44 handoff freezes the exact V43 successor after the final non-visual continuation audit. Immediately before freeze, the V43 guard passed with exactly **2 intentional changed source files** allow-listed and no unexpected drift: `src_main.js` and `src_screens_settings.js`. Both changes are the same narrow iPad/WebKit download-compatibility treatment: JSON export bytes remain unchanged and filenames remain `.json`, while the downloadable Blob MIME type is `application/octet-stream`.

The V44 final continuation probe passed **3,283/3,283 checks**, including **1,461/1,461** exactly routed itinerary days, **2,310** cross-screen model builds, 9/9 App Health, dated Expense/Reservation routing, mutation save/delete paths, strict duplicate protection, Vault split-storage one-file Backup/Restore, and failed-Save Protected Recovery rollback/retry. Offline shell coverage remains complete and the package remains 99 files.

Runtime identity advances to `1.2.0-v44-ipad-visual-candidate`; service-worker cache advances to `tcc-v1-v44-ipad-visual-candidate-2026-09-03` so the target iPad cannot silently keep V43 runtime files.

**Still active:** real 1024×768 iPad Safari/Home-Screen visual/interaction acceptance and practical target-device Vault IndexedDB testing. V44 is an iPad visual candidate, not a release/master declaration.

## V43 freeze checkpoint — post-V42 extended forensic carry-forward

This V43 handoff freezes the exact working tree after the long V42 successor audit. Immediately before freezing, the V42 guard passed with exactly **27 intentional changed source files** allow-listed and no unexpected drift. Those changes are now absorbed into V43 and the V43 guard must pass with **no allow-list** on a fresh extraction. Runtime identity advances to `1.2.0-v43-active-continuity`; the service-worker cache advances to `tcc-v1-v43-active-continuity-2026-09-03`.

The V43 freeze includes strict restore/canonical hardening, Unicode-normalised matching, mutation-contract protection, Journey History relationship enforcement, observer isolation, persistent-storage requesting and the new Vault screenshot split-storage architecture using IndexedDB for payload bytes while preserving the single self-contained JSON Backup/Restore contract.

Targeted Vault storage verification completed before freeze: **17/17 split-storage**, **3/3 large-payload**, **5/5 twelve-screenshot capacity**, **3/3 self-contained backup**, **6/6 idempotent migration**, **6/6 Protected Recovery asset staging**, and **4/4 Vault App Health** checks.

**Still active:** real 1024×768 iPad Safari/Home-Screen visual/interaction acceptance and practical target-device Vault IndexedDB testing. V43 is a continuity baseline, not a release/master declaration.

## V42 freeze checkpoint — post-V41 forensic carry-forward

This V42 handoff freezes the exact working tree after the extended post-V41 forensic continuation. Immediately before freezing, the V41 guard passed with exactly **15 intentional changed source files** allow-listed and no unexpected drift. Those changes are now absorbed into V42 and the V42 guard must pass with **no allow-list** on a fresh extraction. Runtime identity advances to `1.2.0-v42-active-continuity`; the service-worker cache advances to `tcc-v1-v42-active-continuity-2026-09-03`.

The V42 freeze absorbs the recovery/version hardening, empty/truncated-storage protection, UI-only repair parity, Vault destructive/persistence fixes, midnight-editor deferral, Calendar landmark semantics, shared/root/local focus continuity, named application/navigation/reference landmarks, exact-date VoiceOver gap context, and the Itinerary failed-save/delete rollback repairs listed in `CONTINUITY_START_HERE.md`.

The strict persisted-generation boundary is carried forward deliberately: **V41 and V42 states/backups remain strict**, while supported V35–V40 data retains the compatibility migration path. This prevents a successor runtime from weakening the corruption protections that were introduced while V41 was current.

**Still active:** final visual/interaction/accessibility forensic work and the real 1024×768 iPad/browser pass.

## V41 freeze checkpoint — post-V40 forensic carry-forward

This V41 handoff freezes the exact working tree after the extended post-V40 forensic continuation. The pristine V40 baseline was verified before edits. At freeze time exactly **14 source files** differed intentionally from the V40 hashes; those changes are now absorbed into the V41 baseline and must verify with **no allow-list** on a fresh extraction. Runtime identity advances to `1.2.0-v41-active-continuity` and the service-worker cache advances to `tcc-v1-v41-active-continuity-2026-09-03`.

Latest verified checkpoint carried into V41:

- JavaScript: **62/62 ES modules parse**.
- App Health: **9/9 verified**.
- Boundary-date view models: **672/672**, zero exceptions.
- Itinerary routing: **1,461/1,461 days**, zero faults.
- Confirmed dated costs: **266/266**, zero faults.
- To Book: **1**, planning-only.
- Global Search Reservation Calendar mirrors: **0 duplicate results**.
- Offline shell: **73/73 present**.
- Cruise/RV/Standard simulation header resolution: **46/46 valid**.
- Backup/restore security matrix: **6/6**.
- Horizontal-scroll rules: **0**.
- Extracted continuity package: **99 files**.
- Real 1024×768 iPad/browser visual interaction pass: **still outstanding / environment-blocked**; therefore this is not a release/master declaration.

Post-V40 fixes absorbed into V41 include optional/reversible Flight classification; exact dated-stay Reservation currency inheritance with manual override preservation; failed-Itinerary-Save filter rollback; Global Search calendar-mirror exclusion; Journey Start-aware Home/Itinerary coverage; correct first-use Budget/Itinerary states; overspend percentages above 100%; expanded VoiceOver semantics; and controlled older-backup travel-type migration while current-generation backups remain strict.

## V40 freeze checkpoint — historical predecessor checkpoint

This V40 handoff freezes the exact working tree after the extended V39 forensic continuation. Immediately before freezing, the V39 guard passed with exactly **21 intentional changed source files** allow-listed and no unexpected drift. Those changes are now part of the V40 protected baseline; the V40 guard must pass with **no allow-list** on a fresh extraction. The successor continuity identity also bumps `APP_VERSION` to `1.2.0-v40-active-continuity` and the service-worker cache to `tcc-v1-v40-active-continuity-2026-09-02` so installed iPads cannot continue serving the predecessor runtime.

Latest verified checkpoint carried into V40:

- 62/62 JavaScript ES modules parse.
- App Health remains 9/9 verified on the migrated multi-year simulation.
- First-use model matrix: 50/50 across empty/partial setup states.
- Full itinerary/date routing remains validated across 1,461 simulation days.
- No horizontal-scroll rules are present; Home one-screen authority remains protected.
- Package remains 99 extracted files.
- Real 1024x768 browser/iPad visual interaction pass remains outstanding because Chromium navigation is administratively blocked in the current audit environment. This is a release-level outstanding check, not permission to redesign.

The V40 freeze additionally protects the post-V39 fixes listed in `CONTINUITY_START_HERE.md`, including restore checksums/current-state corruption rejection, forward-version/downgrade protection, final-stay Checklist behavior, destructive Checklist conversion guards, Default Currency wiring, first-use Budget/Journey zero states, Home Schengen date content, same-day wording, strict Vault screenshot payload validation, JSON-stable state and timestamp floors, Itinerary Starting Country search/Unplanned Gaps wording, Budget Summary wording, and legacy flight-metadata recovery.

## V39 freeze checkpoint — post-V38 forensic carry-forward

This V39 handoff freezes the exact working tree after the post-V38 forensic batches. The V38 guard was run against the source immediately before freezing and passed with **29 actual V38-different source files explicitly allow-listed**. V39 then updates only continuity/runtime identity (including the service-worker cache and app-version metadata) before regenerating the frozen SHA-256 baseline.

Additional protections frozen into V39 include:

- Australian-date/VoiceOver context across editors and exact dated destructive confirmations.
- Expandable-card semantics and iPad touch-target hardening without redesigning approved layouts.
- Journey History expanded-widget titles, Year 5+ filter wrapping/pagination reachability and repeated-stay identity.
- Transactional Restore rejection of malformed/truncated current backups; failed writes preserve last-good data and Protected Recovery.
- Calendar busy-day `+ more on this day` overflow instead of nested mini-scrollbars, preserving exact source IDs.
- Timeline overlap/gap scanning that handles nested/chained overlaps without false gaps.
- Country canonicalisation for UK/United Kingdom, USA/United States/US variants, Türkiye/Turkey, Czechia/Czech Republic and related Home/header/occurrence cues.
- Home/Australia stay exclusion from false Missing Accommodation warnings while ordinary Australian travel remains checked.
- Journey History country/destination alias deduplication, Tickets & Attractions classification to Entertainment, and null-vs-zero distance override safety.
- Map coordinate presence safety: blank/null coordinates never become 0°,0° and never invent route legs across unmapped stays.
- Schengen unset-vs-explicit-zero correctness.
- Home To Book, Vault expiry and budget-repair alerts now identify exact actionable records with dated context.
- Vault exact-record/screenshot deletion confirmations and malformed Journey History text validation/search string guards.
- Completed Reservations retain Paid/Unpaid/Booked payment state while lifecycle remains Completed.
- Foreground device-date refresh prevents a continuously open iPad from remaining stale across midnight/date change.
- Full header/flag alias alignment, including UAE and Bosnia & Herzegovina variants and robust US motorhome-header recognition.
- The service-worker cache generation is bumped in V39 so installed iPads cannot silently serve stale V38 runtime files.

**Still active:** the no-dead-control sweep, remaining deep interaction/state audit, final screen-by-screen visual refinement, and a real 1024×768 iPad/browser visual/interaction pass before any release/master declaration.

## Regression protocol for the next chat

1. Extract this V44 package without renaming/removing files.
2. Run `python3 verify_regression_guard.py --verify` **before touching anything**; require `PASSED — BASELINE VERIFIED`.
3. Read `CONTINUITY_START_HERE.md`, `LOCKED_REQUIREMENTS.md`, this ledger and `VISUAL_REFERENCE_INDEX.md`.
4. Work from this exact V44 source. Do not revert to V43/V42/V41/V40/V39/V38/V37/V36/V35/V34 to make a problem easier.
5. For each focused batch, pass the exact intentionally changed files via `--allow-changes`.
6. After each batch: ES-module parse, relevant model/relationship/migration/restore tests, affected iPad geometry review, zero-horizontal-scroll review and dead-control/exact-record checks.
7. If runtime assets change, re-check service-worker shell coverage and bump cache generation for an installable successor when appropriate.
8. Before freezing the next continuity baseline: regenerate metadata/hashes last, then run the new baseline verifier with **no allow-list**.
9. Before declaring a release/master: complete the real 1024×768/iPad visual/interaction pass rather than relying only on source inspection.
10. Keep the extracted package at **100 files or fewer**.

## Visual work still not Gold Locked

- Final app-wide palette/saturation balance outside already-approved colours/attention surfaces.
- Final boldness hierarchy outside explicitly protected widgets.
- Final graph presentation where a clearer visual communicates the same protected data.
- Selective replacement of weak country-header images only if correct focal/crop handling still cannot make the supplied image acceptable.
- Final actual-iPad reference pass.

Do not confuse **functionally passing** with **visually/master approved**. Home and the supplied reference screenshots remain the layout/material authorities.
- Checklist History destination items are real edit controls: tapping a historical saved item opens its exact prefilled editor without rebinding it to the current destination.
- Itinerary deletion now cascades its non-editable Journey History supplement records; editable linked Expenses, Reservations, Checklist items and Calendar notes still block deletion until resolved.
- Safari/iPad file-picker cancellation now removes the temporary hidden chooser for Recovery Restore, Settings Restore and Vault screenshots; cancelled picks cannot accumulate dead controls. Itinerary delete confirmation also names every protected linked record class rather than incorrectly referring only to financial records.
- Blocked Expense/Reservation date-routing states retain exact matched-stay DD/MM/YYYY context. Incomplete Reservation budgets now keep the dated stay ticket visible (including repeated-stay occurrence cues) instead of collapsing to an ambiguous destination-name-only warning; Home budget/repair alerts also carry dated context.
- Persistence/restore write failures now notify render subscribers immediately so Protected Recovery replaces the stale editor/screen at once. Rendering Recovery always locks/disarms The Vault session, and a recovery-backup restore explicitly locks Vault before returning to the app; a storage failure can no longer leave a pre-recovery Vault unlock alive.

- Protected Recovery retains a user-selected, already-validated backup as the retry candidate if iPad storage fails during the restore write; Retry iPad Storage can then commit that backup without losing the original raw recovery export.
- Vault Recent Activity rows are real exact-record controls: Vault records open their own prefilled editor, screenshot activity opens the exact parent Vault record, and Streaming activity opens the exact saved login editor.
- Vault interaction colour continuity is protected: changing a Vault record category retints the open editor immediately, and Add Screenshots inherits the parent record category tone instead of falling back to generic blue.
- Shared modal tone classes are final-screen-layer authority: screen-specific modal shells cannot override the selected widget/category/type colour, and sticky actions/focus treatment inherit the active tone.
- Motorhome/Cruise route-stop Remove controls retain the compact visible “Remove” label but expose the exact stop number/name to VoiceOver so repeated destructive controls are not ambiguous.
- Budget Reservations stays read-only in Budget, but saved rows deep-link to the exact prefilled Reservation editor so the global saved-record tap contract is preserved.
