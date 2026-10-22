import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assistantReply,classify} from '../src/features/support/support-assistant.js';

const inventory=JSON.parse(readFileSync(new URL('../src/shared/data/inventory.json',import.meta.url),'utf8'));
const now=Date.parse('2026-10-22T03:00:00Z');
const base={properties:inventory.properties,rooms:inventory.rooms,services:inventory.services,now,statusLabel:s=>({CONFIRMED:'Đã xác nhận',CHECKED_IN:'Đang ở'})[s]||s};
const booking={id:'ST-1',status:'CONFIRMED',roomName:'I-103 · Phòng bốn',propertyName:'STAYOS Inn',arrival:'2026-10-25',departure:'2026-10-27',policy:inventory.properties[1].policy};
const intent=q=>classify(q)?.intent.id??'unknown';

test('Vietnamese questions with or without accents reach the right topic',()=>{
 const cases={
  'Mấy giờ nhận phòng vậy?':'times','may gio check in':'times','Cho mình nhận phòng sớm lúc 10h được không':'early',
  'Hủy phòng có mất phí không':'cancel','Giá phòng bao nhiêu':'price','Phòng cho 5 người':'guests','đi gia đình thì ở phòng nào':'guests',
  'Có phụ thu không, giá đã gồm thuế chưa':'fees','thanh toán bằng momo được không':'payment','Có đón sân bay không':'services',
  'Địa chỉ ở đâu':'address','Có chỗ đỗ ô tô không':'parking','mật khẩu wifi':'wifi','Quên mật khẩu đăng nhập':'account',
  'Có nôi cho em bé không':'kids','Cho mình gặp nhân viên':'human','Muốn đổi ngày ở':'change','Đơn của tôi thế nào':'mine','xin chào':'greeting','cảm ơn nhé':'thanks',
 };
 for(const [q,id] of Object.entries(cases))assert.equal(intent(q),id,q);
});
test('look-alike words after removing accents do not misfire',()=>{
 assert.notEqual(intent('Tôi muốn thuê phòng 2 đêm'),'fees');      // thuê ≠ thuế
 assert.notEqual(intent('Ở nơi nào yên tĩnh'),'kids');              // nơi ≠ nôi
 assert.notEqual(intent('Tải biên nhận ở đâu'),'beach');             // biên nhận ≠ biển
 assert.notEqual(intent('Cho tôi hỏi giờ trả phòng'),'pets');        // cho ≠ chó
 assert.equal(intent('Tôi muốn gặp người thật'),'human');
});
test('answers come from the catalog and policy, never invented',()=>{
 const price=assistantReply('giá phòng',base);
 assert.match(price.text,/STAYOS Inn/);assert.match(price.text,/450\.000 đ/);assert.match(price.text,/1\.750\.000 đ/);
 const times=assistantReply('giờ nhận phòng',base);
 assert.match(times.text,/14:00/);assert.match(times.text,/12:00/);
 const group=assistantReply('phòng cho 6 người',base);
 assert.match(group.text,/Phòng gia đình/);assert.doesNotMatch(group.text,/STAYOS Residence/,'Residence has no room for 6');
 const huge=assistantReply('nhóm 12 người',base);
 assert.match(huge.text,/tối đa 6 khách/);
});
test('unknown facts are admitted and sent to staff, not guessed',()=>{
 for(const q of ['Có chỗ đỗ xe máy không','địa chỉ ở đâu','mật khẩu wifi','có cho mang thú cưng không']){
  const r=assistantReply(q,base);
  assert.ok(r.actions.some(a=>a.type==='staff'),q);
  assert.doesNotMatch(r.text,/\bcó chỗ đỗ\b|\bđược mang\b/i,q);
 }
 const unknown=assistantReply('Hồ bơi mở cửa đến mấy giờ?',base);
 assert.equal(unknown.intent,'unknown');assert.match(unknown.text,/không muốn đoán/);
 assert.equal(unknown.actions[0].type,'staff');
 const early=assistantReply('nhận phòng sớm được không',base);
 assert.match(early.text,/không thể hứa trước/);assert.equal(early.actions[0].kind,'CHECKIN');
});
test('personal answers use only the signed-in guest\'s own bookings',()=>{
 assert.equal(assistantReply('đơn của tôi',base).actions[0].type,'login');
 const mine=assistantReply('đơn của tôi',{...base,user:{displayName:'Lan'},bookings:[booking,{...booking,id:'ST-OLD',status:'CANCELLED'}]});
 assert.match(mine.text,/ST-1/);assert.doesNotMatch(mine.text,/ST-OLD/);
 const cancel=assistantReply('hủy phòng',{...base,user:{},bookings:[booking]});
 assert.match(cancel.text,/ST-1/);assert.match(cancel.text,/23:59 ngày 25\/10\/2026/);
 const times=assistantReply('mấy giờ check in',{...base,user:{},bookings:[booking]});
 assert.match(times.text,/25\/10\/2026/);
});
test('hotline and city come from the catalog; paused services are not offered',()=>{
 const human=assistantReply('cho mình số điện thoại',base);
 assert.match(human.text,/0335858424/);
 const services=assistantReply('có dịch vụ gì',base);
 assert.doesNotMatch(services.text,/Khám phá Vũng Tàu/);assert.match(services.text,/Đón sân bay/);
 const beach=assistantReply('có gần biển không',base);
 assert.match(beach.text,/TP\. Hồ Chí Minh/);assert.match(beach.text,/chưa có thông tin/);
});
