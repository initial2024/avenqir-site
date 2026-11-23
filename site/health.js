"use strict";
(()=>{
const $=id=>document.getElementById(id),key='avenqir_v7_last_health';
try{$('healthLast').textContent=localStorage.getItem(key)||'暂无'}catch{}
$('healthRun').addEventListener('click',async()=>{
 const btn=$('healthRun');btn.disabled=true;$('healthResults').replaceChildren();$('healthMessage').textContent='正在进行一次性检查…';
 const tests=[['静态页面','index.html?check=1'],['PHP 运行','status.php?check=1'],['公开目录 API','public-api.php?check=1']];let successes=0;
 for(const [title,url] of tests){let message='',ok=false;const start=performance.now();const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),6500);
 try{const response=await fetch(url,{cache:'no-store',credentials:'omit',signal:ctl.signal});if(!response.ok)throw Error('HTTP '+response.status);
 if(title==='PHP 运行'){const o=await response.json();if(o.runtime!=='PHP'||!o.ok)throw Error('并未得到有效 PHP 结果');}
 if(title==='公开目录 API'){const o=await response.json();if(o.ok!==true||!Array.isArray(o.items))throw Error('服务器数据格式不符');}
 ok=true;successes++;message='正常 · '+Math.round(performance.now()-start)+' 毫秒';
 }catch(e){message='未通过 · '+String(e.message).slice(0,130)}finally{clearTimeout(tm)}
 const line=document.createElement('div');line.className='record';const h=document.createElement('strong');h.textContent=title+' · '+(ok?'PASS':'CHECK');const v=document.createElement('p');v.textContent=message;line.append(h,v);$('healthResults').append(line);
 }
 const now=new Date().toLocaleString();$('healthAt').textContent=now;
 $('healthMessage').textContent=successes+' / 3 项检查成功。这不是连续在线时长，也不代表被判定为服务活跃。';
 if(successes===tests.length){try{localStorage.setItem(key,now)}catch{}$('healthLast').textContent=now}
 btn.disabled=false;
});})();