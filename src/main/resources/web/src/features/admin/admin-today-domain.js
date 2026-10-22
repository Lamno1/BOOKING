// Front-desk "today" view, computed from the admin ledger snapshot (Vietnam calendar day).
const addDays=(date,n)=>new Date(Date.parse(date+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
const arrivalOrder=['14-16','16-18','18-20','20-22','22-24','after-24'];
const active=b=>['CONFIRMED','CHECKED_IN'].includes(b.status);

export function todayBoard({bookings=[],requests=[],support=[],reviews=[],rooms=[]},today,now=Date.now()){
 // Arrivals in expected-arrival order; guests who gave no window go last.
 const eta=b=>{const i=arrivalOrder.indexOf(b.arrivalWindow);return i<0?arrivalOrder.length:i;};
 const arrivals=bookings.filter(b=>b.status==='CONFIRMED'&&b.arrival===today).sort((a,b)=>eta(a)-eta(b));
 const departures=bookings.filter(b=>b.status==='CHECKED_IN'&&b.departure<=today);
 const inHouse=bookings.filter(b=>b.status==='CHECKED_IN');
 const noShow=bookings.filter(b=>b.status==='CONFIRMED'&&b.arrival<today);
 const soon=requests.filter(r=>r.status==='PENDING'&&r.start&&r.start-now<=48*3600000&&r.start>=now-3600000).sort((a,b)=>a.start-b.start);
 const openSupport=support.filter(t=>['OPEN','IN_PROGRESS'].includes(t.status));
 const lowReviews=reviews.filter(r=>r.status==='VISIBLE'&&r.rating<=2);
 // Occupancy: booked room-nights over the next 7 nights / sellable room-nights.
 const nights=Array.from({length:7},(_,i)=>addDays(today,i));
 const occupancy=nights.map(night=>{const booked=bookings.filter(b=>active(b)&&b.arrival<=night&&b.departure>night).length;return {night,booked,rate:rooms.length?booked/rooms.length:0};});
 const weekRate=rooms.length?occupancy.reduce((s,n)=>s+n.booked,0)/(rooms.length*7):0;
 return {arrivals,departures,inHouse,noShow,soon,openSupport,lowReviews,occupancy,weekRate};
}
