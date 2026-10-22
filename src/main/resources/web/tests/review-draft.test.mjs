import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaultReviewDraft,readReviewDraft,saveReviewDraft,cleanReviewDraft,reviewQuote,breakfastDates,REVIEW_DRAFT_KEY} from '../review/review-draft.js';
const data={catalog:JSON.parse(readFileSync(new URL('../review/catalog.json',import.meta.url))),offer:JSON.parse(readFileSync(new URL('../review/offer-v2.json',import.meta.url)))};
const now=new Date('2026-10-20T12:00:00+07:00');
function memory(){const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};}
test('review round trip preserves room, dates, guests, plan, quantities, service schedules and flight',()=>{
 const storage=memory(),draft={...defaultReviewDraft(),plan:'breakfast',quantities:{dining:1,transfer:1},schedules:{dining:{date:'2026-11-15',time:'18:30',flight:''},transfer:{date:'2026-11-14',time:'10:00',flight:'VN123'}}};
 const saved=saveReviewDraft(draft,storage),restored=readReviewDraft(storage);assert.deepEqual(restored,saved);assert.equal(restored.schedules.transfer.flight,'VN123');
 const result=reviewQuote(restored,data,now);assert.equal(result.quote.total,3440000);assert.equal(result.quote.benefits[1].quantity,4);assert.deepEqual(result.errors,[]);assert.deepEqual(breakfastDates(restored,2),['2026-11-15','2026-11-16']);
});
test('never trust stored room metadata, floor, price, totals or benefits',()=>{
 const saved=cleanReviewDraft({...defaultReviewDraft(),price:1,total:1,floor:1,name:'Other room',benefits:['fake']});
 for(const field of ['price','total','floor','name','benefits'])assert.equal(field in saved,false);
 assert.equal(reviewQuote(saved,data,now).quote.total,1700000);
});
test('editing to Inn keeps chosen services and recomputes matching room and benefits',()=>{
 const studio={...defaultReviewDraft(),plan:'breakfast',quantities:{dining:2},schedules:{dining:{date:'2026-11-15',time:'18:00',flight:''}}};
 const inn=cleanReviewDraft({...studio,roomId:'tidal',guests:4});const result=reviewQuote(inn,data,now);
 assert.equal(result.room.number,'I-103');assert.equal(result.property.id,'inn');assert.equal(result.quote.total,3280000);assert.deepEqual(result.quote.benefits.map(b=>b.quantity),[4,8]);assert.equal(result.quote.items[0].quantity,2);assert.equal(inn.schedules.dining.time,'18:00');
});
test('partial inputs survive edits but invalid dates, capacity and incomplete schedules block review validity',()=>{
 const draft=cleanReviewDraft({...defaultReviewDraft(),quantities:{dining:1},schedules:{dining:{date:'',time:'',flight:''}}});
 assert.ok(reviewQuote(draft,data,now).errors.length);assert.throws(()=>reviewQuote({...draft,guests:4},data,now));
 assert.throws(()=>reviewQuote({...draft,arrival:'2026-01-01',departure:'2026-01-03'},data,now));
 assert.throws(()=>reviewQuote({...draft,departure:'2026-11-13'},data,now));
 assert.equal(cleanReviewDraft({...draft,arrival:''}).arrival,'');
});
test('missing, corrupt or incompatible stored draft is not silently replaced',()=>{
 const storage=memory();assert.equal(readReviewDraft(storage),null);storage.setItem(REVIEW_DRAFT_KEY,'{');assert.throws(()=>readReviewDraft(storage));
 storage.setItem(REVIEW_DRAFT_KEY,JSON.stringify({version:99,draft:defaultReviewDraft()}));assert.throws(()=>readReviewDraft(storage));
 assert.throws(()=>cleanReviewDraft({...defaultReviewDraft(),roomId:'unknown'}));assert.throws(()=>cleanReviewDraft({...defaultReviewDraft(),quantities:{dining:7}}));
});
