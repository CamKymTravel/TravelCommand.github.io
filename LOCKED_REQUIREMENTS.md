# V54 Touch-Target Completion Additions / Overrides

### V54 late integrity/performance additions
- Reservations duplicate-health grouping must retain exact existing wildcard-time semantics but must not regress to an O(n²) all-pairs scan. The indexed `reservationDuplicateKey` grouping is now protected.
- A newly created or edited **Standard** stay must have a Country. This is required to resolve its country header, Country Quick Look and toilet-language helper correctly.
- Existing/legacy Standard stays with blank Country stay loadable; App Health flags them for repair. Do not invent Indonesia or another fallback country.
- Cruise/Motorhome/RV keeps the separate Starting Country requirement and dedicated header rules.


- V54 absorbs V53 in full; all V53/V52 no-loss, helper, routing, recovery, icon, header and visual-hierarchy rules remain active.
- A protected touch target is judged by the **effective final cascade**, not by whether an earlier `min-height:44px` marker exists somewhere in CSS.
- `Reservations` flight-scope selector tiles must finish at **44px minimum height**.
- `Itinerary` Forward Coverage switches must finish at **44px minimum height**.
- `ACCEPTANCE_MATRIX_V54.md` and the V54 final-cascade verifier are mandatory. A later equal/higher-priority rule shrinking either control below 44px is a regression.
- V54 app/cache identity must remain separate from V53 so Safari cannot reuse the predecessor shell as the current build.
- Home, Budget, Reservations, Itinerary, Calendar, Journey History, Checklist, Vault, Settings and the Add/Edit/helper structures locked in V53 must not be redesigned, simplified, recoloured or removed by this focused repair.
- Physical 1024×768 iPad acceptance remains mandatory before Gold/Master Lock.

---

# V53 Acceptance Repair Additions / Overrides

- `ACCEPTANCE_MATRIX_V53.md` is now a locked acceptance authority. A hash-correct package that fails the matrix is a regression.
- Deterministic inline SVG is required for sidebar and interactive icon treatment; do not restore Unicode/emoji control glyphs.
- Home must retain Current Destination, exact Next Destination, Days in current stay progress, three budget summaries, four compact panels and global search.
- Itinerary primary order is locked: Forward Coverage → six planning stats → Add/Home controls → Search/Year filters → Upcoming Itinerary → forward map → Completed Itinerary.
- Add Expense / Add Reservation keep the approved numbered hierarchy and date-driven Destination Budget routing; do not restore an Annual/Destination picker.
- No-current-stay header selection must return no country header, never Indonesia.
- V53 app/cache identity must remain separate from predecessor caches to prevent mixed-version first-load behaviour.
- The V52 and earlier no-loss, recovery, Vault, helper, colour-authority, route-mode and hidden-email rules remain in force unless explicitly superseded here.

---

# V52 Active No-Loss Additions / Overrides — 04 Sep 2026

These V52 rules override older “current checkpoint” wording while preserving all V51/V50/historical requirements below as ancestry.

## Exact-source authority
- Continue only from a V52 extraction that returns `PASSED — BASELINE VERIFIED` with **no allow-list**.
- `CHANGESET_V51_TO_V52.md` is mandatory and freezes the exact 17 absorbed post-V51 source/runtime files. Reverting any of those files to V51 is a regression.
- V51/V50 and older ZIPs are recovery evidence only, never implementation starting points once V52 verifies.

## Newly frozen functional protections
- `needsBudgetRepair` Expense/Reservation records are still real dated costs for destructive protection. If exactly one stay covers the cost date, deleting that stay, removing its Destination Budget, or editing itinerary dates so the cost becomes uncovered/ambiguous must be blocked until repaired.
- Unresolved repair Reservation values must not enter authoritative `Total Booked · AUD`; the records remain visible and the excluded count is stated.
- Async dialog actions are promise-busy: no double action, Escape or Cancel while Unlock/PIN/screenshot/other async modal action is unresolved.
- Ordinary background rerenders must not tear down open dialogs or native iPad file/photo pickers. Protected Recovery is the only immediate safety override.
- Vault physical screenshot cleanup is audited/retryable. In-flight staged keys, Protected-Recovery pending restore keys and active backup-read keys must not be swept as orphans. Late/stale asset audits must never overwrite a newer health result.
- Export must be a point-in-time self-contained backup even if Restore or Vault deletion is attempted concurrently; screenshot bytes are pinned until readers finish. Export and Restore also share a Settings busy lock.
- Service-worker upgrade refresh must not blindly navigate a busy/unresponsive iPad window; predecessor caches remain while an old live window may still need them offline.

## Newly frozen interaction/accessibility protections
- Material/colour depth follows the originating rendered parent into exact-record editors and destructive confirmations where that contextual hand-off is intentional. Do not revert Home/Search/Alerts/Calendar/Budget/Checklist/Journey/Vault deep-links to generic editor colours.
- Protected Email Delete remains magenta; Vault category/screenshot destructive confirmations stay in their category/material family.
- Quick Look ↔ Phrase Helper replacement must not restore VoiceOver focus behind the newly opened dialog. Phrase-helper result/status messages remain a polite live region.
- High-frequency iPad controls remain at least ~44px effective touch height. Forward Coverage wraps rather than horizontally clipping, and Journey History table/spend rows fit the target 1024px width without horizontal scroll.

## V52 continuity authority
- V52 is NOT Master/Gold Lock. The final palette is still unapproved; target-iPad visual/helper/voice/Vault/update acceptance remains mandatory.

---

# Historical V51 additions preserved below

# V51 Active No-Loss Additions / Overrides — 04 Sep 2026

These V51 rules override any older “current checkpoint” wording below while preserving older sections as historical ancestry.

## Destination-helper visual authority
- `VISUAL_REFERENCES.zip` contains the approved rich Country Quick Look and toilet-helper concept pictures. Treat their **layout, density, hierarchy, photographic richness and interaction scale** as authority. Do not implement a watered-down compact substitute.
- Country Quick Look concept correction: **remove Current Destination Status** and all fake/live current weather-temperature content; use **Practical Essentials** instead.
- Toilet-helper concept correction: **remove Quick Tips**; use **Signs to Look For** with local Toilet/WC, Women, Men and Accessible labels where practical.
- Screenshot sidebar wording does not override the product rule: the visible app navigation label remains **Home**, never Dashboard.
- Screenshot audio copy does not override truthfulness: never claim “100% available” or equivalent until target-iPad offline playback is proven.

## Destination-helper data / behaviour
- V51 freezes **78 Quick Look + 78 toilet-language + 78 helper-context records**, with exact dataset pairing. Dropping below 78 or creating an unpaired country is a regression.
- Every Quick Look record uses four substantial items in each of Plants & Gardens, Animals & Wildlife, Food & Drink, and Culture/local context. Plants & Gardens retains modest extra prominence for Kym.
- Quick Look also carries language, currency, time zone and Practical Essentials (capital, calling code, plug/power, driving side, payments, tipping where supplied).
- Toilet helper carries native phrase, English meaning/context, simple pronunciation, slow breakdown, Polite Extra and Signs to Look For.
- Play / Slow / Repeat ×3 / Louder are real controls. Speech is allowed only through a genuinely installed local iPad voice (`localService===true`); no internet speech API or hidden online fallback. Target-device proof remains mandatory.
- Access remains distinct: **Home Current Destination header/banner → Country Quick Look**; **Home compass/logo → Where’s the toilet?**. Cruise/Motorhome/RV uses Starting Country.

## Material-depth continuity
- Parent widget → expanded view → deeper editor/detail must retain one premium material family. The rendered parent surface is authoritative where available; semantic tone is fallback.
- Status widgets must not retain a “good” colour when status changes to Needs Attention; warning colour may change the status surface without recolouring an unrelated parent flow.
- Destination Budgets remains the green-family flow even when a missing-budget warning inside it is gold.
- Deep-editor context already fixed in V51 must not regress: To Book gold; Upcoming reservations blue; Next 5 red; Budget reservations indigo; Recent Expenses blue; Living Expenses violet; Forward Coverage indigo; Upcoming Itinerary blue; Permanent Checklist green; Destination Checklist sky.
- The final whole-app palette is still **not approved**. Do not infer hue approval from any screenshot.

## V51 continuity authority
- V51 is the exact implementation baseline after the 12 post-V50 changes listed in `CONTINUITY_START_HERE.md`.
- V50 and earlier packages are historical predecessors only. Never revert to them to solve a defect.
- Release/master/Gold Lock remains blocked on target-iPad visual/interaction proof, offline-voice proof/fallback decision, Vault IndexedDB practical testing, completion of the remaining material audit and Cameron’s final global colour approval.

---

# Locked Requirements — No Regression Contract

## Product / platform

- Travel Command Centre V1, owners Cameron & Kym.
- iPad landscape only.
- Offline PWA, Safari/Add to Home Screen, local device storage, no subscription, no external APIs/database.
- Australian date format DD/MM/YYYY.
- Persisted canonical dates use strict ISO date/date-time values internally. Restore may explicitly migrate genuine legacy Australian DD/MM/YYYY date-only values, but must never rely on ambiguous JavaScript date parsing.
- Persisted monetary/numeric state is canonical numeric data, not JavaScript-coercible booleans/arrays/objects. Recoverable legacy numeric strings may migrate to real numbers; malformed non-scalar numeric values must be rejected rather than silently becoming 0. This includes Annual/Destination Budgets, Expense/Reservation amounts, Accounts, route/map coordinates/order, Journey History distance and Schengen day counts.
- Persisted user-facing text fields remain text. Malformed arrays/objects in notes, references, account labels, Calendar/Vault/Streaming/protected-email text or stored alert copy must be rejected rather than rendering coercion artefacts such as `[object Object]`. Checklist completion timestamps, when present, are canonical UTC timestamps.
- Account currency restore distinguishes absence from corruption: a missing legacy currency may default to AUD and a valid lowercase code may canonicalise uppercase, but malformed object/array/non-code values must be rejected rather than silently rewritten to AUD. Schengen notes and PIN-recovery notice are also canonical text and must never be object-string coerced.
- Optional persisted dates and relationship IDs are canonical `null` or valid values. Recognised legacy `false` placeholders may migrate to `null`, but boolean/object/blank relationship IDs and boolean dates must never survive as canonical live state merely because JavaScript treats them as falsy.
- Persisted bookkeeping timestamps remain canonical UTC and monotonic across Saves even if the iPad clock is corrected backwards; recoverable future legacy timestamps are capped safely during migration so a later Save cannot fail chronology validation.
- Device clock/timezone is authoritative current date/time.
- Manual backup/restore; one complete JSON backup; restore replaces current data only after validation and confirmation.
- No decorative dead controls. Save commits; Delete always confirms; tapping saved records opens prefilled edit forms.
- Reservation lifecycle restore is non-destructive: `To Book` must remain planning-only. Missing recognised legacy status may default to Booked and old derived `completed` may migrate to Booked, but malformed/unknown status data must be rejected rather than silently rewritten as a confirmed booking.
- Schema-version and Schengen-status restore are safety-critical: malformed booleans/arrays/objects/unknown values must be rejected rather than coerced to legacy schema 0 or silently rewritten to Not Checked. Missing genuine legacy schema/status may migrate safely, and recognised Schengen status casing may canonicalise.
- Sidebar order: Home, Budget, Reservations, Itinerary, Calendar, Journey History, Checklist, The Vault, Settings.

## Whole-app visual system

- Every screen must feel like one application, not independently designed pages.
- Shared typography, wording hierarchy, spacing rhythm, card proportions, icon treatment, controls, selected states, borders, material depth, glow and animation behavior.
- No screen-specific typography/component inventions unless functionally required.
- New colour palette is **not yet locked**.
- Use a broad coordinated palette with many related hue/tonal variations; do not recycle only a few blues/reds/greens.
- Same functional concept normally keeps the same colour family across screens. Closely related variations are allowed when strict reuse would overload a screen with one colour.
- Special emphasis may be stronger for His/Hers and Future Bookings / To Book.
- Graph purpose/placement from approved references is protected, but chart type/presentation may improve if clearer.
- Subtle offline animation is encouraged: chart reveals, bar growth, donut/ring sweeps, route draws, progress transitions. Never gimmicky or performance-heavy.

## V50 final-colour implementation rule — NOT YET APPROVED

- **No screenshot is colour authority unless Cameron explicitly says that specific colour is approved.** Current and historical screenshots are evidence for layout, hierarchy, flow, interaction depth and regressions only.
- The final colour pass is global, not screen-by-screen. Every coloured widget must have the same premium material quality: equivalent perceived saturation, brightness, contrast, depth, border/highlight strength and restrained glow. Only the hue/colour family should materially differ.
- Do not preserve an old hue because it happened to appear in a reference screenshot. Do not infer palette approval from a previous build.
- Parent widget -> expanded view -> deeper detail/editor must stay in one colour/material family, but the actual final hue remains subject to the later whole-app colour pass unless separately approved.
- Home/Vault premium material polish, the approved Itinerary compact statistics and Journey History headline summary treatment remain quality benchmarks for depth/readability, not automatic hue assignments.
- Colour layout remains explicitly **unconfirmed** until Cameron approves the final global pass.

## Responsive / scrolling

- **Horizontal scrolling is prohibited everywhere.**
- Vertical scrolling is allowed for genuinely long information-rich screens.
- Add/Edit/expanded screens that only exceed the iPad viewport slightly should be tightened to fit one screen where practical without hurting readability.
- Journey History must keep rich analytics/table content while fitting the iPad width.

## Headers / hero images

- Use supplied header images; do not recreate them.
- Do not over-zoom/crop. Preserve a clearly recognizable scene with minimal edge cropping, sensible focal positioning and no stretching.
- Shared header/hero treatment should be consistent across screens.
- The approved Home country header height/proportions are the sizing authority for current-destination country banners on Budget, Reservations, Itinerary and Calendar.
- Cruise trips never use a normal country header: they use the supplied **Princess cruise-ship header**. Motorhome/RV trips use a dedicated motorhome header: the supplied USA motorhome image for US trips and the supplied Europe/other motorhome image otherwise. This applies anywhere the shared active-stay banner is reused. Shared active-stay cards also retain a clear small cruise/motorhome marker so the trip type remains obvious. Cruise/RV itinerary records require an explicit Starting Country after migration/restore so this header and language context can never be guessed from an ambiguous composite route label.
- If a supplied country image still cannot produce a visually pleasing, recognisable scene after correct sizing and focal positioning, replace only that weak image with a better-suited alternative rather than forcing an excessive crop.

## Home

- Home is a **one-screen dashboard** on iPad; no vertical scrolling.
- Preserve the compact reference composition and clear scan order.
- Do **not** add a Journey Map to Home if it makes the page scroll or duplicates map functionality elsewhere.
- Current destination header is tappable and opens an offline Country Quick Look.
- Country Quick Look may be rich but compact: plants/gardens, food/drink, animals, cultural/quirky facts and history/local-interest snippets. Plants/gardens get modest extra prominence without making the panel long.
- Plants/gardens get a little extra prominence.
- Preserve Home compass shortcut for “Where’s the toilet?” language aid: native phrase, simple English-style pronunciation, slow syllable breakdown, no IPA.
- Standard stay uses current destination language. Cruise/RV uses departure/start destination language for the whole trip.
- **Access points are distinct and locked:** tapping the Home Current Destination header/banner opens Country Quick Look; pressing the Home Travel Command Centre compass opens “Where’s the toilet?”. Do not swap, merge or hide these interactions.
- Country Quick Look must be visually appealing, useful and compact on iPad. Final content model includes Plants & Gardens (slightly extra prominence), Animals & Wildlife, Food & Drink, Culture & Tips, plus practical country context including language, currency and time-zone where available.
- “Where’s the toilet?” must be visually appealing and immediately usable by Kym: large native phrase, English meaning/context, simple pronunciation, slow breakdown, and—if technically feasible offline on the target iPad—spoken playback controls for Play, Slow, Repeat ×3 and Louder. No online speech API or subscription may be introduced.
- Current carried source covers 28 route-relevant countries in both quick-look and toilet datasets. This is a **minimum protected checkpoint, not the final coverage target**. Expand robustly for all countries Cameron & Kym may add/visit; do not leave the feature as a tiny hard-coded subset.
- Country/language coverage must stay paired: a country considered supported for Quick Look must also have the toilet-language record (or an explicit documented multilingual/default handling path), and vice versa.

## Budget

- Reference layout is authoritative for density/flow.
- Upper current-stay widget is **Current Destination Budget**.
- Lower planning widget is **Destination Budgets** and must not duplicate current-stay totals.
- Destination Budgets summarizes planned itinerary destinations, budgets set, budgets missing, and opens a manager listing all itinerary destinations with clear Budget Set / Missing Budget status and saved amount.

- Destination Budgets workflow authority: itinerary destinations/trips are created first in Itinerary. Destination Budgets is then the dedicated place to create/edit the budget for those itinerary entries. Its top-level widget prioritises current destination remaining budget plus itinerary count, budgets created, budgets needed and coverage percentage. Expenses and reservations are routed automatically by their entered date to the one Destination Budget covering that date. Removing a destination budget is blocked while dated costs are linked to it.
- Budget screen retains destination budget status, daily/stay pace, Annual Budget, Budget by Category, Year Forecast & Budget Summary, expense-entry area, Reservations, Accounts, Recent Expense Entries and Monthly Spend History/graphs as applicable. Restored Account currency codes are canonical uppercase so AUD accounts cannot disappear from the AUD total because of legacy casing.
- Budget Reservations remains a read-only summary panel, but each saved reservation row is a real exact-record control that opens that reservation prefilled on the Reservations screen.
- Local currency first; AUD beneath where applicable; fixed rate per stay. **AUD stays are always canonical 1:1**; no stored AUD Destination Budget may carry a contradictory fixed exchange rate.
- Current visual colours in old references are not locked.

## Reservations

- Dense category-dashboard layout with strong hierarchy.
- Future Bookings / To Book is deliberately highlighted and easy to understand.
- Upcoming earliest first; completed by date.
- Add Reservation must have unmistakable selected reservation-type tiles and fit iPad cleanly where practical. The reservation date is required but the time is genuinely optional; date-only reservations must not display a fake 00:00 time. Budget allocation is automatic from the entered reservation date; there is no Annual/Destination allocation chooser.

## Itinerary

- **Intentional Gap is retired completely.** There is no Intentional Gap button, record type, day type, or special gap budget. Any genuinely uncovered itinerary dates remain a **Missing Coverage / uncovered dates warning only** until a real stay is entered. Returns to Australia are entered as a normal dated **Home / Australia** Standard stay and receive their own Destination Budget for the full home period. Airport/transit days are handled through the normal dated Expense/Reservation rules; they are not a special itinerary entity.

- Preserve forward-planning map/coverage/stat/list structure from references.
- Six compact statistic widgets are a strong layout benchmark.
- Map must frame the forward journey rather than a cluttered all-history world plot.
- Route modes Standard / Motorhome / Cruise stay distinct.
- Journey Start remains the lower boundary for planned travel: Itinerary edits and Destination Budget date edits must not save a stay before the configured Journey Start. Change Journey Start in Settings first if earlier travel is genuinely intended.
- No horizontal scrolling.
- iPad Safari form controls and search/select inputs must use at least 16px editable text so focus does not auto-zoom/shift the landscape layout; compact non-interactive labels may remain smaller.
- Saved Motorhome/Cruise route points must never be silently discarded. Removing persisted route points—including by changing a route trip to Standard—requires an explicit destructive confirmation before Save.

## Calendar

- Month view default; Agenda available.
- Destination/travel periods shown as substantial coloured strips, not thin continuous lines.
- Personal reminders/notes local only. Their date is required but time is optional; opening/editing a date-only note must never invent a 00:00/09:00 time. Canonical storage uses exactly one date source: `date` for date-only notes or `dateTime` for timed notes, never both.
- Keep reference density and readability; do not replace with oversized summary cards.

## Journey History

- This is a high-value, information-rich screen and may be long vertically.
- Preserve reference flow: hero -> five headline summary widgets -> Journey Map + year/type filters + compact map statistics -> Lifetime Travel Spend beside Journey Snapshot -> Milestones / Destination Totals / Travel Mix -> search/filter controls -> paginated completed-stays table.
- No horizontal scrolling.
- Richer history is welcome: most visited country, most/least expensive travel year, average stay length, longest-distance trip, top destinations by spend, annual spend trend, continent/country coverage, milestones and similar retrospective analytics.
- Add information through clear compact widgets/charts rather than widening the table.

## Checklist

- Preserve strong visual multi-panel structure including Ready to Move, next destination/readiness, His/Hers emphasis where used, and Permanent / Destination checklist concepts.
- Destination checklist state remains bound to the destination it was created for and becomes history after that destination passes.
- Persisted Checklist `required` and `completed` flags are canonical booleans. Recognised legacy boolean-like values (`true`/`false`, `1`/`0`) migrate safely so a text `"false"` can never become a truthy required/completed state.

## The Vault

- Protected local-only travel records and screenshot attachments. The live and restored state share the same offline-storage safety limits: maximum 12 screenshots per Vault record and 1.5 MB per screenshot.
- Preserve richer reference dashboard structure and category cards.
- Preserve Streaming screen and concealed email-management path.
- Protected Email restore canonicalises addresses to lowercase and rejects case-insensitive duplicate addresses so the concealed manager cannot enter an uneditable duplicate state.
- Exact concealed email sequence: **unlock The Vault -> open Streaming -> tap the Travel Command Centre compass/logo**.
- Compass must not reveal email manager while Vault is locked, from unlocked Vault main screen alone, or without Streaming having been opened first.
- Vault/protected credentials must not leak through global Home search.
- Vault Recent Activity is not decorative: tapping a saved Vault record opens that exact prefilled record, tapping a screenshot opens its exact parent Vault record, and tapping a Streaming activity entry opens that exact prefilled Streaming editor.
- Vault category colour must carry through the interaction depth: category changes retint the open record editor, and screenshot staging uses the saved parent record category tone rather than a generic fallback.
- Shared coloured editors/enlarged interaction surfaces must retain their selected tone at the final CSS layer; a screen-level generic modal background must never override the active widget/category/type colour.

## Settings / App Health

- Centralized App Health is the active checking surface for the whole app.
- Keep the strong reference structure rather than a plain settings list.
- When App Health needs checking/attention, the red check bar may pulse subtly; animation stops/changes appropriately after status resolves.
- Journey Start, backup/restore, optional PIN, currency defaults and date format remain.
- Canonical record IDs are non-empty text strings. Restore must reject numeric/object/blank IDs so exact-record navigation and relationship keys cannot change type underneath the UI.
- Locked Settings migrate to their canonical V1 shape: DD/MM/YYYY, default travellers 2, numeric non-negative Annual Budget when recoverable, and a real boolean PIN-enabled flag. Legacy boolean-like PIN flags must not create false PIN-recovery warnings.

## Packaging

- Safari/local-storage persistence is transactional. Once the previous value has been read successfully, any failed write attempt—including a storage layer that changes the value and then throws—must restore that known prior value so a reload cannot resurrect an attempted Save.
- Simulation builds should remain under 100 files when the user needs to upload an extracted folder in one batch.
- Prefer one top-level folder and no nested subfolders for upload builds.

### Reservation transport classification
- Flights may be classified as **Domestic** or **International** when booked. Their cost routes automatically to the Destination Budget covering the entered reservation date.
- Trains are always one combined **Trains** category. Never split train counts, widgets, summaries, history or analytics into domestic vs international.
- Train reservations use the same automatic date-driven Destination Budget routing as every other reservation type.

### Destination Budgets date and expense workflow
- Destination Budgets dates are a primary safety cue. Every budgeted itinerary stay must show a prominent, unambiguous start/end date treatment; repeated cities must also show a stay/occurrence cue where useful.
- Established budgets use large day numbers with bold month abbreviations and visible year (for example **03 SEP → 16 SEP · 2028**). Full Australian DD/MM/YYYY dates remain available in edit/picker contexts.
- Creating/editing a Destination Budget uses calendar-style date inputs tied to the same itinerary record. Changing dates here updates that itinerary stay; do not create a second independent set of budget dates.
- There is no manual Reservation Destination Budget picker. Entering the reservation date automatically selects the exact dated Destination Budget, with the selected stay and dates shown clearly.
- Every Expense and every Reservation routes automatically by its entered date to exactly one Destination Budget. This includes Miscellaneous. If no itinerary stay covers the date, more than one stay covers it, or the matching stay has no Destination Budget, saving is blocked and a large unmistakable warning is shown.
- Destination Budgets manager should support quick monitoring of **All / Need Budget / Locked In** while preserving chronological order within each view.
- App Health treats missing Destination Budgets as **Needs Setup**, not a fault; broken destination-routing relationships remain **Needs Attention**.
- New Expense/Reservation saves must reject any date that does not resolve to exactly one fully configured Destination Budget. Legacy/restored costs from older allocation models are preserved with `needsBudgetRepair` rather than making the whole backup unusable; App Health and Home Alerts must surface them until the dated Destination Budget is configured and the record is opened/re-saved. Non-repair records that point to the wrong dated stay remain invalid.

### Manual Schengen tracker
- Schengen remains fully manual and offline. There is no API/live Schengen calculation.
- Kym can maintain Status, Days Used, Days Remaining, Entry, Planned Exit, Must Leave By, Last Checked and Notes.
- Days Used + Days Remaining must equal the 90-day allowance; entering one side may derive the other. Legacy mismatches are normalised safely during migration.
- Entry / Planned Exit / Must Leave By / Last Checked display as Australian DD/MM/YYYY dates. Planned Exit cannot be after Must Leave By, and neither Exit nor Must Leave By can precede Entry.
- Approaching or passed Must Leave By dates may generate automatic Home warnings while remaining a manual tracker.

## V41 active continuity authority

This V41 continuity package contains the exact verified working tree carried forward from the V40 active baseline plus the 14 post-V40 forensic source changes absorbed into this handoff. The protected offline/runtime generation is the V41 active continuity generation recorded in `CONTINUITY_START_HERE.md` and `REGRESSION_CONTRACT.json`; older V40/V39/V38/V37/V36 cache-generation ancestry must never be treated as the current runtime. `OUTSTANDING_WORK.md` remains part of the no-regression contract: all 100 numbered items are protected requirements, while its V41 status section records implemented fixes and the remaining active forensic work.

Do not restart from V40/V39/V38/V37/V36/V35/V34 or treat an older code path as permission to undo a V41-protected behaviour. A successor continuity baseline must be verified against this exact V41 package first. A release/master must not be declared until the still-active final visual/date/accessibility forensic work is complete.

- Persisted Checklist completion flags are real booleans; legacy boolean-like values are migrated deliberately so text such as `"false"` can never count as completed.


## V42 active continuity authority

This V42 continuity package is the exact verified successor to V41. It absorbs the **15 intentional post-V41 source files** and advances the protected runtime/cache identity to `1.2.0-v42-active-continuity` / `tcc-v1-v42-active-continuity-2026-09-03`. After the V42 guard verifies, V42 is the implementation authority; V41 and older packages are historical predecessors only.

The V42 recovery contract specifically preserves **strict V41+ persisted-state validation** while retaining supported V35–V40 compatibility migration. UI/navigation state remains repairable; security, metadata, settings, collections and travel relationships remain strict. Empty/truncated storage must never masquerade as first use. Automatic date refresh must never destroy an open editor. Shared/root/local rerenders must not strand keyboard/VoiceOver focus.

The V42 package remains an active continuity baseline, not a release/master declaration. The real 1024×768 iPad/browser visual interaction pass is still mandatory before release/master status.


## V43 active continuity authority

This V43 continuity package is the exact verified successor to V42. It absorbs the **27 intentional V42-successor source changes** completed during the extended forensic audit and advances the protected runtime/cache identity to `1.2.0-v43-active-continuity` / `tcc-v1-v43-active-continuity-2026-09-03`. After the V43 guard verifies, V43 is the implementation authority; V42 and older packages are historical rollback/predecessor references only.

V43 also protects the large Vault screenshot storage architecture: ordinary app state remains transactional in localStorage, screenshot payload bytes use offline IndexedDB storage, and the single JSON Backup/Restore file must remain self-contained by materialising those screenshot bytes during export/restore. Do not regress screenshot bytes back into the ordinary localStorage state merely to simplify persistence.

The strict persisted-generation boundary remains deliberate: V41+ state/backups are strict; supported V35–V40 data retains explicit compatibility migration. The real 1024×768 iPad Safari/Home-Screen visual and interaction pass, including practical Vault IndexedDB testing, remains mandatory before release/master status.

## V44 iPad visual candidate authority

This V44 package is the exact verified successor to V43. It absorbs only the two post-V43 Safari export compatibility changes in `src_main.js` and `src_screens_settings.js`, then advances the runtime/cache identity to `1.2.0-v44-ipad-visual-candidate` / `tcc-v1-v44-ipad-visual-candidate-2026-09-03`. After the V44 guard verifies, V44 is the implementation authority; V43 and older packages are historical rollback/predecessor references only.

The V44 source/runtime audit is complete enough to begin Cameron's target-device acceptance pass. This does **not** make V44 a release/master or Gold Lock. The remaining mandatory gate is the real 1024×768 iPad Safari/Home-Screen visual/interaction pass plus practical Vault IndexedDB add/reopen/Backup/Restore/Recovery/delete validation. Any post-V44 change must remain evidence-backed and must not redesign, simplify, remove, recolour or weaken protected behaviour.



## V46 iPad colour-continuity correction candidate authority

V46 is the verified successor to V45 after the second real-iPad screenshot pass. It advances runtime/cache identity to `1.2.0-v46-ipad-colour-continuity` / `tcc-v1-v46-ipad-colour-continuity-2026-09-03` and fixes the remaining Add Expense / Add Reservation / Add Destination colour-follow-through regressions without changing canonical data or protected layouts.

- Add/Edit colour must follow the selected category/type from tile -> modal shell -> focus treatment -> action surface.
- Do not reintroduce a generic blue/sky editor fallback where a selected category/type has an established colour identity.
- Safari must not show native white Domestic / International flight-classification pills.
- Existing approved expanded-card colour continuity remains protected.
- V46 still requires target-iPad re-acceptance and practical Vault IndexedDB validation before release/master or Gold Lock.

## V45 iPad visual correction candidate authority

V45 is the verified successor to V44 after Cameron’s first real-iPad screenshot pass. It advances runtime/cache identity to `1.2.0-v45-ipad-visual-correction` / `tcc-v1-v45-ipad-visual-correction-2026-09-03` and absorbs the screenshot-evidenced corrections without changing the canonical data model or protected screen structure.

- Reservations main heading/accessibility name is **Booked Reservations**. Do not regress it to **Flights & Transport**.
- Historical reference screenshot colours are not palette authority. The whole-app rule is the authority: large information panels use Home-style deep navy/charcoal material with category/status colour carried through restrained glow, border, icon and feature surfaces rather than flat fully saturated slabs. Stronger colour remains appropriate for approved compact headline/stat widgets, His/Hers emphasis and Future Bookings / To Book.
- Vault category icons must use one consistent rendered icon language and inherit the parent category hue/material. Do not reintroduce intrinsically coloured emoji category art that fights the parent card.
- The no-current-stay shared header must never use obsolete composite artwork with baked Days Remaining / Time Zone / Travel Mode copy beneath live DOM content.
- V45 still requires target-iPad re-acceptance and practical Vault IndexedDB validation before release/master or Gold Lock.


## V47 iPad modal/interaction continuity authority — 03 Sep 2026

V47 succeeds V46 after the third real-iPad evidence pass. The following are now protected against regression:

- Expanded/detail modal shells must inherit the **actual rendered parent widget colour family**. Do not hard-code a second unrelated modal colour for an expandable card. The parent card’s rendered accent/border is the authority; any declared tone is fallback only.
- Reservation category focus/active treatment must stay in that category’s own colour family. Do not use a generic blue focus ring for Train, Cruise, RV, Accommodation or Tickets cards.
- The visible Reservations heading/accessibility name remains **Booked Reservations**. A newly activated service-worker generation must not leave an already-open iPad page executing stale prior-build modules; activation must take control and refresh controlled app windows after the new shell cache is ready.
- V47 is still a visual candidate, not Gold Locked or release/master approved, until Cameron completes the target-iPad re-test and Vault IndexedDB practical validation.


## V49 iPad full-screenshot repair authority — 03 Sep 2026

V49 succeeds the V47/V48 working line after Cameron asked for the **entire target-iPad screenshot set to be re-reviewed and rectified**, including the missing functional shortcuts. These are now protected rules:

- Home must always expose a recognisable **Travel Compass** interaction. On Home, the sidebar Travel Command Centre compass and the compact Home compass both open the same “Where’s the toilet?” language aid. The separate Vault concealed-email compass action remains gated by the exact unlock Vault → open Streaming → tap compass sequence.
- **Current Destination** is always a real control, never just decorative text. Active stay → offline Country Quick Look. No active stay → clear setup state with a route to Itinerary.
- “Where’s the toilet?” must never disappear merely because no stay is active. With an active stay it shows native phrase + simple English-style pronunciation + slow syllable breakdown, no IPA. Cruise/RV uses Starting Country for the whole trip.
- Expanded/detail widgets use one explicit audited parent colour family all the way through. A shared modal must not infer a different family from Safari/computed CSS when the card already has an established semantic tone.
- The cloned widget inside an expanded modal must also be rendered in that same family, eliminating a coloured outer shell around an unrelated navy/other-colour inner card.
- Add Expense, Add Reservation, Add Destination and Calendar Reminder/Note must carry the selected category/type tone from tile → shell → focus/selected treatment. Standard Destination is the indigo/violet family used by its selected tile.
- Reservations remains **Booked Reservations** and Next 5 Upcoming remains in its established rose/red family.
- Vault category drill-down/editor colour follows the originating category; Vault category icons remain one monochrome/currentColor SVG language. The live Vault status/action rail must fully conceal any obsolete status artwork beneath it.
- Local PIN fields may be visually masked but must not be presented to iPad Safari as website password fields that trigger Strong Password generation.
- App Health compact cards must keep status text readable without colliding with long card titles.
- The no-current-stay shared banner must remain free of obsolete Time Zone / Travel Mode / Days Remaining composite copy.
- V49 is still a target-iPad candidate, not Gold Locked or release/master approved.

## V50 deep no-loss continuity authority — 03 Sep 2026

V50 freezes the exact V49 screenshot-repair working source **and** the newly confirmed future work before country/language/audio/final-colour implementation continues. It is intentionally not a release/master. The next chat must preserve the distinction between **implemented current source** and **locked planned work**.

Protected V50 additions:
- screenshots are never implicit colour approval; final palette remains unconfirmed;
- global material consistency means equal perceived saturation/brightness/depth/contrast across hues;
- Home compass -> toilet helper; Home Current Destination header -> Country Quick Look;
- appealing/informative design for both helper screens;
- offline voice controls are required where target-iPad feasibility supports them, without online dependencies;
- country/language support must expand beyond the current 28-country checkpoint to all realistic countries Cameron & Kym may visit/add;
- plants/gardens remain slightly prominent in Country Quick Look;
- planned items remain active until source implementation + target-iPad proof, not merely documentation.
