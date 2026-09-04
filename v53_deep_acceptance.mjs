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

function commonChecks() {
  const state = migratedFixture();
  assert(state.meta.appVersion === APP_VERSION, 'Migrated fixture did not promote to current app version');

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
  const expense = saveExpenseDraft(expenseDraft, { fields:{ date, category:'groceries', description:'V53 routing probe', originalCurrency:'AUD', originalAmount:10 } }, { now:()=>`${date}T12:00:00.000Z` });
  assert(expense.itineraryId === stay.id, 'Expense did not route to exact dated Destination Budget');
  const reservationDraft = structuredClone(state);
  const reservation = saveReservationDraft(reservationDraft, { fields:{ type:'ticket', title:'V53 routing probe', dateTime:date, originalCurrency:'AUD', originalAmount:10, status:'to-book', notes:'' } }, { now:()=>`${date}T12:00:00.000Z` });
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
  future.meta.appVersion = '1.2.0-v54-future';
  let futureRejected=false;
  try { migrateState(future, { now:'2031-01-13T23:00:00.000Z' }); } catch { futureRejected=true; }
  assert(futureRejected, 'Newer app-generation state was accepted');
  return { appVersion:APP_VERSION, backupBytes:Buffer.byteLength(backup), routeStay:stay.id };
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
  console.log(JSON.stringify(commonChecks()));
}
