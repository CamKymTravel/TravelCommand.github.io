# Travel Command Centre V1 — V53 Acceptance Matrix

This matrix closes the gap that allowed a hash-correct continuity package to preserve an already-regressed visual state. From V53 onward, **file identity alone is not acceptance**. The verifier protects both the source tree and the locked screen/interaction structure below.

## Global / iPad shell
- iPad landscape only; no horizontal scrolling at 1024 px.
- Left sidebar order: Home, Budget, Reservations, Itinerary, Calendar, Journey History, Checklist, The Vault, Settings.
- Sidebar and interactive controls use deterministic inline SVG icons, not Unicode/emoji glyphs.
- Sidebar says `Save button commits changes`; visible controls must work.
- Shared cards preserve their parent material/tone through expand → deeper editor.
- Current-stay shared banner uses the real Standard/Cruise/RV header and never substitutes Indonesia when no current stay exists.
- Country header scenes must remain recognisable with minimal cropping; screenshots are layout/defect evidence, not automatic colour authority.
- Service-worker update must prevent mixed-version `index.html` + stale JavaScript and must not reload over a busy dialog/file picker.

## Home
1. Current Destination hero with country/stay, dates, current-day progress and Days in current stay progress.
2. Next Destination is present and opens the exact itinerary stay.
3. Daily Budget, Destination Budget, Annual Position summary cards.
4. Upcoming Events, Alerts, Schengen Status, Trip Timeline compact panels.
5. Global search.
6. Current Destination opens Country Quick Look; Home compass opens Where’s the toilet? helper. Entry points remain distinct.
7. Quick Look keeps Plants & Gardens, Animals & Wildlife, Food & Drink, Culture & Local Context plus Practical Essentials.
8. Toilet helper keeps Play, Slow, Repeat ×3, Louder, Polite Extra and Signs to Look For; local-service voice only.

## Budget
1. Shared current-stay banner.
2. Current Destination Budget + Daily & Stay Pace.
3. Add Expense.
4. Annual Budget + Destination Budgets.
5. Budget by Category + Year Forecast & Budget Summary.
6. Living Expenses.
7. Reservations + Accounts.
8. Recent Expense Entries + Monthly Spend History.
9. Add Expense editor: numbered/clear category → amount → date → description hierarchy, strong selected state, Save commits, date automatically routes to the dated Destination Budget.
10. No obsolete Annual/Destination allocation picker.

## Reservations
1. Shared current-stay banner and `Booked Reservations` heading.
2. Six category dashboard tabs: Flights, Trains, Cruises, RV, Accommodation, Tickets & Attractions.
3. Add Reservation.
4. Future Bookings / To Book.
5. Upcoming.
6. Completed.
7. Reservation Health Check.
8. Right rail: Next 5 Upcoming + Total Booked.
9. Add Reservation editor keeps clear numbered/selected hierarchy and date-driven Destination Budget allocation.
10. `Flights & Transport` heading is retired.

## Itinerary
1. Forward Coverage.
2. Six compact approved planning stats: Countries Planned, Route Trips, Planned Stops, Unplanned Gaps, Missing Stays, Date Overlaps.
3. Add Destination / Add Home Visit.
4. Search and Travel Year filters.
5. Upcoming Itinerary.
6. Forward Journey map appears **after** the primary planning list, not ahead of Forward Coverage/stats.
7. Completed Itinerary.
8. No Intentional Gap concept.
9. Standard / Motorhome / Cruise selected-state tiles; Cruise/RV Starting Country retained.

## Calendar
1. Shared current-stay banner.
2. Month / Agenda views.
3. Previous / next month controls.
4. Destination / Standard / Motorhome / Cruise / Reservation / Personal legend.
5. Month grid and Agenda use canonical itinerary/reservation data plus personal notes/reminders.
6. Add Note uses deterministic SVG plus icon.

## Journey History
1. Hero.
2. Five summary widgets: Countries Visited, Destinations Completed, Days Travelled, Years on the Road, Lifetime Travel Spend.
3. Journey Map with year/type controls.
4. Lifetime Travel Spend + Journey Snapshot.
5. Milestones + Destination Totals + Travel Mix.
6. Search/filter controls and completed-stays table; no horizontal scroll.
7. Journey Check remains; no favourite-destination feature.

## Checklist
1. Hero.
2. Ready to Move.
3. His / Hers Needs & Wants.
4. Stage navigation.
5. Permanent Checklist + Destination Checklist.
6. Checklist Overview + Next Destination rail.
7. Checklist History.
8. Permanent completion remains scoped per move/destination.
9. Informational icon uses deterministic SVG.

## The Vault
1. Hero and locked/unlocked flow.
2. Five premium category cards: Passports, Visas, Insurance, Accommodation Details, Emergency Contacts.
3. No category emoji/font glyphs; deterministic SVG category art only.
4. Summary/expiry, Emergency Travel Card, Recent Activity and Streaming remain.
5. Multiple screenshot attachments use IndexedDB split storage and self-contained backup/restore.
6. Hidden email manager access remains exactly: unlock Vault → open Streaming → tap Travel Command Centre compass/logo.
7. Locking Vault hides concealed email state.

## Settings
1. Hero.
2. App Health.
3. Travel & Budget Defaults.
4. Manual / Offline Schengen Status.
5. Security / optional PIN.
6. Backup & Restore.
7. Application information.
8. Restore is destructive-confirmed and validated before current data replacement.

## Acceptance gates before packaging
- JavaScript ES-module parse: all modules.
- CSS structural validation: all CSS.
- Service-worker shell inventory: every runtime JS/CSS and required asset cached.
- Full migrated simulation-state canonical validation.
- Continuous 1,461-day sweep across 7 core screen view models = 10,227 successful builds.
- Source hierarchy/retired-feature/icon checks in `verify_regression_guard.py`.
- Package remains under 100 files.
- Generate baseline SHA-256 manifest **last**, then verify with no allow-list from the packaged tree and from a fresh extraction.
- Final visual/voice/Vault practical acceptance still requires the target iPad; do not call a candidate Gold/Master before that evidence.
