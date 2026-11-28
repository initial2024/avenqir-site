"use strict";
// Ordinary public browser only; no challenge bypass, injected cookies or UA override.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process');
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'aq-public-v154-'));
const child=spawn('google-chrome',['--headless','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let ws;
(async()=>{
 try{
  const f=path.join(profile,'DevToolsActivePort');
  for(let i=0;i<150&&!fs.existsSync(f);i++)await delay(100);
  const port=fs.readFileSync(f,'utf8').split('\n')[0];
  let target;
  for(let i=0;i<50&&!target;i++){try{target=(await (await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(x=>x.type==='page');}catch{}if(!target)await delay(200);}
  if(!target)throw Error('No browser page');
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true});});
  let serial=0;const pending=new Map();
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p[1](Error(m.error.message)):p[0](m.result);}});
  const call=(method,params={})=>new Promise((ok,bad)=>{const id=++serial;pending.set(id,[ok,bad]);ws.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error('Page expression failed');return r.result.value;};
  const wait=async(expression,ms)=>{const deadline=Date.now()+ms;while(Date.now()<deadline){try{if(await evaluate(expression))return;}catch{}await delay(300);}throw Error('Public browser condition failed: '+expression.slice(0,130));};
  await call('Page.enable');await call('Runtime.enable');
  await call('Page.navigate',{url:'https://avenqir.bg5.net/directory.html'});
  await wait("location.origin==='https://avenqir.bg5.net'&&!!document.getElementById('atlasQuery')&&window.AVENQIR_RESEARCH_MANIFEST?.sha256==='dc1c46e99d38a4476592b83f16a80f73e2222b1aa1ce0044d97f46118bcaa0b2'&&document.getElementById('atlasSemanticPanel')?.dataset.state==='idle'",30000);
  const initial=await evaluate("(async()=>{const u=new URL('/semantic-v2/atlas-semantic-bundle-v2-dc1c46e99d38a4476592b83f.json',location.href).href;let cached=false;for(const k of await caches.keys())if(await (await caches.open(k)).match(u))cached=true;return {cached,requested:performance.getEntriesByName(u).length,hidden:document.getElementById('atlasSemanticPanel').hidden}})()");
  if(initial.cached||initial.requested||!initial.hidden)throw Error('Model downloaded before consent');
  await evaluate("document.getElementById('atlasSemanticOpen').click();document.getElementById('atlasSemanticDownload').click();true");
  await wait("document.getElementById('atlasSemanticPanel')?.dataset.state==='ready'",55000);
  const cache=await evaluate("(async()=>{const u=new URL('/semantic-v2/atlas-semantic-bundle-v2-dc1c46e99d38a4476592b83f.json',location.href).href;const r=await (await caches.open('avenqir-semantic-model-v2-candidate')).match(u);if(!r)return null;const b=await r.arrayBuffer();return {bytes:b.byteLength,sha:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('')}})()");
  if(cache?.bytes!==92260||cache.sha!=='dc1c46e99d38a4476592b83f16a80f73e2222b1aa1ce0044d97f46118bcaa0b2')throw Error('Browser cache integrity failure');
  await evaluate("document.getElementById('atlasQuery').value='QR 코드 생성';document.getElementById('atlasForm').requestSubmit();true");
  await wait("[...document.querySelectorAll('#atlasResults .atlas-result-title')].some(a=>/QRCode Monkey/i.test(a.textContent))&&!!document.querySelector('#atlasResults .atlas-semantic-match')",12000);
  await wait("[...document.scripts].some(s=>s.src.includes('atlas-semantic-directory-adapter.js?v=154-15ca06299ff36d17'))&&document.getElementById('atlasSemanticQueryState')?.dataset.state==='hit'",12000);
  await evaluate("document.getElementById('atlasQuery').value='큐알코드 만들기';document.getElementById('atlasForm').requestSubmit();true");
  await wait("document.getElementById('atlasSemanticQueryState')?.dataset.state==='hit'&&[...document.querySelectorAll('#atlasResults .atlas-result-title')].some(a=>/QRCode Monkey/i.test(a.textContent))",12000);
  await evaluate("document.getElementById('atlasQuery').value='코드 생성';document.getElementById('atlasForm').requestSubmit();true");
  await wait("document.getElementById('atlasNoMatchDialog')?.open&&document.getElementById('atlasSemanticDialogClarification')?.hidden===false&&document.getElementById('atlasSemanticDialogQueryState')?.dataset.state==='miss'",12000);
  const choices=await evaluate("[...document.querySelectorAll('#atlasSemanticDialogClarification button')].map(b=>b.textContent)");
  if(JSON.stringify(choices)!==JSON.stringify(['QR 코드 생성','프로그래밍 자료','AI 도구']))throw Error('Public ambiguity choices differ');
  await evaluate("document.getElementById('atlasSemanticDialogClarification').querySelector('button').click();true");
  await wait("document.getElementById('atlasQuery').value==='QR 코드 생성'&&document.getElementById('atlasSemanticQueryState')?.dataset.state==='hit'&&!!document.querySelector('#atlasResults .atlas-semantic-match')",12000);
  console.log('PUBLIC_V154_BROWSER_PASS',JSON.stringify({consent:true,download:true,cacheBytes:cache.bytes,cacheSHA256:cache.sha,semanticQuery:true,revision:'15ca06299ff36d17',shortKorean:true,ambiguityChoice:true,queryState:true}));
 }catch(e){console.error('PUBLIC_V154_BROWSER_FAIL',e.message);process.exitCode=1;}
 finally{try{ws?.close()}catch{}child.kill('SIGTERM');}
})().catch(e=>{console.error(e.message);process.exitCode=1;child.kill('SIGTERM');});
