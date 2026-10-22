import React,{useState} from 'react';
import offer from '../../../review/offer-v2.json';
import {serviceProblems} from '../../../review/offer-domain';
import {requestService} from '../../shared/api';
import {dateAfter,formatStayDate} from '../../shared/booking-domain';
import {money} from '../../shared/catalog';

// Package bookings add services from the same offer catalog and rules as checkout; the server re-validates everything.
export function OfferServices({booking,requests,onSaved}){
 const [choices,setChoices]=useState({}),[busy,setBusy]=useState(''),[errors,setErrors]=useState({}),[saved,setSaved]=useState({});
 const active=['CONFIRMED','CHECKED_IN'].includes(booking.status);
 const hasTransfer=requests.some(r=>r.bookingId===booking.id&&r.serviceId==='transfer'&&r.status!=='CANCELLED');
 const choice=id=>choices[id]||{quantity:1,date:'',time:'',flight:''};
 const update=(id,key,value)=>{setChoices(c=>({...c,[id]:{...choice(id),[key]:value}}));setErrors(e=>({...e,[id]:''}));setSaved(s=>({...s,[id]:''}));};
 async function submit(event,addon){
  event.preventDefault();if(busy)return;const c=choice(addon.id);
  const problems=serviceProblems({arrival:booking.arrival,departure:booking.departure,quantities:{[addon.id]:c.quantity},schedules:{[addon.id]:c},addons:[addon]});
  if(problems.length)return setErrors(e=>({...e,[addon.id]:problems.join(' ')}));
  setBusy(addon.id);
  try{
   const schedule={date:c.date,time:c.time,...(addon.id==='transfer'?{flight:c.flight.trim()}:{})};
   await requestService({bookingId:booking.id,offerVersion:offer.revision,serviceId:addon.id,quantity:c.quantity,schedule,expectedPrice:addon.price*c.quantity});
   setSaved(s=>({...s,[addon.id]:`Đã gửi ${c.quantity} × ${addon.name}. Đang chờ nhân viên xác nhận; chưa thu tiền.`}));setChoices(x=>({...x,[addon.id]:undefined}));
   try{await onSaved();}catch{}
  }catch(failure){setErrors(e=>({...e,[addon.id]:failure.message}));}finally{setBusy('');}
 }
 if(!active)return <p>Kỳ nghỉ {booking.id} không còn hoạt động; không thể thêm dịch vụ.</p>;
 return <><p className="offer-services-context">Thêm cho {booking.roomName} · {formatStayDate(booking.arrival)} → {formatStayDate(booking.departure)} · {booking.guests} khách. Danh mục cùng gói đã đặt; giá và định mức là đề xuất demo.</p>
 <h2>Dịch vụ theo gói đã đặt</h2><div className="service-grid offer-services">{offer.addons.filter(a=>a.available!==false&&(a.id!=='transfer'||!hasTransfer)).map(addon=>{const c=choice(addon.id);return <form key={addon.id} onSubmit={event=>submit(event,addon)} aria-label={`Thêm ${addon.name}`}>
  <p className="overline">{money(addon.price)} / {addon.unit}</p><h3>{addon.name}</h3><p>{addon.description}</p>
  <div className="offer-service-fields"><label>Số lượng<select value={c.quantity} onChange={e=>update(addon.id,'quantity',Number(e.target.value))}>{[1,2,3,4,5,6].map(n=><option key={n} value={n}>{n} {addon.unit}</option>)}</select></label>
   <label>Ngày<input type="date" min={addon.id==='transfer'?booking.arrival:dateAfter(0)} max={addon.id==='transfer'?booking.arrival:booking.departure} value={c.date} onChange={e=>update(addon.id,'date',e.target.value)} required/></label>
   <label>Giờ<input type="time" value={c.time} onChange={e=>update(addon.id,'time',e.target.value)} required/></label>
   {addon.id==='transfer'&&<label>Mã chuyến bay<input value={c.flight} maxLength={10} onChange={e=>update(addon.id,'flight',e.target.value)} placeholder="VN123" required/></label>}</div>
  <p className="support-small">{c.quantity*addon.serves} người theo định mức / {booking.guests} khách. {addon.schedule}</p>
  <details><summary>Điều kiện</summary><p>{addon.conditions}</p></details>
  <strong>{money(addon.price*c.quantity)}</strong>
  {errors[addon.id]&&<p className="form-error" role="alert">{errors[addon.id]}</p>}{saved[addon.id]&&<p className="support-notice" role="status">{saved[addon.id]}</p>}
  <button className="gold-button" disabled={!!busy}>{busy===addon.id?'Đang gửi…':'Gửi yêu cầu dịch vụ'}</button>
 </form>;})}</div></>;
}
