import React,{useEffect,useRef,useState} from 'react';
import {api} from '../../shared/api';
import {dateAfter} from '../../shared/booking-domain';
import {monthGrid,nextMonth,pickDay,rangeIsFree,addDays} from './search-domain';
import {ChevronIcon} from '../../shared/icons';

const WINDOW=120,weekdays=['T2','T3','T4','T5','T6','T7','CN'];
const monthLabel=month=>new Date(month+'-01T00:00:00Z').toLocaleDateString('vi-VN',{month:'long',year:'numeric',timeZone:'UTC'});
const dayLabel=day=>new Date(day+'T00:00:00Z').toLocaleDateString('vi-VN',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'});

export function useRoomCalendar(roomId,refresh=0){
 const [state,setState]=useState({status:'loading',booked:[],open:true});
 useEffect(()=>{
  const controller=new AbortController();setState(s=>({...s,status:'loading'}));
  api(`rooms/${encodeURIComponent(roomId)}/calendar?from=${dateAfter(0)}&days=${WINDOW}`,{signal:controller.signal})
   .then(value=>{if(!controller.signal.aborted)setState({status:'ready',booked:value.bookedNights,open:value.open});})
   .catch(error=>{if(!controller.signal.aborted)setState({status:'error',booked:[],open:true,error:error.message});});
  return ()=>controller.abort();
 },[roomId,refresh]);
 return state;
}

/** Night-by-night calendar; a checkout day may fall on the next guest's first night. */
export function AvailabilityCalendar({roomId,arrival,departure,onChange,refresh}){
 const today=dateAfter(0),last=addDays(today,WINDOW-1);
 const calendar=useRoomCalendar(roomId,refresh);
 const [start,setStart]=useState((arrival&&arrival>=today?arrival:today).slice(0,7));
 const [pick,setPick]=useState({arrival,departure,picking:'arrival'});
 const [hint,setHint]=useState(''),[focusDay,setFocusDay]=useState(arrival&&arrival>=today?arrival:today);const grid=useRef(null);
 useEffect(()=>{setPick(p=>p.arrival===arrival&&(p.departure===departure||p.picking==='departure')?p:{arrival,departure,picking:'arrival'});},[arrival,departure]);
 const booked=new Set(calendar.booked);
 function choose(day){
  const next=pickDay(pick,day);
  if(next.departure&&!rangeIsFree(calendar.booked,next.arrival,next.departure)){setHint('Khoảng này có đêm đã kín. Chọn ngày trả sớm hơn hoặc ngày đến khác.');return;}
  setHint(next.departure?'':'Chọn ngày trả phòng.');setPick(next);
  if(next.departure)onChange(next.arrival,next.departure);
 }
 // While choosing a departure, nothing past the first booked night after arrival can be reached.
 const blockedAfter=pick.picking==='departure'&&pick.arrival?calendar.booked.find(night=>night>=pick.arrival):undefined;
 const months=[start,nextMonth(start)];
 function isDisabled(day){
  const full=booked.has(day);
  // While choosing a departure, a booked night is still a valid checkout day if every night before it is free.
  const checkoutOnly=pick.picking==='departure'&&pick.arrival&&day>pick.arrival&&full&&rangeIsFree(calendar.booked,pick.arrival,day);
  return day<today||day>last||calendar.status!=='ready'||!calendar.open||(full&&!checkoutOnly)||(blockedAfter!==undefined&&day>blockedAfter);
 }
 const visible=months.flatMap(m=>monthGrid(m).filter(Boolean));
 const tabDay=visible.includes(focusDay)&&!isDisabled(focusDay)?focusDay:visible.find(d=>!isDisabled(d));
 // Roving focus: one day is tabbable; arrows move by day/week, Home/End to week edges, skipping days that cannot be chosen.
 function onKeyDown(event){
  const step={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[event.key];
  const dow=(new Date(focusDay+'T00:00:00Z').getUTCDay()+6)%7;
  const target=step?null:event.key==='Home'?addDays(focusDay,-dow):event.key==='End'?addDays(focusDay,6-dow):undefined;
  if(step===undefined&&target===undefined)return;
  event.preventDefault();
  let day=target||addDays(focusDay,step);
  for(let i=0;i<62&&day>=today&&day<=last;i++){
   const button=grid.current?.querySelector(`[data-day="${day}"]`);
   if(!button){const month=day.slice(0,7);setStart(month<start?month:addDays(month+'-01',-1).slice(0,7));setFocusDay(day);requestAnimationFrame(()=>grid.current?.querySelector(`[data-day="${day}"]`)?.focus());return;}
   if(!button.disabled){setFocusDay(day);button.focus();return;}
   day=addDays(day,step||(event.key==='Home'?1:-1));
  }
 }
 const canBack=start>today.slice(0,7),canForward=nextMonth(start)<last.slice(0,7);
 return <section className="avail-calendar" aria-label="Lịch trống của phòng">
  <div className="avail-head"><h3>Chọn ngày ở</h3><div><button type="button" disabled={!canBack} onClick={()=>setStart(m=>addDays(m+'-01',-1).slice(0,7))} aria-label="Tháng trước"><ChevronIcon dir="left"/></button><button type="button" disabled={!canForward} onClick={()=>setStart(nextMonth)} aria-label="Tháng sau"><ChevronIcon/></button></div></div>
  {calendar.status==='error'&&<p role="alert" className="avail-error">Chưa tải được lịch trống: {calendar.error}</p>}
  {!calendar.open&&<p className="avail-error">Phòng đang tạm ngưng nhận khách.</p>}
  <div className="avail-months" ref={grid} onKeyDown={onKeyDown} aria-busy={calendar.status==='loading'}>{months.map(month=><div key={month} className="avail-month"><h4>{monthLabel(month)}</h4>
   <div className="avail-grid">{weekdays.map(w=><span key={w} className="avail-weekday" aria-hidden="true">{w}</span>)}
    {monthGrid(month).map((day,i)=>{if(!day)return <span key={'pad'+i} aria-hidden="true"/>;
     const past=day<today||day>last,full=booked.has(day),isStart=day===pick.arrival,isEnd=day===pick.departure,inRange=pick.arrival&&pick.departure&&day>pick.arrival&&day<pick.departure;
     const disabled=isDisabled(day);
     return <button type="button" key={day} data-day={day} tabIndex={day===tabDay?0:-1} onFocus={()=>setFocusDay(day)} disabled={disabled} aria-pressed={isStart||isEnd} onClick={()=>choose(day)}
      className={`avail-day${full?' is-full':''}${isStart?' is-start':''}${isEnd?' is-end':''}${inRange?' in-range':''}${day===today?' is-today':''}`}
      aria-label={`${dayLabel(day)}${full?' · đêm đã kín':past?'':' · còn trống'}${isStart?' · ngày nhận':''}${isEnd?' · ngày trả':''}`}>{Number(day.slice(8))}</button>;})}
   </div></div>)}</div>
  <p className="avail-legend"><span><i className="dot free"/>Còn trống</span><span><i className="dot full"/>Đêm đã kín</span><span><i className="dot chosen"/>Ngày bạn chọn</span></p>
  <p className="avail-hint" role="status">{hint||(pick.arrival&&pick.departure?'Đã chọn ngày. Giá và phòng trống được kiểm tra lại khi xác nhận.':'')}</p>
 </section>;
}
