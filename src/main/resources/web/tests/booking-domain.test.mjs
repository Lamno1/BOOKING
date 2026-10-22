import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dateAfter, nextDate, bookingProblem, supportReply, stayPresentation } from '../src/shared/booking-domain.js';
const base = {room:{capacity:2,available:true},arrival:'2026-10-14',departure:'2026-10-16',guests:2,availability:{},today:'2026-10-12'};
test('property date respects Vietnam midnight and calendar boundaries',()=>{
  assert.equal(dateAfter(0,new Date('2026-10-11T18:00:00Z')),'2026-10-12');
  assert.equal(dateAfter(1,new Date('2026-12-31T05:00:00Z')),'2027-01-01');
  assert.equal(nextDate('2028-02-28'),'2028-02-29');
  assert.equal(nextDate(''),'');
});
test('valid available booking can proceed',()=>assert.equal(bookingProblem(base),''));
test('dates, capacity, network state and unavailable rooms block confirmation',()=>{
  for(const override of [{departure:base.arrival},{arrival:'2026-10-01'},{guests:3},{guests:1.5},{guests:0},{availability:null},{room:{capacity:2,available:false}},{room:{capacity:2,available:false,availabilityReason:'CLOSED'}}])assert.notEqual(bookingProblem({...base,...override}),'');
});

test('towels and Wi-Fi never become a paid dinner suggestion',()=>{
  const reply=supportReply('Tôi cần thêm khăn tắm và hỏi mật khẩu Wi-Fi');
  assert.match(reply.message,/khăn/);assert.match(reply.message,/Wi-Fi/);
  assert.match(reply.title,/Chưa gửi/);assert.match(reply.message,/Không thêm dịch vụ hoặc tính phí/);
  for(const text of ['xin chào','không muốn bữa tối','spa và xe','khăn tắm','wifi','']) {
    assert.equal(supportReply(text).serviceId,undefined);
    assert.doesNotMatch(JSON.stringify(supportReply(text)),/650.000|hải sản/);
  }
});

test('cancelled and completed stays have no active journey; totals use saved snapshots',()=>{
  const booking={status:'CANCELLED',roomTotal:1500000,total:2150000,roomSnapshot:{name:'I-103',area:34},policy:{checkIn:'14:00'}};
  const view=stayPresentation(booking);
  assert.equal(view.active,false);assert.equal(view.cancelled,true);
  assert.equal(view.total,2150000);assert.equal(view.serviceTotal,650000);
  assert.deepEqual(view.room,booking.roomSnapshot);
  assert.equal(stayPresentation({...booking,status:'CHECKED_OUT'}).active,false);
  assert.equal(stayPresentation({...booking,status:'CONFIRMED'}).active,true);
  assert.equal(stayPresentation({...booking,status:'CHECKED_IN'}).active,true);
  const legacy=stayPresentation({status:'CANCELLED',total:4980000});
  assert.equal(legacy.room,null);assert.equal(legacy.policy,null);assert.equal(legacy.roomTotal,null);assert.equal(legacy.total,4980000);
});
