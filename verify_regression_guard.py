#!/usr/bin/env python3
"""Travel Command Centre V1 continuity / anti-regression verifier.

V54 TOUCH-TARGET COMPLETION CANDIDATE — 4 September 2026 AEST.

This verifier freezes the exact V51 working tree after rich 78-country helpers and material-depth pass 5, while preserving the 100-item historical no-loss ledger. It is a continuity baseline, not a release/master approval.

Before any edit:
    python3 verify_regression_guard.py --verify

During a focused batch:
    python3 verify_regression_guard.py --verify --allow-changes file1 file2

A successful no-allow-list verification means the extracted handoff matches
this frozen V54 touch-target-completion baseline exactly. It does not waive the still-active target-iPad/offline-voice/Vault/final-colour work in OUTSTANDING_WORK.md.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / "BASELINE_SHA256.txt"
CONTRACT = ROOT / "REGRESSION_CONTRACT.json"
LEDGER = ROOT / "OUTSTANDING_WORK.md"
IGNORED_NAMES = {".DS_Store", "Thumbs.db"}
BASELINE_ID = "V54_TOUCH_TARGET_COMPLETION_2026-09-04_AEST"
CACHE_ID = "tcc-v1-v54-touch-target-completion-2026-09-04"
EXPECTED_LEDGER_ITEMS = 100


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def rel_files() -> set[str]:
    out: set[str] = set()
    for p in ROOT.rglob("*"):
        if not p.is_file():
            continue
        if p.name in IGNORED_NAMES or "__pycache__" in p.parts or p.suffix == ".pyc":
            continue
        out.add(p.relative_to(ROOT).as_posix())
    return out


def load_manifest() -> dict[str, str]:
    if not MANIFEST.exists():
        raise RuntimeError("BASELINE_SHA256.txt is missing")
    entries: dict[str, str] = {}
    for raw in MANIFEST.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line:
            continue
        try:
            digest, path = line.split("  ", 1)
        except ValueError as exc:
            raise RuntimeError(f"malformed manifest line: {line!r}") from exc
        if not re.fullmatch(r"[0-9a-f]{64}", digest):
            raise RuntimeError(f"invalid SHA-256 digest for {path}")
        entries[path] = digest
    return entries


def must_contain(path: str, needles: list[str], errors: list[str]) -> None:
    p = ROOT / path
    if not p.exists():
        errors.append(f"protected feature file missing: {path}")
        return
    text = p.read_text(encoding="utf-8", errors="replace")
    for needle in needles:
        if needle not in text:
            errors.append(f"protected marker missing from {path}: {needle!r}")


def must_not_contain(path: str, needles: list[str], errors: list[str]) -> None:
    p = ROOT / path
    if not p.exists():
        return
    text = p.read_text(encoding="utf-8", errors="replace")
    for needle in needles:
        if needle in text:
            errors.append(f"retired/regressed marker present in {path}: {needle!r}")


def static_continuity_checks(errors: list[str]) -> None:
    must_contain("CONTINUITY_START_HERE.md", [
        "V54 Touch-Target Completion Candidate", "1.2.0-v54-touch-target-completion", "10,227/10,227 view-model builds",
        "CHANGESET_V53_TO_V54.md", "ACCEPTANCE_MATRIX_V54.md",
    ], errors)
    must_contain("CHANGESET_V52_TO_V53.md", [
        "Changeset V52 → V53 Acceptance Repair", "Twenty application source/runtime files",
        "1,461/1,461 days; 10,227/10,227 core view-model builds", "package could match V52",
    ], errors)
    must_contain("CHANGESET_V53_TO_V54.md", [
        "Changeset V53 → V54 Touch-Target Completion", "Two real late-cascade defects",
        "reservation-flight-scope-tile", "itinerary-coverage-switch",
        "1.2.0-v54-touch-target-completion", "effective final cascade",
        "indexed grouping algorithm", "Standard stays now require", "9 files",
    ], errors)
    must_contain("LOCKED_REQUIREMENTS.md", [
        "V54 Touch-Target Completion Additions / Overrides", "effective final cascade",
        "Forward Coverage → six planning stats", "No-current-stay header selection",
    ], errors)
    must_contain("OUTSTANDING_WORK.md", [
        "V54 Immediate Carry-Forward / Remaining Acceptance", "physical target-iPad acceptance",
        "Athens simulation remains blocked", "one-time simulation-fixture install marker",
    ], errors)
    must_contain("REGRESSION_PROTOCOL.md", [
        "V54 Regression Protocol", "--verify --deep", "Hash equality alone is insufficient",
        "1,461-day / 10,227-model", "effective final CSS cascade",
    ], errors)
    must_contain("VISUAL_REFERENCE_INDEX.md", [
        "V54 Visual Acceptance Authority", "ACCEPTANCE_MATRIX_V54.md", "not automatic colour authority",
    ], errors)
    must_contain("CONTINUITY_START_HERE.md", [
        "V52 Active No-Loss Continuity Baseline",
        "17 verified post-V51 source/runtime changes",
        "CHANGESET_V51_TO_V52.md",
        "10,227 core view-model builds",
        "PASSED — BASELINE VERIFIED",
    ], errors)
    must_contain("CHANGESET_V51_TO_V52.md", [
        "Exact 17 absorbed files",
        "src_core_itinerary-mutations.js",
        "src_core_state.js",
        "src_main.js",
        "sw.js",
        "17 allow-listed changes",
        "10,227",
    ], errors)
    must_contain("LOCKED_REQUIREMENTS.md", [
        "V52 Active No-Loss Additions / Overrides",
        "needsBudgetRepair",
        "background rerenders",
        "Protected-Recovery pending restore keys",
        "Service-worker upgrade refresh",
    ], errors)
    must_contain("OUTSTANDING_WORK.md", [
        "V52 Immediate No-Loss Carry-Forward",
        "17 source/runtime files",
        "physical target-iPad",
        "offline phrase speech",
    ], errors)
    must_contain("REGRESSION_PROTOCOL.md", [
        "V52 Regression Protocol",
        "17 absorbed source/runtime files",
        "Regenerate `BASELINE_SHA256.txt` **last**",
        "PASSED — BASELINE VERIFIED",
    ], errors)
    must_contain("VISUAL_REFERENCE_INDEX.md", [
        "V52 Visual Reference Index",
        "VISUAL_REFERENCES.zip",
        "Forward Coverage/Journey History",
        "44px",
    ], errors)
    must_contain("CONTINUITY_START_HERE.md", [
        "V51 Active No-Loss Continuity Baseline",
        "78/78/78 paired",
        "4 sections × 4 useful items",
        "Practical Essentials",
        "Signs to Look For",
        "12 intentional post-V50 source/runtime changes",
        "PASSED — BASELINE VERIFIED",
    ], errors)
    must_contain("LOCKED_REQUIREMENTS.md", [
        "V51 Active No-Loss Additions / Overrides",
        "remove Current Destination Status",
        "remove Quick Tips",
        "78 Quick Look + 78 toilet-language + 78 helper-context records",
        "localService===true",
        "Home Current Destination header/banner → Country Quick Look",
        "Home compass/logo → Where’s the toilet?",
    ], errors)
    must_contain("OUTSTANDING_WORK.md", [
        "V51 Immediate No-Loss Carry-Forward",
        "78/78/78 exact-paired",
        "Physical-iPad offline voice proof is still outstanding",
        "remaining parent → expanded → deeper-editor/material continuity audit",
    ], errors)
    must_contain("REGRESSION_PROTOCOL.md", [
        "V51 Regression Protocol",
        "Stop Backtracking",
        "78/78/78 paired helper datasets",
        "no internet speech fallback",
        "Regenerate `BASELINE_SHA256.txt` **last**",
    ], errors)
    must_contain("VISUAL_REFERENCE_INDEX.md", [
        "V51 Visual Reference Index",
        "VISUAL_REFERENCES.zip",
        "REF_21_COUNTRY_QUICK_LOOK_APPROVED_DIRECTION.jpeg",
        "REF_22_TOILET_HELPER_APPROVED_DIRECTION.jpeg",
        "replace with Practical Essentials",
        "replace with Signs to Look For",
    ], errors)
    must_contain("CONTINUITY_START_HERE.md", [
        "V50 Deep No-Loss Continuity Handoff",
        "PASSED — BASELINE VERIFIED",
        "V50 status matrix",
        "Explicitly planned and locked",
        "Deep regression protocol — V50",
        "Critical no-loss instruction",
        "28 route-relevant countries",
        "Play, Slow, Repeat ×3 and Louder",
        "screenshots are layout/defect evidence only",
        "1,461",
        "62/62",
        "3,283/3,283",
        "2,310",
        "9/9",
    ], errors)
    must_contain("LOCKED_REQUIREMENTS.md", [
        "Destination Budgets",
        "Intentional Gap is retired",
        "unlock The Vault -> open Streaming -> tap the Travel Command Centre compass/logo",
        "Manual Schengen tracker",
        "V49 iPad full-screenshot repair authority",
        "V50 final-colour implementation rule",
        "No screenshot is colour authority unless Cameron explicitly says that specific colour is approved",
        "Access points are distinct and locked",
        "Play, Slow, Repeat ×3 and Louder",
        "minimum protected checkpoint, not the final coverage target",
        "V50 deep no-loss continuity authority",
    ], errors)
    must_contain("OUTSTANDING_WORK.md", [
        "V50 Immediate No-Loss Carry-Forward",
        "Active work that MUST continue",
        "28 Country Quick Look records and 28 matching toilet-language records",
        "does not yet have the newly requested polished voice/audio implementation",
        "V50 deep regression protocol for the next chat",
        "V49 iPad Full-Screenshot Repair Candidate / No-Loss Ledger",
        "Critical recovery note",
        "Still-active audit state",
        "Post‑V34 mandatory implementation ledger",
        "Permanent Checklist completion is scoped per move/destination",
        "Regression protocol for the next chat",
    ], errors)

    must_contain("VISUAL_REFERENCE_INDEX.md", [
        "V50 colour-authority warning",
        "None of the packaged screenshots",
        "are automatic colour approval",
        "Current Destination header opens Quick Look",
        "Home compass opens the toilet helper",
    ], errors)

    if LEDGER.exists():
        text = LEDGER.read_text(encoding="utf-8", errors="replace")
        items = re.findall(r"(?m)^(\d+)\.\s", text)
        numbered = {int(x) for x in items if 1 <= int(x) <= EXPECTED_LEDGER_ITEMS}
        missing = sorted(set(range(1, EXPECTED_LEDGER_ITEMS + 1)) - numbered)
        if missing:
            errors.append(f"100-item no-loss ledger incomplete; missing item(s): {missing}")

    must_contain("sw.js", [CACHE_ID, "CACHE_PREFIX", "request.mode === 'navigate'", "self.clients.matchAll", "client.navigate(client.url)"], errors)
    must_contain("index.html", [
        'rel="manifest"',
        "manifest.webmanifest",
        'type="module"',
        "params.get('simulation') === '1'",
        "await import('./src_main.js')",
    ], errors)
    must_contain("src_core_schema.js", [
        "RESERVATION_STATUSES = Object.freeze(['paid', 'unpaid', 'booked', 'to-book'])",
        "pinRecoveryNotice",
    ], errors)
    must_not_contain("src_core_schema.js", ["ALLOCATION", "'completed'"], errors)
    must_contain("src_core_entities.js", ["startCountry"], errors)
    must_contain("src_screens_itinerary.js", ["Starting Country"], errors)
    must_contain("src_core_storage.js", ["storageAccessError", "lastReadError", "BrowserVaultAssetStore", "indexedDB.open", "screenshots"], errors)
    must_contain("src_components_modal.js", [
        "form.addEventListener('submit', event => event.preventDefault())",
        "const ACTION_INTERACTIVE = 'button, a, [role=\"button\"]'",
    ], errors)
    must_contain("src_core_budget-view-model.js", [
        "Future-dated",
        ".filter(record => !record.needsBudgetRepair && record.date)",
        "isFuture:toISODate(record.date) > today",
        "needs-setup",
    ], errors)
    must_contain("src_core_backup.js", ["backupStateIntegrity", "fnv1a32-utf16le"], errors)
    must_contain("src_core_state.js", ["snapshotWithVaultAssets", "migrateEmbeddedVaultAssets", "vaultAssetStore"], errors)
    must_contain("src_core_restore.js", ["Vault screenshot payload bytes are missing", "internal-only Vault screenshot storage reference"], errors)
    must_contain("src_core_migrations.js", ["assertNotNewerAppGeneration", "Protected Recovery is required", "STRICT_PERSISTED_GENERATION_MIN = 41", "isStrictPersistedGeneration"], errors)
    must_contain("src_core_restore.js", ["Backup integrity", "newer app generation", "STRICT_PERSISTED_GENERATION_MIN = 41", "strictKnownBackup"], errors)
    must_contain("src_core_schema.js", ["1.2.0-v54-touch-target-completion"], errors)
    # V54 late deep-audit protections: scalable duplicate health + destination context integrity.
    must_contain("src_core_reservations-view-model.js", [
        "reservationDuplicateKey", "const bases = new Map()", "list.some(item => !item.time)",
    ], errors)
    must_not_contain("src_core_reservations-view-model.js", [
        "for (let a=0; a<source.length; a+=1) for (let b=a+1; b<source.length; b+=1)",
    ], errors)
    must_contain("src_core_entities.js", [
        "Standard stays require a country", "if (!routeTrip && !country)",
    ], errors)
    must_contain("src_screens_itinerary.js", [
        "countryInput.required = type === 'standard'", "countryInput.required = body.dataset.travelType === 'standard'",
    ], errors)
    must_contain("src_core_app-health.js", [
        "standardMissingCountry", "missing a Country required for its destination header and offline language helper",
    ], errors)
    must_contain("src_components_sidebar.js", ["Primary navigation", "Travel Command Centre sidebar", "brand-compass-svg", "Where's the toilet?"] , errors)
    must_contain("src_components_modal.js", ["preserveLocalFocus", "restoreLocalFocus", "main[data-screen]", "inferExpandedTone", "dataset.expandTone", "semanticTone", "resolvedTone"], errors)
    must_contain("src_screens_calendar.js", ["day.setAttribute('role', 'group')", "Previous month from", "Next month from"], errors)
    must_contain("src_screens_reservations.js", ["Reservation summary", "Booked Reservations", "title:'Next 5 Upcoming',tone:'red'"] , errors)
    must_not_contain("src_screens_reservations.js", ["Flights & Transport"], errors)
    must_contain("src_components_page-hero.js", ["if (!stay) return null;", "no-current-stay"], errors)
    must_contain("src_screens_home.js", ["CURRENT DESTINATION", "home-compass", "WHERE'S THE TOILET?", "COUNTRY QUICK LOOK · OFFLINE", "Plants & Gardens", "Food & Drink", "Animals", "History & Culture", "Open Itinerary", "Tap to set up your itinerary"], errors)
    must_contain("src_main.js", ["active === 'home'", "[data-screen=\"home\"] .home-compass", "canRevealHiddenEmails"], errors)
    must_contain("src_screens_settings.js", ["autocomplete='one-time-code'", "tcc-pin-input"], errors)
    must_contain("src_screens_vault.js", ["inputField('Vault PIN', 'pin', 'text', '')", "autocomplete = 'one-time-code'", "tcc-pin-input"], errors)
    must_not_contain("src_screens_settings.js", ["inputField(label,name,'password'"], errors)
    must_contain("src_screens_vault.js", ["VAULT_ICON_PATHS", "vaultCategoryIcon"], errors)
    must_contain("src_design_reference-pass.css", ["iPad visual acceptance harmony pass", "icon-to-parent colour continuity", "editor colour continuity", "reservation interaction-state continuity", "V49 full screenshot repair / interaction continuity", "tcc-expanded-card-snapshot", "tcc-pin-input"], errors)
    must_contain("src_screens_checklist.js", ["Checklist summary"], errors)
    must_contain("src_screens_itinerary.js", ["Unplanned Gaps", "Starting Country"], errors)
    must_contain("src_screens_budget.js", ["Year Forecast & Budget Summary", "editorTone = null", "tcc-budget-editor-modal"], errors)
    must_contain("src_screens_reservations.js", ["tcc-reservation-editor-modal"], errors)
    must_contain("src_screens_itinerary.js", ["tcc-itinerary-editor-modal"], errors)
    must_contain("src_screens_journey-history.js", ["No entries yet"], errors)

    # V52 absorbed post-V51 protections.
    must_contain("src_components_modal.js", ["dataset.actionBusy", "aria-busy", "materialToneFromContext", "tcc-header-image-ready"], errors)
    must_contain("src_components_confirmation.js", ["materialToneFromContext", "confirmation-action-error"], errors)
    must_contain("src_core_itinerary-mutations.js", ["costProtectsItinerary", "repair ${kind.toLowerCase()}", "datedCostsLinkedTo"], errors)
    must_contain("src_core_state.js", ["stageVaultAsset", "removeVaultAssets", "cleanupOrphanVaultAssets", "auditVaultAssets"], errors)
    must_contain("src_screens_settings.js", ["backupBusy", "cleanupOrphanVaultAssets"], errors)
    must_contain("src_screens_reservations.js", ["repairExcluded", "excluded from the AUD total until repaired"], errors)
    must_contain("src_main.js", ["TCC_SW_UPDATE_QUERY", "dialog[open], input[type=\"file\"]", "Protected Recovery"], errors)
    must_contain("sw.js", ["clientReadyForSafeReload", "TCC_SW_UPDATE_QUERY", "allLiveWindowsSafe"], errors)


    # V51 destination-helper continuity: 78/78/78 exact pairing and rich density are protected.
    home_path = ROOT / "src_screens_home.js"
    if home_path.exists():
        home_text = home_path.read_text(encoding="utf-8", errors="replace")
        def object_keys(const_name: str) -> set[str]:
            match = re.search(rf"const\s+{re.escape(const_name)}=Object\.freeze\(\{{(.*?)\n\}}\);", home_text, re.S)
            if not match:
                return set()
            keys = set()
            for line in match.group(1).splitlines():
                m = re.match(r"\s*(?:'([^']+)'|([A-Za-z][\w-]*))\s*:", line)
                if m:
                    keys.add(m.group(1) or m.group(2))
            return keys
        quick_keys = object_keys("COUNTRY_QUICK_LOOK")
        toilet_keys = object_keys("TOILET_LANGUAGE")
        context_keys = object_keys("COUNTRY_HELPER_CONTEXT")
        if len(quick_keys) != 78:
            errors.append(f"Country Quick Look coverage must remain exactly 78 at V52 baseline: {len(quick_keys)}")
        if len(toilet_keys) != 78:
            errors.append(f"Toilet-language coverage must remain exactly 78 at V52 baseline: {len(toilet_keys)}")
        if len(context_keys) != 78:
            errors.append(f"Country helper context coverage must remain exactly 78 at V52 baseline: {len(context_keys)}")
        if quick_keys != toilet_keys or quick_keys != context_keys:
            errors.append("Country helper datasets are no longer exactly paired across Quick Look / toilet / context")
        for required in [
            "const openCurrent=()=>showQuickLook(host,model.currentStay,navigate)",
            "compass.addEventListener('click',event=>{event.stopPropagation();showToilet(host,model.currentStay,navigate);})",
            "Plants & Gardens", "Food & Drink", "Animals", "History & Culture",
            "No English fallback has been substituted",
            "PRACTICAL ESSENTIALS", "SIGNS TO LOOK FOR", "POLITE EXTRA",
            "Play", "Slow", "Repeat ×3", "Louder", "localService===true",
        ]:
            if required not in home_text:
                errors.append(f"V51 Home helper access/content marker missing: {required!r}")
        if "Current Destination Status" in home_text:
            errors.append("retired helper panel returned: Current Destination Status")
        if "Quick Tips" in home_text:
            errors.append("retired helper panel returned: Quick Tips")
        if len(re.findall(r"(?:^|[,\n]\s*)[\'\"]?[a-z][\w-]*[\'\"]?\s*:\s*r\(", home_text, re.M)) < 78:
            errors.append("Quick Look rich-record density regressed: fewer than 78 r(...) records")

    refs = sorted(ROOT.glob("REF_*.jpeg"))
    if refs:
        errors.append("V51 visual references must remain consolidated in VISUAL_REFERENCES.zip")
    visual_pack = ROOT / "VISUAL_REFERENCES.zip"
    if not visual_pack.exists():
        errors.append("VISUAL_REFERENCES.zip is missing")
    else:
        try:
            import zipfile
            with zipfile.ZipFile(visual_pack) as zf:
                names=set(zf.namelist())
            jpeg_names={n for n in names if n.lower().endswith('.jpeg')}
            if len(jpeg_names) != 21:
                errors.append(f"visual reference pack must contain 21 JPEGs; found {len(jpeg_names)}")
            for req_name in ["REF_21_COUNTRY_QUICK_LOOK_APPROVED_DIRECTION.jpeg","REF_22_TOILET_HELPER_APPROVED_DIRECTION.jpeg","README_VISUAL_AUTHORITY.txt"]:
                if req_name not in names:
                    errors.append(f"visual reference pack missing {req_name}")
        except Exception as exc:
            errors.append(f"VISUAL_REFERENCES.zip invalid: {exc}")
    for req in [
        "header-assets.bin", "header-index.json", "index.html", "manifest.webmanifest",
        "simulation-data.json", "CONTINUITY_START_HERE.md", "LOCKED_REQUIREMENTS.md",
        "OUTSTANDING_WORK.md", "REGRESSION_PROTOCOL.md", "REGRESSION_CONTRACT.json", "VISUAL_REFERENCES.zip",
        "CHANGESET_V52_TO_V53.md", "ACCEPTANCE_MATRIX_V53.md", "v53_deep_acceptance.mjs",
        "CHANGESET_V53_TO_V54.md", "ACCEPTANCE_MATRIX_V54.md", "v54_deep_acceptance.mjs",
    ]:
        if not (ROOT / req).exists():
            errors.append(f"required package asset missing: {req}")

    nested_files = [
        p for p in ROOT.rglob("*")
        if p.is_file() and len(p.relative_to(ROOT).parts) > 1 and "__pycache__" not in p.parts
    ]
    if nested_files:
        errors.append("package is no longer flat; nested files detected")
    visible_count = len(rel_files())
    if visible_count > 100:
        errors.append(f"package has {visible_count} files; continuity cap is 100")


def js_module_syntax_checks(errors: list[str]) -> None:
    node = shutil.which("node")
    if not node:
        return
    for p in sorted(ROOT.glob("*.js")):
        source = p.read_text(encoding="utf-8", errors="replace")
        proc = subprocess.run(
            [node, "--input-type=module", "--check"],
            input=source,
            capture_output=True,
            text=True,
        )
        if proc.returncode != 0:
            msg = (proc.stderr or proc.stdout).strip().splitlines()
            tail = msg[-1] if msg else "ES-module syntax error"
            errors.append(f"JavaScript ES-module parse failed: {p.name}: {tail}")


def css_structure_checks(errors: list[str]) -> None:
    for p in sorted(ROOT.glob("*.css")):
        text = p.read_text(encoding="utf-8", errors="replace")
        depth = 0
        in_comment = False
        i = 0
        while i < len(text):
            if not in_comment and text.startswith("/*", i):
                in_comment = True; i += 2; continue
            if in_comment and text.startswith("*/", i):
                in_comment = False; i += 2; continue
            if in_comment:
                i += 1; continue
            ch = text[i]
            if ch == "{": depth += 1
            elif ch == "}":
                depth -= 1
                if depth < 0:
                    errors.append(f"CSS structure failed: {p.name}: extra closing brace")
                    break
            i += 1
        if depth != 0:
            errors.append(f"CSS structure failed: {p.name}: brace depth {depth}")


def service_worker_shell_checks(errors: list[str]) -> None:
    sw = ROOT / "sw.js"
    if not sw.exists():
        return
    text = sw.read_text(encoding="utf-8", errors="replace")
    listed = set(re.findall(r"['\"]\./([^'\"]+)['\"]", text))
    runtime = {
        p.name for p in ROOT.iterdir()
        if p.is_file() and (
            p.suffix in {".js", ".css"}
            or p.name in {"index.html", "manifest.webmanifest", "header-index.json", "header-assets.bin", "simulation-data.json"}
        )
    }
    runtime.discard("sw.js")
    missing = sorted(runtime - listed)
    if missing:
        errors.append("service-worker app shell missing runtime file(s): " + ", ".join(missing))


def contract_checks(errors: list[str]) -> None:
    try:
        contract = json.loads(CONTRACT.read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append(f"REGRESSION_CONTRACT invalid: {exc}")
        return
    if contract.get("baseline_id") != BASELINE_ID:
        errors.append("REGRESSION_CONTRACT baseline_id mismatch")
    if contract.get("offline_cache_generation") != CACHE_ID:
        errors.append("REGRESSION_CONTRACT cache generation mismatch")
    status = contract.get("source_recovery_status") or {}
    if not status.get("full_v49_ipad_full_screenshot_repair_tree_present"):
        errors.append("REGRESSION_CONTRACT lost V49 iPad full-screenshot repair tree declaration")
    if not status.get("full_v50_deep_no_loss_handoff_tree_present"):
        errors.append("REGRESSION_CONTRACT lost V50 deep no-loss handoff declaration")
    if not status.get("v49_working_source_frozen_inside_v50"):
        errors.append("REGRESSION_CONTRACT lost V49 working-source freeze declaration")
    if not status.get("planned_work_frozen_as_requirements_not_claimed_implemented"):
        errors.append("REGRESSION_CONTRACT lost implemented-vs-planned distinction")
    if not status.get("full_v51_current_working_tree_present"):
        errors.append("REGRESSION_CONTRACT lost V51 ancestry declaration")
    if not status.get("full_v52_current_working_tree_present"):
        errors.append("REGRESSION_CONTRACT lost V52 current working-tree declaration")
    if not status.get("full_v53_acceptance_repair_tree_present"):
        errors.append("REGRESSION_CONTRACT lost V53 acceptance-repair tree declaration")
    if not status.get("full_v54_touch_target_completion_tree_present"):
        errors.append("REGRESSION_CONTRACT lost V54 touch-target-completion tree declaration")
    if not status.get("verified_v53_predecessor_preserved"):
        errors.append("REGRESSION_CONTRACT lost verified V53 predecessor declaration")
    if not status.get("v53_handoff_superseded"):
        errors.append("REGRESSION_CONTRACT does not supersede V53")
    if int(status.get("v53_to_v54_app_source_runtime_files") or 0) != 9:
        errors.append("REGRESSION_CONTRACT V53→V54 app source/runtime repair count must be 9")
    if not status.get("v54_effective_touch_cascade_protected"):
        errors.append("REGRESSION_CONTRACT lost V54 effective touch-cascade protection")
    if not status.get("verified_v52_predecessor_preserved"):
        errors.append("REGRESSION_CONTRACT lost verified V52 predecessor declaration")
    if not status.get("v52_handoff_superseded"):
        errors.append("REGRESSION_CONTRACT does not supersede V52")
    if int(status.get("v52_to_v53_app_source_runtime_files") or 0) != 20:
        errors.append("REGRESSION_CONTRACT V52→V53 app source/runtime repair count must be 20")
    if not status.get("v53_visual_interaction_matrix_protected"):
        errors.append("REGRESSION_CONTRACT lost V53 visual/interaction matrix protection")
    if not status.get("v51_handoff_superseded"):
        errors.append("REGRESSION_CONTRACT does not supersede V51")
    if int(status.get("v51_to_v52_absorbed_source_files") or 0) != 17:
        errors.append("REGRESSION_CONTRACT V51→V52 absorbed source count must be 17")
    if not status.get("v50_handoff_superseded"):
        errors.append("REGRESSION_CONTRACT does not supersede V50")
    if not status.get("post_v34_100_item_ledger_present"):
        errors.append("REGRESSION_CONTRACT lost 100-item ledger declaration")
    if not status.get("v46_handoff_superseded"):
        errors.append("REGRESSION_CONTRACT does not supersede V46 handoff")
    if not status.get("v45_handoff_superseded"):
        errors.append("REGRESSION_CONTRACT does not supersede V45 handoff")
    if not status.get("v44_handoff_superseded"):
        errors.append("REGRESSION_CONTRACT does not supersede V44 handoff")
    if not status.get("v41_handoff_superseded"):
        errors.append("REGRESSION_CONTRACT does not supersede V41 handoff")
    if not status.get("v40_handoff_superseded"):
        errors.append("REGRESSION_CONTRACT does not supersede V40 handoff")
    if not status.get("v39_handoff_superseded"):
        errors.append("REGRESSION_CONTRACT does not supersede V39 handoff")
    rules = contract.get("workflow_rules") or {}
    for required in [
        "verify_before_edit",
        "read_post_v34_ledger_before_edit",
        "continue_from_v49_exact_tree",
        "continue_from_v50_exact_tree",
        "preserve_implemented_vs_planned_status",
        "screenshots_are_not_colour_authority",
        "country_helper_pairing_required",
        "offline_voice_requires_target_ipad_proof",
        "final_colour_requires_cameron_approval",
        "continue_from_v51_exact_tree",
        "continue_from_v52_exact_tree",
        "v51_to_v52_17_file_changeset_must_be_preserved",
        "v52_no_allowlist_freeze_required",
        "protect_open_dialogs_and_native_pickers_from_background_rerender",
        "protect_pending_and_inflight_vault_assets",
        "service_worker_busy_window_safe_refresh_required",
        "rich_helper_screens_must_not_be_watered_down",
        "helper_78_exact_pair_required",
        "visual_reference_pack_must_be_preserved",
        "explicit_allowlist_for_changed_files",
        "javascript_must_parse_as_es_modules",
        "do_not_package_unverified_source_as_equivalent_master",
        "do_not_declare_master_while_active_audit_remains",
        "continue_from_v53_exact_tree",
        "v53_acceptance_matrix_required",
        "hash_equality_alone_is_not_acceptance",
        "deterministic_svg_interactive_icons_required",
        "v53_deep_1461_day_sweep_required_before_freeze",
        "v53_cache_identity_must_not_reuse_predecessor",
        "athens_simulation_must_branch_from_accepted_v53",
        "continue_from_v54_exact_tree",
        "v54_acceptance_matrix_required",
        "v54_effective_final_css_cascade_required",
        "v54_deep_1461_day_sweep_required_before_freeze",
        "v54_cache_identity_must_not_reuse_predecessor",
        "athens_simulation_must_branch_from_accepted_v54",
    ]:
        if rules.get(required) is not True:
            errors.append(f"REGRESSION_CONTRACT workflow rule missing/false: {required}")

    helper = contract.get("country_helper_contract") or {}
    if helper.get("home_compass_action") != "Where’s the toilet? phrase helper":
        errors.append("REGRESSION_CONTRACT Home compass action mismatch")
    if helper.get("current_destination_action") != "Country Quick Look":
        errors.append("REGRESSION_CONTRACT Current Destination action mismatch")
    if helper.get("entry_points_must_remain_distinct") is not True:
        errors.append("REGRESSION_CONTRACT lost distinct helper entry-point rule")
    if int(helper.get("current_minimum_paired_country_records") or 0) != 78:
        errors.append("REGRESSION_CONTRACT helper minimum coverage must be 78 at V52")
    if int(helper.get("helper_context_records") or 0) != 78:
        errors.append("REGRESSION_CONTRACT helper context coverage must be 78 at V52")
    if helper.get("retired_quick_look_panel") != "Current Destination Status":
        errors.append("REGRESSION_CONTRACT lost retired Current Destination Status rule")
    if helper.get("retired_toilet_panel") != "Quick Tips":
        errors.append("REGRESSION_CONTRACT lost retired Quick Tips rule")
    if helper.get("voice_offline_only") is not True:
        errors.append("REGRESSION_CONTRACT lost offline-only voice requirement")
    colour = contract.get("colour_implementation_contract") or {}
    if colour.get("palette_approved") is not False:
        errors.append("REGRESSION_CONTRACT incorrectly marks palette approved")
    if colour.get("screenshots_are_palette_authority") is not False:
        errors.append("REGRESSION_CONTRACT incorrectly treats screenshots as palette authority")
    if colour.get("explicit_user_approval_required") is not True:
        errors.append("REGRESSION_CONTRACT lost explicit colour approval requirement")
    status_matrix = contract.get("implemented_vs_planned") or {}
    if not status_matrix.get("implemented_frozen") or not status_matrix.get("planned_locked"):
        errors.append("REGRESSION_CONTRACT implemented-vs-planned status matrix missing")



def source_order(path: str, needles: list[str], errors: list[str], label: str) -> None:
    p = ROOT / path
    if not p.exists():
        errors.append(f"acceptance source missing: {path}")
        return
    text = p.read_text(encoding="utf-8", errors="replace")
    positions=[]
    cursor=0
    for needle in needles:
        pos=text.find(needle,cursor)
        if pos < 0:
            errors.append(f"{label} acceptance marker missing from {path}: {needle!r}")
            return
        positions.append(pos)
        cursor=pos+len(needle)
    if positions != sorted(positions):
        errors.append(f"{label} acceptance hierarchy regressed in {path}")


def visual_interaction_acceptance_checks(errors: list[str]) -> None:
    """Protect locked screen hierarchy/interaction semantics, not only hashes."""
    matrix=ROOT / "ACCEPTANCE_MATRIX_V54.md"
    if not matrix.exists():
        errors.append("V54 acceptance matrix is missing")
    else:
        text=matrix.read_text(encoding="utf-8", errors="replace")
        for marker in [
            "file identity alone is not acceptance", "## Home", "## Budget", "## Reservations",
            "## Itinerary", "## Calendar", "## Journey History", "## Checklist", "## The Vault",
            "## Settings", "10,227 successful builds", "Generate baseline SHA-256 manifest **last**",
            "## V54 final-cascade touch-target protection",
        ]:
            if marker not in text:
                errors.append(f"V54 acceptance matrix marker missing: {marker!r}")

    # Deterministic app-shell icon contract.
    must_contain("src_components_sidebar.js", [
        "createLineIcon(icon)", "['home', 'Home', 'home']", "['budget', 'Budget', 'budget']",
        "['reservations', 'Reservations', 'reservations']", "['itinerary', 'Itinerary', 'itinerary']",
        "['calendar', 'Calendar', 'calendar']", "['journey-history', 'Journey History', 'history']",
        "['checklist', 'Checklist', 'checklist']", "['vault', 'The Vault', 'vault']",
        "['settings', 'Settings', 'settings']", "Save button commits changes",
    ], errors)
    must_not_contain("src_components_sidebar.js", ["⌂", "◉", "✈", "▦", "◆"], errors)
    must_contain("src_components_icons.js", ["export function createLineIcon", "info:", "expand:", "plus:", "diamond:"], errors)

    # A missing stay must never imply Indonesia at the source-selection layer.
    must_contain("src_components_page-hero.js", ["if (!stay) return null;", "no-current-stay"], errors)
    must_not_contain("src_components_page-hero.js", ["if (!stay) return 'banner-indonesia';"], errors)

    # Home: exact current/next/progress + compact primary screen + distinct helpers.
    must_contain("src_screens_home.js", [
        "CURRENT DESTINATION", "home-stay-progress", "model.nextDestination", "Open Itinerary",
        "home-ref-stats", "home-ref-minis", "Global search", "showQuickLook", "showToilet",
        "PRACTICAL ESSENTIALS", "SIGNS TO LOOK FOR", "Repeat ×3", "localService===true",
    ], errors)
    source_order("src_screens_home.js", [
        "main.append(renderHero(model,state,main,navigate));",
        "main.append(stats);",
        "main.append(minis);",
        "main.append(search);",
    ], errors, "Home")

    # Budget locked hierarchy and date-routed editor. Do not reintroduce allocation pickers.
    source_order("src_screens_budget.js", [
        "main.append(createStayBanner",
        "main.append(top);",
        "main.append(add);",
        "main.append(planning);",
        "main.append(charts);",
        "main.append(livingExpenses);",
        "main.append(middle);",
        "main.append(recentExpenses,monthlyHistory);",
    ], errors, "Budget")
    must_contain("src_screens_budget.js", [
        "Current Destination Budget", "Daily & Stay Pace", "ADD EXPENSE", "Destination Budgets",
        "Budget by Category", "Year Forecast & Budget Summary", "Living Expenses", "Recent Expense Entries",
        "Monthly Spend History", "What was it for?", "How much did you pay?", "When?", "What was it?",
    ], errors)
    must_not_contain("src_screens_budget.js", ["Annual Budget allocation", "Destination Budget allocation", "allocation picker"], errors)

    # Reservations: dashboard tabs + primary/rail hierarchy.
    must_contain("src_screens_reservations.js", [
        "Booked Reservations", "reservation-dashboard-tabs", "createLineIcon(tab.type)", "ADD RESERVATION",
        "Future Bookings / To Book", "Upcoming Reservations", "Completed", "Reservation Health Check",
        "Next 5 Upcoming", "Total Booked",
    ], errors)
    must_not_contain("src_screens_reservations.js", ["Flights & Transport"], errors)
    source_order("src_screens_reservations.js", [
        "main.append(createStayBanner",
        "main.append(toolbar);",
        "left.append(tabs);",
        "left.append(addBar);",
        "left.append(toBookPanel,upcomingPanel);",
        "left.append(completed,health);",
        "rail.append(nextFive,bookedTotal);",
        "contentGrid.append(left,rail); main.append(contentGrid);",
    ], errors, "Reservations")

    # Itinerary order is the specific regression observed on the iPad.
    must_contain("src_screens_itinerary.js", [
        "Forward Coverage", "Countries Planned", "Route Trips", "Planned Stops", "Unplanned Gaps",
        "Missing Stays", "Date Overlaps", "ADD DESTINATION", "Search itinerary", "Upcoming Itinerary",
        "Forward Journey Map", "Completed Itinerary", "Starting Country",
    ], errors)
    source_order("src_screens_itinerary.js", [
        "main.append(coveragePanel,statsPanel);",
        "main.append(actionRow);",
        "main.append(controls);",
        "main.append(upcomingPanel);",
        "main.append(mapPanel);",
        "main.append(completed);",
    ], errors, "Itinerary")
    must_not_contain("src_screens_itinerary.js", ["Intentional Gap"], errors)

    # Calendar controls/icons and canonical two-view shell.
    must_contain("src_screens_calendar.js", [
        "createStayBanner", "Month", "Agenda", "createLineIcon('chevronLeft')", "createLineIcon('chevronRight')",
        "createLineIcon('plus')", "calendar-legend", "renderAgenda", "renderMonth",
    ], errors)
    must_not_contain("src_screens_calendar.js", ["'+ Note'", "\"+ Note\""], errors)
    source_order("src_screens_calendar.js", [
        "main.append(createStayBanner",
        "main.append(controls);",
        "main.append(legend);",
        "main.append(model.view === 'agenda' ? renderAgenda(model, handlers) : renderMonth(model, handlers));",
    ], errors, "Calendar")

    # Journey History strong reference hierarchy.
    must_contain("src_screens_journey-history.js", [
        "Countries Visited", "Destinations Completed", "Days Travelled", "Years on the Road", "Lifetime Travel Spend",
        "Journey Map", "Journey Snapshot", "Milestones", "Destination Totals", "Travel Mix", "No entries yet",
    ], errors)
    source_order("src_screens_journey-history.js", [
        "main.append(createPageHero",
        "main.append(renderSummary(lifetimeModel));",
        "main.append(renderMap",
        "main.append(analytics);",
        "main.append(insightRow);",
        "main.append(renderRecordFilters",
    ], errors, "Journey History")

    # Checklist locked hierarchy and deterministic informational icon.
    must_contain("src_screens_checklist.js", [
        "Ready to Move", "Hers · Needs & Wants", "His · Needs & Wants", "Permanent Checklist",
        "Destination Checklist", "Checklist Overview", "Next Destination", "Checklist History", "createLineIcon('info')",
    ], errors)
    must_not_contain("src_screens_checklist.js", ["ⓘ"], errors)
    source_order("src_screens_checklist.js", [
        "primary.append(ready,stages,owners);",
        "primary.append(requiredGrid);",
        "rail.append(overview,nextDestination);",
        "main.append(layout,renderHistory(model,openAny));",
    ], errors, "Checklist")

    # Vault must not fall back to platform emoji category icons.
    must_contain("src_screens_vault.js", [
        "VAULT_ICON_PATHS", "vaultCategoryIcon", "Passports", "Emergency Travel Card", "Recent Activity", "Streaming",
        "openAttachmentPicker", "renderHiddenEmails",
    ], errors)
    must_contain("src_core_vault-view-model.js", [
        "passport:'passport'", "visa:'visa'", "insurance:'insurance'", "accommodation:'accommodation'", "emergency:'emergency'",
    ], errors)
    must_not_contain("src_core_vault-view-model.js", ["🛂", "🎫", "🛡", "🏨", "✚"], errors)
    must_contain("src_main.js", ["canRevealHiddenEmails", "revealHiddenEmails"], errors)
    must_contain("src_core_vault-access.js", ["streamingOpenedSinceUnlock", "ui.activeSection === 'streaming'"], errors)

    # Settings core acceptance structure.
    must_contain("src_screens_settings.js", [
        "App Health", "Travel & Budget Defaults", "Schengen Status", "Manual · Offline", "Security",
        "Backup & Restore", "Restore validates the entire backup before replacing current data", "Application",
    ], errors)

    # Explicitly prevent the exact font-glyph regressions observed in the bad build.
    for path in ["src_screens_home.js", "src_screens_calendar.js", "src_screens_checklist.js"]:
        text=(ROOT/path).read_text(encoding="utf-8", errors="replace") if (ROOT/path).exists() else ""
        for glyph in ["⌂", "◉", "✈", "▦", "ⓘ"]:
            if glyph in text:
                errors.append(f"font-dependent interactive glyph regressed in {path}: {glyph!r}")



def final_touch_target_cascade_checks(errors: list[str]) -> None:
    """Protect the *effective final* 44px iPad control size, not a stale earlier marker."""
    p = ROOT / "src_design_reference-pass.css"
    if not p.exists():
        errors.append("V54 final touch-target stylesheet is missing")
        return
    text = p.read_text(encoding="utf-8", errors="replace")
    marker = "V54 final iPad touch-target cascade guard"
    if marker not in text:
        errors.append("V54 final touch-target cascade guard marker is missing")
        return
    clean = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    protected = [
        '[data-screen="reservations"] .reservation-flight-scope-tile',
        '[data-screen="itinerary"] .itinerary-coverage-switch',
    ]
    rules = list(re.finditer(r"([^{}]+)\{([^{}]*)\}", clean, flags=re.S))
    for selector in protected:
        seen=[]
        for match in rules:
            selector_text=" ".join(match.group(1).split())
            if selector not in selector_text:
                continue
            heights=[float(value) for value in re.findall(r"\bmin-height\s*:\s*(\d+(?:\.\d+)?)px", match.group(2))]
            if heights:
                seen.append((match.start(), heights[-1], selector_text))
        if not seen:
            errors.append(f"V54 protected touch target has no min-height rule: {selector}")
            continue
        _, final_height, final_selector = max(seen, key=lambda item:item[0])
        if final_height < 44:
            errors.append(f"V54 effective final touch target regressed below 44px: {selector} -> {final_height:g}px via {final_selector}")


def deep_acceptance_checks(errors: list[str]) -> None:
    node=shutil.which("node")
    script=ROOT / "v54_deep_acceptance.mjs"
    if not node:
        errors.append("V54 deep acceptance requires Node.js")
        return
    if not script.exists():
        errors.append("V54 deep acceptance script is missing")
        return
    common=subprocess.run([node,str(script)],cwd=ROOT,capture_output=True,text=True)
    if common.returncode != 0:
        errors.append("V54 deep migration/routing/backup acceptance failed: " + ((common.stderr or common.stdout).strip().splitlines()[-1] if (common.stderr or common.stdout).strip() else "unknown error"))
        return

    start=date(2027,1,14); end=date(2031,1,13)
    total_days=(end-start).days+1
    workers=8
    base,extra=divmod(total_days,workers)
    chunks=[]; cur=start
    for i in range(workers):
        size=base+(1 if i<extra else 0)
        chunk_end=cur+timedelta(days=size-1)
        chunks.append((cur.isoformat(),chunk_end.isoformat()))
        cur=chunk_end+timedelta(days=1)

    def run_chunk(pair):
        a,b=pair
        proc=subprocess.run([node,str(script),"--chunk",a,b],cwd=ROOT,capture_output=True,text=True)
        if proc.returncode != 0:
            raise RuntimeError((proc.stderr or proc.stdout).strip() or f"chunk {a}..{b} failed")
        return json.loads(proc.stdout.strip().splitlines()[-1])

    results=[]
    try:
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures=[pool.submit(run_chunk,pair) for pair in chunks]
            for future in as_completed(futures): results.append(future.result())
    except Exception as exc:
        errors.append(f"V54 continuous model sweep failed: {exc}")
        return
    days=sum(int(r.get("days",0)) for r in results)
    builds=sum(int(r.get("builds",0)) for r in results)
    if days != 1461 or builds != 10227:
        errors.append(f"V54 continuous model sweep count mismatch: {days} days / {builds} builds")

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--verify", action="store_true", help="verify frozen baseline/working copy")
    ap.add_argument("--allow-changes", nargs="*", default=[], metavar="PATH", help="explicitly intentional changed files")
    ap.add_argument("--deep", action="store_true", help="run V54 migration/routing/backup probes plus the full 1,461-day / 10,227-model sweep")
    args = ap.parse_args()
    if not args.verify:
        ap.error("use --verify")

    allowed = {Path(x).as_posix().lstrip("./") for x in args.allow_changes}
    errors: list[str] = []
    warnings: list[str] = []

    try:
        entries = load_manifest()
    except Exception as exc:
        print(f"FAILED — {exc}")
        return 2

    expected_files = set(entries) | {"BASELINE_SHA256.txt"}
    actual_files = rel_files()

    for path in sorted(expected_files - actual_files):
        errors.append(f"missing baseline file: {path}")
    for path in sorted(actual_files - expected_files):
        if path in allowed:
            warnings.append(f"allowed extra file: {path}")
        else:
            errors.append(f"unexpected file: {path}")

    changed: list[str] = []
    for path, expected_hash in sorted(entries.items()):
        p = ROOT / path
        if not p.exists():
            continue
        actual_hash = sha256(p)
        if actual_hash != expected_hash:
            changed.append(path)
            if path not in allowed:
                errors.append(f"unapproved change: {path}")

    for path in sorted(allowed - set(changed) - (actual_files - expected_files)):
        warnings.append(f"allow-list entry is unchanged/not present: {path}")

    static_continuity_checks(errors)
    js_module_syntax_checks(errors)
    css_structure_checks(errors)
    service_worker_shell_checks(errors)
    contract_checks(errors)
    visual_interaction_acceptance_checks(errors)
    final_touch_target_cascade_checks(errors)
    if args.deep:
        deep_acceptance_checks(errors)

    if warnings:
        print("WARNINGS:")
        for w in warnings:
            print(f"  - {w}")

    if errors:
        print("FAILED — REGRESSION GUARD")
        for e in errors:
            print(f"  - {e}")
        return 1

    if allowed:
        print(f"PASSED — BASELINE PROTECTED; {len(changed)} ALLOW-LISTED CHANGE(S)")
    else:
        print("PASSED — BASELINE VERIFIED")
    print(f"Protected manifest entries: {len(entries)}")
    print(f"Package files: {len(actual_files)}")
    print("NOTE — This is the V54 touch-target-completion candidate, not Gold/Master Lock. File identity, locked screen hierarchy and deep migrated-state behaviour are protected; physical target-iPad visual/offline-voice/practical-Vault/final-colour acceptance remains outstanding.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
