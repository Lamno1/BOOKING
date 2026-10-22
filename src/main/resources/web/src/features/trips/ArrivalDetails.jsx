import React,{useEffect,useId,useRef,useState} from 'react';
import {arrivalWindows,arrivalWindowText} from '../../shared/booking-domain';
import {updateArrival} from '../../shared/api';
import {ClockIcon} from '../../shared/icons';

/** Optional fields shared by checkout and the trip page. Requests go to staff; they are not guaranteed and never priced. */
export function ArrivalFields({window,onWindow,requests,onRequests,checkIn='14:00',quietLegend=false}){
 const hint=useId();
 return <fieldset className="arrival-fields"><legend className={quietLegend?'sr-only':undefined}>Giờ đến và yêu cầu (không bắt buộc)</legend>
  <label>Giờ đến dự kiến<select value={window} onChange={e=>onWindow(e.target.value)} aria-describedby={hint}><option value="">Chưa rõ</option>{Object.entries(arrivalWindows).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
  <label>Yêu cầu đặc biệt<textarea rows={2} maxLength={300} value={requests} onChange={e=>onRequests(e.target.value)} placeholder="Ví dụ: tầng cao, phòng yên tĩnh, cần cũi em bé…"/><small>{requests.length}/300</small></label>
  <p id={hint} className="arrival-hint">Nhận phòng từ {checkIn}. Yêu cầu được chuyển cho nhân viên, tùy tình trạng phòng và không tính thêm phí. Không ghi thông tin thanh toán hay giấy tờ tùy thân ở đây.</p>
 </fieldset>;
}

/** Trip page: show and edit the arrival window / requests until check-in. */
export function ArrivalDetails({booking,onSaved}){
 const [editing,setEditing]=useState(false),[window,setWindow]=useState(booking.arrivalWindow||''),[requests,setRequests]=useState(booking.specialRequests||''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const canEdit=booking.status==='CONFIRMED',toggle=useRef(null),returnFocus=useRef(false);
 const form=useRef(null);
 useEffect(()=>{if(editing)form.current?.querySelector('select')?.focus();else if(returnFocus.current){returnFocus.current=false;toggle.current?.focus();}},[editing]);
 if(!canEdit&&!booking.arrivalWindow&&!booking.specialRequests)return null;
 async function save(event){event.preventDefault();if(busy)return;setBusy(true);setError('');
  try{await updateArrival(booking.id,{arrivalWindow:window,specialRequests:requests.trim()});await onSaved('Đã cập nhật giờ đến và yêu cầu cho nhân viên.');returnFocus.current=true;setEditing(false);}catch(e){setError(e.message);}finally{setBusy(false);}}
 if(editing)return <form ref={form} className="arrival-card" onSubmit={save}><h2>Giờ đến và yêu cầu</h2><ArrivalFields window={window} onWindow={setWindow} requests={requests} onRequests={setRequests} checkIn={booking.policy?.checkIn} quietLegend/>{error&&<p className="form-error" role="alert">{error}</p>}<div className="arrival-actions"><button className="gold-button" disabled={busy}>{busy?'Đang lưu…':'Lưu'}</button><button type="button" disabled={busy} onClick={()=>{returnFocus.current=true;setEditing(false);setWindow(booking.arrivalWindow||'');setRequests(booking.specialRequests||'');setError('');}}>Hủy</button></div></form>;
 return <section className="arrival-card" aria-labelledby={'arrival-'+booking.id}><ClockIcon size={22}/><div><h2 id={'arrival-'+booking.id}>Giờ đến và yêu cầu</h2>
  <p>{booking.arrivalWindow?`Dự kiến đến ${arrivalWindowText(booking.arrivalWindow)}`:'Bạn chưa báo giờ đến. Báo trước giúp nhân viên chuẩn bị phòng đúng lúc.'}</p>
  {booking.specialRequests&&<p className="arrival-request">“{booking.specialRequests}”</p>}
  {!canEdit&&<p className="arrival-hint">Đã nhận phòng; hãy trao đổi trực tiếp với lễ tân nếu cần thay đổi.</p>}</div>
  {canEdit&&<button type="button" ref={toggle} onClick={()=>setEditing(true)}>{booking.arrivalWindow||booking.specialRequests?'Sửa':'Báo giờ đến'}</button>}
 </section>;
}
