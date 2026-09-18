#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, re, subprocess, sys
from pathlib import Path
import tinycss2

ROOT=Path(__file__).resolve().parent
CONTRACT=ROOT/'release-contract.json'
EXPECTED_COUNT=108

class GuardFailure(RuntimeError): pass

def req(cond,msg):
    if not cond: raise GuardFailure(msg)

def text(name): return (ROOT/name).read_text(encoding='utf-8',errors='strict')
def sha256(p: Path):
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
      'startup-ipad-1024-landscape.png','startup-ipad-1180-landscape.png','startup-ipad-1194-landscape.png',
      'startup-ipad-1024-portrait.png','startup-ipad-1180-portrait.png','startup-ipad-1194-portrait.png',
      'src_main.js','src_components_modal.js','src_components_page-hero.js','src_components_sidebar.js','src_design_locked_contract.css',
      'src_core_account-mutations.js','src_screens_home.js','src_screens_itinerary.js','src_screens_budget.js','src_screens_reservations.js',
      'src_screens_calendar.js','src_screens_journey-history.js','src_screens_checklist.js','src_screens_vault.js','src_screens_settings.js'
    }
    req(required<=names,'missing required source files: '+', '.join(sorted(required-names)))
    header=json.loads(text('header-index.json'))
    req(isinstance(header,dict) and len(header)==86,'header asset index must contain 86 entries')
    pkg=contract.get('package',{})
    req(pkg.get('maxFiles')==EXPECTED_COUNT,f'contract maxFiles must be {EXPECTED_COUNT}')
    req(pkg.get('requiredHeaderAssets')==86,'contract requiredHeaderAssets must be 86')

def verify_syntax():
    js=[p for p in ROOT.glob('*.js')]
    bad=[]
    for p in js:
        r=subprocess.run(['node','--check',str(p)],capture_output=True,text=True)
        if r.returncode: bad.append(p.name)
    req(not bad,'JavaScript syntax failure: '+', '.join(bad))
    css=[p for p in ROOT.glob('*.css')]
    bad=[]
    for p in css:
        errs=[x for x in tinycss2.parse_stylesheet(p.read_text(),skip_whitespace=True,skip_comments=True) if getattr(x,'type',None)=='error']
        if errs: bad.append(p.name)
    req(not bad,'CSS parse failure: '+', '.join(bad))

def verify_runtime(contract):
    idx=text('index.html'); sw=text('sw.js'); main=text('src_main.js'); rc=text('src_core_runtime-config.js')
    manifest=json.loads(text('manifest.webmanifest'))
    pkg=contract.get('package',{}); runtime=contract.get('runtimeIdentity',{})
    storage=runtime.get('storageKey'); cache=runtime.get('cacheName'); marker=runtime.get('buildMarker'); sw_url=runtime.get('serviceWorkerUrl')
    req(all(isinstance(x,str) and x for x in [storage,cache,marker,sw_url]),'runtimeIdentity is incomplete')
    req(storage in idx,'index storage key does not match release contract')
    req(sw_url in idx,'index service-worker URL does not match release contract')
    req(cache in sw,'service-worker cache does not match release contract')
    req(marker in main,'App Health build marker does not match release contract')
    req(sw_url in rc,'runtime fallback service-worker URL does not match release contract')
    req(pkg.get('storageKey')==storage and pkg.get('cacheName')==cache and pkg.get('buildMarker')==marker,'package/runtime identity mismatch')
    req(manifest.get('id')==pkg.get('manifestId'),'manifest id does not match release contract')
    req(manifest.get('short_name')=='Travel Command','manifest short_name changed')
    req(manifest.get('orientation')=='any','manifest must allow landscape and portrait/upright')
    for startup in ['startup-ipad-1024-landscape.png','startup-ipad-1180-landscape.png','startup-ipad-1194-landscape.png','startup-ipad-1024-portrait.png','startup-ipad-1180-portrait.png','startup-ipad-1194-portrait.png']:
        req(startup in idx,f'missing startup link {startup}')
        req(f"'./{startup}'" in sw,f'missing precache startup asset {startup}')
    req('touch-action:manipulation' in idx and "document.addEventListener('dblclick'" in main and "document.addEventListener('touchend'" not in main,'tap/double-tap zoom protection changed')
    req('user-scalable=no' not in idx and 'maximum-scale=1' not in idx,'deliberate pinch/spread zoom was disabled')
    schema=text('src_core_schema.js')
    app_version=re.search(r"APP_VERSION\s*=\s*'([^']+)'",schema)
    req(app_version is not None,'APP_VERSION missing')
    req(pkg.get('appVersion')==app_version.group(1),'contract appVersion does not match schema APP_VERSION')

def verify_current_locked_surface(contract):
    css=text('src_design_locked_contract.css'); hero=text('src_components_page-hero.js'); side=text('src_components_sidebar.js')
    home=text('src_screens_home.js'); itinerary=text('src_screens_itinerary.js'); vault=text('src_screens_vault.js'); settings=text('src_screens_settings.js')
    # Photo-first headers only where approved.
    req("photo.className='tcc-stay-banner-photo'" in hero,'photo-first hero photo child missing')
    req("strip.className='tcc-stay-banner-strip'" in hero and 'strip.append(current,next)' in hero,'combined current/next strip missing')
    req('section.append(photo,strip)' in hero,'destination header ordering changed')
    for screen in ['itinerary','budget','reservations','calendar']:
        req(f'[data-screen="{screen}"] > .tcc-stay-banner' in css,f'photo-first selector missing for {screen}')
    # Icon-only navigation + transient learning cue.
    req(':root { --sidebar-w:76px !important; }' in css,'icon-only iPad sidebar width lock missing')
    req('.sidebar .nav-button > span:last-child { display:none !important; }' in css,'permanent iPad nav labels are visible')
    req("button.setAttribute('aria-label',label)" in side,'navigation accessibility label missing')
    req('function showNavCue(label, anchor)' in side and '},900);' in side,'temporary menu-name learning cue missing')
    # Header edges + no-shadow authority.
    req('S54 NO-SHADOW CONTRACT' in css and 'S54 NO-SHADOW FORENSIC CLOSURE' in css,'absolute no-shadow authority missing')
    req('header-journey-history' in css and 'header-checklist' in css and 'header-vault' in css and 'inset:-6px' in css,'baked-art header edge cleanup missing')
    # Home physical-iPad corrections.
    req('home-schengen-metrics' in home and 'home-schengen-must-leave' in home,'Home Schengen compact structure missing')
    req('.home-schengen-must-leave' in css and 'grid-column:1 / -1' in css,'Home Schengen Must Leave row collision fix missing')
    req('itinerary-add-home' in itinerary and '.itinerary-add-home' in css,'Australian Add Home action identity missing')
    req('tcc-itinerary-home-visit-modal' in itinerary and '.tcc-itinerary-home-visit-modal' in css,'Australian Add Home editor identity missing')
    # App-wide widget consistency: no Checklist accent rails; Vault keeps the same card/icon grammar as Journey summary cards.
    repair=css.split('S54 APP-WIDE WIDGET CONSISTENCY REPAIR',1)[1] if 'S54 APP-WIDE WIDGET CONSISTENCY REPAIR' in css else ''
    req(repair,'app-wide widget consistency repair missing')
    req('border:1px solid rgba(145,190,216,.24)' in repair,'Checklist common neutral shell missing')
    req('border-left-color:rgba(145,190,216,.24)' in repair,'Checklist accent-rail neutralisation missing')
    req('width:35px' in repair and 'border:1px solid currentColor' in repair,'Vault category icon construction mismatch')
    req('vault-category-${card.id}' in vault,'Vault category model classes missing')
    # App Health remains Settings authority.
    req('APP HEALTH' in settings or 'App Health' in settings,'Settings App Health missing')
    req('Schengen' not in settings,'Settings duplicates Home Schengen status')
    # High-risk local/offline contracts retained.
    req('touch-action:none' in text('src_design_finish-pass.css'),'map pinch/pan gesture authority missing')
    req('tcc-expanded-inherits-source' in text('src_components_modal.js'),'expanded-state source identity plumbing missing')
    req('min-height:44px' in css and 'IPAD TOUCH TARGET CLOSURE' in css,'44px iPad touch closure missing')
    req('VAULT HEADER BAKED-STATUS MASK' in css,'Vault baked-status mask missing')

def verify_contract_status(contract):
    req(contract.get('promotion',{}).get('finalMaster')=='BLOCKED','Final Master must remain blocked until physical-iPad acceptance')
    closure=contract.get('softwareClosure',{})
    req(closure.get('softwareStatus')=='SOFTWARE_CLOSURE_PASS','software closure is not PASS')
    req(closure.get('physicalStatus')=='REQUIRES_IPAD_RECHECK','physical-iPad status must remain open')
    req(closure.get('finalMaster') is False,'software closure incorrectly claims Final Master')
    gates=contract.get('physicalIpadAcceptance',[])
    req(isinstance(gates,list) and len(gates)>=20,'physical-iPad acceptance register is incomplete')

def verify_source_seal(contract):
    seal=contract.get('sourceSeal')
    req(isinstance(seal,dict),'sourceSeal missing')
    expected=seal.get('files')
    req(isinstance(expected,dict) and len(expected)==EXPECTED_COUNT-1,f'expected {EXPECTED_COUNT-1} sealed non-contract files')
    current={p.name:sha256(p) for p in sorted(ROOT.iterdir()) if p.is_file() and p.name!='release-contract.json'}
    req(current==expected,'source seal mismatch')
    digest=hashlib.sha256(json.dumps(expected,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    req(seal.get('digest')==digest,'sourceSeal digest mismatch')
    req(seal.get('identity')==contract.get('runtimeIdentity',{}).get('buildMarker'),'sourceSeal identity does not match runtime build marker')

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--mode',choices=['working','sealed'],default='working'); args=ap.parse_args()
    contract=json.loads(CONTRACT.read_text())
    verify_structure(contract); verify_syntax(); verify_runtime(contract); verify_current_locked_surface(contract); verify_contract_status(contract)
    if args.mode=='sealed': verify_source_seal(contract)
    print(f'PASS S54 continuity guard ({args.mode}) — {EXPECTED_COUNT} files, runtime identity, locked surfaces and software closure coherent')

if __name__=='__main__':
    try: main()
    except GuardFailure as e:
        print('FAIL S54 continuity guard:',e,file=sys.stderr); sys.exit(1)
