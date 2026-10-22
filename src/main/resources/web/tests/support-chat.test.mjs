import {test} from 'node:test';
import assert from 'node:assert/strict';
import {conversations,unreadCount,totalUnread,chatDays,dayLabel,readSeen,markSeen} from '../src/features/support/support-chat-domain.js';

const at=iso=>Date.parse(iso);
const tickets=[
 {id:'A',status:'RESOLVED',createdAt:1,messages:[{role:'guest',at:at('2026-10-20T03:00:00Z')},{role:'admin',at:at('2026-10-21T03:00:00Z')}]},
 {id:'B',status:'OPEN',createdAt:2,messages:[{role:'guest',at:at('2026-10-22T01:00:00Z')}]},
 {id:'C',status:'IN_PROGRESS',createdAt:3,messages:[{role:'guest',at:at('2026-10-21T03:00:00Z')},{role:'admin',at:at('2026-10-21T03:00:00Z')}]},
];
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};

test('conversations: latest message first, open before closed on a tie',()=>{
 assert.deepEqual(conversations(tickets).map(t=>t.id),['B','C','A']);
});
test('unread counts only staff messages newer than the last one shown',()=>{
 assert.equal(unreadCount(tickets[0]),1);
 assert.equal(unreadCount(tickets[0],{A:at('2026-10-21T03:00:00Z')}),0);
 assert.equal(unreadCount(tickets[1]),0);
 assert.equal(totalUnread(tickets),2);
});
test('messages group by Vietnam day; labels say today / yesterday',()=>{
 const days=chatDays([{at:at('2026-10-21T16:30:00Z')},{at:at('2026-10-21T18:00:00Z')},{at:at('2026-10-21T16:59:00Z')}]);
 assert.deepEqual(days.map(d=>[d.day,d.messages.length]),[['2026-10-21',1],['2026-10-22',1],['2026-10-21',1]]);
 assert.equal(dayLabel('2026-10-22','2026-10-22'),'Hôm nay');
 assert.equal(dayLabel('2026-10-21','2026-10-22'),'Hôm qua');
 assert.equal(dayLabel('2026-10-01','2026-10-22'),'01/10/2026');
});
test('seen marks persist per ticket and survive a broken store',()=>{
 const store=memory();
 assert.deepEqual(readSeen(store),{});
 markSeen(tickets[0],store);
 assert.equal(unreadCount(tickets[0],readSeen(store)),0);
 assert.equal(unreadCount(tickets[2],readSeen(store)),1);
 store.setItem('stayos-chat-seen-v1','[1,2]');
 assert.deepEqual(readSeen(store),{});
 const broken={getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}};
 assert.deepEqual(readSeen(broken),{});
 assert.doesNotThrow(()=>markSeen(tickets[0],broken));
});
