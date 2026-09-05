# CHANGESET V55 R31 → R32 — 05 Sep 2026

R32 is a focused Vault recognition/accessibility correction based directly on Cameron's first-build structural reference.

- Locked Vault now uses the supplied offline `header-vault` artwork as a large, recognisable vault-door hero instead of a sparse black card.
- The concealed three-tap unlock sequence is unchanged; the visible target now reads **VAULT LOCKED / PROTECTED ACCESS** and remains the only unlock gesture target.
- Streaming is presented as **TV & Movies** with a large four-column service-tile grid for peripheral recognition.
- The service grid is a visual catalogue only; it does not add credentials or alter the data model. Saved services are marked Stored; unsaved tiles open the existing Add Streaming editor prefilled with the service name.
- Tapping a saved service opens a near-full-screen read-only credential view with large owner/login/password fields and explicit Show / Edit controls.
- Existing hidden-email access remains bound to unlock Vault → open Streaming/TV & Movies → tap the Travel Command Centre compass/logo.
- Current premium Travel Command Centre material remains the app colour authority. First-build screenshots are used only for structure, scale and recognition.
- Service-worker/cache/build-health identities are advanced to R32 so the installed PWA cannot retain the R31 Vault presentation.
- No budgeting, itinerary, reservation, storage schema, Vault record security, or menu-only navigation logic is changed.
