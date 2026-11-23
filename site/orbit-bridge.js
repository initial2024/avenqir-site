"use strict";
/* A standalone, browser-memory-only companion workflow. Never accesses Orbit sessions,
   mailboxes or APIs. Pasted content is not persisted, sent or automatically navigated. */
(function(root){
 const MAX_LENGTH=32000,MAX_LINKS=12;
 const ORBIT_URL='https://inbox.kango99w.de/';
 const gate=root.AVENQIR_LINK_GATE||(typeof require==='function'?require('./link-gate.js'):null);
 function inspect(raw){
  if(typeof raw!=='string')return {codes:[],links:[],truncated:false};
  const trimmed=raw.slice(0,MAX_LENGTH),codes=[];
  const keywords=/(?:verification|verify|one[-\s]?time|otp|passcode|security\s+code|验证码|驗證碼|安全碼|コード|認証|인증|code)[^\r\n]{0,68}/gi;
  let x;
  while((x=keywords.exec(trimmed))!==null){
   const matches=x[0].match(/(?:^|\D)(\d[\d\s-]{2,14}\d)(?!\d)/g)||[];
   for(const m of matches){
    const digits=m.replace(/\D/g,'');
    if(digits.length<4||digits.length>8||codes.includes(digits))continue;
    codes.push(digits);
   }
   if(codes.length>=5)break;
  }
  const links=[],seen=new Set(),re=/https?:\/\/[^\s<>"'`]+/gi;
  while((x=re.exec(trimmed))!==null&&links.length<MAX_LINKS){
   const candidate=x[0].replace(/[\]\[)}>,;.!。！，）】]+$/g,'');
   let u;
   try{u=new URL(candidate);}catch{continue;}
   if(u.protocol!=='https:'||u.username||u.password||u.href.length>1800||seen.has(u.href))continue;
   const risk=gate?.urlRisk(u.href);
   // Never label a third-party URL safe or automatically navigate to it.
   seen.add(u.href);
   links.push({url:u.href,host:u.hostname,pathname:u.pathname.slice(0,90),blocked:!risk||risk.blocked,reason:risk?.reason||'not verified'});
  }
  return {codes,links,truncated:raw.length>MAX_LENGTH};
 }
 function mount(){
  const doc=root.document;if(!doc)return;
  const $=id=>doc.getElementById(id);
  const input=$('orbitPaste'),btn=$('orbitScan'),clear=$('orbitClear'),codes=$('orbitCodes'),links=$('orbitLinks'),status=$('orbitStatus');
  if(!input||!btn||!clear||!codes||!links||!status)return;
  const locale=()=>root.AVENQIR_I18N?.locale||'en';
  const zh=()=>locale().startsWith('zh-');
  function say(en,cn){return zh()?cn:en;}
  const translations={
   'orbit-heading':'Orbit Hub × AVENQIR · Companion workflow',
   'orbit-body':'A safe bridge between two independent products — not account sync.',
   'orbit-principle':'Open Orbit Inbox separately. Any invitation, mailbox token, password or administrator session stays in Orbit.',
   'orbit-step-title':'A three-step workflow',
   'orbit-step-1':'Open Orbit Inbox and use your own authorized mailbox session.',
   'orbit-step-2':'For a non-sensitive test message, optionally paste only the code-bearing excerpt below.',
   'orbit-step-3':'Review candidates locally; copy the one you need yourself. Never trust links merely because they appear in email.',
   'orbit-open':'Open Orbit Inbox (external website)',
   'orbit-tool-title':'Local-only verification email assistant',
   'orbit-tool-privacy':'No mailbox access, API calls, cookies, cloud sync or saved email text. Nothing is analyzed until you press Scan. Refreshing clears this tool.',
   'orbit-code-help':'Suitable for low-risk registration or development tests. Do not use temporary mail for banking, identity recovery, payment or important accounts.',
   'orbit-paste-label':'Paste an excerpt from your own message',
   'orbit-scan':'Scan in browser only',
   'orbit-clear':'Clear all',
   'orbit-result-codes':'Possible verification codes',
   'orbit-result-links':'Found HTTPS URLs (unverified)',
   'orbit-footnote':'Scanning identifies text patterns, not sender authenticity or phishing. URLs may contain secret tokens; links are displayed by domain only and are never opened automatically.',
   'orbit-home':'Back to AVENQIR',
   'orbit-no-backend':'Orbit’s production account and mail data are never shared with AVENQIR.'
  };
  const translationsZh={
   'orbit-heading':'Orbit Hub × AVENQIR · 联动工作流',
   'orbit-body':'连接两个独立产品的工具入口，而不是账户或数据库同步。',
   'orbit-principle':'单独打开 Orbit 邮箱。邀请码、邮箱 Token、密码及管理员会话始终保留在 Orbit。',
   'orbit-step-title':'三个步骤完成操作',
   'orbit-step-1':'打开 Orbit 邮箱，并使用自己有权访问的邮箱会话。',
   'orbit-step-2':'对非敏感测试邮件，可以只粘贴含验证码的少量内容到下方。',
   'orbit-step-3':'在本机检查候选项并主动复制。邮件中的链接不因出现在邮箱内而可信。',
   'orbit-open':'打开 Orbit 邮箱（外部网站）',
   'orbit-tool-title':'本机验证码邮件辅助工具',
   'orbit-tool-privacy':'不读取邮箱、调用 API、使用 Cookie、云同步或保存邮件正文。点击“本机分析”后才处理文本，刷新即清空。',
   'orbit-code-help':'仅适用于低风险注册及开发测试；不要将临时邮箱用于银行、关键身份找回、支付或重要账户。',
   'orbit-paste-label':'粘贴你自己的邮件片段',
   'orbit-scan':'仅在当前浏览器分析',
   'orbit-clear':'全部清除',
   'orbit-result-codes':'可能的验证码',
   'orbit-result-links':'发现的 HTTPS 链接（未核验）',
   'orbit-footnote':'内容解析不能证明发件人真实或链接无钓鱼风险。链接可能带有敏感 Token；默认只显示域名，绝不自动跳转。',
   'orbit-home':'返回 AVENQIR',
   'orbit-no-backend':'Orbit 的生产账户与邮件数据不会与 AVENQIR 共享。'
  };
  function label(){
   for(const [id,en] of Object.entries(translations)){
    const element=$(id);if(element)element.textContent=zh()?translationsZh[id]:en;
   }
   const placeholder=$('orbitPaste');if(placeholder)placeholder.placeholder=say('Example: Your verification code is 123456','示例：您的验证码是 123456');
  }
  function empty(){codes.replaceChildren();links.replaceChildren();status.textContent='';}
  function item(tag,className,value){
   const el=doc.createElement(tag);if(className)el.className=className;if(value!==undefined)el.textContent=value;return el;
  }
  btn.addEventListener('click',()=>{
   empty();
   const analyzed=inspect(input.value);
   status.textContent=say('Analyzed locally. Patterns are suggestions, not validated mail.','已在当前浏览器完成解析。结果仅为文字模式匹配，并非邮件可信性认证。')+
     (analyzed.truncated?say(' Input was limited to 32,000 characters.',' 仅处理前 32,000 个字符。'):'');
   if(!analyzed.codes.length)codes.append(item('p','orbit-empty',say('No code with a clear verification context found.','没有找到上下文明确的验证码。')));
   for(const code of analyzed.codes){
    const row=item('div','orbit-result-row');
    const value=item('code','orbit-code','•'.repeat(code.length));
    const reveal=item('button','btn ghost',say('Reveal','显示'));reveal.type='button';
    reveal.addEventListener('click',()=>{value.textContent=code;reveal.disabled=true;});
    const copy=item('button','btn ghost',say('Copy','复制'));copy.type='button';
    copy.addEventListener('click',async()=>{
     try{await root.navigator.clipboard.writeText(code);copy.textContent=say('Copied','已复制');}
     catch{copy.textContent=say('Clipboard blocked','复制受限');}
    });
    row.append(value,reveal,copy);codes.append(row);
   }
   if(!analyzed.links.length)links.append(item('p','orbit-empty',say('No HTTPS URL found.','没有发现 HTTPS 链接。')));
   for(const entry of analyzed.links){
    const row=item('div','orbit-result-row');
    const text=item('span','orbit-link-host',entry.host+(entry.pathname!=='/'?entry.pathname:''));
    const state=item('small','orbit-link-risk',entry.blocked?say('Blocked by URL rules','网址规则已拦截'):say('Not safety-verified','未通过安全认证'));
    row.append(text,state);
    if(!entry.blocked){
      const copy=item('button','btn ghost',say('Copy exact URL','复制完整链接'));copy.type='button';
      copy.title=say('May contain secret access tokens. Review before pasting elsewhere.','可能含有敏感访问 Token，请自行检查后再粘贴。');
      copy.addEventListener('click',async()=>{
       try{await root.navigator.clipboard.writeText(entry.url);copy.textContent=say('Copied','已复制');}
       catch{copy.textContent=say('Clipboard blocked','复制受限');}
      });
      row.append(copy);
    }
    links.append(row);
   }
  });
  clear.addEventListener('click',()=>{input.value='';empty();status.textContent=say('Input cleared from this page.','已从本页面清除输入内容。');});
  root.addEventListener('aq:language-change',label);
  label();
 }
 const api=Object.freeze({inspect,ORBIT_URL,mount});
 root.AVENQIR_ORBIT_BRIDGE=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root.document){
  if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
 }
})(typeof window!=='undefined'?window:globalThis);
