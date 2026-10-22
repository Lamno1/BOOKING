import {mountRoomContent} from './b-room-content.js';
import {readReviewDraft,saveReviewDraft,defaultReviewDraft,loadReviewData,reviewQuote,breakfastDates,displayDate} from './review-draft.js';

export const motionTokens={fast:160,normal:280,distance:8,easing:'cubic-bezier(.22,1,.36,1)'};
const icons={area:'M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6',guests:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m18 0v-2a4 4 0 0 0-3-3.87M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m8-7a4 4 0 0 1 0 8',bed:'M3 18v3m18-3v3M3 12h18v6H3zM5 12V5h14v7M7 8h4v4H7m6-4h4v4h-4',wifi:'M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8 16a6 6 0 0 1 8 0m-4 4h.01',kitchen:'M4 3v7m4-7v7M2 6h8m-4 4v11M19 3c-5 5-5 9 0 9V3m0 9v9',bath:'M3 12h18v3a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-3m2 8v2m14-2v2M6 12V5a3 3 0 0 1 6 0',living:'M4 10V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3M4 10a2 2 0 0 0-2 2v7h20v-7a2 2 0 0 0-4 0v3H6v-3a2 2 0 0 0-2-2m0 9v2m16-2v2',air:'M3 7h13a3 3 0 1 0-3-3M3 12h17M3 17h11a3 3 0 1 1-3 3'};
const icon=name=>`<svg class="stay-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[name]}"></path></svg>`;
const money=n=>new Intl.NumberFormat('vi-VN').format(n)+'₫';
export async function enhance(){
 mountRoomContent();
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 const animations=new Set();
 const preference=document.createElement('label');preference.className='motion-preference';preference.innerHTML='<input type="checkbox"> Giảm chuyển động';
 document.querySelector('nav[aria-label="Phương án mỹ thuật"]').after(preference);
 const motionInput=preference.querySelector('input');
 const reduceMotion=()=>reduced.matches||motionInput.checked;
 function syncMotion(){document.documentElement.dataset.motion=reduceMotion()?'reduced':'standard';if(reduceMotion()){animations.forEach(a=>a.cancel());animations.clear();}}
 motionInput.addEventListener('change',syncMotion);reduced.addEventListener('change',syncMotion);syncMotion();
 function animate(el,frames,duration=motionTokens.fast){
  if(reduceMotion()||!el?.animate)return;
  const a=el.animate(frames,{duration,easing:motionTokens.easing});animations.add(a);a.finished.catch(()=>{}).finally(()=>animations.delete(a));
 }
 for(const [i,name] of ['area','guests','bed'].entries())document.querySelectorAll('.room-facts>span')[i].insertAdjacentHTML('afterbegin',icon(name));
 const amenities=[['kitchen','Bếp nhỏ'],['living','Khu sinh hoạt'],['bath','Phòng tắm riêng'],['air','Điều hòa'],['wifi','Wi-Fi']];
 document.querySelector('.amenities p').innerHTML=amenities.map(([name,label])=>`<span>${icon(name)}${label}</span>`).join('');

 // Content remains visible if animation or observation is unavailable.
 [document.querySelector('.hero-media'),document.querySelector('.hero-copy h1'),document.querySelector('.hero-copy .text-link')].forEach((el,i)=>animate(el,[{opacity:.7,transform:`translateY(${motionTokens.distance}px)`},{opacity:1,transform:'none'}],motionTokens.normal+i*40));
 if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){animate(e.target,[{opacity:.75,transform:`translateY(${motionTokens.distance}px)`},{opacity:1,transform:'none'}],motionTokens.normal);observer.unobserve(e.target);}}),{threshold:.12});document.querySelectorAll('.section-heading,.gallery-grid figure').forEach(e=>observer.observe(e));}

 const labels=['Không gian chung','Bếp & bàn ăn','Phòng tắm riêng','Giường & cửa sổ'];
 const dialog=document.createElement('dialog');dialog.className='room-dialog';dialog.setAttribute('aria-labelledby','gallery-title');
 dialog.innerHTML=`<div class="dialog-top"><div><p class="micro">STUDIO R-101 · CONCEPT AI</p><h2 id="gallery-title">Khám phá căn phòng</h2></div><button type="button" class="dialog-close" aria-label="Đóng gallery">Đóng ×</button></div><div class="gallery-stage" tabindex="0" aria-label="Ảnh phòng; dùng mũi tên trái phải hoặc vuốt để chuyển"><img class="viewer-image" alt="" width="724" height="543"><div class="gallery-message" role="status"></div></div><div class="viewer-controls"><button type="button" data-step="-1" aria-label="Ảnh trước">←</button><span class="viewer-caption" aria-live="polite"></span><button type="button" data-step="1" aria-label="Ảnh tiếp">→</button><button type="button" class="zoom" aria-pressed="false">Phóng to +</button></div><div class="viewer-thumbs" aria-label="Chọn ảnh"></div><p class="viewer-note">Ảnh minh họa AI · không phải ảnh thực tế. Phóng to để xem chi tiết; kéo khi phóng to.</p>`;
 document.body.append(dialog);
 const stage=dialog.querySelector('.gallery-stage'),view=dialog.querySelector('.viewer-image'),message=dialog.querySelector('.gallery-message'),zoomButton=dialog.querySelector('.zoom');
 let index=0,request=0,zoom=false,origin=null,drag=null,pan={x:0,y:0},oldOverflow='';
 function setZoom(value){zoom=value;pan={x:0,y:0};view.style.transform='';stage.classList.toggle('zoomed',zoom);zoomButton.setAttribute('aria-pressed',String(zoom));zoomButton.textContent=zoom?'Thu nhỏ −':'Phóng to +';if(zoom)view.style.transform='scale(1.8)';}
 async function show(i){
  const ticket=++request;index=(i+4)%4;setZoom(false);stage.setAttribute('aria-busy','true');message.textContent='Đang tải ảnh…';
  dialog.querySelector('.viewer-caption').textContent=`${index+1} / 4 · ${labels[index]}`;
  dialog.querySelectorAll('[data-thumb]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.thumb)===index)));
  const image=new Image();image.src=`./media/studio-${index}-large.webp`;
  try{await image.decode();if(ticket!==request||!dialog.open)return;
   const previous=view.cloneNode();previous.className='viewer-image previous';previous.removeAttribute('id');previous.setAttribute('aria-hidden','true');
   if(view.hasAttribute('src'))stage.append(previous);
   view.src=image.src;view.alt=`Concept AI Studio R-101 — ${labels[index]}`;view.style.opacity='1';message.textContent='';
   if(previous.parentNode){animate(previous,[{opacity:1},{opacity:0}]);if(reduceMotion())previous.remove();else setTimeout(()=>previous.remove(),motionTokens.fast);}
  }catch{if(ticket===request&&dialog.open){message.innerHTML=`<span>Không tải được ảnh. ${view.hasAttribute('src')?'Ảnh trước được giữ lại.':'Chọn ảnh khác hoặc thử lại.'}</span><button type="button">Thử lại</button>`;message.querySelector('button').onclick=()=>show(index);}}
  finally{if(ticket===request)stage.setAttribute('aria-busy','false');}
 }
 function open(i,button){origin=button;oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.showModal();if(!dialog.querySelector('[data-thumb]'))dialog.querySelector('.viewer-thumbs').innerHTML=labels.map((label,n)=>`<button type="button" data-thumb="${n}" aria-label="Xem ${label}" aria-pressed="false"><img src="./media/studio-${n}-thumb.webp" alt="" width="160" height="120"></button>`).join('');dialog.querySelectorAll('[data-thumb]').forEach(b=>b.onclick=()=>show(Number(b.dataset.thumb)));show(i);dialog.querySelector('.dialog-close').focus();}
 document.querySelectorAll('[data-photo]').forEach(b=>b.onclick=()=>open(Number(b.dataset.photo),b));
 dialog.querySelector('.dialog-close').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{request++;document.body.style.overflow=oldOverflow;setZoom(false);stage.querySelectorAll('.previous').forEach(e=>e.remove());origin?.focus({preventScroll:true});});
 dialog.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>show(index+Number(b.dataset.step)));
 zoomButton.onclick=()=>setZoom(!zoom);
 dialog.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();show(index+(e.key==='ArrowRight'?1:-1));}});
 stage.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;drag={x:e.clientX,y:e.clientY,px:pan.x,py:pan.y};stage.setPointerCapture(e.pointerId);});
 stage.addEventListener('pointermove',e=>{if(!drag||!zoom)return;const bounds=stage.getBoundingClientRect();pan={x:Math.max(-bounds.width*.35,Math.min(bounds.width*.35,drag.px+e.clientX-drag.x)),y:Math.max(-bounds.height*.35,Math.min(bounds.height*.35,drag.py+e.clientY-drag.y))};view.style.transform=`translate(${pan.x}px,${pan.y}px) scale(1.8)`;});
 stage.addEventListener('pointerup',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!zoom&&Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.4)show(index+(dx<0?1:-1));drag=null;});stage.addEventListener('pointercancel',()=>drag=null);

 // Preserve input selections across review screens; calculate all prices from review data.
 const draftNotice=document.createElement('p');draftNotice.className='draft-notice';draftNotice.setAttribute('role','status');document.querySelector('.package-foot').after(draftNotice);
 const next=document.querySelector('.package-foot .text-link');next.href='./choice.html';next.className='action review-continue';next.textContent='Xem lại lựa chọn →';
 const edit=document.createElement('a');edit.href='./selection.html?flow=b#edit-stay';edit.className='text-link';edit.textContent='Sửa ngày, khách & dịch vụ ↗';document.querySelector('.package-foot').append(edit);
 let draft=defaultReviewDraft(),data,draftLoaded=false,otherSaved=null;
 const go=(event,target)=>{event.preventDefault();try{saveReviewDraft(draft);location.assign(target);}catch{draftNotice.textContent='Không lưu được lựa chọn trong tab. Hãy cho phép dữ liệu phiên của trang này rồi thử lại.';}};
 next.onclick=event=>go(event,next.href);edit.onclick=event=>go(event,edit.href);
 document.querySelector('.packages').setAttribute('aria-busy','true');
 document.querySelector('.stay-price').textContent='Đang tải báo giá…';
 document.querySelector('.quote-detail').hidden=true;
 document.querySelector('.mobile-book>span').textContent='Đang tải lựa chọn…';
 try{
 const saved=readReviewDraft();draftLoaded=true;if(saved?.roomId==='ocean')draft=saved;
 else if(saved){otherSaved=saved;draftNotice.innerHTML='Bạn đang chọn I-103. Trang này giới thiệu concept R-101. Để đổi phòng và giữ dịch vụ, hãy mở phần sửa lựa chọn. <a href="./choice.html">Xem lựa chọn đã lưu ↗</a>';}
 data=await loadReviewData();
 const plans=data.offer.packages;
 const cards=[...document.querySelectorAll('.package')];
 cards.forEach((card,i)=>{card.dataset.plan=plans[i].id;card.insertAdjacentHTML('beforeend',`<button type="button" class="choose-plan" aria-pressed="false">Chọn ${i?'gói ăn sáng':'gói lưu trú'}</button>`);});
 const status=document.createElement('div');status.className='selection-feedback';status.setAttribute('role','status');document.querySelector('.package-grid').after(status);
 function choose(i,feedback=true){
  draft.plan=plans[i].id;
  const {quote:q,room}=reviewQuote(draft,data);
  cards.forEach((card,n)=>{const selected=n===i;card.classList.toggle('is-selected',selected);const b=card.querySelector('button');b.setAttribute('aria-pressed',String(selected));b.textContent=selected?'Đã chọn ✓':`Chọn ${n?'gói ăn sáng':'gói lưu trú'}`;});
  status.innerHTML=`<strong>${feedback?'Đã chọn':'Đang xem'} ${i?'Ở & ăn sáng':'Lưu trú & trà'} · ${money(q.total)}</strong><span>${q.nights} đêm / ${draft.guests} khách · ${i?draft.guests*q.nights+' suất sáng + ':''}${draft.guests} ly trà · không thu tiền trong bản duyệt.</span>`;
  document.querySelector('.mobile-book>span').innerHTML=`<b>${money(q.total)}</b><small>Tổng ${q.nights} đêm · ${i?'có ăn sáng':'lưu trú & trà'}</small>`;
  document.querySelector('.stay-price').innerHTML=`<span class="micro">TỔNG LỰA CHỌN / ${q.nights} ĐÊM</span><strong>${money(q.total)}</strong>`;
  document.querySelector('.stay-dates strong').textContent=`${displayDate(draft.arrival)} — ${displayDate(draft.departure)}`;
  document.querySelector('.stay-dates>span:last-child').textContent=`${q.nights} đêm · ${draft.guests} khách`;
  document.querySelector('.quote-detail .micro').textContent=`${displayDate(draft.arrival)} — ${displayDate(draft.departure)} · ${q.nights} đêm · ${draft.guests} khách`;
  document.querySelector('.quote-lines dt').textContent=`Phòng · ${q.nights} đêm × ${money(room.price)}`;
  cards.forEach((card,n)=>{card.querySelector('.package-price strong').textContent=money(q.roomTotal+plans[n].perGuestNight*draft.guests*q.nights);card.querySelector('.package-price>span').textContent=`${q.nights} đêm / ${draft.guests} khách`;card.querySelector('ul').innerHTML=n?`<li>${draft.guests*q.nights} suất sáng · ${draft.guests} khách × ${q.nights} buổi</li><li>${draft.guests} ly trà khi nhận phòng</li>`:`<li>${draft.guests} ly trà khi nhận phòng</li><li>Không phụ trội giá phòng</li>`;});
  document.querySelector('[data-quote="room"]').textContent=money(q.roomTotal);
  document.querySelector('[data-quote="supplement"]').textContent=money(q.supplement);
  document.querySelector('[data-quote="total"]').textContent=money(q.total);
  document.querySelector('[data-quote="extras"]').textContent=q.items.length?money(q.items.reduce((sum,item)=>sum+item.total,0)):'Chưa chọn';
  document.querySelector('[data-tea-schedule]').textContent=`${draft.guests} ly trà · mỗi khách 1 ly 250 ml, một lần khi nhận phòng.`;
  const dates=breakfastDates(draft,q.nights);
  document.querySelector('[data-breakfast-schedule]').textContent=`${draft.guests*q.nights} suất sáng · ${draft.guests} suất mỗi sáng, từ ${displayDate(dates[0])} đến ${displayDate(dates.at(-1))}, 07:00–09:30 tại quầy. Mỗi suất gồm bánh mì trứng và nước suối 350 ml; chốt giờ trước 20:00 tối hôm trước.`;
  document.querySelector('[data-breakfast-schedule]').hidden=i!==1;
  document.querySelector('[data-no-breakfast]').hidden=i===1;
  document.querySelector('.quote-detail').hidden=false;
  if(feedback)animate(status,[{opacity:.55,transform:'translateY(4px)'},{opacity:1,transform:'none'}]);
  if(feedback){try{saveReviewDraft(draft);}catch{draftNotice.textContent='Đã đổi gói trên trang nhưng chưa lưu được vào phiên. Hãy cho phép dữ liệu phiên trước khi bấm tiếp.';}}
 }
 cards.forEach((card,i)=>card.querySelector('button').onclick=()=>choose(i));choose(plans.findIndex(plan=>plan.id===draft.plan),false);
 if(otherSaved){
  cards.forEach(card=>{card.classList.remove('is-selected');const button=card.querySelector('button');button.disabled=true;button.setAttribute('aria-pressed','false');button.textContent='Đổi phòng ở phần sửa lựa chọn';});
  status.textContent='Hai gói trên là giá mẫu của R-101. Lựa chọn I-103 của bạn vẫn được giữ.';
  document.querySelector('.stay-price .micro').textContent='GIÁ MẪU R-101 / 2 ĐÊM';
  next.textContent='Xem lại I-103 →';next.onclick=event=>{event.preventDefault();location.assign('./choice.html');};edit.textContent='Sửa lựa chọn I-103 ↗';edit.onclick=event=>{event.preventDefault();location.assign(edit.href);};
  const mobileLink=document.querySelector('.mobile-book>a');mobileLink.href='./choice.html';mobileLink.textContent='Xem lại ↗';
  try{const selected=reviewQuote(otherSaved,data);document.querySelector('.mobile-book>span').innerHTML=`<b>${money(selected.quote.total)}</b><small>I-103 · ${selected.quote.nights} đêm · ${otherSaved.guests} khách</small>`;}catch{document.querySelector('.mobile-book>span').textContent='Kiểm tra lựa chọn I-103';}
 }
 }catch(error){draftNotice.textContent=error.message+' Mở phần sửa lựa chọn để kiểm tra.';document.querySelector('.stay-price').textContent='Chưa có báo giá hợp lệ';document.querySelector('.mobile-book>span').textContent='Kiểm tra lựa chọn';document.querySelectorAll('.choose-plan').forEach(button=>button.disabled=true);document.querySelectorAll('.package-price strong').forEach(price=>price.textContent='Chưa có giá');document.querySelectorAll('.package-price>span').forEach(label=>label.textContent='Cần kiểm tra lựa chọn');next.href=edit.href;if(!draftLoaded){next.href='./choice.html';next.onclick=event=>{event.preventDefault();location.assign('./choice.html');};edit.onclick=next.onclick;}}
 finally{document.querySelector('.packages').setAttribute('aria-busy','false');}
}
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
