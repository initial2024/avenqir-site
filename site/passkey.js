'use strict';
(() => {
 const panel=document.getElementById('pk-panel'), status=document.getElementById('pk-status');
 if(!panel||!status)return;
 const buttons=['pk-register','pk-create','pk-revoke','pk-login'].map(id=>document.getElementById(id)).filter(Boolean);
 const supported=window.isSecureContext&&!!window.PublicKeyCredential&&!!navigator.credentials;
 const show=t=>{status.textContent=t;};
 if(!supported){show('当前浏览器不支持通行密钥。请使用系统浏览器或原密码登录。');return;}
 show('浏览器支持 WebAuthn；实际凭证由系统提供。');
 const dec=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
 const enc=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 let prepared=null, preparedUntil=0, phase='REQUEST';
 const messages={REQUEST:'请求或会话校验失败，请刷新页面后重试。',SESSION:'管理员会话失效，请重新登录。',RATE_LIMIT:'请求过多，请稍后再试。',REAUTH:'密码或动态码验证未通过（可能已经使用），请使用下一组动态码。',REGISTER_PREPARE:'服务器无法准备注册选项，请检查主机支持或凭证上限。',CHALLENGE:'挑战已过期或已使用，请重新准备。',REGISTER_VERIFY:'服务器拒绝注册凭证（来源、认证器数据或用户验证不符合要求）。',REGISTER_SAVE:'服务器未能保存凭证或授权状态已改变。',LOGIN_PREPARE:'没有可用的已登记凭证，或登录准备失败。',LOGIN_VERIFY:'服务器拒绝登录签名或凭证已失效。',REVOKE:'撤销失败，请重新验证。'};
 const request=async (action,extra={})=>{
  const response=await fetch('passkey.php',{method:'POST',credentials:'same-origin',cache:'no-store',
   headers:{'Content-Type':'application/json','X-CSRF-Token':panel.dataset.csrf},body:JSON.stringify({action,...extra})});
  let data;
  try{data=await response.json();}catch(_){throw Error('HTTP_RESPONSE');}
  if(!response.ok||data.ok!==true)throw Error(Object.hasOwn(messages,data.stage)?data.stage:'REQUEST');
  return data;
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
  try{await fn();}catch(e){
    const code=Object.hasOwn(messages,e.message)?e.message:e.message==='HTTP_RESPONSE'?'HTTP_RESPONSE':phase==='SYSTEM'?'SYSTEM_'+(e.name==='NotAllowedError'?'NOT_ALLOWED':e.name==='SecurityError'?'SECURITY':e.name==='InvalidStateError'?'INVALID_STATE':e.name==='NotSupportedError'?'NOT_SUPPORTED':'OTHER'):'NETWORK';
    const system={HTTP_RESPONSE:'主机返回了非 JSON 响应，可能需要正常浏览器验证。',SYSTEM_NOT_ALLOWED:'系统凭证请求取消、超时或凭证提供方不可用。',SYSTEM_SECURITY:'系统拒绝网站与应用的安全关联，请用系统浏览器测试。',SYSTEM_INVALID_STATE:'此凭证可能已经登记，请检查系统密码管理器。',SYSTEM_NOT_SUPPORTED:'系统凭证提供方不支持此操作。',SYSTEM_OTHER:'系统凭证调用失败。',NETWORK:'网络请求未完成。'};
    show('['+code+'] '+(messages[code]||system[code]||'操作失败。')+' 密码＋2FA 登录仍可用。');
  }finally{buttons.forEach(b=>b.disabled=b.id==='pk-create'&&(!prepared||Date.now()>=preparedUntil));}
 };
 for(const b of buttons)b.disabled=b.id==='pk-create';
 document.getElementById('pk-register')?.addEventListener('click',()=>run(async()=>{
  phase='REQUEST';prepared=null;
  const fields=reauth();document.getElementById('pk-manage').reset();const data=await request('register_begin',fields);
  prepared=options(data.options,true);preparedUntil=Date.now()+90000;
  show('密码与动态码已验证。请在 90 秒内点击第二步，打开系统凭证选择器。');
 }));
 document.getElementById('pk-create')?.addEventListener('click',()=>run(async()=>{
  if(!prepared||Date.now()>=preparedUntil){prepared=null;throw Error('CHALLENGE');}
  const args=prepared;prepared=null;phase='SYSTEM';
  const c=await navigator.credentials.create(args);
  phase='REQUEST';await request('register_finish',body(c,true));location.reload();
 }));
 document.getElementById('pk-revoke')?.addEventListener('click',()=>{
  if(!confirm('确认撤销所有已登记通行密钥？密码和 2FA 仍可使用。'))return;
  run(async()=>{phase='REQUEST';prepared=null;const fields=reauth();document.getElementById('pk-manage').reset();await request('revoke',fields);location.reload();});
 });
 document.getElementById('pk-login')?.addEventListener('click',()=>run(async()=>{
  phase='REQUEST';const data=await request('login_begin');
  phase='SYSTEM';const c=await navigator.credentials.get(options(data.options,false));
  phase='REQUEST';const done=await request('login_finish',body(c,false));
  location.assign(done.next==='feedback-admin.php'?'feedback-admin.php':'admin.php');
 }));
})();
