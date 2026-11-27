#!/usr/bin/env python3
"""Real Chromium research worker test; localhost only, no production deployment."""
import hashlib
import http.server
import json
import pathlib
import shutil
import subprocess
import tempfile
import threading
from urllib.parse import urlsplit

ROOT = pathlib.Path(__file__).resolve().parents[1]
CHROME = shutil.which('google-chrome') or shutil.which('chromium')
assert CHROME
SCRIPTS = ['atlas-paths','atlas-expansion','atlas-specialist','atlas-depth-a','atlas-depth-b','atlas-depth-c','atlas-depth-d','atlas-ai','atlas-regional','atlas-everyday','atlas-regional-ext','atlas-everyday-ext','atlas-popular-links','atlas-catalog-core']
MODEL = '/research/atlas-model-v2.packed.json'
digests = {p: hashlib.sha256((ROOT / p.lstrip('/')).read_bytes()).hexdigest() for p in [MODEL]}
requests = []
lengths = {p: (ROOT / p.lstrip('/')).stat().st_size for p in [MODEL]}
HTML = '<!doctype html><title>Research worker QA</title>' + ''.join('<script src="/site/'+s+'.js"></script>' for s in SCRIPTS) + '<script src="/research/atlas-worker-client.js"></script><script src="/research/atlas-candidate-loader.js"></script><script>const hashes=' + json.dumps(digests) + ';const sizes=' + json.dumps(lengths) + ';' + """
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
 const [packed]=await Promise.all(Object.keys(hashes).map(verified));
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
 yes(!errors.length&&results[3].urls.length===0,'ungrounded intent');
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

 const specs=Object.keys(hashes).map(file=>({file,bytes:sizes[file],sha256:hashes[file]}));
 const loader=AVENQIR_RESEARCH_LOADER.create(specs);
 let activations=0,closes=0,progress=[],current=null;
 const activate=(values,signal)=>new Promise((resolve,reject)=>{
  yes(values.length===1&&values[0]===packed,'incorrect staged bytes');
  const worker=new Worker('/research/atlas-search-worker.js');
  let settled=false,closed=false;const hits=[];
  const close=()=>{if(closed)return;closed=true;worker.terminate();closes++;};
  const fail=code=>{if(settled)return;settled=true;signal.removeEventListener('abort',abort);close();reject(Error(code));};
  const abort=()=>fail('cancelled');
  const candidate=AVENQIR_RESEARCH_WORKER_CLIENT.create(worker,(urls,q,ms)=>hits.push({urls,q,ms}),fail,count=>{
   if(signal.aborted){abort();return;}if(count<1338){fail('catalog');return;}
   settled=true;signal.removeEventListener('abort',abort);activations++;
   current={query:q=>candidate.query(q),hits,close};resolve(current);
  });
  signal.addEventListener('abort',abort,{once:true});
  if(signal.aborted){abort();return;}
  candidate.init(values[0],items);
 });
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
 document.documentElement.dataset.result='pass';
})().catch(e=>{document.documentElement.dataset.result='fail';document.documentElement.dataset.error=e.message;});
</script>"""
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*args,**kw):super().__init__(*args,directory=str(ROOT),**kw)
    def log_message(self,*args):pass
    def do_GET(self):
        p=urlsplit(self.path).path
        requests.append(p)
        if p=='/qa.html':
            data=HTML.encode();self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data);return
        if not ((p.startswith('/site/') or p.startswith('/research/')) and p.endswith(('.js','.json')) and '..' not in p):
            self.send_error(404);return
        super().do_GET()
with http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler) as server:
    threading.Thread(target=server.serve_forever,daemon=True).start()
    with tempfile.TemporaryDirectory() as profile:
        subprocess.run(['node',str(ROOT/'tests'/'chrome_real_time.cjs'),CHROME,profile,f'http://127.0.0.1:{server.server_port}/qa.html'],timeout=75,check=True)
    assert requests.count(MODEL)==4,requests
    assert '/site/atlas-semantic-model-v1.json' not in requests,requests
    print('PASS real Chromium packed model digest, worker, stale query rejection, Korean and Arabic retrieval, constraint and ungrounded abstention, corrupt payload rejection, fresh single-model install, real worker activation, cancellation and retry, verified cache restore and deletion')
    server.shutdown()
