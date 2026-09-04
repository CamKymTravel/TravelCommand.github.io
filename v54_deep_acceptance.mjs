import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const ROOT = new URL('./', import.meta.url);
const load = name => import(new URL(name, ROOT).href);
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const { migrateState } = await load('src_core_migrations.js');
const { validateState } = await load('src_core_validation.js');
const { createBackupPayload } = await load('src_core_backup.js');
const { parseBackupPayload } = await load('src_core_restore.js');
const { saveExpenseDraft } = await load('src_core_expense-mutations.js');
const { saveReservationDraft } = await load('src_core_reservation-mutations.js');
const { destinationLedger } = await load('src_core_budget-ledger.js');
const { buildHomeViewModel } = await load('src_core_home-view-model.js');
const { buildBudgetViewModel } = await load('src_core_budget-view-model.js');
const { buildReservationsViewModel } = await load('src_core_reservations-view-model.js');
const { buildItineraryViewModel } = await load('src_core_itinerary-view-model.js');
const { buildCalendarViewModel } = await load('src_core_calendar-view-model.js');
const { buildJourneyHistoryViewModel } = await load('src_core_journey-history-view-model.js');
const { buildChecklistViewModel } = await load('src_core_checklist-view-model.js');
const { APP_VERSION } = await load('src_core_schema.js');
const { createItineraryEntry, canonicalCountrySlug } = await load('src_core_entities.js');
const { StateService } = await load('src_core_state.js');
const { MemoryStorageAdapter } = await load('src_core_storage.js');
const { shouldInstallRuntimeFixture, stampRuntimeFixtureRevision } = await load('src_core_runtime-config.js');

function migratedFixture() {
  const raw = JSON.parse(fs.readFileSync(new URL('simulation-data.json', ROOT), 'utf8'));
  const state = migrateState(raw, { now:'2027-01-14T00:00:00.000Z' });
  validateState(state);
  return state;
}

function midDate(stay) {
  const start = new Date(`${stay.startDate}T12:00:00Z`);
  const end = new Date(`${stay.endDate}T12:00:00Z`);
  return new Date(Math.floor((start.valueOf()+end.valueOf())/2)).toISOString().slice(0,10);
}

async function commonChecks() {
  const mainSource = fs.readFileSync(new URL('src_main.js', ROOT), 'utf8');
  assert(!mainSource.includes("runtimeConfig.mode !== 'production' || !navigator.storage?.persist"), 'Simulation still skips the persistent-storage safeguard');
  assert(mainSource.includes("if (!navigator.storage?.persist) return;"), 'Persistent-storage safeguard is not shared by production and simulation');
  assert(canonicalCountrySlug('Türkiye')==='turkey', 'Türkiye launch-country alias is not canonicalised to Turkey');
  assert(canonicalCountrySlug('Czech Republic')==='czechia', 'Czech Republic launch-country alias is not canonicalised to Czechia');
  assert(canonicalCountrySlug('U.S.A.')==='united-states', 'USA launch-country alias is not canonicalised to United States');
  assert(mainSource.includes('const key=canonicalCountrySlug(country);'), 'Launch flag renderer is not using canonical country normalisation');
  assert(mainSource.includes("turkey:'TR'"), 'Launch flag map no longer contains the Turkey ISO flag code');
  assert(mainSource.includes("import { findCurrentStay } from './src_core_planning.js';"), 'Launch sequence is not importing the canonical current-stay selector');
  assert(mainSource.includes('const stay=findCurrentStay(stateService.state.itinerary||[],today);'), 'Launch sequence is not using the same canonical current-stay selector as Home');

  const state = migratedFixture();
  assert(state.meta.appVersion === APP_VERSION, 'Migrated fixture did not promote to current app version');
  const launchFlagBlock=mainSource.match(/const codes=\{([\s\S]*?)\n  \};/)?.[1] || '';
  const launchFlagKeys=new Set([...launchFlagBlock.matchAll(/(?:'([^']+)'|([a-z][a-z0-9-]*))\s*:/g)].map(match=>match[1]||match[2]));
  for(const stay of state.itinerary){
    const routed=['cruise','motorhome','rv'].includes(stay.travelType);
    const country=(routed?stay.startCountry:stay.country)||stay.country||stay.startCountry||'';
    if(!country) continue;
    const key=canonicalCountrySlug(country);
    assert(launchFlagKeys.has(key),`Launch flag map does not cover ${stay.name} · ${country} (${key})`);
  }

  // Simulation fixture revision must be atomic with canonical state. A missing
  // sidecar marker on an already-populated simulation can mean the marker write
  // failed after the main state write succeeded; never reseed and erase user
  // screenshot-test changes in that ambiguous case. Newly installed fixtures
  // embed their revision so a later intentional fixture revision is still
  // detected without relying on the sidecar localStorage key.
  const fixtureRevision='v55-athens-greece-2029-02-24-r1';
  assert(shouldInstallRuntimeFixture({hadStoredState:false,state:null,fixtureRevision})===true,'Fresh simulation did not request fixture install');
  assert(shouldInstallRuntimeFixture({hadStoredState:true,state:{meta:{}},externalRevision:null,fixtureRevision})===false,'Missing sidecar marker would destructively reseed existing simulation state');
  const stampedFixture=stampRuntimeFixtureRevision(state,fixtureRevision);
  assert(stampedFixture.meta.simulationFixtureRevision===fixtureRevision,'Simulation fixture revision was not embedded in canonical state');
  assert(shouldInstallRuntimeFixture({hadStoredState:true,state:stampedFixture,externalRevision:null,fixtureRevision})===false,'Matching embedded fixture revision caused a reseed');
  assert(shouldInstallRuntimeFixture({hadStoredState:true,state:stampedFixture,externalRevision:null,fixtureRevision:'v55-athens-greece-2029-02-24-r2'})===true,'Newer fixture revision was suppressed by embedded marker');

  const backup = createBackupPayload(state, { exportedAt:'2031-01-13T23:00:00.000Z' });
  const parsed = parseBackupPayload(backup);
  const restored = migrateState(parsed, { now:'2031-01-13T23:00:00.000Z' });
  validateState(restored);
  assert(restored.itinerary.length === state.itinerary.length, 'Backup round-trip lost itinerary records');
  assert(restored.expenses.length === state.expenses.length, 'Backup round-trip lost expenses');
  assert(restored.reservations.length === state.reservations.length, 'Backup round-trip lost reservations');

  const stay = state.itinerary.find(x => x.localCurrency && Number(x.fixedLocalPerAUD) > 0 && Number(x.destinationBudgetAUD) > 0);
  assert(stay, 'No usable Destination Budget stay in fixture');
  const date = midDate(stay);
  const expenseDraft = structuredClone(state);
  const expense = saveExpenseDraft(expenseDraft, { fields:{ date, category:'groceries', description:'V54 routing probe', originalCurrency:'AUD', originalAmount:10 } }, { now:()=>`${date}T12:00:00.000Z` });
  assert(expense.itineraryId === stay.id, 'Expense did not route to exact dated Destination Budget');
  const reservationDraft = structuredClone(state);
  const reservation = saveReservationDraft(reservationDraft, { fields:{ type:'ticket', title:'V54 routing probe', dateTime:date, originalCurrency:'AUD', originalAmount:10, status:'to-book', notes:'' } }, { now:()=>`${date}T12:00:00.000Z` });
  assert(reservation.itineraryId === stay.id, 'Reservation did not route to exact dated Destination Budget');
  const before = destinationLedger(reservationDraft, stay.id).reservations.length;
  assert(!destinationLedger(reservationDraft, stay.id).reservations.some(x => x.id === reservation.id), 'To Book reservation incorrectly entered Destination Budget ledger');
  assert(before >= 0, 'Destination ledger failed');

  let noStayRejected = false;
  try {
    saveExpenseDraft(structuredClone(state), { fields:{ date:'2040-01-01', category:'miscellaneous', description:'must fail', originalCurrency:'AUD', originalAmount:1 } }, { now:()=> '2040-01-01T12:00:00.000Z' });
  } catch { noStayRejected = true; }
  assert(noStayRejected, 'Expense outside all stays was silently routed');

  const future = structuredClone(state);
  const currentGeneration=Number(APP_VERSION.match(/-v(\d+)/)?.[1]);
  future.meta.appVersion = `1.2.0-v${currentGeneration+1}-future`;
  let futureRejected=false;
  try { migrateState(future, { now:'2031-01-13T23:00:00.000Z' }); } catch { futureRejected=true; }
  assert(futureRejected, 'Newer app-generation state was accepted');

  let blankCountryRejected=false;
  try {
    createItineraryEntry({
      name:'V54 blank-country probe',travelType:'standard',startDate:'2035-01-01',endDate:'2035-01-02',
      startCity:'',startCountry:'',country:'',localCurrency:'AUD',fixedLocalPerAUD:1,destinationBudgetAUD:100,lat:null,long:null
    }, { now:()=> '2034-01-01T00:00:00.000Z' });
  } catch (error) { blankCountryRejected=String(error?.message||'').includes('Standard stays require a country'); }
  assert(blankCountryRejected, 'New Standard stay without Country was accepted');

  // App Health must track user-data trust, not internal Vault byte placement.
  // A freshly verified state stays clean when an embedded screenshot is moved
  // into IndexedDB representation, navigation stays clean, a real mutation
  // dirties it, and every Restore/replacement requires a fresh check even when
  // the restored JSON is otherwise identical.
  const healthService=new StateService(new MemoryStorageAdapter(),{now:()=> '2029-02-24T12:00:00.000Z'});
  healthService.replaceValidated(state);
  healthService.markAppHealthChecked();
  assert(!healthService.isAppHealthDirty(),'Fresh App Health verification did not clear dirty state');
  const internalAssetMove=healthService.snapshot();
  const embeddedAttachment=internalAssetMove.attachments?.find(item=>typeof item.dataUrl==='string'&&item.dataUrl);
  if(embeddedAttachment){
    delete embeddedAttachment.dataUrl;
    embeddedAttachment.assetKey=`vault:${embeddedAttachment.id}`;
    embeddedAttachment.byteLength=68;
    healthService.replaceValidated(internalAssetMove,{invalidateHealth:false});
    assert(!healthService.isAppHealthDirty(),'Internal Vault screenshot migration falsely dirtied App Health');
  }
  healthService.commit(draft=>{draft.ui.activeScreen=draft.ui.activeScreen==='home'?'budget':'home';});
  assert(!healthService.isAppHealthDirty(),'Navigation-only state dirtied App Health');
  healthService.commit(draft=>{draft.settings.annualBudgetAUD=Number(draft.settings.annualBudgetAUD||0)+1;});
  assert(healthService.isAppHealthDirty(),'Substantive saved mutation did not dirty App Health');
  healthService.markAppHealthChecked();
  assert(!healthService.isAppHealthDirty(),'Re-check did not clear App Health after mutation');
  healthService.replaceValidated(healthService.snapshot());
  assert(healthService.isAppHealthDirty(),'Identical Restore/replacement did not force a fresh App Health check');

  // Protected Recovery can retain a validated pending Restore when the first
  // localStorage write fails. If Retry iPad Storage later commits that pending
  // Restore, it must still invalidate App Health even when the restored state
  // is identical to the previously verified state.
  const retryAdapter=new MemoryStorageAdapter();
  const retryHealthService=new StateService(retryAdapter,{now:()=> '2029-02-24T12:00:00.000Z'});
  retryHealthService.hydrate();
  retryHealthService.replaceValidated(state);
  retryHealthService.markAppHealthChecked();
  const retryTarget=retryHealthService.snapshot();
  retryHealthService.recovery={active:true,storageUnavailable:true,reason:'acceptance probe',raw:retryAdapter.value,lastGoodSerialized:retryAdapter.value};
  retryAdapter.failNextWrite=true;
  try { retryHealthService.replaceValidated(retryTarget); } catch {}
  assert(Boolean(retryHealthService.recovery?.pendingRestoreSerialized),'Failed Restore did not retain its validated pending candidate');
  const retryOk=await retryHealthService.retryStorage();
  assert(retryOk,'Retry iPad Storage did not commit the pending Restore');
  assert(retryHealthService.isAppHealthDirty(),'Pending Restore committed through Retry did not force a fresh App Health check');

  const duplicateProbe = { itinerary:[], reservations:[
    {id:'d1',type:'flight',title:'V54 Duplicate',dateTime:'2030-03-03',status:'booked',originalCurrency:'AUD',originalAmount:1,audAmount:1,itineraryId:null,needsBudgetRepair:false,notes:''},
    {id:'d2',type:'flight',title:'v54   duplicate',dateTime:'2030-03-03T09:00',status:'booked',originalCurrency:'AUD',originalAmount:1,audAmount:1,itineraryId:null,needsBudgetRepair:false,notes:''},
    {id:'d3',type:'flight',title:'V54 Duplicate',dateTime:'2030-03-03T10:00',status:'booked',originalCurrency:'AUD',originalAmount:1,audAmount:1,itineraryId:null,needsBudgetRepair:false,notes:''},
    {id:'t1',type:'train',title:'V54 Timed Legit',dateTime:'2030-03-04T09:00',status:'booked',originalCurrency:'AUD',originalAmount:1,audAmount:1,itineraryId:null,needsBudgetRepair:false,notes:''},
    {id:'t2',type:'train',title:'V54 Timed Legit',dateTime:'2030-03-04T10:00',status:'booked',originalCurrency:'AUD',originalAmount:1,audAmount:1,itineraryId:null,needsBudgetRepair:false,notes:''}
  ]};
  const duplicateHealth = buildReservationsViewModel(duplicateProbe,'2030-03-01',{activeType:'flight'}).health.duplicateGroups;
  assert(duplicateHealth.length===1 && duplicateHealth[0].length===3, 'Date-only duplicate wildcard semantics regressed');
  const timedHealth = buildReservationsViewModel(duplicateProbe,'2030-03-01',{activeType:'train'}).health.duplicateGroups;
  assert(!timedHealth.some(group=>group.includes('t1')||group.includes('t2')), 'Different explicit reservation times were incorrectly grouped as duplicates');

  return { appVersion:APP_VERSION, backupBytes:Buffer.byteLength(backup), routeStay:stay.id, blankCountryRejected, duplicateProbeGroups:duplicateHealth.length };
}

function sweepChunk(startS, endS) {
  const state=migratedFixture();
  let days=0, builds=0;
  let cur=new Date(`${startS}T12:00:00Z`), end=new Date(`${endS}T12:00:00Z`);
  while(cur<=end){
    const iso=cur.toISOString().slice(0,10);
    const models=[
      buildHomeViewModel(state,iso),
      buildBudgetViewModel(state,iso),
      buildReservationsViewModel(state,iso,{activeType:'flight'}),
      buildItineraryViewModel(state,iso,{mapYears:['all']}),
      buildCalendarViewModel(state,iso,{month:iso.slice(0,7),view:'month'}),
      buildJourneyHistoryViewModel(state,iso,{years:['all']}),
      buildChecklistViewModel(state,iso),
    ];
    for(const model of models){ assert(model && typeof model==='object',`Invalid model on ${iso}`); builds++; }
    days++; cur.setUTCDate(cur.getUTCDate()+1);
  }
  return {start:startS,end:endS,days,builds};
}

const args=process.argv.slice(2);
if(args[0]==='--chunk') {
  if(!args[1]||!args[2]) throw new Error('--chunk requires START END');
  console.log(JSON.stringify(sweepChunk(args[1],args[2])));
} else {
  console.log(JSON.stringify(await commonChecks()));
}
