import React,{useEffect,useRef,useState} from 'react';
import {money,propertyById} from '../../shared/catalog';
import {compareRows,COMPARE_MAX} from './search-domain';
import {CheckIcon,CloseIcon} from '../../shared/icons';

/** Floating tray of picked rooms plus a side-by-side table; facts come from the catalog and the live availability check only. */
export function CompareRooms({rooms,ids,nights,onRemove,onClear,onOpen}){
 const [open,setOpen]=useState(false),dialog=useRef(null);
 const picked=ids.map(id=>rooms.find(r=>r.id===id)).filter(Boolean);
 useEffect(()=>{open&&picked.length?dialog.current?.showModal():dialog.current?.close();},[open,picked.length]);
 useEffect(()=>{if(picked.length<2)setOpen(false);},[picked.length]);
 if(!picked.length)return null;
 const rows=compareRows(picked,nights);
 const cell=(row,value)=>row.kind==='money'?money(value):row.kind==='check'?(value?<><CheckIcon size={16}/><span className="sr-only">Có</span></>:<span className="compare-no">—<span className="sr-only">Không</span></span>):value;
 return <>
  <aside className="compare-tray" aria-label="Phòng đang so sánh">
   <ul>{picked.map(r=><li key={r.id}><span>{r.number} · {r.typeName}</span><button type="button" onClick={()=>onRemove(r.id)} aria-label={`Bỏ ${r.name} khỏi so sánh`}><CloseIcon size={14}/></button></li>)}
    {Array.from({length:COMPARE_MAX-picked.length},(_,i)=><li key={'empty'+i} className="is-empty" aria-hidden="true">Thêm phòng</li>)}</ul>
   <div><span className="compare-count">{picked.length}/{COMPARE_MAX} phòng</span><button type="button" className="compare-clear" onClick={onClear}>Xóa</button><button type="button" className="compare-go" disabled={picked.length<2} onClick={()=>setOpen(true)}>{picked.length<2?'Chọn thêm 1 phòng':`So sánh ${picked.length} phòng`}</button></div>
  </aside>
  <dialog ref={dialog} className="compare-dialog" aria-labelledby="compare-title" onCancel={()=>setOpen(false)} onClose={()=>setOpen(false)}>
   <div className="compare-head"><h2 id="compare-title">So sánh {picked.length} phòng</h2><button type="button" className="journey-close" onClick={()=>setOpen(false)} aria-label="Đóng so sánh">×</button></div>
   <p className="compare-note">Ô được tô là lựa chọn dẫn đầu ở dòng đó. Giá là giá phòng mỗi đêm; gói và dịch vụ chọn ở bước đặt.</p>
   <div className="compare-scroll"><table>
    <thead><tr><th scope="col"><span className="sr-only">Tiêu chí</span></th>{picked.map(r=><th scope="col" key={r.id}><small>{propertyById(r.propertyId).name}</small>{r.name}</th>)}</tr></thead>
    <tbody>{rows.map(row=><tr key={row.id} className={row.kind==='check'?'is-feature':''}><th scope="row">{row.label}</th>{row.values.map((v,i)=><td key={picked[i].id} className={row.best[i]?'is-best':''}>{cell(row,v)}</td>)}</tr>)}</tbody>
    <tfoot><tr><th scope="row"><span className="sr-only">Thao tác</span></th>{picked.map(r=><td key={r.id}><button type="button" className="result-open" onClick={()=>{setOpen(false);onOpen(r);}}>Xem phòng</button><button type="button" className="compare-remove" onClick={()=>onRemove(r.id)}>Bỏ khỏi so sánh</button></td>)}</tr></tfoot>
   </table></div>
  </dialog>
 </>;
}
