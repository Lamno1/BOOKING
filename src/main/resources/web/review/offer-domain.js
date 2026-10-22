// Client preview rules shared by review and booking; BookingOffer repeats checks using the server clock.
export function vietnamToday(now=new Date()){return new Date(now.getTime()+7*3600000).toISOString().slice(0,10);}
export function addDays(date,days){return new Date(Date.parse(date+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);}
function validDate(d){return /^\d{4}-\d{2}-\d{2}$/.test(d||'')&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;}
export function stayNights(arrival,departure,now=new Date()){
 if(!validDate(arrival)||!validDate(departure))throw Error('Nhập đủ ngày nhận và trả phòng hợp lệ.');
 if(arrival<vietnamToday(now))throw Error('Ngày nhận phòng không được ở trong quá khứ (giờ Việt Nam).');
 if(departure<=arrival)throw Error('Ngày trả phòng phải sau ngày nhận phòng.');
 return (Date.parse(departure)-Date.parse(arrival))/86400000;
}
export const serviceRules={dining:{lead:12,start:'18:00',end:'20:00'},spa:{lead:24,start:'09:00',end:'17:00'},tour:{lead:24,start:'07:00',end:'07:00'},transfer:{lead:24,start:'00:00',end:'23:59'}};
export function serviceProblems({arrival,departure,quantities,schedules,addons,now=new Date()}){
 const errors=[];
 for(const a of addons.filter(a=>(quantities[a.id]||0)>0)){
  const s=schedules[a.id]||{},rule=serviceRules[a.id],prefix=a.name+': ';
  if(!validDate(s.date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time||'')){errors.push(prefix+'chọn ngày và giờ phục vụ.');continue;}
  if(s.time<rule.start||s.time>rule.end)errors.push(prefix+'chọn giờ '+rule.start+'–'+rule.end+'.');
  const instant=Date.parse(s.date+'T'+s.time+':00+07:00');
  if(instant-now.getTime()<rule.lead*3600000)errors.push(prefix+'cần đặt trước ít nhất '+rule.lead+' giờ.');
  if(a.id==='transfer'){
   if(s.date!==arrival)errors.push(prefix+'ngày hạ cánh phải trùng ngày nhận phòng.');
   if(!/^[A-Z0-9]{2,3}\s?\d{1,4}$/i.test((s.flight||'').trim()))errors.push(prefix+'nhập mã chuyến bay hợp lệ, ví dụ VN123.');
  }else{
   const end=instant+(a.id==='spa'?1:a.id==='tour'?3:0)*3600000;
   if(instant<Date.parse(arrival+'T14:00:00+07:00')||end>Date.parse(departure+'T12:00:00+07:00'))errors.push(prefix+'lịch phải nằm trong kỳ ở (nhận 14:00, trả 12:00).');
  }
 }
 return errors;
}
export function quoteOffer({room,plan,guests,arrival,departure,quantities,addons,now=new Date()}){
 const nights=stayNights(arrival,departure,now);
 if(!Number.isInteger(guests)||guests<1||guests>room.capacity)throw Error('Phòng này tối đa '+room.capacity+' khách; hãy chỉnh số khách hoặc chọn phòng khác.');
 const items=addons.map(a=>{const quantity=quantities[a.id]??0;if(!Number.isInteger(quantity)||quantity<0||quantity>6)throw Error('Số lượng không phù hợp.');return {...a,quantity,total:a.price*quantity};}).filter(a=>a.quantity);
 const roomTotal=room.price*nights,supplement=plan.perGuestNight*guests*nights;
 const benefits=[{name:'Trà chào đón',quantity:guests,unit:'ly / kỳ ở',price:0}];
 if(plan.breakfast)benefits.push({name:'Bữa sáng',quantity:guests*nights,unit:'suất · '+guests+' khách × '+nights+' buổi',price:0});
 return {nights,roomTotal,supplement,benefits,items,total:roomTotal+supplement+items.reduce((s,a)=>s+a.total,0)};
}
