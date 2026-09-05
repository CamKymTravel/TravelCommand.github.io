#!/usr/bin/env python3
from pathlib import Path
import hashlib, json, re, subprocess, sys, zipfile

ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / 'BASELINE_MANIFEST_R72.sha256'
EXPECTED_OUTER_FILE_COUNT = 99
EXPECTED_SCREENS = {
    'home':'Home','budget':'Budget','reservations':'Reservations','itinerary':'Itinerary',
    'calendar':'Calendar','journey-history':'Journey History','checklist':'Checklist','vault':'The Vault','settings':'Settings'
}
EXPECTED_APP_HEALTH_MARKER = 'v55-r72-screenshot-audit-2026-09-05'
EXPECTED_SW_QUERY = '55-screenshot-audit-r72-2026-09-05'
EXPECTED_CACHE = 'tcc-v1-v55-screenshot-audit-r72-2026-09-05'
EXPECTED_CURRENT_IMAGES = {f'IMG_{i}.jpeg' for i in range(1256,1325) if i != 1265}
EXPECTED_CURRENT_IMAGES |= {'IMG_1263.png','IMG_1317.png'}
EXPECTED_CURRENT_IMAGES -= {'IMG_1263.jpeg','IMG_1317.jpeg'}
EXPECTED_FIRST_IMAGES = {f'IMG_{i}.jpeg' for i in range(1325,1334)}

failures=[]
notes=[]

def fail(msg): failures.append(msg)
def ok(msg): notes.append('PASS: '+msg)

def sha256(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024), b''): h.update(chunk)
    return h.hexdigest()

# 1. package cleanliness / file count
files=[p for p in ROOT.rglob('*') if p.is_file()]
rel={p.relative_to(ROOT).as_posix() for p in files}
if len(files)!=EXPECTED_OUTER_FILE_COUNT: fail(f'outer file count {len(files)} != {EXPECTED_OUTER_FILE_COUNT}')
else: ok(f'outer file count = {EXPECTED_OUTER_FILE_COUNT}')
for p in rel:
    if '__pycache__' in p or p.endswith('.pyc') or p.endswith('~') or p.endswith('.tmp') or p.endswith('.bak'):
        fail(f'forbidden generated/temp artifact: {p}')

# 2. manifest exact hash/file-set gate
if not MANIFEST.exists():
    fail('BASELINE_MANIFEST_R72.sha256 missing')
else:
    entries={}
    for line in MANIFEST.read_text(encoding='utf-8').splitlines():
        if not line.strip(): continue
        m=re.fullmatch(r'([0-9a-f]{64})  (.+)', line)
        if not m: fail(f'malformed manifest line: {line[:100]}'); continue
        entries[m.group(2)]=m.group(1)
    expected_set=set(entries)|{MANIFEST.name}
    if rel != expected_set:
        missing=sorted(expected_set-rel); extra=sorted(rel-expected_set)
        if missing: fail('manifest missing files on disk: '+', '.join(missing[:10]))
        if extra: fail('unmanifested extra files: '+', '.join(extra[:10]))
    else: ok(f'manifest file set exact ({len(entries)} hashed files + manifest)')
    for name, expected in entries.items():
        p=ROOT/name
        if not p.exists(): continue
        actual=sha256(p)
        if actual!=expected: fail(f'hash mismatch: {name}')
    if not any(x.startswith('hash mismatch:') for x in failures): ok('all manifest SHA-256 hashes match')

# 3. JS syntax
js=sorted(ROOT.glob('*.js'))
if len(js)!=65: fail(f'JS file count {len(js)} != 65')
node='node'
for p in js:
    r=subprocess.run([node,'--check',str(p)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    if r.returncode: fail(f'JS syntax: {p.name}: {r.stderr.strip().splitlines()[-1] if r.stderr.strip() else "unknown"}')
if not any(x.startswith('JS syntax:') for x in failures): ok(f'JavaScript syntax {len(js)}/{len(js)}')

# 4. CSS structural brace balance (ignoring comments and quoted strings)
def css_balance(text):
    depth=0; i=0; quote=None; comment=False
    while i<len(text):
        c=text[i]; n=text[i+1] if i+1<len(text) else ''
        if comment:
            if c=='*' and n=='/': comment=False; i+=2; continue
            i+=1; continue
        if quote:
            if c=='\\': i+=2; continue
            if c==quote: quote=None
            i+=1; continue
        if c=='/' and n=='*': comment=True; i+=2; continue
        if c in ('"',"'"): quote=c; i+=1; continue
        if c=='{': depth+=1
        elif c=='}':
            depth-=1
            if depth<0: return False
        i+=1
    return depth==0 and quote is None and not comment
css=sorted(ROOT.glob('*.css'))
if len(css)!=6: fail(f'CSS file count {len(css)} != 6')
for p in css:
    if not css_balance(p.read_text(encoding='utf-8')): fail(f'CSS structure invalid: {p.name}')
if not any(x.startswith('CSS structure invalid:') for x in failures): ok(f'CSS structure {len(css)}/{len(css)}')

# 5. JSON / webmanifest parse
for name in ['simulation-data.json','header-index.json','manifest.webmanifest']:
    try: json.loads((ROOT/name).read_text(encoding='utf-8'))
    except Exception as e: fail(f'JSON parse {name}: {e}')
if not any(x.startswith('JSON parse') for x in failures): ok('JSON/webmanifest parse')

# 6. exact screen registry
registry=(ROOT/'src_screens_registry.js').read_text(encoding='utf-8')
for key,label in EXPECTED_SCREENS.items():
    pattern=(rf"'{re.escape(key)}'\s*:\s*'{re.escape(label)}'" if '-' in key else rf"\b{re.escape(key)}\s*:\s*'{re.escape(label)}'")
    if not re.search(pattern,registry): fail(f'screen registry missing {key}={label}')
for key in EXPECTED_SCREENS:
    if not re.search(rf"screenId\s*===\s*'{re.escape(key)}'",registry): fail(f'screen renderer missing {key}')
if not any(x.startswith('screen ') for x in failures): ok('9-screen registry + renderer mapping')

# 7. menu-only cross-screen navigation static guard
for p in sorted(ROOT.glob('src_screens_*.js')):
    text=p.read_text(encoding='utf-8')
    if re.search(r'\bnavigate\s*\(', text): fail(f'direct navigate() call in screen content: {p.name}')
if not any(x.startswith('direct navigate') for x in failures): ok('zero direct navigate() calls in screen modules')
sidebar=(ROOT/'src_components_sidebar.js').read_text(encoding='utf-8')
if 'onNavigate(id)' not in sidebar: fail('sidebar navigation owner marker missing')
else: ok('sidebar retains primary navigation ownership')

# 8. R72 marker alignment
main=(ROOT/'src_main.js').read_text(encoding='utf-8')
runtime=(ROOT/'src_core_runtime-config.js').read_text(encoding='utf-8')
index=(ROOT/'index.html').read_text(encoding='utf-8')
sw=(ROOT/'sw.js').read_text(encoding='utf-8')
if EXPECTED_APP_HEALTH_MARKER not in main: fail('R72 App Health marker mismatch')
if EXPECTED_SW_QUERY not in runtime or EXPECTED_SW_QUERY not in index: fail('R72 service-worker query mismatch')
if EXPECTED_CACHE not in sw: fail('R72 cache name mismatch')
if not any('R72' in x and 'mismatch' in x for x in failures): ok('R72 App Health/service-worker/cache marker alignment')

# 8b. R72 handoff/governance status guard
status=(ROOT/'CURRENT_R72_STATUS.md').read_text(encoding='utf-8') if (ROOT/'CURRENT_R72_STATUS.md').exists() else ''
for token in ['Exact active checkpoint:** **V55 R72 Screenshot Simulation','R69/R70 semantic-record recolouring experiments remain rejected','Physical target-iPad **1024×768','Old/original screenshots are **never colour authority**','10,227/10,227 builds']:
    if token not in status: fail(f'R72 status ledger missing token: {token}')
if status and not any(x.startswith('R71 status ledger missing') for x in failures): ok('R72 implementation/outstanding/rejected-experiment ledger present')

# 9. App Health semantic source guard
settings=(ROOT/'src_screens_settings.js').read_text(encoding='utf-8')
refcss=(ROOT/'src_design_reference-pass.css').read_text(encoding='utf-8')
for token in ['CHECK THE WHOLE APP','settings-health-dirty','settings-health-run-needs-attention']:
    if token not in settings and token not in refcss: fail(f'App Health semantic token missing: {token}')
if 'appHealthPulse' not in refcss: fail('App Health heartbeat keyframes missing')
if 'settings-health-verified' not in refcss: fail('App Health verified green semantic rule missing')
if not any(x.startswith('App Health') for x in failures): ok('App Health dirty/check/verified semantic markers present')

# 10. key security/interaction/source markers
vault=(ROOT/'src_screens_vault.js').read_text(encoding='utf-8')
home=(ROOT/'src_screens_home.js').read_text(encoding='utf-8')
itin=(ROOT/'src_screens_itinerary.js').read_text(encoding='utf-8')
journey=(ROOT/'src_screens_journey-history.js').read_text(encoding='utf-8')
for token,label,text in [
    ('VAULT LOCKED','Vault locked presentation',vault),
    ('PROTECTED ACCESS','Vault protected access',vault),
    ('showQuickLook','Home Quick Look',home),
    ('showToilet','Home toilet helper',home),
    ('openItineraryEntryDetail','Itinerary read-first detail',itin),
]:
    if token not in text: fail(f'{label} marker missing')
if 'makeExpandableCard' not in journey: fail('Journey expandable-card marker missing')
if not any(x.endswith('marker missing') for x in failures): ok('critical Vault/Home/Itinerary/Journey source markers present')

# 11. visual evidence bundle completeness / GitHub-lite allowance
vzip=ROOT/'VISUAL_REFERENCES.zip'
github_note=ROOT/'GITHUB_PACKAGE_NOTE.md'
if not vzip.exists():
    if github_note.exists() and 'Only `VISUAL_REFERENCES.zip` was omitted' in github_note.read_text(encoding='utf-8'):
        ok('visual evidence archive intentionally omitted from GitHub-under-25MB package (non-runtime only)')
    else:
        fail('VISUAL_REFERENCES.zip missing without GitHub package declaration')
else:
    try:
        with zipfile.ZipFile(vzip) as z:
            names=set(z.namelist())
            current={Path(n).name for n in names if n.startswith('CURRENT_BUILD_SCREENSHOT_AUDIT_2026-09-05/') and not n.endswith('/')}
            first={Path(n).name for n in names if n.startswith('FIRST_BUILD_STRUCTURE_REFERENCES_2026-09-05/') and not n.endswith('/')}
            if current!=EXPECTED_CURRENT_IMAGES:
                fail(f'current screenshot audit bundle mismatch: found {len(current)}, expected {len(EXPECTED_CURRENT_IMAGES)}')
            if first!=EXPECTED_FIRST_IMAGES:
                fail(f'first-build structure bundle mismatch: found {len(first)}, expected {len(EXPECTED_FIRST_IMAGES)}')
            if 'README_R36_VISUAL_AUTHORITY.md' not in names: fail('visual authority README missing')
            if not any(Path(n).name=='REF_01_HOME_ONE_SCREEN.jpeg' for n in names): fail('named visual reference set missing')
            if not any(x.startswith('current screenshot audit') or x.startswith('first-build structure') or x.startswith('visual authority') or x.startswith('named visual') for x in failures):
                ok(f'visual evidence complete: {len(current)} current + {len(first)} first-build structure screenshots')
    except Exception as e: fail(f'visual reference ZIP invalid: {e}')

# 12. PWA shell local-reference existence
# Parse the service worker string literals that look like local shell assets.
asset_refs=set(re.findall(r"['\"](\./[^'\"]+|/[^'\"]+)['\"]", sw))
missing=[]
for ref in sorted(asset_refs):
    clean=ref.split('?',1)[0]
    if clean.startswith('./'): clean=clean[2:]
    elif clean.startswith('/'): clean=clean[1:]
    if not clean or clean.startswith('http'): continue
    # Ignore navigation-style root references; require packaged files for paths with an extension.
    if '.' in Path(clean).name and not (ROOT/clean).exists(): missing.append(ref)
if missing: fail('service-worker referenced packaged files missing: '+', '.join(missing[:10]))
else: ok('service-worker local shell references resolve')


# 13. Deep deterministic boundary/model sweep + critical domain invariants
node_program = r"""
import fs from 'fs';
import {migrateState} from './src_core_migrations.js';
import {buildHomeViewModel} from './src_core_home-view-model.js';
import {buildBudgetViewModel} from './src_core_budget-view-model.js';
import {buildReservationsViewModel} from './src_core_reservations-view-model.js';
import {buildItineraryViewModel} from './src_core_itinerary-view-model.js';
import {buildCalendarViewModel} from './src_core_calendar-view-model.js';
import {buildJourneyHistoryViewModel} from './src_core_journey-history-view-model.js';
import {buildChecklistViewModel} from './src_core_checklist-view-model.js';
import {resolveDestinationBudgetForDate} from './src_core_budget.js';
import {findCurrentStay} from './src_core_planning.js';
import {validateState} from './src_core_validation.js';
import {createVaultAccessSession, unlockVault, markStreamingOpened, canRevealHiddenEmails, revealHiddenEmails, lockVault} from './src_core_vault-access.js';
const raw=JSON.parse(fs.readFileSync('simulation-data.json','utf8'));
const state=migrateState(raw,{now:'2029-02-24T12:00:00.000Z'});
if (!validateState(state)) throw new Error('migrated canonical simulation state validation failed');
const pad=n=>String(n).padStart(2,'0');
const iso=d=>`${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
const boundaryDates=[...new Set(state.itinerary.flatMap(x=>[x.startDate,x.endDate]).concat(['2029-02-24']))].sort();
let builds=0;
for(const day of boundaryDates){
  buildHomeViewModel(state,day); builds++;
  buildBudgetViewModel(state,day); builds++;
  buildReservationsViewModel(state,day,{activeType:'flight'}); builds++;
  buildItineraryViewModel(state,day); builds++;
  buildCalendarViewModel(state,day); builds++;
  buildJourneyHistoryViewModel(state,day,{years:['all']}); builds++;
  buildChecklistViewModel(state,day); builds++;
}
const start=new Date(Date.UTC(2027,0,14));
const end=new Date(Date.UTC(2031,0,13));
let coverageDays=0;
for(let d=new Date(start); d<=end; d.setUTCDate(d.getUTCDate()+1)){
  const day=iso(d);
  if(!findCurrentStay(state.itinerary,day)) throw new Error(`fixture itinerary coverage gap on ${day}`);
  coverageDays++;
}
const current=buildHomeViewModel(state,'2029-02-24');
if(current.currentStay?.title!=='Athens' || current.currentStay?.country!=='Greece') throw new Error('R72 current destination fixture mismatch');
if(current.nextDestination?.title!=='Budapest' || current.nextDestination?.country!=='Hungary') throw new Error('R72 next destination fixture mismatch');
if(resolveDestinationBudgetForDate(state.itinerary,'2029-02-24').name!=='Athens') throw new Error('Athens dated budget routing mismatch');
if(resolveDestinationBudgetForDate(state.itinerary,'2028-02-20').name!=='Amsterdam') throw new Error('first Amsterdam dated routing mismatch');
if(resolveDestinationBudgetForDate(state.itinerary,'2030-10-10').name!=='Amsterdam') throw new Error('second Amsterdam dated routing mismatch');
let noStayBlocked=false; try{resolveDestinationBudgetForDate(state.itinerary,'2032-01-01')}catch(e){noStayBlocked=/No itinerary stay covers/.test(String(e.message))}
if(!noStayBlocked) throw new Error('missing-stay budget routing did not block');
const ui=createVaultAccessSession();
if(canRevealHiddenEmails(ui)) throw new Error('hidden emails available while locked');
unlockVault(ui);
if(canRevealHiddenEmails(ui)) throw new Error('hidden emails available before Streaming');
if(!markStreamingOpened(ui) || !canRevealHiddenEmails(ui) || !revealHiddenEmails(ui)) throw new Error('unlock→Streaming→hidden-email sequence failed');
lockVault(ui);
if(canRevealHiddenEmails(ui) || ui.hiddenEmailsRevealed) throw new Error('Vault re-lock did not clear hidden-email access');
console.log(`BOUNDARY_SWEEP_PASS dates=${boundaryDates.length} builds=${builds} coverageDays=${coverageDays}`);
"""
r=subprocess.run(['node','--experimental-default-type=module','-e',node_program],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,timeout=90)
if r.returncode:
    fail('deep deterministic boundary/model sweep failed: '+(r.stderr.strip().splitlines()[-1] if r.stderr.strip() else 'unknown'))
else:
    m=re.search(r'BOUNDARY_SWEEP_PASS dates=(\d+) builds=(\d+) coverageDays=(\d+)',r.stdout)
    if not m or int(m.group(3))!=1461 or int(m.group(2))!=int(m.group(1))*7:
        fail('deep boundary/model sweep did not report expected counts')
    else:
        ok(f'deep boundary/model sweep {m.group(1)} itinerary boundary/current dates × 7 models = {m.group(2)} builds; 1,461-day coverage + budget/Vault invariants')

print('\n'.join(notes))
if failures:
    print('\nFAILURES:')
    for item in failures: print('- '+item)
    print(f'\nRESULT: FAIL ({len(failures)} issue(s))')
    sys.exit(1)
print('\nRESULT: PASS — exact V55 R72 screenshot simulation checkpoint verified')
