import { formatAUDate, toISODate, stayDurationDays } from './src_core_dates.js';
import { findCurrentStay, findNextDestination } from './src_core_planning.js';
import { CHECKLIST_STAGES, CHECKLIST_OWNERS } from './src_core_checklist-mutations.js';

const DAY_MS=86_400_000;
const dayNumber=value=>Math.floor(new Date(`${toISODate(value)}T00:00:00Z`).valueOf()/DAY_MS);
function normalizeListType(value){return value==='destination'?'destination':'permanent';}
function normalizeStage(value){return CHECKLIST_STAGES.includes(value)?value:'before-leave';}
function normalizeOwner(value){return CHECKLIST_OWNERS.includes(String(value||'').toLowerCase())?String(value).toLowerCase():'both';}

export function deriveChecklistMoveContext(itinerary,currentDate){
  const today=toISODate(currentDate);const current=findCurrentStay(itinerary||[],today);const next=findNextDestination(itinerary||[],today);
  if(current){const delta=dayNumber(today)-dayNumber(current.startDate);if(delta===0)return{destination:current,stage:'travel-day'};if(delta===1)return{destination:current,stage:'arrival'};}
  if(next)return{destination:next,stage:'before-leave'};
  if(current)return{destination:current,stage:'current-stay'};
  return{destination:null,stage:'current-stay'};
}

function itemView(item,currentDate,scopeItineraryId){
  const dueDate=item.dueDate?toISODate(item.dueDate):null;
  const completed=item.listType==='permanent'
    ? Boolean(scopeItineraryId && Array.isArray(item.completedForItineraryIds) && item.completedForItineraryIds.includes(scopeItineraryId))
    : Boolean(item.completed);
  return{id:item.id,listType:item.listType,itineraryId:item.itineraryId||null,title:item.title,notes:item.notes||'',stage:normalizeStage(item.stage),owner:normalizeOwner(item.owner),required:item.required==null?true:Boolean(item.required),dueDate,displayDueDate:dueDate?formatAUDate(dueDate):'',completed,completedAt:item.completedAt||null,overdue:Boolean(dueDate&&!completed&&dueDate<currentDate)};
}
function sortItems(items){return[...items].sort((a,b)=>Number(a.completed)-Number(b.completed)||Number(b.overdue)-Number(a.overdue)||String(a.dueDate||'9999-12-31').localeCompare(String(b.dueDate||'9999-12-31'))||a.title.localeCompare(b.title));}
function progress(items){const total=items.length;const completed=items.filter(i=>i.completed).length;return{total,completed,remaining:total-completed,percent:total?Math.round(completed/total*100):0};}

function historyGroups(state,currentDate,activeDestinationId){
  const itineraryById=new Map((state.itinerary||[]).map(item=>[item.id,item]));const groups=new Map();
  for(const raw of state.checklists||[]){if(raw.listType!=='destination'||!raw.itineraryId||raw.itineraryId===activeDestinationId)continue;const itinerary=itineraryById.get(raw.itineraryId);if(!itinerary||toISODate(itinerary.endDate)>=currentDate)continue;if(!groups.has(raw.itineraryId))groups.set(raw.itineraryId,{itinerary,items:[]});groups.get(raw.itineraryId).items.push(itemView(raw,currentDate,raw.itineraryId));}
  return[...groups.values()].map(group=>({itineraryId:group.itinerary.id,name:group.itinerary.name,country:group.itinerary.country||'',endDate:group.itinerary.endDate,displayDates:`${formatAUDate(group.itinerary.startDate)} – ${formatAUDate(group.itinerary.endDate)}`,items:sortItems(group.items),progress:progress(group.items)})).sort((a,b)=>b.endDate.localeCompare(a.endDate));
}

export function buildChecklistViewModel(state,currentDate,options={}){
  const today=toISODate(currentDate);const listType=normalizeListType(options.listType||state.ui?.checklistListType);
  const context=deriveChecklistMoveContext(state.itinerary||[],today);const activeDestination=context.destination;const activeStage=normalizeStage(options.stage||context.stage);const scopeId=activeDestination?.id||null;
  const permanent=sortItems((state.checklists||[]).filter(item=>item.listType==='permanent').map(item=>itemView(item,today,scopeId)));
  const destination=activeDestination?sortItems((state.checklists||[]).filter(item=>item.listType==='destination'&&item.itineraryId===activeDestination.id).map(item=>itemView(item,today,scopeId))):[];
  const allActive=[...permanent,...destination];const requiredItems=allActive.filter(item=>item.required&&item.stage!=='arrival');const optionalItems=allActive.filter(item=>!item.required);
  const permanentRequired=permanent.filter(item=>item.required);const destinationRequired=destination.filter(item=>item.required);
  const stagePermanent=permanentRequired.filter(item=>item.stage===activeStage);const stageDestination=destinationRequired.filter(item=>item.stage===activeStage);
  const his=sortItems(optionalItems.filter(item=>item.stage===activeStage&&item.owner==='cameron'));const hers=sortItems(optionalItems.filter(item=>item.stage===activeStage&&item.owner==='kym'));const sharedOptional=sortItems(optionalItems.filter(item=>item.stage===activeStage&&item.owner==='both'));
  const permanentProgress=progress(permanentRequired);const destinationProgress=progress(destinationRequired);const activeItems=listType==='destination'?stageDestination:stagePermanent;const activeProgress=progress(activeItems);const requiredProgress=progress(requiredItems);const overviewProgress=progress(allActive);
  const hasConfiguredRequiredItems=allActive.some(item=>item.required);
  // Ready to Move is strictly pre-travel readiness. Required Arrival & Settle In
  // work is real checklist setup, but it must never turn departure readiness into
  // "Needs Setup" or "Not Ready" simply because there are no pre-travel required
  // items. Keep Needs Setup only for a move with no required checklist setup at all.
  const readyStatus=!activeDestination?'no-next-destination':!requiredItems.length?(hasConfiguredRequiredItems?'ready':'needs-setup'):requiredProgress.remaining===0?'ready':'not-ready';
  const stages=CHECKLIST_STAGES.map(stage=>{const stageItems=allActive.filter(item=>item.stage===stage);const requiredStageItems=stageItems.filter(item=>item.required);return{stage,total:stageItems.length,requiredRemaining:requiredStageItems.filter(item=>!item.completed).length,progress:progress(stageItems)};});
  const destinationSummary=activeDestination?{id:activeDestination.id,name:activeDestination.name,country:activeDestination.country||'',startDate:activeDestination.startDate,endDate:activeDestination.endDate,displayStartDate:formatAUDate(activeDestination.startDate),displayEndDate:formatAUDate(activeDestination.endDate),durationDays:stayDurationDays(activeDestination.startDate,activeDestination.endDate),travelType:activeDestination.travelType||'standard'}:null;
  // During a final/current stay with no later itinerary entry, keep that stay as
  // the checklist scope so Current Stay tasks remain editable. It is not,
  // however, a future move and must never be presented as Next Destination.
  const moveDestination=context.stage==='current-stay'?null:destinationSummary;
  const moveReadyStatus=!moveDestination?'no-next-destination':readyStatus;
  return{listType,activeStage,automaticStage:context.stage,activeDestinationId:scopeId,checklistDestination:destinationSummary,stages,nextDestination:moveDestination,permanent,destination,stagePermanent,stageDestination,his,hers,sharedOptional,activeItems,activeProgress,permanentProgress,destinationProgress,stagePermanentProgress:progress(stagePermanent),stageDestinationProgress:progress(stageDestination),overviewProgress,ready:{status:moveReadyStatus,completed:requiredProgress.completed,total:requiredProgress.total,remaining:requiredProgress.remaining,percent:requiredProgress.percent,overdue:requiredItems.filter(item=>item.overdue).length},overview:{completed:overviewProgress.completed,total:overviewProgress.total,remaining:overviewProgress.remaining,percent:overviewProgress.percent,overdue:allActive.filter(item=>item.overdue).length},history:historyGroups(state,today,scopeId)};
}
