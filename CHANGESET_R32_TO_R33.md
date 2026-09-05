# CHANGESET V55 R32 → R33 — 05 Sep 2026

R33 is a recognition-first accessibility and safe-information-tap pass.

- Added shared offline country flag/outline helper with packaged vector silhouettes for 74 supported countries plus safe fallback.
- Home Current Destination now includes the requested country outline cue.
- Itinerary rows and Forward Coverage segments enlarge read-only first; Edit is explicit inside the large detail.
- Itinerary row/stat details add country flags and larger dates/labels.
- Journey History completed rows now open near-full-screen read-only detail with country flag and full linked-spend breakdown; collapsed/expanded destination lists gain flags.
- Calendar Agenda adds linked-country flags; any calendar item enlarges read-only first and personal records expose explicit Edit inside the detail.
- Added R33 final-cascade readability/layout rules for the new detail surfaces.
- Service-worker/runtime/build-health identities advanced to R33 and the new country helper is fully cached offline.

No financial calculations, date-driven Destination Budget routing, storage schema, Vault security, hidden-email sequence or menu-only cross-screen navigation changed.
