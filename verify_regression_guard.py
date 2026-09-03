#!/usr/bin/env python3
"""Travel Command Centre V1 continuity / anti-regression verifier.

V44 IPAD VISUAL CANDIDATE — 3 September 2026 AEST.

This verifier freezes the exact current 99-file V44 iPad visual candidate working tree plus the
100-item no-loss ledger. It is a continuity baseline, not a release/master
approval.

Before any edit:
    python3 verify_regression_guard.py --verify

During a focused batch:
    python3 verify_regression_guard.py --verify --allow-changes file1 file2

A successful no-allow-list verification means the extracted handoff matches
this frozen V44 baseline exactly. It does not waive the still-active final
visual/date/accessibility forensic work in OUTSTANDING_WORK.md.
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
BASELINE_ID = "V44_IPAD_VISUAL_CANDIDATE_2026-09-03_AEST"
CACHE_ID = "tcc-v1-v44-ipad-visual-candidate-2026-09-03"
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
        "V44 IPAD VISUAL CANDIDATE",
        "PASSED — BASELINE VERIFIED",
        "This V44 package is now the authority",
        "Active work that MUST continue",
        "Critical no-loss instruction",
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
        "V44 iPad visual candidate authority",
    ], errors)
    must_contain("OUTSTANDING_WORK.md", [
        "V44 iPad Visual Candidate / No-Loss Ledger",
        "Critical recovery note",
        "Still-active audit state",
        "Post‑V34 mandatory implementation ledger",
        "Permanent Checklist completion is scoped per move/destination",
        "Regression protocol for the next chat",
    ], errors)

    if LEDGER.exists():
        text = LEDGER.read_text(encoding="utf-8", errors="replace")
        items = re.findall(r"(?m)^(\d+)\.\s", text)
        numbered = {int(x) for x in items if 1 <= int(x) <= EXPECTED_LEDGER_ITEMS}
        missing = sorted(set(range(1, EXPECTED_LEDGER_ITEMS + 1)) - numbered)
        if missing:
            errors.append(f"100-item no-loss ledger incomplete; missing item(s): {missing}")

    must_contain("sw.js", [CACHE_ID, "CACHE_PREFIX", "request.mode === 'navigate'"], errors)
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
    must_contain("src_core_schema.js", ["1.2.0-v44-ipad-visual-candidate"], errors)
    must_contain("src_components_sidebar.js", ["Primary navigation", "Travel Command Centre sidebar"], errors)
    must_contain("src_components_modal.js", ["preserveLocalFocus", "restoreLocalFocus", "main[data-screen]"], errors)
    must_contain("src_screens_calendar.js", ["day.setAttribute('role', 'group')", "Previous month from", "Next month from"], errors)
    must_contain("src_screens_reservations.js", ["Reservation summary"], errors)
    must_contain("src_screens_checklist.js", ["Checklist summary"], errors)
    must_contain("src_screens_itinerary.js", ["Unplanned Gaps", "Starting Country"], errors)
    must_contain("src_screens_budget.js", ["Year Forecast & Budget Summary"], errors)
    must_contain("src_screens_journey-history.js", ["No entries yet"], errors)


    refs = sorted(ROOT.glob("REF_*.jpeg"))
    if len(refs) != 19:
        errors.append(f"expected 19 visual reference screenshots, found {len(refs)}")
    for req in [
        "header-assets.bin", "header-index.json", "index.html", "manifest.webmanifest",
        "simulation-data.json", "CONTINUITY_START_HERE.md", "LOCKED_REQUIREMENTS.md",
        "OUTSTANDING_WORK.md", "REGRESSION_CONTRACT.json",
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
    if not status.get("full_v44_ipad_visual_candidate_tree_present"):
        errors.append("REGRESSION_CONTRACT lost V44 iPad visual candidate tree declaration")
    if not status.get("post_v34_100_item_ledger_present"):
        errors.append("REGRESSION_CONTRACT lost 100-item ledger declaration")
    if not status.get("v43_handoff_superseded"):
        errors.append("REGRESSION_CONTRACT does not supersede V43 handoff")
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
        "continue_from_v44_exact_tree",
        "explicit_allowlist_for_changed_files",
        "javascript_must_parse_as_es_modules",
        "do_not_package_unverified_source_as_equivalent_master",
        "do_not_declare_master_while_active_audit_remains",
    ]:
        if rules.get(required) is not True:
            errors.append(f"REGRESSION_CONTRACT workflow rule missing/false: {required}")


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
    print("NOTE — This is the V44 iPad visual candidate continuity baseline, not a release/master declaration. Complete the target-iPad pass before master/Gold Lock.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
