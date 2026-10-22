// Reservation list for the admin console: search, status filter, sort and CSV export of exactly what is on screen.
export const bookingStatuses=['CONFIRMED','CHECKED_IN','CHECKED_OUT','CANCELLED'];
export const bookingSorts={created:'Mới đặt trước',arrivalUp:'Ngày đến gần nhất',arrivalDown:'Ngày đến xa nhất'};

const fold=text=>String(text??'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();

/** Matches booking id, guest name, email, room and special request; Vietnamese accents are ignored ("nguyen" finds "Nguyễn"). */
export function filterBookings(bookings,{query='',status='ALL'}={}){
 const words=fold(query).split(/\s+/).filter(Boolean);
 return bookings.filter(b=>(status==='ALL'||b.status===status)
  &&words.every(w=>fold(`${b.id} ${b.guestName} ${b.email} ${b.roomName} ${b.roomId} ${b.specialRequests||''}`).includes(w)));
}
export function statusCounts(bookings){
 const counts={ALL:bookings.length};
 for(const s of bookingStatuses)counts[s]=bookings.filter(b=>b.status===s).length;
 return counts;
}
/** Stable; ties fall back to newest booking first. Bookings without `createdAt` keep ledger order (later = newer). */
export function sortBookings(bookings,by='created'){
 const order=new Map(bookings.map((b,i)=>[b,i])),created=b=>b.createdAt??order.get(b);
 const newest=(a,b)=>created(b)-created(a)||order.get(b)-order.get(a);
 const compare={arrivalUp:(a,b)=>a.arrival.localeCompare(b.arrival),arrivalDown:(a,b)=>b.arrival.localeCompare(a.arrival)}[by];
 return [...bookings].sort((a,b)=>(compare?compare(a,b):0)||newest(a,b));
}

// Spreadsheet apps run cells that start with these characters as formulas; guest-typed text must never do that.
const neutralize=value=>typeof value==='string'&&/^[=+\-@\t\r]/.test(value)?"'"+value:value;
const cell=value=>{const text=String(neutralize(value??''));return /[",\r\n;]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;};
const nights=(a,d)=>Math.round((Date.parse(d)-Date.parse(a))/86400000);
const stamp=ms=>ms?new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh',dateStyle:'short',timeStyle:'short'}).format(new Date(ms)):'';

/** CSV with a BOM so Excel opens Vietnamese text correctly. Money stays a plain integer in đồng. */
export function bookingsCsv(bookings,{statusLabel=s=>s,propertyName=()=>'',windowText=()=>''}={}){
 const head=['Mã đơn','Khách','Email','Cơ sở','Phòng','Ngày đến','Ngày đi','Số đêm','Số khách','Trạng thái','Tổng (VND)','Giờ đến dự kiến','Yêu cầu đặc biệt','Thời điểm đặt'];
 const rows=bookings.map(b=>[b.id,b.guestName,b.email,propertyName(b),b.roomName,b.arrival,b.departure,nights(b.arrival,b.departure),b.guests,statusLabel(b.status),b.total,b.arrivalWindow?windowText(b.arrivalWindow):'',b.specialRequests||'',stamp(b.createdAt)]);
 return '﻿'+[head,...rows].map(r=>r.map(cell).join(',')).join('\r\n')+'\r\n';
}

/** "Returning guest": completed stays by the same email (case-insensitive, any property) that ended on or before this booking's arrival. */
export function completedStays(bookings){
 const key=email=>String(email||'').trim().toLowerCase(),byGuest=new Map();
 for(const b of bookings)if(b.status==='CHECKED_OUT'&&key(b.email))byGuest.set(key(b.email),[...(byGuest.get(key(b.email))||[]),b]);
 return booking=>(byGuest.get(key(booking?.email))||[]).filter(s=>s.id!==booking.id&&s.departure<=booking.arrival).length;
}
