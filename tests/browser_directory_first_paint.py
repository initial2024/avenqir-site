#!/usr/bin/env python3
"""Exercise actual directory in headless Chrome, with a slow public API fixture.
No production requests, credentials or user files. This is a desktop smoke
test, not an estimate of the speed of a specific phone."""
import functools, http.server, json, pathlib, shutil, subprocess, tempfile, threading, time, urllib.parse
SITE=pathlib.Path(__file__).resolve().parents[1]/'site'
CHROME=shutil.which('google-chrome') or shutil.which('chromium') or shutil.which('chromium-browser')
assert CHROME, 'Chrome/Chromium required'
probe="""<script>
window.addEventListener('error',e=>{document.documentElement.dataset.aqRuntimeError=(e.message||'resource error')+' '+(e.filename||'').split('/').pop()+':'+e.lineno;});
window.addEventListener('unhandledrejection',e=>{document.documentElement.dataset.aqRejection=String(e.reason).slice(0,200);});
document.addEventListener('DOMContentLoaded',()=>{
 const r=document.getElementById('atlasResults');
 const n=document.getElementById('atlasLiveCount');
 const s=document.getElementById('atlasSource');
 document.documentElement.dataset.aqLocalReady=String(!!r&&r.children.length>0&&!!n&&!!s&&/1239|1,239/.test(n.textContent));
 document.documentElement.dataset.aqInitialCount=String(r?.children.length||0);
 const input=document.getElementById('atlasQuery'),form=document.getElementById('atlasForm'),dialog=document.getElementById('atlasNoMatchDialog');
 const until=performance.now()+10000;
 const run=()=>{
  if(/syncing public entries|同步公开数据中/.test(s.textContent)&&performance.now()<until){setTimeout(run,100);return;}
  const q='zzq-no-directory-match-7293';
  input.value=q;input.dispatchEvent(new Event('input',{bubbles:true}));
  setTimeout(()=>{
   const quiet=!dialog.open;
   form.requestSubmit();
   const noMatch=dialog.open&&document.getElementById('atlasNoMatchQuery').textContent.includes(q)&&document.querySelector('[data-no-match-engine="google"]').href==='https://www.google.com/search?q='+encodeURIComponent(q);
   document.getElementById('atlasNoMatchClose').click();
   const closed=!dialog.open&&!document.getElementById('atlasSearchNext').hidden;
   input.value='Python';input.dispatchEvent(new Event('input',{bubbles:true}));form.requestSubmit();
   const matched=r.children.length>0&&!dialog.open&&document.querySelector('[data-search-next-engine="google"]').href==='https://www.google.com/search?q=Python';
   const order=!!(r.compareDocumentPosition(document.getElementById('atlasSearchNext'))&Node.DOCUMENT_POSITION_FOLLOWING);
   document.documentElement.dataset.aqSearchFlow=String(quiet&&noMatch&&closed&&matched&&order);
   input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));form.requestSubmit();
   document.getElementById('atlasClearFilters').click();
   const official=document.getElementById('atlasReviewedOnly'),threat=document.getElementById('atlasThreatFilter'),summary=document.getElementById('atlasSummary');
   official.checked=true;official.dispatchEvent(new Event('change'));
   const sourceOnly=/324/.test(summary.textContent);
   threat.value='not-listed';threat.dispatchEvent(new Event('change'));
   const exclusive=!official.checked;
   const allClear=/1239 sites|1239 个网站/.test(summary.textContent);
   threat.value='listed';threat.dispatchEvent(new Event('change'));
   const zero=/0 sites|0 个网站/.test(summary.textContent);
   document.getElementById('atlasClearFilters').click();
   const reset=threat.value==='all'&&!official.checked;
   document.documentElement.dataset.aqThreatFilter=String(sourceOnly&&exclusive&&allClear&&zero&&reset);
  },150);
 };
 setTimeout(run,50);
});
</script>"""
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw):
        super().__init__(*a,directory=str(SITE),**kw)
    def log_message(self,*args): pass
    def do_GET(self):
        path=urllib.parse.urlsplit(self.path).path
        if path=='/public-api.php':
            time.sleep(4)
            data=b'{"ok":true,"items":[]}'
            try:
                self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(data)
            except (BrokenPipeError,ConnectionResetError):pass
            return
        if path=='/atlas-threat-snapshot.js':
            import datetime, re
            from urllib.parse import urlsplit
            core=(SITE/'atlas-catalog-core.js').read_text()
            # Synthetic all-clear fixture only. Real deployment uses the external feed.
            urls=set()
            for file in SITE.glob('atlas-*.js'):
                urls.update(re.findall(r'"url"\s*:\s*"(https://[^"]+)"',file.read_text()))
            hosts=sorted({urlsplit(u).hostname for u in urls if urlsplit(u).hostname})
            data=('window.AVENQIR_THREAT_SNAPSHOT = '+json.dumps({'schema':'aq-certpl-v1','source':'https://hole.cert.pl/domains/v2/domains.txt','checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'hosts':hosts,'listed':[]})+';').encode()
            self.send_response(200);self.send_header('Content-Type','application/javascript');self.end_headers();self.wfile.write(data);return
        if path=='/directory.html':
            data=(SITE/'directory.html').read_text().replace('</body>',probe+'</body>').encode()
            self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.end_headers();self.wfile.write(data);return
        if path.endswith('.php'):
            self.send_error(404);return
        super().do_GET()
with http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler) as server:
    threading.Thread(target=server.serve_forever,daemon=True).start()
    url='http://127.0.0.1:%d/directory.html?q=Python'%server.server_port
    with tempfile.TemporaryDirectory() as tmp:
        start=time.monotonic()
        result=subprocess.run([CHROME,'--headless','--no-sandbox','--disable-dev-shm-usage','--disable-background-networking','--disable-gpu','--no-first-run','--user-data-dir='+tmp,'--virtual-time-budget=15000','--dump-dom',url],capture_output=True,text=True,timeout=45,check=True)
        dom=result.stdout
        print('CHROME_SMOKE_ELAPSED_SECONDS=%.2f'%(time.monotonic()-start))
        import re
        for m in re.finditer(r'data-aq-(?:local-ready|initial-count|runtime-error|rejection)="[^"]*"',dom): print(m.group())
        for id in ['atlasLiveCount','atlasSource','atlasSummary','atlasStartupNotice']:
            m=re.search(r'<[^>]+id="'+id+r'"[^>]*>[^<]{0,350}',dom)
            print(id,m.group(0) if m else 'missing')
        assert 'data-aq-runtime-error=' not in dom, 'unexpected script runtime error'
        assert 'data-aq-local-ready="true"' in dom, 'directory did not render local results before delayed remote API'
        assert 'data-aq-search-flow="true"' in dom, 'interactive no-match, close, re-search or result order failed'
        assert 'data-aq-threat-filter="true"' in dom, 'official and dynamic-risk filter regression'
        assert 'id="atlasResults"' in dom and 'Python' in dom, 'search results absent'
        # Search continuation URL is verified in aqSearchFlow before filter reset.
        print('PASS browser local-first catalog, initial Python search, no-match submit/close/re-search and result ordering with slow API fixture')
    server.shutdown()
