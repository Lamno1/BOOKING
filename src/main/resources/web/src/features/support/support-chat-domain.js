// Chat view over the support tickets: every ticket is one conversation; staff replies are real messages, never generated here.
const SEEN_KEY='stayos-chat-seen-v1';
const vnDay=ms=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(ms));

export const lastActivity=ticket=>ticket.messages?.at(-1)?.at??ticket.updatedAt??ticket.createdAt??0;

/** Newest activity first, open conversations before closed ones with the same time. */
export function conversations(tickets=[]){
 const open=t=>['OPEN','IN_PROGRESS'].includes(t.status);
 return [...tickets].sort((a,b)=>lastActivity(b)-lastActivity(a)||open(b)-open(a));
}

/** Staff messages newer than what this browser last showed for the ticket. */
export function unreadCount(ticket,seen={}){
 const since=seen[ticket.id]||0;
 return (ticket.messages||[]).filter(m=>m.role==='admin'&&m.at>since).length;
}
export const totalUnread=(tickets=[],seen={})=>tickets.reduce((sum,t)=>sum+unreadCount(t,seen),0);

/** Messages split by Vietnam calendar day for the date separators. */
export function chatDays(messages=[]){
 const days=[];
 for(const m of messages){const day=vnDay(m.at);if(days.at(-1)?.day!==day)days.push({day,messages:[]});days.at(-1).messages.push(m);}
 return days;
}
export function dayLabel(day,today){
 if(day===today)return 'Hôm nay';
 const [y,m,d]=day.split('-');
 const yesterday=vnDay(Date.parse(`${today}T12:00:00+07:00`)-86400000);
 return day===yesterday?'Hôm qua':`${d}/${m}/${y}`;
}

// Read receipts stay in this browser only; a blocked or broken store means "nothing seen yet".
export function readSeen(storage=globalThis.localStorage){
 try{const value=JSON.parse(storage?.getItem(SEEN_KEY)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch{return {};}
}
export function markSeen(ticket,storage=globalThis.localStorage){
 const seen=readSeen(storage),at=lastActivity(ticket);
 if((seen[ticket.id]||0)>=at)return seen;
 const next={...seen,[ticket.id]:at};
 try{storage?.setItem(SEEN_KEY,JSON.stringify(next));}catch{}
 return next;
}
