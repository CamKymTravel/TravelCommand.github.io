import { validateState } from './src_core_validation.js';
import { buildReservationsViewModel } from './src_core_reservations-view-model.js';
import { buildJourneyHistoryViewModel } from './src_core_journey-history-view-model.js';
import { createBackupPayload } from './src_core_backup.js';
import { parseBackupPayload } from './src_core_restore.js';

function check(id, label, status, summary, issues = []) { return { id, label, status, summary, issues }; }

function dataIntegrityCheck(state) {
  try { validateState(state); return check('data','Data Integrity','verified','Canonical state and record relationships verified.'); }
  catch (error) { return check('data','Data Integrity','needs-attention','Canonical validation failed.',[error.message]); }
}

function budgetCheck(state) {
  const issues=[];
  if (!Number.isFinite(Number(state.settings?.annualBudgetAUD)) || Number(state.settings?.annualBudgetAUD) < 0) issues.push('Annual Budget is invalid.');
  if (Number(state.settings?.annualBudgetAUD || 0) === 0) issues.push('Annual Budget has not been configured.');
  const allocationProblems=[...(state.expenses||[]),...(state.reservations||[])].filter(record => record.allocation === 'destination' && !record.itineraryId).length;
  if (allocationProblems) issues.push(`${allocationProblems} destination-budget record${allocationProblems===1?' is':'s are'} missing an itinerary link.`);
  const status=issues.length ? (issues.every(item=>item.includes('not been configured'))?'not-configured':'needs-attention') : 'verified';
  return check('budget','Budget',status,status==='verified'?'Budget routing and Annual Budget setup verified.':issues[0],issues);
}

function reservationCheck(state,currentDate) {
  const health=buildReservationsViewModel(state,currentDate,{activeType:'flight'}).health;
  return check('reservations','Reservations',health.status,health.status==='verified'?'No duplicate, overdue To Book or missing AUD-equivalent issues found.':health.issues[0],health.issues);
}

function calendarCheck(state) {
  const mirrors=(state.calendarEvents||[]).filter(event=>event.reservationId).length;
  const issues=mirrors?[`${mirrors} legacy reservation mirror event${mirrors===1?' remains':'s remain'} in Calendar storage.`]:[];
  return check('calendar','Calendar',issues.length?'needs-attention':'verified',issues[0]||'Calendar uses canonical itinerary/reservation data plus personal reminders and notes.',issues);
}

function journeyCheck(state,currentDate) {
  const health=buildJourneyHistoryViewModel(state,currentDate,{years:['all']}).health;
  return check('journey','Journey History',health.status,health.status==='verified'?'Journey relationships and completed-history mapping verified.':health.issues[0],health.issues);
}

function checklistCheck(state) {
  const overdueMalformed=(state.checklists||[]).filter(item=>item.listType==='destination'&&!item.itineraryId).length;
  const issues=overdueMalformed?[`${overdueMalformed} destination checklist record${overdueMalformed===1?' is':'s are'} missing a destination.`]:[];
  return check('checklist','Checklist',issues.length?'needs-attention':'verified',issues[0]||'Permanent and destination checklist relationships verified.',issues);
}

function vaultCheck(state) {
  const issues=[];
  if (state.settings?.pinEnabled && !state.settings?.pinHash) issues.push('Vault PIN is enabled without a stored PIN hash.');
  const orphan=(state.attachments||[]).filter(item=>!state.vault.some(record=>record.id===item.vaultRecordId)).length;
  if(orphan)issues.push(`${orphan} Vault screenshot attachment${orphan===1?' is':'s are'} orphaned.`);
  return check('vault','The Vault',issues.length?'needs-attention':'verified',issues[0]||'Protected records, screenshots and security settings verified.',issues);
}

function backupCheck(state) {
  try {
    const serialized=createBackupPayload(state); const parsed=parseBackupPayload(serialized);
    if(parsed.schemaVersion!==state.schemaVersion)throw new Error('Backup round-trip schema mismatch');
    return check('backup','Backup & Restore','verified','Current state can be serialized into a valid full backup.');
  } catch(error) { return check('backup','Backup & Restore','needs-attention','Backup validation failed.',[error.message]); }
}

function crossScreenCheck(state) {
  const issues=[];
  const itineraryIds=new Set((state.itinerary||[]).map(item=>item.id));
  for(const collection of ['expenses','reservations','checklists','journeyHistory','calendarEvents']) {
    const broken=(state[collection]||[]).filter(record=>record.itineraryId&&!itineraryIds.has(record.itineraryId)).length;
    if(broken)issues.push(`${collection}: ${broken} broken itinerary relationship${broken===1?'':'s'}.`);
  }
  return check('cross-screen','Cross-Screen Routing',issues.length?'needs-attention':'verified',issues[0]||'Shared itinerary relationships and routing references are consistent.',issues);
}

export function buildAppHealth(state,currentDate) {
  const checks=[
    dataIntegrityCheck(state), budgetCheck(state), reservationCheck(state,currentDate), calendarCheck(state),
    journeyCheck(state,currentDate), checklistCheck(state), vaultCheck(state), backupCheck(state), crossScreenCheck(state)
  ];
  const attention=checks.filter(item=>item.status==='needs-attention');
  const setup=checks.filter(item=>item.status==='not-configured');
  return {
    status:attention.length?'needs-attention':setup.length?'needs-setup':'verified',
    checks,
    issueCount:attention.reduce((sum,item)=>sum+Math.max(1,item.issues.length),0),
    setupCount:setup.length,
    verifiedCount:checks.filter(item=>item.status==='verified').length
  };
}
