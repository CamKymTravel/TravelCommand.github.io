#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, re, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parent
CONTRACT=ROOT/'release-contract.json'
EXPECTED_COUNT=103
MARKER='v60-r7.3-screen-closure-2026-09-15-s39'
CACHE='tcc-v1-'+MARKER
STORAGE='tcc:v1:tokyo-4year-full-simulation-s38-real-ipad'
SW_URL='./sw.js?v=60-r7.3-screen-closure-2026-09-15-s39'

class GuardFailure(RuntimeError): pass

def req(cond,msg):
    if not cond: raise GuardFailure(msg)

def text(name): return (ROOT/name).read_text(encoding='utf-8',errors='strict')
def sha256(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for b in iter(lambda:f.read(1024*1024),b''): h.update(b)
    return h.hexdigest()

def verify_structure(contract):
    files=[p for p in ROOT.iterdir() if p.is_file()]
    req(len(files)==EXPECTED_COUNT,f'expected {EXPECTED_COUNT} top-level files, found {len(files)}')
    names={p.name for p in files}
    required={
      'index.html','manifest.webmanifest','release-contract.json','CONTINUITY_FULL_BUILD_PROTOCOL_AND_GUARD.py','sw.js',
      'header-index.json','header-assets.bin','tokyo-4year-simulation-fixture.json','app-icon.png',
      'startup-ipad-1024-landscape.png','startup-ipad-1194-landscape.png',
      'src_main.js','src_components_modal.js','src_components_page-hero.js','src_design_locked_contract.css',
      'src_screens_home.js','src_screens_itinerary.js','src_screens_budget.js','src_screens_reservations.js',
      'src_screens_calendar.js','src_screens_journey-history.js','src_screens_checklist.js','src_screens_vault.js','src_screens_settings.js'
    }
    req(required<=names,'missing required source files: '+', '.join(sorted(required-names)))
    req('_header-vault.jpg' not in names,'audit-only _header-vault.jpg leaked into app source')
    header=json.loads(text('header-index.json'))
    req(isinstance(header,dict) and len(header)==86,f'expected 86 header assets, got {len(header) if isinstance(header,dict) else "invalid"}')
    req(contract.get('package',{}).get('maxFiles')==103,'contract maxFiles is not 103')
    req(contract.get('package',{}).get('requiredHeaderAssets')==86,'contract requiredHeaderAssets is not 86')

def verify_runtime(contract):
    idx=text('index.html'); sw=text('sw.js'); main=text('src_main.js'); rc=text('src_core_runtime-config.js')
    manifest=json.loads(text('manifest.webmanifest'))
    req('S39 Screen Closure Acceptance' in idx,'index title is not S39 screen-closure acceptance candidate')
    req(STORAGE in idx,'index storageKey continuity changed unexpectedly')
    req(SW_URL in idx,'index serviceWorkerUrl is not S39')
    req(CACHE in sw,'service-worker cache identity is not S39')
    req(MARKER in main,'App Health build marker is not S39')
    req(SW_URL in rc,'runtime fallback service-worker URL is not S39')
    req(manifest.get('id')=='./tokyo-4year-full-simulation-s38','manifest id continuity changed unexpectedly')
    req(manifest.get('short_name')=='Travel Command','manifest short_name is not the clean Travel Command identity')
    p=contract['package']; r=contract['runtimeIdentity']
    req(p['cacheName']==CACHE and p['buildMarker']==MARKER,'contract package runtime identity mismatch')
    req(r['cacheName']==CACHE and r['buildMarker']==MARKER and r['serviceWorkerUrl']==SW_URL,'contract runtimeIdentity mismatch')
    # Active runtime source must not regress to an earlier simulation identity.
    stale_runtime_tokens=['v58-r7.2-real-ipad-correction-2026-09-14-s38','TCC Tokyo S38','Tokyo S38 Real-iPad Correction','v57-r7.2-forward-preipad-simulation-2026-09-14-s37','tokyo-4year-full-simulation-s37-preipad','v56-r7.2-forward-triplecheck-2026-09-14-s36','tokyo-4year-full-simulation-s36-triplecheck-working']
    for name in ['index.html','sw.js','src_main.js','src_core_runtime-config.js','manifest.webmanifest']:
        value=text(name)
        req(not any(token in value for token in stale_runtime_tokens),f'stale predecessor active runtime identity in {name}')
        req('s35' not in value.lower(),f'stale S35 active identity in {name}')

def verify_visual_closure(contract):
    css=text('src_design_locked_contract.css'); finish=text('src_design_finish-pass.css')
    home=text('src_screens_home.js'); budget=text('src_screens_budget.js'); reservations=text('src_screens_reservations.js')
    calendar=text('src_screens_calendar.js'); itinerary=text('src_screens_itinerary.js'); journey=text('src_screens_journey-history.js')
    checklist=text('src_screens_checklist.js'); vault=text('src_screens_vault.js'); settings=text('src_screens_settings.js'); modal=text('src_components_modal.js')
    for lock in ['S36 LOCK 26','S36 LOCK 27','S36 LOCK 28','S36 LOCK 29','S36 LOCK 30','S36 LOCK 31','S36 LOCK 32','S36 LOCK 33','S36 LOCK 34']:
        req(lock in css,f'missing {lock}')
    req('tcc-expanded-inherits-source' in modal and 'data-expand-tone' in modal,'expanded-widget source-colour plumbing missing')
    req('budget-destination-budgets-card' in css and "dataset.expandTone='violet'" in budget,'Destination Budgets approved violet source/manager lock missing')
    req("tcc-budget-destination-editor-modal tone-sky" in budget,'Destination Budget editor is not sky')
    req("tcc-editor-modal tcc-reservation-editor-modal tone-sky" in reservations,'Reservation editor is not sky')
    req("calendar-day-detail-modal tone-neutral" in calendar,'Calendar day-detail neutral shell missing')
    req("tcc-editor-modal tcc-calendar-editor-modal tone-neutral" in calendar,'Calendar editor neutral shell missing')
    req("tcc-vault-editor-modal tone-neutral" in vault,'Vault editor neutral shell missing')
    req("tcc-checklist-editor-modal tone-neutral" in checklist,'Checklist editor neutral shell missing')
    req("tone-neutral itinerary-route-picker-modal" in itinerary,'Itinerary route picker neutral shell missing')
    req('journey-record-tone-' in journey,'Journey row travel-mode colour identity missing')
    req('home-alert-compact-copy' in home,'Home compact Alert readability structure missing')
    req('min-height:44px' in css and 'IPAD TOUCH TARGET CLOSURE' in css,'44px iPad touch closure missing')
    req('VAULT HEADER BAKED-STATUS MASK' in css,'Vault baked-status mask missing')
    req('HOME 1024 COMPACT READABILITY' in css,'Home 1024 clipping lock missing')
    req('DESTINATION BUDGET SUMMARY VALUE GLYPH CLOSURE' in css,'Destination Budget glyph clipping lock missing')
    req("title:'Alerts',tone:'red'" in home,'Home Alerts expanded tone is not red')
    req('Add Account' not in budget and 'openAccountEditor' not in budget,'Accounts editing UI/code revived')
    req('Read-only travel-money snapshot' in budget,'Accounts read-only snapshot missing')
    req('S37 pre-simulation narrow itinerary identity closure' in finish,'S37 itinerary country/type wrap closure missing')
    req('grid-template-columns:145px minmax(180px,1.18fr) minmax(120px,.67fr) minmax(185px,.92fr)' in finish,'S37 1024 Itinerary budget-width closure missing')
    req('budget-editor-step-detail-simple input { min-height:44px' in finish,'S37 Add Expense description touch closure missing')
    req('reservation-row-completed' in reservations and 'reservation-row-completed' in css,'S37 completed reservation row silver-state plumbing missing')
    req('S38 REAL-IPAD CORRECTION' in css,'S38 real-iPad correction CSS authority missing')
    req('datedEvents.slice(0, 5)' in calendar,'S38 five-item Calendar day capacity missing')
    req('budget-annual-manager' in budget and 'budget-annual-main-value' in finish,'S38 Annual Budget manager/main-card ownership correction missing')
    req('budget-expense-aud-equivalent' in budget and 'reservation-money-aud' in reservations,'S38 money-readability plumbing missing')
    req("editorTone:'gold'" in checklist,'S38 Checklist permanent gold identity missing')
    req("['play','Play',.62" in home and "['slow','Slow',.24" in home,'S38 slower helper speech rates missing')
    req('height:230px !important' in css,'S38 unified 230px picture-header rule missing')
    req('S38 REAL-IPAD CLOSURE 5' in css and 'vault-category-card .vault-category-icon' in css,'S38 Reservations/Vault Journey-style icon-tile authority missing')
    # Explicit user rule must remain in contract.
    rules='\n'.join(contract.get('hardVisualRules',[]))
    req('expanded widget preserves the same colour family' in rules.lower(),'contract lost expanded=source colour rule')

def verify_handoff(contract):
    req(contract.get('promotion',{}).get('finalMaster')=='BLOCKED','FINAL MASTER promotion must remain blocked pre-iPad')
    gates=contract.get('physicalIpadAcceptance',[])
    req([g.get('id') for g in gates]==['G-020', 'G-027', 'HOME-013', 'HOME-014', 'RES-009', 'CAL-005', 'CAL-006', 'JH-003', 'JH-007', 'VAULT-005', 'VAULT-006', 'VAULT-007', 'VAULT-008', 'VAULT-009', 'VAULT-011', 'SET-009'],'physical-iPad gate list does not match the 16-rule current authority')
    req(all(g.get('status')=='NOT_RUN' for g in gates),'iPad gate status changed without real device evidence')
    handoff=contract.get('handoffInstruction','')
    req('Continue only from this S39 source' in handoff,'handoff is not forward-only S39')
    req('Do not return to S38/S37/S36/S35/S34/S33' in handoff,'handoff does not explicitly block rollback')
    reg=contract.get('screenClosureRegister',{})
    req(set(reg)>= {'Home','Itinerary','Budget','Reservations','Calendar','Journey History','Checklist','The Vault','Settings','Global'},'screen closure register incomplete')

def verify_source_seal(contract):
    seal=contract.get('sourceSeal')
    req(isinstance(seal,dict),'sourceSeal missing')
    expected=seal.get('files')
    req(isinstance(expected,dict) and len(expected)==102,f'expected 102 sealed non-contract files, got {len(expected) if isinstance(expected,dict) else "invalid"}')
    current={p.name:sha256(p) for p in sorted(ROOT.iterdir()) if p.is_file() and p.name!='release-contract.json'}
    req(current==expected,'source seal mismatch: one or more non-contract app-source files changed')
    digest=hashlib.sha256(json.dumps(expected,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    req(seal.get('digest')==digest,'sourceSeal digest mismatch')

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--mode',choices=['working','sealed'],default='working'); args=ap.parse_args()
    contract=json.loads(CONTRACT.read_text())
    verify_structure(contract); verify_runtime(contract); verify_visual_closure(contract); verify_handoff(contract)
    if args.mode=='sealed': verify_source_seal(contract)
    print(f'PASS S39 continuity guard ({args.mode}) — 103 files, S39 screen-closure identity, software closure and forward-only handoff intact')

if __name__=='__main__':
    try: main()
    except GuardFailure as e:
        print('FAIL S39 continuity guard:',e,file=sys.stderr); sys.exit(1)
