#!/usr/bin/env python3
from pathlib import Path
import argparse, hashlib, json, sys
ROOT=Path(__file__).resolve().parent
MANIFEST=ROOT/'WORKING_CHECKPOINT_MANIFEST_V55.json'
MANIFEST_NAME=MANIFEST.name
MAX_FILES=99

def sha(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):
            h.update(chunk)
    return h.hexdigest()

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--verify',action='store_true')
    args=parser.parse_args()
    if not args.verify:
        print('usage: verify_working_checkpoint_v55.py --verify')
        return 2
    if not MANIFEST.exists():
        print('FAIL — working checkpoint manifest missing')
        return 1
    data=json.loads(MANIFEST.read_text())
    expected=data.get('files',{})
    errors=[]
    for name,meta in expected.items():
        path=ROOT/name
        if not path.is_file():
            errors.append(f'missing: {name}')
            continue
        if path.stat().st_size!=meta['size']:
            errors.append(f'size changed: {name}')
        if sha(path)!=meta['sha256']:
            errors.append(f'hash changed: {name}')
    # Count and verify every extracted file recursively. The simulation package
    # is intentionally flat and must remain strictly under 100 files; generated
    # artifacts such as __pycache__ must never slip through a top-level-only count.
    actual={p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*') if p.is_file()}
    expected_set=set(expected)|{MANIFEST_NAME}
    for name in sorted(actual-expected_set):
        errors.append(f'unexpected: {name}')
    for name in sorted(expected_set-actual):
        errors.append(f'missing: {name}')
    if len(actual)>MAX_FILES:
        errors.append(f'file cap exceeded: {len(actual)} > {MAX_FILES} (recursive extracted-file count)')

    # Athens simulation derivative semantic boot contract. The downloadable
    # screenshot build must open the Athens fixture even when an older iPad
    # Home Screen shortcut drops the manifest's ?simulation=1 query string.
    try:
        index=(ROOT/'index.html').read_text()
        runtime=(ROOT/'src_core_runtime-config.js').read_text()
        worker=(ROOT/'sw.js').read_text()
        manifest=json.loads((ROOT/'manifest.webmanifest').read_text())
        if 'const forceAthensSimulation = true;' not in index or 'if (forceAthensSimulation ||' not in index:
            errors.append('Athens simulation plain-index boot guard missing')
        if manifest.get('start_url') != './index.html?simulation=1':
            errors.append('Athens simulation manifest start_url changed')
        import re
        index_versions=set(re.findall(r"sw\.js\?v=([A-Za-z0-9._-]+)",index))
        runtime_versions=set(re.findall(r"sw\.js\?v=([A-Za-z0-9._-]+)",runtime))
        cache_match=re.search(r"CACHE_NAME\s*=\s*['\"]([^'\"]+)",worker)
        if len(index_versions)!=1 or len(runtime_versions)!=1 or index_versions!=runtime_versions:
            errors.append('service-worker registration generation mismatch')
        expected_generation=next(iter(index_versions),None)
        cache_name=cache_match.group(1) if cache_match else ''
        if expected_generation and expected_generation not in cache_name:
            errors.append('service-worker cache generation does not match boot generation')
        main_source=(ROOT/'src_main.js').read_text()
        if "runtimeConfig.mode !== 'production' || !navigator.storage?.persist" in main_source:
            errors.append('Athens simulation skips persistent-storage safeguard')
        if "if (!navigator.storage?.persist) return;" not in main_source:
            errors.append('shared persistent-storage safeguard missing')
        if 'shouldInstallRuntimeFixture' not in main_source or 'stampRuntimeFixtureRevision' not in main_source:
            errors.append('atomic simulation fixture-revision boot guard missing')
        if 'simulationFixtureRevision' not in runtime:
            errors.append('embedded simulation fixture revision support missing')
        if 'if (!installed) return false;' not in runtime:
            errors.append('missing sidecar marker can destructively reseed existing simulation state')
        entities=(ROOT/'src_core_entities.js').read_text()
        if 'export function canonicalCountrySlug' not in entities or "'türkiye':'turkey'" not in entities:
            errors.append('canonical launch-country alias helper missing Türkiye mapping')
        if "const key=canonicalCountrySlug(country);" not in main_source:
            errors.append('launch flag renderer bypasses canonical country normalisation')
        if "import { findCurrentStay } from './src_core_planning.js';" not in main_source or 'const stay=findCurrentStay(stateService.state.itinerary||[],today);' not in main_source:
            errors.append('launch sequence is not using canonical findCurrentStay parity with Home')
    except Exception as error:
        errors.append(f'Athens boot contract could not be verified: {error}')

    # Active continuity authority must never point back to a historical baseline.
    try:
        contract=json.loads((ROOT/'REGRESSION_CONTRACT.json').read_text())
        outstanding=(ROOT/'OUTSTANDING_WORK.md').read_text()
        next_handoff=(ROOT/'NEXT_CHAT_START_HERE_V55.md').read_text()
        rules=contract.get('workflow_rules',{})
        if contract.get('baseline_id') != 'V55_ATHENS_SIMULATION_R13_2026-09-05_AEST':
            errors.append('active continuity baseline_id is not Athens R13')
        if not rules.get('continue_from_v55_athens_r13_exact_tree'):
            errors.append('active workflow does not require exact Athens R13 continuation')
        stale=[k for k,v in rules.items() if k.startswith('continue_from_v') and k!='continue_from_v55_athens_r13_exact_tree' and v is True]
        if stale:
            errors.append('historical continue-from rules still active: '+', '.join(sorted(stale)))
        if rules.get('athens_simulation_must_branch_from_accepted_v53') or rules.get('athens_simulation_must_branch_from_accepted_v54'):
            errors.append('historical Athens branch rule still active')
        carry=contract.get('active_carry_forward',[])
        if not carry or 'exact V55 Athens R13 working checkpoint' not in str(carry[0]):
            errors.append('active carry-forward does not name exact Athens R13 checkpoint')
        if any(('exact V55 Athens R8' in str(x) or 'exact V55 Athens R9' in str(x) or 'exact V55 Athens R10' in str(x) or 'exact V55 Athens R11' in str(x)) for x in carry):
            errors.append('active carry-forward still names superseded R8/R9/R10/R11 checkpoint')
        if not rules.get('simulation_requests_persistent_storage_when_available'):
            errors.append('active workflow does not protect simulation persistent-storage parity')
        if not rules.get('simulation_fixture_revision_embedded_in_canonical_state'):
            errors.append('active workflow does not protect embedded simulation fixture revision')
        if not rules.get('missing_simulation_fixture_marker_must_not_reseed_existing_state'):
            errors.append('active workflow does not protect missing-marker simulation state')
        if not rules.get('launch_country_aliases_must_be_canonical_before_flag_lookup'):
            errors.append('active workflow does not protect launch-country alias canonicalisation')
        if not rules.get('launch_current_stay_must_match_home_findCurrentStay'):
            errors.append('active workflow does not protect launch/Home canonical current-stay parity')
        if 'install the exact R13 ZIP' not in outstanding:
            errors.append('active iPad acceptance instruction does not name exact R13 ZIP')
        if 'V55 Athens Simulation R13 Handoff' not in next_handoff:
            errors.append('next-chat handoff is not R13')
    except Exception as error:
        errors.append(f'continuity authority contract could not be verified: {error}')
    if errors:
        print('FAIL — V55 working checkpoint differs')
        for error in errors:
            print(' -',error)
        return 1
    overrides=data.get('intentional_overrides',[])
    print(f"PASS — V55 working checkpoint ({len(expected)} hashed files + manifest; {len(overrides)} intentional baseline overrides; {len(actual)} total files)")
    return 0

if __name__=='__main__':
    sys.exit(main())
