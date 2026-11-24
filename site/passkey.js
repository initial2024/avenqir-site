'use strict';
(() => {
 const panel=document.getElementById('pk-panel'), status=document.getElementById('pk-status');
 if(!panel||!status)return;
 const buttons=['pk-register','pk-revoke','pk-login'].map(id=>document.getElementById(id)).filter(Boolean);
 const supported=window.isSecureContext&&!!window.PublicKeyCredential&&!!navigator.credentials;
 const show=t=>{status.textContent=t;};
 if(!supported){show('当前浏览器不支持通行密钥。请使用系统浏览器或原密码登录。');return;}
 show('浏览器支持 WebAuthn；实际凭证由系统提供。');
 const dec=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
 const enc=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 const request=async (action,extra={})=>{
  const response=await fetch('passkey.php',{method:'POST',credentials:'same-origin',cache:'no-store',
   headers:{'Content-Type':'application/json','X-CSRF-Token':panel.dataset.csrf},body:JSON.stringify({action,...extra})});
  const data=await response.json();if(!response.ok||data.ok!==true)throw Error('denied');return data;
 };
 const options=(o,create)=>{
  const p=o.publicKey;p.challenge=dec(p.challenge);
  if(create)p.user.id=dec(p.user.id);
  for(const k of ['excludeCredentials','allowCredentials'])if(p[k])p[k]=p[k].map(c=>({...c,id:dec(c.id)}));
  return {publicKey:p};
 };
 const body=(c,create)=>{
  if(!c||c.type!=='public-key')throw Error('invalid credential');
  const r=c.response, out={id:enc(c.rawId),clientDataJSON:enc(r.clientDataJSON)};
  if(create)out.attestationObject=enc(r.attestationObject);
  else{out.authenticatorData=enc(r.authenticatorData);out.signature=enc(r.signature);if(r.userHandle)out.userHandle=enc(r.userHandle);}
  return out;
 };
 document.getElementById('pk-manage')?.addEventListener('submit',e=>e.preventDefault());
 const reauth=()=>{
  const f=document.getElementById('pk-manage');if(!f.reportValidity())throw Error('invalid form');
  const data=new FormData(f);return {password:data.get('password'),otp:data.get('otp')};
 };
 const run=async fn=>{
  buttons.forEach(b=>b.disabled=true);show('正在处理…');
  try{await fn();}catch(e){show('操作未完成：可能已取消、动态码已用过、设备不支持或验证失败。可以返回密码＋2FA 登录。');}
  finally{buttons.forEach(b=>b.disabled=false);}
 };
 for(const b of buttons)b.disabled=false;
 document.getElementById('pk-register')?.addEventListener('click',()=>run(async()=>{
  const fields=reauth();document.getElementById('pk-manage').reset();const data=await request('register_begin',fields);
  const c=await navigator.credentials.create(options(data.options,true));
  await request('register_finish',body(c,true));location.reload();
 }));
 document.getElementById('pk-revoke')?.addEventListener('click',()=>{
  if(!confirm('确认撤销所有已登记通行密钥？密码和 2FA 仍可使用。'))return;
  run(async()=>{const fields=reauth();document.getElementById('pk-manage').reset();await request('revoke',fields);location.reload();});
 });
 document.getElementById('pk-login')?.addEventListener('click',()=>run(async()=>{
  const data=await request('login_begin');
  const c=await navigator.credentials.get(options(data.options,false));
  const done=await request('login_finish',body(c,false));
  location.assign(done.next==='feedback-admin.php'?'feedback-admin.php':'admin.php');
 }));
})();
