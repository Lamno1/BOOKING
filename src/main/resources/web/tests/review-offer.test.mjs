import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {quoteOffer, serviceProblems, stayNights, vietnamToday, addDays} from '../review/offer-domain.js';
import {formatStayDate} from '../src/shared/booking-domain.js';
const offer=JSON.parse(readFileSync(new URL('../review/offer-v2.json',import.meta.url)));
const catalog=JSON.parse(readFileSync(new URL('../review/catalog.json',import.meta.url)));
const quote=(id='tidal',p='breakfast',guests=4,quantities={dining:2},nights=2)=>quoteOffer({room:catalog.rooms.find(r=>r.id===id),plan:offer.packages.find(x=>x.id===p),guests,arrival:'2026-11-14',departure:addDays('2026-11-14',nights),quantities,addons:offer.addons,now:new Date('2026-10-17T00:00:00+07:00')});
test('quad package scales entitlements to guests/nights, not double charging gifts',()=>{
  const q=quote();assert.equal(q.roomTotal,1500000);assert.equal(q.supplement,480000);assert.equal(q.total,3280000);
  assert.deepEqual(q.benefits.map(b=>b.quantity),[4,8]);assert.equal(q.items[0].quantity,2);
});
test('no paid extras auto-selected; gift funded without changing room price',()=>{
  const q=quote('tidal','welcome',4,{});assert.equal(q.total,1500000);assert.equal(q.items.length,0);assert.equal(q.benefits[0].quantity,4);
  assert.equal(offer.packages.length,2);assert.ok(offer.packages.every(p=>p.tea));
  assert.equal(quote('tidal','breakfast',4,{dining:1}).total,2630000);
});
test('studio price and package remain separate; reject invalid capacity/night/quantity',()=>{
  assert.equal(quote('ocean','breakfast',2,{dining:1}).total,2590000);
  assert.throws(()=>quote('ocean','breakfast',4));assert.throws(()=>quote('tidal','breakfast',4,{},0));
  assert.throws(()=>quote('tidal','breakfast',4,{dining:-1}));assert.throws(()=>quote('tidal','breakfast',4,{dining:7}));
});
test('Vietnamese display date does not mutate saved ISO date',()=>{
  assert.equal(formatStayDate('2026-10-16'),'16/10/2026');assert.equal(formatStayDate(null),'—');
});
test('reject past, reversed, missing and invalid dates; Vietnam timezone boundary',()=>{
 const now=new Date('2026-10-17T00:15:00+07:00');
 assert.equal(vietnamToday(now),'2026-10-17');
 for(const [a,d] of [['2026-01-01','2026-01-03'],['2026-11-16','2026-11-14'],['','2026-11-14'],['2026-02-30','2026-03-04']])assert.throws(()=>stayNights(a,d,now));
 assert.equal(stayNights('2026-10-17','2026-10-18',now),1);
});
const problems=(id,date,time,now='2026-11-14T06:00:00+07:00',flight='VN123')=>serviceProblems({arrival:'2026-11-14',departure:'2026-11-16',quantities:{[id]:2},schedules:{[id]:{date,time,flight}},addons:offer.addons,now:new Date(now)});
test('service lead times include exact 12h/24h boundaries',()=>{
 assert.deepEqual(problems('dining','2026-11-14','18:00'),[]);
 assert.ok(problems('dining','2026-11-14','18:00','2026-11-14T06:00:01+07:00').some(x=>x.includes('12 giờ')));
 for(const [id,time] of [['spa','10:00'],['tour','07:00'],['transfer','10:00']]){
  const date=id==='transfer'?'2026-11-14':'2026-11-15';
  const now=new Date(date+'T'+time+':00+07:00');
  assert.deepEqual(problems(id,date,time,new Date(now.getTime()-86400000).toISOString()),[]);
  assert.ok(problems(id,date,time,new Date(now.getTime()-86400000+1000).toISOString()).some(x=>x.includes('24 giờ')));
 }
});
test('require service schedule, flight, window and stay boundaries',()=>{
 assert.ok(problems('dining','','').length);
 assert.ok(problems('dining','2026-11-14','17:00').some(x=>x.includes('18:00')));
 assert.ok(problems('spa','2026-11-15','17:30').length);
 assert.ok(problems('tour','2026-11-14','07:00','2026-11-10T00:00:00Z').some(x=>x.includes('kỳ ở')));
 assert.ok(problems('transfer','2026-11-15','10:00').some(x=>x.includes('trùng')));
 assert.ok(problems('transfer','2026-11-14','10:00','2026-11-10T00:00:00Z','').some(x=>x.includes('chuyến bay')));
 assert.ok(problems('dining','2026-11-16','18:00').some(x=>x.includes('kỳ ở')));
});

