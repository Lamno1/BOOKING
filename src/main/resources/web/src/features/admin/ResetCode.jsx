import React,{useState} from 'react';
import {issueResetCode} from '../../shared/api';

/** Issue a one-time reset code after verifying the caller by phone. The code is shown once and never stored in clear. */
export function ResetCode({email}){
 const [state,setState]=useState({step:'idle'});
 async function issue(){
  setState({step:'busy'});
  try{const result=await issueResetCode(email);setState({step:'shown',code:result.code,until:Date.now()+result.expiresInMinutes*60000});}
  catch(failure){setState({step:'error',message:failure.message});}
 }
 if(state.step==='confirm')return <span className="ops-reset" role="group" aria-label={`Cấp mã cho ${email}`}><small>Đã xác minh người gọi là chủ tài khoản?</small><button type="button" onClick={issue}>Đã xác minh · cấp mã</button><button type="button" onClick={()=>setState({step:'idle'})}>Hủy</button></span>;
 if(state.step==='shown')return <span className="ops-reset" role="status"><strong className="ops-code">{state.code}</strong><small>Đọc mã cho khách · hết hạn {new Date(state.until).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})} · chỉ dùng một lần</small><button type="button" onClick={()=>setState({step:'idle'})}>Ẩn mã</button></span>;
 return <span className="ops-reset"><button type="button" disabled={state.step==='busy'} onClick={()=>setState({step:'confirm'})}>{state.step==='busy'?'Đang cấp…':'Cấp mã đặt lại'}</button>{state.step==='error'&&<small role="alert">{state.message}</small>}</span>;
}
