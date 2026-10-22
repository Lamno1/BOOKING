import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {GuestJourney,GuestCheckout} from '../features/search/GuestJourney';
import { StaySearch, PropertyCards, RoomVisual, StayPolicies } from '../features/search/PropertyExperience';
import { dateAfter, nextDate, bookingProblem, formatStayDate } from '../shared/booking-domain';
import { StayOverview } from '../features/trips/StayOverview';
import {DateChangePanel,DownloadReceipt} from '../features/support/GuestOperations';
import {SupportChat} from '../features/support/SupportChat';
import {totalUnread,readSeen} from '../features/support/support-chat-domain';
import {OfferServices} from '../features/services/OfferServices';
import {TripHero,CancellationCard,TripList} from '../features/trips/TripHero';
import {defaultTrip} from '../features/trips/trip-domain';
import {ArrivalDetails} from '../features/trips/ArrivalDetails';
import {ReviewPrompt} from '../features/reviews/Reviews';
import {HomeIcon,HeartIcon,BagIcon,ChatIcon,UserIcon,CloseIcon,CheckIcon} from '../shared/icons';
import '../styles/base.css';
import { rooms as roomCatalog, services as serviceCatalog, money, properties, propertyById, bookingPropertyName, catalog } from '../shared/catalog';
import { validateAvailability } from '../shared/catalog-contract';
import { api, authMe, login, logout, register, createBooking, changeStatus, requestService, cancelService, changePassword } from '../shared/api';
import '../styles/booking.css';
import '../styles/booking-home.css';
import '../styles/guest-journey.css';
import '../styles/results.css';
import offer from '../../review/offer-v2.json';
import { readCheckoutDraft, clearCheckoutDraft } from '../features/search/checkout-draft';
import { writeSaved } from '../features/search/search-domain';

const emptyData = () => ({ bookings: [], requests: [], history: [], support: [], reviews: [] });
// Room/date/guest choices survive a closed tab; the server re-checks everything before saving a booking.
function initialDraft() { try { return JSON.parse(localStorage.getItem('stayos-draft-v4') || sessionStorage.getItem('stayos-draft-v4')) || {}; } catch { return {}; } }
// A shared link (?room=&arrival=&departure=&guests=) wins over the saved draft; every value is validated before use.
function linkDraft() {
  try {
    const q = new URLSearchParams(location.search), room = roomCatalog.find(r => r.id === q.get('room'));
    const iso = v => /^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : undefined, guests = Number(q.get('guests'));
    return room ? { roomId: room.id, propertyId: room.propertyId, arrival: iso(q.get('arrival')), departure: iso(q.get('departure')), guests: Number.isInteger(guests) && guests >= 1 && guests <= 6 ? guests : undefined, open: true } : {};
  } catch { return {}; }
}
const statusLabel = status => ({CONFIRMED:'Đã xác nhận',CHECKED_IN:'Đã nhận phòng',CHECKED_OUT:'Đã trả phòng',CANCELLED:'Đã hủy',PENDING:'Chờ xác nhận'})[status] || status;
function App() {
  const [link] = useState(linkDraft);
  const [draft] = useState(() => { const saved = initialDraft(), merged = { ...saved }; for (const [k, v] of Object.entries(link)) if (v !== undefined) merged[k] = v; return merged; });
  const [page, setPage] = useState('property');
  const [guestMenu,setGuestMenu]=useState(false);
  const [data, setData] = useState(emptyData);
  const [auth, setAuth] = useState({ status: 'loading', user: null });
  const [authOpen, setAuthOpen] = useState(false), [authMode, setAuthMode] = useState('login'), [authBusy, setAuthBusy] = useState(false), [authError, setAuthError] = useState('');
  const [authName, setAuthName] = useState(''), [authEmail, setAuthEmail] = useState(''), [authPassword, setAuthPassword] = useState('');
  const [roomId, setRoomId] = useState(roomCatalog.some(r=>r.id===draft.roomId)?draft.roomId:roomCatalog[0].id);
  const [propertyId, setPropertyId] = useState(link.roomId ? 'all' : properties.some(p=>p.id===draft.propertyId)?draft.propertyId:'all');
  const [details, setDetails] = useState(false);
  const [cancelBooking, setCancelBooking] = useState(null);
  const cancelDialog = useRef(null);
  useEffect(()=>{cancelBooking?cancelDialog.current?.showModal():cancelDialog.current?.close()},[cancelBooking]);
  const [checkout, setCheckout] = useState(()=>!link.open&&readCheckoutDraft(offer).open), [checkoutKey, setCheckoutKey] = useState(0);
  const [arrival, setArrival] = useState(draft.arrival >= dateAfter(0) ? draft.arrival : dateAfter(1));
  const [departure, setDeparture] = useState(draft.departure > dateAfter(0) && draft.departure > (draft.arrival >= dateAfter(0) ? draft.arrival : dateAfter(1)) ? draft.departure : nextDate(nextDate(draft.arrival >= dateAfter(0) ? draft.arrival : dateAfter(1))));
  const [guests, setGuests] = useState(draft.guests || 2);
  const [kids, setKids] = useState(Number.isInteger(draft.kids) && draft.kids >= 0 && draft.kids < (draft.guests || 2) ? draft.kids : 0);
  const [addons, setAddons] = useState(draft.addons || []);
  const [guestName, setGuestName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [activityDate, setActivityDate] = useState(dateAfter(1));
  const [activityTime, setActivityTime] = useState('18:00');
  const [busy, setBusy] = useState(false), [syncError, setSyncError] = useState('');
  const [availability, setAvailability] = useState(null), [availabilityError, setAvailabilityError] = useState('');
  const [selectedBooking, setSelectedBooking] = useState('');
  const [currentPassword, setCurrentPassword] = useState(''), [newPassword, setNewPassword] = useState('');
  const [refreshTick, setRefreshTick] = useState(0), [savedRequest, setSavedRequest] = useState(0), [justBooked, setJustBooked] = useState('');
  const requestId = useRef(crypto.randomUUID()), authGeneration = useRef(0), resumeCheckout = useRef(false);
  const syncSequence = useRef(0);
  const dialog = useRef(null), authDialog = useRef(null), successTitle = useRef(null);
  // Move focus to the confirmation once, so screen readers announce it; later re-renders leave focus alone.
  useEffect(() => { if(justBooked) requestAnimationFrame(()=>successTitle.current?.focus({preventScroll:true})); }, [justBooked]);
  // Sticky toolbars sit right under the header, whose height differs between desktop and mobile.
  useEffect(() => { const header=document.querySelector('.booking-header'); if(!header||!window.ResizeObserver) return; const ro=new ResizeObserver(()=>document.documentElement.style.setProperty('--header-h',header.offsetHeight+'px')); ro.observe(header); return ()=>ro.disconnect(); }, []);
  const currentAvailability = availability?.arrival===arrival && availability?.departure===departure ? availability : null;
  const rooms = currentAvailability ? currentAvailability.rooms : roomCatalog;
  const services = serviceCatalog;
  const room = rooms.find(r => r.id === roomId) || rooms[0];
  const property = propertyById(room.propertyId);
  const nights = Math.round((Date.parse(departure) - Date.parse(arrival))/86400000);
  const extras = services.filter(s => addons.includes(s.id));
  const total = room.price * Math.max(0, nights || 0) + extras.reduce((a,s) => a+s.price,0);
  const latest = data.bookings.find(b=>b.id===selectedBooking) || data.bookings.find(b=>b.id===justBooked) || defaultTrip(data.bookings);
  const checkoutProblem = bookingProblem({room,arrival,departure,guests,availability:currentAvailability});

  useEffect(() => {
    try { localStorage.setItem('stayos-draft-v4',JSON.stringify({propertyId,roomId,arrival,departure,guests,kids,addons})); } catch {}
    requestId.current=crypto.randomUUID();
  },[propertyId,roomId,arrival,departure,guests,addons,guestName,email]);
  useEffect(() => {
    let active=true;
    authMe().then(user=>{if(active){setAuth({status:'ready',user});if(user){setGuestName(user.displayName);setEmail(user.email);}}})
      .catch(e=>{if(active){setAuth({status:'ready',user:null});setSyncError(e.message);}});
    return ()=>{active=false;};
  },[]);
  useEffect(() => {
    setData(emptyData());setSelectedBooking('');
  },[auth.user?.email]);
  useEffect(() => {
    const generation=++authGeneration.current;
    if(!auth.user)return;
    let active=true, working=false;
    const sync=async()=>{
      if(working)return;working=true;
      const sequence=++syncSequence.current;
      try {
        const own = await api('state');
        if(active&&generation===authGeneration.current&&sequence===syncSequence.current){setData(own);setSyncError('');}
      } catch(e) {
        if(active){setSyncError(e.message);if(e.status===401){setAuth({status:'ready',user:null});setData(emptyData());}}
      } finally {working=false;}
    };
    sync();const timer=setInterval(sync,15000);window.addEventListener('focus',sync);
    return ()=>{active=false;clearInterval(timer);window.removeEventListener('focus',sync);};
  },[auth.user?.email]);
  useEffect(() => {
    if(!arrival || !departure || nights<1){setAvailability(null);setAvailabilityError('Chọn ngày trả phòng sau ngày nhận phòng.');return;}
    const controller=new AbortController();setAvailability(null);setAvailabilityError('');
    api(`availability?arrival=${encodeURIComponent(arrival)}&departure=${encodeURIComponent(departure)}`,{signal:controller.signal})
      .then(value=>{if(!controller.signal.aborted)setAvailability(validateAvailability(value,catalog,{arrival,departure}));})
      .catch(e=>{if(!controller.signal.aborted)setAvailabilityError(e.message);});
    return ()=>controller.abort();
  },[arrival,departure,refreshTick]);
  useEffect(() => {
    if(page!=='property' && !checkout)return;
    const refreshAvailability=()=>setRefreshTick(t=>t+1);
    refreshAvailability();
    const timer=setInterval(refreshAvailability,15000);
    window.addEventListener('focus',refreshAvailability);
    return ()=>{clearInterval(timer);window.removeEventListener('focus',refreshAvailability);};
  },[page,checkout]);

  useEffect(() => { if(authOpen) authDialog.current?.showModal(); else authDialog.current?.close(); }, [authOpen]);
  // Toasts dismiss themselves; the text stays long enough to read (about 60 ms per character, 5–12 s).
  useEffect(() => { if(!notice) return; const timer=setTimeout(()=>setNotice(''),Math.min(12000,Math.max(5000,notice.length*60))); return ()=>clearTimeout(timer); }, [notice]);

  async function refreshData() {
    const generation=authGeneration.current;
    const sequence=++syncSequence.current;
    const own=await api('state');
    if(generation===authGeneration.current&&sequence===syncSequence.current){setData(own);setSyncError('');}
    setRefreshTick(t=>t+1);
  }
  // Keep the address bar shareable while a room is open, and clean once it closes.
  function syncRoomLink(open) { try { const url = new URL(location.href); if (open) url.search = new URLSearchParams({ room: roomId, arrival, departure, guests: String(guests) }).toString(); else url.search = ''; history.replaceState(null, '', url); } catch {} }
  const [chat, setChat] = useState({open:false,preset:''});
  function openChat(bookingId='') { setGuestMenu(false); setChat({open:true,preset:bookingId}); }
  function navigate(to) { setGuestMenu(false);setCheckout(false);setPage(to); setNotice(''); window.scrollTo({top:0,behavior:'instant'}); }
  function pick(r) { setRoomId(r.id); setPropertyId(r.propertyId); }
  // "Book again": reopen the same room with the same party; the guest picks new dates on the room calendar.
  const [rebook, setRebook] = useState(false);
  function bookAgain(b) { const r = rooms.find(x => x.id === b.roomId); if (!r) return; pick(r); setGuests(Math.min(b.guests, r.capacity)); setKids(0); setRebook(true); navigate('property'); }
  function chooseProperty(id) { setPropertyId(id); if(id!=='all' && room.propertyId!==id)setRoomId(rooms.find(r=>r.propertyId===id).id); }
  function changeArrival(value) { setArrival(value); if(value && departure<=value)setDeparture(nextDate(value)); }
  function browseRooms() { setGuestMenu(false);setPage('property'); requestAnimationFrame(()=>requestAnimationFrame(()=>document.getElementById('rooms')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}))); }
  function previewRoom(r) { pick(r); setDetails(true); }
  function openCheckout() { setError('');setCheckout(true); }
  async function confirm(e,selection) {
    e.preventDefault();setError('');
    if(checkoutProblem)return setError(checkoutProblem);
    if(!auth.user){resumeCheckout.current=true;setCheckout(false);setAuthMode('login');setAuthOpen(true);return;}
    if(!arrival||!departure||nights<1||arrival<dateAfter(0))return setError('Chọn ngày nhận phòng từ hôm nay và ngày trả phòng sau ngày nhận.');
    if(guests<1||guests>room.capacity)return setError(`Phòng này phù hợp tối đa ${room.capacity} khách.`);
    if(busy)return;setBusy(true);
    try {
      const b=await createBooking({requestId:requestId.current,catalogVersion:catalog.version,roomId,propertyId:room.propertyId,arrival,departure,guests,guestName,email,addons:selection?[]:addons,expectedTotal:total,...(selection||{})});
      requestId.current=crypto.randomUUID();clearCheckoutDraft();setCheckoutKey(k=>k+1);
      setData(d=>({...d,bookings:[...d.bookings.filter(item=>item.id!==b.id),b]}));setSelectedBooking(b.id);
      setCheckout(false);navigate('stay');setJustBooked(b.id);
      await refreshData().catch(e=>setSyncError(e.message));
    } catch(e){setError(e.message);if(e.status===409)setRefreshTick(t=>t+1);if(e.status===401){setAuth({status:'ready',user:null});setData(emptyData());}}
    finally{setBusy(false);}
  }
  async function runMutation(work,message) {
    if(busy)return;setBusy(true);
    try{await work();setNotice(message);await refreshData().catch(e=>setSyncError(e.message));return true;}
    catch(e){setNotice(e.message);return false;}
    finally{setBusy(false);}
  }
  function addService(service) {
    if(!latest||!['CONFIRMED','CHECKED_IN'].includes(latest.status))return setNotice('Chọn một kỳ lưu trú đang hoạt động để thêm dịch vụ.');
    const start=Date.parse(`${activityDate}T${activityTime}:00+07:00`);
    return runMutation(()=>requestService({bookingId:latest.id,serviceId:service.id,start}),`Đã gửi yêu cầu ${service.name}.`);
  }
  function transition(id,status) { return runMutation(()=>changeStatus(id,status),statusLabel(status)); }
  async function submitAuth(event) {
    event.preventDefault();setAuthBusy(true);setAuthError('');
    try {
      const user=authMode==='login'?await login(authEmail,authPassword):await register(authName,authEmail,authPassword);
      ++authGeneration.current;setData(emptyData());setAuth({status:'ready',user});setGuestName(user.displayName);setEmail(user.email);
      setAuthOpen(false);setAuthName('');setAuthPassword('');setSyncError('');setNotice(`Xin chào ${user.displayName || user.email}.`);
      if(user.role==='admin'){window.location.assign('/admin.html');return;}
      if(resumeCheckout.current){resumeCheckout.current=false;setCheckout(true);}
    } catch(e){setAuthError(e.message);}finally{setAuthBusy(false);}
  }
  async function signOut() {
    try{await logout();clearCheckoutDraft();writeSaved([]);setCheckoutKey(k=>k+1);++authGeneration.current;setAuth({status:'ready',user:null});setData(emptyData());setGuestName('');setEmail('');navigate('property');setNotice('Bạn đã đăng xuất.');}
    catch(e){setNotice(e.message);}
  }
  async function updatePassword(e) {
    e.preventDefault();if(busy)return;setBusy(true);
    try{await changePassword(currentPassword,newPassword);++authGeneration.current;setAuth({status:'ready',user:null});setData(emptyData());setCurrentPassword('');setNewPassword('');setNotice('Mật khẩu đã đổi. Vui lòng đăng nhập lại trên các thiết bị.');setAuthOpen(true);}
    catch(e){setNotice(e.message);}finally{setBusy(false);}
  }
  const unreadChat = totalUnread(data.support||[], readSeen());
  const accountLabel = auth.status === 'loading' ? 'Đang kiểm tra…' : auth.user ? (auth.user.displayName || auth.user.email.split('@')[0]) : 'Đăng nhập';
  return <div className={`booking-app ${page==='property'?'guest-journey':'guest-secondary'}`}>
    <a className="skip-link" href="#main">Bỏ qua đến nội dung chính</a><header className="booking-header"><button className="wordmark" onClick={()=>{navigate('property')}}>STAYOS<span>PRIVATE RESIDENCES</span></button><button className="guest-menu-toggle" aria-expanded={guestMenu} aria-controls="guest-menu" onClick={()=>setGuestMenu(!guestMenu)}>Menu</button><nav id="guest-menu" className={guestMenu?'guest-menu-open':''} aria-label="Điều hướng chính"><button aria-current={page==='property'?'page':undefined} onClick={()=>navigate('property')}>Trang chủ</button><button onClick={browseRooms}>Chọn phòng</button><button aria-current={page==='stay'?'page':undefined} onClick={()=>navigate('stay')}>Kỳ nghỉ của tôi</button><button aria-current={page==='experiences'?'page':undefined} onClick={()=>navigate('experiences')}>Dịch vụ</button><button aria-expanded={chat.open} onClick={()=>openChat()}>Hỗ trợ</button><div className="guest-mobile-account">{auth.user?.role==='admin'?<a href="/admin.html">Quản trị ↗</a>:<button onClick={()=>{setGuestMenu(false);auth.user?navigate('account'):(setAuthMode('login'),setAuthOpen(true))}}>Tài khoản</button>}</div></nav><div className="header-actions">{auth.user?.role==='admin'?<a href="/admin.html">Quản trị ↗</a>:<button className="account-button" onClick={()=>auth.user?navigate('account'):(setAuthMode('login'),setAuthOpen(true))} ><span className="account-avatar" aria-hidden="true">{auth.user?accountLabel.slice(0,1).toUpperCase():'○'}</span><span className="account-name">{accountLabel}</span>{auth.user&&<span className="sr-only"> · tài khoản</span>}</button>}<button className="gold-button" onClick={browseRooms}>Đặt kỳ nghỉ ↗</button></div></header>
    <main id="main" tabIndex={-1}>
    <div className="toast-region" role="status" aria-live="polite">{notice && <div className="toast"><p>{notice}</p><button type="button" onClick={()=>setNotice('')} aria-label="Đóng thông báo"><CloseIcon size={16}/></button></div>}</div>
    {syncError && <p className="notice connection-error" role="alert">{syncError}</p>}
    {page==='property' && <GuestJourney key={auth.user?.email||'guest'} user={auth.user} savedRequest={savedRequest} initialDetail={!!link.open||rebook} onDetailChange={open=>{syncRoomLink(open);if(!open)setRebook(false);}} allRooms={rooms} room={room} propertyId={propertyId} onProperty={chooseProperty} arrival={arrival} onArrival={changeArrival} departure={departure} onDeparture={setDeparture} guests={guests} kids={kids} onGuests={(total,children=0)=>{setGuests(total);setKids(children);}} onBrowse={browseRooms} onPick={pick} onBook={openCheckout} availabilityError={availabilityError} onRetry={()=>setRefreshTick(t=>t+1)}/>}
    {page==='experiences' && <section className="content-section"><p className="overline">NGOÀI CĂN PHÒNG</p><h1>Thêm điều đáng nhớ.</h1>{data.bookings.length>1 && <label className="stay-picker">Thêm cho kỳ nghỉ<select value={latest?.id || ''} onChange={e=>setSelectedBooking(e.target.value)}>{[...data.bookings].reverse().map(b=><option value={b.id} key={b.id}>{bookingPropertyName(b)} · {b.roomName} · {formatStayDate(b.arrival)} · {statusLabel(b.status)}</option>)}</select></label>}{latest?.offerSnapshot?<OfferServices key={latest.id} booking={latest} requests={data.requests} onSaved={refreshData}/>:<><p>Danh mục mô phỏng · chưa xác nhận định mức hoặc khả năng phục vụ thực tế.</p><Schedule date={activityDate} time={activityTime} setDate={setActivityDate} setTime={setActivityTime}/><h2>Danh mục dịch vụ</h2><div className="service-grid">{services.map(s=><article key={s.id}><p className="overline">{s.category}</p><h3>{s.name}</h3><p>{s.description}</p><strong>{money(s.price)}</strong><small className="addon-description">{s.unitLabel}</small><button className="gold-button" onClick={()=>addService(s)}>Thêm vào kỳ nghỉ</button></article>)}</div></>}</section>}
    {page==='stay' && <section className="content-section"><p className="overline">KỲ NGHỈ CỦA BẠN / TỪNG CHẶNG</p><h1>Kỳ nghỉ của bạn.</h1>{data.bookings.length>1 && <TripList bookings={data.bookings} selectedId={latest?.id} onSelect={setSelectedBooking} statusLabel={statusLabel} propertyName={bookingPropertyName}/>}{!latest?<div className="empty"><h3>Hành trình đang chờ bắt đầu.</h3><p>{auth.user?'Chọn căn hộ và ngày lưu trú để bắt đầu kỳ nghỉ.':'Đăng nhập để xem đặt phòng đã lưu theo tài khoản của bạn.'}</p><button className="gold-button" onClick={()=>auth.user?browseRooms():(setAuthMode('login'),setAuthOpen(true))}>{auth.user?'Tìm phòng':'Đăng nhập xem kỳ nghỉ'}</button></div>:<>{justBooked===latest.id&&<section className="booking-success" role="status" aria-labelledby="success-title"><CheckIcon size={28}/><div><h2 id="success-title" tabIndex={-1} ref={successTitle}>Đã đặt {latest.roomName}</h2><p>Mã đơn {latest.id} · {formatStayDate(latest.arrival)} → {formatStayDate(latest.departure)} · {latest.guests} khách. Đơn mô phỏng, chưa thu tiền và chưa gửi email xác nhận.</p><div className="success-next"><button type="button" onClick={()=>navigate('experiences')}>Thêm dịch vụ cho kỳ nghỉ</button><button type="button" onClick={()=>openChat(latest.id)}>Hỏi STAYOS</button><button type="button" onClick={()=>setJustBooked('')}>Đã hiểu</button></div></div></section>}<TripHero key={'trip-'+latest.id} booking={latest} requests={data.requests} onBookAgain={rooms.some(r=>r.id===latest.roomId)?()=>bookAgain(latest):null}/><ArrivalDetails key={'arrival-'+latest.id} booking={latest} onSaved={async message=>{setNotice(message);await refreshData().catch(e=>setSyncError(e.message));}}/><ReviewPrompt key={'review-'+latest.id} booking={latest} reviews={data.reviews||[]} onSaved={refreshData}/><div className="stay-summary"><p>{bookingPropertyName(latest)}</p><h2>{latest.roomName}</h2><p>{latest.id} · {formatStayDate(latest.arrival)} → {formatStayDate(latest.departure)} · {latest.guests} khách</p><strong>{money(latest.total)}</strong><span>{statusLabel(latest.status)}</span></div><DownloadReceipt booking={latest} requests={data.requests}/><DateChangePanel key={'change-'+latest.id} booking={latest} tickets={data.support||[]} requests={data.requests} onRefresh={refreshData} onSupport={()=>openChat(latest.id)}/><StayOverview booking={latest} onSupport={()=>openChat(latest.id)} onBrowse={browseRooms}/><h2>{['CANCELLED','CHECKED_OUT'].includes(latest.status)?'Lịch sử yêu cầu dịch vụ':'Yêu cầu dịch vụ'}</h2><RequestList closed={['CANCELLED','CHECKED_OUT'].includes(latest.status)} requests={data.requests.filter(r=>r.bookingId===latest.id)} busy={busy} onCancel={r=>runMutation(()=>cancelService(r.id),`Đã hủy ${r.name}; tổng đơn đã trừ ${money(r.price)}.`)}/><CancellationCard key={'cancel-'+latest.id} booking={latest} busy={busy} onCancel={()=>setCancelBooking(latest)} onSupport={()=>openChat(latest.id)}/></>}</section>}

    {page==='account' && <section className="content-section account-page"><p className="overline">TÀI KHOẢN STAYOS</p><h1>Lịch sử và hồ sơ của bạn.</h1>{auth.user ? <><div className="account-hero"><span className="account-avatar large">{accountLabel.slice(0,1).toUpperCase()}</span><div><h2>{auth.user.displayName || accountLabel}</h2><p>{auth.user.email} · {auth.user.role === 'admin' ? 'Quản trị viên' : 'Khách lưu trú'}</p></div><button onClick={signOut}>Đăng xuất</button></div><h2>Lịch sử đặt phòng</h2>{data.bookings.length ? <div className="history-list">{[...data.bookings].reverse().map(b=><article key={b.id}><div><span className="history-status">{statusLabel(b.status)}</span><p>{bookingPropertyName(b)}</p><h3>{b.roomName}</h3><p>{b.id} · {formatStayDate(b.arrival)} → {formatStayDate(b.departure)} · {b.guests} khách</p></div><div className="history-side"><strong>{money(b.total)}</strong><button type="button" onClick={()=>{setSelectedBooking(b.id);navigate('stay');}}>Xem chuyến đi<span className="sr-only"> {b.roomName} {b.id}</span> →</button></div></article>)}</div> : <div className="empty"><h3>Chưa có kỳ nghỉ nào.</h3><p>Chọn một phòng để bắt đầu lịch sử lưu trú của bạn.</p><button className="gold-button" onClick={()=>navigate('property')}>Khám phá phòng</button></div>}<form className="password-form" onSubmit={updatePassword}><h2>Bảo mật tài khoản</h2><p>Đổi mật khẩu sẽ đăng xuất các phiên khác.</p><label>Mật khẩu hiện tại<input type="password" autoComplete="current-password" value={currentPassword} maxLength={256} onChange={e=>setCurrentPassword(e.target.value)} required /></label><label>Mật khẩu mới<input type="password" autoComplete="new-password" minLength={12} maxLength={256} value={newPassword} onChange={e=>setNewPassword(e.target.value)} required /></label><small>Tối thiểu 12 ký tự.</small><button disabled={busy} className="gold-button">Đổi mật khẩu</button></form><h2>Hoạt động gần đây</h2>{data.history?.length ? <div className="history-list">{[...data.history].reverse().slice(0,12).map(event=><article key={event.id}><div><span className="history-status">{({BOOKING_CREATED:'Đặt phòng',BOOKING_STATUS:'Lưu trú',BOOKING_CHANGED:'Đổi ngày',CHANGE_DECISION:'Đổi ngày',SERVICE_ADDED:'Dịch vụ',SERVICE_CANCELLED:'Hủy dịch vụ',SERVICE_CONFIRMED:'Xác nhận',SUPPORT_CREATED:'Hỗ trợ',SUPPORT_REPLY:'Hỗ trợ',SUPPORT_CANCELLED:'Hỗ trợ'})[event.type] || 'Hoạt động'}</span><p>{event.message}</p></div><small>{new Date(event.at).toLocaleString('vi-VN')}</small></article>)}</div> : <p>Chưa có hoạt động nào được ghi nhận.</p>}</> : <div className="empty"><h3>Đăng nhập để đồng bộ lịch sử.</h3><p>Lịch đặt phòng, dịch vụ và các mốc trong kỳ nghỉ sẽ được giữ theo tài khoản của bạn.</p><button className="gold-button" onClick={()=>{setAuthMode('login');setAuthOpen(true)}}>Đăng nhập</button></div>}</section>}
    </main>
    <nav className="tab-bar" aria-label="Điều hướng nhanh">{[
      ['property','Khám phá',HomeIcon,()=>navigate('property')],
      ['saved','Đã lưu',HeartIcon,()=>{setSavedRequest(n=>n+1);browseRooms();}],
      ['stay','Chuyến đi',BagIcon,()=>navigate('stay')],
      ['concierge','Hỗ trợ',ChatIcon,()=>openChat()],
      ['account','Tài khoản',UserIcon,()=>auth.user?navigate('account'):(setAuthMode('login'),setAuthOpen(true))],
    ].map(([id,label,Icon,go])=><button type="button" key={id} aria-current={page===id?'page':undefined} aria-expanded={id==='concierge'?chat.open:undefined} onClick={go}><Icon size={21}/><span>{label}</span>{id==='concierge'&&unreadChat>0&&<b className="tab-badge"><span className="sr-only">, </span>{unreadChat}<span className="sr-only"> tin mới</span></b>}</button>)}</nav>
    <SupportChat open={chat.open} preset={chat.preset} onOpenChange={open=>setChat(c=>({...c,open}))} user={auth.user} bookings={data.bookings} tickets={data.support||[]} onLogin={()=>{setAuthMode('login');setAuthOpen(true)}} onRefresh={refreshData} statusLabel={statusLabel} onNavigate={to=>to==='rooms'?browseRooms():navigate(to)}/>
    <footer className="booking-footer"><span>STAYOS · HAI CƠ SỞ MÔ PHỎNG</span><p>Tên cơ sở, sơ đồ và giá là dữ liệu demo · chưa có địa chỉ, ảnh phòng và liên hệ xác minh · không thu tiền.</p></footer>
    <GuestCheckout key={checkoutKey} open={checkout} onClose={()=>setCheckout(false)} room={room} arrival={arrival} departure={departure} guests={guests} user={auth.user} authLoading={auth.status==='loading'} guestName={guestName} onName={setGuestName} email={email} onEmail={setEmail} onEditStay={browseRooms} onConfirm={confirm} busy={busy} error={error} problem={checkoutProblem||availabilityError}/>
    <dialog ref={cancelDialog} className="auth-dialog" aria-label="Xác nhận hủy đặt phòng" onCancel={event=>{if(busy)event.preventDefault();else setCancelBooking(null)}}><h2>Hủy kỳ nghỉ này?</h2><p>{cancelBooking?.roomName} · {cancelBooking&&formatStayDate(cancelBooking.arrival)} → {cancelBooking&&formatStayDate(cancelBooking.departure)}</p><p>Đơn và các dịch vụ đi kèm sẽ được hủy. Lịch sử vẫn được giữ trong tài khoản.</p><div className="welcome-actions"><button disabled={busy} onClick={()=>setCancelBooking(null)}>Giữ đặt phòng</button><button disabled={busy} onClick={async()=>{if(await transition(cancelBooking.id,'CANCELLED'))setCancelBooking(null)}}>Xác nhận hủy</button></div></dialog>
    <dialog ref={authDialog} className="auth-dialog" aria-label="Tài khoản STAYOS" onCancel={()=>{resumeCheckout.current=false;setAuthOpen(false)}}><button className="dialog-close" onClick={()=>{resumeCheckout.current=false;setAuthOpen(false)}} aria-label="Đóng tài khoản">×</button><div className="auth-tabs" role="tablist"><button role="tab" aria-selected={authMode==='login'} onClick={()=>{setAuthMode('login');setAuthError('')}}>Đăng nhập</button><button role="tab" aria-selected={authMode==='register'} onClick={()=>{setAuthMode('register');setAuthError('')}}>Tạo tài khoản</button></div><form onSubmit={submitAuth}><p className="overline">TÀI KHOẢN STAYOS</p><h2>{authMode==='login'?'Chào mừng trở lại.':'Bắt đầu kỳ nghỉ của bạn.'}</h2>{authMode==='register'&&<label>Tên hiển thị<input autoComplete="name" value={authName} onChange={e=>setAuthName(e.target.value)} required /></label>}<label>Email tài khoản<input type="email" autoComplete="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} required /></label><label>Mật khẩu<input type="password" autoComplete={authMode==='login'?'current-password':'new-password'} minLength="8" maxLength={256} value={authPassword} onChange={e=>setAuthPassword(e.target.value)} required /><small>Tối thiểu 8 ký tự · có thể dán hoặc dùng trình quản lý mật khẩu.</small></label>{authMode==='login' && <details className="password-help"><summary>Quên mật khẩu?</summary><p>Bản demo chưa có dịch vụ gửi email khôi phục. Không nhập lại mật khẩu nếu bạn không nhớ; chức năng tự khôi phục cần được cấu hình trước khi mở đặt phòng thật.</p></details>}{authError&&<p className="form-error" role="alert">{authError}</p>}<button className="gold-button confirm" disabled={authBusy}>{authBusy?'Đang xử lý…':authMode==='login'?'Đăng nhập':'Tạo tài khoản'}</button></form></dialog>
  </div>;
}
function Schedule({date,time,setDate,setTime}) { return <div className="schedule"><label>Ngày hoạt động<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Giờ<input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label></div>; }
// Free cancellation mirrors the server rule: 12 h before dinner, 24 h before other services.
const cancellable=r=>r.start&&!['CANCELLED'].includes(r.status)&&r.start-Date.now()>=(r.serviceId==='dining'?12:24)*3600000;
// Two-step inline confirmation instead of a blocking browser dialog.
function CancelService({request,busy,onCancel}) { const [ask,setAsk]=useState(false); return ask?<div className="inline-confirm" role="group" aria-label={`Xác nhận hủy ${request.name}`}><span>Hủy và trừ {money(request.price)} khỏi tổng?</span><button disabled={busy} onClick={()=>onCancel(request)}>Xác nhận hủy</button><button disabled={busy} onClick={()=>setAsk(false)}>Giữ lại</button></div>:<button disabled={busy} onClick={()=>setAsk(true)}>Hủy dịch vụ</button>; }
function RequestList({requests,accept,closed=false,onCancel,busy}) { return !requests.length?<p>{closed?'Không có yêu cầu dịch vụ trong hồ sơ này.':'Chưa có yêu cầu dịch vụ.'}</p>:<div className="request-list">{[...requests].sort((a,b)=>(a.start||0)-(b.start||0)).map(r=><article key={r.id}><div><h3>{r.name}{r.quantity?` · ${r.quantity} × ${r.unit}`:''}</h3><p>{r.start?new Date(r.start).toLocaleString('vi-VN'):'Chưa ghi nhận lịch hẹn'}</p></div>{r.requestedSchedule?.flight&&<p>Chuyến bay: {r.requestedSchedule.flight}</p>}{r.conditions&&<details><summary>Điều kiện đã lưu</summary><p>{r.conditions}</p></details>}<strong>{money(r.price)}</strong><span>{statusLabel(r.status)}</span>{accept && r.status==='PENDING' && <button onClick={()=>accept(r.id)}>Xác nhận</button>}{onCancel&&!closed&&(cancellable(r)?<CancelService request={r} busy={busy} onCancel={onCancel}/>:r.status!=='CANCELLED'&&r.start&&<small>Đã qua hạn hủy miễn phí · liên hệ hỗ trợ</small>)}</article>)}</div>; }
createRoot(document.getElementById('root')).render(<App/>);
