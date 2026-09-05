# R72 CURRENT AUTHORITY — SCREENSHOT / VISUAL LOCK

Use this R72 simulation for the next physical iPad screenshot pass. Home remains visual/material authority; old/original screenshots are not colour authority. Preserve all valid R71 locks plus `CURRENT_R72_STATUS.md`.

---

# R71 CURRENT AUTHORITY — SCREENSHOT / VISUAL LOCK

R71 is the only current checkpoint. Read `CURRENT_R71_STATUS.md` first. Historical sections below preserve regression evidence only and may not override R71. Old/original screenshots are structure/layout/readability/defect evidence only, **never widget-colour authority** unless Cameron explicitly approves a colour. Home is the app-wide material-quality authority; use varied semantic colours with strong comfortable contrast and restrained large-surface brightness for light-sensitive eyes.

---

# R36 SCREENSHOT AUDIT LOCK — COMPLETE 5 SEP EVIDENCE

The nested `VISUAL_REFERENCES.zip` is part of the continuity authority and must travel with every later checkpoint. It now includes:

- `CURRENT_BUILD_SCREENSHOT_AUDIT_2026-09-05/`: complete current-build evidence from IMG_1256–IMG_1324 (IMG_1265 was not supplied).
- `FIRST_BUILD_STRUCTURE_REFERENCES_2026-09-05/`: IMG_1325–IMG_1333, used only for layout/scale/readability/recognition cues.
- Existing named `REF_*` set and visual authority README.

Locked interpretation:
- Current screenshots = defect evidence, not permission to copy their defects or colours.
- First-build screenshots = structural/readability authority only where they improve clarity; old colours are prohibited.
- Current approved premium semantic palette remains colour authority.
- Primary visual goals: recognisable headers, large flags/destination/date identity, clear widget hierarchy, differentiated semantic colours, true enlargement, predictable local interactions, simple Add/Edit forms, restored Vault/Streaming strength, and lower error risk for Kym.

---

# PREVIOUS SCREENSHOT AUDIT LOCK (preserved)
## 05 Sep 2026 — R33 recognition-first row safety pass

R33 corrects three source-level interaction/readability regressions found after the screenshot review. Home Current Destination now includes a packaged offline country outline beside the large flag/name. Itinerary stay/trip rows and Forward Coverage segments enlarge read-only first; Edit is an explicit action inside the large detail, so a casual information tap cannot drop Kym into an editor. Journey History completed rows now open a true near-full-screen read-only journey detail instead of a cramped inline expansion, with country flag, large dates/costs and full linked-spend breakdown. Calendar items also enlarge read-only first; personal Reminder/Note records expose Edit explicitly from that detail. Itinerary, Journey History and Calendar Agenda now use large country flags as peripheral-recognition cues. Historical first-build colours remain non-authoritative. No financial, routing, storage, Vault-security or menu-navigation rules changed.

## 05 Sep 2026 — R32 Vault recognition / TV & Movies pass

R32 fixes two reproducible source mismatches against the locked usability authority. The locked Vault now uses the supplied vault-door artwork and a large VAULT LOCKED / PROTECTED ACCESS target while preserving the exact concealed three-tap unlock. Streaming is now a large recognition-first TV & Movies service-tile grid; saved services open a near-full-screen read-only detail with explicit Show/Edit, while unsaved service tiles only prefill the existing Add Streaming editor. No old-build app colours were imported and no stored-data/security/navigation rules changed.


## 05 Sep 2026 — R30 global colour/accessibility continuation

R30 extends the current approved premium semantic palette across remaining visually generic dashboard panels without importing first-build colours. Home remains the material benchmark, not a single-colour template. Compact widgets may expand purely for Kym’s readability, and expanded dialogs are required to use essentially the full iPad landscape viewport. App Health dirty/unchecked state is explicitly red with a visible restrained heartbeat; a successful whole-app check is green and still. This pass is presentation-only and must not change travel data, routing, budgeting, Vault security, storage or calculation rules.
# V55 Screenshot Audit Lock — 4 September 2026

This document captures the latest screenshot review and conversation decisions. It is a protected implementation brief. Nothing here may be omitted during continuation.

## Global visual + interaction rules
- Add useful colour across the whole app using the premium Home-screen dark-material language: deep navy/charcoal foundations with selective colour tint, glow, border, icon and highlight — not flat saturated slabs.
- Use a broad palette where useful. Do not artificially restrict the app to four colours.
- Parent→child colour continuity is mandatory. If a card/widget is red, every deeper expansion/detail/editor reached from that coloured context should remain recognisably red; blue→blue, teal→teal, purple→purple, orange→orange, etc. Do not fall back to generic purple/blue deep screens.
- For generic **Add** flows, prefer a stable calm baby-blue/command-blue shell so Kym always recognises “I am adding something”; selected category/type gets its own strong colour inside the flow. Edit/detail flows may inherit the source item/type colour where useful.
- Accessibility supersedes the old “only expand for extra information” rule: compact widgets may expand purely so Kym can read them comfortably. When richer detail exists, show it; when it does not, a materially larger presentation is still valid.
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
- The six compact stats (Countries Planned, Route Trips, Planned Stops, Unplanned Gaps, Missing Stays, Date Overlaps) may expand for readability; where underlying detail exists, the expanded view must show it rather than only repeating the headline number.
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
- The five top Vault category cards (Passports, Visas, Insurance, Accommodation Details, Emergency Contacts) must use Home-derived material quality. Their old/original-build hue, saturation and brightness are **not locked** and must not be copied; keep differentiated semantic colours while matching Home for depth, contrast, borders/highlights and restrained glow.
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


## V55 R26 orientation-first editor follow-through
The screenshot audit now explicitly protects large destination/date recognition inside editors, not only on dashboard cards. Add Expense, Add Reservation and Add/Edit Destination must surface the destination identity and exact relevant date range strongly enough for Kym to verify it peripherally before Save. Country flags are recognition cues; dates remain the routing/source-of-truth fields. Shared headers must preserve recognisable photographic context rather than allowing information cards to obscure almost the entire image.


### R28 semantic widget-colour continuation
Use the current approved premium palette across all widgets. Historical/first-build screenshots are structure/readability references only. App Health opens red/pulsing after a build update and turns green/non-pulsing only after a successful whole-app check.


## 05 Sep 2026 — R29 screenshot-derived colour/health lock

App Health dirty/unverified must visibly read red and heartbeat-pulse; verified must be green and still. Remaining Home/Vault/Checklist widgets use differentiated semantic colours carried through the shared Home-derived dark material. Do not copy first-build colours, saturation or brightness.

## R31 screenshot follow-through
- Verify Itinerary now has the same clear destination-orientation header family as Budget/Reservations/Calendar before the Forward Planning Map.
- Verify shared header cards no longer blanket most of the country photograph; flags, destination names and dates must remain obvious at peripheral glance.
- Verify Home information taps enlarge/stay local; no Alerts/Upcoming/Timeline/Search/Next Destination tap changes main screens.
- Verify His/Hers and Permanent/Destination Checklist dashboard cards have no small Add boxes; expanded views contain the large Add Item action.
- Verify first R31 Settings open shows App Health red/pulsing until CHECK THE WHOLE APP passes, then green/still.


## 05 Sep 2026 — R35 Add/Edit + large-date readability lock
- Add/Edit screens are deliberate error-prevention surfaces for Kym: field labels, entered values, selected tiles and Save/Cancel actions must remain comfortably readable at iPad landscape distance.
- Date and datetime inputs must be materially larger than ordinary micro-copy, with prominent tabular date text. Destination Budget date tickets must show readable FROM/TO, day, month and year context; repeated destination stays may never be distinguished by tiny date text.
- Automatic dated Destination Budget routing confirmation in Add Expense/Add Reservation is operational information and must not regress to fine print.
- These presentation rules do not authorise changing date-driven routing, budget allocation, calculations, mutations, storage, Vault security, sidebar-only navigation or the current premium colour authority.

## R36 expansion visual lock — 05 Sep 2026
- Journey History Milestones must be tappable/enlargeable and become materially larger in the modal.
- Journey Snapshot and Journey Check must enlarge to use the iPad landscape viewport, not remain compact cards inside a large empty dialog.
- Each App Health sub-check may be enlarged independently so Kym can read its status/summary/details.
- Settings information groups may enlarge without navigating away; explicit edit/action buttons remain the only edit/action entry points.


### R50 colour-authority clarification
Screenshots from old/original/current builds remain authoritative for **structure, hierarchy, spacing, content presence, crop/visibility and defect evidence** where applicable. They are not palette authority. Judge colour against the Home-derived whole-app material system: varied semantic hues, restrained saturation on large surfaces, comfortable brightness for light-sensitive eyes, strong text contrast, restrained glow and consistent depth.


### R56 readability acceptance
On the 1024×768 iPad pass, reject any live operational/status/date/routing/analysis label that visually collapses back to legacy microtext. Source floor is 11px generally and 12px for high-risk destination/date/routing cues. Small neutral text should remain comfortably bright rather than stark white. This is a readability check only; screenshot hues remain non-authoritative and must not be copied.


### R57 selected-state comfort acceptance
On iPad, selected Reservation category cards must remain immediately obvious without becoming visibly brighter than the surrounding dashboard. Judge selection from edge/inset/semantic accent structure and pressed state, not a brightness jump.


### R58 App Health motion acceptance
On device, App Health dirty/needs-attention must read as one restrained whole-panel heartbeat with its action button, not competing layered pulses. Verified must be green and completely still. Reduced Motion must suppress the heartbeat.


### R59 Vault depth-material acceptance
Old/original Vault screenshot hues, saturation and brightness are not colour authority. On physical iPad, Passports/Visas/Insurance/Accommodation/Emergency/Streaming drill-downs must feel like the same Home-derived application: deep low-glare material, strong readable contrast, restrained glow and clear category hue recognition. Reject bright full-screen legacy slabs even if their structure matches an old screenshot.

### R60 form-control acceptance
Checklist dropdowns and Settings Schengen Status/Notes must visually belong to the same Home-derived editor system as the rest of the build: dark material, large readable labels/control text, comfortable iPad target height, and no bright browser-default select/textarea surfaces. Old screenshots remain non-authoritative for colour.



### R61 route-colour / checkbox visual acceptance
- Open the same Passport/Visa/Insurance/Accommodation/Emergency record from its category, Expiry Reminders, Recent Activity and All Vault Records: category colour family must stay consistent on every route while material depth remains Home-like.
- Checklist Required/Optional checkbox must be visibly easy to see/tap at normal iPad landscape distance, not a tiny native tick.
- Do not compare these hues to old/original-build screenshot colours; screenshots remain structural/readability evidence only.


### R62 Safari native-control acceptance
- On physical iPad, open Add Expense, Add Reservation, Add Destination, Calendar event, Checklist item, Vault record and Settings/Schengen editors. Date/time/select chrome must visually remain in the dark app family and must not flash bright/default white control surfaces.
- Native controls must remain readable, familiar and functional; this rule is not permission to replace them with custom widgets.


### R63 expanded-view continuity acceptance
- On physical iPad, enlarge the Itinerary Forward Journey Map: its modal must remain recognisably in the parent map's teal family, using the same restrained Home-derived material rather than changing to generic blue.
- Open representative cloned-widget expansions and use VoiceOver: labels/headings must announce from the enlarged content without focus/label resolution jumping to the live card behind the modal.
- Old/original screenshot colours remain non-authoritative; judge colour continuity from the current rendered parent widget.


### R64 App Health Reduce Motion acceptance
- On the target iPad with Reduce Motion OFF: dirty/unchecked App Health has the restrained whole-panel red heartbeat and the red button heartbeat; verified is green/still.
- With Reduce Motion ON: dirty/unchecked still has a slower subtle whole-panel heartbeat, the button does not scale, and verified remains green/still.
- The effect must remain comfortable for light-sensitive eyes: no flash, white bloom or large luminance jump.


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

