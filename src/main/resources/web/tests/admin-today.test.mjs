import {test} from 'node:test';
import assert from 'node:assert/strict';
import {todayBoard} from '../src/features/admin/admin-today-domain.js';
const now=Date.parse('2026-10-21T09:00:00+07:00'),today='2026-10-21';
const bookings=[
 {id:'A',status:'CONFIRMED',arrival:'2026-10-21',departure:'2026-10-23'},
 {id:'B',status:'CHECKED_IN',arrival:'2026-10-19',departure:'2026-10-21'},
 {id:'C',status:'CHECKED_IN',arrival:'2026-10-20',departure:'2026-10-24'},
 {id:'D',status:'CONFIRMED',arrival:'2026-10-20',departure:'2026-10-22'},
 {id:'E',status:'CANCELLED',arrival:'2026-10-21',departure:'2026-10-25'},
];
test('front desk lists arrivals, due departures, in-house and missed arrivals',()=>{
 const board=todayBoard({bookings,rooms:[{},{},{},{}]},today,now);
 assert.deepEqual(board.arrivals.map(b=>b.id),['A']);assert.deepEqual(board.departures.map(b=>b.id),['B']);
 assert.deepEqual(board.inHouse.map(b=>b.id),['B','C']);assert.deepEqual(board.noShow.map(b=>b.id),['D']);
});
test('occupancy counts active nights only, checkout night is free, cancelled never counts',()=>{
 const board=todayBoard({bookings,rooms:[{},{},{},{}]},today,now);
 assert.deepEqual(board.occupancy.slice(0,4).map(n=>n.booked),[3,2,1,0]);
 assert.equal(board.occupancy[0].rate,.75);assert.ok(board.weekRate>0&&board.weekRate<1);
 assert.equal(todayBoard({bookings,rooms:[]},today,now).weekRate,0);
});
test('upcoming pending services within 48 h, open support and low reviews are surfaced',()=>{
 const requests=[{id:'s1',status:'PENDING',start:now+3600000},{id:'s2',status:'PENDING',start:now+72*3600000},{id:'s3',status:'CONFIRMED',start:now+3600000},{id:'s4',status:'PENDING',start:now-7200000}];
 const board=todayBoard({bookings:[],requests,support:[{status:'OPEN'},{status:'RESOLVED'}],reviews:[{status:'VISIBLE',rating:2},{status:'HIDDEN',rating:1},{status:'VISIBLE',rating:5}]},today,now);
 assert.deepEqual(board.soon.map(r=>r.id),['s1']);assert.equal(board.openSupport.length,1);assert.equal(board.lowReviews.length,1);
});
test('arrivals are ordered by expected arrival window, guests without one last',()=>{
 const list=[{id:'late',status:'CONFIRMED',arrival:today,departure:'2026-10-22',arrivalWindow:'after-24'},{id:'none',status:'CONFIRMED',arrival:today,departure:'2026-10-22'},{id:'early',status:'CONFIRMED',arrival:today,departure:'2026-10-22',arrivalWindow:'14-16'}];
 assert.deepEqual(todayBoard({bookings:list},today,now).arrivals.map(b=>b.id),['early','late','none']);
});
