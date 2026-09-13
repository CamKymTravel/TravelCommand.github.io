PROTOCOL = r'''
# TRAVEL COMMAND CENTRE — V56 R7.2 CONTINUITY & FULL BUILD PROTOCOL

Authority date: 08/09/2026
Owners: Cameron & Kym
Target: Apple iPad, landscape, Safari-installed offline PWA
Package role: authoritative continuity checkpoint and forward-only build baseline

## 0. ABSOLUTE RULE — ONE-WAY BASELINE

This package is a one-way baseline. Future work may move forward only. Previously approved structure, behaviour, names, calculations, interactions, headers, colour rules, offline rules, and data relationships must not change unless Cameron explicitly requests that exact change.

Do not treat an old build, old screenshot, old CSS block, old component, or old naming string as permission to restore legacy behaviour. Old material is evidence for structure/history only. If an old rule conflicts with this protocol or the current approved source, the old rule loses.

A defect fix is not permission to redesign neighbouring features. A colour fix is not permission to alter structure. A layout fix is not permission to change data rules. A new feature or requested simplification must preserve all unrelated locked behaviour.

If a change would regress one locked item, the build must not be packaged.

## 1. AUTHORITY ORDER

When sources disagree, use this order:

1. Cameron's newest explicit instruction.
2. This continuity/build protocol and release-contract.json.
3. The current sealed R7.2 source in this package.
4. Approved current-build screenshots for structure, hierarchy, spacing, interaction evidence and defect evidence.
5. Home as the primary visual/material authority for tone, brightness, saturation, depth, borders, glow and interaction polish.
6. Older/original-build screenshots only for structural/readability clues unless Cameron explicitly confirms a colour or treatment.

Never use old screenshots as colour authority by default.

## 2. BUILD SCOPE — VERSION 1

The app is Travel Command Centre, for Cameron & Kym, iPad landscape only.

Core operating model:
- Fully offline PWA installed from Safari / Add to Home Screen.
- No App Store, Apple Developer Program, subscription, API, online database or live integration.
- Manual local entry and local storage.
- Manual single-JSON backup/export and restore.
- Restore replaces current state only after confirmation.
- Optional PIN, off by default.
- Australian date format DD/MM/YYYY.
- Local currency first, AUD equivalent underneath where relevant.
- Two travellers by default.
- Save commits; closing/cancelling does not silently commit.
- Delete always requires confirmation.
- Tapping a saved editable row opens a prefilled editor only when the interaction contract says a row should edit.
- Empty lists say “No entries yet” or an equally explicit empty-state message.
- Global search is present and must open the exact saved record, including repeated-city records.
- Year filters support All Years across a scalable 30-year minimum horizon and extend beyond Year 30 when later data exists; multiple selection is allowed where implemented. Do not hard-code Year 1–4 as a maximum.
- Overnight-flight void days are accepted.
- No decorative dead buttons.

Main navigation order and labels:
1. Home
2. Itinerary
3. Budget
4. Reservations
5. Calendar
6. Journey History
7. Checklist
8. The Vault
9. Settings

Forbidden visible legacy names include Dashboard, Travel History, Travel Vault, Intentional Gap, and Flights & Transport.

## 3. GLOBAL VISUAL SYSTEM

Home is the visual authority.

Required material language:
- Deep navy/charcoal bases.
- Premium dark translucent material rather than flat coloured panels.
- Selective coloured borders, glow, icon accents, headings and feature surfaces.
- Strong contrast and large readable type for Kym.
- Restrained animation only; no distracting continuous motion.
- App Health dirty/unverified heartbeat is the deliberate motion exception; it stops and becomes green after verification.

### One widget = one colour family

Every widget owns one coherent feature-colour family. That family carries through:
- icon
- border
- heading/accent text
- restrained glow
- progress/ring/graph accent when it is a single-series visual
- expanded modal title and major surfaces

Do not create rainbow widgets. Do not mix unrelated blue, green, pink, orange and yellow inside one widget merely to make sub-values “interesting”. Status differences should normally be conveyed by wording, hierarchy, small badges, or a restrained semantic accent.

Permitted meaningful multi-colour exceptions:
- expense category chips/tiles may each have their own colour inside the light-blue Add Expense workflow
- reservation status pills may use small semantic status colours
- Itinerary/Calendar destination identity colours
- actual multi-series data visualisations
- Standard/Motorhome/Cruise map route lines

Expanded views inherit the parent widget's colour family. A blue widget must not open a purple/red/green expanded view.

Current 12 September colour locks:
- explicit Completed reservation, itinerary and checklist surfaces are neutral silver/slate, not green/teal status cards
- search fields/surfaces use neutral graphite/silver rather than blue/green/purple
- travel-mode identity remains Standard blue, Motorhome orange and Cruise violet
- colour variety is restrained; do not return to an app dominated by green, blue and purple washes

## 4. HEADER / HERO RULES

Headers are protected against regression.

General supplied-image rule:
- The country/trip scene must remain clearly recognisable.
- Prefer full-scene containment/minimal edge crop over zoomed-in cover crops.
- Do not stretch.
- Keep focal subjects visible.
- Information overlays must not cover most of the image.

Shared active-stay header applies to Itinerary, Budget, Reservations and Calendar. It may show current stay and next destination information as approved, but the image itself must remain visible.

Home differs:
- Home is fixed one-screen.
- Home does not contain a separate Next Destination card.
- Home does not contain a Journey Map.
- Current Destination remains immediately obvious with large destination information and recognisable country artwork.

Travel-mode header authority:
- Cruise uses the dedicated Princess cruise-ship header for the active duration.
- USA Motorhome uses the USA motorhome header.
- Europe/other Motorhome uses the Europe/other motorhome header.
- Standard stays use the destination country header.

Dedicated heroes remain for Journey History, Checklist, The Vault and Settings.

## 5. HOME — LOCKED COMMAND-CENTRE BEHAVIOUR

Home must remain a fixed iPad-landscape command-centre view and must not become a vertically scrolling dashboard.

Required operational surfaces include current destination, budget status, annual position, Schengen status, Alerts, Upcoming Events, Trip Timeline and Global Search as present in the approved current structure.

Forbidden Home surfaces:
- Home Journey Map
- separate Home Next Destination card
- legacy map-stage remnants

Interaction rules:
- Tapping the collapsed Alerts widget opens the complete Alerts expanded list. It must not jump straight into one alert.
- Tapping the collapsed Upcoming Events widget opens the complete Upcoming Events expanded list. It must not jump straight into one event.
- A subsequent tap on an item may open its exact source record.
- Vault alerts shown on Home must not reveal protected Vault title/owner/category/reference/notes while Vault is locked. Generic expiry warning + date is allowed; the internal exact target may be retained for post-unlock navigation.

Home compass/logo opens the Where’s the Toilet? phrase helper for the current destination country.
Home Current Destination header/banner opens Country Quick Look.
These are distinct entry points. They must not cross-link to each other; close and reopen from the intended Home entry point instead.

## 6. HOME HELPERS — ONE SCREEN, ALWAYS ESCAPABLE

Where’s the Toilet? and Country Quick Look / Destination Outlook are Home overlays, not separate app pages.

Both must:
- fit within one iPad landscape viewport
- have no vertical scrolling
- have a large permanently visible Close button
- close back to Home without restarting the app
- retain readable text rather than shrinking everything to tiny type

Phrase helper supports written offline help and, where an installed local iPad voice permits, Play, Slow, Repeat ×3 and Louder.

Country Quick Look remains concise and practical. It includes local language/currency/time context plus compact cultural/location information such as food, wildlife and flora. Plants/flowers/gardens receive slightly more prominence because Kym enjoys them.

## 7. ITINERARY

Itinerary is the planning authority for stay/trip dates and destination identity.

No “Intentional Gap” concept exists. No Intentional Gap button, record type, budget or workflow may return.

A genuine saved flight may cover an otherwise empty overnight transit date. That date is shown as **Flight Transit** and is not counted as an Unplanned Gap. A flight that is only “To Book” does not suppress the gap. Ordinary uncovered dates remain warnings.

Periods at home in Australia are normal Home/Australia stays with dates and their own Destination Budget.

### Add Destination

The Add Destination workflow is deliberately simple.

Top mode choices:
- Destination / Standard
- RV / Motorhome
- Cruise

Standard Destination fields only:
- Country
- City / Destination
- Start Date
- End Date
- optional planning note where provided

Do not show route-stop or latitude/longitude fields for Standard.

Motorhome and Cruise:
- trip start/end dates
- starting country / starting city as needed
- ordered route stops / ports
- optional planning note

Only Motorhome/Cruise need route stops. Route stops exist primarily for route/history recording and map continuity. New route stops must not force Kym to enter latitude/longitude. Existing coordinates may be retained silently when already present.

Motorhome/Cruise budgeting remains one budget for the full trip duration, not per route stop.

Route-trip country identity is the **Starting Country**. Converting a Standard stay into RV/Motorhome or Cruise must clear the obsolete hidden Standard `country` value so Home, Calendar, Journey Map, Journey History, Budget and Global Search cannot disagree about the trip country.

### Itinerary colours

Standard stays do not all share one colour. Each destination gets a stable destination identity colour. Rome has its colour, Paris another, etc. Repeated stays in the same destination retain that identity. The same destination identity must be used in Calendar.

The Itinerary presentation should use subtle destination colour accents, not fully saturated solid rainbow rows.

## 8. MAPS

Journey/route maps are offline and interactive.

Maps in Itinerary and Journey History must support:
- Zoom in
- Zoom out
- Reset
- pinch/wheel zoom where supported
- pan/drag where appropriate

Expanded map views retain zoom/pan.

Map routes distinguish:
- Standard / Flight
- Motorhome
- Cruise

Do not restore a Home Journey Map.

## 9. BUDGET

Budget must retain the visible top-level light-blue ADD EXPENSE bar. It must not be hidden inside Living Expenses or removed during layout/colour work.

Budget must not show a separate visible VERIFY BUDGET action. Canonical Budget integrity checking remains part of App Health and the underlying budget-health logic must remain intact.

Destination Budget:
- stay dates come from Itinerary and are not user-editable here
- local currency is inferred automatically from destination/trip context
- Kym must not manually choose the destination local currency
- setup should minimise input: budget amount + fixed exchange rate where needed
- exchange rate is set for the stay and remains fixed for that stay
- once Destination Budget expenses exist, the rate is locked to protect posted spending
- before that lock, correcting the stay rate must atomically recalculate linked reservations that were entered in the same local currency and whose AUD value was derived from that stay rate; manually entered cross-currency AUD equivalents are not silently overwritten
- local currency is primary; AUD equivalent below

Expense categories:
- Groceries
- Eating Out
- Transport
- Entertainment
- Shopping
- Miscellaneous

Routing:
- Groceries, Eating Out, Transport, Entertainment and Shopping always allocate to the Destination Budget covering the entered transaction date.
- Miscellaneous is the only category that may be allocated by the user to Destination Budget or Annual Budget.
- Kym selects category, date and enters local amount; background destination/rate/allocation should be inferred.
- Backdated and future expenses are allowed even when today is between stays.
- The entered transaction date, not “current destination”, controls routing.
- If no Destination Budget covers the entered date, show a large unmistakable warning and block silent routing.
- Expense mutation/core rules must enforce this, not just the UI.

Recent Expense Entries interaction:
- first tap on the collapsed widget expands the complete recent-expense list
- first tap must not open an expense editor
- only a second tap on a specific row in the expanded list edits that expense

Budget widgets follow one-colour-family rules. Category tiles inside Add Expense may have their own category colours, but the containing Add Expense workflow stays light blue/premium dark.

Annual Budget is AUD. Hotels, Airbnb and other major reservations may count to Annual Budget according to reservation rules even when not part of destination living spend. Legacy Accommodation records remain compatibility-only until edited.

## 10. RESERVATIONS / BOOKINGS

Sidebar label: Reservations.
Screen identity: Booked Reservations.

“Flights & Transport” is legacy leakage and must never return.

The Booked Reservations overview is exactly eight large tiles in a true 4×2 grid, in this order:
- Flights
- Trains
- Cruises
- RV / Motorhome
- Hotels
- Airbnb
- Tickets & Attractions
- Completed

Hotels and Airbnb are separate live booking categories. Legacy Accommodation records remain readable as Hotels compatibility data only until edited. Completed is the eighth/final history tile, not a live booking type.

Each record carries title, date/time, currency/AUD as relevant, status and notes.
Statuses include Paid / Unpaid / Booked / To Book as appropriate.

Future Bookings / To Book remains a clear high-priority planning surface, but use restrained semantic emphasis rather than recolouring an entire unrelated parent widget.

Upcoming sorts earliest first. Completed sorts by date/newest where appropriate. Past bookings automatically move to Completed. Overdue To Book remains actionable.

Duplicate reservations are blocked.

Reservation date routes the record to the Destination Budget covering that date when destination-budget allocation applies. No uncovered date is silently routed elsewhere.

## 11. CALENDAR

Month view is default; Agenda view remains available.
No external calendar sync.

Every destination has its own identity colour and the Calendar uses the same destination identity as Itinerary.

Calendar colour presentation must be subtle:
- use a restrained strip/tint/accent to show the duration/span of a stay
- do not fill the entire month with bright saturated blocks
- visual span must remain immediately readable

Busy days show the first compact dated items plus one clear +N more control. That control opens the complete Day View; it must not navigate to another screen or silently hide the remaining items.

Day interaction:
- tapping a compact coloured Calendar item opens that exact saved item directly
- tapping the date header or blank area of a day opens a complete Day View for that date
- tapping +N more opens the same complete Day View for that date
- Day View shows all travel periods, reservations, reminders and notes on that day
- Calendar stay/travel spans are thin coloured rails/strips in the correct date position, not large filled blocks
- Calendar event/period controls remain real touch targets where practical and must never be made pointer-inert

Agenda remains readable and destination-aware.

## 12. JOURNEY HISTORY

Name: Journey History.
One row per completed stay/trip with destination, dates, days, costs, average/day, distance and type information as approved.

Automatic history only includes completed stays/trips. Repeated destinations remain separate stay records but destination totals aggregate appropriately.

Journey Map is present and follows the shared zoom/pan rules.

Summary cards remain a strong approved medium/large-widget colour benchmark: differentiated widget colours, premium dark material, restrained glow, high contrast. Each card individually stays within one colour family.

No favourite-destination feature.
Journey Check remains.

Country identity canonicalisation applies to UK aliases: England, Scotland, Wales, Northern Ireland, Great Britain and United Kingdom are one UK country for planned/visited counts while entered stay labels remain intact.

## 13. CHECKLIST

Two list concepts remain:
- Permanent Checklist
- Destination Checklist

Manual stage switching remains as approved. Due dates and notes are supported.
Ready to Move and Next Destination/next-stage information remain immediately obvious.
Optional His/Hers items do not incorrectly block Ready to Move when they are optional.

Small/compact widgets should be expandable when enlargement materially helps Kym read them, even if the expanded view adds little new information. Expanded views should use the iPad landscape viewport fully and inherit the parent widget colour family.

## 14. THE VAULT

Vault remains protected local storage.

Locked presentation is deliberately minimal: one The Vault header with the physical vault-door artwork and one lower-screen “Access Denied” message. No lock instructions, protected-section previews, record counts, status cards or unlock hints may appear while locked.
Unlock requires three taps on the Vault header itself. With optional PIN disabled this opens the Vault immediately; with optional PIN enabled the existing PIN verification remains the second step.

Protected records must not leak through Home search or locked Home alerts.

Sections include Passports, Visas, Insurance, Accommodation Details and Emergency Contacts. Screenshots/attachments are local only; multiple screenshot attachments are supported. Owner information remains.

Unlocked Vault must retain the fuller operational dashboard approved on 12 September: Document Summary, Expiry Reminders, Emergency Travel Card, Emergency Contacts and Recent Activity. Do not collapse it back into a sparse locked-card layout.

Streaming/TV & Movies remains inside the unlocked Vault experience with large visual service tiles, but it is visually secondary to core travel documents and emergency information. Its container uses restrained graphite rather than a dominant purple wash.
Official offline brand artwork in this package is the approved visual asset set for supported streaming services.

Build 1 Vault screenshots are a local visual/content benchmark for hierarchy and information density only. They are not authority to revive the old sidebar order, old app-wide styling, or legacy behaviours.

Bank/account and streaming artwork must work offline; do not replace them with generic text initials when the packaged artwork exists.

## 15. ACCOUNTS

Accounts are a travel-money snapshot, not a banking integration.
No transfers and no live API access.
Balances are manually maintained/read-only as an operational snapshot.
Supported saved-account examples include Commonwealth, NAB, ANZ, ME Bank and Wise.
Use the packaged recognisable offline bank artwork.

## 16. SETTINGS / APP HEALTH / SCHENGEN

Settings retains Journey Start, backup/export/restore, optional PIN, currency/date defaults and App Health.
Do not restore an “Offline mode” switch.
Name is Cameron, not Kevin.

PIN:
- optional
- hashed/verified
- malformed values rejected atomically
- legacy PIN storage may be upgraded safely

App Health:
- deliberate incomplete setup is Needs Setup, not corruption
- failed/dirty/unverified state uses restrained heartbeat warning
- successful verification is green and still
- the current visual benchmark uses the stronger Build 1-inspired ambulance icon plus ECG/heartbeat pulse line, while retaining the current canonical 9-check logic and current screen structure
- Build 1 Settings screenshots are a local visual/content benchmark only; do not revive the old sidebar/order or obsolete controls
- App Health build marker must be bumped when a real packaged source change requires cache refresh

Schengen is manual. 90/180 calculations and date ordering must remain correct. Green/red or safe/not-safe status is allowed. Expanded Schengen presentation should be one coherent family; semantic danger can be a restrained status change rather than rainbow internals.

## 17. DATA RELATIONSHIPS / MUTATION BOUNDARIES

Important constraints must exist in mutation/core layers as well as UI.

Itinerary-owned stay dates cannot be silently changed from Budget.
Destination expenses and destination-routed reservations use the stay covering their entered date.
Annual-Budget Miscellaneous expenses must not block later itinerary changes merely because their date falls within a travel period.
Deleting or materially changing a stay must protect linked editable records such as expenses, reservations, destination checklist items and personal Calendar items.
Automatic/supplemental history metadata may be cleaned only after user-editable blockers are resolved.

Repeated cities are distinguished by exact record IDs and dated stay context. Search and deep links must not collapse two Rome stays into one generic destination.

## 18. SORTING / DATES / MONEY

Display dates: DD/MM/YYYY.
No raw ISO dates in normal user-facing UI.

Upcoming: earliest first.
Completed/history: newest/date order as approved per screen.

Local currency primary, AUD beneath.
Annual totals are AUD.
Fixed-rate stay conversion must remain internally consistent, including leap years and first/last stay days.

## 19. ACCESSIBILITY / IPAD GEOMETRY

Primary target geometry: iPad landscape, approximately 1180×820 CSS pixels.

Touch targets should be at least 44×44 CSS px. A smaller visible glyph is acceptable only if it has a verified 44×44 hit area.

No page-level horizontal scrolling.
Fixed sidebar remains usable and may scroll independently if safe-area/system UI reduces height.
Use safe-area insets with viewport-fit=cover.
Near-full-screen dialogs must remain inside safe areas.

Home is fixed one-screen. Other operational pages may scroll vertically as needed.

## 20. OFFLINE / PWA / CACHE RULES

Production/local state key: tcc:v1:state.
Continuity/prod packages use the production cache prefix tcc-v1-.
Simulation packages use a separate simulation cache prefix and separate storage key/app identity so they cannot delete or overwrite production data/cache.

When packaging changed source:
- bump the cache name/version
- cache current bytes with reload semantics, not stale HTTP-cache bytes
- verify every APP_SHELL file exists
- do not allow stale prior-version runtime markers to remain where they can control the new build

Manifest remains standalone landscape PWA with stable production id ./index.html.

## 21. SIMULATION WORKFLOW

Simulation is a test instrument, not the master.

Simulation packages:
- remain under 100 files
- use a separate storage key
- use a separate manifest identity
- use a separate cache prefix/name
- seed deliberately mixed state to expose busy/empty/incomplete/completed cases
- never overwrite production state

Do not promote a simulation to master merely because it looks correct. Fixes must be applied to the authoritative working source and pass gates.

## 22. HEADER / COLOUR SCREENSHOT AUTHORITY

Screenshots are strong evidence for:
- structure
- feature presence
- hierarchy
- spacing
- readability
- interaction defects
- cropping defects

Screenshots are not automatic colour authority. Home’s current premium material system is the colour authority unless Cameron explicitly confirms a colour from another screen/image.

## 23. FORBIDDEN REGRESSION CANARIES

The following are release-blocking if they reappear without explicit instruction:
- Dashboard visible label
- Travel History visible label
- Travel Vault visible label
- Flights & Transport heading
- Intentional Gap anywhere as a live concept
- Home Journey Map
- Home standalone Next Destination card
- missing Add Expense top-level bar
- Standard Add Destination route/coordinate fields
- Calendar item taps becoming pointer-inert or falling through to Day View
- Recent Expense collapsed widget first-tap straight to editor
- Home Alerts/Upcoming Events first-tap straight to individual record
- non-zoomable Journey maps
- scrolling Home helper overlays / missing Close button
- Vault unlock not requiring three door taps
- Vault protected identity leakage while locked
- headers reverting to heavy zoom/crop
- one widget expanding into an unrelated colour family
- multiple unrelated colours used decoratively inside one widget
- bank/streaming artwork silently replaced by generic placeholders

## 24. LEGACY CODE QUARANTINE

Do not leave old-build behaviour alive underneath newer overrides.

When an obsolete selector/component can still become active:
- remove it, or
- permanently gate it so it cannot render, and
- add a release canary for it.

Do not solve regression by adding endless later CSS that merely “wins today”. The final active cascade must be understandable and intentional.

Archived screenshots/old builds may be retained outside the runnable app for evidence, but legacy runtime code must not be copied back wholesale.

## 25. CHANGE PROTOCOL — EVERY EDIT

Before editing:
1. Start from the newest sealed continuity master only.
2. Read this full protocol and release-contract.json.
3. Identify the exact requested target and list unrelated locked surfaces that must not change.
4. Copy/branch the master; never edit the sealed package in place.

During editing:
5. Make the smallest forward change that satisfies the request.
6. Do not import old components to save time.
7. Enforce important rules in core/mutation layers, not UI alone.
8. Preserve exact record IDs and relationship integrity.
9. Keep colour changes separate from structural changes wherever practical.

After editing:
10. Search for forbidden legacy strings/surfaces.
11. Verify required structural signatures.
12. Run JS syntax + import graph checks.
13. Parse all CSS.
14. Validate header/index assets and offline shell.
15. Run schema/relationship/mutation tests.
16. Run interaction canaries.
17. Run colour-family canaries.
18. Render all nine screens at 1180×820.
19. Check no horizontal overflow, raw ISO dates, dead buttons or sub-44px active controls.
20. Render key expanded dialogs, not only collapsed screens.
21. Verify Home fixed-screen, helpers, Vault, Add Expense, Add Destination, Calendar day expansion and maps explicitly.
22. Only then bump cache/build identity and package.
23. Validate ZIP integrity and file-count limit.
24. For a user-facing simulation, require physical iPad screenshot/gesture review before promotion.
25. Create a new continuity master only when Cameron requests it.

## 26. MANDATORY RELEASE GATES

No simulation/release/continuity promotion if any mandatory gate fails.

Gate A — Package/static contract
- file count <=99 for current continuity/master convention
- required assets present
- forbidden legacy text/surfaces absent
- release-contract digest/seal valid

Gate B — Source integrity
- all JS syntax valid
- every relative JS import resolves
- all CSS parses
- no accidental literal serialization corruption such as escaped line-break text becoming selector prefixes

Gate C — Data integrity
- state schema validates
- backup/restore round-trip works
- tampered backup is rejected
- repeated-city routing works
- no-budget/overlap dates block correctly
- Annual Miscellaneous does not contaminate itinerary relationship checks

Gate D — Screen structure
- all nine navigation screens present in exact order
- locked actions such as Add Expense present and wired; no visible Budget Verify control
- legacy names absent
- Add Destination fields mode-correct

Gate E — Interaction
- Home list-first expansion
- Calendar direct item tap + date/blank-area Day View
- Recent Expenses list-first expansion
- exact-record second-step navigation
- Vault three-tap door unlock
- helper Close behaviour
- map zoom/pan/reset

Gate F — Visual/material
- headers recognisable
- Home fixed
- one-widget-one-colour-family
- Calendar subtle destination span colours
- Itinerary/Calendar colour identity match
- expanded widgets inherit parent family
- no unexplained rainbow panels

Gate G — iPad geometry
- 1180×820 rendered sweep
- no horizontal overflow
- touch target checks
- safe-area handling

Gate H — Offline/PWA
- complete service-worker shell
- correct cache namespace/version
- install/update path does not destroy production state
- offline relaunch gate on physical iPad before final release

## 27. PHYSICAL IPAD FINAL AUTHORITY

Container/browser tests cannot replace the final iPad Safari/PWA pass.

Before final production acceptance, Cameron should verify on the physical iPad:
- launch sequence feel: Travel Command icon → current country flag/name/city → Home, smooth and short
- launch always resolves to Home on a fresh app document; the Home shell must already be rendered underneath and no network/service-worker probe may block the sequence
- actual header crops/artwork
- real colour balance/brightness
- readability at normal viewing distance
- sidebar touch/scroll
- modal close/gesture behaviour
- map pinch/pan
- helper fit/Close
- three-tap Vault door
- install over older PWA
- service-worker update actually loads current build
- airplane/offline relaunch
- backup/export/restore using iPad file workflow

If the physical iPad reveals a defect, fix forward from the newest continuity master; never fall back to an old build.

## 28. CURRENT R7.2 CHECKPOINT — WHAT IS ALREADY IMPLEMENTED

This continuity package carries forward the current forward-only working source, including all earlier locked protections plus the September 6–8 continuation repairs.

Core/interaction continuity now includes:
- Home fixed one-screen; no Home Journey Map and no standalone Home Next Destination card
- recognisable country/header artwork with contain/minimal-crop authority where required
- Home compass → Where’s the Toilet? and Current Destination banner → Country Quick Look as distinct entry points with no helper-to-helper cross-link
- one-screen helper overlays with visible Close and no forced app restart
- Vault three-tap physical-door unlock and locked-data privacy
- unlocked Vault retains Document Summary, Expiry Reminders, Emergency Travel Card, Emergency Contacts and Recent Activity; Streaming remains secondary
- Settings App Health retains the stronger ambulance + heartbeat/pulse-line treatment while preserving the canonical current checks
- explicit Completed surfaces are neutral silver/slate and search surfaces are graphite/silver
- Add Expense visible as a top-level light-blue Budget action
- no visible Budget Verify action; canonical Budget health remains available through App Health
- Recent Expense collapsed-card first tap expands the list; row tap edits only from the expanded list
- Calendar coloured item/period taps open the exact item directly; date/blank area opens Day View
- Calendar event/period touch targets restored and pointer-inert legacy CSS removed
- sparse long-horizon year navigation skips empty six-year windows and jumps directly to the next/previous block containing actual Travel Years
- Calendar month cells no longer expose a parent button role around nested event buttons; the date header is the explicit VoiceOver/keyboard Day View control while blank-area taps still open the full day
- Journey History, Calendar, Budget year history, Checklist add, Vault lock and Itinerary year controls receive a targeted iPad readability/touch-size hardening pass without redesigning approved layouts
- PWA manifest release description now matches the current R7.2 continuity identity instead of the stale R6 checkpoint label
- shared offline maps support zoom/pan/reset; map gestures do not accidentally trigger card expansion
- Journey History map uses key labels collapsed and all labels + fit-to-route when enlarged
- Standard Add Destination remains simple; RV/Motorhome and Cruise alone retain ordered route stops
- route-trip Starting Country is the authoritative country and stale Standard-country identity is cleared on conversion
- route-country identity is consistent across Home, Itinerary, Budget, Reservations, Calendar, Journey Map and Global Search
- launch uses the shared country resolver instead of an independent country-code table
- S20 fresh-document launch is a short offline presentation layer: Travel Command icon → current country flag/name/city → reveal the already-rendered Home screen; it always starts on Home and never waits for network/service-worker work
- natural country aliases such as “The Bahamas”, “The Netherlands”, “The Philippines” and “The United Kingdom” resolve consistently
- supported destination outlines include Liechtenstein, Malta, Monaco and Singapore instead of generic fallback shapes
- Settings PIN digits are masked while retaining the numeric iPad keypad
- Accounts labels state AUD subtotal rather than implying conversion of other-currency balances
- Add Reservation remains a light-blue workflow; reservation type tiles retain their category accents
- Add Home Visit retains its violet workflow identity
- Quick Look/Phrase Helper and expanded Checklist destination artwork preserve recognisable source images
- fixed exchange-rate correction recalculates matching local-currency reservation AUD values before Destination Budget expenses lock the rate
- a saved flight on an otherwise uncovered transit date is represented as Flight Transit; To Book flights do not hide real gaps
- reservation budget routing is explicit for every live booking type: Flights, Trains, Cruises, RV/Motorhome, Hotels, Airbnb and Tickets & Attractions each offer Annual-only or exact-stay Destination Budget allocation; destination-scoped costs still roll into the annual travel total; legacy Accommodation is compatibility-only
- Annual Budget reservations may exist on uncovered transit dates and only keep a stay link when the booking date resolves unambiguously
- Budget’s read-only Reservations-for-this-stay panel shows every booking contextually linked to that exact stay, while Destination Budget spend counts only destination-allocated reservation costs
- one-widget-one-colour-family cleanup already applied across the audited Budget, Home, Checklist, Journey History, Vault and Settings surfaces; semantic red/green remains allowed where it conveys real status
- full production PWA shell, Apple touch icon, bank artwork, streaming artwork and packed header archive remain present
- all destructive user records continue to require confirmation through their UI pathways

## 29. CURRENT CONTINUITY STATUS / NEXT-CHAT AUDIT LIST

This R7.2 package is the **authoritative continuity checkpoint and working production master** for the next chat. It is not a declaration that every final visual/pixel issue has been permanently exhausted.

Continue forward only from this package. Do not restart, redesign, simplify, or copy old-build code back in.

Next audit priorities, in order:
1. Continue app-wide visual/colour-family audit, especially enlarged/drill-down internals, without changing approved structure.
2. Continue functional save/edit/delete/Undo tests on every screen and verify relationship integrity after cross-screen edits.
3. Continue Budget ledger audit, including reservation-vs-destination/annual allocation boundaries and repeated-stay date routing.
4. Continue Calendar month/agenda/date-boundary tests including overnight travel and month/year edges.
5. Continue Journey History calculations, repeated destinations, lifetime totals and map route continuity.
6. Continue Checklist Permanent/Destination switching, optional His/Hers readiness logic and completion-history preservation.
7. Continue Vault attachment persistence, backup/restore and locked-information leakage checks.
8. Continue Settings backup/export/restore/PIN/App Health workflows.
9. Run rendered 1180×820 iPad-landscape sweeps when the browser harness is available; do not claim a render pass when the environment blocks it.
10. Before a final user-facing release, perform the physical iPad Safari/PWA gate: install/update, launch sequence, header crops, map pinch/pan, modal touch targets, offline relaunch and backup/restore.

Do not create a simulation or another continuity master unless Cameron asks.

## 30. HANDOFF INSTRUCTION FOR A NEW CHAT

When this package is uploaded in a future chat, the correct instruction is:

“Continue from this V56 R7.2 continuity master. Read CONTINUITY_FULL_BUILD_PROTOCOL_AND_GUARD.py and release-contract.json first. Treat them and this sealed source as the one-way baseline. Do not use old-build code or screenshots as authority over the current build. Continue only forward, run the mandatory gates before packaging, and do not remove or redesign locked features unless I explicitly ask.”

'''


# ---- EXECUTABLE STATIC CONTINUITY GUARD ----
# This file intentionally combines human protocol + machine guard to keep the
# continuity package within the 99-file ceiling.

from pathlib import Path
import sys, json, re, hashlib

ROOT = Path(__file__).resolve().parent

def _req(cond, msg):
    if not cond:
        raise SystemExit('CONTINUITY GUARD FAILED: ' + msg)

def _sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def check(working=False):
    files = sorted(p for p in ROOT.iterdir() if p.is_file())
    _req(len(files) <= 101, f'file count {len(files)} exceeds 101')
    _req(not (ROOT/'simulation-fixture.json').exists(), 'continuity master contains simulation fixture')

    idx = (ROOT/'index.html').read_text()
    _req("mode:'production'" in idx, 'index is not production mode')
    _req("storageKey:'tcc:v1:state'" in idx, 'production storage key missing')
    _req("fixtureUrl:null" in idx and "seedIfEmpty:false" in idx, 'simulation seeding still active')
    _req('TCC Simulation' not in idx and 'Mixed-State Simulation' not in idx, 'simulation title remains')
    _req("await import('./src_main.js');" in idx, 'offline-first app import missing')
    _req('navigator.serviceWorker.register' not in idx, 'launch-time service-worker registration revived')
    main_source=(ROOT/'src_main.js').read_text()
    _req('runLaunchTransition' in main_source and 'forceLaunchHomeScreen' in main_source, 'S20 Home launch transition missing')
    _req("stateService.subscribe(render);\nrender();" in main_source and 'runLaunchTransition();' in main_source, 'Home must render before launch presentation runs')
    _req("document.documentElement.dataset.tccLaunchPhase = 'destination'" in main_source and "document.documentElement.dataset.tccLaunchPhase = 'done'" in main_source, 'launch icon-to-destination-to-Home phase sequence missing')
    _req('buildHomeViewModel' in main_source and 'countryFlagEmoji' in main_source, 'launch destination identity is not using shared current-country resolver')
    _req("dataset.tccLaunchIdentity = 'ready'" in main_source and 'data-tcc-launch-identity="ready"' in idx, 'launch identity-ready gate missing')
    _req('<div class="tcc-launch-flag"></div>' in idx and '<div class="tcc-launch-country"></div>' in idx and '<div class="tcc-launch-city"></div>' in idx, 'generic launch destination placeholder revived')
    _req('resetPrimaryViewportScroll' in main_source and 'queueMicrotask(resetPrimaryViewportScroll)' in main_source, 'screen navigation scroll reset missing')
    _req('S20 launch sequence authority' in idx and 'tcc-launch-destination' in idx and 'Opening Home' in idx, 'S20 launch visual layer missing')
    _req('__TCC_LAUNCH_FAILSAFE__' in idx, 'launch fail-safe missing')
    _req('startup-ipad-1024-landscape.png' in idx and 'startup-ipad-1194-landscape.png' in idx, 'iPad native launch images not linked')
    _req((ROOT/'startup-ipad-1024-landscape.png').exists() and (ROOT/'startup-ipad-1194-landscape.png').exists(), 'iPad native launch image files missing')

    manifest = json.loads((ROOT/'manifest.webmanifest').read_text())
    _req(manifest.get('name') == 'Travel Command Centre', 'manifest production name wrong')
    _req(manifest.get('id') == './index.html', 'manifest production id must be stable')
    _req('V56 R7.2 continuity master' in manifest.get('description',''), 'manifest release identity is stale')

    sw = (ROOT/'sw.js').read_text()
    _req("const CACHE_PREFIX = 'tcc-v1-'" in sw, 'production cache prefix missing')
    _req('tcc-sim-v1-' not in sw, 'simulation cache namespace remains')
    _req('simulation-fixture.json' not in sw, 'simulation fixture remains in shell')
    _req('CONTINUITY_FULL_BUILD_PROTOCOL_AND_GUARD.py' in sw, 'protocol not included in offline shell')
    _req('startup-ipad-1024-landscape.png' in sw and 'startup-ipad-1194-landscape.png' in sw, 'startup launch images missing from offline shell')
    _req("event.request.mode === 'navigate'" in sw and "cache.match('./index.html')" in sw, 'cache-only installed navigation missing')

    # Required packaged assets.
    bank = ['commonwealth','nab','anz','me','wise']
    stream = ['netflix','disney','prime','apple','max','paramount','stan','binge','kayo','youtube','afl','nfl','iview','sbs','seven','nine']
    for x in bank: _req((ROOT/f'brand-bank-{x}.png').exists(), f'missing bank artwork {x}')
    for x in stream: _req((ROOT/f'brand-stream-{x}.png').exists(), f'missing streaming artwork {x}')
    hi = json.loads((ROOT/'header-index.json').read_text())
    _req(len(hi) == 86, f'header index count {len(hi)} != 86')
    _req((ROOT/'header-assets.bin').exists(), 'header archive missing')

    # Legacy visible-string canaries scan runnable source only.
    active = '\n'.join(p.read_text(errors='ignore') for p in files if p.suffix in {'.js','.html','.css'} and p.name != Path(__file__).name)
    for legacy in ['Flights & Transport','Travel History','Travel Vault','Dashboard','Intentional Gap']:
        _req(legacy not in active, f'legacy text revived: {legacy}')

    calendar_css='\n'.join((ROOT/name).read_text(errors='ignore') for name in ['src_design_screens.css','src_design_reference-pass.css','src_design_finish-pass.css'])
    _req(not re.search(r'calendar-(?:event-chip|period-strip)[^{}]*\{[^{}]*pointer-events\s*:\s*none', calendar_css, re.I|re.S), 'Calendar items made pointer-inert again')
    reservation_source=(ROOT/'src_screens_reservations.js').read_text()
    reservation_css='\n'.join((ROOT/name).read_text(errors='ignore') for name in ['src_design_screens.css','src_design_reference-pass.css','src_design_finish-pass.css'])
    _req("node('h1', '', 'Booked Reservations')" in reservation_source, 'Booked Reservations heading regressed')
    reservation_vm=(ROOT/'src_core_reservations-view-model.js').read_text()
    _req("['hotel','Hotels']" in reservation_vm and "['airbnb','Airbnb']" in reservation_vm and 'reservation-tab-completed' in reservation_source, 'Hotels/Airbnb/Completed reservation tiles missing')
    _req('reservation-tab-hotel' in reservation_css and 'reservation-tab-airbnb' in reservation_css and 'reservation-tab-completed' in reservation_css, 'Reservations category colour identities missing')
    _req('grid-template-columns:repeat(4,minmax(0,1fr))' in reservation_css.replace(' ',''), 'Reservations 4-column tile authority missing')
    _req('data-tap-progress' not in active, 'covert Vault tap-progress channel revived')
    vault_css='\n'.join((ROOT/name).read_text(errors='ignore') for name in ['src_design_reference-pass.css','src_design_finish-pass.css'])
    vault_screen=(ROOT/'src_screens_vault.js').read_text()
    _req('vault-lock-tap-target' not in vault_screen, 'obsolete visible/hidden Vault door tap target revived')
    _req('vault-locked-reference-hero' in vault_screen and "node('strong','','Access Denied')" in vault_screen, 'minimal locked Vault header / Access Denied contract missing')
    _req('auto 108%' not in reservation_css and 'auto 108%' not in calendar_css, 'sharp header 108% zoom revived')
    _req('height:calc(100dvh - 22px' not in idx, 'expanded modal full-height blank-canvas override revived')
    _req('min-height:calc(100% - 4px)' not in idx, 'expanded snapshot stretch override revived')
    _req('height:auto!important' in idx and 'min-height:0!important; align-self:start' in idx, 'content-driven expanded modal guard missing')
    _req("1.2.0-v56-r7.2-continuity" in (ROOT/'src_core_schema.js').read_text(), 'R7.2 app version missing')
    _req("tcc-v1-v56-r7.2-forward-continuity-regression-2026-09-13-s24" in sw, 'current hardened cache identity missing')
    runtime_config=(ROOT/'src_core_runtime-config.js').read_text()
    _req("serviceWorkerUrl:'./sw.js?v=56-r7.2-forward-continuity-regression-2026-09-13-s24'" in runtime_config, 'runtime-config fallback service-worker identity is stale')
    _req("serviceWorkerUrl:'./sw.js?v=56-r7.2-forward-continuity-regression-2026-09-13-s24'" in idx, 'index service-worker identity is stale')
    _req("v56-r7.2-forward-continuity-regression-2026-09-13-s24" in main_source, 'App Health build identity is stale')
    _req('protectVaultForBackground' in main_source and 'data-tcc-vault-privacy-lock' in main_source and "window.addEventListener('pagehide', protectVaultForBackground)" in main_source, 'Vault background privacy lock is missing')
    _req('R7.2 Vault background privacy shield.' in (ROOT/'src_design_finish-pass.css').read_text(), 'Vault background privacy shield styling is missing')
    finish_css=(ROOT/'src_design_finish-pass.css').read_text()
    page_hero_source=(ROOT/'src_components_page-hero.js').read_text()
    calendar_screen=(ROOT/'src_screens_calendar.js').read_text()
    itinerary_screen=(ROOT/'src_screens_itinerary.js').read_text()
    _req('S13 global header-image fit authority' in finish_css, 'global country-header cover/focal authority missing')
    _req("createStayBanner({ currentStay:homeModel.currentStay, nextDestination:homeModel.nextDestination, navigate, className:'calendar-stay-banner' })" in calendar_screen, 'Calendar shared active-stay header missing')
    _req('[data-screen="calendar"] .tcc-stay-banner[data-header-fit="cover"]::after' in finish_css, 'Calendar country-header cover/focal CSS missing')
    _req("let fieldsValue = resolveParentDraft(formValues(body, editorFields));" in itinerary_screen, 'Itinerary save must preserve manually mapped parent coordinates')
    _req('HEADER_FOCAL_POINTS' in page_hero_source and "['banner-japan','center 58%']" in page_hero_source, 'country header focal map / Japan focal lock missing')
    _req('S14 Next 5 expanded-view closure' in finish_css and 'reservation-next-five-expanded-modal' in finish_css, 'Next 5 five-row modal containment lock missing')
    _req('APP HEALTH MEDICAL BENCHMARK LOCK' in idx and 'settings-health-ambulance' in idx and 'settings-health-pulse-line path' in idx, 'App Health medical/ECG benchmark lock missing from production index')
    _req('background:linear-gradient(180deg,#c8f1ff 0%,#9fe3f8 54%,#86d4ef 100%) !important' in finish_css, 'pale-sky Add action colour authority missing')
    _req('budget-pace-ring-green' in finish_css and 'budget-pace-ring-amber' in finish_css and 'budget-pace-ring-red' in finish_css, 'Stay Pace traffic-light ring authority missing')
    contract_current=json.loads((ROOT/'release-contract.json').read_text())
    expected_cache='tcc-v1-v56-r7.2-forward-continuity-regression-2026-09-13-s24'
    expected_marker='v56-r7.2-forward-continuity-regression-2026-09-13-s24'
    _req(contract_current.get('package',{}).get('cacheName')==expected_cache, 'release contract package cache identity is stale')
    _req(contract_current.get('package',{}).get('buildMarker')==expected_marker, 'release contract package build marker is stale')
    _req(contract_current.get('runtimeIdentity',{}).get('cacheName')==expected_cache, 'release contract runtime cache identity is stale')
    _req(contract_current.get('runtimeIdentity',{}).get('buildMarker')==expected_marker, 'release contract runtime build marker is stale')

    # Required forward signatures.
    sigs = {
      'src_screens_reservations.js':['Booked Reservations','reservation-tab-completed','reservation-list-controls','reservation-allocation-tile','ANNUAL BUDGET COST','This booking is using Annual Budget only.','this still rolls into the annual total.'],
      'src_core_reservations-view-model.js':["['hotel','Hotels']","['airbnb','Airbnb']",'allCompleted','completedCount'],
      'src_core_reservation-mutations.js':['annualReservationAUD','audAmountManual','budgetScope','Annual reservations may legitimately sit on an uncovered transit day'],
      'src_core_budget-ledger.js':["=== 'destination'","record.status !== 'to-book'"],
      'src_core_budget-view-model.js':['The Budget Reservations panel is a read-only view of bookings linked to','record.itineraryId === stay.id','budgetScope:record.budgetScope'],
      'src_screens_budget.js':['budget-add-expense-bar','ADD EXPENSE','Recent Expense Entries','AUD subtotal','function displayCountryForStay','displayCountryForStay(entry)','Budget allocation'],
      'src_components_offline-map.js':['Zoom map in','Zoom map out','Reset map zoom and position','expandIgnore','onMapTap','renderedMapRect','multiTouchGesture'],
      'src_screens_vault.js':['vault-locked-reference-hero','Access Denied','vault-hero-streaming'],
      'src_screens_home.js':['home-reference-hero','HOME_EXPANDED_PAGE_SIZE=20','model.alerts.slice(0,3)','model.upcomingEvents.slice(0,3)','homeExpandedPagedList'],
      'src_screens_calendar.js':['calendar-day-open',"day.setAttribute('role', 'group')",'clickEvent.stopPropagation()','calendar-more-button','calendar-period-rail','calendar-day-detail-modal'],
      'src_screens_settings.js':["inputField(label,name,'password'"],
      'src_core_entities.js':["'the bahamas':'bahamas'","country: routeTrip ? '' : country"],
      'src_core_coordinates.js':["['dolomites','Dolomites'","'Dolomites':'Italy'","['black forest','Black Forest'","'Black Forest':'Germany'"],
      'src_core_itinerary-view-model.js':['flight-transit','bookedFlightDates','country:displayCountryForEntry(entry)',"const sources=route ? [entry.startCountry||entry.country||''] : countryParts;","const sources=(route ? [entry.startCountry||entry.country||''] : countryParts).filter(Boolean);",'travelYearLabel','minimum:30'],
      'src_core_itinerary-mutations.js':['recalculateAutoConvertedReservationsForStay','audAmountManual','deriveAUDForStay','resolveItineraryMapLocation','resolveOfflinePlace','on the offline map before saving','allowRoutePointRemoval'],
      'src_core_journey-map-model.js':['entry.startCountry || entry.country','minimum: 30'],
      'src_screens_journey-history.js':["labelMode:expanded?'all':'key'",'Previous Years','Next Years','travel-year-selection-summary','travelYearLabel'],
      'src_screens_itinerary.js':['Move Up','Move Down','Place Map Point','Adjust Map Point','Place Map Location','Adjust Map Location','hasMapCoordinates','resolveOfflinePlace','Remove route point?','Previous Years','Next Years','travel-year-selection-summary','ITINERARY_LIST_PAGE_SIZE = 20','itineraryPagedList','Math.floor(upcomingIndex/ITINERARY_LIST_PAGE_SIZE)+1','Math.floor(completedIndex/ITINERARY_LIST_PAGE_SIZE)+1'],
      'src_core_migrations.js':["resolveOfflinePlace(record.travelType === 'standard' ? record.name : record.startCity)",'resolveOfflinePlace(next.name)','else { next.lat=null; next.long=null; }'],
      'src_core_planning.js':['travelYearsForRange','minimum = 30','entry.endDate','pairs.length === 1 ? pairs[0] : []'],
      'src_core_year-filters.js':['buildTravelYearBrowser','windowSize = 6','formatTravelYearSelectionSummary','const previousYear=','const nextYear='],
      'src_core_journey-history-view-model.js':['travelYearsForRange','travelYearLabel','minimum:30','livingCostAUD','totalCostAUD','allInCostPerDayAUD','transitArrivalStayId','routeCountriesForEntry','Journey age is a continuous clock from Journey Start'],
      'src_design_finish-pass.css':['itinerary-route-order','itinerary-route-map-button','itinerary-route-picker-map','min-height:44px !important','itinerary-year-nav','journey-year-nav','home-expanded-page-button','home-expanded-page-status','R7.2 accessibility/readability hardening'],
      'src_core_home-view-model.js':['buildHomeAlerts','buildUpcomingEvents','searchCanonicalState','annualBudgetForYear'],
      'src_core_budget.js':['annualBudgetForYear','setAnnualBudgetForYear','budgetPeriodForYear','budgetPeriodMetrics'],
      'src_core_schema.js':['annualBudgetsAUD: {}'],
      'src_core_validation.js':['Annual Budgets by year must be an object'],
      'src_core_settings-mutations.js':['annualBudgetYear','setAnnualBudgetForYear'],
      'src_core_app-health.js':['export function buildBudgetHealth(state,currentDate=null) { return budgetCheck(state,currentDate); }','annualBudgetForYear'],
      'src_core_storage.js':['TCCZ1:','encodeStoredState','decodeStoredState','checksumBytes','const storedValue=encodeStoredState(serialized)'],
      'src_main.js':['forceLaunchHomeScreen();','stateService.subscribe(render);','render();','runLaunchTransition();','The complete cached Home screen is already rendered underneath the launch'],
      'src_components_page-hero.js':['const currentCountry=flagCountryForStay(currentStay)'],
    }
    budget_screen=(ROOT/'src_screens_budget.js').read_text()
    _req('budget-verify-bar' not in budget_screen and 'VERIFY BUDGET' not in budget_screen, 'superseded visible Budget Verify control revived')
    calendar_screen=(ROOT/'src_screens_calendar.js').read_text()
    _req('calendar-more-button' in calendar_screen and 'calendar-period-rail' in calendar_screen and 'calendar-day-detail-modal' in calendar_screen, 'current Calendar compact +N/day-detail/period-rail contract missing')
    _req('vault-lock-sections' not in vault_screen, 'obsolete locked Vault protected-section preview revived')
    _req(all(x in vault_screen for x in ['vault-summary-card','Emergency Travel Card','Emergency Contacts','Recent Activity']), 'fuller unlocked Vault dashboard regressed')
    settings_screen=(ROOT/'src_screens_settings.js').read_text()
    _req('settings-health-ambulance' in settings_screen and 'settings-health-pulse-line' in settings_screen and 'CHECK THE WHOLE APP' in settings_screen, 'Build 1-inspired App Health ambulance/pulse treatment regressed')
    _req('12 Sep 2026 — screenshot-led visual correction pass.' in (ROOT/'src_design_finish-pass.css').read_text(), '12 Sep screenshot-led visual correction pass missing')
    _req('S21 visual-confidence polish' in (ROOT/'src_design_finish-pass.css').read_text(), 'S21 final target-iPad visual polish missing')
    _req('future commitments included' in budget_screen, 'S21 compact Budget commitment copy missing')
    _req('booking overdue' in (ROOT/'src_core_home-alerts.js').read_text() and '· to book ·' in (ROOT/'src_core_home-alerts.js').read_text(), 'S21 concise Home To Book alert copy missing')
    _req('S22 last-mile visual closure' in finish_css and 'S22 Journey analytics comfort width' in finish_css, 'S22 final iPad visual closure missing')
    _req('Intl Flights' in (ROOT/'src_screens_journey-history.js').read_text(), 'S22 compact Journey booking label missing')
    _req('done · ${items.length-completed} pending' in (ROOT/'src_screens_checklist.js').read_text(), 'S22 compact Checklist owner summary copy missing')
    _req('S23 header-system + locked-Vault + App Health closure' in finish_css and 'S23 header border final authority' in finish_css, 'S23 header/Vault/App Health visual closure missing')
    _req('tcc-health-ecg-pulse' in finish_css and 'tcc-health-ambulance-sweep' in finish_css, 'S23 working App Health pulse/ambulance motion missing')
    _req('vault-screen-locked' in finish_css and 'vault-access-denied' in finish_css, 'S23 minimal locked Vault styling missing')
    _req('S24 controlled visual lift.' in finish_css and '.settings-health-card.settings-health-card-verified' in finish_css and '.sidebar .nav-button[data-active="true"]' in finish_css, 'S24 controlled colour/finish lift missing')
    home_screen=(ROOT/'src_screens_home.js').read_text()
    _req('home-helper-switch' not in home_screen and 'OPEN PHRASE HELPER' not in home_screen, 'forbidden Quick Look/Phrase Helper cross-link pathway revived')
    _req('home-expanded-alert-open' not in home_screen, 'expanded Alerts cross-screen Open control revived')
    _req('home-expanded-traffic-light' in home_screen and 'home-expanded-alert-remove' in home_screen, 'traffic-light Remove-only Alerts contract missing')
    _req("`AUD ${formatMoney(aud,'AUD')}`" in home_screen, 'Home local-first money no longer labels the secondary AUD amount clearly')
    itinerary_screen=(ROOT/'src_screens_itinerary.js').read_text()
    _req("secondary:`AUD ${formatMoney(aud,'AUD')}`" in itinerary_screen, 'Itinerary local-first budget no longer labels secondary AUD clearly')
    reservation_screen=(ROOT/'src_screens_reservations.js').read_text()
    _req('reservation-aud-secondary' in reservation_screen and "`AUD ${formatMoney(record.audAmount, 'AUD')}`" in reservation_screen, 'Reservation local/original money no longer labels secondary AUD clearly')
    _req('Matched automatically from the ticket date.' not in reservation_screen and 'Matched automatically from the reservation date.' in reservation_screen, 'Reservation Destination Budget routing copy regressed to ticket-only wording')
    _req("= AUD ${formatMoney(converted, 'AUD')}" in reservation_screen, 'Reservation automatic conversion no longer labels the AUD equivalent explicitly')
    _req('Normal living expenses use the Destination Budget selected by the transaction date.' not in budget_screen, 'redundant Add Expense tutorial slab revived')
    _req('amountGrid.append(amountField,lockedCurrency,automaticConversion)' in budget_screen and "inputField('Description (optional)', 'description'" in budget_screen, 'compact Add Expense money/description layout regressed')
    home_vm=(ROOT/'src_core_home-view-model.js').read_text()
    _req("node('button','vault-streaming-card')" not in vault_screen and 'node("button","vault-streaming-card")' not in vault_screen, 'duplicate bottom Vault Streaming card revived')
    finish_css=(ROOT/'src_design_finish-pass.css').read_text()
    _req('touch-action:manipulation !important' in finish_css and '-webkit-tap-highlight-color:transparent !important' in finish_css, 'Vault covert multi-tap zoom suppression missing')
    _req('AUD clarity + density + colour closure.' in finish_css and 'min-height:0 !important' in finish_css, 'AUD/density/colour closure styling missing')
    _req('Add Expense physical-iPad fit refinement.' in finish_css and '.budget-form-error:empty { display:none !important; }' in finish_css, 'Add Expense no-scroll iPad fit styling missing')
    _req('buildJourneyMapModel' not in home_vm and 'journeyMap:' not in home_vm, 'forbidden Home Journey Map model revived')
    _req('minimum:4' not in (ROOT/'src_core_itinerary-view-model.js').read_text(), 'Itinerary revived four-year minimum')
    _req('minimum:4' not in (ROOT/'src_core_journey-history-view-model.js').read_text(), 'Journey History revived four-year minimum')
    _req('minimum: 4' not in (ROOT/'src_core_journey-map-model.js').read_text(), 'Journey Map revived four-year minimum')
    for fn, needles in sigs.items():
        txt=(ROOT/fn).read_text()
        for n in needles: _req(n in txt, f'missing required signature {fn}: {n}')

    # Offline shell must cover all top-level files except sw itself (which is the worker source).
    shell=set(re.findall(r"'\./([^']+)'", sw.split('];',1)[0]))
    required={p.name for p in files if p.name != 'sw.js'}
    missing=sorted(required-shell)
    _req(not missing, 'offline shell missing: ' + ', '.join(missing))

    # Seal and contract integrity. Working mode validates the intentionally
    # modified source before a user-requested promotion; sealed mode validates
    # the final continuity package against release-contract.json.
    sealed={}
    if not working:
        c=json.loads((ROOT/'release-contract.json').read_text())
        digest=c.get('contractDigest',{}).get('value')
        stripped=dict(c); stripped.pop('contractDigest',None)
        body=json.dumps(stripped,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()
        _req(digest == hashlib.sha256(body).hexdigest(), 'release-contract digest mismatch')
        sealed=c.get('baselineSeal',{}).get('files',{})
        for name,h in sealed.items():
            _req((ROOT/name).exists(), f'sealed file missing: {name}')
            _req(_sha(ROOT/name)==h, f'sealed file changed: {name}')

    print(json.dumps({
      'status':'PASS',
      'files':len(files),
      'headers':len(hi),
      'bankIcons':len(bank),
      'streamingIcons':len(stream),
      'sealedFiles':len(sealed),
      'mode':'production-continuity-working' if working else 'production-continuity-sealed',
      'protocol':'embedded in this guard file'
    }, indent=2))

if __name__ == '__main__':
    if '--print-protocol' in sys.argv:
        print(PROTOCOL)
    else:
        check(working='--working' in sys.argv)
