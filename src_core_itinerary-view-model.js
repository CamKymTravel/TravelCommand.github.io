import { formatAUDate, stayDurationDays, toISODate } from './src_core_dates.js';
import { detectForwardTimelineIssues, filterByTravelYears, sortItinerary, travelYearForDate, availableTravelYears, findCurrentStay, findNextDestination } from './src_core_planning.js';
import { buildJourneyMapModel } from './src_core_journey-map-model.js';

const DAY_MS = 86_400_000;
const comparisonText=value=>String(value??'').normalize('NFC').trim().toLocaleLowerCase('en-AU');
const dayNumber = value => Math.floor(new Date(`${toISODate(value)}T00:00:00Z`).valueOf() / DAY_MS);

function isCompleted(entry, currentDate) { return dayNumber(entry.endDate) < dayNumber(currentDate); }
function hasAccommodation(state, itineraryId) { return (state.reservations || []).some(record => record.itineraryId === itineraryId && record.type === 'accommodation' && record.status !== 'to-book' && !record.needsBudgetRepair); }
function isHomeAustraliaStay(entry) {
  if (!entry || entry.travelType !== 'standard') return false;
  const country = comparisonText(entry.country);
  const name = comparisonText(entry.name);
  const australia = country === 'australia' || country === 'au';
  return australia && /(^|[\s/\-])home([\s/\-]|$)/.test(name);
}
function routePointCount(state, itineraryId) { return (state.routePoints || []).filter(point => point.itineraryId === itineraryId).length; }
function effectiveJourneyStart(state) { return state.settings?.journeyStartDate || sortItinerary(state.itinerary || [])[0]?.startDate || null; }
function normalizedSearch(query) { return comparisonText(query); }
function matchesSearch(entry, query) { if (!query) return true; const text=comparisonText([entry.name,entry.country,entry.startCity,entry.startCountry,entry.travelType].filter(Boolean).join(' ')); return query.split(/\s+/).filter(Boolean).every(token=>text.includes(token)); }

function recordView(entry, state, journeyStartDate) {
  return {
    id:entry.id,name:entry.name,country:entry.country||'',travelType:entry.travelType,startCity:entry.startCity||'',startCountry:entry.startCountry||'',
    startDate:entry.startDate,endDate:entry.endDate,displayDates:`${formatAUDate(entry.startDate)} – ${formatAUDate(entry.endDate)}`,
    days:stayDurationDays(entry.startDate,entry.endDate),travelYear:journeyStartDate?travelYearForDate(entry.startDate,journeyStartDate):null,
    destinationBudgetAUD:Number(entry.destinationBudgetAUD||0),localCurrency:entry.localCurrency||null,fixedLocalPerAUD:entry.fixedLocalPerAUD??null,
    routePointCount:routePointCount(state,entry.id),hasAccommodation:entry.travelType!=='standard'||hasAccommodation(state,entry.id)
  };
}

function addCalendarMonthsISO(value, months) {
  const [year,month,day]=toISODate(value).split('-').map(Number);
  const zero=(month-1)+Number(months||0);
  const targetYear=year+Math.floor(zero/12);
  const targetMonth=((zero%12)+12)%12;
  const lastDay=new Date(Date.UTC(targetYear,targetMonth+1,0)).getUTCDate();
  if(day<=lastDay)return new Date(Date.UTC(targetYear,targetMonth,day)).toISOString().slice(0,10);
  // Forward Coverage uses this result as an exclusive calendar-month boundary.
  // When the source date has no matching day in the target month (29 Feb or
  // the 31st), clamping to the target month's last day and then excluding that
  // boundary drops a legitimate final calendar day. Roll the exclusive edge
  // to the following day so the complete target month remains covered.
  return new Date(Date.UTC(targetYear,targetMonth,lastDay+1)).toISOString().slice(0,10);
}

function dayISO(day) { return new Date(day*DAY_MS).toISOString().slice(0,10); }

export function calculateForwardCoverage(entries, currentDate, months = 6, journeyStartDate = null) {
  const normalizedEntries=entries||[];
  const todayISO=toISODate(currentDate);
  const journeyISO=journeyStartDate?toISODate(journeyStartDate):null;
  const startISO=journeyISO&&journeyISO>todayISO?journeyISO:todayISO;
  const exclusiveEnd=dayNumber(addCalendarMonthsISO(startISO, Math.max(1,Number(months)||6)));
  const current=dayNumber(startISO);
  const lastDay=exclusiveEnd-1;
  const horizonDays=Math.max(0,lastDay-current+1);
  const sorted=sortItinerary(normalizedEntries);
  let plannedDays=0,gapDays=0,overlapDays=0;
  const gaps=[]; let gapStart=null;

  for(let day=current;day<=lastDay;day+=1){
    const matches=sorted.filter(entry=>day>=dayNumber(entry.startDate)&&day<=dayNumber(entry.endDate));
    if(matches.length){plannedDays+=1;if(matches.length>1)overlapDays+=1;if(gapStart!=null){gaps.push({type:'gap',startDate:dayISO(gapStart),endDate:dayISO(day-1),days:day-gapStart});gapStart=null;}}
    else {gapDays+=1;if(gapStart==null)gapStart=day;}
  }
  if(gapStart!=null)gaps.push({type:'gap',startDate:dayISO(gapStart),endDate:dayISO(lastDay),days:lastDay-gapStart+1});

  const stays=sorted.map(entry=>{
    const start=Math.max(current,dayNumber(entry.startDate));
    const end=Math.min(lastDay,dayNumber(entry.endDate));
    if(end<start)return null;
    return {type:'stay',id:entry.id,name:entry.name,travelType:entry.travelType,startDate:dayISO(start),endDate:dayISO(end),days:end-start+1};
  }).filter(Boolean);
  const segments=[...stays,...gaps].sort((a,b)=>String(a.startDate).localeCompare(String(b.startDate))||String(a.type).localeCompare(String(b.type)));
  return {
    startDate:startISO,endDate:horizonDays?dayISO(lastDay):startISO,horizonDays,plannedDays,gapDays,overlapDays,
    coveragePercent:horizonDays?Math.round((plannedDays/horizonDays)*100):0,segments
  };
}

const REGION_LABELS=new Set(['caribbean','europe','asia','africa','north america','south america','central america','middle east','mediterranean','baltic','scandinavia','world']);
const COUNTRY_ALIASES=new Map([
  ['uk','united kingdom'],['u.k.','united kingdom'],['united kingdom','united kingdom'],
  ['usa','united states'],['u.s.a.','united states'],['us','united states'],['u.s.','united states'],['united states of america','united states'],['united states','united states'],
  ['türkiye','turkey'],['turkiye','turkey'],['turkey','turkey'],
  ['czechia','czech republic'],['czech republic','czech republic'],
  ['uae','united arab emirates'],['u.a.e.','united arab emirates'],['united arab emirates','united arab emirates']
]);
function plannedCountryKey(value){
  const raw=comparisonText(value);
  if(!raw||REGION_LABELS.has(raw))return '';
  return COUNTRY_ALIASES.get(raw)||raw;
}
function plannedCountries(entries){
  const countries=new Set();
  for(const entry of entries||[]){
    const route=entry.travelType==='motorhome'||entry.travelType==='cruise'||entry.travelType==='rv';
    // A Standard stay's country is one identity value. Do not split official
    // country names containing commas (for example, Congo, Democratic Republic
    // of the). Only route trips may intentionally carry a multi-country route
    // label in the general country field.
    const countryParts=route
      ? String(entry.country||'').split(/\s*(?:\/|→|->|,)\s*/).map(v=>v.trim()).filter(Boolean)
      : [String(entry.country||'').trim()].filter(Boolean);
    const sources=[...countryParts,route?(entry.startCountry||''):''];
    for(const source of sources){
      const key=plannedCountryKey(source);
      if(key)countries.add(key);
    }
  }
  return countries;
}

function plannedCountryDetails(entries){
  const countries=new Map();
  for(const entry of entries||[]){
    const route=entry.travelType==='motorhome'||entry.travelType==='cruise'||entry.travelType==='rv';
    const countryParts=route
      ? String(entry.country||'').split(/\s*(?:\/|→|->|,)\s*/).map(v=>v.trim()).filter(Boolean)
      : [String(entry.country||'').trim()].filter(Boolean);
    const sources=[...countryParts,route?(entry.startCountry||''):''].filter(Boolean);
    for(const source of sources){
      const key=plannedCountryKey(source);
      if(!key)continue;
      if(!countries.has(key))countries.set(key,{key,label:String(source).trim(),stayIds:new Set(),stays:[]});
      const item=countries.get(key);
      if(!item.stayIds.has(entry.id)){item.stayIds.add(entry.id);item.stays.push({id:entry.id,name:entry.name,startDate:entry.startDate,endDate:entry.endDate,travelType:entry.travelType});}
    }
  }
  return [...countries.values()]
    .map(item=>({key:item.key,label:item.label,stays:item.stays,count:item.stays.length}))
    .sort((a,b)=>a.label.localeCompare(b.label,'en-AU'));
}

export function buildItineraryViewModel(state, currentDate, options = {}) {
  const all=sortItinerary(state.itinerary||[]);
  const journeyStartDate=effectiveJourneyStart(state);
  const searchQuery=normalizedSearch(options.searchQuery);
  const selectedYears=options.mapYears??['all'];
  const yearScoped=filterByTravelYears(all,selectedYears,journeyStartDate);
  const filtered=yearScoped.filter(entry=>matchesSearch(entry,searchQuery));
  const currentAndFuture=all.filter(entry=>!isCompleted(entry,currentDate));
  const todayDay=dayNumber(currentDate);
  const futureOnly=all.filter(entry=>dayNumber(entry.startDate)>todayDay);
  const issues=detectForwardTimelineIssues(currentAndFuture,currentDate);
  const upcoming=filtered.filter(entry=>!isCompleted(entry,currentDate)).map(entry=>recordView(entry,state,journeyStartDate));
  const completed=filtered.filter(entry=>isCompleted(entry,currentDate)).sort((a,b)=>dayNumber(b.endDate)-dayNumber(a.endDate)).map(entry=>recordView(entry,state,journeyStartDate));
  const routeTrips=futureOnly.filter(entry=>entry.travelType==='motorhome'||entry.travelType==='cruise'||entry.travelType==='rv');
  const futureIds=new Set(futureOnly.map(entry=>entry.id));
  const routePoints=(state.routePoints||[]).filter(point=>futureIds.has(point.itineraryId));
  const missingStays=currentAndFuture.filter(entry=>entry.travelType==='standard'&&!isHomeAustraliaStay(entry)&&!hasAccommodation(state,entry.id));
  const current=findCurrentStay(all,currentDate);
  const next=findNextDestination(all,currentDate);
  const forwardCoverage=calculateForwardCoverage(all,currentDate,options.coverageMonths??6,journeyStartDate);
  const coverageGaps=(forwardCoverage.segments||[]).filter(segment=>segment.type==='gap');
  const journeyMap=buildJourneyMapModel({...state,itinerary:currentAndFuture,routePoints:(state.routePoints||[]).filter(point=>currentAndFuture.some(entry=>entry.id===point.itineraryId))},options.mapYears??['all']);
  // The forward-planning map intentionally contains only current/future stays,
  // but these Travel Year controls also filter the completed itinerary list.
  // Use the full itinerary for the available buttons so Year 5+ history cannot
  // become unreachable after those years are entirely completed.
  journeyMap.availableYears=availableTravelYears(all,journeyStartDate,{minimum:4});

  const countryDetails=plannedCountryDetails(futureOnly);
  const itineraryById=new Map(all.map(entry=>[entry.id,entry]));
  const routeTripDetails=routeTrips.map(entry=>recordView(entry,state,journeyStartDate));
  const stopDetails=[
    ...futureOnly.map(entry=>({kind:'stay',id:entry.id,name:entry.name,country:entry.country||entry.startCountry||'',travelType:entry.travelType,startDate:entry.startDate,endDate:entry.endDate})),
    ...routePoints.map(point=>({kind:'route-point',id:point.id,name:point.name,parentId:point.itineraryId,parentName:itineraryById.get(point.itineraryId)?.name||'Route trip',order:point.order}))
  ];
  const overlapDetails=issues.overlaps.map(issue=>{
    const firstEntry=itineraryById.get(issue.firstId)||null;
    const secondEntry=itineraryById.get(issue.secondId)||null;
    const overlapStart=secondEntry?.startDate||null;
    const overlapEnd=firstEntry&&secondEntry?(dayNumber(firstEntry.endDate)<=dayNumber(secondEntry.endDate)?firstEntry.endDate:secondEntry.endDate):null;
    return {
      ...issue,overlapStart,overlapEnd,
      first:firstEntry?recordView(firstEntry,state,journeyStartDate):null,
      second:secondEntry?recordView(secondEntry,state,journeyStartDate):null
    };
  });
  return {
    journeyStartDate,
    currentStay:current?recordView(current,state,journeyStartDate):null,
    nextDestination:next?recordView(next,state,journeyStartDate):null,
    stats:{countriesPlanned:countryDetails.length,routeTrips:routeTrips.length,plannedStops:futureOnly.length+routePoints.length,missingCoverage:coverageGaps.length,missingStays:missingStays.length,dateOverlaps:issues.overlaps.length},
    statDetails:{countries:countryDetails,routes:routeTripDetails,stops:stopDetails,gaps:coverageGaps,stays:missingStays.map(entry=>recordView(entry,state,journeyStartDate)),overlaps:overlapDetails},
    issueDetails:{gaps:coverageGaps,overlaps:issues.overlaps,missingStays:missingStays.map(entry=>({id:entry.id,name:entry.name}))},
    forwardCoverage,
    upcoming,completed,
    journeyMap
  };
}
