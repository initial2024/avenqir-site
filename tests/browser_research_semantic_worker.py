#!/usr/bin/env python3
"""Real Chromium research worker test; localhost only, no production deployment."""
import hashlib
import gzip
import http.server
import json
import pathlib
import shutil
import subprocess
import tempfile
import threading
import sys
from urllib.parse import urlsplit

ROOT = pathlib.Path(__file__).resolve().parents[1]
CHROME = shutil.which('google-chrome') or shutil.which('chromium')
FIREFOX='--firefox' in sys.argv
if not FIREFOX: assert CHROME
SCRIPTS = ['atlas-paths','atlas-expansion','atlas-specialist','atlas-depth-a','atlas-depth-b','atlas-depth-c','atlas-depth-d','atlas-ai','atlas-regional','atlas-everyday','atlas-regional-ext','atlas-everyday-ext','atlas-popular-links','atlas-catalog-core']
MODEL = '/research/atlas-model-v2.packed.json'
FULL = '/research/atlas-semantic-bundle-v2.json'
FULL_RAW=(ROOT/FULL.lstrip('/')).read_bytes()
FULL_GZIP=gzip.compress(FULL_RAW,mtime=0)
digests = {p: hashlib.sha256((ROOT / p.lstrip('/')).read_bytes()).hexdigest() for p in [MODEL,FULL]}
requests = []
lengths = {p: (ROOT / p.lstrip('/')).stat().st_size for p in [MODEL,FULL]}
HTML = '<!doctype html><title>Research worker QA</title>' + ''.join('<script src="/site/'+s+'.js"></script>' for s in SCRIPTS) + '<script src="/research/atlas-multilingual-intents.js"></script><script src="/research/atlas-worker-client.js"></script><script src="/research/atlas-candidate-loader.js"></script><script src="/research/atlas-worker-activation.js"></script><script>const hashes=' + json.dumps(digests) + ';const sizes=' + json.dumps(lengths) + ';' + """
const yes=(v,m)=>{if(!v)throw Error(m);};
const wait=async f=>{for(let i=0;i<350;i++){if(f())return;await new Promise(r=>setTimeout(r,30));}throw Error('timeout');};
async function verified(p){
 const r=await fetch(p,{cache:'no-store'});yes(r.ok,'fetch '+p);
 const bytes=await r.arrayBuffer();
 const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
 yes(digest===hashes[p],'sha mismatch');
 return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}
(async()=>{
 const packed=await verified(Object.keys(hashes)[0]);
 const items=AVENQIR_ATLAS_CATALOG.catalog();
 yes(items.length>=1338,'missing catalog');
 const byURL=new Map(items.map(x=>[x.url,x.name]));
 const w=new Worker('/research/atlas-search-worker.js');
 const results=[],errors=[];
 const client=AVENQIR_RESEARCH_WORKER_CLIENT.create(w,(urls,q,ms)=>results.push({urls,q,ms}),code=>errors.push(code));
 client.init(packed,items);
 client.query('generate a qr code');
 client.query('QR 코드 생성');
 await wait(()=>results.length||errors.length);
 yes(!errors.length,'worker '+errors.join(','));
 yes(results.length===1&&results[0].q==='QR 코드 생성','stale results');
 yes(results[0].urls.some(u=>/QRCode Monkey/i.test(byURL.get(u))),'Korean QR miss');
 client.query('ضغط صورة');
 await wait(()=>results.length===2||errors.length);
 yes(!errors.length&&results[1].urls.some(u=>/Squoosh/i.test(byURL.get(u))),'Arabic image miss');
 client.query('ضغط صورة بدون تسجيل الدخول');
 await wait(()=>results.length===3||errors.length);
 yes(!errors.length&&results[2].urls.length===0,'constraint leak');
 client.query('合并PDF文件');
 await wait(()=>results.length===4||errors.length);
 yes(!errors.length&&results[3].urls.some(u=>/Adobe Acrobat PDF 合并/i.test(byURL.get(u))),'grounded PDF merge missing');
 client.close();
 // Corrupted bytes must not initialize a worker, even when bypassing page verification.
 const broken=new Worker('/research/atlas-search-worker.js');
 const rejected=[];
 const c2=AVENQIR_RESEARCH_WORKER_CLIENT.create(broken,()=>rejected.push('unexpected_result'),code=>rejected.push(code));
 c2.init(packed.slice(0,-8),items);
 c2.query('生成二维码');
 await wait(()=>rejected.length);
 yes(rejected[0]!=='unexpected_result','corrupt payload accepted');
 c2.close();

 const specs=[Object.keys(hashes)[0]].map(file=>({file,bytes:sizes[file],sha256:hashes[file]}));
 const loader=AVENQIR_RESEARCH_LOADER.create(specs);
 let activations=0,closes=0,progress=[],current=null;
 const activate=async(values,signal)=>{
  yes(values.length===1&&values[0]===packed,'incorrect staged bytes');
  const hits=[];
  const session=await AVENQIR_RESEARCH_ACTIVATION.activate({values,items,signal,workerURL:'/research/atlas-search-worker.js',onResult:(urls,q,ms)=>hits.push({urls,q,ms}),onError:code=>errors.push(code)});
  yes(session.count>=1338,'worker catalog count');
  activations++;
  let closed=false;current={query:session.query,hits,close(){if(!closed){closed=true;session.close();closes++;}}};return current;
 };
 let refused=false;
 try{await loader.load({activate});}catch(e){refused=e.message==='consent';}
 yes(refused&&!loader.active(),'download without consent');
 const missing=await loader.load({consent:true,restore:true,activate});
 yes(missing.state==='missing'&&activations===0,'unexpected restore');
 let cancelled=false;
 try{await loader.load({consent:true,activate,onProgress:()=>loader.cancel()});}catch(e){cancelled=e.message==='cancelled';}
 yes(cancelled&&!loader.active()&&activations===0,'cancel failed');
 const loaded=await loader.load({consent:true,activate,onProgress:p=>progress.push(p.bytes)});
 yes(loaded.state==='ready'&&loaded.persisted&&loader.active(),'candidate not saved');
 yes(progress.at(-1)===loader.total,'incorrect progress');
 current.query('QR 코드 생성');
 await wait(()=>current.hits.length);
 yes(current.hits[0].urls.some(u=>/QRCode Monkey/i.test(byURL.get(u))),'fresh worker query failed');
 const restored=await loader.load({consent:true,restore:true,activate});
 yes(restored.state==='ready'&&restored.persisted&&activations===2&&closes===1,'cache restore');
 current.query('ضغط صورة');
 await wait(()=>current.hits.length);
 yes(current.hits[0].urls.some(u=>/Squoosh/i.test(byURL.get(u))),'restored worker query failed');
 const invalid=AVENQIR_RESEARCH_LOADER.create([{...specs[0],sha256:'0'.repeat(64)}]);
 let integrity=false;try{await invalid.load({consent:true,activate});}catch(e){integrity=e.message==='integrity';}
 yes(integrity&&activations===2,'wrong digest accepted');
 await loader.remove();
 yes(!loader.active()&&closes===2,'remove failed');
 yes(!(await caches.has(AVENQIR_RESEARCH_LOADER.CACHE)),'candidate cache retained');

 // Use real browser cryptography, Response and Worker APIs, injecting host failure modes.
 const bytes=new TextEncoder().encode(packed);
 const envFor=(fetch,caches)=>({location,crypto,fetch,caches});
 const single=specs[0];
 async function expectCode(fetch,code){
  const l=AVENQIR_RESEARCH_LOADER.create(specs,envFor(fetch,undefined));
  let actual='';try{await l.load({consent:true,activate});}catch(e){actual=e.message;}
  yes(actual===code&&!l.active(),'expected '+code+', got '+actual);
 }
 await expectCode(async()=>new Response('<html>verification required</html>',{headers:{'Content-Type':'text/html'}}),'mime');
 await expectCode(async()=>new Response('',{status:404}),'http');
 await expectCode(async()=>new Response(bytes,{status:206,headers:{'Content-Type':'application/json','Content-Range':'bytes 0-9/10'}}),'http');
 await expectCode(async()=>new Response(bytes.slice(0,-1),{headers:{'Content-Type':'application/octet-stream'}}),'integrity');
 await expectCode(async()=>{throw TypeError('network');},'network');
 await expectCode(async()=>({ok:true,status:200,headers:new Headers({'Content-Type':'application/octet-stream'}),body:null,arrayBuffer:async()=>bytes.buffer}),'stream');
 const limited=AVENQIR_RESEARCH_LOADER.create(specs,envFor(async()=>({ok:true,status:200,headers:new Headers({'Content-Type':'application/octet-stream','Content-Length':String(bytes.length)}),body:null,arrayBuffer:async()=>bytes.buffer}),{open:async()=>{throw Error('storage denied');}}));
 const sessionOnly=await limited.load({consent:true,activate});
 yes(sessionOnly.state==='ready'&&!sessionOnly.persisted,'session-only fallback');
 current.query('QR 코드 생성');await wait(()=>current.hits.length);
 yes(current.hits[0].urls.some(u=>/QRCode Monkey/i.test(byURL.get(u))),'session fallback worker failed');

 current.query('пожалуйста, научные статьи');await wait(()=>current.hits.length===2);
 yes(current.hits[1].urls.length>0,'Russian broad topic miss');
 current.query('地图');await wait(()=>current.hits.length===3);
 yes(current.hits[2].urls.length>0,'short Chinese broad topic miss');
 current.query('من فضلك، ضغط صورة بدون تسجيل الدخول');await wait(()=>current.hits.length===4);
 yes(current.hits[3].urls.length===0,'Arabic request constraint leak');
 await limited.remove().catch(()=>{});
 yes(!limited.active(),'session fallback removal');

 // Fault-inject stalled storage on real browser cryptography/Response APIs.
 // No network calls are necessary; these assertions are separate from HTTP fixtures.
 const hang=()=>new Promise(()=>{});
 const good=async()=>new Response(bytes,{headers:{'Content-Type':'application/octet-stream'}});
 const dummy=async()=>({close(){}});
 const startHang=performance.now();
 const hungOpen=AVENQIR_RESEARCH_LOADER.create(specs,envFor(good,{open:hang}),80);
 const openState=await hungOpen.load({consent:true,activate:dummy});
 yes(openState.state==='ready'&&!openState.persisted&&hungOpen.active(),'hung open must permit session-only use');
 let discarded=0;
 const hungPut=AVENQIR_RESEARCH_LOADER.create(specs,envFor(good,{open:async()=>({put:hang}),delete:async()=>{discarded++;return true;}}),80);
 const putState=await hungPut.load({consent:true,activate:dummy});
 yes(putState.state==='ready'&&!putState.persisted&&discarded===1,'hung write must discard cache and permit session-only use');
 const hungMatch=AVENQIR_RESEARCH_LOADER.create(specs,envFor(async()=>{throw Error('restore must never fetch');},{open:async()=>({match:hang}),delete:async()=>true}),80);
 let restoreError='';try{await hungMatch.load({consent:true,restore:true,activate:dummy});}catch(e){restoreError=e.message;}
 yes(restoreError==='storage_timeout'&&!hungMatch.active(),'hung restore did not terminate');
 const oversizedCache=AVENQIR_RESEARCH_LOADER.create(specs,envFor(good,{open:async()=>({match:async()=>new Response(new Uint8Array(bytes.length+1))}),delete:async()=>true}),80);
 let oversizedError='';try{await oversizedCache.load({consent:true,restore:true,activate:dummy});}catch(e){oversizedError=e.message;}
 yes(oversizedError==='integrity'&&!oversizedCache.active(),'oversized cached payload accepted');
 yes(performance.now()-startHang<3000,'storage fault waits exceeded bound');
 await hungOpen.remove().catch(()=>{});await hungPut.remove();

 // An uncooperative API may ignore AbortSignal. Force actual deadline expiry
 // and check the caller settles, never activates stale bytes, and can retry.
 async function deadlineCase(name,env,activate){
  const instance=AVENQIR_RESEARCH_LOADER.create(specs,env,80,250);
  let reason='';const started=performance.now();
  try{await instance.load({consent:true,activate});}catch(e){reason=e.message;}
  yes(reason==='timeout'&&!instance.active(),name+' timeout diagnostic '+reason);
  yes(performance.now()-started<2000,name+' caller remained blocked');
 }
 await deadlineCase('fetch',envFor(hang,undefined),dummy);
 await deadlineCase('digest',{...envFor(good,undefined),crypto:{subtle:{digest:hang}}},dummy);
 let lateResolve=null,lateClosed=0;
 const late=AVENQIR_RESEARCH_LOADER.create(specs,envFor(good,undefined),80,500);
 let lateReason='';
 const lateLoad=late.load({consent:true,activate:()=>new Promise(resolve=>{lateResolve=resolve;})}).catch(e=>{lateReason=e.message;});
 await wait(()=>typeof lateResolve==='function');
 late.cancel();await lateLoad;
 yes(lateReason==='cancelled'&&!late.active(),'uncooperative activation not cancelled');
 lateResolve({close(){lateClosed++;}});
 await wait(()=>lateClosed===1);
 const retry=await late.load({consent:true,activate:dummy});
 yes(retry.state==='ready'&&late.active(),'late activation prevented retry');
 await late.remove();
 const stalledReader=()=>({ok:true,status:200,headers:new Headers({'Content-Type':'application/json','Content-Length':String(bytes.length)}),body:{getReader:()=>({read:hang,cancel:hang})}});
 await deadlineCase('stream',envFor(stalledReader,undefined),dummy);

 // A pending removal must exclude both activation and another removal.
 let finishRemoval=null,closeCount=0;
 const removalCache={open:async()=>({put:async()=>{}}),delete:()=>new Promise(resolve=>{finishRemoval=resolve;})};
 const serialRemoval=AVENQIR_RESEARCH_LOADER.create(specs,envFor(good,removalCache),1000);
 await serialRemoval.load({consent:true,activate:async()=>({close(){closeCount++;}})});
 const removing=serialRemoval.remove();
 await wait(()=>typeof finishRemoval==='function');
 yes(!serialRemoval.active()&&closeCount===1,'removal must close active session first');
 let busyLoad='',busyRemove='';
 try{await serialRemoval.load({consent:true,activate:dummy});}catch(e){busyLoad=e.message;}
 try{await serialRemoval.remove();}catch(e){busyRemove=e.message;}
 yes(busyLoad==='busy'&&busyRemove==='busy','removal operation lock missing');
 finishRemoval(true);await removing;
 const afterRemove=await serialRemoval.load({consent:true,activate:dummy});
 yes(afterRemove.state==='ready'&&serialRemoval.active(),'load after completed deletion failed');
 removalCache.delete=async()=>{throw Error('storage denied');};
 let failedDeletion=false;
 try{await serialRemoval.remove();}catch{failedDeletion=true;}
 yes(failedDeletion&&!serialRemoval.active(),'deletion failure retained activation');
 const afterFailure=await serialRemoval.load({consent:true,activate:dummy});
 yes(afterFailure.state==='ready','deletion failure left lock held');
 removalCache.delete=async()=>true;await serialRemoval.remove();
 // Exercise the full production bundle over real gzip HTTP transfer.
 const fullPath=Object.keys(hashes)[1];
 const fullLoader=AVENQIR_RESEARCH_LOADER.create([{file:fullPath,bytes:sizes[fullPath],sha256:hashes[fullPath]}]);
 let workerSession=null,resolveRank=null;
 const progressFull=[],start=performance.now();
 const fullState=await fullLoader.load({consent:true,onProgress:p=>progressFull.push(p.bytes),activate:async(values,signal)=>{
   workerSession=await AVENQIR_RESEARCH_ACTIVATION.activate({values,items,signal,workerURL:'/research/atlas-search-worker.js',onResult:(urls,q,ms,suggestions)=>resolveRank?.({urls,q,ms,suggestions}),onError:code=>{errors.push(code);resolveRank?.(null);}});
   return workerSession;
 }});
 const initMs=performance.now()-start;
 yes(fullState.state==='ready'&&fullState.bytes===sizes[fullPath]&&progressFull.at(-1)===sizes[fullPath],'gzip decoded progress mismatch');
 const entry=performance.getEntriesByName(new URL(fullPath,location.href).href).at(-1);
 yes(entry&&entry.encodedBodySize>0&&entry.encodedBodySize<entry.decodedBodySize&&entry.decodedBodySize===sizes[fullPath],'real gzip transfer not observed');
 const queries=AVENQIR_RESEARCH_MULTILINGUAL.rows[0].slice(1);
 async function rank(q,expectHits=true){
  const started=performance.now();
  const r=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('benchmark rank timeout')),4000);resolveRank=x=>{clearTimeout(timer);resolveRank=null;resolve(x);};workerSession.query(q);});
  yes(r&&r.q===q&&(expectHits?r.urls.length>0:r.urls.length===0),'benchmark result mismatch '+q);
  return {urls:r.urls,suggestions:r.suggestions,worker:r.ms,wall:performance.now()-started};
 }
 const cold=[],warm=[];
 for(const q of queries)cold.push(await rank(q));
 for(let i=0;i<queries.length;i++){const r=await rank(queries[i]);yes(JSON.stringify(r.urls)===JSON.stringify(cold[i].urls),'cache parity');warm.push(r);}
 const sorted=(arr,k)=>arr.map(x=>x[k]).sort((a,b)=>a-b);
 const quantile=(arr,p)=>arr[Math.ceil(arr.length*p)-1];
 const metrics={catalog:items.length,queries:queries.length,initMs,encodedBytes:entry.encodedBodySize,decodedBytes:entry.decodedBodySize,coldWorkerP95:quantile(sorted(cold,'worker'),.95),warmWorkerP95:quantile(sorted(warm,'worker'),.95),coldWallP95:quantile(sorted(cold,'wall'),.95),warmWallP95:quantile(sorted(warm,'wall'),.95)};
 yes(metrics.queries===36&&metrics.coldWallP95<2000&&metrics.warmWallP95<2000,'query latency budget exceeded');
 // Real Worker checks cover the new runtime path, not merely canonical aliases.
 const varied=[
  ['genertae a qr code','generate a qr code'],
  ['please genertae a qr code','generate a qr code'],
  ['comprses a PDF','compress a PDF'],
  ['valdiate HTML','validate HTML'],
  ['生成 QR code','generate a qr code'],
  ['看看域名解析在各地有没有生效','check DNS propagation'],
  ['時差のある相手と会議できる時間を探す','plan a meeting across time zones'],
  ['사진의 배경을 투명하게 만들기','remove image background'],
  ['تنسيق المصادر لقائمة المراجع','generate a bibliography']
 ];
 const variedTimes=[],rejectTimes=[];
 for(const [q,canonical] of varied){
  const actual=await rank(q),expected=await rank(canonical);
  yes(JSON.stringify(actual.urls)===JSON.stringify(expected.urls),'varied parity '+q);
  variedTimes.push(actual.wall);
  const rejected=await rank(q+' without upload',false);rejectTimes.push(rejected.wall);
 }

 // Measure the actual Worker path for full-query composition independently of
 // the reviewed exact alias tables.
 const structuredQueries=[
  ['join my four PDFs into one document','pdf-merge'],
  ['divide this PDF report into separate pages','pdf-split'],
  ['reduce the file size of my JPEG for email','image-compress'],
  ['set this picture background transparent','image-background'],
  ['see whether my DNS update has propagated globally','dns-propagation'],
  ['look up the AAAA records for my domain','dns-lookup'],
  ['test whether this regex matches a string','regex-test'],
  ['把这份PDF按页分成多个文件','pdf-split'],
  ['把这张照片文件体积压小一些','image-compress'],
  ['确认我的DNS更新在全球是否生效','dns-propagation'],
  ['pretty print my JSON document with indentation','json-edit'],
  ['调整这张照片的像素尺寸','image-resize'],
  ['三つのPDFファイルを一つの文書にまとめたい','pdf-merge'],
  ['사진의 용량을 줄여서 보내고 싶어요','image-compress'],
  ['Hacer el fondo de una imagen transparente','image-background'],
  ['consulter les enregistrements AAAA de mon domaine','dns-lookup'],
  ['meine JSON-Datei formatieren','json-edit'],
  ['ลดขนาดไฟล์รูปภาพเพื่อส่งอีเมล','image-compress']
 ];
 const structureTimes=[];
 for(const [q,id] of structuredQueries){
  const index=AVENQIR_RESEARCH_MULTILINGUAL.tasks.indexOf(id);
  yes(index>=0,'missing structured task '+id);
  const actual=await rank(q),expected=await rank(queries[index]);
  yes(JSON.stringify(actual.urls)===JSON.stringify(expected.urls),'structured parity '+q);
  structureTimes.push(actual.wall);
  await rank(q+' without upload',false);
 }
 metrics.structuredQueries=structureTimes.length;
 metrics.structuredWallP95=quantile(structureTimes.sort((a,b)=>a-b),.95);
 yes(metrics.structuredWallP95<1000,'structured latency budget exceeded');
 const propertyCases=['PDF Passwort wiederherstellen','PDFの電子署名を確認','Chci obnovit zapomenuté heslo souboru PDF','QR 코드 스캔','QR-Code auslesen','อ่านข้อมูลในคิวอาร์โค้ด','PDF ทำงานอย่างไร','ＰＤＦ ทำงานอย่างไร','PDF ทํางานอย่างไร','Einen beschädigten PDF reparieren','Die Funktionsweise eines QR-Codes erklären','Comprimir un PDF sin enviar datos a nadie'];
 for(const q of propertyCases){const r=await rank(q,false);rejectTimes.push(r.wall);}
 metrics.propertyQueries=propertyCases.length;
 metrics.variedQueries=varied.length;metrics.variedWallP95=quantile(variedTimes.sort((a,b)=>a-b),.95);
 metrics.rejectedQueries=rejectTimes.length;metrics.rejectedWallP95=quantile(rejectTimes.sort((a,b)=>a-b),.95);
 yes(metrics.variedWallP95<1000&&metrics.rejectedWallP95<1000,'varied query latency budget exceeded');

 // Verify the real message path and explicit acceptance using the same
 // reviewed operation edits as the offline suite. Never synthesize a result.
 const verbs=new Set(['generate','compress','validate','measure','translate','inspect','practice','convert','preview','remove','resize']);
 const suggestionCases=new Map();
 for(const [index,phrase] of queries.entries()){
  const words=AVENQIR_RESEARCH_MULTILINGUAL.normalize(phrase).split(' ');
  for(const [j,word] of words.entries()){
   if(!verbs.has(word))continue;
   const k=Math.floor(word.length/2);
   for(const typo of [word.slice(0,k)+word.slice(k+1),word.slice(0,k)+word[k]+word.slice(k),word.slice(0,k)+'z'+word.slice(k+1)]){
    if(typo!==word)suggestionCases.set(words.map((w,n)=>n===j?typo:w).join(' '),index);
   }
  }
 }
 function responseFor(q){
  return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('suggestion timeout')),4000);resolveRank=x=>{clearTimeout(timer);resolveRank=null;resolve(x);};workerSession.query(q);});
 }
 let suggestedCount=0,alreadyRanked=0;
 for(const [q,index] of suggestionCases){
  const r=await responseFor(q);
  yes(r&&r.q===q&&Array.isArray(r.suggestions),'missing suggestion response '+q);
  if(r.urls.length){yes(!r.suggestions.length,'suggestion despite results');alreadyRanked++;continue;}
  yes(r.suggestions.length===1,'missing reviewed correction '+q);
  const replacement=r.suggestions[0];
  yes(replacement.id===AVENQIR_RESEARCH_MULTILINGUAL.tasks[index],'wrong suggestion '+q);
  const selected=await rank(replacement.phrase);
  yes(JSON.stringify(selected.urls)===JSON.stringify(cold[index].urls),'explicit selection parity '+q);
  const rejected=await responseFor(q+' without upload');
  yes(rejected&&rejected.urls.length===0&&rejected.suggestions.length===0,'constraint bypass '+q);
  suggestedCount++;
 }
 yes(suggestedCount>0&&suggestedCount+alreadyRanked===suggestionCases.size,'suggestion coverage mismatch');
 // Back-to-back queries must not deliver a stale suggestion.
 const first=[...suggestionCases.keys()][0],latest='generate a qr code';
 const last=new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('latest suggestion timeout')),4000);
  resolveRank=x=>{clearTimeout(timer);resolveRank=null;resolve(x);};
  workerSession.query(first);workerSession.query(latest);
 });
 const latestResult=await last;
 yes(latestResult?.q===latest&&latestResult.urls.length&&!latestResult.suggestions.length,'stale suggestion escaped client');
 metrics.suggestionProbes=suggestionCases.size;metrics.suggestionCount=suggestedCount;metrics.suggestionAlreadyRanked=alreadyRanked;metrics.suggestionLatestWins=true;
 await fullLoader.remove();
 yes(!await caches.has(AVENQIR_RESEARCH_LOADER.CACHE),'full model cache retained');
 document.documentElement.dataset.metrics=JSON.stringify(metrics);
 document.documentElement.dataset.result='pass';
})().catch(e=>{document.documentElement.dataset.result='fail';document.documentElement.dataset.error=e.message;});
</script>"""
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*args,**kw):super().__init__(*args,directory=str(ROOT),**kw)
    def log_message(self,*args):pass
    def do_GET(self):
        p=urlsplit(self.path).path
        requests.append(p)
        if p==FULL:
            self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Content-Encoding','gzip');self.send_header('Content-Length',str(len(FULL_GZIP)));self.end_headers();self.wfile.write(FULL_GZIP);return
        if p=='/qa.html':
            data=HTML.encode();self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data);return
        if not ((p.startswith('/site/') or p.startswith('/research/')) and p.endswith(('.js','.json')) and '..' not in p):
            self.send_error(404);return
        super().do_GET()
with http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler) as server:
    threading.Thread(target=server.serve_forever,daemon=True).start()
    url=f'http://127.0.0.1:{server.server_port}/qa.html'
    if FIREFOX:
        subprocess.run([sys.executable,str(ROOT/'tests'/'firefox_real_time.py'),url],timeout=175,check=True)
    else:
        with tempfile.TemporaryDirectory() as profile:
            subprocess.run(['node',str(ROOT/'tests'/'chrome_real_time.cjs'),CHROME,profile,url],timeout=75,check=True)
    assert requests.count(MODEL)==4,requests
    assert requests.count(FULL)==1,requests
    assert '/site/atlas-semantic-model-v1.json' not in requests,requests
    print('PASS real '+('Firefox' if FIREFOX else 'Chromium')+' packed model digest, worker, stale query rejection, Korean and Arabic retrieval, constraint and ungrounded abstention, corrupt payload rejection, fresh single-model install, real worker activation, cancellation and retry, verified cache restore and deletion, MIME/404/truncated/network rejection, bounded non-stream fallback and session-only storage denial, localized broad topics and polite request constraints, bounded stalled storage and oversized cache rejection, uncooperative fetch/digest/stream deadline and late activation disposal, full gzip model transfer, 36 cold/warm worker queries, explicit suggestion selection and stale suggestion suppression')
    server.shutdown()
