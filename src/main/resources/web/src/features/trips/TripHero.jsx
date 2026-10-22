import React,{useState} from 'react';
import {tripPhase,tripSteps,itinerary,groupByDay,icsText,cancellationWindow,tripGroups} from './trip-domain';
import {CalendarIcon,CheckIcon,ClockIcon,SparkIcon,HomeIcon,PrintIcon} from '../../shared/icons';

const dayTitle=day=>new Date(day+'T00:00:00Z').toLocaleDateString('vi-VN',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'});
const time=ms=>new Date(ms).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Ho_Chi_Minh'});
const kindIcon={stay:HomeIcon,included:SparkIcon,service:ClockIcon};

export function TripHero({booking,requests,onBookAgain=null}){
 const phase=tripPhase(booking),[copied,setCopied]=useState('');
 const active=['CONFIRMED','CHECKED_IN'].includes(booking.status);
 function addToCalendar(){
  const url=URL.createObjectURL(new Blob([icsText(booking,requests)],{type:'text/calendar;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=`STAYOS-${booking.id}.ics`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 async function copy(){try{await navigator.clipboard.writeText(booking.id);setCopied('Đã sao chép mã đơn.');}catch{setCopied(`Mã đơn: ${booking.id}`);}}
 const groups=groupByDay(itinerary(booking,requests));
 return <section className={`trip-hero tone-${phase.tone}`} aria-labelledby="trip-title">
  <div className="trip-status"><p className="trip-code">Mã đơn <b>{booking.id}</b> <button type="button" onClick={copy}>Sao chép</button></p>
   <h2 id="trip-title">{phase.title}</h2><p>{phase.detail}</p>{copied&&<p className="trip-copied" role="status">{copied}</p>}
   {phase.step>=0&&<ol className="trip-steps" aria-label="Tiến trình kỳ nghỉ">{tripSteps.map((step,i)=><li key={step} className={i<phase.step?'is-done':i===phase.step?'is-current':''} aria-current={i===phase.step?'step':undefined}><span>{i<phase.step?<CheckIcon size={14}/>:i+1}</span>{step}</li>)}</ol>}
   <div className="trip-actions">{active&&<button type="button" onClick={addToCalendar}><CalendarIcon size={17}/>Thêm vào lịch</button>}<button type="button" onClick={()=>window.print()}><PrintIcon size={17}/>In / lưu PDF</button>{!active&&onBookAgain&&<button type="button" className="trip-again" onClick={onBookAgain}><HomeIcon size={17}/>Đặt lại phòng này</button>}</div>
  </div>
  {active&&<div className="trip-plan"><h3>Lịch trình</h3>{groups.map(group=><div key={group.day} className="trip-day"><h4>{dayTitle(group.day)}</h4><ul>{group.items.map(item=>{const Icon=kindIcon[item.kind];return <li key={item.id} className={`trip-item kind-${item.kind}${item.status==='PENDING'?' is-pending':''}`}><time>{time(item.at)}</time><Icon size={17}/><div><strong>{item.title}</strong><span>{item.detail}</span></div></li>;})}</ul></div>)}</div>}
 </section>;
}

/** Deadline for cancelling online, like the "free cancellation until…" timeline on booking sites. Replaces a bare cancel button. */
export function CancellationCard({booking,busy,onCancel,onSupport}){
 const window=cancellationWindow(booking);
 if(window.state==='none')return null;
 if(window.state==='closed')return <section className="cancel-card is-closed" aria-labelledby="cancel-title"><h2 id="cancel-title">Hủy đặt phòng</h2><p>Đã qua hạn hủy trực tuyến ({window.deadline}). Nếu kế hoạch thay đổi, hãy nhắn STAYOS để nhân viên hỗ trợ.</p><button type="button" onClick={onSupport}>Nhắn hỗ trợ</button></section>;
 const label=window.free?'Hủy miễn phí':'Hủy trực tuyến';
 return <section className="cancel-card" aria-labelledby="cancel-title">
  <h2 id="cancel-title">{label} đến {window.deadline}</h2>
  <p>{window.daysLeft===0?'Hôm nay là ngày cuối để hủy trực tuyến':`Còn ${window.daysLeft} ngày để hủy trực tuyến`} (giờ Việt Nam).{window.free?' Đơn mô phỏng chưa thu tiền nên không phát sinh hoàn tiền.':''}</p>
  <div className="cancel-timeline" aria-hidden="true"><span style={{'--done':window.progress}}/><i>Đã đặt</i><i>Hạn hủy · ngày đến</i><i>Sau đó: liên hệ hỗ trợ</i></div>
  <button type="button" disabled={busy} onClick={onCancel}>Hủy đặt phòng</button>
 </section>;
}

const tripTabs=[['upcoming','Sắp tới'],['past','Đã qua'],['cancelled','Đã hủy']];
/** Trips page list (replaces a plain select): tabs by status, one card per booking; the selected trip is shown below. */
export function TripList({bookings,selectedId,onSelect,statusLabel,propertyName}){
 const groups=tripGroups(bookings);
 const [tab,setTab]=useState(()=>tripTabs.find(([id])=>groups[id].some(b=>b.id===selectedId))?.[0]||'upcoming');
 const short=date=>date.split('-').reverse().join('/').slice(0,5);
 return <nav className="trip-list" aria-label="Các kỳ nghỉ của bạn">
  <div className="trip-tabs" role="group" aria-label="Lọc kỳ nghỉ">{tripTabs.map(([id,label])=><button type="button" key={id} aria-pressed={tab===id} onClick={()=>setTab(id)}>{label} <span>{groups[id].length}</span></button>)}</div>
  {groups[tab].length?<ul>{groups[tab].map(b=><li key={b.id}><button type="button" aria-current={b.id===selectedId?'true':undefined} onClick={()=>onSelect(b.id)}>
   <small>{propertyName(b)}</small><strong>{b.roomName}</strong><span>{short(b.arrival)} → {short(b.departure)} · {b.guests} khách · {statusLabel(b.status)}</span></button></li>)}</ul>
  :<p className="trip-list-empty">{tab==='upcoming'?'Chưa có kỳ nghỉ sắp tới.':tab==='past'?'Chưa có kỳ nghỉ đã hoàn tất.':'Không có đơn đã hủy.'}</p>}
 </nav>;
}
