import { formatAUDate, toISODate } from './src_core_dates.js';
function wallClockSortKey(value){
  if(!value)return'9999-12-31T23:59:59';
  const text=String(value).trim();
  const match=text.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if(match){const[,date,hour='00',minute='00',second='00']=match;return`${date}T${hour}:${minute}:${second}`;}
  return`${toISODate(value)}T00:00:00`;
}
function isOnOrAfter(value,currentDate){if(!value)return false;return toISODate(value)>=toISODate(currentDate);}
function displayDate(value){return value?formatAUDate(value):'';}
function enteredTime(value){const match=String(value||'').match(/T(\d{2}):(\d{2})/);return match?`${match[1]}:${match[2]}`:'';}
export function buildUpcomingEvents(state,currentDate,{limit=100}={}){
  const reservationEvents=(state.reservations||[]).filter(item=>item.status!=='to-book'&&item.dateTime&&isOnOrAfter(item.dateTime,currentDate)).map(item=>({id:`reservation:${item.id}`,sourceId:item.id,kind:'reservation',type:item.type,title:item.title,dateTime:item.dateTime,displayDate:displayDate(item.dateTime),displayTime:enteredTime(item.dateTime),itineraryId:item.itineraryId||null,status:item.status}));
  const personalEvents=(state.calendarEvents||[]).filter(item=>!item.reservationId&&(item.dateTime||item.date)&&isOnOrAfter(item.dateTime||item.date,currentDate)).map(item=>({id:`calendar:${item.id}`,sourceId:item.id,kind:'calendar',type:item.type||'personal',title:item.title||'Calendar event',dateTime:item.dateTime||item.date,displayDate:displayDate(item.dateTime||item.date),displayTime:enteredTime(item.dateTime||item.date),itineraryId:item.itineraryId||null,status:item.status||null}));
  return[...reservationEvents,...personalEvents].sort((a,b)=>wallClockSortKey(a.dateTime).localeCompare(wallClockSortKey(b.dateTime))||a.title.localeCompare(b.title)).slice(0,Math.max(0,Number(limit)||0));
}
