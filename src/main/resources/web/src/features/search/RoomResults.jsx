import React,{useEffect,useState} from 'react';
import {api} from '../../shared/api';
import {money,properties,propertyById} from '../../shared/catalog';
import {dateAfter,formatStayDate} from '../../shared/booking-domain';
import {Photo,hasConcept} from './room-media';
import {filterRooms,sortRooms,sortOptions,defaultFilters,activeFilterCount,priceSteps,nextFreeRange,nightsBetween} from './search-domain';
import {HeartIcon,CheckIcon,UsersIcon,AreaIcon,CalendarIcon} from '../../shared/icons';
import {RatingBadge} from '../reviews/Reviews';

const shortDate=date=>formatStayDate(date).slice(0,5);

/** Unavailable rooms offer the nearest stay of the same length instead of a dead end. */
function NearestDates({room,arrival,nights,onDates}){
 const [state,setState]=useState({status:'idle'});
 async function find(){
  setState({status:'loading'});
  try{
   const from=arrival>=dateAfter(0)?arrival:dateAfter(0),value=await api(`rooms/${encodeURIComponent(room.id)}/calendar?from=${from}&days=90`);
   setState({status:'done',range:value.open?nextFreeRange(value.bookedNights,from,Math.max(1,nights),90):null,closed:!value.open});
  }catch(error){setState({status:'error',message:error.message});}
 }
 if(room.availabilityReason==='CLOSED')return <p className="result-status is-closed">Tạm ngưng nhận khách</p>;
 if(state.status==='done')return state.range?<div className="result-nearest"><p>Trống gần nhất: <b>{shortDate(state.range.arrival)} → {shortDate(state.range.departure)}</b> · {nights} đêm</p><button type="button" onClick={()=>onDates(state.range.arrival,state.range.departure)}>Chọn ngày này</button></div>:<p className="result-status">Chưa có {nights} đêm liên tiếp trống trong 90 ngày tới.</p>;
 return <div className="result-nearest"><p className="result-status is-full">Đã kín ngày bạn chọn</p><button type="button" disabled={state.status==='loading'} onClick={find}>{state.status==='loading'?'Đang tìm…':'Tìm ngày trống gần nhất'}</button>{state.status==='error'&&<small role="alert">{state.message}</small>}</div>;
}

function ResultCard({room,nights,arrival,departure,saved,onToggleSaved,onOpen,onDates,rating,comparing,onToggleCompare}){
 const property=propertyById(room.propertyId),total=room.price*nights,isSaved=saved.includes(room.id);
 return <article className={`result-card${room.available===false?' is-unavailable':''}`}>
  <div className="result-media"><Photo room={room} onClick={()=>onOpen(room)}/>
   <button type="button" className="result-save" aria-pressed={isSaved} onClick={()=>onToggleSaved(room.id)} aria-label={`${isSaved?'Bỏ lưu':'Lưu'} ${room.name}`}><HeartIcon filled={isSaved}/></button></div>
  <div className="result-body">
   <p className="result-eyebrow">{property.name} · {room.number}</p>
   <h3><button type="button" onClick={()=>onOpen(room)}>{room.name}</button></h3><RatingBadge summary={rating}/>
   <ul className="result-facts"><li><AreaIcon size={16}/>{room.area} m²</li><li><UsersIcon size={16}/>Tối đa {room.capacity}</li><li>{room.beds}</li></ul>
   <p className="result-features">{room.features.slice(0,3).join(' · ')}</p>
   {property.policy?.cancellation?.startsWith('Miễn phí hủy')&&<p className="result-perk"><CheckIcon size={16}/>Hủy miễn phí đến hết ngày đến</p>}
   <div className="result-footer">
    <div className="result-price"><strong>{money(room.price)}<small> / đêm</small></strong>{nights>0&&<span>Tổng {nights} đêm: {money(total)}{property.policy?.taxIncluded?' · đã gồm thuế':''}</span>}</div>
    {room.available===true&&<p className="result-status is-free"><CalendarIcon size={16}/>Trống {shortDate(arrival)} → {shortDate(departure)}</p>}
    {room.available===undefined&&<p className="result-status">Đang kiểm tra ngày trống…</p>}
    {room.available===false&&<NearestDates room={room} arrival={arrival} nights={nights} onDates={onDates}/>}
    <div className="result-actions"><button type="button" className="result-compare" aria-pressed={comparing} onClick={()=>onToggleCompare(room.id)}>{comparing&&<CheckIcon size={15}/>}So sánh<span className="sr-only"> {room.name}</span></button><button type="button" className="result-open" onClick={()=>onOpen(room)}>Xem phòng</button></div>
   </div>
  </div>
 </article>;
}

export function RoomResults({rooms,guests,arrival,departure,propertyId,onProperty,onOpen,onDates,saved,onToggleSaved,recent,availabilityError,onRetry,savedRequest=0,reviewSummary={},onEditSearch=()=>{},compare=[],onToggleCompare=()=>{},compareNote=''}){
 const [filters,setFilters]=useState(()=>({...defaultFilters(),savedOnly:savedRequest>0})),[sort,setSort]=useState('recommended');
 useEffect(()=>{if(savedRequest)setFilters(f=>({...f,savedOnly:true}));},[savedRequest]);
 const nights=Math.max(0,nightsBetween(arrival,departure)||0);
 const active={...filters,propertyId};
 const list=sortRooms(filterRooms(rooms,active,{guests,saved}),sort,guests,rooms.filter(hasConcept).map(r=>r.id));
 const set=(key,value)=>setFilters(f=>({...f,[key]:value}));
 const reset=()=>{setFilters(defaultFilters());onProperty('all');};
 const recentRooms=recent.map(id=>rooms.find(r=>r.id===id)).filter(Boolean);
 return <section className="journey-rooms results" id="rooms" aria-labelledby="results-title">
  <div className="results-head"><div><p className="journey-eyebrow">CHỌN KHÔNG GIAN / RỒI CHỌN CÁCH Ở</p><h2 id="results-title">{propertyId==='all'?'Nơi dành cho kỳ nghỉ của bạn.':propertyById(propertyId).name}</h2></div>
   <label className="results-sort">Sắp xếp<select value={sort} onChange={e=>setSort(e.target.value)}>{Object.entries(sortOptions).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label></div>
  <div className="results-filters" role="group" aria-label="Bộ lọc phòng">
   <button type="button" className="results-trip" onClick={onEditSearch}><CalendarIcon size={16}/>{shortDate(arrival)} → {shortDate(departure)} · {guests} khách<span>Sửa</span></button>
   <div className="segmented" role="group" aria-label="Cơ sở">{[{id:'all',name:'Cả hai'},...properties].map(p=><button type="button" key={p.id} aria-pressed={propertyId===p.id} onClick={()=>onProperty(p.id)}>{p.id==='all'?p.name:p.name.replace('STAYOS ','')}</button>)}</div>
   <button type="button" className="chip" aria-pressed={filters.kitchen} onClick={()=>set('kitchen',!filters.kitchen)}>Có bếp</button>
   <button type="button" className="chip" aria-pressed={filters.availableOnly} onClick={()=>set('availableOnly',!filters.availableOnly)}>Chỉ phòng còn trống</button>
   <button type="button" className="chip" aria-pressed={filters.savedOnly} onClick={()=>set('savedOnly',!filters.savedOnly)}><HeartIcon size={15} filled={filters.savedOnly}/>Đã lưu{saved.length?` (${saved.length})`:''}</button>
   <label className="chip-select">Giá mỗi đêm<select value={filters.maxPrice} onChange={e=>set('maxPrice',Number(e.target.value))}><option value={0}>Mọi mức giá</option>{priceSteps(rooms).slice(0,-1).map(p=><option key={p} value={p}>Đến {money(p)}</option>)}</select></label>
   <label className="results-search"><span className="sr-only">Tìm phòng</span><input type="search" value={filters.search} onChange={e=>set('search',e.target.value)} placeholder="Mã phòng, loại phòng…"/></label>
  </div>
  <div className="results-summary"><p role="status">{list.length} phòng phù hợp · {nights} đêm · {guests} khách{activeFilterCount(active)?` · ${activeFilterCount(active)} bộ lọc`:''}</p>{activeFilterCount(active)>0&&<button type="button" onClick={reset}>Xóa bộ lọc</button>}</div>
  {compareNote&&<p className="results-alert" role="status">{compareNote}</p>}
  {availabilityError&&<p role="alert" className="results-alert">{availabilityError} <button type="button" onClick={onRetry}>Thử lại</button></p>}
  {recentRooms.length>0&&<div className="results-recent"><span>Xem gần đây</span>{recentRooms.map(r=><button type="button" key={r.id} onClick={()=>onOpen(r)}>{r.number} · {r.typeName}</button>)}</div>}
  {list.length?<div className="result-grid">{list.map(room=><ResultCard key={room.id} room={room} nights={nights} arrival={arrival} departure={departure} saved={saved} onToggleSaved={onToggleSaved} onOpen={onOpen} onDates={onDates} rating={reviewSummary[room.id]} comparing={compare.includes(room.id)} onToggleCompare={onToggleCompare}/>)}</div>
   :<div className="results-empty"><h3>Chưa có phòng khớp lựa chọn.</h3><p>{filters.savedOnly&&!saved.length?'Bạn chưa lưu phòng nào. Bấm biểu tượng trái tim trên ảnh phòng để lưu.':`Thử bỏ bớt bộ lọc, chọn cơ sở khác hoặc giảm số khách (hiện ${guests}).`}</p><button type="button" onClick={reset}>Xóa bộ lọc</button></div>}
 </section>;
}
