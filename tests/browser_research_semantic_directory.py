#!/usr/bin/env python3
"""Actual directory UI with full v2 candidate injected only into localhost QA."""
import http.server, pathlib, shutil, subprocess, tempfile, threading, time, sys, atexit, socket, hashlib
from urllib.parse import urlsplit
SITE=pathlib.Path(__file__).resolve().parents[1]/'site'
CHROME=shutil.which('google-chrome') or shutil.which('chromium')
FIREFOX='--firefox' in sys.argv
if not FIREFOX: assert CHROME
ROOT=SITE.parent
PACKAGED='--packaged' in sys.argv
if PACKAGED:
    staging=tempfile.TemporaryDirectory(prefix='avenqir-v154-site-')
    atexit.register(staging.cleanup)
    SITE=pathlib.Path(staging.name)/'site'
    subprocess.run(['node',str(ROOT/'scripts'/'build_semantic_candidate.cjs'),str(SITE)],check=True)
    MODEL=(ROOT/'research'/'atlas-semantic-bundle-v2.json').read_bytes()
    hosted_name='atlas-semantic-bundle-v2-'+hashlib.sha256(MODEL).hexdigest()[:24]+'.json'
    MODEL_PATH='/semantic-v2/'+hosted_name
    assert (SITE/MODEL_PATH.lstrip('/')).read_bytes()==MODEL
    assert not (SITE/'semantic-v2'/'atlas-semantic-bundle-v2.json').exists()
    DIRECTORY=(SITE/'directory.html').read_text(encoding='utf-8')
else:
    MODEL=(ROOT/'research'/'atlas-semantic-bundle-v2.json').read_bytes()
    MODEL_PATH='/research/atlas-semantic-bundle-v2.json'
    CANDIDATE_SCRIPTS=['atlas-semantic-manifest.js','atlas-semantic-locales.js','atlas-candidate-loader.js','atlas-worker-client.js','atlas-worker-activation.js','atlas-semantic-directory-adapter.js']
    DIRECTORY=(SITE/'directory.html').read_text(encoding='utf-8').replace('<script src="atlas-semantic-download.js?v=150" defer></script>',''.join('<script src="/research/'+x+'" defer></script>' for x in CANDIDATE_SCRIPTS))
assert 'atlas-semantic-directory-adapter.js' in DIRECTORY
DIRECTORY_JS=(SITE/'directory.js').read_text(encoding='utf-8')
assert 'T,()=>records);' in DIRECTORY_JS
requests=[]
mode='bad'
FIXTURE="""<!doctype html><title>Model QA</title><iframe id="frame" style="width:390px;height:844px;border:0" src="/directory.html"></iframe><script>
const wait=async f=>{for(let i=0;i<400;i++){if(f())return;await new Promise(r=>setTimeout(r,30));}throw Error('timed out');};
const yes=(v,m)=>{if(!v)throw Error(m)};
(async()=>{
 const w=document.getElementById('frame').contentWindow;
 await wait(()=>w.document.getElementById('atlasSemanticPanel')?.dataset.state==='idle'&&w.document.querySelector('#atlasResults article'));
 const $=id=>w.document.getElementById(id),panel=()=> $('atlasSemanticPanel');
 const query=q=>{$('atlasQuery').value=q;$('atlasForm').requestSubmit();};
 const modelURL=()=>new URL('MODEL_PATH_PLACEHOLDER',w.location.href).href;
 yes(panel().hidden,'fresh page should not interrupt');
 if('serviceWorker' in w.navigator){
  await wait(()=>!!w.navigator.serviceWorker.controller);
  yes(w.navigator.serviceWorker.controller.scriptURL.includes('/sw.js'),'unexpected worker controller');
  const caches=await w.caches.keys();
  for(const key of caches){const c=await w.caches.open(key);yes(!await c.match(modelURL()),'model in cache before consent');}
  yes(w.performance.getEntriesByName(modelURL()).length===0,'worker preloaded optional weights');
 }
 query('githbu');
 yes(!panel().hidden,'first search must offer download');
 yes([...w.document.querySelectorAll('#atlasResults .atlas-result-title')].some(a=>a.textContent.includes('GitHub')),'typo result must work without model');
 yes($('atlasSemanticSize').textContent.includes('90.1 KiB'),'actual pinned size not shown');
 yes(w.performance.getEntriesByName(modelURL()).length===0,'download before consent');
 $('atlasSemanticLater').click();
 query('GitHub');yes(panel().hidden,'decline must suppress repeated offer');
 $('atlasSemanticOpen').click();
 $('atlasSemanticDownload').click();
 yes(panel().dataset.state==='downloading'&&!$('atlasSemanticCancel').hidden,'download and cancel controls missing');
 $('atlasSemanticCancel').click();
 await wait(()=>panel().dataset.state==='cancelled');
 $('atlasSemanticDownload').click();
 await wait(()=>panel().dataset.state==='error');
 yes($('atlasSemanticStatus').textContent.includes('[integrity]'),'integrity diagnostics missing');
 yes(!w.localStorage.getItem('avenqir.semantic.preference.v2')||w.localStorage.getItem('avenqir.semantic.preference.v2')==='declined','corrupt model enabled');
 const failedCache=await w.caches.open('avenqir-semantic-model-v2-candidate');
 yes(!await failedCache.match(modelURL()),'corrupt model saved');

 // Real HTTP responses, not synthetic fetch replacement: hosting challenge and temporary outage.
 for(const [endpoint,code] of [['/fixture-html','mime'],['/fixture-unavailable','http'],['/fixture-rate-limit','rate_limited'],['/fixture-truncated','network']]){
  await fetch(endpoint);
  $('atlasSemanticDownload').click();
  await wait(()=>panel().dataset.state==='error');
  yes($('atlasSemanticStatus').textContent.includes('['+code+']'),'missing real HTTP failure diagnostic '+code+' actual='+$('atlasSemanticStatus').textContent);
  yes(!await failedCache.match(modelURL()),'unverified host response cached');
  query('GitHub');
  yes([...w.document.querySelectorAll('#atlasResults .atlas-result-title')].some(a=>a.textContent.includes('GitHub')),'ordinary search failed during outage');
 }
 await fetch('/fixture-valid');
 // Fault injection at the real Cache API commit boundary, after real Worker ready.
 const NativeWorker=w.Worker, originalPut=w.Cache.prototype.put;
 let activatedWorker=null, injected=false;
 w.Worker=class extends NativeWorker{constructor(...args){super(...args);activatedWorker=this;}};
 w.Cache.prototype.put=async function(key,response){
  const result=await originalPut.call(this,key,response);
  if(!injected&&String(key)===modelURL()&&activatedWorker){
   injected=true;activatedWorker.dispatchEvent(new w.Event('error'));
  }
  return result;
 };
 $('atlasSemanticDownload').click();
 await wait(()=>injected&&panel().dataset.state==='error'&&!$('atlasSemanticDownload').hidden);
 yes($('atlasSemanticStatus').textContent.includes('[worker]'),'worker commit-race diagnostic lost');
 yes(!await w.caches.has('avenqir-semantic-model-v2-candidate'),'failed activation cache retained');
 yes(w.localStorage.getItem('avenqir.semantic.preference.v2')!=='enabled','failed activation enabled');
 w.Worker=NativeWorker;w.Cache.prototype.put=originalPut;
 query('GitHub');
 yes([...w.document.querySelectorAll('#atlasResults .atlas-result-title')].some(a=>a.textContent.includes('GitHub')),'ordinary search failed after worker error');
 // The actual browser can deny persistent writes (quota/private mode).
 // Verified bytes and a live worker should still work for this page session.
 w.Cache.prototype.put=async function(key,response){
  if(String(key)===modelURL())throw new w.DOMException('fixture quota exceeded','QuotaExceededError');
  return originalPut.call(this,key,response);
 };
 $('atlasSemanticDownload').click();
 await wait(()=>panel().dataset.state==='ready');
 yes(!await w.caches.has('avenqir-semantic-model-v2-candidate'),'quota failure left partial cache');
 yes(w.localStorage.getItem('avenqir.semantic.preference.v2')!=='enabled','session-only model persisted enabled preference');
 query('QR 코드 생성');
 await wait(()=>[...w.document.querySelectorAll('#atlasResults .atlas-result-title')].some(a=>/QRCode Monkey/i.test(a.textContent)));
 yes(w.document.querySelector('#atlasResults .atlas-semantic-match'),'session fallback did not rank');
 w.Cache.prototype.put=originalPut;
 // A session-only install must never imply persistent enablement or fetch on reload.
 await fetch('/fixture-block');
 const sessionDoc=w.document;w.location.reload();
 await wait(()=>w.document!==sessionDoc&&w.document.getElementById('atlasSemanticPanel')?.dataset.state==='idle');
 yes(!w.localStorage.getItem('avenqir.semantic.preference.v2'),'missing cache preference not reset');
 await fetch('/fixture-valid');
 $('atlasSemanticOpen').click();
 if(panel().hidden)$('atlasSemanticOpen').click();
 let intermediate=false;
 const obs=new w.MutationObserver(()=>{const v=$('atlasSemanticProgress').value;const txt=$('atlasSemanticDetail').textContent;if(v>0&&v<w.AVENQIR_RESEARCH_MANIFEST.bytes&&txt.includes('/s'))intermediate=true;});
 obs.observe($('atlasSemanticDetail'),{childList:true,subtree:true,characterData:true});
 $('atlasSemanticDownload').click();
 await wait(()=>panel().dataset.state==='ready');obs.disconnect();
 yes(intermediate,'actual partial-byte progress and speed were not observed');
 yes($('atlasSemanticProgress').value===w.AVENQIR_RESEARCH_MANIFEST.bytes,'complete byte progress missing');
 yes($('atlasSemanticDetail').textContent.includes('100%'),'100% not shown');
 yes(w.localStorage.getItem('avenqir.semantic.preference.v2')==='enabled','consent not saved');
 query('QR 코드 생성');
 yes(!$('atlasNoMatchDialog').open,'premature no-match dialog while worker is pending');
 await wait(()=>[...w.document.querySelectorAll('#atlasResults .atlas-result-title')].some(a=>/QRCode Monkey/i.test(a.textContent)));
 yes(w.document.querySelector('#atlasResults .atlas-semantic-match'),'semantic result not labelled');
 w.AVENQIR_I18N.set('ar');yes($('atlasSemanticTitle').textContent==='البحث الدلالي المحلي','Arabic localization');
 w.AVENQIR_I18N.set('ja');yes($('atlasSemanticDownload').textContent==='ダウンロードして有効化','Japanese localization');
 w.AVENQIR_I18N.set('en');
 yes([...w.document.querySelectorAll('#atlasResults .atlas-result-title')].every(a=>w.AVENQIR_ATLAS_CATALOG.catalog().some(x=>a.textContent.includes(x.name))),'invented catalog entry');
 const cache=await w.caches.open('avenqir-semantic-model-v2-candidate');
 yes((await cache.match(modelURL()))?.ok,'verified model cache missing');
 for(const key of await w.caches.keys())if(key!=='avenqir-semantic-model-v2-candidate'){
  yes(!await (await w.caches.open(key)).match(modelURL()),'weight duplicated in shell cache');
 }
 // Reload without network model access: cached bytes must be sufficient.
 await fetch('/fixture-block');
 const prior=w.document;w.location.reload();
 await wait(()=>w.document!==prior&&w.document.getElementById('atlasSemanticPanel')?.dataset.state==='ready');
 await wait(()=>w.document.querySelector('#atlasResults .atlas-semantic-match'));
 // Damage the persisted model while offline, then verify fail-closed restore.
 const damaged=await w.caches.open('avenqir-semantic-model-v2-candidate');
 await damaged.put(modelURL(),new w.Response('corrupted cache',{headers:{'Content-Type':'application/json'}}));
 const damagedDoc=w.document;w.location.reload();
 await wait(()=>w.document!==damagedDoc&&w.document.getElementById('atlasSemanticPanel')?.dataset.state==='error');
 yes($('atlasSemanticStatus').textContent.includes('[integrity]'),'corrupt cache not diagnosed');
 yes(w.localStorage.getItem('avenqir.semantic.preference.v2')!=='enabled','failed restore left enabled preference');
 query('GitHub');yes([...w.document.querySelectorAll('#atlasResults .atlas-result-title')].some(a=>a.textContent.includes('GitHub')),'ordinary search failed after cache corruption');
 // Manually re-enable after explicit consent, then exercise existing removal path.
 await fetch('/fixture-valid');
 if(panel().hidden)$('atlasSemanticOpen').click();
 $('atlasSemanticDownload').click();await wait(()=>panel().dataset.state==='ready');
 await fetch('/fixture-block');
 w.confirm=()=>true;
 if(panel().hidden)$('atlasSemanticOpen').click();$('atlasSemanticRemove').click();
 await wait(()=>panel().dataset.state==='idle'&&!$('atlasSemanticDownload').hidden);
 yes(w.localStorage.getItem('avenqir.semantic.preference.v2')==='declined','disable preference not saved');
 yes(!await w.caches.has('avenqir-semantic-model-v2-candidate'),'model not deleted');
 document.documentElement.dataset.result='pass';
})().catch(e=>{document.documentElement.dataset.result='fail';document.documentElement.dataset.error=e.message});
</script>""".replace("MODEL_PATH_PLACEHOLDER",MODEL_PATH)
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*args,**kw):super().__init__(*args,directory=str(SITE),**kw)
    def log_message(self,*args):pass
    def do_GET(self):
        global mode
        p=urlsplit(self.path).path
        if p=='/qa.html':data=FIXTURE.encode();kind='text/html; charset=utf-8'
        elif p=='/fixture-valid':mode='valid';data=b'ok';kind='text/plain'
        elif p=='/fixture-html':mode='html';data=b'ok';kind='text/plain'
        elif p=='/fixture-unavailable':mode='unavailable';data=b'ok';kind='text/plain'
        elif p=='/fixture-rate-limit':mode='rate-limit';data=b'ok';kind='text/plain'
        elif p=='/fixture-truncated':mode='truncated';data=b'ok';kind='text/plain'
        elif p=='/fixture-block':mode='block';data=b'ok';kind='text/plain'
        elif p==MODEL_PATH:
            requests.append((mode,self.path))
            if mode=='rate-limit':self.send_error(429);return
            if mode=='truncated':
                self.send_response(200);self.send_header('Content-Type','application/octet-stream');self.send_header('Content-Length',str(len(MODEL)));self.end_headers()
                self.wfile.write(MODEL[:4096]);self.wfile.flush();self.close_connection=True
                try:self.connection.shutdown(socket.SHUT_WR)
                except OSError:pass
                return
            if mode in ('block','unavailable'):self.send_error(503);return
            if mode=='html':data=b'<!doctype html><html><body>Host verification required</body></html>';kind='text/html'
            else:data=MODEL if mode=='valid' else b'X'+MODEL[1:];kind='application/octet-stream' if mode=='valid' else 'application/json'
        elif p=='/directory.html':data=DIRECTORY.encode();kind='text/html; charset=utf-8'
        elif p=='/directory.js':data=DIRECTORY_JS.encode();kind='application/javascript; charset=utf-8'
        elif not PACKAGED and (p.startswith('/research/') or p.startswith('/site/')):
            target=(ROOT/p.lstrip('/')).resolve()
            if not target.is_relative_to(ROOT) or not target.is_file():self.send_error(404);return
            data=target.read_bytes();kind='application/javascript; charset=utf-8' if target.suffix=='.js' else 'application/json'
        elif p=='/public-api.php':data=b'{"ok":true,"items":[]}';kind='application/json'
        elif p=='/recommendations-api.php':data=b'{"ok":true,"items":[]}';kind='application/json'
        elif p.endswith('.php'):self.send_error(404);return
        else:super().do_GET();return
        try:
            self.send_response(200);self.send_header('Content-Type',kind);self.send_header('Content-Length',str(len(data)));self.end_headers()
            if p==MODEL_PATH and mode=='valid':
                self.wfile.write(data[:1024]);self.wfile.flush();time.sleep(.25);self.wfile.write(data[1024:])
            else:self.wfile.write(data)
        except (BrokenPipeError,ConnectionResetError):pass
with http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler) as server:
    threading.Thread(target=server.serve_forever,daemon=True).start()
    url=f'http://127.0.0.1:{server.server_port}/qa.html'
    if FIREFOX:
        subprocess.run([sys.executable,str(ROOT/'tests'/'firefox_real_time.py'),url],timeout=175,check=True)
    else:
        with tempfile.TemporaryDirectory() as profile:
            subprocess.run(['node',str(ROOT/'tests'/'chrome_real_time.cjs'),CHROME,profile,url],timeout=75,check=True)
    assert len([x for x in requests if x[0]=='valid'])==4,requests
    assert not any(x[0]=='block' or '?' in x[1] for x in requests),requests
    assert sum(x[0]=='html' for x in requests)==1 and sum(x[0]=='unavailable' for x in requests)==1,requests
    assert sum(x[0]=='rate-limit' for x in requests)==1 and sum(x[0]=='truncated' for x in requests)==1,requests
    print('PACKAGED' if PACKAGED else 'RESEARCH', 'FIREFOX' if FIREFOX else 'CHROMIUM', 'PASS real 390x844 candidate directory, full bundle consent, cancel/retry, integrity, progress, Korean result, locale switch, real HTTP HTML/503/429/truncated-body failure and retry, worker activation/cache race, quota session fallback, corrupted cache restore, reload and deletion')
    server.shutdown()
