import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {filterRooms,sortRooms,defaultFilters,activeFilterCount,nextFreeRange,rangeIsFree,monthGrid,nextMonth,pickDay,toggleSaved,readSaved,pushRecent,readRecent,hasKitchen,nightsBetween,toggleCompare,compareRows,pushSearch,readSearches,addDays} from '../src/features/search/search-domain.js';
const rooms=JSON.parse(readFileSync(new URL('../src/shared/data/inventory.json',import.meta.url))).rooms.map((r,i)=>({...r,available:i%5!==0}));
function memory(){const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};}
test('filters combine property, party size, kitchen, availability, saved, price and text',()=>{
 assert.equal(filterRooms(rooms,defaultFilters()).length,15);
 assert.ok(filterRooms(rooms,{...defaultFilters(),kitchen:true}).every(r=>r.propertyId==='residence'));
 assert.ok(filterRooms(rooms,defaultFilters(),{guests:5}).every(r=>r.capacity>=5));
 assert.ok(filterRooms(rooms,{...defaultFilters(),availableOnly:true}).every(r=>r.available));
 assert.deepEqual(filterRooms(rooms,{...defaultFilters(),savedOnly:true},{saved:['tidal']}).map(r=>r.id),['tidal']);
 assert.ok(filterRooms(rooms,{...defaultFilters(),maxPrice:600000}).every(r=>r.price<=600000));
 assert.deepEqual(filterRooms(rooms,{...defaultFilters(),search:'i-103'}).map(r=>r.id),['tidal']);
 assert.equal(activeFilterCount({...defaultFilters(),kitchen:true,propertyId:'inn',search:' '}),2);
 assert.equal(hasKitchen(rooms[0]),true);assert.equal(hasKitchen(rooms.find(r=>r.propertyId==='inn')),false);
});
test('sorting is stable and recommended puts available, best-fitting, cheaper rooms first',()=>{
 const up=sortRooms(rooms,'priceUp').map(r=>r.price);assert.deepEqual(up,[...up].sort((a,b)=>a-b));
 const rec=sortRooms(rooms,'recommended',4);const firstUnavailable=rec.findIndex(r=>!r.available);assert.ok(rec.slice(firstUnavailable).every(r=>!r.available));
 assert.equal(rec[0].available,true);assert.equal(sortRooms(rooms,'area')[0].area,Math.max(...rooms.map(r=>r.area)));
 assert.equal(rooms.length,15,'input not mutated');
 const two=rooms.map(r=>({...r,available:true}));assert.equal(sortRooms(two,'recommended',2,['ocean'])[0].id,'ocean');assert.notEqual(sortRooms(two,'recommended',2)[0].id,'ocean');
});
test('nearest free range skips booked nights and treats checkout day as free',()=>{
 const booked=['2026-10-22','2026-10-23','2026-10-26'];
 assert.deepEqual(nextFreeRange(booked,'2026-10-22',2,30),{arrival:'2026-10-24',departure:'2026-10-26'});
 assert.deepEqual(nextFreeRange(booked,'2026-10-22',3,30),{arrival:'2026-10-27',departure:'2026-10-30'});
 assert.equal(nextFreeRange(['2026-10-22','2026-10-23'],'2026-10-22',2,3),null);
 assert.equal(rangeIsFree(booked,'2026-10-24','2026-10-26'),true);assert.equal(rangeIsFree(booked,'2026-10-25','2026-10-27'),false);
 assert.equal(nightsBetween('2026-10-30','2026-11-02'),3);
});
test('month grid starts on Monday and crosses year end',()=>{
 const grid=monthGrid('2026-10');assert.equal(grid.indexOf('2026-10-01'),3);assert.equal(grid.filter(Boolean).length,31);
 assert.equal(nextMonth('2026-12'),'2027-01');assert.equal(nextMonth('2026-01'),'2026-02');
});
test('range picking restarts when the second click is not after arrival',()=>{
 let s=pickDay({arrival:'',departure:'',picking:'arrival'},'2026-10-24');assert.deepEqual(s,{arrival:'2026-10-24',departure:'',picking:'departure'});
 s=pickDay(s,'2026-10-27');assert.deepEqual(s,{arrival:'2026-10-24',departure:'2026-10-27',picking:'arrival'});
 assert.equal(pickDay({arrival:'2026-10-24',departure:'',picking:'departure'},'2026-10-23').arrival,'2026-10-23');
});
test('saved and recent rooms survive corrupt storage and stay bounded',()=>{
 const storage=memory();storage.setItem('stayos-saved-rooms-v1','{');assert.deepEqual(readSaved(storage),[]);
 assert.deepEqual(toggleSaved('ocean',storage),['ocean']);assert.deepEqual(toggleSaved('tidal',storage),['tidal','ocean']);assert.deepEqual(toggleSaved('ocean',storage),['tidal']);
 for(const id of ['a','b','c','d','e','f','g','a'])pushRecent(id,storage);assert.deepEqual(readRecent(storage),['a','g','f','e','d','c']);
});
import {datePresets,clampParty} from '../src/features/search/search-domain.js';
test('quick date presets cover tonight, this weekend and next week from the Vietnam day',()=>{
 const wed=datePresets('2026-10-21');assert.deepEqual(wed.map(p=>[p.arrival,p.departure]),[['2026-10-21','2026-10-22'],['2026-10-23','2026-10-25'],['2026-10-26','2026-10-29']]);
 assert.deepEqual(datePresets('2026-10-24')[1],{id:'weekend',label:'Cuối tuần này',arrival:'2026-10-24',departure:'2026-10-25'});
 assert.deepEqual(datePresets('2026-10-23')[1].arrival,'2026-10-23');assert.equal(datePresets('2026-10-25')[1].arrival,'2026-10-30');
 assert.equal(datePresets('2026-10-26')[2].arrival,'2026-11-02');
});
test('party size keeps at least one adult and never exceeds the largest room',()=>{
 assert.deepEqual(clampParty(0,0),{adults:1,children:0});assert.deepEqual(clampParty(4,5),{adults:4,children:2});assert.deepEqual(clampParty(9,1),{adults:6,children:0});
});

test('compare tray holds at most three rooms and refuses a fourth instead of replacing one',()=>{
 let state={list:[]};for(const id of ['a','b','c'])state=toggleCompare(state.list,id);
 assert.deepEqual(state.list,['a','b','c']);
 const full=toggleCompare(state.list,'d');assert.equal(full.full,true);assert.deepEqual(full.list,['a','b','c']);
 assert.deepEqual(toggleCompare(state.list,'b').list,['a','c']);
});
test('compare rows mark the cheapest, largest and only free room, but not ties across all columns',()=>{
 const rooms=[{price:900,area:30,capacity:2,beds:'1 giường',features:['Bếp nhỏ','Wi-Fi'],available:false},{price:700,area:30,capacity:4,beds:'2 giường',features:['Wi-Fi'],available:true}];
 const rows=Object.fromEntries(compareRows(rooms,2).map(r=>[r.id,r]));
 assert.deepEqual(rows.price.best,[false,true]);assert.deepEqual(rows.total.values,[1800,1400]);
 assert.deepEqual(rows.area.best,[false,false]);assert.deepEqual(rows.capacity.best,[false,true]);
 assert.deepEqual(rows.status.values,['Đã kín','Còn trống']);assert.deepEqual(rows.status.best,[false,true]);
 assert.deepEqual(rows['f:Bếp nhỏ'].values,[true,false]);
 assert.equal(compareRows(rooms,0).some(r=>r.id==='total'),false);
});

test('recent searches: newest first, deduped, capped at 3, past arrivals and junk dropped',()=>{
 const storage=memory();
 const s=(arrival,guests=2)=>({propertyId:'inn',arrival,departure:addDays(arrival,2),guests,kids:0});
 pushSearch(s('2026-10-25'),'2026-10-22',storage);pushSearch(s('2026-10-26'),'2026-10-22',storage);
 pushSearch(s('2026-10-25'),'2026-10-22',storage);
 assert.deepEqual(readSearches('2026-10-22',storage).map(x=>x.arrival),['2026-10-25','2026-10-26']);
 pushSearch(s('2026-10-27'),'2026-10-22',storage);pushSearch(s('2026-10-28'),'2026-10-22',storage);
 assert.deepEqual(readSearches('2026-10-22',storage).map(x=>x.arrival),['2026-10-28','2026-10-27','2026-10-25']);
 assert.deepEqual(readSearches('2026-10-26',storage).map(x=>x.arrival),['2026-10-28','2026-10-27']);
 pushSearch({propertyId:'inn',arrival:'2026-10-30',departure:'2026-10-29',guests:2},'2026-10-22',storage);
 assert.equal(readSearches('2026-10-22',storage).length,3);
 storage.setItem('stayos-recent-searches-v1','{bad');assert.deepEqual(readSearches('2026-10-22',storage),[]);
});
