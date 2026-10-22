import React,{useEffect,useRef,useState} from 'react';
import {createSupport,replySupport,cancelSupport} from '../../shared/api';
import {formatStayDate} from '../../shared/booking-domain';
import {bookingPropertyName,properties,rooms,services} from '../../shared/catalog';
import {assistantReply,assistantSuggestions} from './support-assistant';
import {supportKinds,supportStatuses,supportOpen} from './guest-operations-domain';
import {conversations,unreadCount,totalUnread,chatDays,dayLabel,readSeen,markSeen} from './support-chat-domain';
import {ChatIcon,CloseIcon,ChevronIcon} from '../../shared/icons';
import './support-chat.css';

// Suggested topics prefill the composer; the guest still edits and sends the message themselves.
const topics=[
 {label:'Nhận phòng sớm',kind:'CHECKIN',booking:true,text:'Tôi muốn hỏi có thể nhận phòng sớm hơn 14:00 không? Dự kiến tôi đến lúc '},
 {label:'Thêm khăn',kind:'TOWELS',booking:true,text:'Cho tôi xin thêm khăn tắm cho phòng. Số lượng: '},
 {label:'Wi-Fi',kind:'WIFI',booking:true,text:'Cho tôi xin tên và mật khẩu Wi-Fi của phòng.'},
 {label:'Đỗ xe',kind:'INQUIRY',booking:false,text:'Cơ sở có chỗ đỗ xe không? Tôi đi bằng '},
 {label:'Trẻ em & giường phụ',kind:'INQUIRY',booking:false,text:'Tôi đi cùng trẻ em. Phòng có giường phụ hoặc nôi không? Bé '},
];
const vnToday=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());
const clock=ms=>new Date(ms).toLocaleTimeString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit'});
const statusText=t=>t.status==='RESOLVED'&&!t.completionConfirmed?'Đã đóng':supportStatuses[t.status]||t.status;
const subject=t=>t.bookingId==='INQUIRY'?t.propertyName||'Tư vấn trước khi đặt':`${t.roomName||'Đơn đặt phòng'} · ${t.bookingId}`;

/**
 * Floating support chat. It opens on the automatic assistant (answers from catalog, policy and the guest's own bookings, any hour);
 * anything the assistant cannot answer from data goes to staff as a support ticket, whose replies are written by people.
 */
export function SupportChat({open,onOpenChange,preset,user,bookings=[],tickets=[],onLogin,onRefresh,onNavigate,statusLabel}){
 const [view,setView]=useState('assistant'),[seen,setSeen]=useState(()=>readSeen()),[draft,setDraft]=useState(null);
 const launcher=useRef(null),panel=useRef(null),wasOpen=useRef(false),opener=useRef(null);
 const unread=totalUnread(tickets,seen),thread=tickets.find(t=>t.id===view);
 // Signing out (or in as someone else) erases the previous account's assistant transcript from this tab.
 useEffect(()=>{try{const stored=JSON.parse(sessionStorage.getItem(ASSISTANT_KEY)||'{}');if(stored?.owner!==undefined&&stored.owner!==(user?.email||''))sessionStorage.removeItem(ASSISTANT_KEY);}catch{}},[user?.email]);
 useEffect(()=>{
  if(open&&!wasOpen.current){opener.current=document.activeElement;setDraft(null);setView(preset&&user?'new':'assistant');}
  // Back to whatever opened the chat (tab bar, trip card); the launcher is hidden on phones.
  if(!open&&wasOpen.current){const back=opener.current?.isConnected&&opener.current.offsetParent?opener.current:launcher.current;back?.focus();}
  wasOpen.current=open;
 },[open,preset]);
 useEffect(()=>{if(open)requestAnimationFrame(()=>panel.current?.querySelector('textarea,[data-autofocus]')?.focus());},[open,view]);
 useEffect(()=>{if(open&&thread)setSeen(markSeen(thread));},[open,thread?.id,thread?.messages?.length]);
 // Staff replies arrive by polling: every 15 s while the chat is open, every minute while something is still open.
 const waiting=tickets.some(supportOpen);
 useEffect(()=>{
  if(!user||!(open||waiting))return;
  const sync=()=>onRefresh().catch(()=>{});
  if(open)sync();
  const timer=setInterval(sync,open?15000:60000);window.addEventListener('focus',sync);
  return ()=>{clearInterval(timer);window.removeEventListener('focus',sync);};
 },[user?.email,open,waiting]);
 const close=()=>onOpenChange(false);
 function act(action,question){
  if(action.type==='navigate'){close();onNavigate?.(action.to);return;}
  if(action.type==='login'||!user){close();onLogin();return;}
  setDraft({text:question?`${question}\n`:'',kind:action.kind});setView('new');
 }
 const title=view==='assistant'?'Trợ lý STAYOS':view==='new'?'Nhắn nhân viên':thread?supportKinds[thread.kind]||thread.kind:'Tin nhắn với nhân viên';
 const subtitle=view==='assistant'?'Trả lời tự động 24/7 từ dữ liệu đặt phòng':thread?subject(thread):'Nhân viên đọc và trả lời từng tin';
 const back=view==='list'?'assistant':thread||view==='new'?(tickets.length?'list':'assistant'):null;
 return <>
  <button ref={launcher} type="button" className="chat-launcher" hidden={open} onClick={()=>onOpenChange(true)} aria-label={unread?`Mở hỗ trợ, ${unread} tin mới từ nhân viên`:'Mở hỗ trợ'}><ChatIcon size={22}/><span>Hỏi STAYOS</span>{unread>0&&<b aria-hidden="true">{unread}</b>}</button>
  {open&&<section ref={panel} className="chat-panel" role="dialog" aria-modal="false" aria-labelledby="chat-title" onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();close();}}}>
   <header className="chat-head">
    {back&&<button type="button" className="chat-icon-button" onClick={()=>setView(back)} aria-label={back==='assistant'?'Về trợ lý':'Về danh sách trò chuyện'}><ChevronIcon dir="left" size={20}/></button>}
    <div><h2 id="chat-title">{title}</h2><p>{subtitle}</p></div>
    <button type="button" className="chat-icon-button" onClick={close} aria-label="Đóng hỗ trợ" data-autofocus={view==='list'?'':undefined}><CloseIcon size={20}/></button>
   </header>
   {view==='assistant'&&user&&<button type="button" className="chat-staff-link" onClick={()=>setView(tickets.length?'list':'new')}>Tin nhắn với nhân viên{tickets.length?` (${tickets.length})`:''}{unread>0&&<b>{unread} mới</b>}</button>}
   {view==='assistant'?<Assistant key={user?.email||'signed-out'} user={user} bookings={bookings} statusLabel={statusLabel} onAction={act}/>
   :!user?<div className="chat-empty"><p>Đăng nhập để nhắn cho nhân viên, không cần có đơn đặt. Lịch sử trò chuyện chỉ hiển thị cho tài khoản của bạn và nhân viên.</p><button type="button" className="chat-primary" onClick={()=>{close();onLogin();}}>Đăng nhập để nhắn</button></div>
   :view==='new'?<NewConversation key={draft?.text||'blank'} bookings={bookings} preset={preset} draft={draft} onSent={async ticket=>{setDraft(null);await onRefresh().catch(()=>{});setView(ticket.id);}}/>
   :thread?<Thread ticket={thread} onRefresh={onRefresh} onNew={()=>setView('new')}/>
   :<ConversationList tickets={tickets} seen={seen} onOpen={setView} onNew={()=>{setDraft(null);setView('new');}}/>}
  </section>}
 </>;
}

// One transcript per account: answers can list the guest's bookings, so a shared device must never show them to the next person.
const ASSISTANT_KEY='stayos-assistant-v2';
const readTranscript=owner=>{try{sessionStorage.removeItem('stayos-assistant-v1');const v=JSON.parse(sessionStorage.getItem(ASSISTANT_KEY)||'{}');return v?.owner===owner&&Array.isArray(v.messages)?v.messages.slice(-40):[];}catch{return [];}};
const saveTranscript=(owner,messages)=>{try{sessionStorage.setItem(ASSISTANT_KEY,JSON.stringify({owner,messages:messages.slice(-40)}));}catch{}};
const greeting={id:'hello',role:'bot',text:'Chào bạn! Mình là trợ lý tự động của STAYOS: trả lời ngay về giờ nhận phòng, giá, chính sách hủy, dịch vụ và đơn của bạn. Việc cần người quyết định, mình chuyển cho nhân viên.',actions:[]};

/** Assistant transcript lives in this tab only (sessionStorage); nothing is sent to the server until the guest chooses staff. */
function Assistant({user,bookings,statusLabel,onAction}){
 const owner=user?.email||'';
 const [messages,setMessages]=useState(()=>readTranscript(owner)),[text,setText]=useState(''),[typing,setTyping]=useState(false);
 const log=useRef(null);
 useEffect(()=>{saveTranscript(owner,messages);},[messages]);
 useEffect(()=>{log.current?.scrollTo({top:log.current.scrollHeight});},[messages.length,typing]);
 function ask(question){
  const q=question.trim();if(!q||typing)return;
  const reply=assistantReply(q,{properties,rooms,services,bookings:user?bookings:[],user,statusLabel,now:Date.now()});
  setMessages(m=>[...m,{id:crypto.randomUUID(),role:'guest',text:q,at:Date.now()}]);setText('');setTyping(true);
  // A short pause so the answer reads as a reply rather than flashing in; no network involved.
  setTimeout(()=>{setMessages(m=>[...m,{id:crypto.randomUUID(),role:'bot',text:reply.text,actions:reply.actions,question:q,at:Date.now()}]);setTyping(false);},350);
 }
 return <>
  <div className="chat-log" ref={log} role="log" aria-live="polite" aria-label="Trò chuyện với trợ lý" tabIndex={0}>
   {[greeting,...messages].map(m=><div key={m.id} className={`chat-bubble ${m.role==='bot'?'is-staff is-bot':'is-mine'}`}>
    <span className="sr-only">{m.role==='bot'?'Trợ lý':'Bạn'}: </span><p>{m.text}</p>
    {m.role==='bot'&&m.actions?.length>0&&<div className="chat-actions">{m.actions.map(a=><button type="button" key={a.label} onClick={()=>onAction(a,m.question)}>{a.label}</button>)}</div>}
    <small>{m.role==='bot'?`Trợ lý tự động${m.at?` · ${clock(m.at)}`:''}`:clock(m.at)}</small>
   </div>)}
   {typing&&<div className="chat-bubble is-staff is-bot is-pending"><p>Đang trả lời…</p></div>}
  </div>
  {messages.length<2&&<div className="chat-topics chat-suggest" role="group" aria-label="Câu hỏi gợi ý">{assistantSuggestions.map(q=><button type="button" key={q} onClick={()=>ask(q)}>{q}</button>)}</div>}
  <Composer value={text} onChange={setText} onSend={()=>ask(text)} busy={typing} label="Câu hỏi cho trợ lý" placeholder="Hỏi về giờ nhận phòng, giá, hủy phòng…"/>
 </>;
}

function ConversationList({tickets,seen,onOpen,onNew}){
 return <div className="chat-body">
  <button type="button" className="chat-primary chat-new" onClick={onNew}>+ Cuộc trò chuyện mới</button>
  <ul className="chat-list" aria-label="Các cuộc trò chuyện">{conversations(tickets).map(t=>{const last=t.messages?.at(-1),count=unreadCount(t,seen);return <li key={t.id}>
   <button type="button" onClick={()=>onOpen(t.id)} className={supportOpen(t)?'':'is-closed'}>
    <span className="chat-list-top"><strong>{supportKinds[t.kind]||t.kind}</strong><small>{last?clock(last.at):''}</small></span>
    <span className="chat-list-sub">{subject(t)} · {statusText(t)}</span>
    {last&&<span className="chat-list-last">{last.role==='admin'?'Nhân viên: ':'Bạn: '}{last.message}</span>}
    {count>0&&<b className="chat-unread">{count} tin mới</b>}
   </button></li>;})}</ul>
 </div>;
}

function Thread({ticket,onRefresh,onNew}){
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[pending,setPending]=useState(''),[confirm,setConfirm]=useState(false);
 const log=useRef(null),active=supportOpen(ticket),full=ticket.messages.length>=50,today=vnToday();
 useEffect(()=>{log.current?.scrollTo({top:log.current.scrollHeight});},[ticket.messages.length,pending]);
 async function send(){
  const text=message.trim();if(busy||!text)return;
  setBusy(true);setError('');setPending(text);setMessage('');
  try{await replySupport(ticket.id,text);await onRefresh().catch(()=>setError('Đã gửi nhưng chưa tải lại được. Kéo xuống hoặc mở lại để xem.'));}
  catch(failure){setError(failure.message);setMessage(text);}finally{setPending('');setBusy(false);}
 }
 async function withdraw(){setBusy(true);setError('');try{await cancelSupport(ticket.id);await onRefresh().catch(()=>{});}catch(failure){setError(failure.message);}finally{setBusy(false);setConfirm(false);}}
 return <>
  <div className="chat-meta"><span className={`chat-status chat-status-${ticket.status}`}>{statusText(ticket)}</span><small>{ticket.id}</small>
   {active&&ticket.kind!=='DATE_CHANGE'&&(confirm?<span className="chat-confirm" role="group" aria-label="Xác nhận rút yêu cầu">Rút yêu cầu này?<button type="button" disabled={busy} onClick={withdraw}>Rút</button><button type="button" disabled={busy} onClick={()=>setConfirm(false)}>Giữ</button></span>
    :<button type="button" className="chat-link" onClick={()=>setConfirm(true)}>Rút yêu cầu</button>)}</div>
  {ticket.change&&<p className="chat-change">Xin đổi {formatStayDate(ticket.change.currentArrival)} → {formatStayDate(ticket.change.currentDeparture)} sang {formatStayDate(ticket.change.arrival)} → {formatStayDate(ticket.change.departure)}. Chi tiết giá xem ở Kỳ nghỉ của tôi.</p>}
  <div className="chat-log" ref={log} role="log" aria-live="polite" aria-label="Tin nhắn" tabIndex={0}>
   {chatDays(ticket.messages).map(day=><div key={day.day} className="chat-day"><p className="chat-day-label"><span>{dayLabel(day.day,today)}</span></p>
    {day.messages.map(m=><div key={m.id} className={`chat-bubble ${m.role==='admin'?'is-staff':'is-mine'}`}><span className="sr-only">{m.role==='admin'?'Nhân viên':'Bạn'}: </span><p>{m.message}</p><small>{m.role==='admin'?'Nhân viên · ':''}{clock(m.at)}</small></div>)}</div>)}
   {pending&&<div className="chat-bubble is-mine is-pending"><p>{pending}</p><small>Đang gửi…</small></div>}
  </div>
  {error&&<p className="chat-error" role="alert">{error}</p>}
  {active&&!full?<Composer value={message} onChange={setMessage} onSend={send} busy={busy} label="Tin nhắn cho nhân viên"/>
   :<div className="chat-closed"><p>{full?'Cuộc trò chuyện đã đủ 50 tin.':ticket.closedReason||'Cuộc trò chuyện đã đóng.'} Nội dung được giữ để xem lại.</p><button type="button" className="chat-primary" onClick={onNew}>Bắt đầu cuộc trò chuyện mới</button></div>}
 </>;
}

function NewConversation({bookings,preset,draft,onSent}){
 // Topics that are about a stay (Wi-Fi, check-in) attach to the guest's current booking when there is one.
 const current=bookings.filter(b=>['CONFIRMED','CHECKED_IN'].includes(b.status)).sort((a,b)=>a.arrival.localeCompare(b.arrival))[0];
 const start=preset&&bookings.some(b=>b.id===preset)?preset:draft&&['CHECKIN','WIFI','TOWELS'].includes(draft.kind)&&current?current.id:'INQUIRY';
 const [bookingId,setBookingId]=useState(start),[propertyId,setPropertyId]=useState(properties[0]?.id||'residence');
 const [kind,setKind]=useState(start==='INQUIRY'?'INQUIRY':draft?.kind&&draft.kind!=='INQUIRY'?draft.kind:'OTHER'),[message,setMessage]=useState(draft?.text||''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const key=useRef(crypto.randomUUID()),booking=bookings.find(b=>b.id===bookingId),active=booking&&['CONFIRMED','CHECKED_IN'].includes(booking.status);
 useEffect(()=>{key.current=crypto.randomUUID();},[bookingId,propertyId,kind,message]);
 async function send(){
  if(busy||!message.trim())return;setBusy(true);setError('');
  try{const ticket=await createSupport({bookingId,propertyId,kind,message:message.trim(),requestId:key.current});setMessage('');await onSent(ticket);}
  catch(failure){setError(failure.message);}finally{setBusy(false);}
 }
 return <>
  <div className="chat-body chat-new-form">
   <label>Về việc<select value={bookingId} onChange={e=>{const id=e.target.value;setBookingId(id);setKind(id==='INQUIRY'?'INQUIRY':'OTHER');}}><option value="INQUIRY">Tôi chưa đặt phòng · cần tư vấn</option>{[...bookings].reverse().map(b=><option key={b.id} value={b.id}>{bookingPropertyName(b)} · {b.roomName} · {formatStayDate(b.arrival)}{b.status==='CANCELLED'?' · Đã hủy':''}</option>)}</select></label>
   {bookingId==='INQUIRY'?<label>Cơ sở<select value={propertyId} onChange={e=>setPropertyId(e.target.value)}>{properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    :<label>Chủ đề<select value={kind} onChange={e=>setKind(e.target.value)}>{Object.entries(supportKinds).filter(([v])=>v!=='DATE_CHANGE'&&v!=='INQUIRY'&&(active||v==='OTHER')).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>}
   <div className="chat-topics" role="group" aria-label="Gợi ý nội dung">{topics.filter(t=>bookingId==='INQUIRY'?!t.booking:(active||!t.booking)).map(t=><button type="button" key={t.label} onClick={()=>{if(bookingId!=='INQUIRY')setKind(t.booking?t.kind:'OTHER');setMessage(t.text);requestAnimationFrame(()=>{const box=document.getElementById('chat-composer');box?.focus();box?.setSelectionRange(t.text.length,t.text.length);});}}>{t.label}</button>)}</div>
   <p className="chat-hint">Tin đầu tiên tạo một yêu cầu có mã riêng. Nhân viên trả lời trong cuộc trò chuyện này; không tự thêm dịch vụ hay tính phí.</p>
  </div>
  {error&&<p className="chat-error" role="alert">{error}</p>}
  <Composer value={message} onChange={setMessage} onSend={send} busy={busy} label="Tin nhắn đầu tiên" placeholder="Nhập câu hỏi của bạn…"/>
 </>;
}

/** Enter sends, Shift+Enter adds a line; Vietnamese IME composition (Telex/VNI) never sends half a word. */
function Composer({value,onChange,onSend,busy,label,placeholder='Nhập tin nhắn…'}){
 return <form className="chat-composer" onSubmit={e=>{e.preventDefault();onSend();}}>
  <label className="sr-only" htmlFor="chat-composer">{label}</label>
  <textarea id="chat-composer" rows={Math.min(5,Math.max(1,value.split('\n').length))} maxLength={1000} value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}
   onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();onSend();}}}/>
  <button type="submit" className="chat-send" disabled={busy||!value.trim()} aria-label={busy?'Đang gửi':'Gửi tin nhắn'}><ChevronIcon size={20}/></button>
  {value.length>800&&<small className="chat-count">{value.length}/1000</small>}
 </form>;
}
