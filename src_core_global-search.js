import { formatAUDate, toISODate } from './src_core_dates.js';

const SEARCHABLE_COLLECTIONS=Object.freeze([['itinerary','Itinerary'],['reservations','Reservations'],['calendarEvents','Calendar'],['journeyHistory','Journey History'],['checklists','Checklist'],['expenses','Budget']]);
const TEXT_FIELDS=Object.freeze(['name','title','description','notes','note','country','startCity','startCountry','category','type','owner']);
const DATE_FIELDS=Object.freeze(['date','dateTime','startDate','endDate','dueDate','issueDate','expiryDate','lastCheckedDate']);
function safeDate(value){try{return value?formatAUDate(value):'';}catch{return'';}}
function comparisonText(value){return String(value??'').normalize('NFC').trim().toLocaleLowerCase('en-AU');}
function searchableText(record,linkedStay){const direct=TEXT_FIELDS.map(field=>record?.[field]).filter(v=>typeof v==='string'&&v.trim());const dates=DATE_FIELDS.map(field=>safeDate(record?.[field])).filter(Boolean);const linked=linkedStay?[linkedStay.name,linkedStay.country,linkedStay.startCountry,safeDate(linkedStay.startDate),safeDate(linkedStay.endDate)].filter(v=>typeof v==='string'&&v.trim()):[];return comparisonText([...direct,...dates,...linked].filter(Boolean).join(' '));}
const CATEGORY_LABELS=Object.freeze({groceries:'Groceries','eating-out':'Eating Out',transport:'Transport',entertainment:'Entertainment',shopping:'Shopping',miscellaneous:'Miscellaneous'});
function readableFallback(value){const text=String(value||'');return CATEGORY_LABELS[text]||text.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase());}
function resultTitle(record,fallback){for(const value of [record.name,record.title,record.description])if(typeof value==='string'&&value.trim())return value;for(const value of [record.category,record.type])if(typeof value==='string'&&value.trim())return readableFallback(value);return fallback;}
function safeDateTime(value){
  const date=safeDate(value); if(!date)return'';
  const match=String(value||'').match(/T(\d{2}:\d{2})(?::\d{2})?/);
  return match ? `${date} · ${match[1]}` : date;
}
function resultDateContext(record,linked){
  const ownDate=record.dateTime
    ? safeDateTime(record.dateTime)
    : safeDate(record.date||record.dueDate||record.expiryDate||record.issueDate);
  if(linked){
    const stayDates=[safeDate(linked.startDate),safeDate(linked.endDate)].filter(Boolean).join(' – ');
    return [ownDate,linked.name,stayDates].filter(Boolean).join(' · ');
  }
  if(record.startDate||record.endDate){return [safeDate(record.startDate),safeDate(record.endDate)].filter(Boolean).join(' – ');}
  return ownDate;
}
function firstText(...values){for(const value of values)if(typeof value==='string'&&value.trim())return value;return'';}
export function searchCanonicalState(state,query,{limit=20,currentDate=null}={}){const normalized=comparisonText(query);if(!normalized)return[];const tokens=normalized.split(/\s+/).filter(Boolean);const results=[];const itineraryById=new Map((state.itinerary||[]).map(item=>[item.id,item]));const today=currentDate?toISODate(currentDate):null;for(const [collection,screenLabel] of SEARCHABLE_COLLECTIONS){for(const record of state[collection]||[]){if(collection==='calendarEvents'&&record.reservationId)continue;const linked=record.itineraryId?itineraryById.get(record.itineraryId):null;if(collection==='journeyHistory'&&(!linked||(today&&toISODate(linked.endDate)>=today)))continue;const haystack=searchableText(record,linked);if(!tokens.every(token=>haystack.includes(token)))continue;results.push({id:record.id,collection,screenLabel,title:collection==='journeyHistory'&&typeof linked?.name==='string'&&linked.name.trim()?linked.name:resultTitle(record,screenLabel),subtitle:firstText(record.country,record.notes,record.note,record.description),dateContext:resultDateContext(record,linked),modifiedAt:record.modifiedAt||record.createdAt||null});}}return results.sort((a,b)=>String(b.modifiedAt||'').localeCompare(String(a.modifiedAt||''))||a.title.localeCompare(b.title)).slice(0,Math.max(0,Number(limit)||0));}
