import React,{useEffect,useRef,useState} from 'react';
import {clampParty} from './search-domain';
import {UsersIcon} from '../../shared/icons';

const Stepper=({label,hint,value,min,max,onChange})=><div className="stepper"><div><strong>{label}</strong><small>{hint}</small></div>
 <div className="stepper-controls"><button type="button" onClick={()=>onChange(value-1)} disabled={value<=min} aria-label={`Bớt ${label.toLowerCase()}`}>−</button><output aria-live="polite" aria-label={label}>{value}</output><button type="button" onClick={()=>onChange(value+1)} disabled={value>=max} aria-label={`Thêm ${label.toLowerCase()}`}>+</button></div></div>;

/** Adults/children popover. Rooms count everyone (children included) toward capacity, so only the total goes to the server. */
export function GuestPicker({guests,kids=0,onChange,max=6}){
 const [open,setOpen]=useState(false),box=useRef(null),button=useRef(null);
 const party=clampParty(guests-kids,kids,max);
 useEffect(()=>{if(!open)return;
  const outside=e=>{if(!box.current?.contains(e.target))setOpen(false);};
  const escape=e=>{if(e.key==='Escape'){setOpen(false);button.current?.focus();}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  return ()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};},[open]);
 const set=(adults,kids)=>{const p=clampParty(adults,kids,max);onChange(p.adults+p.children,p.children);};
 const summary=`${party.adults} người lớn${party.children?` · ${party.children} trẻ em`:''}`;
 return <div className="guest-picker" ref={box}><span className="guest-picker-label" id="guest-picker-label">Khách</span>
  <button type="button" ref={button} aria-expanded={open} aria-controls="guest-picker-panel" aria-labelledby="guest-picker-label guest-picker-value" onClick={()=>setOpen(o=>!o)}><UsersIcon size={17}/><span id="guest-picker-value">{summary}</span></button>
  {open&&<div className="guest-picker-panel" id="guest-picker-panel" role="group" aria-label="Số khách">
   <Stepper label="Người lớn" hint="Từ 13 tuổi" value={party.adults} min={1} max={max-party.children} onChange={v=>set(v,party.children)}/>
   <Stepper label="Trẻ em" hint="Dưới 13 tuổi · tính vào sức chứa" value={party.children} min={0} max={max-party.adults} onChange={v=>set(party.adults,v)}/>
   <p>Phòng lớn nhất nhận {max} khách. Trẻ em dùng chung định mức bữa sáng; chưa có giá trẻ em riêng.</p>
   <button type="button" className="guest-picker-done" onClick={()=>{setOpen(false);button.current?.focus();}}>Xong</button>
  </div>}
 </div>;
}
