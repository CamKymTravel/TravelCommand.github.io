import { validateState } from './src_core_validation.js';
import { buildReservationsViewModel } from './src_core_reservations-view-model.js';
import { buildJourneyHistoryViewModel } from './src_core_journey-history-view-model.js';
import { createBackupPayload } from './src_core_backup.js';
import { parseBackupPayload } from './src_core_restore.js';
import { isDestinationBudgetUsable, staysCoveringDate, sameDayHandoffCandidates, annualBudgetForYear } from './src_core_budget.js';
import { detectTimelineIssues, sortItinerary } from './src_core_planning.js';
import { formatAUDate, toISODate } from './src_core_dates.js';

function check(id, label, status, summary, issues = []) { return { id, label, status, summary, issues }; }

function dataIntegrityCheck(state) {
  try { validateState(state); return check('data','Data Integrity','verified','Canonical state and record relationships verified.'); }
  catch (error) { return check('data','Data Integrity','needs-attention',error.message || 'Canonical validation failed.',[error.message || 'Canonical validation failed.']); }
}

function budgetCheck(state,currentDate=null) {
  const attention=[];
  const setup=[];
  const year = Number(String(currentDate || new Date().toISOString()).slice(0,4));
  const currentAnnualBudget = annualBudgetForYear(state.settings, year);
  if (!Number.isFinite(Number(currentAnnualBudget)) || Number(currentAnnualBudget) < 0) attention.push('Annual Budget is invalid.');
  if (Number(currentAnnualBudget || 0) === 0) setup.push(`Annual Budget for ${year} has not been configured.`);

  const missing = (state.itinerary || []).filter(stay => !isDestinationBudgetUsable(stay));
  if (missing.length) setup.push(`${missing.length} itinerary stay${missing.length===1?' still needs':'s still need'} a complete Destination Budget (AUD budget + fixed exchange rate; local currency comes automatically from the itinerary).`);

  const repairs=[...(state.expenses||[]),...(state.reservations||[])].filter(record=>record.needsBudgetRepair);
  if (repairs.length) attention.push(`${repairs.length} cost record${repairs.length===1?' needs':'s need'} expense/reservation routing repair.`);

  const missingAud=[...(state.expenses||[]),...(state.reservations||[])].filter(record=>!record.needsBudgetRepair && Number(record.originalAmount)>0 && !(Number(record.audAmount)>0));
  if (missingAud.length) attention.push(`${missingAud.length} cost record${missingAud.length===1?' is':'s are'} missing a usable AUD equivalent.`);

  const { overlaps }=detectTimelineIssues(state.itinerary||[]);
  if (overlaps.length) attention.push(`${overlaps.length} itinerary overlap${overlaps.length===1?' makes':'s make'} automatic date routing ambiguous.`);

  const issues=[...attention,...setup];
  const status=attention.length?'needs-attention':setup.length?'not-configured':'verified';
  const summary=status==='verified'?'Annual Budget, Destination Budget coverage and dated routing verified.':issues[0];
  return check('budget','Budget',status,summary,issues);
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
  const malformed=(state.checklists||[]).filter(item=>item.listType==='destination'&&!item.itineraryId).length;
  const itineraryIds=new Set((state.itinerary||[]).map(item=>item.id));
  const orphanScopes=(state.checklists||[]).filter(item=>item.listType==='permanent'&&Array.isArray(item.completedForItineraryIds)).reduce((sum,item)=>sum+item.completedForItineraryIds.filter(id=>!itineraryIds.has(id)).length,0);
  const issues=[];
  if(malformed)issues.push(`${malformed} destination checklist record${malformed===1?' is':'s are'} missing a destination.`);
  if(orphanScopes)issues.push(`${orphanScopes} Permanent Checklist completion ${orphanScopes===1?'scope references':'scopes reference'} a missing itinerary stay.`);
  return check('checklist','Checklist',issues.length?'needs-attention':'verified',issues[0]||'Permanent and destination checklist relationships verified.',issues);
}

function vaultCheck(state, externalIssues = []) {
  // App Health is visible outside The Vault. Never surface protected screenshot
  // filenames or other attachment-specific details here while the Vault is
  // locked. The storage audit may retain precise internal diagnostics, but this
  // cross-screen summary is deliberately generic.
  const assetIssues=[...externalIssues].filter(Boolean);
  const issues=[];
  if (assetIssues.length) {
    const storageUnavailable=assetIssues.some(issue=>/storage is unavailable/i.test(String(issue)));
    const orphanCleanup=assetIssues.find(issue=>/^\d+ unused Vault screenshot file/i.test(String(issue)));
    if (storageUnavailable) issues.push('Offline Vault screenshot storage is unavailable.');
    else if (orphanCleanup) issues.push(orphanCleanup);
    else issues.push(`${assetIssues.length} Vault screenshot ${assetIssues.length===1?'file needs':'files need'} offline verification.`);
  }
  if (state.settings?.pinEnabled && !state.settings?.pinHash) issues.push('Vault PIN is enabled without a stored PIN hash.');
  if (state.settings?.pinRecoveryNotice) issues.push(state.settings.pinRecoveryNotice);
  const orphan=(state.attachments||[]).filter(item=>!state.vault.some(record=>record.id===item.vaultRecordId)).length;
  if(orphan)issues.push(`${orphan} Vault screenshot attachment${orphan===1?' is':'s are'} orphaned.`);
  return check('vault','The Vault',issues.length?'needs-attention':'verified',issues[0]||'Protected records, screenshots and security settings verified.',issues);
}

function backupCheck(state) {
  try {
    // Runtime state keeps large Vault screenshot bytes in IndexedDB. The
    // synchronous health model can validate that metadata, while the actual
    // Export Backup action rehydrates and structurally verifies every payload
    // before it creates the one-file JSON backup.
    if (state.attachments?.some(item=>item.assetKey)) {
      validateState(state);
      return check('backup','Backup & Restore','verified','Backup structure verified. Vault screenshot bytes are rehydrated and verified when Export Backup is tapped.');
    }
    const serialized=createBackupPayload(state); const parsed=parseBackupPayload(serialized);
    if(parsed.schemaVersion!==state.schemaVersion)throw new Error('Backup round-trip schema mismatch');
    return check('backup','Backup & Restore','verified','Current state can be serialized into a valid full backup.');
  } catch(error) { return check('backup','Backup & Restore','needs-attention',error.message || 'Backup validation failed.',[error.message || 'Backup validation failed.']); }
}

function crossScreenCheck(state) {
  const issues=[];
  const itineraryIds=new Set((state.itinerary||[]).map(item=>item.id));
  for(const collection of ['expenses','reservations','checklists','journeyHistory','calendarEvents']) {
    const broken=(state[collection]||[]).filter(record=>{
      // A legacy cost in explicit Destination Budget repair mode may carry a
      // stale itinerary pointer solely as recoverable old data. That pointer is
      // deliberately non-authoritative until the record is re-saved by date,
      // so do not report it as a second cross-screen relationship failure.
      if((collection==='expenses'||collection==='reservations')&&record.needsBudgetRepair===true)return false;
      return record.itineraryId&&!itineraryIds.has(record.itineraryId);
    }).length;
    if(broken)issues.push(`${collection}: ${broken} broken itinerary relationship${broken===1?'':'s'}.`);
  }

  for (const [collection, dateField] of [['expenses','date'],['reservations','dateTime']]) {
    for (const record of state[collection] || []) {
      if (record.needsBudgetRepair) continue;
      if (collection === 'expenses' && record.budgetScope === 'annual') continue;
      if (collection === 'reservations' && (record.budgetScope || (record.type === 'ticket' ? 'destination' : 'annual')) === 'annual') continue;
      let date; try { date=toISODate(record[dateField]); } catch { continue; }
      const matches=staysCoveringDate(state.itinerary||[],date);
      const exactMatch=matches.length===1 && matches[0].id===record.itineraryId;
      const handoff=matches.length===2 ? sameDayHandoffCandidates(state.itinerary||[],date) : [];
      const validHandoff=handoff.length===2 && handoff.some(item=>item.id===record.itineraryId);
      if (!exactMatch && !validHandoff) {
        const label=collection==='expenses'
          ? (record.description || record.category || 'Expense')
          : (record.title || record.type || 'Reservation');
        issues.push(`${collection}: ${label} on ${formatAUDate(date)} does not match its dated itinerary stay.`);
        if (issues.length >= 8) break;
      }
    }
  }

  const standardMissingCountry=(state.itinerary||[]).filter(entry=>entry.travelType==='standard'&&!String(entry.country||'').trim());
  if(standardMissingCountry.length) issues.push(`${standardMissingCountry.length} Standard stay${standardMissingCountry.length===1?' is':'s are'} missing a Country required for its destination header and offline language helper.`);
  const routeMissingStartCountry=(state.itinerary||[]).filter(entry=>(entry.travelType==='cruise'||entry.travelType==='motorhome'||entry.travelType==='rv')&&!String(entry.startCountry||'').trim());
  if(routeMissingStartCountry.length) issues.push(`${routeMissingStartCountry.length} Cruise/RV trip${routeMissingStartCountry.length===1?' is':'s are'} missing a Starting Country for departure-language/header context.`);

  const sorted=sortItinerary(state.itinerary||[]);
  if (state.settings?.journeyStartDate && sorted.length && toISODate(sorted[0].startDate) < toISODate(state.settings.journeyStartDate)) {
    issues.push('Journey Start is later than the earliest itinerary stay and would create hidden pre-Year-1 travel.');
  }
  return check('cross-screen','Cross-Screen Routing',issues.length?'needs-attention':'verified',issues[0]||'Shared itinerary relationships and dated routing references are consistent.',issues);
}

export function buildBudgetHealth(state,currentDate=null) { return budgetCheck(state,currentDate); }

export function buildAppHealth(state,currentDate,{ vaultAssetIssues = [] } = {}) {
  const checks=[
    dataIntegrityCheck(state), budgetCheck(state,currentDate), reservationCheck(state,currentDate), calendarCheck(state),
    journeyCheck(state,currentDate), checklistCheck(state), vaultCheck(state,vaultAssetIssues), backupCheck(state), crossScreenCheck(state)
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
