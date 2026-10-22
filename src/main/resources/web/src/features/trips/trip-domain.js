// Trip page helpers: phase, countdown, itinerary and calendar export, all from the saved booking (Vietnam time).
import {arrivalWindowText} from '../../shared/booking-domain.js';
const DAY=86400000,ZONE_MS=7*3600000;
const at=(date,time)=>Date.parse(`${date}T${time}:00+07:00`);
export const vietnamDate=now=>new Date(now+ZONE_MS).toISOString().slice(0,10);
const days=(from,to)=>Math.round((Date.parse(to)-Date.parse(from))/DAY);
const addDays=(date,n)=>new Date(Date.parse(date+'T00:00:00Z')+n*DAY).toISOString().slice(0,10);
const checkIn=b=>b.policy?.checkIn||'14:00',checkOut=b=>b.policy?.checkOut||'12:00';

export const tripSteps=['Đã đặt','Chuẩn bị','Nhận phòng','Trả phòng'];
/** Index into tripSteps plus a one-line status the guest can act on. */
export function tripPhase(booking,now=Date.now()){
 const today=vietnamDate(now);
 if(booking.status==='CANCELLED')return {step:-1,tone:'closed',title:'Đơn đã hủy',detail:'Phòng không còn được giữ. Lịch sử vẫn được lưu bên dưới.'};
 if(booking.status==='CHECKED_OUT')return {step:3,tone:'done',title:'Kỳ nghỉ đã kết thúc',detail:`Đã trả phòng ngày ${booking.departure.split('-').reverse().join('/')}.`};
 if(booking.status==='CHECKED_IN'){
  const left=days(today,booking.departure);
  return {step:2,tone:'live',title:'Bạn đang lưu trú',detail:left<=0?`Hôm nay trả phòng trước ${checkOut(booking)}.`:`Còn ${left} đêm · trả phòng ${checkOut(booking)} ngày ${booking.departure.split('-').reverse().join('/')}.`};
 }
 const until=days(today,booking.arrival);
 if(until<0)return {step:1,tone:'warn',title:'Đã qua ngày nhận phòng',detail:'Nhân viên chưa ghi nhận nhận phòng. Hãy liên hệ hỗ trợ nếu bạn đã đến.'};
 if(until===0)return {step:1,tone:'soon',title:'Hôm nay nhận phòng',detail:`Nhận phòng từ ${checkIn(booking)} · giờ Việt Nam.`};
 return {step:until<=7?1:0,tone:'upcoming',title:until===1?'Ngày mai nhận phòng':`Còn ${until} ngày đến kỳ nghỉ`,detail:`Nhận phòng từ ${checkIn(booking)} ngày ${booking.arrival.split('-').reverse().join('/')}.`};
}

/** Chronological plan: check-in, included breakfasts, booked services, check-out. Cancelled services are left out. */
export function itinerary(booking,requests=[]){
 const items=[{id:'checkin',kind:'stay',at:at(booking.arrival,checkIn(booking)),title:'Nhận phòng',detail:`${booking.roomName} · từ ${checkIn(booking)}${booking.arrivalWindow?` · bạn dự kiến đến ${arrivalWindowText(booking.arrivalWindow)}`:''}`}];
 const breakfast=booking.offerSnapshot?.benefits?.find(b=>b.name==='Bữa sáng');
 if(breakfast){const perDay=Math.round(breakfast.quantity/Math.max(1,days(booking.arrival,booking.departure)));
  for(let d=addDays(booking.arrival,1);d<=booking.departure;d=addDays(d,1))items.push({id:'breakfast-'+d,kind:'included',at:at(d,'07:00'),title:'Bữa sáng đã bao gồm',detail:`${perDay} suất · 07:00–09:30 tại quầy`});}
 for(const r of requests)if(r.bookingId===booking.id&&r.start&&r.status!=='CANCELLED')
  items.push({id:r.id,kind:'service',at:r.start,title:r.name,detail:`${r.quantity?r.quantity+' × '+r.unit+' · ':''}${r.status==='CONFIRMED'?'Đã xác nhận':'Chờ nhân viên xác nhận'}${r.requestedSchedule?.flight?' · chuyến '+r.requestedSchedule.flight:''}`,status:r.status});
 items.push({id:'checkout',kind:'stay',at:at(booking.departure,checkOut(booking)),title:'Trả phòng',detail:`Trước ${checkOut(booking)}`});
 return items.sort((a,b)=>a.at-b.at);
}
export function groupByDay(items){
 const groups=[];for(const item of items){const day=vietnamDate(item.at);const last=groups.at(-1);if(last?.day===day)last.items.push(item);else groups.push({day,items:[item]});}
 return groups;
}

const icsEscape=value=>String(value).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/[,;]/g,m=>'\\'+m);
const icsTime=ms=>new Date(ms).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
/** RFC 5545 calendar: one all-stay event plus one event per itinerary item (UTC times). */
export function icsText(booking,requests=[],now=Date.now()){
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//STAYOS//Demo booking//VI','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
 const event=(uid,start,end,summary,description)=>lines.push('BEGIN:VEVENT',`UID:${uid}@stayos.demo`,`DTSTAMP:${icsTime(now)}`,`DTSTART:${icsTime(start)}`,`DTEND:${icsTime(end)}`,`SUMMARY:${icsEscape(summary)}`,`DESCRIPTION:${icsEscape(description)}`,'END:VEVENT');
 event(booking.id,at(booking.arrival,checkIn(booking)),at(booking.departure,checkOut(booking)),`STAYOS · ${booking.roomName}`,`Mã đơn ${booking.id} · ${booking.propertyName||''} · bản demo, chưa thu tiền. Địa chỉ chưa xác minh.`);
 for(const item of itinerary(booking,requests).filter(i=>i.kind==='service'))event(`${booking.id}-${item.id}`,item.at,item.at+3600000,`STAYOS · ${item.title}`,item.detail);
 lines.push('END:VCALENDAR');
 return lines.join('\r\n')+'\r\n';
}

/** Online cancellation mirrors the server: allowed while CONFIRMED and today (Vietnam) is on or before the arrival date.
 * "Free" is only claimed when the booking's own policy snapshot says so. */
export function cancellationWindow(booking,now=Date.now()){
 if(booking.status!=='CONFIRMED')return {state:'none'};
 const today=vietnamDate(now),left=days(today,booking.arrival);
 const free=!!booking.policy?.cancellation?.startsWith('Miễn phí hủy');
 const deadline=`23:59 ngày ${booking.arrival.split('-').reverse().join('/')}`;
 if(left<0)return {state:'closed',free,deadline};
 // Share of the booking-to-deadline period already used, for the timeline bar.
 const start=booking.createdAt?vietnamDate(booking.createdAt):today,span=Math.max(1,days(start,booking.arrival)+1);
 return {state:'open',free,deadline,daysLeft:left,progress:Math.min(1,Math.max(0,days(start,today)/span))};
}

/** "Trips" tabs: upcoming (in-house first, then by arrival), past (latest departure first) and cancelled. */
export function tripGroups(bookings){
 const rank=b=>b.status==='CHECKED_IN'?0:1;
 return {
  upcoming:bookings.filter(b=>['CONFIRMED','CHECKED_IN'].includes(b.status)).sort((a,b)=>rank(a)-rank(b)||a.arrival.localeCompare(b.arrival)),
  past:bookings.filter(b=>b.status==='CHECKED_OUT').sort((a,b)=>b.departure.localeCompare(a.departure)),
  cancelled:bookings.filter(b=>b.status==='CANCELLED').sort((a,b)=>b.arrival.localeCompare(a.arrival))
 };
}
/** The trip a guest most likely means: the one in progress, else the next arrival, else the most recent booking. */
export function defaultTrip(bookings){
 const {upcoming}=tripGroups(bookings);
 return upcoming[0]||bookings.at(-1);
}
