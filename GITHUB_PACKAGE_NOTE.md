# V55 R72 GitHub Upload Package

This is the same **V55 R72 Screenshot Simulation** runtime/app build, repackaged so the downloadable ZIP remains below GitHub's 25 MB web-upload limit.

## What was omitted

Only `VISUAL_REFERENCES.zip` was omitted. It is a non-runtime audit/reference archive containing historical/current screenshot evidence and is not loaded by the PWA, service worker, simulation runtime, or any application screen.

## What remains included

- all R72 HTML, JavaScript and CSS
- all R72 source changes
- Athens simulation fixture and fixed simulation clock
- offline header assets and header index
- manifest, service worker and application icon
- continuity, acceptance and regression documents
- exact GitHub-package SHA-256 manifest and verifier

The app/runtime bytes are unchanged from the full R72 screenshot simulation package. This GitHub package exists only to reduce upload size.
