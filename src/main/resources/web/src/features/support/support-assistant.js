// Automatic assistant for the support chat. It answers only from data the system already holds
// (catalog, policy snapshot, the guest's own bookings) and hands everything else to staff.
// It never confirms a service, price change or exception: those stay with a person.
import {formatStayDate} from '../../shared/booking-domain.js';
import {cancellationWindow,vietnamDate} from '../trips/trip-domain.js';

const fold=text=>String(text??'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
const vnd=n=>new Intl.NumberFormat('vi-VN').format(n)+' đ';
const range=(list,key)=>{const v=list.map(x=>x[key]);return [Math.min(...v),Math.max(...v)];};
const activeStatuses=['CONFIRMED','CHECKED_IN'];

export const assistantSuggestions=['Giờ nhận phòng?','Chính sách hủy','Giá phòng','Phòng cho 4 người','Đơn của tôi','Gặp nhân viên'];

const staff=(kind='OTHER',label='Gửi cho nhân viên')=>({type:'staff',kind,label});
const go=(to,label)=>({type:'navigate',to,label});

// Each intent: keywords (accent-folded, matched as whole words or phrases) and a reply builder.
const intents=[
 {id:'human',words:['nhan vien','nguoi that','gap nguoi','lien he','hotline','so dien thoai','sdt','goi dien','tong dai','le tan'],weight:2,reply:ctx=>{
  const phones=ctx.properties.filter(p=>p.phone);
  return {text:phones.length?`Bạn có thể gọi ${phones.map(p=>`${p.name}: ${p.phone}`).join(' · ')}, hoặc nhắn nhân viên ngay trong khung chat này.`
   :'Hiện chưa có số điện thoại đã xác minh cho các cơ sở. Bạn nhắn nhân viên ngay trong khung chat này; tin được lưu theo tài khoản và nhân viên trả lời tại đây.',actions:[staff()]};
 }},
 {id:'cancel',words:['huy','hoan tien','refund','cancel','bo dat'],reply:ctx=>{
  const policy=ctx.properties[0]?.policy;
  const lines=ctx.bookings.filter(b=>b.status==='CONFIRMED').map(b=>{const w=cancellationWindow(b,ctx.now);
   return w.state==='open'?`• ${b.id} (${b.roomName}): ${w.free?'hủy miễn phí':'hủy trực tuyến'} đến ${w.deadline}.`:`• ${b.id} (${b.roomName}): đã qua hạn hủy trực tuyến, cần nhân viên hỗ trợ.`;});
  return {text:[policy?.cancellation||'Chính sách hủy được ghi trên từng đơn.',...(lines.length?['Đơn của bạn:',...lines]:[]),'Hủy trong mục Kỳ nghỉ của tôi; hệ thống không tự thu phí hủy.'].join('\n'),
   actions:[...(ctx.bookings.some(b=>b.status==='CONFIRMED')?[go('stay','Mở Kỳ nghỉ của tôi')]:[]),staff()]};
 }},
 {id:'change',words:['doi ngay','doi lich','gia han','o them','doi phong','lui ngay','doi sang'],reply:ctx=>({
  text:'Bạn gửi yêu cầu đổi ngày trong mục Kỳ nghỉ của tôi → "Bạn muốn đổi ngày ở?". Hệ thống báo trước giá mới và chênh lệch; đơn cũ giữ nguyên cho đến khi nhân viên duyệt.',
  actions:[...(ctx.bookings.some(b=>activeStatuses.includes(b.status))?[go('stay','Mở Kỳ nghỉ của tôi')]:[]),staff()]})},
 {id:'early',words:['nhan phong som','check in som','den som','tra phong muon','check out muon','late checkout','early check'],weight:2,reply:ctx=>({
  text:`Giờ chuẩn là nhận phòng từ ${ctx.properties[0]?.policy?.checkIn||'14:00'} và trả phòng trước ${ctx.properties[0]?.policy?.checkOut||'12:00'}. Nhận sớm hoặc trả muộn tùy tình trạng phòng hôm đó nên cần nhân viên xác nhận; trợ lý không thể hứa trước.`,
  actions:[staff('CHECKIN','Hỏi nhân viên về giờ nhận/trả')]})},
 {id:'times',words:['nhan phong','tra phong','check in','checkin','check out','checkout','gio nhan','gio tra'],reply:ctx=>{
  const p=ctx.properties[0]?.policy||{};
  const next=ctx.bookings.filter(b=>activeStatuses.includes(b.status)).sort((a,b)=>a.arrival.localeCompare(b.arrival))[0];
  return {text:`Nhận phòng từ ${p.checkIn||'14:00'}, trả phòng trước ${p.checkOut||'12:00'} (giờ Việt Nam, áp dụng cho cả hai cơ sở).`
   +(next?`\nĐơn ${next.id} của bạn: nhận phòng ${formatStayDate(next.arrival)}, trả phòng ${formatStayDate(next.departure)}.`:'')
   +`\nCách nhận phòng: ${ctx.properties[0]?.checkInMethod||'tại quầy lễ tân'}.`,actions:[]};
 }},
 {id:'mine',words:['don cua toi','dat phong cua toi','ma dat phong','ma don','booking cua toi','phong toi da dat','trang thai don','kiem tra don','da dat'],weight:2,reply:ctx=>{
  if(!ctx.user)return {text:'Đăng nhập để mình xem các đơn đặt phòng của bạn.',actions:[{type:'login',label:'Đăng nhập'}]};
  const list=[...ctx.bookings].filter(b=>activeStatuses.includes(b.status)).sort((a,b)=>a.arrival.localeCompare(b.arrival));
  if(!list.length)return {text:'Bạn chưa có đơn sắp tới hoặc đang ở. Các đơn đã qua và đã hủy vẫn xem được trong Kỳ nghỉ của tôi.',actions:[go('rooms','Tìm phòng'),go('stay','Kỳ nghỉ của tôi')]};
  return {text:['Đơn sắp tới / đang ở của bạn:',...list.map(b=>`• ${b.id} · ${b.propertyName||''} · ${b.roomName} · ${formatStayDate(b.arrival)} → ${formatStayDate(b.departure)} · ${ctx.statusLabel(b.status)}`)].join('\n'),actions:[go('stay','Mở Kỳ nghỉ của tôi')]};
 }},
 {id:'guests',words:['nguoi','khach','gia dinh','nhom'],test:t=>/\b\d{1,2}\s*(nguoi|khach)\b/.test(t)||/gia dinh|nhom/.test(t),reply:(ctx,t)=>{
  const n=Number(t.match(/\b(\d{1,2})\s*(nguoi|khach)\b/)?.[1]||4);
  const fit=ctx.rooms.filter(r=>r.capacity>=n);
  if(!fit.length){const max=Math.max(...ctx.rooms.map(r=>r.capacity));return {text:`Phòng lớn nhất nhận tối đa ${max} khách. Nhóm ${n} người cần đặt nhiều phòng; ${ctx.properties[0]?.policy?.capacity||''}`,actions:[go('rooms','Xem phòng')]};}
  const byProperty=ctx.properties.map(p=>{const list=fit.filter(r=>r.propertyId===p.id);if(!list.length)return null;const [lo,hi]=range(list,'price');
   return `• ${p.name}: ${[...new Set(list.map(r=>r.typeName))].join(', ')} · ${lo===hi?vnd(lo):`${vnd(lo)}–${vnd(hi)}`}/đêm`;}).filter(Boolean);
  return {text:[`Phòng nhận từ ${n} khách trở lên:`,...byProperty,'Giá theo đêm, đã gồm thuế; còn trống hay không tùy ngày — chọn ngày để xem chính xác.'].join('\n'),actions:[go('rooms','Chọn ngày & xem phòng trống')]};
 }},
 {id:'price',words:['gia','bao nhieu','gia phong','re nhat','bang gia','chi phi','tien phong','loai phong','co phong','con phong','phong trong'],reply:ctx=>{
  const lines=ctx.properties.map(p=>{const list=ctx.rooms.filter(r=>r.propertyId===p.id);if(!list.length)return null;const [lo,hi]=range(list,'price'),[cl,ch]=range(list,'capacity');
   return `• ${p.name} (${p.kind}): ${vnd(lo)}–${vnd(hi)}/đêm · ${cl}–${ch} khách/phòng`;}).filter(Boolean);
  return {text:['Giá niêm yết hiện tại:',...lines,'Đã gồm thuế, không phụ thu khách. Phòng trống thay đổi theo ngày, chọn ngày để xem chính xác.'].join('\n'),actions:[go('rooms','Chọn ngày & xem phòng trống')]};
 }},
 {id:'fees',words:['phu thu','phu phi','gom thue','tinh thue','thue vat','vat','phi don','phi ve sinh','phat sinh','tien coc','dat coc','coc'],reply:ctx=>{const p=ctx.properties[0]?.policy||{};
  return {text:[p.taxIncluded?'Giá đã gồm thuế.':'Giá chưa gồm thuế.',p.cleaningFee?`Phí dọn phòng ${vnd(p.cleaningFee)}.`:'Không có phí dọn phòng.',p.extraGuestFee?`Phụ thu khách ${vnd(p.extraGuestFee)}.`:'Không phụ thu theo số khách trong sức chứa phòng.',p.deposit?`Đặt cọc ${vnd(p.deposit)}.`:'Không cần đặt cọc.'].join(' '),actions:[]};}},
 {id:'payment',words:['thanh toan','tra tien','chuyen khoan','the tin dung','momo','visa','tien mat','hoa don'],reply:ctx=>({
  text:`${ctx.properties[0]?.policy?.payment||'Thanh toán theo hướng dẫn trên đơn.'} Biên nhận từng đơn tải được trong Kỳ nghỉ của tôi.`,actions:[]})},
 {id:'services',words:['dich vu','don san bay','dua don','spa','massage','an toi','bua toi','tour','tham quan'],reply:ctx=>({
  text:['Dịch vụ thêm (đặt theo từng đơn, nhân viên xác nhận lịch):',...ctx.services.map(s=>`• ${s.name}: ${vnd(s.price)}`),'Trợ lý không tự thêm dịch vụ hay tính phí.'].join('\n'),
  actions:[go('experiences','Xem & đặt dịch vụ')]})},
 {id:'address',words:['dia chi','o dau','ban do','duong nao','vi tri','google map','chi duong','toa do'],reply:ctx=>({
  text:ctx.properties.map(p=>`• ${p.name}: ${p.address||p.addressStatus}${p.mapUrl?` · ${p.mapUrl}`:''}`).join('\n')+(ctx.properties.some(p=>!p.address)?'\nNhân viên có thể gửi hướng dẫn đường đi khi bạn hỏi.':''),
  actions:ctx.properties.some(p=>!p.address)?[staff('INQUIRY','Hỏi nhân viên đường đi')]:[]})},
 {id:'parking',words:['do xe','gui xe','bai xe','o to','oto','xe may','cho dau'],reply:ctx=>({
  text:ctx.properties.map(p=>`• ${p.name}: ${p.parking}`).join('\n'),actions:[staff('INQUIRY','Hỏi nhân viên về đỗ xe')]})},
 {id:'beach',words:['bai bien','ra bien','gan bien','xa bien','cach bien','bai tam','view bien'],reply:ctx=>({text:ctx.properties.map(p=>`• ${p.name}: ${p.beachDistance}`).join('\n'),actions:[staff('INQUIRY')]})},
 {id:'wifi',words:['wifi','wi fi','mat khau wifi','internet'],reply:()=>({
  text:'Mật khẩu Wi-Fi không được lưu trong ứng dụng. Nhân viên gửi cho bạn qua cuộc trò chuyện khi bạn đã có đơn đặt.',actions:[staff('WIFI','Xin mật khẩu Wi-Fi')]})},
 {id:'kids',words:['tre em','em be','tre nho','giuong phu','cai noi','noi em be','co be','be trai','be gai','con nho'],reply:ctx=>({
  text:`Trẻ em được tính vào sức chứa của phòng. ${ctx.properties[0]?.policy?.capacity||''} Giường phụ hoặc nôi chưa có trong dữ liệu phòng, nhân viên sẽ xác nhận.`,actions:[staff('INQUIRY','Hỏi về giường phụ / nôi')]})},
 {id:'pets',words:['thu cung','con cho','cho meo','nuoi meo','pet','hut thuoc','thuoc la'],reply:()=>({text:'Quy định về thú cưng và hút thuốc chưa có trong dữ liệu chính sách. Nhân viên sẽ trả lời chính xác.',actions:[staff('INQUIRY')]})},
 {id:'account',words:['quen mat khau','doi mat khau','dang nhap','tai khoan','dang ky','khong vao duoc'],weight:2,reply:ctx=>({
  text:'Đổi mật khẩu trong mục Tài khoản (cần mật khẩu hiện tại, mật khẩu mới từ 12 ký tự; mọi thiết bị sẽ đăng xuất). Ứng dụng chưa có đặt lại mật khẩu qua email.',
  actions:ctx.user?[go('account','Mở Tài khoản')]:[{type:'login',label:'Đăng nhập / tạo tài khoản'}]})},
 {id:'thanks',words:['cam on','thank','thanks','ok','oke','duoc roi','tam biet','bye'],reply:()=>({text:'Rất vui được giúp bạn. Cần gì thêm cứ nhắn nhé.',actions:[]})},
 {id:'greeting',words:['xin chao','chao','hello','hi','alo','hey'],reply:ctx=>({text:`Chào ${ctx.user?.displayName||'bạn'}! Mình là trợ lý tự động của STAYOS, trả lời ngay từ dữ liệu đặt phòng. Việc cần người quyết định, mình chuyển cho nhân viên.`,actions:[]})},
];

const hit=(text,word)=>new RegExp(`(^|[^a-z0-9])${word.replace(/ /g,'\\s+')}([^a-z0-9]|$)`).test(text);

/** Best matching intent for a question, or null. Exposed for tests. */
export function classify(question){
 const text=fold(question).replace(/[-_]/g,' ');
 let best=null;
 for(const intent of intents){
  const words=intent.words.filter(w=>hit(text,w));
  const score=(intent.test?(intent.test(text)?2:0):0)+words.reduce((s,w)=>s+w.split(' ').length,0)*(intent.weight||1);
  if(score>0&&(!best||score>best.score))best={intent,score};
 }
 return best&&{intent:best.intent,text};
}

/**
 * Reply for one guest message. `ctx`: {properties, rooms, services, bookings, user, statusLabel, now}.
 * Returns {intent, text, actions}; actions are {type:'staff'|'navigate'|'login', ...}.
 */
export function assistantReply(question,ctx){
 const full={bookings:[],statusLabel:s=>s,now:Date.now(),...ctx};
 const match=classify(question);
 if(!match)return {intent:'unknown',text:'Mình chưa có thông tin này trong dữ liệu nên không muốn đoán. Bạn gửi câu hỏi cho nhân viên nhé, họ trả lời trong cuộc trò chuyện này.',actions:[staff(full.user?'OTHER':'INQUIRY')]};
 const reply=match.intent.reply(full,match.text);
 return {intent:match.intent.id,...reply};
}

export {vietnamDate};
