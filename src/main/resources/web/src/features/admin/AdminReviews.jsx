import React,{useState} from 'react';
import {moderateReview,replyReview} from '../../shared/api';

const stars=n=>'★'.repeat(n)+'☆'.repeat(5-n);
/** Staff can hide a review that breaks the rules (with a reason) or show it again; reviews are never edited or deleted. */
export function AdminReviews({reviews,onRefresh}){
 const [replies,setReplies]=useState({}),[filter,setFilter]=useState('all'),[reason,setReason]=useState({}),[busy,setBusy]=useState(''),[error,setError]=useState('');
 const list=[...reviews].reverse().filter(r=>filter==='all'||r.status===filter||(filter==='low'&&r.rating<=2));
 const average=reviews.filter(r=>r.status==='VISIBLE').reduce((sum,r,_,all)=>sum+r.rating/all.length,0);
 async function act(review,status){
  const text=(reason[review.id]||'').trim();if(!text){setError(`Nhập lý do trước khi ${status==='HIDDEN'?'ẩn':'hiện lại'} ${review.id}.`);return;}
  setBusy(review.id);setError('');try{await moderateReview(review.id,{status,reason:text});await onRefresh();}catch(e){setError(e.message);}finally{setBusy('');}
 }
 async function reply(review){const text=(replies[review.id]??review.reply?.text??'').trim();if(!text){setError(`Nhập nội dung phản hồi cho ${review.id}.`);return;}setBusy(review.id);setError('');try{await replyReview(review.id,text);await onRefresh();}catch(e){setError(e.message);}finally{setBusy('');}}
 return <section className="ops-panel">
  <div className="ops-panel-title"><h2>Đánh giá của khách <small>{reviews.length}</small></h2><label>Lọc<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Tất cả</option><option value="VISIBLE">Đang hiển thị</option><option value="HIDDEN">Đã ẩn</option><option value="low">1–2 sao (cần phản hồi)</option></select></label></div>
  <p className="ops-help">Điểm trung bình đang hiển thị: {reviews.some(r=>r.status==='VISIBLE')?average.toFixed(1):'chưa có'}. Chỉ khách đã trả phòng mới gửi được. Ẩn khi có thông tin cá nhân, xúc phạm hoặc không liên quan; không ẩn vì điểm thấp.</p>
  {error&&<p className="ops-error" role="alert">{error}</p>}
  <div className="ops-table-wrap"><table><thead><tr><th>Đánh giá</th><th>Phòng / đơn</th><th>Nội dung</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{list.map(r=><tr key={r.id}>
   <td><strong aria-label={`${r.rating} sao`}>{stars(r.rating)}</strong><small>{r.id} · {r.author}</small></td>
   <td>{r.roomName}<small>{r.bookingId} · ở {r.stayMonth}</small></td>
   <td>{r.comment||<small>Không có nhận xét</small>}{r.moderationReason&&<small>Lý do: {r.moderationReason}</small>}<label className="review-reply-field">Phản hồi công khai<textarea rows={2} maxLength={600} value={replies[r.id]??r.reply?.text??''} onChange={e=>setReplies(x=>({...x,[r.id]:e.target.value}))}/></label><button disabled={busy===r.id} onClick={()=>reply(r)}>{r.reply?'Cập nhật phản hồi':'Gửi phản hồi'}</button></td>
   <td><span className={`ops-badge status-${r.status==='VISIBLE'?'OPEN':'CANCELLED'}`}>{r.status==='VISIBLE'?'Đang hiển thị':'Đã ẩn'}</span></td>
   <td><label className="sr-only" htmlFor={`reason-${r.id}`}>Lý do cho {r.id}</label><input id={`reason-${r.id}`} value={reason[r.id]||''} maxLength={240} placeholder="Lý do" onChange={e=>setReason(x=>({...x,[r.id]:e.target.value}))}/>
    <button disabled={busy===r.id} onClick={()=>act(r,r.status==='VISIBLE'?'HIDDEN':'VISIBLE')}>{r.status==='VISIBLE'?'Ẩn':'Hiện lại'}</button></td>
  </tr>)}</tbody></table></div>
  {!list.length&&<p className="ops-empty">Chưa có đánh giá phù hợp bộ lọc.</p>}
 </section>;
}
