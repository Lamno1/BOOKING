import {test} from 'node:test';
import assert from 'node:assert/strict';
import {filterBookings,statusCounts,sortBookings,bookingsCsv,completedStays} from '../src/features/admin/admin-bookings-domain.js';

const bookings=[
 {id:'ST-AAA',guestName:'Nguyễn Văn Đạt',email:'dat@example.test',roomName:'Phòng I-103',roomId:'tidal',arrival:'2026-10-25',departure:'2026-10-27',guests:2,status:'CONFIRMED',total:1500000,createdAt:3,arrivalWindow:'20-22',specialRequests:'=HYPERLINK("http://x")'},
 {id:'ST-BBB',guestName:'Trần Thị Lan',email:'lan@example.test',roomName:'Phòng R-102',roomId:'quiet',arrival:'2026-10-22',departure:'2026-10-23',guests:1,status:'CHECKED_IN',total:450000,createdAt:1},
 {id:'ST-CCC',guestName:'Lê Minh',email:'minh@example.test',roomName:'Phòng I-202',roomId:'beach',arrival:'2026-10-22',departure:'2026-10-24',guests:3,status:'CANCELLED',total:900000,createdAt:2,specialRequests:'Tầng cao, "yên tĩnh"'},
];

test('search ignores Vietnamese accents and matches id, email, room and request',()=>{
 assert.deepEqual(filterBookings(bookings,{query:'nguyen dat'}).map(b=>b.id),['ST-AAA']);
 assert.deepEqual(filterBookings(bookings,{query:'st-bbb'}).map(b=>b.id),['ST-BBB']);
 assert.deepEqual(filterBookings(bookings,{query:'I-202'}).map(b=>b.id),['ST-CCC']);
 assert.deepEqual(filterBookings(bookings,{query:'yen tinh'}).map(b=>b.id),['ST-CCC']);
 assert.deepEqual(filterBookings(bookings,{query:'example',status:'CONFIRMED'}).map(b=>b.id),['ST-AAA']);
});
test('status counts cover every status plus all',()=>{
 assert.deepEqual(statusCounts(bookings),{ALL:3,CONFIRMED:1,CHECKED_IN:1,CHECKED_OUT:0,CANCELLED:1});
});
test('sort by newest booking or by arrival, ties newest first',()=>{
 assert.deepEqual(sortBookings(bookings).map(b=>b.id),['ST-AAA','ST-CCC','ST-BBB']);
 assert.deepEqual(sortBookings(bookings,'arrivalUp').map(b=>b.id),['ST-CCC','ST-BBB','ST-AAA']);
 assert.deepEqual(sortBookings(bookings,'arrivalDown').map(b=>b.id),['ST-AAA','ST-CCC','ST-BBB']);
 assert.deepEqual(sortBookings([{id:'old',arrival:'a'},{id:'new',arrival:'a'}]).map(b=>b.id),['new','old']);
});
test('CSV has a BOM, quotes text, and never lets guest text run as a formula',()=>{
 const csv=bookingsCsv(bookings,{statusLabel:s=>s.toLowerCase(),propertyName:()=>'STAYOS Inn',windowText:w=>w.replace('-','–')});
 assert.ok(csv.startsWith('﻿Mã đơn,Khách,'));
 const lines=csv.trim().split('\r\n');
 assert.equal(lines.length,4);
 assert.ok(lines[1].includes(`"'=HYPERLINK(""http://x"")"`),lines[1]);
 assert.ok(lines[1].includes(',2,2,confirmed,1500000,20–22,'));
 assert.ok(lines[3].includes('"Tầng cao, ""yên tĩnh"""'));
});

test('returning guest counts earlier completed stays only, never the booking itself, email case ignored',()=>{
 const list=[{id:'1',email:'A@x.test',status:'CHECKED_OUT',arrival:'2026-09-01',departure:'2026-09-03'},{id:'2',email:'a@x.test ',status:'CHECKED_OUT',arrival:'2026-10-01',departure:'2026-10-02'},
  {id:'3',email:'a@x.test',status:'CANCELLED',arrival:'2026-08-01',departure:'2026-08-02'},{id:'4',email:'a@X.test',status:'CONFIRMED',arrival:'2026-10-25',departure:'2026-10-26'},{id:'5',email:'b@x.test',status:'CONFIRMED',arrival:'2026-10-25',departure:'2026-10-26'}];
 const stays=completedStays(list);
 assert.deepEqual(list.map(stays),[0,1,0,2,0]);
 assert.equal(stays({email:undefined,arrival:'2026-12-01'}),0);
});
