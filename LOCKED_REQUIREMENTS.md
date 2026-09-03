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
- Country Quick Look may be rich but compact: food/drink, animals, plants/gardens, cultural/quirky facts and history/local-interest snippets.
- Plants/gardens get a little extra prominence.
- Preserve Home compass shortcut for “Where’s the toilet?” language aid: native phrase, simple English-style pronunciation, slow syllable breakdown, no IPA.
- Standard stay uses current destination language. Cruise/RV uses departure/start destination language for the whole trip.

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
