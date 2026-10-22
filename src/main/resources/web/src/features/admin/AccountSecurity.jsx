import React,{useState} from 'react';
import {changePassword} from '../../shared/api';

/** Staff change their own password here; the server ends every session afterwards, so the console signs out. */
export function AccountSecurity({user,defaultPassword,onChanged}){
 const [current,setCurrent]=useState(''),[next,setNext]=useState(''),[again,setAgain]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(event){
  event.preventDefault();if(busy)return;setError('');
  if(next!==again){setError('Hai lần nhập mật khẩu mới chưa khớp.');return;}
  if(next===current){setError('Mật khẩu mới phải khác mật khẩu hiện tại.');return;}
  setBusy(true);
  try{await changePassword(current,next);setCurrent('');setNext('');setAgain('');onChanged();}
  catch(failure){setError(failure.message);}finally{setBusy(false);}
 }
 return <section className="ops-panel ops-security" aria-labelledby="security-title">
  <div className="ops-panel-title"><h2 id="security-title">Đổi mật khẩu · {user.email}</h2></div>
  {defaultPassword&&<p className="ops-error" role="alert">Tài khoản này đang dùng mật khẩu demo đã từng được ghi công khai. Hãy đổi ngay; máy chủ sẽ không chạy ở chế độ công khai cho đến khi đổi.</p>}
  <form onSubmit={submit}>
   <label>Mật khẩu hiện tại<input type="password" autoComplete="current-password" value={current} onChange={e=>setCurrent(e.target.value)} required maxLength={256}/></label>
   <label>Mật khẩu mới<input type="password" autoComplete="new-password" value={next} onChange={e=>setNext(e.target.value)} required minLength={12} maxLength={256}/><small>Tối thiểu 12 ký tự. Nên dùng cụm nhiều từ hoặc trình quản lý mật khẩu.</small></label>
   <label>Nhập lại mật khẩu mới<input type="password" autoComplete="new-password" value={again} onChange={e=>setAgain(e.target.value)} required minLength={12} maxLength={256}/></label>
   {error&&<p className="ops-error" role="alert">{error}</p>}
   <button className="ops-primary" disabled={busy}>{busy?'Đang đổi…':'Đổi mật khẩu'}</button>
  </form>
  <p className="ops-help">Sau khi đổi, mọi phiên đăng nhập của tài khoản này trên mọi thiết bị đều kết thúc; bạn đăng nhập lại bằng mật khẩu mới.</p>
 </section>;
}
