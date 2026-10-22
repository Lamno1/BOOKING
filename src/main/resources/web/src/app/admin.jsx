import React, {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {api,authMe,login,logout,changeStatus,confirmService} from '../shared/api';
import {money,properties,propertyById,bookingPropertyName,catalog} from '../shared/catalog';
import {validateAvailability} from '../shared/catalog-contract';
import '../features/admin/admin.css';
import {AdminSupportPanel,OccupancyCalendar} from '../features/admin/AdminGuestOperations';
import {nextDate} from '../shared/booking-domain';
import {AdminReviews} from '../features/admin/AdminReviews';
import {AdminBookings} from '../features/admin/AdminBookings';
import {completedStays} from '../features/admin/admin-bookings-domain';
import {AdminToday} from '../features/admin/AdminToday';

const day=(offset=0)=>{const d=new Date();d.setDate(d.getDate()+offset);return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)};
const labels={ACTIVE:'Hoạt động',SUSPENDED:'Tạm khóa',OPEN:'Sẵn sàng',CLEANING:'Đang dọn',MAINTENANCE:'Bảo trì',CONFIRMED:'Đã xác nhận',CHECKED_IN:'Đang lưu trú',CHECKED_OUT:'Đã trả phòng',CANCELLED:'Đã hủy',PENDING:'Chờ xác nhận'};
const nav=[['today','00','Hôm nay'],['users','01','Tài khoản'],['rooms','02','Tình trạng phòng'],['bookings','03','Đặt phòng'],['services','04','Dịch vụ'],['support','05','Hỗ trợ & đổi ngày'],['reviews','06','Đánh giá']];
const Badge=({value})=><span className={`ops-badge status-${value}`}>{labels[value]||value}</span>;
function Admin(){
  const [user,setUser]=useState(),[tab,setTab]=useState('today'),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
  const [data,setData]=useState({users:[],rooms:[],bookings:[],requests:[],support:[],reviews:[]}),[search,setSearch]=useState(''),[updated,setUpdated]=useState(null);
  const [propertyId,setPropertyId]=useState('all');
  const [arrival,setArrival]=useState(day()),[departure,setDeparture]=useState(day(1));
  const [edit,setEdit]=useState(null),[note,setNote]=useState(''),[next,setNext]=useState('');
  const dialog=useRef(null),version=useRef(0);
  useEffect(()=>{authMe().then(setUser).catch(e=>{setError(e.message);setUser(null)}).finally(()=>setLoading(false));},[]);
  async function refresh(){
    const sequence=++version.current;
    try{
      const [accounts,state,inventory]=await Promise.all([api('admin/users'),api('admin/state'),api(`admin/rooms?arrival=${arrival}&departure=${departure}`)]);
      validateAvailability(inventory,catalog,{arrival,departure});
      if(sequence===version.current){setData({...state,users:accounts.users,rooms:inventory.rooms});setUpdated(new Date());setError('');}
    }catch(e){if(sequence===version.current){setError(e.message);if(e.status===401){setUser(null);setData({users:[],rooms:[],bookings:[],requests:[],support:[],reviews:[]});}}}
  }
  useEffect(()=>{
    if(user?.role!=='admin')return;
    refresh();const tick=()=>{if(!document.hidden)refresh()};const timer=setInterval(tick,15000);window.addEventListener('focus',tick);
    return()=>{++version.current;clearInterval(timer);window.removeEventListener('focus',tick)};
  },[user,arrival,departure]);
  useEffect(()=>{edit?dialog.current?.showModal():dialog.current?.close()},[edit]);
  async function signIn(e){e.preventDefault();setBusy(true);setError('');try{setUser(await login(email,password));setPassword('')}catch(e){setError(e.message)}finally{setBusy(false)}}
  async function signOut(){try{await logout();++version.current;setUser(null);setData({users:[],rooms:[],bookings:[],requests:[],support:[],reviews:[]})}catch(e){setError(e.message)}}
  function prepare(kind,target,status){setEdit({kind,target});setNext(status);setNote('');setError('')}
  async function save(e){
    e.preventDefault();if(busy)return;setBusy(true);setError('');
    try{
      if(edit.kind==='user')await api('admin/users/status',{method:'POST',body:JSON.stringify({email:edit.target.email,status:next})});
      if(edit.kind==='room')await api('admin/rooms/status',{method:'POST',body:JSON.stringify({roomId:edit.target.id,status:next,note})});
      if(edit.kind==='booking')await changeStatus(edit.target.id,next);
      if(edit.kind==='service')await confirmService(edit.target.id);
      setNotice('Đã lưu thay đổi trên máy chủ.');setEdit(null);await refresh();
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }
  if(loading)return <main className="ops-login"><p role="status">Đang kiểm tra quyền truy cập…</p></main>;
  if(!user||user.role!=='admin')return <main className="ops-login"><div className="ops-login-brand">STAYOS <span>OPERATIONS</span></div><section><p className="ops-eyebrow">KHÔNG GIAN LÀM VIỆC NỘI BỘ</p><h1>Chào mừng<br/>đến ca làm việc.</h1><p>Quản lý tài khoản, tình trạng phòng và yêu cầu của khách.</p>{error&&<p role="alert" className="ops-error">{error}</p>}{user?<><p>Tài khoản khách không có quyền vào khu vực này.</p><button onClick={signOut}>Đăng xuất tài khoản khách</button></>:<form onSubmit={signIn}><label>Email quản trị<input autoComplete="username" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Mật khẩu<input autoComplete="current-password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label><button className="ops-primary" disabled={busy}>{busy?'Đang xác thực…':'Vào trang quản trị →'}</button></form>}<a href="/">← Trang trải nghiệm của khách</a></section></main>;
  const matches=p=>propertyId==='all'||(propertyId==='legacy'?!p:p===propertyId);
  const scopedRooms=data.rooms.filter(r=>matches(r.propertyId));
  const scopedBookings=data.bookings.filter(b=>matches(b.propertyId));
  const scopedRequests=data.requests.filter(r=>matches(r.propertyId||data.bookings.find(b=>b.id===r.bookingId)?.propertyId));
  const scopedSupport=(data.support||[]).filter(ticket=>matches(ticket.propertyId||data.bookings.find(booking=>booking.id===ticket.bookingId)?.propertyId));
  const filteredUsers=data.users.filter(u=>`${u.displayName} ${u.email}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="ops-shell">
    <aside className="ops-sidebar"><a className="ops-brand" href="/admin.html">STAYOS<span>OPERATIONS CONSOLE</span></a><div className="ops-property"><label>Cơ sở quản lý<select value={propertyId} onChange={e=>setPropertyId(e.target.value)}><option value="all">Cả hai cơ sở</option>{properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}<option value="legacy">Đơn cũ · chưa gán cơ sở</option></select></label><small>2 cơ sở · 15 phòng mô phỏng</small></div><nav aria-label="Quản trị">{nav.map(([id,no,label])=><button key={id} aria-current={tab===id?'page':undefined} onClick={()=>{setTab(id);setSearch('')}}><span>{no}</span>{label}{id==='services'&&scopedRequests.some(r=>r.status==='PENDING')&&<b>{scopedRequests.filter(r=>r.status==='PENDING').length}</b>}{id==='support'&&scopedSupport.some(ticket=>['OPEN','IN_PROGRESS'].includes(ticket.status))&&<b>{scopedSupport.filter(ticket=>['OPEN','IN_PROGRESS'].includes(ticket.status)).length}</b>}</button>)}</nav><div className="ops-sidebar-bottom"><a href="/">Xem giao diện khách ↗</a><small>{user.displayName}<br/>{user.email}</small><button onClick={signOut}>Đăng xuất</button></div></aside>
    <main className="ops-main"><header className="ops-topline"><span>QUẢN TRỊ / {nav.find(n=>n[0]===tab)[2].toUpperCase()}</span><span>{updated?`Cập nhật ${updated.toLocaleTimeString('vi-VN')}`:'Đang đồng bộ…'} <button onClick={refresh}>Làm mới</button></span></header>
    <div className="ops-page-heading"><div><p className="ops-eyebrow">STAYOS WORKSPACE</p><h1>{nav.find(n=>n[0]===tab)[2]}</h1><p>{tab==='users'?'Tài khoản dùng chung cho hai cơ sở; bộ lọc cơ sở không giới hạn danh bạ.':tab==='rooms'?'Phân biệt phòng đã được đặt với phòng đang dọn hoặc bảo trì.':tab==='bookings'?'Theo dõi ngày đến, ngày đi và trạng thái lưu trú.':tab==='support'?'Đọc yêu cầu, phản hồi cho khách và xét đổi ngày; đơn hiện tại giữ nguyên đến khi duyệt.':tab==='reviews'?'Xem đánh giá sau kỳ nghỉ và ẩn nội dung vi phạm kèm lý do.':tab==='today'?'Việc cần người xử lý trong ngày ở các cơ sở đang chọn.':'Tiếp nhận và xác nhận dịch vụ trong kỳ nghỉ.'}</p></div><span className="ops-environment">LOCAL DEMO</span></div>
    {error&&!edit&&<p role="alert" className="ops-error">{error}</p>}{notice&&<p role="status" className="ops-notice">{notice}</p>}
    {tab!=="today"&&<div className="ops-stats">{[['Tài khoản khách · toàn hệ thống',data.users.filter(u=>u.role==='guest').length],['Phòng sẵn sàng',scopedRooms.filter(r=>r.available).length+' / '+scopedRooms.length],['Đang lưu trú',scopedBookings.filter(b=>b.status==='CHECKED_IN').length],['Dịch vụ chờ',scopedRequests.filter(r=>r.status==='PENDING').length]].map(([k,v])=><div key={k}><span>{k}</span><strong>{v}</strong></div>)}</div>}
    {tab==='users'&&<section className="ops-panel"><div className="ops-panel-title"><h2>Danh bạ tài khoản <small>{data.users.length}</small></h2><label>Tìm tài khoản<input type="search" placeholder="Tên hoặc email" value={search} onChange={e=>setSearch(e.target.value)}/></label></div><div className="ops-table-wrap"><table><thead><tr><th>Người dùng</th><th>Vai trò</th><th>Trạng thái</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead><tbody>{filteredUsers.map(u=><tr key={u.email}><td><strong>{u.displayName}</strong><small>{u.email}</small></td><td>{u.role==='admin'?'Quản trị viên':'Khách'}</td><td><Badge value={u.status}/></td><td>{u.createdAt?.slice(0,10)||'—'}</td><td>{u.role==='guest'?<button onClick={()=>prepare('user',u,u.status==='ACTIVE'?'SUSPENDED':'ACTIVE')}>{u.status==='ACTIVE'?'Tạm khóa':'Mở khóa'}</button>:<small>Được bảo vệ</small>}</td></tr>)}</tbody></table></div>{!filteredUsers.length&&<p className="ops-empty">Không có tài khoản phù hợp.</p>}<p className="ops-help">Tạm khóa sẽ thu hồi phiên đăng nhập; không xóa lịch sử hoặc hủy booking của khách.</p></section>}
    {tab==='rooms'&&<OccupancyCalendar rooms={scopedRooms} bookings={scopedBookings} arrival={arrival}/>}
    {tab==='rooms'&&<section className="ops-panel"><div className="ops-panel-title"><h2>Lịch phòng</h2><div className="ops-dates"><label>Từ ngày<input type="date" min={day()} value={arrival} onChange={e=>{const value=e.target.value;setArrival(value);if(value&&departure<=value)setDeparture(nextDate(value));}}/></label><label>Đến ngày<input type="date" min={nextDate(arrival)} value={departure} onChange={e=>setDeparture(e.target.value)}/></label></div></div><div className="ops-table-wrap"><table><thead><tr><th>Phòng</th><th>Giá / đêm</th><th>Tồn phòng theo ngày</th><th>Vận hành</th><th>Thao tác</th></tr></thead><tbody>{scopedRooms.map(r=><tr key={r.id}><td><strong>{r.name}</strong><small>{propertyById(r.propertyId)?.name} · Tầng {r.floor} · {r.capacity} khách</small></td><td>{money(r.price)}</td><td>{r.available?'Còn trống':r.availabilityReason==='BOOKED'?'Đã có đặt phòng':'Tạm ngưng bán'}</td><td><Badge value={r.operation.status}/><small>{r.operation.note}</small></td><td><button onClick={()=>prepare('room',r,r.operation.status)}>Cập nhật</button></td></tr>)}</tbody></table></div>{!scopedRooms.length&&<p className="ops-empty">Không có phòng trong nhóm này. Đơn cũ chưa gán cơ sở vẫn được lưu riêng trong mục Đặt phòng.</p>}<p className="ops-help">Đang dọn / bảo trì ngưng nhận booking mới đến khi mở lại, không tự hủy đơn đã có. Tình trạng đặt phòng được tính từ đơn, không chỉnh bằng tay.</p></section>}
    {tab==='bookings'&&<AdminBookings bookings={scopedBookings} today={day()} labels={labels} onAction={prepare} stays={completedStays(data.bookings)} notes={data.notes||{}} onNoteSaved={async message=>{setNotice(message);await refresh();}}/>}
    {tab==='services'&&<section className="ops-panel"><div className="ops-panel-title"><h2>Yêu cầu dịch vụ</h2></div><div className="ops-table-wrap"><table><thead><tr><th>Dịch vụ</th><th>Booking</th><th>Lịch hẹn</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{[...scopedRequests].reverse().map(r=><tr key={r.id}><td><strong>{r.name}{r.quantity?` · ${r.quantity} × ${r.unit}`:''}</strong><small>{money(r.price)}{r.requestedSchedule?.flight?` · chuyến ${r.requestedSchedule.flight}`:''}{r.cancelledBy?` · hủy bởi ${r.cancelledBy==='admin'?'nhân viên':'khách'}`:''}</small></td><td>{r.bookingId}<small>{r.propertyName||bookingPropertyName(data.bookings.find(b=>b.id===r.bookingId)||{})}</small></td><td>{r.start?new Date(r.start).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',dateStyle:'short',timeStyle:'short'}):'Chờ thống nhất lịch'}</td><td><Badge value={r.status}/></td><td>{r.status==='PENDING'&&<button onClick={()=>prepare('service',r,'CONFIRMED')}>Xác nhận</button>}</td></tr>)}</tbody></table></div>{!scopedRequests.length&&<p className="ops-empty">Không có yêu cầu dịch vụ.</p>}</section>}
    {tab==='support'&&<AdminSupportPanel tickets={scopedSupport} onRefresh={refresh}/>}
    {tab==='today'&&<AdminToday data={{bookings:scopedBookings,requests:scopedRequests,support:scopedSupport,reviews:(data.reviews||[]).filter(r=>matches(r.propertyId)),rooms:scopedRooms}} today={day()} onAction={prepare} onOpenTab={setTab} stays={completedStays(data.bookings)} notes={data.notes||{}}/>}
    {tab==='reviews'&&<AdminReviews reviews={(data.reviews||[]).filter(r=>matches(r.propertyId))} onRefresh={refresh}/>}
    <footer className="ops-footer">STAYOS Operations <span>Dữ liệu SQLite · Chưa kết nối thanh toán</span></footer></main>
    <dialog ref={dialog} className="ops-dialog" onCancel={()=>setEdit(null)} aria-label="Xác nhận thay đổi"><form onSubmit={save}><p className="ops-eyebrow">XÁC NHẬN THAO TÁC</p><h2>{edit?.target.displayName||edit?.target.name||edit?.target.roomName}</h2>{edit?.kind==='room'?<><label>Trạng thái vận hành<select value={next} onChange={e=>setNext(e.target.value)}>{['OPEN','CLEANING','MAINTENANCE'].map(s=><option value={s} key={s}>{labels[s]}</option>)}</select></label><label>Ghi chú lý do<textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={240} required/></label><p>Áp dụng đến khi thay đổi lại; các booking cũ vẫn được giữ.</p></>:<p>Chuyển sang <strong>{labels[next]}</strong>. {edit?.kind==='user'?'Lịch sử và booking được giữ nguyên.':next==='CANCELLED'?'Các dịch vụ của đơn cũng sẽ được hủy.':'Thay đổi được ghi vào lịch sử.'}</p>}{error&&<p role="alert" className="ops-error">{error}</p>}<div className="ops-actions"><button type="button" onClick={()=>setEdit(null)} disabled={busy}>Quay lại</button><button className="ops-primary" disabled={busy}>{busy?'Đang lưu…':'Xác nhận thay đổi'}</button></div></form></dialog>
  </div>
}
createRoot(document.getElementById('root')).render(<Admin/>);
