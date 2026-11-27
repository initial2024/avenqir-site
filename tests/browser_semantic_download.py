#!/usr/bin/env python3
"""Actual mobile-size Chromium: isolated model download, corrupt payload, consent and local cache."""
import http.server, pathlib, shutil, subprocess, tempfile, threading, time
from urllib.parse import urlsplit
SITE=pathlib.Path(__file__).resolve().parents[1]/'site'
CHROME=shutil.which('google-chrome') or shutil.which('chromium')
assert CHROME
MODEL=(SITE/'atlas-semantic-model-v1.json').read_bytes()
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
 const modelURL=()=>new URL(w.AVENQIR_DOMAIN_EMBEDDING.SPEC.file,w.location.href).href;
 yes(panel().hidden,'fresh page should not interrupt');
 query('githbu');
 yes(!panel().hidden,'first search must offer download');
 yes([...w.document.querySelectorAll('#atlasResults .atlas-result-title')].some(a=>a.textContent.includes('GitHub')),'typo result must work without model');
 yes($('atlasSemanticSize').textContent.includes('34.1 KiB'),'actual pinned size not shown');
 yes(w.performance.getEntriesByName(modelURL()).length===0,'download before consent');
 $('atlasSemanticLater').click();
 query('GitHub');yes(panel().hidden,'decline must suppress repeated offer');
 $('atlasSemanticOpen').click();
 $('atlasSemanticDownload').click();
 yes(panel().dataset.state==='downloading'&&!$('atlasSemanticCancel').hidden,'download and cancel controls missing');
 $('atlasSemanticCancel').click();
 yes(panel().dataset.state==='cancelled','cancel not applied');
 $('atlasSemanticDownload').click();
 await wait(()=>panel().dataset.state==='error');
 yes(!w.localStorage.getItem('avenqir.semantic.preference.v1')||w.localStorage.getItem('avenqir.semantic.preference.v1')==='declined','corrupt model enabled');
 const failedCache=await w.caches.open('avenqir-semantic-model-v1');
 yes(!await failedCache.match(modelURL()),'corrupt model saved');
 await fetch('/fixture-valid');
 let intermediate=false;
 const obs=new w.MutationObserver(()=>{const v=$('atlasSemanticProgress').value;const txt=$('atlasSemanticDetail').textContent;if(v>0&&v<w.AVENQIR_DOMAIN_EMBEDDING.SPEC.bytes&&txt.includes('/s'))intermediate=true;});
 obs.observe($('atlasSemanticDetail'),{childList:true,subtree:true,characterData:true});
 $('atlasSemanticDownload').click();
 await wait(()=>panel().dataset.state==='ready');obs.disconnect();
 yes(intermediate,'actual partial-byte progress and speed were not observed');
 yes($('atlasSemanticProgress').value===w.AVENQIR_DOMAIN_EMBEDDING.SPEC.bytes,'complete byte progress missing');
 yes($('atlasSemanticDetail').textContent.includes('100%'),'100% not shown');
 yes(w.localStorage.getItem('avenqir.semantic.preference.v1')==='enabled','consent not saved');
 query('resize photographs');
 yes(w.document.querySelector('#atlasResults .atlas-semantic-match'),'semantic result not labelled');
 yes([...w.document.querySelectorAll('#atlasResults .atlas-result-title')].every(a=>w.AVENQIR_ATLAS_CATALOG.catalog().some(x=>a.textContent.includes(x.name))),'invented catalog entry');
 const cache=await w.caches.open('avenqir-semantic-model-v1');
 yes((await cache.match(modelURL()))?.ok,'verified model cache missing');
 // Reload without network model access: cached bytes must be sufficient.
 await fetch('/fixture-block');
 const prior=w.document;w.location.reload();
 await wait(()=>w.document!==prior&&w.document.getElementById('atlasSemanticPanel')?.dataset.state==='ready');
 yes(w.document.querySelector('#atlasResults .atlas-semantic-match'),'cache restore did not restore ranking');
 w.confirm=()=>true;
 $('atlasSemanticOpen').click();$('atlasSemanticRemove').click();
 await wait(()=>panel().dataset.state==='idle'&&!$('atlasSemanticDownload').hidden);
 yes(w.localStorage.getItem('avenqir.semantic.preference.v1')==='declined','disable preference not saved');
 yes(!await w.caches.has('avenqir-semantic-model-v1'),'model not deleted');
 document.documentElement.dataset.result='pass';
})().catch(e=>{document.documentElement.dataset.result='fail';document.documentElement.dataset.error=e.message});
</script>"""
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*args,**kw):super().__init__(*args,directory=str(SITE),**kw)
    def log_message(self,*args):pass
    def do_GET(self):
        global mode
        p=urlsplit(self.path).path
        if p=='/qa.html':data=FIXTURE.encode();kind='text/html; charset=utf-8'
        elif p=='/fixture-valid':mode='valid';data=b'ok';kind='text/plain'
        elif p=='/fixture-block':mode='block';data=b'ok';kind='text/plain'
        elif p=='/atlas-semantic-model-v1.json':
            requests.append((mode,self.path))
            if mode=='block':self.send_error(503);return
            data=MODEL if mode=='valid' else b'X'+MODEL[1:];kind='application/json'
        elif p=='/public-api.php':data=b'{"ok":true,"items":[]}';kind='application/json'
        elif p=='/recommendations-api.php':data=b'{"ok":true,"items":[]}';kind='application/json'
        elif p.endswith('.php'):self.send_error(404);return
        else:super().do_GET();return
        try:
            self.send_response(200);self.send_header('Content-Type',kind);self.send_header('Content-Length',str(len(data)));self.end_headers()
            if p=='/atlas-semantic-model-v1.json' and mode=='valid':
                self.wfile.write(data[:1024]);self.wfile.flush();time.sleep(.25);self.wfile.write(data[1024:])
            else:self.wfile.write(data)
        except (BrokenPipeError,ConnectionResetError):pass
with http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler) as server:
    threading.Thread(target=server.serve_forever,daemon=True).start()
    with tempfile.TemporaryDirectory() as profile:
        subprocess.run(['node',str(SITE.parent/'tests'/'chrome_real_time.cjs'),CHROME,profile,f'http://127.0.0.1:{server.server_port}/qa.html'],timeout=75,check=True)
    assert len([x for x in requests if x[0]=='valid'])==1,requests
    assert not any(x[0]=='block' or '?' in x[1] for x in requests),requests
    print('PASS real 390x844 Chrome model consent, cancel, corrupt rejection, exact byte progress, semantic results, reload cache and deletion')
    server.shutdown()
