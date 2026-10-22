import {quoteOffer,serviceProblems,addDays} from './offer-domain.js';
export const REVIEW_DRAFT_KEY='stayos.review.choice.v1';
export const defaultReviewDraft=()=>({roomId:'ocean',guests:2,arrival:'2026-11-14',departure:'2026-11-16',plan:'welcome',quantities:{},schedules:{},photo:0});
const serviceIds=['dining','transfer','spa','tour'];
// Store selection inputs only. Prices, totals, floor and room metadata are never trusted from storage.
export function cleanReviewDraft(value){
 if(!value||!['ocean','tidal'].includes(value.roomId)||!['welcome','breakfast'].includes(value.plan)||!Number.isInteger(value.guests)||value.guests<1||value.guests>20)throw Error('Lựa chọn đã lưu không hợp lệ.');
 const date=v=>{if(typeof v!=='string'||(v!==''&&!/^\d{4}-\d{2}-\d{2}$/.test(v)))throw Error('Ngày trong lựa chọn đã lưu không hợp lệ.');return v;};
 const draft={roomId:value.roomId,plan:value.plan,guests:value.guests,arrival:date(value.arrival),departure:date(value.departure),quantities:{},schedules:{},photo:Number.isInteger(value.photo)&&value.photo>=0&&value.photo<4?value.photo:0};
 for(const id of serviceIds){const n=value.quantities?.[id]??0;if(!Number.isInteger(n)||n<0||n>6)throw Error('Số lượng dịch vụ đã lưu không hợp lệ.');draft.quantities[id]=n;
  const s=value.schedules?.[id];if(s){if(typeof s.time!=='string'||(s.time!==''&&!/^\d{2}:\d{2}$/.test(s.time))||typeof(s.flight??'')!=='string'||(s.flight??'').length>8)throw Error('Lịch dịch vụ đã lưu không hợp lệ.');draft.schedules[id]={date:date(s.date),time:s.time,flight:s.flight??''};}
 }
 return draft;
}
export function readReviewDraft(storage=window.sessionStorage){const raw=storage.getItem(REVIEW_DRAFT_KEY);if(!raw)return null;const envelope=JSON.parse(raw);if(envelope.version!==1)throw Error('Phiên bản lựa chọn đã lưu chưa được hỗ trợ.');return cleanReviewDraft(envelope.draft);}
export function saveReviewDraft(value,storage=window.sessionStorage){const draft=cleanReviewDraft(value);storage.setItem(REVIEW_DRAFT_KEY,JSON.stringify({version:1,draft}));return draft;}
export function clearReviewDraft(storage=window.sessionStorage){storage.removeItem(REVIEW_DRAFT_KEY);}
export async function loadReviewData(){const [catalog,offer]=await Promise.all(['catalog.json','offer-v2.json'].map(async file=>{const response=await fetch(new URL(file,import.meta.url));if(!response.ok)throw Error('Không tải được dữ liệu phòng và gói.');return response.json();}));return {catalog,offer};}
export function reviewQuote(draft,{catalog,offer},now=new Date()){
 const room=catalog.rooms.find(r=>r.id===draft.roomId),plan=offer.packages.find(p=>p.id===draft.plan);
 if(!room||!plan)throw Error('Phòng hoặc gói đã chọn không còn trong danh mục duyệt.');
 const quote=quoteOffer({...draft,room,plan,addons:offer.addons,now});
 return {room,plan,property:catalog.properties.find(p=>p.id===room.propertyId),quote,errors:serviceProblems({...draft,addons:offer.addons,now})};
}
export function breakfastDates(draft,nights){return Array.from({length:nights},(_,i)=>addDays(draft.arrival,i+1));}
export const displayDate=date=>date?date.split('-').reverse().join('/'):'Chưa chọn';
export const money=value=>new Intl.NumberFormat('vi-VN').format(value)+'₫';
export const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
