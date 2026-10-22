import React,{useState} from 'react';
import {resetPassword} from '../../shared/api';
import {hotline} from '../../shared/catalog';

/** Staff-assisted reset: the guest calls the hotline, staff verify them and read out a one-time code (30 minutes). */
export function PasswordReset({email:initialEmail='',onDone,onBack}){
 const [email,setEmail]=useState(initialEmail),[code,setCode]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(event){
  event.preventDefault();if(busy)return;setBusy(true);setError('');
  try{await resetPassword(email,code,password);setPassword('');setCode('');onDone(email);}
  catch(failure){setError(failure.message);}finally{setBusy(false);}
 }
 return <form onSubmit={submit}>
  <p className="overline">ĐẶT LẠI MẬT KHẨU</p><h2>Lấy lại quyền truy cập.</h2>
  <p className="reset-help">{hotline?<>Gọi hotline <a href={`tel:${hotline}`}>{hotline}</a></>:'Liên hệ nhân viên'} để xác minh tài khoản. Nhân viên đọc cho bạn một mã dùng một lần, có hiệu lực 30 phút. Đặt lại xong, mọi thiết bị đang đăng nhập sẽ bị đăng xuất.</p>
  <label>Email tài khoản<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
  <label>Mã đặt lại<input autoComplete="one-time-code" inputMode="text" maxLength={20} value={code} onChange={e=>setCode(e.target.value.toUpperCase())} required spellCheck={false}/></label>
  <label>Mật khẩu mới<input type="password" autoComplete="new-password" minLength={12} maxLength={256} value={password} onChange={e=>setPassword(e.target.value)} required/><small>Tối thiểu 12 ký tự.</small></label>
  {error&&<p className="form-error" role="alert">{error}</p>}
  <button className="gold-button confirm" disabled={busy}>{busy?'Đang xử lý…':'Đặt mật khẩu mới'}</button>
  <button type="button" className="text-button" onClick={onBack}>← Quay lại đăng nhập</button>
 </form>;
}
