#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, re, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parent
CONTRACT=ROOT/'release-contract.json'
EXPECTED_COUNT=108
MARKER='v60-r7.4-tiny-currency-ui-2026-09-17-s53-v17'
CACHE='tcc-v1-v60-r7.4-s53-tiny-currency-ui-2026-09-17-v17'
STORAGE='tcc:v1:tokyo-full-simulation-s40-real-ipad-v1'
SW_URL='./sw.js?v=60-r7.4-s53-tiny-currency-ui-2026-09-17-v17'

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
      'header-index.json','header-assets.bin','tokyo-4year-simulation-fixture.json','istanbul-4year-simulation-fixture.json','app-icon.png',
      'startup-ipad-1024-landscape.png','startup-ipad-1180-landscape.png','startup-ipad-1194-landscape.png','startup-ipad-1024-portrait.png','startup-ipad-1180-portrait.png','startup-ipad-1194-portrait.png',
      'src_main.js','src_components_modal.js','src_components_page-hero.js','src_components_sidebar.js','src_design_locked_contract.css',
      'src_core_account-mutations.js','src_screens_home.js','src_screens_itinerary.js','src_screens_budget.js','src_screens_reservations.js',
      'src_screens_calendar.js','src_screens_journey-history.js','src_screens_checklist.js','src_screens_vault.js','src_screens_settings.js'
    }
    req(required<=names,'missing required source files: '+', '.join(sorted(required-names)))
    req('_header-vault.jpg' not in names,'audit-only _header-vault.jpg leaked into app source')
    header=json.loads(text('header-index.json'))
    req(isinstance(header,dict) and len(header)==86,f'expected 86 header assets, got {len(header) if isinstance(header,dict) else "invalid"}')
    pkg=contract.get('package',{})
    req(pkg.get('maxFiles')==EXPECTED_COUNT,f'contract maxFiles is not {EXPECTED_COUNT}')
    req(pkg.get('requiredHeaderAssets')==86,'contract requiredHeaderAssets is not 86')

def verify_runtime(contract):
    idx=text('index.html'); sw=text('sw.js'); main=text('src_main.js'); rc=text('src_core_runtime-config.js')
    manifest=json.loads(text('manifest.webmanifest'))
    req('S53 Tiny-Currency UI Consistency Candidate' in idx,'index title is not S52 tiny-currency candidate')
    req(STORAGE in idx,'index storageKey changed; S53 must preserve the Tokyo simulation data store')
    req(SW_URL in idx,'index serviceWorkerUrl is not S53/v17')
    req(CACHE in sw,'service-worker cache identity is not S53/v17')
    req(MARKER in main,'App Health build marker is not S53')
    req(SW_URL in rc,'runtime fallback service-worker URL is not S53/v17')
    req(manifest.get('id')=='./tokyo-full-simulation-s40-2030-02-20-v1','manifest id is not the S40 Tokyo simulation identity')
    req(manifest.get('short_name')=='Travel Command','manifest short_name is not the clean Travel Command identity')
    req(manifest.get('orientation')=='any','manifest must allow both landscape and upright/portrait iPad use')
    req('S40 Tokyo full populated simulation' not in manifest.get('description',''),'stale S40 simulation wording remains in install metadata')
    for startup in ['startup-ipad-1024-landscape.png','startup-ipad-1180-landscape.png','startup-ipad-1194-landscape.png','startup-ipad-1024-portrait.png','startup-ipad-1180-portrait.png','startup-ipad-1194-portrait.png']:
        req(startup in idx,f'missing native startup link: {startup}')
        req(f"'./{startup}'" in sw,f'missing offline startup asset: {startup}')
    req('width:240px; height:240px' in idx and 'width:210px; height:210px' in idx,'S47 large Travel Command launch logo sizes missing')
    req('width:190px; height:136px' in idx and 'font-size:118px' in idx and 'width:170px; height:122px' in idx,'S47 large destination flag missing')
    req('font-size:86px' in idx and 'font-size:78px' in idx,'S47 large destination city sizes missing')
    req('touch-action:manipulation' in idx and "document.addEventListener('dblclick'" in main and "document.addEventListener('touchend'" not in main,'S51 gesture-safe tap/double-tap zoom suppression missing')
    req('user-scalable=no' not in idx and 'maximum-scale=1' not in idx,'S47 must preserve deliberate pinch/spread zoom')
    req('touch-action:none' in text('src_design_finish-pass.css'),'map pinch/pan gesture authority missing')
    p=contract['package']; r=contract['runtimeIdentity']
    req(p['cacheName']==CACHE and p['buildMarker']==MARKER and p['storageKey']==STORAGE,'contract package runtime identity mismatch')
    req(r['cacheName']==CACHE and r['buildMarker']==MARKER and r['serviceWorkerUrl']==SW_URL and r['storageKey']==STORAGE,'contract runtimeIdentity mismatch')
    schema=text('src_core_schema.js')
    req(contract['package'].get('appVersion') in schema,'APP_VERSION does not match release contract appVersion')
    stale_runtime_tokens=[
      'v60-r7.3-screen-closure-2026-09-15-s39','tcc:v1:istanbul-full-simulation-s39-real-ipad','tcc:v1:istanbul-full-simulation-s40-real-ipad',
      'v58-r7.2-real-ipad-correction-2026-09-14-s38','v57-r7.2-forward-preipad-simulation-2026-09-14-s37',
      'v56-r7.2-forward-triplecheck-2026-09-14-s36'
    ]
    for name in ['index.html','sw.js','src_main.js','src_core_runtime-config.js']:
        value=text(name)
        req(not any(token in value for token in stale_runtime_tokens),f'stale predecessor active runtime identity in {name}')

def verify_physical_review_corrections(contract):
    css=text('src_design_locked_contract.css'); finish=text('src_design_finish-pass.css')
    home=text('src_screens_home.js'); budget=text('src_screens_budget.js'); reservations=text('src_screens_reservations.js')
    calendar=text('src_screens_calendar.js'); itinerary=text('src_screens_itinerary.js'); journey=text('src_screens_journey-history.js')
    checklist=text('src_screens_checklist.js'); vault=text('src_screens_vault.js'); settings=text('src_screens_settings.js'); modal=text('src_components_modal.js')
    sidebar=text('src_components_sidebar.js'); sw=text('sw.js')
    budget_core=text('src_core_budget.js')
    req('export function canonicalAUDAmount' in budget_core and 'rounded === 0 ? 0.01 : rounded' in budget_core,'S53 canonical AUD-cent protection missing')
    req('canonicalAUDAmount(localToAUD(amount, conversionStay.fixedLocalPerAUD), amount)' in reservations,'S53 Reservation pre-Save canonical-cent display missing')
    req('canonicalAUDAmount(localToAUD(amount,stay.fixedLocalPerAUD),amount)' in budget,'S53 Expense pre-Save canonical-cent display missing')

    # Longstanding locked requirements retained.
    req('tcc-expanded-inherits-source' in modal and 'data-expand-tone' in modal,'expanded-widget source-colour plumbing missing')
    req('min-height:44px' in css and 'IPAD TOUCH TARGET CLOSURE' in css,'44px iPad touch closure missing')
    req('VAULT HEADER BAKED-STATUS MASK' in css,'Vault baked-status mask missing')
    req('HOME 1024 COMPACT READABILITY' in css,'Home 1024 clipping lock missing')
    req('DESTINATION BUDGET SUMMARY VALUE GLYPH CLOSURE' in css,'Destination Budget glyph clipping lock missing')
    req("title:'Alerts',tone:'red'" in home,'Home Alerts expanded tone is not red')
    req('height:230px !important' in css,'unified 230px picture-header rule missing')
    req('S49 PHYSICAL-IPAD ADD-EDITOR CLOSURE' in css,'S49 Add-editor iPad closure CSS block missing')
    req('S51 IPAD FOCUS-ZOOM CLOSURE' in css,'S51 iPad focus-zoom closure CSS block missing')
    req('select[name="status"]' in css and 'textarea[name="notes"]' in css and 'font-size:16px !important' in css,'S51 Reservation focus-zoom-safe control sizing missing')
    req('--reservation-choice-rgb' in css and '.reservation-type-choice-icon' in css,'Reservation category icon colour closure missing')
    req('.budget-category-choice-icon' in css and '--choice-rgb' in css,'Expense category icon colour closure missing')
    req('materialToneFromContext(modal' in itinerary and 'tcc-expanded-inherits-source tone-${pickerTone} itinerary-route-picker-modal' in itinerary,'Nested Itinerary map picker no longer preserves the live editor tone')
    req('.reservation-field,\n  html body [data-screen="budget"] .budget-field' in css or ('min-width:0 !important' in css and '.tcc-au-date-shell' in css),'Safari native Add/Edit width containment missing')
    hard=contract.get('hardVisualRules',[])
    req(any('Add Reservation type selector icons' in rule for rule in hard),'release contract missing category-colour Add selector rule')
    req(any('Native iPad/Safari date and time controls' in rule for rule in hard),'release contract missing native-control overlap rule')
    req(any('16px or larger' in rule and 'Safari focus' in rule for rule in hard),'release contract missing Safari focus auto-zoom prevention rule')

    # Latest locked navigation: icon-only in both portrait and landscape iPad modes.
    req('@media (max-width:1200px)' in css,'all-iPad icon-only navigation media rule missing')
    req(':root { --sidebar-w:76px !important; }' in css,'iPad sidebar width is not reclaimed')
    req('.sidebar .nav-button > span:last-child { display:none !important; }' in css,'iPad nav text is not hidden')
    req('.sidebar-brand-name,\n    html body .sidebar-status { display:none !important; }' in css,'iPad brand/status text is not hidden')
    req("button.setAttribute('aria-label',label)" in sidebar,'icon-only iPad nav lost accessible labels')
    req('home-secret-phrase-trigger[hidden]' in css and 'itinerary-list-pager[hidden]' in css,'hidden-control display seal missing')

    # Reservations + Vault category tiles: coloured card identity, white counts.
    req('The card owns the colour; all large counts remain white' in css,'Reservations category-card white-count correction missing')
    req('reservation-tab-count strong' in css and 'color:#f6fbff !important' in css,'Reservations counts are not forced white')
    req('Vault category cards match the Journey History headline-card strength' in css,'Vault Journey-History-strength card correction missing')
    req('.vault-category-card .vault-category-count' in css,'Vault white-count correction missing')

    # Home timeline: one read-only full timeline, no nested editor/navigation action.
    req('Full forward Trip Timeline · read-only.' in home,'Home Trip Timeline read-only expansion missing')
    req('Open Itinerary Stay' not in home,'Home Trip Timeline still exposes itinerary navigation/editor action')
    req('.home-mini-timeline .home-timeline-row' in css and 'pointer-events:none !important' in css,'Home compact Trip Timeline rows are still actionable')

    # Accounts are editable manual balances only.
    req('openAccountEditor' in budget and "title:existing?'Edit Account':'Add Account'" in budget,'Accounts Add/Edit manager missing')
    req('deleteAccountDraft' in budget and '+ ADD ACCOUNT' in budget,'Accounts Add/Delete path missing')
    req('Manual travel-money snapshot · no transfers · no live bank connection' in budget,'Accounts Version-1 scope note missing')
    req('./src_core_account-mutations.js' in sw,'new account mutation module is not cached offline')

    # Placement cleanup: whole-app health only Settings, Schengen only Home, no Calendar sync check.
    req('Reservation Health Check' not in reservations,'Reservation Health Check still rendered on Reservations')
    req('Sync Check' not in calendar,'Calendar Sync Check still rendered')
    req('Schengen' not in settings,'Settings still duplicates Schengen UI')
    req('Schengen Status' in home,'Home Schengen Status missing')
    req('APP HEALTH' in settings or 'App Health' in settings,'Settings App Health missing')

    # Calendar Agenda: one marker only.
    req('calendar-agenda-marker' in calendar,'Calendar Agenda marker missing')
    req('Calendar Agenda uses ONE destination/travel colour strip' in css,'single-rail Agenda correction missing')
    req('exactly one colour carrier per row' in css,'neutral Agenda row shell lock missing')

    # Itinerary calm rows.
    req('Itinerary: calm neutral rows' in css,'calm Itinerary row lock missing')
    req('itinerary-entry-budget:not(.is-unset) > strong' in css and 'color:#f5f9fc !important' in css,'normal Itinerary budget values are not white')
    req('itinerary-entry-budget.is-unset' in css and 'color:#ffd56b !important' in css,'Budget Not Set is not amber-only')

    # Journey History readability + richer milestone/spend expansion.
    req('Journey History completed rows align with the calmer Itinerary treatment' in css,'Journey completed-row calm treatment missing')
    req('journey-record-tone-' in journey and '--journey-record-rgb' in css,'Journey row travel-type accent plumbing missing')
    for token in ['journey-lifetime-spend-accommodation','journey-lifetime-spend-travel','journey-lifetime-spend-food','journey-lifetime-spend-transport','journey-lifetime-spend-entertainment','journey-lifetime-spend-shopping','journey-lifetime-spend-other']:
        req(token in css,f'Lifetime Travel Spend category colour missing: {token}')
    req("['1st'" in journey and "'First country'" in journey and "'Highest living / day'" in journey,'expanded automatic Journey milestones missing')
    req('grid-template-columns:repeat(3,minmax(0,1fr))' in css,'Journey Milestones grid-fill correction missing')

    # Checklist Ready to Move semantic hierarchy + progress.
    req('checklist-expanded-status-progress' in checklist,'Ready-to-Move progress summary missing')
    req('checklist-expanded-status-hero.is-red' in css,'Ready-to-Move not-ready red/coral hero missing')
    for token in ['checklist-expanded-stat.is-green','checklist-expanded-stat.is-gold','checklist-expanded-stat.is-red','checklist-expanded-stat.is-sky','checklist-expanded-stat.is-slate']:
        req(token in css,f'Ready-to-Move semantic summary state missing: {token}')
    req('checklist-expanded-stage-progress' in css,'Ready-to-Move stage progress missing')

    # Settings/Vault colour redistribution and Settings-only App Health.
    req('Settings: Schengen is no longer rendered here' in css,'Settings Home-only Schengen lock note missing')
    req('settings-security' in css and 'settings-backup' in css,'Settings viewport colour redistribution missing')
    req('Vault viewport distribution' in css and 'vault-activity-compact' in css,'Vault viewport colour redistribution missing')

    # Contract must explicitly preserve the physical-review rules.
    rules='\n'.join(contract.get('hardVisualRules',[])).lower()
    for phrase in [
      'fixed sidebar is icon-only in both portrait/upright and landscape ipad modes',
      'reservation health check is not shown on reservations',
      'schengen status exists only on home',
      'itinerary upcoming and completed rows stay predominantly dark/neutral',
      'budget accounts is a manual/offline snapshot with add/edit/delete',
      'home trip timeline expands only into the full forward read-only timeline'
    ]:
        req(phrase in rules,f'contract lost locked rule: {phrase}')

def verify_handoff(contract):
    req(contract.get('promotion',{}).get('finalMaster')=='BLOCKED','FINAL MASTER promotion must remain blocked before real-iPad acceptance')
    handoff=contract.get('handoffInstruction','')
    req('Continue only from this exact S53/v17 source' in handoff,'handoff is not forward-only S53/v17')
    req('Do not return to S52/S51/S50/S49/S48/S47/S46/S45/S44/S43/S42/S41/S40/S39/S38/S37/S36/S35/S34/S33' in handoff,'handoff does not explicitly block rollback')
    reg=contract.get('screenClosureRegister',{})
    req(set(reg)>= {'Home','Itinerary','Budget','Reservations','Calendar','Journey History','Checklist','The Vault','Settings','Global'},'screen closure register incomplete')
    for screen in ['Home','Itinerary','Budget','Reservations','Calendar','Journey History','Checklist','The Vault','Settings','Global']:
        req(reg[screen].get('status')=='SOFTWARE_REGRESSION_PASS_PHYSICAL_RECHECK',f'{screen} S53 software-closure status mismatch')
    gates={g.get('id'):g for g in contract.get('physicalIpadAcceptance',[])}
    required_ids={'G-020','G-027','HOME-013','HOME-014','RES-009','CAL-005','CAL-006','JH-003','JH-007','VAULT-005','VAULT-006','VAULT-007','VAULT-008','VAULT-009','VAULT-011','SET-009','NAV-001','HOME-015','BUD-010','RES-010','CAL-007','ITIN-010','JH-008','CHK-010','SET-010','COL-001','G-031'}
    req(required_ids<=set(gates),'physical-iPad acceptance register missing one or more required gates')
    allowed={'NOT_RUN','RECHECK_REQUIRED_AFTER_S53','PASSED'}
    req(all(g.get('status') in allowed for g in gates.values()),'unknown physical-iPad gate status')
    evidence=contract.get('regressionEvidence',{})
    req(evidence.get('phase') in {'S53-tiny-currency-ui-regression-in-progress','S53-tiny-currency-ui-software-closure'},'release-contract regressionEvidence is not current S53 phase')
    req(not any('S40' in str(v) or 'PENDING FINAL S40' in str(v) for v in evidence.values()),'stale S40 current-state wording remains in release-contract regressionEvidence')

def verify_source_seal(contract):
    seal=contract.get('sourceSeal')
    req(isinstance(seal,dict),'sourceSeal missing')
    expected=seal.get('files')
    req(isinstance(expected,dict) and len(expected)==EXPECTED_COUNT-1,f'expected {EXPECTED_COUNT-1} sealed non-contract files, got {len(expected) if isinstance(expected,dict) else "invalid"}')
    current={p.name:sha256(p) for p in sorted(ROOT.iterdir()) if p.is_file() and p.name!='release-contract.json'}
    req(current==expected,'source seal mismatch: one or more non-contract app-source files changed')
    digest=hashlib.sha256(json.dumps(expected,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    req(seal.get('digest')==digest,'sourceSeal digest mismatch')
    req(seal.get('identity')==MARKER,'sourceSeal identity is not S53 runtime marker')
    req(seal.get('checkpoint')=='S53_TINY_CURRENCY_UI_CONSISTENCY_SOFTWARE_CLEAN','sourceSeal checkpoint is not S53')

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--mode',choices=['working','sealed'],default='working'); args=ap.parse_args()
    contract=json.loads(CONTRACT.read_text())
    verify_structure(contract); verify_runtime(contract); verify_physical_review_corrections(contract); verify_handoff(contract)
    if args.mode=='sealed': verify_source_seal(contract)
    print(f'PASS S53 continuity guard ({args.mode}) — {EXPECTED_COUNT} files, tiny-currency UI consistency and forward-only handoff intact')

if __name__=='__main__':
    try: main()
    except GuardFailure as e:
        print('FAIL S53 continuity guard:',e,file=sys.stderr); sys.exit(1)
