import {test} from 'node:test';
import assert from 'node:assert/strict';
import {tripPhase,itinerary,groupByDay,icsText,vietnamDate,cancellationWindow,tripGroups,defaultTrip} from '../src/features/trips/trip-domain.js';
const now=Date.parse('2026-10-21T23:30:00+07:00');
const booking={id:'ST-1',roomName:'I-103 · Phòng bốn',propertyName:'STAYOS Inn',arrival:'2026-10-23',departure:'2026-10-25',guests:4,status:'CONFIRMED',policy:{checkIn:'14:00',checkOut:'12:00'},offerSnapshot:{benefits:[{name:'Trà chào đón',quantity:4},{name:'Bữa sáng',quantity:8}]}};
test('phase and countdown use the Vietnam calendar day, not UTC',()=>{
 assert.equal(vietnamDate(now),'2026-10-21');
 assert.equal(tripPhase(booking,now).title,'Còn 2 ngày đến kỳ nghỉ');
 assert.equal(tripPhase({...booking,arrival:'2026-10-22'},now).title,'Ngày mai nhận phòng');
 assert.equal(tripPhase({...booking,arrival:'2026-10-21'},now).title,'Hôm nay nhận phòng');
 assert.equal(tripPhase({...booking,arrival:'2026-10-20'},now).tone,'warn');
 assert.equal(tripPhase({...booking,arrival:'2026-11-30'},now).step,0);
 assert.match(tripPhase({...booking,status:'CHECKED_IN',arrival:'2026-10-20',departure:'2026-10-21'},now).detail,/Hôm nay trả phòng/);
 assert.equal(tripPhase({...booking,status:'CANCELLED'},now).step,-1);assert.equal(tripPhase({...booking,status:'CHECKED_OUT'},now).step,3);
});
test('itinerary orders check-in, breakfasts, services, check-out and drops cancelled services',()=>{
 const requests=[{id:'r1',bookingId:'ST-1',name:'Bữa tối hải sản',quantity:2,unit:'set',start:Date.parse('2026-10-23T18:30:00+07:00'),status:'PENDING'},
  {id:'r2',bookingId:'ST-1',name:'Spa',start:Date.parse('2026-10-24T10:00:00+07:00'),status:'CANCELLED'},{id:'r3',bookingId:'OTHER',name:'Khác',start:1,status:'PENDING'}];
 const items=itinerary(booking,requests);
 assert.deepEqual(items.map(i=>i.id),['checkin','r1','breakfast-2026-10-24','breakfast-2026-10-25','checkout']);
 assert.equal(items[2].detail.startsWith('4 suất'),true);
 assert.deepEqual(groupByDay(items).map(g=>[g.day,g.items.length]),[['2026-10-23',2],['2026-10-24',1],['2026-10-25',2]]);
 assert.deepEqual(itinerary({...booking,offerSnapshot:undefined}).map(i=>i.id),['checkin','checkout']);
});
test('calendar export is valid RFC 5545 with escaped text and UTC times',()=>{
 const text=icsText({...booking,roomName:'Phòng; bốn, đẹp'},[{id:'r1',bookingId:'ST-1',name:'Bữa tối',start:Date.parse('2026-10-23T18:30:00+07:00'),status:'PENDING'}],now);
 assert.ok(text.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0'));assert.ok(text.endsWith('END:VCALENDAR\r\n'));
 assert.equal((text.match(/BEGIN:VEVENT/g)||[]).length,2);
 assert.ok(text.includes('DTSTART:20261023T070000Z'));assert.ok(text.includes('DTEND:20261025T050000Z'));assert.ok(text.includes('DTSTART:20261023T113000Z'));
 assert.ok(text.includes('Phòng\\; bốn\\, đẹp'));assert.ok(!/[^\r]\n/.test(text));
});
test('check-in step mentions the guest expected arrival window only when given',()=>{
 assert.match(itinerary({...booking,arrivalWindow:'20-22'})[0].detail,/bạn dự kiến đến 20:00–22:00/);
 assert.doesNotMatch(itinerary(booking)[0].detail,/dự kiến/);
});

test('cancellation window follows the server rule and only claims "free" from the policy snapshot',()=>{
 const now=Date.parse('2026-10-22T20:00:00+07:00');
 const base={status:'CONFIRMED',arrival:'2026-10-25',departure:'2026-10-27',createdAt:Date.parse('2026-10-20T09:00:00+07:00'),policy:{cancellation:'Miễn phí hủy đến hết ngày đến nếu đơn chưa nhận phòng.'}};
 const open=cancellationWindow(base,now);
 assert.equal(open.state,'open');assert.equal(open.free,true);assert.equal(open.daysLeft,3);assert.equal(open.deadline,'23:59 ngày 25/10/2026');
 assert.ok(open.progress>0&&open.progress<1);
 assert.equal(cancellationWindow({...base,arrival:'2026-10-22'},Date.parse('2026-10-22T23:30:00+07:00')).daysLeft,0);
 assert.equal(cancellationWindow({...base,arrival:'2026-10-22'},Date.parse('2026-10-23T00:10:00+07:00')).state,'closed');
 assert.equal(cancellationWindow({...base,policy:undefined},now).free,false);
 assert.equal(cancellationWindow({...base,status:'CHECKED_IN'},now).state,'none');
});

test('trips are grouped like a trips page and the default is the stay in progress or the next arrival',()=>{
 const list=[
  {id:'old',status:'CHECKED_OUT',arrival:'2026-09-01',departure:'2026-09-03'},
  {id:'far',status:'CONFIRMED',arrival:'2026-12-01',departure:'2026-12-03'},
  {id:'near',status:'CONFIRMED',arrival:'2026-10-25',departure:'2026-10-26'},
  {id:'gone',status:'CANCELLED',arrival:'2026-11-01',departure:'2026-11-02'},
  {id:'older',status:'CHECKED_OUT',arrival:'2026-08-01',departure:'2026-08-03'},
 ];
 const g=tripGroups(list);
 assert.deepEqual([g.upcoming.map(b=>b.id),g.past.map(b=>b.id),g.cancelled.map(b=>b.id)],[['near','far'],['old','older'],['gone']]);
 assert.equal(defaultTrip(list).id,'near');
 assert.equal(defaultTrip([...list,{id:'here',status:'CHECKED_IN',arrival:'2026-10-21',departure:'2026-10-24'}]).id,'here');
 assert.equal(defaultTrip(list.filter(b=>!['far','near'].includes(b.id))).id,'older');
 assert.equal(defaultTrip([]),undefined);
});
