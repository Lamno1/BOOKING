import React,{useEffect,useRef,useState} from 'react';
import {saveStaffNote} from '../../shared/api';

const stamp=ms=>new Date(ms).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',dateStyle:'short',timeStyle:'short'});

/** Internal note on a booking (extranet "notes"): staff only, never shown to the guest. Blank removes it. */
export function StaffNote({booking,note,onSaved,readOnly=false}){
 const [editing,setEditing]=useState(false),[text,setText]=useState(note?.note||''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const field=useRef(null),toggle=useRef(null),returnFocus=useRef(false);
 useEffect(()=>{if(editing)field.current?.focus();else if(returnFocus.current){returnFocus.current=false;toggle.current?.focus();}},[editing]);
 if(readOnly)return note?<small className="ops-note">Ghi chú nội bộ: {note.note}</small>:null;
 async function save(e){
  e.preventDefault();setBusy(true);setError('');
  try{await saveStaffNote(booking.id,text);returnFocus.current=true;setEditing(false);await onSaved(text.trim()?'Đã lưu ghi chú nội bộ.':'Đã xóa ghi chú nội bộ.');}
  catch(err){setError(err.message);}finally{setBusy(false);}
 }
 if(editing)return <form className="ops-note-form" onSubmit={save}>
  <label>Ghi chú nội bộ · {booking.id}<textarea ref={field} rows={2} maxLength={500} value={text} onChange={e=>setText(e.target.value)} placeholder="Chỉ nhân viên thấy. Không ghi số thẻ hay giấy tờ."/></label>
  <small>{text.length}/500 · để trống rồi lưu để xóa</small>{error&&<p role="alert" className="ops-error">{error}</p>}
  <div className="ops-actions"><button className="ops-primary" disabled={busy}>{busy?'Đang lưu…':'Lưu ghi chú'}</button><button type="button" disabled={busy} onClick={()=>{returnFocus.current=true;setText(note?.note||'');setError('');setEditing(false);}}>Hủy</button></div>
 </form>;
 return <div className="ops-note-view">{note&&<small className="ops-note">Ghi chú nội bộ: {note.note}<span> · {note.updatedBy} · {stamp(note.updatedAt)}</span></small>}
  <button type="button" ref={toggle} className="ops-note-toggle" onClick={()=>{setText(note?.note||'');setEditing(true);}}>{note?'Sửa ghi chú':'+ Ghi chú nội bộ'}<span className="sr-only"> cho đơn {booking.id}</span></button></div>;
}
