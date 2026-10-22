import React,{useState} from 'react';
import {money,bookingPropertyName} from '../../shared/catalog';
import {arrivalWindowText} from '../../shared/booking-domain';
import {StaffNote} from './StaffNote';
import {filterBookings,statusCounts,sortBookings,bookingsCsv,bookingStatuses,bookingSorts} from './admin-bookings-domain';

/** Reservation list like an extranet: search, status chips with counts, sort, and a CSV of exactly the rows shown. */
export function AdminBookings({bookings,today,labels,onAction,stays=()=>0,notes={},onNoteSaved}){
 const [query,setQuery]=useState(''),[status,setStatus]=useState('ALL'),[sort,setSort]=useState('created');
 const counts=statusCounts(filterBookings(bookings,{query}));
 const rows=sortBookings(filterBookings(bookings,{query,status}),sort);
 function download(){
  const csv=bookingsCsv(rows,{statusLabel:s=>labels[s]||s,propertyName:bookingPropertyName,windowText:arrivalWindowText});
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');
  link.href=url;link.download=`stayos-dat-phong-${today}.csv`;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),0);
 }
 return <section className="ops-panel" aria-labelledby="bookings-title">
  <div className="ops-panel-title"><h2 id="bookings-title">Đặt phòng theo cơ sở <small>{bookings.length}</small></h2>
   <div className="ops-bookings-tools">
    <label>Tìm đơn<input type="search" placeholder="Mã đơn, tên, email, phòng" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    <label>Sắp xếp<select value={sort} onChange={e=>setSort(e.target.value)}>{Object.entries(bookingSorts).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
    <button type="button" onClick={download} disabled={!rows.length}>Xuất CSV ({rows.length})</button>
   </div></div>
  <div className="ops-filter-chips" role="group" aria-label="Lọc theo trạng thái">{['ALL',...bookingStatuses].map(s=><button type="button" key={s} aria-pressed={status===s} onClick={()=>setStatus(s)}>{s==='ALL'?'Tất cả':labels[s]}<span>{counts[s]}</span></button>)}</div>
  <p className="sr-only" role="status">{rows.length} đơn phù hợp</p>
  {rows.length>0&&<div className="ops-table-wrap"><table><thead><tr><th>Booking / Khách</th><th>Phòng</th><th>Lưu trú</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{rows.map(b=><tr key={b.id}>
   <td><strong>{b.guestName}</strong>{stays(b)>0&&<span className="ops-repeat">Khách quay lại · đã ở {stays(b)} lần</span>}<small>{b.id} · {b.email}</small><StaffNote booking={b} note={notes[b.id]} onSaved={onNoteSaved}/></td>
   <td>{b.roomName}<small>{bookingPropertyName(b)}</small><small>{money(b.total)}</small></td>
   <td>{b.arrival}<small>→ {b.departure} · {b.guests} khách</small>{b.arrivalWindow&&<small>Đến {arrivalWindowText(b.arrivalWindow)}</small>}{b.specialRequests&&<small className="today-request">Yêu cầu: {b.specialRequests}</small>}</td>
   <td><span className={`ops-badge status-${b.status}`}>{labels[b.status]||b.status}</span></td>
   <td><div className="ops-actions">{b.status==='CONFIRMED'&&<><button disabled={b.arrival!==today} onClick={()=>onAction('booking',b,'CHECKED_IN')}>Nhận phòng</button><button onClick={()=>onAction('booking',b,'CANCELLED')}>Hủy đơn</button></>}{b.status==='CHECKED_IN'&&<button onClick={()=>onAction('booking',b,'CHECKED_OUT')}>Trả phòng</button>}</div></td>
  </tr>)}</tbody></table></div>}
  {!rows.length&&<p className="ops-empty">{bookings.length?<>Không có đơn khớp bộ lọc. <button type="button" onClick={()=>{setQuery('');setStatus('ALL');}}>Bỏ lọc</button></>:'Chưa có đặt phòng.'}</p>}
  <p className="ops-help">CSV xuất đúng các dòng đang hiển thị, gồm email và yêu cầu của khách — chỉ lưu trên máy nội bộ, không gửi qua kênh công khai.</p>
 </section>;
}
