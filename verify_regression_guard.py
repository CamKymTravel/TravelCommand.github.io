#!/usr/bin/env python3
"""Travel Command Centre V1 continuity / anti-regression verifier.

V52 ACTIVE NO-LOSS CONTINUITY BASELINE — 4 September 2026 AEST.

This verifier freezes the exact V51 working tree after rich 78-country helpers and material-depth pass 5, while preserving the 100-item historical no-loss ledger. It is a continuity baseline, not a release/master approval.

Before any edit:
    python3 verify_regression_guard.py --verify

During a focused batch:
    python3 verify_regression_guard.py --verify --allow-changes file1 file2

A successful no-allow-list verification means the extracted handoff matches
this frozen V52 baseline exactly. It does not waive the still-active target-iPad/offline-voice/Vault/final-colour work in OUTSTANDING_WORK.md.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / "BASELINE_SHA256.txt"
CONTRACT = ROOT / "REGRESSION_CONTRACT.json"
LEDGER = ROOT / "OUTSTANDING_WORK.md"
IGNORED_NAMES = {".DS_Store", "Thumbs.db"}
BASELINE_ID = "V52_ACTIVE_NO_LOSS_2026-09-04_AEST"
CACHE_ID = "tcc-v1-v50-global-material-depth-pass-5-2026-09-04"
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
    must_contain("src_core_schema.js", ["1.2.0-v49-ipad-full-screenshot-repair"], errors)
    must_contain("src_components_sidebar.js", ["Primary navigation", "Travel Command Centre sidebar", "brand-compass-svg", "Where's the toilet?"] , errors)
    must_contain("src_components_modal.js", ["preserveLocalFocus", "restoreLocalFocus", "main[data-screen]", "inferExpandedTone", "dataset.expandTone", "semanticTone", "resolvedTone"], errors)
    must_contain("src_screens_calendar.js", ["day.setAttribute('role', 'group')", "Previous month from", "Next month from"], errors)
    must_contain("src_screens_reservations.js", ["Reservation summary", "Booked Reservations", "title:'Next 5 Upcoming',tone:'red'"] , errors)
    must_not_contain("src_screens_reservations.js", ["Flights & Transport"], errors)
    must_contain("src_components_page-hero.js", ["if (!stay) return 'banner-indonesia';"], errors)
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


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--verify", action="store_true", help="verify frozen baseline/working copy")
    ap.add_argument("--allow-changes", nargs="*", default=[], metavar="PATH", help="explicitly intentional changed files")
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
    print("NOTE — This is the V52 active no-loss continuity baseline, not a release/master declaration. All 17 post-V51 fixes plus rich 78-country helpers are frozen; target-iPad offline-voice/helper/update proof, final colour approval and practical Vault validation remain active before master/Gold Lock.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
