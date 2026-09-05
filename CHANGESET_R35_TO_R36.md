# CHANGESET V55 R35 → R36 — 05 Sep 2026

R36 completes the compact-widget accessibility enlargement rule that was still missing in source.

- Journey History `Journey Snapshot`, `Milestones · Automatic`, and `Journey Check` are now expandable using the same true near-full-screen iPad modal contract as the map and other analytics.
- The enlarged Journey Snapshot uses materially larger metric labels/values, booking totals and kilometre totals rather than carrying collapsed typography into the modal.
- The enlarged Milestones view increases the six milestone tiles to large iPad-readable values/labels; enlargement is useful even when no extra data is introduced.
- Each of the nine Settings App Health sub-check cards can now enlarge individually for Kym. The enlarged view materially increases the check name, result summary, status and issue details.
- Travel & Budget Defaults, Schengen Status, Security, Backup & Restore and Application Settings groups can now enlarge without leaving Settings. Existing Edit/Backup controls retain their explicit action semantics.
- R36 does not change App Health validation logic, budget/date routing, calculations, record mutations, storage, Vault security, hidden-email access, or the sidebar-only cross-screen navigation rule.
- Runtime/service-worker/App Health build identity advances to R36 so the installed PWA cannot silently keep R35 presentation files and the updated build correctly requires its normal whole-app verification.
