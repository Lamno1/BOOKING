import React from 'react';
import {todayBoard} from './admin-today-domain';
import {arrivalWindowText} from '../../shared/booking-domain';
import {StaffNote} from './StaffNote';

const time=ms=>new Date(ms).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',weekday:'short',hour:'2-digit',minute:'2-digit'});
const short=date=>date.slice(8)+'/'+date.slice(5,7);
const List=({title,items,empty,render})=><section className="today-list"><h2>{title} <small>{items.length}</small></h2>{items.length?<ul>{items.map(render)}</ul>:<p className="ops-empty">{empty}</p>}</section>;

/** Front-desk overview: what needs a person today, with the same guarded actions as the bookings tab. */
export function AdminToday({data,today,onAction,onOpenTab,stays=()=>0,notes={}}){
 const board=todayBoard(data,today);
 const kpis=[['Khách đến hôm nay',board.arrivals.length,'bookings'],['Khách trả phòng',board.departures.length,'bookings'],['Đang lưu trú',board.inHouse.length,'bookings'],['Dịch vụ chờ (48 giờ)',board.soon.length,'services'],['Hỗ trợ đang mở',board.openSupport.length,'support'],['Đánh giá 1–2 sao',board.lowReviews.length,'reviews']];
 return <div className="today-board">
  <div className="ops-stats today-kpis">{kpis.map(([label,value,tab])=><button type="button" key={label} onClick={()=>onOpenTab(tab)}><span>{label}</span><strong>{value}</strong></button>)}</div>
  {board.noShow.length>0&&<p className="ops-error" role="alert">{board.noShow.length} đơn đã qua ngày đến nhưng chưa nhận phòng: {board.noShow.map(b=>b.id).join(', ')}. Liên hệ khách trước khi xử lý.</p>}
  <div className="today-grid">
   <List title="Khách đến" items={board.arrivals} empty="Không có khách đến hôm nay." render={b=><li key={b.id}><div><strong>{b.roomName}</strong><small>{b.guestName} · {b.guests} khách · {b.id}</small>{stays(b)>0&&<span className="ops-repeat">Khách quay lại · đã ở {stays(b)} lần</span>}<StaffNote booking={b} note={notes[b.id]} readOnly/><small className={b.arrivalWindow?'today-eta':'today-eta is-unknown'}>{b.arrivalWindow?`Dự kiến đến ${arrivalWindowText(b.arrivalWindow)}`:'Chưa báo giờ đến'}</small>{b.specialRequests&&<small className="today-request">Yêu cầu: {b.specialRequests}</small>}</div><button onClick={()=>onAction('booking',b,'CHECKED_IN')}>Nhận phòng</button></li>}/>
   <List title="Trả phòng" items={board.departures} empty="Không có khách trả phòng hôm nay." render={b=><li key={b.id}><div><strong>{b.roomName}</strong><small>{b.guestName} · trả {short(b.departure)} · {b.id}</small></div><button onClick={()=>onAction('booking',b,'CHECKED_OUT')}>Trả phòng</button></li>}/>
   <List title="Dịch vụ cần xác nhận" items={board.soon} empty="Không có dịch vụ chờ trong 48 giờ tới." render={r=><li key={r.id}><div><strong>{r.name}{r.quantity?` · ${r.quantity} × ${r.unit}`:''}</strong><small>{time(r.start)} · {r.bookingId}</small></div><button onClick={()=>onAction('service',r,'CONFIRMED')}>Xác nhận</button></li>}/>
  </div>
  <section className="ops-panel today-occupancy"><div className="ops-panel-title"><h2>Công suất 7 đêm tới <small>{Math.round(board.weekRate*100)}%</small></h2></div>
   <div className="occupancy-bars" role="list">{board.occupancy.map(n=><div role="listitem" key={n.night} aria-label={`Đêm ${short(n.night)}: ${n.booked} phòng có khách, ${Math.round(n.rate*100)}%`}><span style={{height:`${Math.max(4,n.rate*100)}%`}}/><b>{Math.round(n.rate*100)}%</b><small>{short(n.night)}</small></div>)}</div>
   <p className="ops-help">Tính theo đêm có khách / {data.rooms.length} phòng trong phạm vi cơ sở đang chọn. Ngày trả phòng không tính là đêm có khách.</p></section>
 </div>;
}
