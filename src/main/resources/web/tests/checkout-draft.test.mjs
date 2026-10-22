import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readCheckoutDraft,saveCheckoutDraft,clearCheckoutDraft,cleanCheckoutDraft,CHECKOUT_DRAFT_KEY,DRAFT_MAX_AGE} from '../src/features/search/checkout-draft.js';
const offer=JSON.parse(readFileSync(new URL('../review/offer-v2.json',import.meta.url)));
function memory(){const values=new Map();return {values,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};}
const now=Date.parse('2026-10-21T12:00:00+07:00');
test('plan, quantities, schedules and flight survive a reload',()=>{
 const storage=memory();
 saveCheckoutDraft({planId:'breakfast',quantities:{dining:2,transfer:1},schedules:{dining:{date:'2026-10-23',time:'18:30'},transfer:{date:'2026-10-22',time:'10:00',flight:'VN123'}},open:true},offer,storage,now);
 const draft=readCheckoutDraft(offer,storage,now+60000);
 assert.equal(draft.planId,'breakfast');assert.deepEqual(draft.quantities,{dining:2,transfer:1});assert.equal(draft.schedules.dining.time,'18:30');assert.equal(draft.schedules.transfer.flight,'VN123');assert.equal(draft.open,true);
});
test('only a draft saved moments ago reopens the checkout; older drafts keep choices closed',()=>{
 const storage=memory();saveCheckoutDraft({planId:'breakfast',quantities:{dining:1},schedules:{},open:true},offer,storage,now);
 assert.equal(readCheckoutDraft(offer,storage,now+29*60000).open,true);
 const later=readCheckoutDraft(offer,storage,now+31*60000);assert.equal(later.open,false);assert.equal(later.planId,'breakfast');assert.deepEqual(later.quantities,{dining:1});
});
test('stored prices, totals and unknown services are never kept',()=>{
 const storage=memory();saveCheckoutDraft({planId:'breakfast',quantities:{dining:1,caviar:3},schedules:{},total:1,price:1,email:'a@b.c'},offer,storage,now);
 const raw=JSON.parse(storage.values.get(CHECKOUT_DRAFT_KEY));for(const field of ['total','price','email'])assert.equal(field in raw,false);assert.equal('caviar' in raw.quantities,false);
});
test('corrupt, stale, future or other-revision drafts fall back to an empty choice',()=>{
 const storage=memory();storage.setItem(CHECKOUT_DRAFT_KEY,'{');assert.deepEqual(readCheckoutDraft(offer,storage,now).quantities,{});
 const base={offerVersion:offer.revision,planId:'breakfast',quantities:{dining:2},savedAt:now};
 assert.equal(cleanCheckoutDraft({...base,offerVersion:'old'},offer,now).planId,offer.packages[0].id);
 assert.equal(cleanCheckoutDraft({...base,savedAt:now-DRAFT_MAX_AGE-1},offer,now).planId,offer.packages[0].id);
 assert.equal(cleanCheckoutDraft({...base,savedAt:now+86400000},offer,now).planId,offer.packages[0].id);
 assert.deepEqual(cleanCheckoutDraft({...base,quantities:{dining:7,spa:-1,tour:1.5}},offer,now).quantities,{});
 assert.equal(cleanCheckoutDraft({...base,schedules:{dining:{date:'<script>',time:'18:00'}}},offer,now).schedules.dining.date,'');
 assert.equal(cleanCheckoutDraft({...base,planId:'vip'},offer,now).planId,offer.packages[0].id);
});
test('clearing removes the saved choice',()=>{const storage=memory();saveCheckoutDraft({planId:'breakfast'},offer,storage,now);clearCheckoutDraft(storage);assert.equal(storage.getItem(CHECKOUT_DRAFT_KEY),null);});
