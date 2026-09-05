import { formatAUDate, toISODate } from './src_core_dates.js';
import { isDestinationBudgetUsable } from './src_core_budget.js';
import { calculateForwardCoverage } from './src_core_itinerary-view-model.js';
import { buildChecklistViewModel } from './src_core_checklist-view-model.js';
import { detectTimelineIssues } from './src_core_planning.js';

const PRIORITY_ORDER=Object.freeze({critical:0,high:1,medium:2,low:3,info:4});
const DAY_MS=86_400_000;
const dayNumber=value=>Math.floor(new Date(`${toISODate(value)}T00:00:00Z`).valueOf()/DAY_MS);
function daysUntil(value,currentDate){return dayNumber(value)-dayNumber(currentDate);}
function enteredTime(value){const match=String(value||'').match(/T(\d{2}):(\d{2})/);return match?`${match[1]}:${match[2]}`:'';}
function alert(id,title,message,priority='info',target=null,dueDate=null){return{id,title,message,priority,target,dueDate,displayDueDate:dueDate?formatAUDate(dueDate):''};}
function sortAlerts(alerts){return[...alerts].sort((a,b)=>(PRIORITY_ORDER[a.priority]??4)-(PRIORITY_ORDER[b.priority]??4)||String(a.dueDate||'9999-12-31').localeCompare(String(b.dueDate||'9999-12-31'))||a.title.localeCompare(b.title));}

export function buildHomeAlerts(state,currentDate){
  const today=toISODate(currentDate);const alerts=[];
  for(const reservation of state.reservations||[]){if(reservation.status!=='to-book'||!reservation.dateTime)continue;const date=toISODate(reservation.dateTime);const days=daysUntil(date,today);const due=formatAUDate(date);const time=enteredTime(reservation.dateTime);const planned=[due,time].filter(Boolean).join(' · ');if(days<0)alerts.push(alert(`to-book:${reservation.id}`,'To Book Overdue',`${reservation.title} still needs booking · planned ${planned} has passed.`,'critical',{screen:'reservations',collection:'reservations',id:reservation.id},date));else{const timing=days===0?'today':`in ${days} day${days===1?'':'s'}`;alerts.push(alert(`to-book:${reservation.id}`,'To Book',`${reservation.title} still needs booking · ${planned} · ${timing}.`,days<=14?'high':'medium',{screen:'reservations',collection:'reservations',id:reservation.id},date));}}

  const sorted=[...(state.itinerary||[])].sort((a,b)=>String(a.startDate).localeCompare(String(b.startDate)));
  const next=sorted.find(stay=>toISODate(stay.startDate)>today)||null;
  if(next){const days=daysUntil(next.startDate,today);if(days<=14)alerts.push(alert(`next:${next.id}`,'Next Destination',`${next.name} starts in ${days} day${days===1?'':'s'}.`,days<=3?'high':'info',{screen:'itinerary',collection:'itinerary',id:next.id},next.startDate));}

  const checklist=buildChecklistViewModel(state,today);
  // Arrival-day tasks remain available in Checklist, but the move has already
  // happened. Do not keep a stale Home warning that says work remains "before"
  // the destination after its travel date has passed. Travel-day readiness is
  // still actionable; the following day the model rolls forward to the next move.
  const readinessAlertApplies=checklist.automaticStage!=='arrival';
  if(readinessAlertApplies&&checklist.nextDestination&&checklist.ready.status==='not-ready')alerts.push(alert(`checklist:${checklist.nextDestination.id}`,'Checklist Readiness',`${checklist.ready.remaining} required task${checklist.ready.remaining===1?'':'s'} remain before ${checklist.nextDestination.name}.`,'high',{screen:'checklist',collection:'itinerary',id:checklist.nextDestination.id},checklist.nextDestination.startDate));
  else if(readinessAlertApplies&&checklist.nextDestination&&checklist.ready.status==='needs-setup')alerts.push(alert(`checklist-setup:${checklist.nextDestination.id}`,'Checklist Needs Setup',`Add required checklist items for ${checklist.nextDestination.name}.`,'medium',{screen:'checklist',collection:'itinerary',id:checklist.nextDestination.id},checklist.nextDestination.startDate));

  const journeyStart=state.settings?.journeyStartDate || sorted[0]?.startDate || null;
  const coverage=calculateForwardCoverage(state.itinerary||[],today,3,journeyStart);
  if(coverage.gapDays>0)alerts.push(alert('coverage:3m','Missing Coverage',`${coverage.gapDays} uncovered day${coverage.gapDays===1?'':'s'} in the next 3 months.`,'high',{screen:'itinerary',collection:null,id:null},coverage.segments.find(s=>s.type==='gap')?.startDate||null));
  if(coverage.overlapDays>0){
    const horizonEntries=(state.itinerary||[]).filter(stay=>toISODate(stay.endDate)>=coverage.startDate&&toISODate(stay.startDate)<=coverage.endDate);
    const firstOverlap=detectTimelineIssues(horizonEntries).overlaps[0]||null;
    const affectedId=firstOverlap?.secondId||firstOverlap?.firstId||null;
    alerts.push(alert('coverage:overlap','Date Overlap',`${coverage.overlapDays} overlapping itinerary day${coverage.overlapDays===1?'':'s'} make date routing ambiguous.`,'critical',{screen:'itinerary',collection:affectedId?'itinerary':null,id:affectedId}));
  }

  for(const stay of state.itinerary||[]){if(toISODate(stay.endDate)<today)continue;if(!isDestinationBudgetUsable(stay))alerts.push(alert(`budget:${stay.id}`,'Destination Budget Needs Setup',`${stay.name} · ${formatAUDate(stay.startDate)} – ${formatAUDate(stay.endDate)} needs amount, currency and fixed exchange rate.`,'high',{screen:'budget',collection:'itinerary',id:stay.id},stay.startDate));}
  const repairs=[...(state.expenses||[]).map(r=>['expenses',r]),...(state.reservations||[]).map(r=>['reservations',r])].filter(([,r])=>r.needsBudgetRepair);
  for(const [collection,record] of repairs){const repairDate=collection==='expenses'?record.date:record.dateTime;const kind=collection==='expenses'?'expense':'reservation';const fallback=collection==='expenses'?String(record.category||'Expense').replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()):'Reservation';const subject=String(collection==='expenses'?(record.description||fallback):(record.title||fallback)).trim()||fallback;const dateLabel=repairDate?formatAUDate(repairDate):'date not set';alerts.push(alert(`repair:${collection}:${record.id}`,'Destination Budget Repair',`${subject} · ${dateLabel} needs Destination Budget repair. Amount/currency remain unverified until the record is repaired.`,'critical',{screen:collection==='expenses'?'budget':'reservations',collection,id:record.id},repairDate||null));}

  for(const record of state.vault||[]){if(!record.expiryDate)continue;const days=daysUntil(record.expiryDate,today);if(days>180)continue;const label=record.category==='passport'?'Passport':record.category==='visa'?'Visa':record.category==='insurance'?'Insurance':'Vault record';const subject=[record.title||label,record.owner].filter(Boolean).join(' · ');const expiry=formatAUDate(record.expiryDate);const timing=days===0?'today':`in ${days} day${days===1?'':'s'}`;alerts.push(alert(`vault-expiry:${record.id}`,`${label} Expiry`,days<0?`${subject} expired ${expiry}.`:`${subject} expires ${expiry} · ${timing}.`,days<0?'critical':days<=14?'high':days<=60?'medium':'low',{screen:'vault',collection:'vault',id:record.id},record.expiryDate));}

  if(state.settings?.pinRecoveryNotice)alerts.push(alert('vault-pin-recovery','Vault PIN Recovery',state.settings.pinRecoveryNotice,'high',{screen:'settings',collection:null,id:null}));

  const sch=state.settings?.schengen||{};
  if(sch.status==='not-allowed')alerts.push(alert('schengen:not-allowed','Schengen Warning','Manual Schengen status is Not Allowed.','critical',{screen:'settings',collection:null,id:null},sch.mustLeaveByDate||null));
  if(sch.mustLeaveByDate){const days=daysUntil(sch.mustLeaveByDate,today);if(days<0)alerts.push(alert('schengen:past','Schengen Must Leave By','The manual Must Leave By date has passed.','critical',{screen:'settings',collection:null,id:null},sch.mustLeaveByDate));else if(days<=14){const timing=days===0?'today':`in ${days} day${days===1?'':'s'}`;alerts.push(alert('schengen:soon','Schengen Must Leave By',`Manual Must Leave By is ${timing}.`,'high',{screen:'settings',collection:null,id:null},sch.mustLeaveByDate));}}
  return sortAlerts(alerts);
}
