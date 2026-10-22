// Pure helpers for the results page and room calendar. The server remains the authority on price and availability.
const DAY=86400000;
export const addDays=(date,days)=>new Date(Date.parse(date+'T00:00:00Z')+days*DAY).toISOString().slice(0,10);
export const nightsBetween=(arrival,departure)=>Math.round((Date.parse(departure)-Date.parse(arrival))/DAY);
export const hasKitchen=room=>room.features.some(f=>f.toLowerCase().includes('bếp'));

export const sortOptions={recommended:'Gợi ý',priceUp:'Giá thấp → cao',priceDown:'Giá cao → thấp',area:'Diện tích lớn nhất',capacity:'Nhiều khách nhất'};
export const defaultFilters=()=>({propertyId:'all',kitchen:false,availableOnly:false,savedOnly:false,maxPrice:0,search:''});

export function filterRooms(rooms,filters,{guests=1,saved=[]}={}){
 const query=(filters.search||'').trim().toLowerCase();
 return rooms.filter(room=>(filters.propertyId==='all'||room.propertyId===filters.propertyId)
  &&room.capacity>=guests
  &&(!filters.kitchen||hasKitchen(room))
  &&(!filters.availableOnly||room.available===true)
  &&(!filters.savedOnly||saved.includes(room.id))
  &&(!filters.maxPrice||room.price<=filters.maxPrice)
  &&(!query||`${room.number} ${room.name} ${room.typeName} ${room.features.join(' ')}`.toLowerCase().includes(query)));
}
// "Recommended": fits the dates, then closest fit for the party size, then reviewed gallery, then price.
// Rooms with a reviewed gallery (`featured`) lead among equally suitable rooms, like listing-quality ranking elsewhere.
export function sortRooms(rooms,by,guests=1,featured=[]){
 const list=[...rooms];const rank=room=>room.available===true?0:room.available===false?2:1,photo=room=>featured.includes(room.id)?0:1;
 const compare={priceUp:(a,b)=>a.price-b.price,priceDown:(a,b)=>b.price-a.price,area:(a,b)=>b.area-a.area,capacity:(a,b)=>b.capacity-a.capacity,
  recommended:(a,b)=>rank(a)-rank(b)||(a.capacity-guests)-(b.capacity-guests)||photo(a)-photo(b)||a.price-b.price}[by]||(()=>0);
 return list.sort((a,b)=>compare(a,b)||a.number.localeCompare(b.number));
}
export function activeFilterCount(filters){return ['kitchen','availableOnly','savedOnly'].filter(k=>filters[k]).length+(filters.propertyId!=='all')+(!!filters.maxPrice)+(!!filters.search.trim());}
export const priceSteps=rooms=>[...new Set(rooms.map(r=>r.price))].sort((a,b)=>a-b);

/** First arrival on/after `from` with `nights` consecutive free nights inside the loaded window, or null. */
export function nextFreeRange(bookedNights,from,nights,days){
 const booked=new Set(bookedNights);
 for(let offset=0;offset+nights<=days;offset++){
  const arrival=addDays(from,offset);let free=true;
  for(let i=0;i<nights;i++)if(booked.has(addDays(arrival,i))){free=false;offset+=i;break;}
  if(free)return {arrival,departure:addDays(arrival,nights)};
 }
 return null;
}
export const rangeIsFree=(bookedNights,arrival,departure)=>{const booked=new Set(bookedNights);for(let d=arrival;d<departure;d=addDays(d,1))if(booked.has(d))return false;return true;};

/** Monday-first month grid; null pads the leading blanks. */
export function monthGrid(month){
 const first=month+'-01',lead=(new Date(first+'T00:00:00Z').getUTCDay()+6)%7,cells=Array(lead).fill(null);
 for(let d=first;d.slice(0,7)===month;d=addDays(d,1))cells.push(d);
 return cells;
}
export const nextMonth=month=>addDays(month+'-28',7).slice(0,7);
/** Picking a range on the calendar: first click sets arrival, second sets departure; a click before arrival restarts. */
export function pickDay({arrival,departure,picking},day){
 if(picking!=='departure'||!arrival||day<=arrival)return {arrival:day,departure:'',picking:'departure'};
 return {arrival,departure:day,picking:'arrival'};
}

const SAVED_KEY='stayos-saved-rooms-v1',RECENT_KEY='stayos-recent-rooms-v1';
const read=(key,storage)=>{try{const value=JSON.parse(storage.getItem(key));return Array.isArray(value)?value.filter(v=>typeof v==='string').slice(0,30):[];}catch{return [];}};
const write=(key,value,storage)=>{try{storage.setItem(key,JSON.stringify(value));}catch{}};
const local=()=>{try{return globalThis.localStorage;}catch{return null;}};
export const readSaved=(storage=local())=>read(SAVED_KEY,storage);
export function toggleSaved(id,storage=local()){const saved=readSaved(storage);const next=saved.includes(id)?saved.filter(v=>v!==id):[id,...saved];write(SAVED_KEY,next,storage);return next;}
export const writeSaved=(ids,storage=local())=>{write(SAVED_KEY,ids.slice(0,30),storage);return ids.slice(0,30);};
export const readRecent=(storage=local())=>read(RECENT_KEY,storage);
export function pushRecent(id,storage=local()){const next=[id,...readRecent(storage).filter(v=>v!==id)].slice(0,6);write(RECENT_KEY,next,storage);return next;}

/** Quick date presets (Vietnam calendar day in, ISO dates out). "Weekend" is the coming Friday→Sunday; on Fri/Sat it is the current one. */
export function datePresets(today){
 const dow=new Date(today+'T00:00:00Z').getUTCDay();
 const friday=dow===6?addDays(today,-1):addDays(today,(5-dow+7)%7);
 const weekendArrival=friday<today?today:friday;
 return [{id:'tonight',label:'Tối nay',arrival:today,departure:addDays(today,1)},{id:'weekend',label:'Cuối tuần này',arrival:weekendArrival,departure:addDays(friday,2)},{id:'week',label:'Tuần sau · 3 đêm',arrival:addDays(today,7-((dow+6)%7)),departure:addDays(today,10-((dow+6)%7))}];
}
/** Party size: adults ≥1, children ≥0, total ≤ max (largest room). */
export function clampParty(adults,children,max=6){const a=Math.min(max,Math.max(1,adults|0));return {adults:a,children:Math.min(max-a,Math.max(0,children|0))};}

/** Compare tray: up to `max` rooms, kept for this visit only. Adding past the limit is refused, not silently replacing one. */
export const COMPARE_MAX=3;
export function toggleCompare(list,id,max=COMPARE_MAX){
 if(list.includes(id))return {list:list.filter(v=>v!==id),full:false};
 if(list.length>=max)return {list,full:true};
 return {list:[...list,id],full:false};
}
/** Side-by-side rows built only from catalog facts and live availability; `best` marks the column(s) that lead on that row. */
export function compareRows(rooms,nights){
 const best=(values,pick)=>{const target=pick(values.filter(v=>v!=null));return values.map(v=>v!=null&&v===target&&values.filter(x=>x===target).length<values.length);};
 const status=r=>r.available===true?'Còn trống':r.available===false?(r.availabilityReason==='CLOSED'?'Tạm ngưng':'Đã kín'):'Đang kiểm tra';
 const features=[...new Set(rooms.flatMap(r=>r.features))];
 const rows=[
  {id:'price',label:'Giá mỗi đêm',values:rooms.map(r=>r.price),kind:'money',best:best(rooms.map(r=>r.price),v=>Math.min(...v))},
  ...(nights>0?[{id:'total',label:`Tiền phòng ${nights} đêm`,values:rooms.map(r=>r.price*nights),kind:'money',best:best(rooms.map(r=>r.price*nights),v=>Math.min(...v))}]:[]),
  {id:'area',label:'Diện tích',values:rooms.map(r=>`${r.area} m²`),best:best(rooms.map(r=>r.area),v=>Math.max(...v))},
  {id:'capacity',label:'Khách tối đa',values:rooms.map(r=>String(r.capacity)),best:best(rooms.map(r=>r.capacity),v=>Math.max(...v))},
  {id:'beds',label:'Giường',values:rooms.map(r=>r.beds),best:rooms.map(()=>false)},
  {id:'status',label:'Ngày đã chọn',values:rooms.map(status),best:rooms.map(r=>r.available===true&&rooms.some(o=>o.available!==true))},
  ...features.map(f=>({id:'f:'+f,label:f,values:rooms.map(r=>r.features.includes(f)),kind:'check',best:rooms.map(()=>false)}))
 ];
 return rows;
}

/** Recent searches (this browser only): newest first, at most 3, past arrivals dropped, same search kept once. */
const SEARCH_KEY='stayos-recent-searches-v1',ISO=/^\d{4}-\d{2}-\d{2}$/;
const validSearch=s=>s&&typeof s.propertyId==='string'&&ISO.test(s.arrival)&&ISO.test(s.departure)&&s.departure>s.arrival&&Number.isInteger(s.guests)&&s.guests>=1;
const sameSearch=(a,b)=>a.propertyId===b.propertyId&&a.arrival===b.arrival&&a.departure===b.departure&&a.guests===b.guests&&(a.kids||0)===(b.kids||0);
export function readSearches(today,storage=local()){
 try{const value=JSON.parse(storage.getItem(SEARCH_KEY));return Array.isArray(value)?value.filter(s=>validSearch(s)&&s.arrival>=today).slice(0,3):[];}catch{return [];}
}
export function pushSearch(search,today,storage=local()){
 const entry={propertyId:search.propertyId,arrival:search.arrival,departure:search.departure,guests:search.guests,kids:search.kids||0};
 if(!validSearch(entry))return readSearches(today,storage);
 const next=[entry,...readSearches(today,storage).filter(s=>!sameSearch(s,entry))].slice(0,3);
 write(SEARCH_KEY,next,storage);return next;
}
