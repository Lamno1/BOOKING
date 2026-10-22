import React,{useEffect,useId,useState} from 'react';
import {api,createReview} from '../../shared/api';
import {StarIcon} from '../../shared/icons';
import {ratingBreakdown,sortReviews,reviewSorts} from './reviews-domain';

const ratingWords=['','Chưa hài lòng','Cần cải thiện','Ổn','Tốt','Rất tốt'];
const monthText=month=>{const [y,m]=month.split('-');return `Tháng ${Number(m)}/${y}`;};
const PAGE=4;
const decimal=value=>value.toLocaleString('vi-VN',{minimumFractionDigits:1,maximumFractionDigits:1});

export function Stars({value,size=16}){return <span className="stars" aria-hidden="true">{[1,2,3,4,5].map(n=><StarIcon key={n} size={size} filled={n<=Math.round(value)}/>)}</span>;}

/** Compact badge for result cards; renders nothing when a room has no real reviews yet. */
export function RatingBadge({summary}){
 if(!summary?.count)return null;
 return <p className="rating-badge"><StarIcon size={15} filled/><b>{decimal(summary.average)}</b><span>({summary.count} đánh giá)</span></p>;
}

export function useReviewSummary(){
 const [summary,setSummary]=useState({});
 useEffect(()=>{const controller=new AbortController();api('reviews/summary',{signal:controller.signal}).then(v=>{if(!controller.signal.aborted)setSummary(v);}).catch(()=>{});return ()=>controller.abort();},[]);
 return summary;
}

export function RoomReviews({roomId}){
 const [state,setState]=useState({status:'loading'}),[sort,setSort]=useState('recent'),[stars,setStars]=useState(0),[shown,setShown]=useState(PAGE);
 useEffect(()=>{const controller=new AbortController();setState({status:'loading'});setSort('recent');setStars(0);setShown(PAGE);
  api(`rooms/${encodeURIComponent(roomId)}/reviews`,{signal:controller.signal}).then(v=>{if(!controller.signal.aborted)setState({status:'ready',...v});}).catch(e=>{if(!controller.signal.aborted)setState({status:'error',message:e.message});});
  return ()=>controller.abort();},[roomId]);
 const list=state.status==='ready'?sortReviews(state.reviews,sort,stars):[];
 const pickStars=n=>{setStars(v=>v===n?0:n);setShown(PAGE);};
 return <section className="room-reviews" aria-label="Đánh giá của khách">
  <h3>Đánh giá của khách</h3>
  {state.status==='loading'&&<p className="reviews-muted">Đang tải đánh giá…</p>}
  {state.status==='error'&&<p className="reviews-muted" role="alert">Chưa tải được đánh giá: {state.message}</p>}
  {state.status==='ready'&&(state.count?<>
   <div className="reviews-overview">
    <p className="reviews-score"><b>{decimal(state.average)}</b><Stars value={state.average} size={18}/><span>{state.count} đánh giá từ khách đã trả phòng</span></p>
    <ul className="reviews-bars" aria-label="Lọc theo số sao">{ratingBreakdown(state.reviews).map(row=><li key={row.stars}><button type="button" aria-pressed={stars===row.stars} disabled={!row.count} onClick={()=>pickStars(row.stars)}><span>{row.stars} sao</span><i aria-hidden="true"><b style={{width:`${Math.round(row.share*100)}%`}}/></i><span>{row.count}</span></button></li>)}</ul>
   </div>
   {state.count>1&&<div className="reviews-tools"><label>Sắp xếp<select value={sort} onChange={e=>setSort(e.target.value)}>{Object.entries(reviewSorts).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>{stars>0&&<button type="button" onClick={()=>pickStars(stars)}>Bỏ lọc {stars} sao</button>}<span role="status">{stars?`${list.length} đánh giá ${stars} sao`:''}</span></div>}
   <ul className="reviews-list">{list.slice(0,shown).map(r=><li key={r.id}><div><Stars value={r.rating}/><strong>{ratingWords[r.rating]}</strong></div>{r.comment&&<p>{r.comment}</p>}<small>{r.author} · ở {monthText(r.stayMonth)}</small>{r.reply&&<blockquote className="review-reply"><b>Phản hồi từ STAYOS</b>{r.reply.text}</blockquote>}</li>)}</ul>
   {list.length>shown&&<button type="button" className="reviews-more" onClick={()=>setShown(n=>n+PAGE)}>Xem thêm {Math.min(PAGE,list.length-shown)} đánh giá</button>}</>
   :<p className="reviews-muted">Chưa có đánh giá. Chỉ khách đã ở và trả phòng mới đánh giá được, nên mục này để trống thay vì hiển thị số liệu mẫu.</p>)}
 </section>;
}

/** After checkout: rate the stay once. Shows the saved review (and moderation state) afterwards. */
export function ReviewPrompt({booking,reviews=[],onSaved}){
 const existing=reviews.find(r=>r.bookingId===booking.id);
 const [rating,setRating]=useState(0),[comment,setComment]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const name=useId();
 if(booking.status!=='CHECKED_OUT')return null;
 if(existing)return <section className="review-prompt is-done"><h2>Cảm ơn bạn đã đánh giá</h2><p><Stars value={existing.rating}/> {ratingWords[existing.rating]}{existing.comment?` · “${existing.comment}”`:''}</p><p className="reviews-muted">{existing.status==='HIDDEN'?'Đánh giá đang được ẩn sau khi nhân viên kiểm tra.':'Đánh giá đang hiển thị trên trang phòng với tên '+existing.author+'.'}</p></section>;
 async function submit(event){event.preventDefault();if(busy)return;if(!rating)return setError('Chọn số sao trước khi gửi.');setBusy(true);setError('');
  try{await createReview({bookingId:booking.id,rating,comment:comment.trim()});await onSaved();}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <form className="review-prompt" onSubmit={submit}><h2>Kỳ nghỉ tại {booking.roomName} thế nào?</h2><p className="reviews-muted">Đánh giá hiển thị công khai với tên gọi đầu tiên của bạn và tháng lưu trú. Mỗi kỳ nghỉ đánh giá một lần.</p>
  <fieldset className="star-input"><legend>Chấm điểm</legend>{[1,2,3,4,5].map(n=><label key={n} className={n<=rating?'is-on':''}><input type="radio" name={name} value={n} checked={rating===n} onChange={()=>setRating(n)}/><StarIcon size={30} filled={n<=rating}/><span className="sr-only">{n} sao · {ratingWords[n]}</span></label>)}<span className="star-word" aria-hidden="true">{ratingWords[rating]}</span></fieldset>
  <label>Nhận xét (không bắt buộc)<textarea rows={3} maxLength={1000} value={comment} onChange={e=>setComment(e.target.value)} placeholder="Điều bạn thích hoặc điều cơ sở nên cải thiện…"/></label>
  {error&&<p className="form-error" role="alert">{error}</p>}<button className="gold-button" disabled={busy}>{busy?'Đang gửi…':'Gửi đánh giá'}</button></form>;
}
