# V55 Screenshot Audit Lock — 4 September 2026

This document captures the latest screenshot review and conversation decisions. It is a protected implementation brief. Nothing here may be omitted during continuation.

## Global visual + interaction rules
- Add useful colour across the whole app using the premium Home-screen dark-material language: deep navy/charcoal foundations with selective colour tint, glow, border, icon and highlight — not flat saturated slabs.
- Use a broad palette where useful. Do not artificially restrict the app to four colours.
- Parent→child colour continuity is mandatory. If a card/widget is red, every deeper expansion/detail/editor reached from that coloured context should remain recognisably red; blue→blue, teal→teal, purple→purple, orange→orange, etc. Do not fall back to generic purple/blue deep screens.
- For generic **Add** flows, prefer a stable calm baby-blue/command-blue shell so Kym always recognises “I am adding something”; selected category/type gets its own strong colour inside the flow. Edit/detail flows may inherit the source item/type colour where useful.
- Expanded views must justify themselves. Do not enlarge a widget merely to repeat the same number. Expansion should provide useful list/detail/trend/context, or the widget should not expand.
- Main operational information must be immediately obvious, large and easy to read for Kym wearing glasses. Secondary/history/analysis information can be deeper.
- Increase graph presence. Use restrained semi-animation (gentle load/progress/bar movement, soft transitions, pulse only for status/attention) rather than constant motion. Avoid gimmicky animation.
- Every add/edit path must make the primary action unmistakable and easy. Quick-add should be available inside relevant expanded widgets when that is the natural place to add data.
- All visible buttons must work. Expand icons must either open useful content or be removed.

## Launch / branding / compass
- Restore the Travel Command Centre compass/logo in the sidebar/menu where it is currently missing.
- Add a proper offline launch sequence: black screen → centred compass/logo for a deliberate short period → large current-country flag + current destination city/country → enter app.
- Keep it elegant and readable, not a long delay.
- Current destination launch must derive from app state, not hard-coded Athens.

## Home / headers / quick-look
- Home remains the visual/material authority.
- Country/header images must show a recognisable scene with minimal crop/zoom. Do not over-zoom.
- Cruise uses supplied Princess ship header; motorhome uses correct dedicated motorhome header.
- Home compass/logo entry and Current Destination entry remain distinct: compass opens the destination “Where’s the toilet?” phrase helper; Current Destination banner opens Country Quick Look.
- Country Quick Look is compact and useful: flora/plants get extra prominence; wildlife, local food, concise cultural context. Do not include useless live/current-status content because app is offline.

## Budget
- Preserve the current Budget structure and restore/retain graph richness. Do not regress to a stripped layout.
- Add Expense must be extremely clear and readable. Transaction date is the routing source of truth; it automatically selects the exact Destination Budget covering that date. Same cost rolls into Annual Budget totals once; do not double count.
- If no Destination Budget covers the chosen date, show a large unmistakable warning and do not silently route elsewhere.
- Add Expense categories retain clear differentiated selection colours while the generic Add shell remains stable/calm.
- Accounts expanded view must contain clear quick add/edit for Australian bank accounts; account management has to actually work.
- Re-check Annual Budget add/edit path; Cameron suspected adding annual budget may not have been working.
- Recent Expense Entries expansion must show useful details, not just repeat rows. Monthly Spend History is a good example of an expanded analytical view and should retain useful year controls, bars, totals and targets.
- Budget calculations, fixed stay exchange rate, local→AUD display and date matching must all be audited after UI work.

## Reservations
- The six booking category cards (Flights, Trains, Cruises, RV, Accommodation, Tickets & Attractions) **must be tappable/expandable**.
- Each category expansion must show all bookings in that category with practical details, status, dates, destination, original currency and AUD as appropriate. Do not open an empty shell.
- Next 5 Upcoming, Total Booked, Future Bookings / To Book and Upcoming expansions should remain useful and preserve their source colours.
- Future Bookings / To Book remains a prominent yellow/gold panel.
- Add/Edit Reservation must be highly readable and the selected reservation type must be unmistakable. Generic Add shell should not completely recolour for every type; type tile/accent should carry the category identity.
- Reservation date automatically matches Destination Budget; no duplicate/incorrect annual rollup.

## Itinerary
- **Forward Planning Map / Where We’re Going must be moved to the top** of the Itinerary content, before Forward Coverage / stat widgets / itinerary list, because map is the primary planning orientation.
- The six compact stats (Countries Planned, Route Trips, Planned Stops, Unplanned Gaps, Missing Stays, Date Overlaps) may expand only when they provide real value.
- Current expansions for Countries Planned / Route Trips / Planned Stops are defective because they repeat only the headline number. Fix them to show actual future content:
  - Countries Planned: full unique future-country list (Cameron referred to 29 countries; derive the actual current count from itinerary state, never hard-code 29).
  - Route Trips: all future motorhome/cruise route trips with dates and route-point counts.
  - Planned Stops: all future planned destination/route stops with useful date/trip context.
  - Missing Stays / overlaps / gaps should show the actual offending date ranges/items when non-zero.
- Add Destination shell should stay calm/consistent; Standard/Motorhome/Cruise selection carries type colour. Motorhome and Cruise expose Route Points and Add Route Point.
- Editing an existing Standard destination must not suddenly inherit an unrelated destination/card colour (e.g. Budapest green) unless that context is intentionally the source colour. Standard edit should remain consistent command/edit treatment.
- Completed Itinerary remains collapsible; no regression to route logic or budgets.

## Calendar
- Remove repetitive destination-name chips on every single day of a stay. Show destination/travel period as a cleaner span/strip treatment while keeping the month readable.
- Reminder/Note events must be tappable and open useful details/editing.
- Anything that appears interactive in the calendar must actually open/edit.
- Keep destination colour coding and reservation/journey colour cues without making the month visually noisy.
- Add Reminder / Note must remain simple, large and clear.

## Journey History
- Map and summary statistics remain rich; preserve year/type filters.
- Top five headline widgets are an approved premium colour benchmark.
- Countries Visited and Destinations Completed expansions cannot be empty headline repeats. They should show the actual countries/destinations and useful context if expandable.
- Completed Stays & Trips row tap should **not** open a giant Edit Destination form. It should open a compact read-only stay summary / inline detail: destination, dates, travel type, days, total cost, average/day, kilometres, category/spend breakdown where available, and brief history/context. Large modal only if the extra information genuinely warrants it.
- If a full-screen detail is used, it needs substantially better information architecture than the current Edit Destination-style modal.
- Journey Map expansion is useful; Lifetime Travel Spend, Journey Snapshot, Milestones, Destination Totals and Travel Mix should retain their distinct source colours and provide richer information when expanded.
- Destination Totals expansion should show more than only the top three if data exists; provide useful scroll/list or filters.
- Reintroduce useful charting where analytical panels have become too text-only.

## Checklist
- His / Hers Needs & Wants, Permanent Checklist and Destination Checklist need obvious **Add** capability in their expanded views.
- Quick add must be visible and easy to understand; do not force Kym to hunt for an add route.
- Destination Checklist screenshot shows the desired direction: expanded list + prominent `+`, and Add Checklist Item modal with Permanent/Destination choice, item, stage, owner, due date, Ready-to-Move required toggle and notes.
- Ensure His/Hers optional items can be added, edited, completed and persist correctly.
- Permanent and destination tasks must stay distinct and stage logic must work.
- Ready to Move state must be driven only by required tasks; optional His/Hers items must not block it.

## The Vault
- Locked opening state should be effectively a dark/black concealed screen; do not expose protected categories/content before unlock.
- Restore the approved **three-tap Vault unlock** interaction. Do not replace it with a conspicuous ordinary Unlock button as the default experience.
- Once unlocked, content appears.
- Hidden email manager remains accessible only by exact sequence: unlock Vault → open Streaming → tap Travel Command Centre compass/logo. It must not appear while locked or merely from Vault main screen.
- The five top Vault category cards (Passports, Visas, Insurance, Accommodation Details, Emergency Contacts) need to be visually harmonised with the current Home/material system. They currently look like older-build carryover.
- Streaming is missing official/service logos. Restore locally stored recognisable logos/marks for popular stored services/sports platforms (e.g. Netflix, AFL, NFL services as supported in the app’s approved streaming list), respecting offline packaging. No live integrations.
- Vault documents/screenshots are local-only. Multiple screenshot attachments supported. Owner field retained.

## Settings / App Health
- App Health is a core operational confidence control.
- After **any mutation** (add/edit/delete expense, reservation, destination, checklist item, account, settings, vault data, reminder/note, etc.), App Health must become dirty/attention state: red and gently pulsing like a heartbeat.
- `CHECK THE WHOLE APP` must run the full validation. During checking, use a clear checking state; if everything passes, App Health becomes green/verified and pulse stops. If issues remain, stay red and show actionable details.
- Do not report 8/9 verified with confusing wording if the true issue count/status differs. Counts and status derive from actual checks.
- The current Vault screenshot-file simulation issue must not permanently poison the app if it is only a missing simulation attachment; either package the required offline asset correctly or represent the test fixture safely.
- Settings expanded widgets should preserve parent colour and provide useful edit controls.

## Graph / motion rules
- Add/reinstate graphs where they answer a real question: Budget pace/history/category mix; Journey spend/mix/history; optionally reservation category totals and itinerary coverage where useful.
- Prefer bars, progress arcs, sparklines, compact trend strips, proportional bars. A donut is not required simply because one existed before.
- Motion: short entry animation, bar fill, count-up or status pulse only. Respect reduced-motion where feasible. No constant decorative animation.

## Accessibility / Kym workflow priority
The primary operational paths must be the clearest, largest and easiest:
1. Add Expense
2. Add Reservation
3. Add/Edit Destination / Home Visit / route points
4. Budget + account updates
5. Checklist + His/Hers additions/completion
6. Calendar reminders/notes
7. Vault records/streaming after unlock
8. Whole-app health check

History and analysis can be deeper, but must still be readable and useful.

## Regression warning from current source snapshot
The old V54 regression guard currently reports changes in the active V55 work tree (including current Budget/Calendar/Checklist/Itinerary/Journey History/Reservations changes and the new account mutation module) and expects an old Itinerary map placement marker. **Do not roll those changes back.** The V55 exact-baseline verifier in this package is the no-loss authority for the current source snapshot. Rebase legacy regression expectations after implementation is stable.
