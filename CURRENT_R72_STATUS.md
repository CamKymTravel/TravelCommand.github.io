# CURRENT R72 SIMULATION STATUS — READ FIRST

**Date:** 5 September 2026 AEST  
**Exact active checkpoint:** **V55 R72 Screenshot Simulation**  
**Role:** screenshot/interaction simulation successor to protected V55 R71; not Master/Gold until physical iPad acceptance passes.  
**Package:** `Travel_Command_Centre_V1_SIMULATION_V55_R72_SCREENSHOT_FULL_2026-09-05.zip`

## Mandatory continuation rule

Do **not** restart, redesign, simplify, recreate from screenshots, or roll back to R71/R68/R64/R55/R36. Extract this exact package and run `python3 verify_continuity_r72.py`. Continue only if it ends in **PASS**.

R72 absorbs the complete verified R71 source plus the 24 intentional post-R71 source/style changes from the forensic continuation audit. R69/R70 semantic-record recolouring experiments remain rejected and are not baselines.

## R72 simulation identity

- Athens simulation remains force-enabled in `index.html` for screenshot testing even when an existing iPad Home Screen shortcut opens plain `index.html`.
- Simulation date remains **24/02/2029**.
- Simulation storage key remains `tcc:v1:simulation:athens-greece-v55` so an existing screenshot-test state is not unnecessarily wiped.
- Fixture revision remains `v55-athens-greece-2029-02-24-r1`.
- Service-worker/cache identity is **R72** so Safari cannot legitimately keep serving the old R71 shell after this package is installed.
- App Health build marker is **R72**, so the newly installed simulation deliberately opens dirty/red/pulsing until **CHECK THE WHOLE APP** succeeds.

## Post-R71 changes absorbed into this package

- Final-cascade iPad touch-target closure for Home interactive mini rows and compact Checklist edit controls.
- Reservation missing-Destination-Budget blocker made large, gold and fully readable.
- Checklist overview wording separated from Ready to Move semantics.
- Forward Coverage month-end/leap-year horizon correction.
- Arrival-day stale Checklist readiness alert suppression.
- Empty-itinerary Forward Coverage now reports genuine Missing Coverage.
- Journey Map continuity breaks prevent false route lines across hidden years/types.
- Settings Save validation made atomic.
- RV/Cruise itinerary route-point validation made atomic before parent itinerary mutation.
- Legacy Destination Budget repair records remain visible, cannot silently adopt today, and never trust stale destination links/amounts/currencies.
- `XXX` is repair-only and cannot be saved as a real transaction/default/destination/account currency.
- Recoverable old malformed text date/currency values enter explicit repair state instead of unnecessary Protected Recovery; structured corruption still rejects.
- Home, Budget, Reservations, Calendar, Global Search, App Health and itinerary destructive protection now share the same repair-data trust boundary.
- Repair-required records stay searchable/visible but are clearly marked and excluded from trusted totals/context until deliberately repaired.

## Visual/material authority

Home remains the app-wide visual/material authority. Old/original screenshots are **never colour authority** unless Cameron explicitly approves a specific colour. Use them only for structure, layout, hierarchy, readability, feature presence and defect evidence. Preserve the approved current premium Home/Vault material system, semantic colour variety, restrained large-surface brightness, strong contrast and low-glare treatment.

Specialist header routing remains locked: Cruise uses the supplied Princess header. Motorhome/RV uses explicit Starting Country when supplied; United States starting country uses the USA motorhome asset, otherwise Europe/other. Ordinary country headers preserve recognisable scenes with minimal crop.

Sidebar remains the only primary cross-screen navigation owner. Information rows open/read/enlarge locally; do not restore cross-screen widget/row navigation.

## Verification gates

`verify_continuity_r72.py` must verify the exact 99-file package, hashes, 65 JavaScript files, 6 CSS files, nine screens, sidebar-only navigation, R72 App Health/service-worker/cache alignment, visual evidence, local offline-shell completeness, and deterministic model/budget/Vault invariants.

The stronger retained model gate has also been run on the working source: **1,461/1,461 travel days × 7 core view models = 10,227/10,227 builds**.

## Remaining acceptance

Physical target-iPad **1024×768 installed Safari/PWA visual and lifecycle acceptance** remains outstanding. Static/model verification is not a substitute for screenshots of the actual iPad build. Continue using Cameron's new screenshots to identify only reproducible residual defects.

## GitHub-under-25MB packaging note
This derivative package omits only the non-runtime `VISUAL_REFERENCES.zip` audit archive so the upload ZIP remains below 25 MB. Application/runtime bytes are unchanged from the full R72 screenshot simulation.
