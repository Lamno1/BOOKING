import React,{useState} from 'react';
import { properties, propertyById, money } from '../../shared/catalog';
import { dateAfter, nextDate, formatStayDate } from '../../shared/booking-domain';
import { datePresets, readSearches, pushSearch } from './search-domain';
import { GuestPicker } from './GuestPicker';

export function StaySearch({propertyId,onProperty,arrival,onArrival,departure,onDeparture,guests,kids=0,onGuests,onSearch}) {
  const today=dateAfter(0),presets=datePresets(today);
  const [recent,setRecent]=useState(()=>readSearches(today));
  const choose=p=>{onArrival(p.arrival);onDeparture(p.departure);};
  const current={propertyId,arrival,departure,guests,kids};
  const short=date=>formatStayDate(date).slice(0,5);
  const place=id=>id==='all'?'Cả hai cơ sở':propertyById(id)?.name.replace('STAYOS ','')||id;
  // Re-running a recent search fills every field and goes straight to results, as on large booking sites.
  const rerun=s=>{onProperty(s.propertyId);onArrival(s.arrival);onDeparture(s.departure);onGuests(s.guests,s.kids);setRecent(pushSearch(s,today));onSearch();};
  const others=recent.filter(s=>!(s.propertyId===propertyId&&s.arrival===arrival&&s.departure===departure&&s.guests===guests&&s.kids===kids));
  return <form className="stay-search" onSubmit={event=>{event.preventDefault();setRecent(pushSearch(current,today));onSearch()}} aria-label="Tìm kỳ nghỉ">
    <label>Cơ sở lưu trú<select value={propertyId} onChange={e=>onProperty(e.target.value)}><option value="all">Cả hai cơ sở STAYOS</option>{properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <label>Ngày đến<input type="date" required min={dateAfter(0)} value={arrival} onInput={e=>onArrival(e.currentTarget.value)} onChange={e=>onArrival(e.target.value)}/></label>
    <label>Ngày đi<input type="date" required min={nextDate(arrival)} value={departure} onInput={e=>onDeparture(e.currentTarget.value)} onChange={e=>onDeparture(e.target.value)}/></label>
    <GuestPicker guests={guests} kids={kids} onChange={onGuests}/>
    <button className="gold-button">Tìm phòng →</button>
    <div className="date-presets" role="group" aria-label="Chọn ngày nhanh">{presets.map(p=><button type="button" key={p.id} aria-pressed={arrival===p.arrival&&departure===p.departure} onClick={()=>choose(p)}>{p.label}</button>)}
      <button type="button" onClick={()=>onDeparture(nextDate(departure))}>Thêm 1 đêm</button></div>
    {others.length>0&&<div className="recent-searches" role="group" aria-label="Tìm kiếm gần đây"><span aria-hidden="true">Gần đây</span>{others.map(s=><button type="button" key={`${s.propertyId}-${s.arrival}-${s.departure}-${s.guests}-${s.kids}`} onClick={()=>rerun(s)}><span className="sr-only">Tìm lại: </span>{place(s.propertyId)} · {short(s.arrival)} → {short(s.departure)} · {s.guests} khách</button>)}</div>}
  </form>;
}

export function PropertyCards({selected,onSelect,rooms}) {
  return <section className="property-collection" aria-labelledby="properties-title"><div className="section-heading"><div><p className="overline">HAI CƠ SỞ · MỘT STAYOS</p><h2 id="properties-title">Bạn muốn ở đâu?</h2></div><p>Chọn cơ sở trước, rồi chọn phòng bên trong.<br/>Tên và mô hình vận hành đang là dữ liệu demo.</p></div><div className="property-cards">{properties.map((p,index)=>{
    const inventory=rooms.filter(r=>r.propertyId===p.id);
    return <article key={p.id} className={`property-card ${selected===p.id?'is-selected':''}`}><span className="property-index">0{index+1}</span><p className="overline">{p.kind} · {inventory.length} phòng</p><h3>{p.name}</h3><p>{p.description}</p><div className="property-meta"><span>{p.id==='residence'?'Có bếp & khu sinh hoạt':'Tiện nghi thiết yếu'}</span><span>Từ {money(Math.min(...inventory.map(r=>r.price)))} / đêm</span></div><p className="property-unverified">{p.addressStatus} · chưa có ảnh thực tế.</p><button aria-pressed={selected===p.id} className="gold-button" onClick={()=>onSelect(p.id)}>Xem phòng tại đây →</button></article>;
  })}</div></section>;
}

export function RoomVisual({room,compact=false}) {
  const residence=room.propertyId==='residence';
  const count=room.capacity>=6?3:room.capacity>=3?2:1;
  return <div className={`room-visual ${residence?'residence-visual':'inn-visual'} ${compact?'compact':''}`} role="img" aria-label={`Sơ đồ minh họa ${room.number}, ${room.typeName}; không phải ảnh hay bản vẽ thực tế`}>
    <div className="room-visual-head"><span>{propertyById(room.propertyId)?.name}</span><strong>{room.number}</strong></div>
    <svg viewBox="0 0 360 205" aria-hidden="true"><rect x="36" y="15" width="286" height="175" rx="3" fill="#f4eee0" stroke="#455c58" strokeWidth="4"/>
      <path d="M65 15h170" stroke="#94c6cc" strokeWidth="7"/>
      <rect x="242" y="106" width="78" height="82" fill="#cddbd4" stroke="#455c58" strokeWidth="2"/><text x="280" y="152" textAnchor="middle" fontSize="12" fill="#34534e">Tắm / WC</text>
      {Array.from({length:count},(_,i)=><g key={i} transform={`translate(${54+i*76} 38)`}><rect width="60" height="76" rx="5" fill={residence?'#b7976e':'#74918b'} stroke="#54615a"/><rect x="5" y="6" width="50" height="17" rx="3" fill="#fffcf3"/><path d="M4 32h52" stroke="#fffcf3"/></g>)}
      {residence?<><rect x="53" y="145" width="92" height="28" rx="5" fill="#b3beb0"/><text x="97" y="164" textAnchor="middle" fontSize="10" fill="#29423c">Sinh hoạt</text><rect x="251" y="28" width="54" height="60" fill="#d7c8ab"/><text x="278" y="64" textAnchor="middle" fontSize="11" fill="#29423c">Bếp</text></>:<><rect x="254" y="30" width="48" height="48" fill="#d7c8ab"/><text x="278" y="59" textAnchor="middle" fontSize="11" fill="#29423c">Bàn</text></>}
      <path d="M175 190h35" stroke="#f4eee0" strokeWidth="7"/><path d="M176 190v-30a30 30 0 0 1 30 30" fill="none" stroke="#667367" strokeWidth="1.5"/>
    </svg><span className="visual-caption">Sơ đồ tiện nghi minh họa · không theo tỷ lệ</span>
  </div>;
}

export function PropertyFacts({property}) {
  return <section className="property-facts"><h3>Thông tin {property.name}</h3><dl><div><dt>Địa điểm</dt><dd>{property.city}<br/>{property.address||property.addressStatus}</dd></div><div><dt>Đỗ xe / đi biển</dt><dd>{property.parking}<br/>{property.beachDistance}</dd></div><div><dt>Nhận chìa khóa</dt><dd>{property.checkInMethod}</dd></div><div><dt>Liên hệ</dt><dd>{property.phone||'Số điện thoại chưa được công bố'}<br/>{property.email||'Email hỗ trợ chưa được cấu hình'}</dd></div></dl><p className="room-detail-note">Đây là cơ sở mô phỏng, chưa mở bán thực tế. Chưa cung cấp chỉ đường khi địa chỉ chưa được xác nhận.</p></section>;
}

export function StayPolicies({property}) {
  const p=property.policy;
  return <section className="stay-policies"><h3>Điều kiện lưu trú <small>· bản mô phỏng</small></h3><dl><div><dt>Nhận / trả phòng</dt><dd>{p.checkIn} / {p.checkOut} · giờ Việt Nam</dd></div><div><dt>Vệ sinh / đặt cọc</dt><dd>{money(p.cleaningFee)} / {money(p.deposit)}</dd></div><div><dt>Thuế và số khách</dt><dd>Giá demo đã gồm thuế/phí. {p.capacity}</dd></div><div><dt>Hủy đặt phòng</dt><dd>{p.cancellation}</dd></div></dl><p>{p.payment}</p></section>;
}
