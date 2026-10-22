// Stores checkout inputs only (no name, email, price or total). Everything is recomputed from the offer and checked by the server.
export const CHECKOUT_DRAFT_KEY='stayos-offer-draft-v1';
export const DRAFT_MAX_AGE=7*86400000;
// Reopening the checkout by itself is only for a reload/crash moments ago; older drafts keep choices but stay closed.
export const REOPEN_MAX_AGE=30*60000;
const store=()=>{try{return globalThis.localStorage;}catch{return null;}};
export function cleanCheckoutDraft(value,offer,now=Date.now()){
 const empty={planId:offer.packages[0].id,quantities:{},schedules:{},open:false};
 if(!value||value.offerVersion!==offer.revision||!Number.isFinite(value.savedAt)||now-value.savedAt>DRAFT_MAX_AGE||value.savedAt>now+60000)return empty;
 const draft={...empty,planId:offer.packages.some(p=>p.id===value.planId)?value.planId:empty.planId,open:value.open===true&&now-value.savedAt<=REOPEN_MAX_AGE};
 const text=(v,pattern,max)=>typeof v==='string'&&v.length<=max&&(v===''||pattern.test(v))?v:'';
 for(const addon of offer.addons){
  const quantity=value.quantities?.[addon.id];
  if(Number.isInteger(quantity)&&quantity>0&&quantity<=6)draft.quantities[addon.id]=quantity;
  const schedule=value.schedules?.[addon.id];
  if(schedule&&typeof schedule==='object'){
   const saved={date:text(schedule.date,/^\d{4}-\d{2}-\d{2}$/,10),time:text(schedule.time,/^\d{2}:\d{2}$/,5)};
   if(addon.id==='transfer')saved.flight=text(schedule.flight,/^[A-Za-z0-9 ]+$/,10);
   draft.schedules[addon.id]=saved;
  }
 }
 return draft;
}
export function readCheckoutDraft(offer,storage=store(),now=Date.now()){
 try{return cleanCheckoutDraft(JSON.parse(storage.getItem(CHECKOUT_DRAFT_KEY)),offer,now);}catch{return cleanCheckoutDraft(null,offer,now);}
}
export function saveCheckoutDraft(draft,offer,storage=store(),now=Date.now()){
 try{storage.setItem(CHECKOUT_DRAFT_KEY,JSON.stringify({...cleanCheckoutDraft({...draft,offerVersion:offer.revision,savedAt:now},offer,now),offerVersion:offer.revision,savedAt:now}));}catch{}
}
export function clearCheckoutDraft(storage=store()){try{storage.removeItem(CHECKOUT_DRAFT_KEY);}catch{}}
