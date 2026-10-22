import {test} from 'node:test';
import assert from 'node:assert/strict';
import {occupancyDays,occupiedOn,receiptText,supportOpen} from '../src/features/support/guest-operations-domain.js';
test('calendar crosses month boundaries and checkout day is free',()=>{
 assert.deepEqual(occupancyDays('2026-10-29'),['2026-10-29','2026-10-30','2026-10-31','2026-11-01','2026-11-02','2026-11-03','2026-11-04']);assert.deepEqual(occupancyDays(''),[]);
 const bookings=[{id:'active',roomId:'ocean',arrival:'2026-10-30',departure:'2026-11-02',status:'CONFIRMED'}];
 assert.equal(occupiedOn(bookings,'ocean','2026-10-29'),null);assert.equal(occupiedOn(bookings,'ocean','2026-10-30').id,'active');assert.equal(occupiedOn(bookings,'ocean','2026-11-02'),null);assert.equal(occupiedOn(bookings,'tidal','2026-10-31'),null);
});
test('cancelled and checked-out bookings never block calendar availability',()=>{
 for(const status of ['CANCELLED','CHECKED_OUT'])assert.equal(occupiedOn([{roomId:'ocean',arrival:'2026-10-30',departure:'2026-11-02',status}],'ocean','2026-10-31'),null);
 assert.equal(occupiedOn([{roomId:'ocean',arrival:'2026-10-30',departure:'2026-11-02',status:'CHECKED_IN'}],'ocean','2026-10-31').status,'CHECKED_IN');
});
test('downloaded summary uses saved booking amounts and only this booking services',()=>{
 const booking={id:'ST-TEST',roomName:'Legacy Ocean View',arrival:'2026-11-01',departure:'2026-11-03',guests:2,status:'CANCELLED',total:2150000,roomTotal:1500000};
 const text=receiptText(booking,[{bookingId:'ST-TEST',name:'Bữa tối',price:650000,status:'CANCELLED'},{bookingId:'ST-OTHER',name:'Private other request',price:550000,status:'CONFIRMED'}]);
 assert.ok(text.includes('Legacy Ocean View'));assert.ok(text.includes('2.150.000₫'));assert.ok(text.includes('trước hủy'));assert.ok(text.includes('chưa thu tiền'));assert.ok(!text.includes('Private other request'));assert.ok(text.includes('chưa có bản chụp chính sách'));
});
test('receipt records package re-rating from an approved date change',()=>{
 const text=receiptText({id:'P',roomName:'I-103',arrival:'2026-11-01',departure:'2026-11-04',guests:4,status:'CONFIRMED',total:4270000,roomTotal:2250000,packageSupplement:720000,offerSnapshot:{plan:{name:'Ở & ăn sáng'},benefits:[{name:'Bữa sáng',quantity:12,unit:'suất',rule:'07:00–09:30'}]},changes:[{currentArrival:'2026-11-01',currentDeparture:'2026-11-03',arrival:'2026-11-01',departure:'2026-11-04',currentTotal:3280000,total:4270000,planName:'Ở & ăn sáng',currentPackageSupplement:480000,packageSupplement:720000,transferChange:{start:Date.parse('2026-11-01T11:00:00+07:00'),schedule:{flight:'VN456'}}}]});
 for(const expected of ['3.280.000₫ → 4.270.000₫','nâng gói 480.000₫ → 720.000₫','12 suất Bữa sáng','chuyến VN456','11:00'])assert.ok(text.includes(expected),expected);
});
test('closed support and final date decisions are read-only states',()=>{
 for(const status of ['APPROVED','DECLINED','CANCELLED','RESOLVED'])assert.equal(supportOpen({status}),false);
 for(const status of ['OPEN','IN_PROGRESS'])assert.equal(supportOpen({status}),true);
});
test('receipt translates statuses and includes saved check-in, fees, capacity and benefits',()=>{
 const text=receiptText({id:'B',roomName:'R-101',arrival:'2026-11-01',departure:'2026-11-03',guests:2,status:'CANCELLED',total:1940000,roomTotal:1700000,packageSupplement:240000,policy:{checkIn:'14:00',checkOut:'12:00',cleaningFee:0,deposit:0,taxIncluded:true,capacity:'Tối đa 2 khách',cancellation:'Hủy theo hồ sơ',payment:'Không thu tiền'},offerSnapshot:{plan:{name:'Ở & ăn sáng'},benefits:[{name:'Bữa sáng',quantity:4,unit:'suất',rule:'07:00–09:30'}]}},[{bookingId:'B',name:'Dịch vụ',status:'CANCELLED',price:0}]);
 assert.ok(!text.includes('CANCELLED'));for(const expected of ['Đã hủy','14:00','12:00','Phí vệ sinh: 0₫','Cọc: 0₫','giá gồm thuế','Tối đa 2 khách','4 suất Bữa sáng','07:00–09:30','1.940.000₫'])assert.ok(text.includes(expected),expected);
});
